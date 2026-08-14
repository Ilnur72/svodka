import type { SalesMonthlyRow, SalesProductRow } from "../../api/types";
import { isSgpSuspect } from "../dataQuality";
import { monthLabel, monthTick } from "../format";

/**
 * СГП — сотиш ва қолдиқлар.
 *
 * ⚠️ `value_base` турли ўлчов бирликларини (тн ва дона) битта сонга қўшади.
 * Шунинг учун бу қаватда ҳам категориялараро йиғинди ҳисобланмайди ва
 * категориялар бир-бири билан таққосланмайди — ҳар бири ўз картасида,
 * ўз шкаласида тренд сифатида чиқади.
 */
export const SALES_CATEGORIES = [
  "Реализация готовой продукции",
  "Остатки готовой продукции",
  "Остатки основного сырья и материалов",
] as const;

export const SALES_LABELS: Record<string, string> = {
  "Реализация готовой продукции": "Тайёр маҳсулот реализацияси",
  "Остатки готовой продукции": "Тайёр маҳсулот қолдиғи",
  "Остатки основного сырья и материалов": "Асосий хомашё ва материаллар қолдиғи",
};

export const SALES_MIXED_UNITS_NOTE =
  "қиймат аралаш ўлчов бирликларида (тн ва дона), категориялар ўзаро таққосланмайди";

/* -------------------------------------------------------------------------- */
/* Маҳсулот кесими (`/sales/products`)                                        */
/* -------------------------------------------------------------------------- */

/** Металл коди → ўқиладиган ном. */
export const MATERIAL_LABELS: Record<string, string> = {
  Mo: "Молибден",
  W: "Вольфрам",
  Re: "Рений",
  Co: "Кобальт",
  Fe: "Темир",
  Other: "Бошқа",
};
export const materialLabel = (m: string | null): string =>
  m ? (MATERIAL_LABELS[m] ?? m) : "Аниқланмаган";

/** Ўлчов бирлиги ёрлиғи; API `null` ёки `«—»` қайтариши мумкин. */
export const unitLabel = (u: string | null): string => {
  const s = String(u ?? "").trim();
  return s && s !== "—" ? s : "бирлиги аниқланмаган";
};

export interface SalesProduct extends SalesProductRow {
  /** Сони ишончсиз — ниқобланади (`unitSuspect` ёки қўлдаги рўйхат). */
  suspect: boolean;
}

/** Бир ўлчов бирлигидаги маҳсулотлар — фақат шулар битта шкалага тушади. */
export interface SalesUnitGroup {
  unit: string;
  label: string;
  products: SalesProduct[];
  /** Фақат шубҳасиз маҳсулотлар йиғиндиси; шубҳалилар қўшилмайди. */
  total: number;
  suspectCount: number;
}

export interface SalesCategoryProducts {
  category: string;
  label: string;
  isStock: boolean;
  /** Қолдиқ учун — қайси кун ҳолати. */
  lastDay: string | null;
  units: SalesUnitGroup[];
  productCount: number;
  suspectCount: number;
}

/**
 * Маҳсулотларни категория → ўлчов бирлиги бўйича гуруҳлайди.
 *
 * Нега бирлик бўйича: битта категорияда тн, кг, дона ва п/м аралаш келади —
 * уларни битта диаграммага қўйиб бўлмайди. Ҳар бир бирлик ўз рўйхати ва ўз
 * шкаласида чиқади.
 */
export function salesByProduct(rows: SalesProductRow[]): SalesCategoryProducts[] {
  const byCat = new Map<string, SalesProductRow[]>();
  for (const r of rows) {
    const c = r.sgpCategory ?? "—";
    (byCat.get(c) ?? byCat.set(c, []).get(c)!).push(r);
  }

  const order = [
    ...SALES_CATEGORIES.filter((c) => byCat.has(c)),
    ...[...byCat.keys()].filter((c) => !SALES_CATEGORIES.includes(c as never)),
  ];

  return order.map((category) => {
    const items = byCat.get(category) ?? [];
    const byUnit = new Map<string, SalesProduct[]>();
    for (const r of items) {
      const u = unitLabel(r.unit);
      const p: SalesProduct = { ...r, suspect: isSgpSuspect(r) };
      (byUnit.get(u) ?? byUnit.set(u, []).get(u)!).push(p);
    }

    const units: SalesUnitGroup[] = [...byUnit.entries()]
      .map(([unit, products]) => {
        products.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        return {
          unit,
          label: unit,
          products,
          total: products.reduce((a, p) => a + (p.suspect ? 0 : (p.value ?? 0)), 0),
          suspectCount: products.filter((p) => p.suspect).length,
        };
      })
      .sort((a, b) => b.products.length - a.products.length);

    const first = items[0];
    return {
      category,
      label: SALES_LABELS[category] ?? category,
      isStock: Boolean(first?.isStock),
      lastDay: first?.lastDay ?? null,
      units,
      productCount: items.length,
      suspectCount: units.reduce((a, u) => a + u.suspectCount, 0),
    };
  });
}

export interface SalesPoint {
  month: string;
  label: string;
  full: string;
  value: number;
}

export interface SalesCategoryVM {
  category: string;
  label: string;
  points: SalesPoint[];
  /** Даврдаги охирги ой қиймати. */
  last: number | null;
  lastMonth: string | null;
  /** Даврдаги биринчи ой қиймати — фақат шу категория ичида таққослаш учун. */
  first: number | null;
  firstMonth: string | null;
  max: number;
}

export function salesByCategory(rows: SalesMonthlyRow[], months: string[]): SalesCategoryVM[] {
  const byCat = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const cat = r.category ?? "—";
    const m = byCat.get(cat) ?? new Map<string, number>();
    m.set(r.month, (m.get(r.month) ?? 0) + (r.value_base ?? 0));
    byCat.set(cat, m);
  }

  // Кутилган учта категория доим кўринади (маълумот бўлмаса ҳам), ундан
  // ташқаридаги категориялар кейин қўшилади.
  const names = [
    ...SALES_CATEGORIES.filter((c) => byCat.has(c)),
    ...[...byCat.keys()].filter((c) => !SALES_CATEGORIES.includes(c as never)),
  ];

  return names.map((category) => {
    const src = byCat.get(category) ?? new Map<string, number>();
    const keys = months.length ? months : [...src.keys()].sort();
    const points: SalesPoint[] = keys.map((m) => ({
      month: m,
      label: monthTick(m),
      full: monthLabel(m),
      value: src.get(m) ?? 0,
    }));
    const filled = points.filter((p) => src.has(p.month));
    return {
      category,
      label: SALES_LABELS[category] ?? category,
      points,
      last: filled.length ? filled[filled.length - 1].value : null,
      lastMonth: filled.length ? filled[filled.length - 1].month : null,
      first: filled.length ? filled[0].value : null,
      firstMonth: filled.length ? filled[0].month : null,
      max: points.reduce((a, p) => Math.max(a, p.value), 0),
    };
  });
}

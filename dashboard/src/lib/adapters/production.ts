import type {
  NarastaykaRow,
  ProductionMonthlyRow,
  TreeData,
  UnitTotal,
  WeightTotal,
} from "../../api/types";
import { UNASSIGNED_PLANT, isUnknownUnit, plantLabel } from "../dataQuality";
import { fixWorkshop } from "../workshopFixes";
import { dateLabel, dateTick, monthLabel, monthTick } from "../format";

/**
 * Ишлаб чиқариш: `/production/tree` даражали жавобини панел ишлатадиган
 * текис рўйхат + завод гуруҳларига айлантиради.
 *
 * «Белгиланмаган» завод яширилмайди — у «Заводга боғланмаган» номи билан
 * алоҳида гуруҳ бўлади (API-BUGS №5). Базавий бирлиги йўқлиги учун унинг
 * қиймати бирлик кесимидаги йиғиндиларга қўшилмайди.
 */
export interface ProdItem {
  key: string;
  id: number;
  name: string;
  plant: string;
  plantLabel: string;
  workshop: string;
  workshopFull: string | null;
  unit: string | null;
  baseUnit: string | null;
  material: string | null;
  process: string | null;
  category: string | null;
  plan: number;
  fakt: number;
  percent: number | null;
  /** Завод/бирлиги аниқланмаган позиция. */
  unassigned: boolean;
  /** Манбадаги «всего» йиғинди сатри — йиғиндиларга қўшилмайди. */
  isTotal: boolean;
}

export interface PlantGroup {
  name: string;
  label: string;
  unassigned: boolean;
  workshopCount: number;
  productCount: number;
  byUnit: UnitTotal[];
  weight: WeightTotal | null;
}

export interface WorkshopOption {
  code: string;
  plant: string;
  label: string;
  count: number;
}

export interface ProdVM {
  items: ProdItem[];
  plants: PlantGroup[];
  workshops: WorkshopOption[];
  totals: { byUnit: UnitTotal[]; weight: WeightTotal | null };
  productCount: number;
}

export function fromTree(tree: TreeData): ProdVM {
  const items: ProdItem[] = [];
  const workshops: WorkshopOption[] = [];

  for (const plant of tree.plants) {
    const unassignedPlant = plant.name === UNASSIGNED_PLANT;
    for (const ws of plant.workshops ?? []) {
      workshops.push({
        code: ws.code,
        plant: plant.name,
        label: unassignedPlant ? `${plantLabel(plant.name)}` : ws.code,
        count: ws.productCount,
      });
      for (const p of ws.products ?? []) {
        // Импорт цехни маҳсулот номидан ажратиб олгани учун бир нечта қатор
        // нотўғри цехга тушган — `workshopFixes.ts` га қаранг.
        const workshop = fixWorkshop(p.name, ws.code);
        items.push({
          key: `${plant.name}#${workshop}#${p.id}`,
          id: p.id,
          name: p.name,
          plant: plant.name,
          plantLabel: plantLabel(plant.name),
          workshop,
          workshopFull: workshop === ws.code ? ws.fullName : null,
          unit: p.unit,
          baseUnit: p.baseUnit,
          material: p.material,
          process: p.process,
          category: p.category,
          plan: p.plan ?? 0,
          fakt: p.fakt ?? 0,
          percent: p.percent,
          unassigned: unassignedPlant || isUnknownUnit(p.baseUnit),
          isTotal: Boolean(p.isTotal),
        });
      }
    }
  }

  const plants: PlantGroup[] = tree.plants.map((p) => ({
    name: p.name,
    label: plantLabel(p.name),
    unassigned: p.name === UNASSIGNED_PLANT,
    workshopCount: p.workshopCount,
    productCount: p.productCount,
    byUnit: p.totals?.byUnit ?? [],
    weight: p.totals?.weight ?? null,
  }));

  // Позиция сони API'дан эмас, ҳақиқий қаторлардан саналади: цех тузатилганда
  // (`workshopFixes.ts`) рўйхатдаги сон ҳам ўзи эргашсин.
  const counted = new Map<string, number>();
  for (const it of items) {
    const k = `${it.plant}#${it.workshop}`;
    counted.set(k, (counted.get(k) ?? 0) + 1);
  }
  for (const w of workshops) w.count = counted.get(`${w.plant}#${w.code}`) ?? 0;

  return {
    items,
    plants,
    workshops,
    totals: { byUnit: tree.totals?.byUnit ?? [], weight: tree.totals?.weight ?? null },
    productCount: tree.productCount,
  };
}

/* -------------------------------------------------------------------------- */
/* фильтр ва статистика                                                       */
/* -------------------------------------------------------------------------- */

export function filterItems(items: ProdItem[], workshop: string, query: string): ProdItem[] {
  const q = query.trim().toLowerCase();
  return items.filter(
    (x) =>
      (workshop === "ALL" || `${x.plant}#${x.workshop}` === workshop) &&
      (!q || x.name.toLowerCase().includes(q)),
  );
}

export interface ProdStats {
  total: number;
  withPlan: number;
  met: number;
  /** Ҳар бир позиция бажарилишининг ўртачаси, 100% дан ошмайди. */
  score: number;
  zero: number;
}

export function prodStats(rows: ProdItem[]): ProdStats {
  // «Всего» сатрлари ўз таркибий қисмлари билан бирга саналмаслиги керак.
  const base = rows.filter((x) => !x.isTotal);
  const wp = base.filter((x) => x.plan > 0);
  const met = wp.filter((x) => x.fakt >= x.plan * 0.999).length;
  const score = wp.length
    ? (wp.reduce((a, x) => a + Math.min(x.fakt / x.plan, 1), 0) / wp.length) * 100
    : 0;
  return {
    total: base.length,
    withPlan: wp.length,
    met,
    score,
    zero: wp.filter((x) => x.fakt === 0).length,
  };
}

export interface DeviationRow extends ProdItem {
  /** Бажарилиш %, 300 да чекланган — битта чегара ҳолат диаграммани текисламасин. */
  pc: number;
}

export interface TotalRow extends ProdItem {
  /** Бажарилиш %, режа нол бўлса `null`. */
  pc: number | null;
}

/** Ҳар бир четланиш рўйхатида нечта позиция кўрсатилади. */
export const DEVIATION_LIMIT = 25;

/**
 * Четланиш рўйхатлари фақат **режаси бор** позициялардан тузилади: режа нол
 * бўлса бажарилиш фоизини ҳисоблаб бўлмайди (API ҳам `percent: null` қайтаради).
 *
 * Лекин уларни бутунлай яшириб қўйиш маълумот йўқотиш бўларди — «Получение
 * ТМА из 5 цеха по факту» каби қаторларда режа йўқ, факт эса 321 тн. Шунинг
 * учун улар `noPlan` да алоҳида қайтарилади ва панелда жадвал сифатида
 * кўрсатилади (фоиз эмас, факт).
 */
/**
 * Рўйхат шунча позициядан қисқа бўлса, чекка 25 талик эмас, **тўлиқ рўйхат**
 * кўрсатилади. Сабаби: битта цех танлаганда фойдаланувчи ўша цехни бутунлай
 * кўрмоқчи, «энг ёмон 25 та» ни эмас. Ўртадаги позициялар (масалан «Выпуск
 * перрената аммония» 76,7%) акс ҳолда ҳеч қайси рўйхатга тушмай қоларди.
 */
export const FULL_LIST_MAX = 60;

export function deviationRows(rows: ProdItem[]): {
  low: DeviationRow[];
  high: DeviationRow[];
  /** Барча режали позициялар, бажарилиш бўйича ўсиш тартибида. */
  all: DeviationRow[];
  /** `true` — тўлиқ рўйхат кўрсатилсин (позиция кам). */
  showAll: boolean;
  noPlan: ProdItem[];
  /** Манбадаги «всего» сатрлари — алоҳида кўрсатилади. */
  totals: TotalRow[];
} {
  const base = rows.filter((x) => !x.isTotal);
  const rank: DeviationRow[] = base
    .filter((x) => x.plan > 0)
    .map((x) => ({ ...x, pc: Math.min((x.fakt / x.plan) * 100, 300) }));
  const asc = [...rank].sort((a, b) => a.pc - b.pc);
  return {
    low: asc.slice(0, DEVIATION_LIMIT),
    high: [...rank].sort((a, b) => b.pc - a.pc).slice(0, DEVIATION_LIMIT),
    all: asc,
    showAll: rank.length > 0 && rank.length <= FULL_LIST_MAX,
    noPlan: base.filter((x) => !(x.plan > 0)).sort((a, b) => b.fakt - a.fakt),
    totals: rows
      .filter((x) => x.isTotal)
      .map((x) => ({ ...x, pc: x.plan > 0 ? (x.fakt / x.plan) * 100 : null }))
      .sort((a, b) => (b.fakt || 0) - (a.fakt || 0)),
  };
}

export interface UnitGroup {
  name: string;
  unit: string;
  items: ProdItem[];
}

/**
 * Ўлчов бирлиги оилалари бўйича энг йирик позициялар. Турли бирликдаги
 * қийматлар ҳеч қачон битта шкалага қўйилмайди — шунинг учун гуруҳлаш.
 */
export function unitGroups(rows: ProdItem[]): UnitGroup[] {
  const byUnit = new Map<string, ProdItem[]>();
  for (const x of rows) {
    if (x.plan <= 0 || x.isTotal) continue;
    const u = x.unit && x.unit.trim() ? x.unit.trim() : "—";
    const list = byUnit.get(u) ?? [];
    list.push(x);
    byUnit.set(u, list);
  }
  return [...byUnit.entries()]
    .map(([unit, list]) => ({
      unit,
      name: unit === "—" ? "Бирлиги аниқланмаган" : `Ўлчов бирлиги: ${unit}`,
      items: list
        .sort((a, b) => Math.max(b.fakt, b.plan) - Math.max(a.fakt, a.plan))
        .slice(0, 8),
    }))
    .sort((a, b) => b.items.length - a.items.length);
}

/* -------------------------------------------------------------------------- */
/* битта позициянинг кунлик динамикаси (/narastayka)                          */
/* -------------------------------------------------------------------------- */

export interface DailySeries {
  labels: string[];
  fullLabels: string[];
  plan: number[];
  fakt: number[];
  cumPlan: number[];
  cumFakt: number[];
  /** ILIKE қидирув бўйича мос келган позиция номлари. */
  matched: string[];
}

export function dailyFromNarastayka(rows: NarastaykaRow[], multiMonth: boolean): DailySeries {
  const byDay = new Map<string, { plan: number; fakt: number }>();
  const matched = new Set<string>();
  for (const r of rows) {
    matched.add(r.product);
    const slot = byDay.get(r.for_day) ?? { plan: 0, fakt: 0 };
    slot.plan += r.plan ?? 0;
    slot.fakt += r.fakt ?? 0;
    byDay.set(r.for_day, slot);
  }
  const days = [...byDay.keys()].sort();
  const plan = days.map((d) => byDay.get(d)?.plan ?? 0);
  const fakt = days.map((d) => byDay.get(d)?.fakt ?? 0);
  return {
    labels: days.map((d) => dateTick(d, multiMonth)),
    fullLabels: days.map(dateLabel),
    plan,
    fakt,
    cumPlan: cumulative(plan),
    cumFakt: cumulative(fakt),
    matched: [...matched],
  };
}

/** Ўсиб борувчи якун; float дрейфини олдини олиш учун яхлитланади. */
export function cumulative(values: number[], dec = 3): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of values) {
    acc += v || 0;
    out.push(Number(acc.toFixed(dec)));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* ойлик тренд (/production/monthly)                                          */
/* -------------------------------------------------------------------------- */

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  full: string;
  plan: number;
  fakt: number;
}

export interface MonthlyTrendVM {
  /** Фақат битта базавий бирлик (одатда `тн`) — қийматлар қўшилиши мумкин. */
  unit: string;
  points: MonthlyTrendPoint[];
  /** Базавий бирлиги аниқланмагани учун ҳисобдан чиқарилган ойлар сони. */
  skippedUnassigned: number;
  /** Мавжуд бошқа бирликлар — изоҳда эслатилади. */
  otherUnits: string[];
}

/**
 * Ойлик тренд фақат **битта** базавий бирлик бўйича қурилади: `тн`, у бўлмаса
 * энг кўп учрайдиган бирлик. Турли бирликларни битта устунга қўшиш мумкин эмас.
 */
export function monthlyTrend(rows: ProductionMonthlyRow[], months: string[]): MonthlyTrendVM {
  const units = new Map<string, number>();
  let skippedUnassigned = 0;
  for (const r of rows) {
    if (isUnknownUnit(r.base_unit)) {
      skippedUnassigned += 1;
      continue;
    }
    const u = (r.base_unit as string).trim();
    units.set(u, (units.get(u) ?? 0) + 1);
  }
  const unit =
    units.get("тн") !== undefined
      ? "тн"
      : ([...units.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—");

  const byMonth = new Map<string, { plan: number; fakt: number }>();
  for (const r of rows) {
    if (isUnknownUnit(r.base_unit) || (r.base_unit as string).trim() !== unit) continue;
    const slot = byMonth.get(r.month) ?? { plan: 0, fakt: 0 };
    slot.plan += r.plan ?? 0;
    slot.fakt += r.fakt ?? 0;
    byMonth.set(r.month, slot);
  }

  const keys = months.length ? months : [...byMonth.keys()].sort();
  const points = keys.map((m) => ({
    month: m,
    label: monthTick(m),
    full: monthLabel(m),
    plan: byMonth.get(m)?.plan ?? 0,
    fakt: byMonth.get(m)?.fakt ?? 0,
  }));

  return {
    unit,
    points,
    skippedUnassigned,
    otherUnits: [...units.keys()].filter((u) => u !== unit),
  };
}

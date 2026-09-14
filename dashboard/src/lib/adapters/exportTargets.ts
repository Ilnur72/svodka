import type {
  ExportTargetGeography,
  ExportTargetPeriodKind,
  ExportTargetsDashboard,
  ExportTargetValue,
} from "../../api/types";
import type { TokenName } from "../theme";

/**
 * «Экспортнинг мақсадли кўрсаткичлари 2024-2030» — `/export-targets/dashboard`
 * жавобидан панел кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * `1.1 Рынок - экспорт 2024-2030.xlsx`, «экспорт» варағи: 8 маҳсулот × 8 давр.
 * Бу вақт қатори эмас, битта ҳужжатнинг қотирилган ҳолати, шунинг учун бўлим
 * давр танлагичига боғланмаган.
 *
 * ═══ 2026 йил иккита давр ═══════════════════════════════════════════════
 *
 * Манбада 2026 ИККИ МАРТА: `2026-actual` (январь–август, ҚИСМАН йил) ва
 * `2026-forecast` (тўлиқ йил). Уларни ёнма-ён битта вақт чизиғига қўйиш
 * сохта «ўсиш» ясайди, битта устунга йиғиш эса икки марта ҳисоблашдир.
 *
 * Шунинг учун бу ерда учта нарса қилинади:
 *  · ҳар бир давр ўз `kind` ранги билан белгиланади (чизиқ эмас, устун);
 *  · бир хил йилда иккаласи ҳам бор ҳолат `dualYears` га ажратилади ва
 *    экранда алоҳида, очиқ изоҳ билан кўрсатилади;
 *  · `note` («Январь-Август») йўқолмайди — у даврнинг ҳар бир кўринишига
 *    (ёрлиқ, жадвал сарлавҳаси, алмаштиргич изоҳи) бирга юради.
 *
 * ═══ `null` нол эмас ════════════════════════════════════════════════════
 *
 * 64 катакдан 42 таси тўлган, 22 таси бўш. 2024 йилда фақат молибден бор.
 * Бўш катак **нолга айлантирилмайди**: диаграммага тушмайди (акс ҳолда
 * «экспорт бор эди, кейин тушди» деган ёлғон манзара чиқарди), жадвалда эса
 * «—» бўлиб қолади. Нечтаси тўлгани ҳар жойда очиқ саналади.
 *
 * ═══ Ҳажмлар қўшилмайди ═════════════════════════════════════════════════
 *
 * `unit` маҳсулотга боғлиқ: `тонна` (6 та), `млн дона` (1), `минг тонна` (1).
 * Шунинг учун ҳажм бўйича ЖАМИ умуман ҳисобланмайди ва ҳажмлар битта
 * диаграммага қўйилмайди — фақат жадвалда, ҳар бири ўз бирлиги ёнида.
 * Ягона қўшса бўладиган ўлчов — `valueThousandUsd` (минг АҚШ доллари).
 */

/** Қиймати кўрсатилмаган катак учун ягона матн — бўлим бўйлаб бир хил. */
export const NO_DATA = "—";

/** Қиймат устунининг ўлчов бирлиги — бўлим бўйлаб битта ёзув. */
export const VALUE_UNIT = "минг $";

/**
 * Давр турининг ранги — бутун бўлим бўйлаб битта жой.
 *
 * Токен номи сақланади (тайёр ранг эмас), чунки у иккита турли жойда керак:
 * CSS'да `var(--s1)` кўринишида, Recharts'да эса `usePalette()` дан олинган
 * аниқ қиймат сифатида (диаграмма кутубхонаси `var(--x)` ни тушунмайди).
 * Шу тарзда «амалда яшил, прогноз кўк» қарори иккига бўлиниб кетмайди.
 */
export const KIND_TOKEN: Record<ExportTargetPeriodKind, TokenName> = {
  actual: "s3",
  forecast: "s1",
};

/** Давр турининг ўқиладиган номи — ёрлиқ ва изоҳларда бир хил ёзилиши учун. */
export const KIND_LABEL: Record<ExportTargetPeriodKind, string> = {
  actual: "амалда",
  forecast: "прогноз",
};

/* -------------------------------------------------------------------------- */
/* ёрдамчилар                                                                 */
/* -------------------------------------------------------------------------- */

/** Матрица калити — маҳсулот қатори + давр устуни. */
const cellKey = (rowNo: number, periodKey: string): string => `${rowNo}||${periodKey}`;

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface ExportPeriod {
  /** `2026-actual` — барча кесимларнинг калити. */
  key: string;
  year: number;
  kind: ExportTargetPeriodKind;
  /** Манбадаги тўлиқ ёзув: «2026 йил (амалда)». */
  label: string;
  /** Ихчам ёрлиқ — алмаштиргич ва жадвал сарлавҳаси учун: «2026 амалда». */
  short: string;
  /** «Январь-Август» — давр қисман йил эканини айтади; бошқаларда `null`. */
  note: string | null;
  /**
   * Жадвал сарлавҳаси: изоҳ борида у ҳам ёзилади («2026 амалда · Январь-Август»),
   * чунки устунни ўз ёнидаги устунлар билан солиштирадиган одам изоҳни
   * жадвалдан ташқарида қидирмаслиги керак.
   */
  head: string;
  /** Маҳсулот қаторларидан ҳисобланган жами, минг $. */
  total: number | null;
  /** Манбадаги «ЖАМИ» қатори, минг $. */
  sourceTotal: number | null;
  /**
   * `total − sourceTotal`. Иккиси ҳам маълум ва фарқ сезиларли бўлсагина сон,
   * акс ҳолда `null`. Манбадаги ҳақиқий номувофиқлик — тузатилмайди,
   * экранда очиқ ёзилади.
   */
  gap: number | null;
  /** Шу даврда нечта маҳсулотда қиймат кўрсатилган. */
  filled: number;
  /** Ранг токени — `KIND_TOKEN` дан, `kind` бўйича. */
  token: TokenName;
}

/** Битта катак — бурилган жадвалнинг ячейкаси. `null` = манбада бўш эди. */
export interface ExportCell {
  periodKey: string;
  volume: number | null;
  value: number | null;
}

export interface ExportProduct {
  rowNo: number;
  name: string;
  /** `тонна` / `млн дона` / `минг тонна`; манбада кўрсатилмаса `null`. */
  unit: string | null;
  /** Катаклар — `periods` билан АЙНАН бир хил тартибда. */
  cells: ExportCell[];
  /** Шу маҳсулот бўйича нечта даврда қиймат бор. */
  filled: number;
}

/**
 * Бир хил йилда ҳам «амалда», ҳам «прогноз» бўлган ҳолат (манбада — 2026).
 *
 * Панелга алоҳида берилади: иккита ёзувни жимгина ёнма-ён қўйиш ўрнига
 * экранда «бу битта йилнинг иккита ўлчови» деб очиқ кўрсатилади.
 */
export interface ExportDualYear {
  year: number;
  actual: ExportPeriod;
  forecast: ExportPeriod;
  /**
   * Амалдаги қиймат прогнознинг неча фоизи. Иккаласи ҳам маълум бўлсагина сон.
   * ⚠️ Бу «режа бажарилиши» ЭМАС: амалдаги давр қисман йил (январь–август),
   * прогноз эса тўлиқ йил. Шунинг учун экранда шундай деб ёзилади.
   */
  donePct: number | null;
}

/* -------------------------------------------------------------------------- */
/* экспорт географияси                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Битта давлат чипи. «Янги» белгиси АДАПТЕРДА қўйилади — панел фақат чизади.
 */
export interface ExportGeoCountry {
  /** Русча номи — манбадаги ёзувича, таржима қилинмайди. */
  name: string;
  /** Олдинги йил рўйхатида йўқ эди, яъни шу йили қўшилган. */
  isNew: boolean;
}

/** Битта йилнинг географияси — давлатлар ва олдинги йилдан фарқи. */
export interface ExportGeoYear {
  year: number;
  /** Бэкенддан келган сон (`countries.length`) — бу ерда қайта ҳисобланмайди. */
  count: number;
  /** Манбадаги тартибда; ҳар бирида «янги» белгиси бор. */
  countries: ExportGeoCountry[];
  /** Шу йили қўшилганлар — олдинги йил рўйхатида бўлмаганлари. */
  added: string[];
  /**
   * Олдинги йилда бор эди, бу йил рўйхатида ЙЎҚ.
   *
   * Ҳозирги маълумотда бундай ҳолат йўқ (2024 ⊂ 2025 ⊂ 2026), лекин у
   * жимгина ташлаб кетилмайди: акс ҳолда сон камайган йилда экранда
   * тушунтирилмаган «−2» пайдо бўларди.
   */
  dropped: string[];
  /** Олдинги йилдаги сон; рўйхатдаги биринчи йилда `null`. */
  prevCount: number | null;
  /** `count − prevCount`; биринчи йилда `null` (ўсиш «0» эмас, номаълум). */
  delta: number | null;
}

/**
 * Бўлимнинг тайёр кўриниши.
 *
 * ⚠️ `years` да фақат МАЪЛУМОТИ БОР йиллар бўлади. Даврлар рўйхатида бор-у
 * географияси берилмаган йиллар (2027–2030) `missingYears` га тушади ва
 * экранда «маълумот берилмаган» деб ёзилади — «0 та давлат» деб эмас.
 */
export interface ExportGeographyView {
  years: ExportGeoYear[];
  /** Энг эски йил — «қаердан бошланган». */
  first: ExportGeoYear | null;
  /** Энг сўнгги йил — «ҳозир қаерда». */
  last: ExportGeoYear | null;
  /** `last.count − first.count`; бир йилдан кам бўлса `null`. */
  growth: number | null;
  /**
   * Барча йиллар бўйлаб УЧРАГАН давлатлар сони (бирлашма).
   *
   * Ҳеч ким рўйхатдан тушмаган бўлса `last.count` га тенг. Ундан катта
   * бўлиши — баъзи давлат кейинги йилларда йўқолганини билдиради.
   */
  everCount: number;
  /** `periods` да бор, лекин географияси берилмаган йиллар — ўсиш тартибида. */
  missingYears: number[];
}

/**
 * Географияни йиллар занжирига айлантиради.
 *
 * «Янги давлат» олдинги КАЛЕНДАР йилга эмас, рўйхатдаги олдинги ёзувга
 * нисбатан ҳисобланади: манбада йиллар узилиши мумкин (масалан 2024 дан
 * кейин 2026), шунда `year - 1` ни излаш ҳамма давлатни «янги» деб
 * белгилаб қўярди.
 *
 * Тартиб бу ерда ҳам очиқ таъминланади: «янги» белгиси тартибга тўғридан-
 * тўғри боғлиқ ва нотўғри тартибда у жимгина тескари чиқарди.
 */
function buildGeography(
  rows: ExportTargetGeography[],
  periodYears: number[],
): ExportGeographyView {
  const sorted = [...rows].sort((a, b) => a.year - b.year);

  const ever = new Set<string>();
  const years: ExportGeoYear[] = [];
  let prev: ExportTargetGeography | null = null;

  for (const g of sorted) {
    const prevSet = new Set(prev?.countries ?? []);
    const nowSet = new Set(g.countries);

    // Рўйхатдаги биринчи йилда ҳеч нарса «қўшилган» эмас: у бошланғич ҳолат,
    // ўсиш эмас. Шунинг учун `isNew` фақат олдинги ёзув бор бўлсагина қўйилади.
    const countries: ExportGeoCountry[] = g.countries.map((name) => ({
      name,
      isNew: prev !== null && !prevSet.has(name),
    }));

    for (const c of g.countries) ever.add(c);

    years.push({
      year: g.year,
      count: g.count,
      countries,
      added: countries.filter((c) => c.isNew).map((c) => c.name),
      dropped: prev === null ? [] : prev.countries.filter((c) => !nowSet.has(c)),
      prevCount: prev === null ? null : prev.count,
      delta: prev === null ? null : g.count - prev.count,
    });
    prev = g;
  }

  const first = years.length > 0 ? years[0] : null;
  const last = years.length > 0 ? years[years.length - 1] : null;

  // Географияси берилмаган йиллар даврлар рўйхатидан олинади: «нима йўқ»
  // деган саволга жавоб фақат «нима бор» билан солиштирилганда чиқади.
  const known = new Set(years.map((y) => y.year));
  const missingYears = [...new Set(periodYears)].filter((y) => !known.has(y)).sort((a, b) => a - b);

  return {
    years,
    first,
    last,
    growth: first === null || last === null || first === last ? null : last.count - first.count,
    everCount: ever.size,
    missingYears,
  };
}

export interface ExportTargetsView {
  /** Ҳужжат сарлавҳаси — манбадан, ўзгартирилмайди. */
  title: string;
  source: string;
  periods: ExportPeriod[];
  products: ExportProduct[];
  /** Манбада учраган ўлчов бирликлари — «ҳажмлар қўшилмайди» изоҳи учун. */
  units: string[];
  /** Энг сўнгги прогноз даври (2030) — мақсад плиткаси. */
  goal: ExportPeriod | null;
  /** Энг сўнгги амалдаги давр (2026 амалда) — жорий ҳолат плиткаси. */
  latestActual: ExportPeriod | null;
  /** Йили бўйича такрорланган даврлар — одатда битта (2026). */
  dualYears: ExportDualYear[];
  /** Ҳисобланган жами манбадаги «ЖАМИ» дан фарқ қилган даврлар. */
  gaps: ExportPeriod[];
  /** Тўрнинг тўлиқлиги: нечта катакда қиймат бор. */
  cells: { filled: number; total: number };
  /**
   * Экспорт географияси — АЛОҲИДА бўлим.
   *
   * Атайин `periods` га боғланмаган: у йил кесимида, даврлар эса
   * йил + тур кесимида. 2026 йил даврларда икки марта учрайди, географияда
   * бир марта — уларни `year` бўйича улаш рўйхатни икки марта чиқарарди.
   */
  geography: ExportGeographyView;
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

/** Ихчам ёрлиқ: «2026 амалда» / «2030 прогноз». */
const shortOf = (year: number, kind: ExportTargetPeriodKind): string =>
  `${year} ${KIND_LABEL[kind]}`;

export function exportTargetsView(d: ExportTargetsDashboard): ExportTargetsView {
  // Даврлар ва маҳсулотлар бэкенддан `sortOrder` бўйича келади, лекин тартиб
  // бу ерда ҳам очиқ таъминланади: жадвал устунлари ва диаграмма қаторлари
  // манбадаги ўқиш тартибидан чиқиб кетмаслиги керак.
  const periodRows = [...d.periods].sort((a, b) => a.sortOrder - b.sortOrder);
  const productRows = [...d.products].sort((a, b) => a.sortOrder - b.sortOrder);

  const sourceTotalOf = new Map(d.sourceTotals.map((s) => [s.periodKey, s.valueThousandUsd]));
  const cells = new Map<string, ExportTargetValue>(
    d.values.map((v) => [cellKey(v.rowNo, v.periodKey), v]),
  );

  const products: ExportProduct[] = productRows.map((p) => {
    const row = periodRows.map<ExportCell>((per) => {
      const c = cells.get(cellKey(p.rowNo, per.periodKey));
      return {
        periodKey: per.periodKey,
        // Тўрда катак умуман бўлмаслиги ҳам мумкин — у ҳам «маълумот йўқ»,
        // нол эмас. Шунинг учун иккала ҳолат бир хил `null` га тушади.
        volume: c?.volume ?? null,
        value: c?.valueThousandUsd ?? null,
      };
    });
    return {
      rowNo: p.rowNo,
      name: p.name,
      unit: p.unit,
      cells: row,
      filled: row.filter((c) => c.value !== null).length,
    };
  });

  const periods: ExportPeriod[] = periodRows.map((p) => {
    const total = p.totalValueThousandUsd;
    const sourceTotal = sourceTotalOf.get(p.periodKey) ?? null;
    const rawGap = total === null || sourceTotal === null ? null : total - sourceTotal;
    // 0,001 минг $ (= 1 доллар) дан кичик фарқ — манбадаги Excel формуласининг
    // сузувчи нуқта қолдиғи, хабар эмас. Бэкенддаги импорт текшируви ҳам
    // айнан шу чегарани ишлатади (`TOTAL_CHECK_TOLERANCE`).
    const gap = rawGap === null || Math.abs(rawGap) < 0.001 ? null : Number(rawGap.toFixed(4));

    return {
      key: p.periodKey,
      year: p.year,
      kind: p.kind,
      label: p.label,
      short: shortOf(p.year, p.kind),
      note: p.note,
      head: p.note ? `${shortOf(p.year, p.kind)} · ${p.note}` : shortOf(p.year, p.kind),
      total,
      sourceTotal,
      gap,
      filled: products.filter(
        (pr) => pr.cells.find((c) => c.periodKey === p.periodKey)?.value !== null,
      ).length,
      token: KIND_TOKEN[p.kind],
    };
  });

  // Бир хил йилда иккита тур бўлган ҳолат. Манбада бу фақат 2026 да учрайди,
  // лекин йилга қотирилмайди — келгуси файлда 2027 ҳам иккиланиши мумкин.
  const byYear = new Map<number, ExportPeriod[]>();
  for (const p of periods) {
    const list = byYear.get(p.year);
    if (list) list.push(p);
    else byYear.set(p.year, [p]);
  }
  const dualYears: ExportDualYear[] = [];
  for (const [year, list] of byYear) {
    const actual = list.find((p) => p.kind === "actual");
    const forecast = list.find((p) => p.kind === "forecast");
    if (!actual || !forecast) continue;
    dualYears.push({
      year,
      actual,
      forecast,
      donePct:
        actual.total === null || forecast.total === null || forecast.total === 0
          ? null
          : (actual.total / forecast.total) * 100,
    });
  }
  dualYears.sort((a, b) => a.year - b.year);

  const forecasts = periods.filter((p) => p.kind === "forecast");
  const actuals = periods.filter((p) => p.kind === "actual");

  const units = [
    ...new Set(products.map((p) => p.unit).filter((u): u is string => u !== null)),
  ];

  const flat = products.flatMap((p) => p.cells);

  return {
    title: d.title,
    source: d.meta.source,
    periods,
    products,
    units,
    goal: forecasts.length > 0 ? forecasts[forecasts.length - 1] : null,
    latestActual: actuals.length > 0 ? actuals[actuals.length - 1] : null,
    dualYears,
    gaps: periods.filter((p) => p.gap !== null),
    cells: { filled: flat.filter((c) => c.value !== null).length, total: flat.length },
    // Даврларнинг йиллари — «географияси берилмаган йиллар» рўйхати учун.
    // Такрорланган йил (2026 икки марта) `buildGeography` ичида тозаланади.
    geography: buildGeography(d.geography ?? [], periods.map((p) => p.year)),
  };
}

/* -------------------------------------------------------------------------- */
/* битта давр кесими                                                          */
/* -------------------------------------------------------------------------- */

export interface ExportSliceRow {
  rowNo: number;
  name: string;
  unit: string | null;
  /** Минг АҚШ доллари; манбада кўрсатилмаган бўлса `null`. */
  value: number | null;
  /** Ўз бирлигида (`unit`); маҳсулотлар бўйлаб ҚЎШИЛМАЙДИ. */
  volume: number | null;
  /** Шу даврнинг ҳисобланган жамисига нисбатан улуш, %. */
  share: number | null;
}

export interface ExportSlice {
  period: ExportPeriod;
  /** Қиймати кўрсатилган маҳсулотлар — камайиш бўйича. */
  rows: ExportSliceRow[];
  /**
   * Қиймати кўрсатилмаган маҳсулотлар — манбадаги тартибида.
   *
   * Улар диаграммага **тушмайди** (нолга бўлиш ва «ҳажми нол» деган ёлғон
   * хулоса), лекин йўқолиб ҳам кетмайди: экранда алоҳида рўйхат бўлиб
   * қолади — `production-report` даги «режаси йўқ позициялар» қоидаси билан
   * бир хил мантиқ.
   */
  missing: ExportSliceRow[];
}

/**
 * Битта даврни маҳсулотлар кесимида очади.
 *
 * Давр топилмаса `null` — шунда эскирган танлов панелни йиқитмайди, панел
 * уни жимгина биринчи даврга қайтаради.
 */
export function exportSlice(v: ExportTargetsView, periodKey: string): ExportSlice | null {
  const period = v.periods.find((p) => p.key === periodKey);
  if (!period) return null;

  const all: ExportSliceRow[] = v.products.map((p) => {
    const c = p.cells.find((x) => x.periodKey === periodKey);
    const value = c?.value ?? null;
    return {
      rowNo: p.rowNo,
      name: p.name,
      unit: p.unit,
      value,
      volume: c?.volume ?? null,
      share:
        value === null || period.total === null || period.total === 0
          ? null
          : (value / period.total) * 100,
    };
  });

  return {
    period,
    rows: all
      .filter((r) => r.value !== null)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)),
    missing: all.filter((r) => r.value === null),
  };
}

/* -------------------------------------------------------------------------- */
/* тўлиқ жадвал                                                               */
/* -------------------------------------------------------------------------- */

/** Тўлиқ жадвал қайси ўлчовни кўрсатаётгани. */
export type ExportMetric = "value" | "volume";

export interface ExportMatrixRow {
  rowNo: number;
  name: string;
  /** Фақат `volume` кўринишида маъноли — қийматда ҳамма учун `минг $`. */
  unit: string | null;
  /** Катаклар — `periods` тартибида; `null` = манбада бўш. */
  values: Array<number | null>;
}

export interface ExportMatrix {
  rows: ExportMatrixRow[];
  /**
   * Устунлар бўйича ЖАМИ — фақат `value` учун.
   *
   * `volume` да атайин `null`: ўлчов бирликлари ҳар хил (`тонна`,
   * `млн дона`, `минг тонна`), уларни қўшиш маънога эга эмас.
   */
  totals: Array<number | null> | null;
  /** ЖАМИ ҳисобланмаган бўлса — нима учун эканининг сабаби. */
  totalsNote: string | null;
}

export function exportMatrix(v: ExportTargetsView, metric: ExportMetric): ExportMatrix {
  const rows: ExportMatrixRow[] = v.products.map((p) => ({
    rowNo: p.rowNo,
    name: p.name,
    unit: p.unit,
    values: p.cells.map((c) => (metric === "value" ? c.value : c.volume)),
  }));

  if (metric === "volume") {
    return {
      rows,
      totals: null,
      totalsNote:
        v.units.length > 1
          ? `Ҳажмлар бўйича ЖАМИ ҳисобланмайди: маҳсулотларнинг ўлчов бирлиги ҳар хил (${v.units.join(", ")}).`
          : null,
    };
  }

  // Устун йиғиндиси маҳсулот қаторларидан қайта ҳисобланмайди — бэкенд уни
  // аллақачон берган (`periods[].total`) ва иккита ҳисоб иккита ҳақиқат
  // яратарди. Манбадаги «ЖАМИ» эса ундан ҳам алоҳида (`sourceTotal`).
  return {
    rows,
    totals: v.periods.map((p) => p.total),
    totalsNote: null,
  };
}


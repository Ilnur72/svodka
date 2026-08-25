import type { KpiCell, KpiHow, KpiIndicator, KpiResponse } from "../../api/types";
import type { Status } from "../../types";
import { monthLabel, monthTick } from "../format";

/**
 * «Кўрсаткичлар паспорти»: API жавобидан раҳбар экрани кутадиган кўринишга
 * ўтказиш. Панел `KpiIndicator` ни кўрмайди — фақат шу ердаги view-model'ни.
 *
 * ═══ 1. Ҳолат чегаралари — ФАҚАТ шу бўлимга тегишли ═══════════════════════
 *
 * Лойиҳанинг умумий чегараси (`lib/format.ts` → `statusOf()`) — **100 / 85**
 * ва у «Металлар баланси», «Цехлар занжири», «Кунлик сводка» бўлимларида ҳам
 * ишлатилади. Раҳбар экрани учун бошқа чегара сўралди, шунинг учун у **шу
 * файлда алоҳида** эълон қилинган ва `statusOf()` га умуман тегмайди:
 * бошқа уч бўлим ўз чегарасида қолади.
 *
 *   0 … 79 %   → Муаммо   (қизил)
 *   80 … 94 %  → Диққат   (сариқ)
 *   95 % дан   → Норма    (яшил)
 *
 * Чегара — **созланадиган**: кейинчалик администратор ўзгартириши мумкин
 * бўлиши учун битта константада (`KPI_THRESHOLDS`) турибди. Уни ўзгартириш
 * автоматик равишда карточкалар, донат, прогресс-рўйхат ва жадвалга тарқалади,
 * чунки ранг ва ёрлиқ **фақат ҳолатдан** олинади (пастдаги 2-банд).
 *
 * ═══ 2. Ранг ҳеч қачон ёлғиз маъно ташимайди ══════════════════════════════
 *
 * Ҳолат ранги `KPI_STATUS_TOKEN` дан, матн ранги `KPI_STATUS_INK` дан
 * олинади ва ҳар доим `KPI_STATUS_LABEL` ёрлиғи билан бирга кўрсатилади.
 * `format.ts` даги `stripeOf`/`inkTokenOf` бу ерда **ишлатилмайди**: улар
 * 100/85 чегарасига қурилган ва янги чегара билан зид натижа берарди
 * (масалан 96% — бу ерда «Норма», у ерда «диққат» ранги).
 *
 * ═══ 3. Фоиз текширилмайди ════════════════════════════════════════════════
 *
 * `pct` бэкенддан ҳар доим тўғри келади (K устуни фоиз бўлмаган қаторларни
 * бэкенднинг ўзи ҳисоблайди). «Фоиз режа/фактга ўхшамаса — бузуқ» деган
 * текширув бу ерда **йўқ ва бўлмаслиги керак**: манбада ҳақиқий 1000% ҳам
 * бор (№27 «Молибденовая проволока», режа 10, факт 100). Аномал фоиз
 * яширилмайди — прогресс шкалада кесилади, сон тўлиқ ёзилади.
 *
 * ═══ 4. Техник майдонлар ══════════════════════════════════════════════════
 *
 * `row`, `anchor`, `balanceStepId`, `source`, `pctSource` view-model'га
 * умуман ўтмайди. `note` дан фақат мавжудлик белгиси олинади.
 */

/* -------------------------------------------------------------------------- */
/* созламалар                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Бажарилиш фоизи чегаралари — **бир жойда**, шу бўлим учун.
 * `norm` дан юқориси «Норма», `attention` дан юқориси «Диққат», қолгани
 * «Муаммо». Ўзгартириш учун фақат шу иккита сонни таҳрирлаш кифоя.
 */
export const KPI_THRESHOLDS = {
  /** Шу фоиздан бошлаб — «Норма». */
  norm: 95,
  /** Шу фоиздан бошлаб — «Диққат»; ундан пасти «Муаммо». */
  attention: 80,
} as const;

/** Прогресс шкаласининг юқори чегараси: ундан катта фоиз устунни бузмайди. */
export const KPI_PCT_MAX = 150;

/** Асосий жадвалда нечта қатор кўрсатилади. */
const KPI_TABLE_TOP = 10;

/**
 * Биринчи экранда нечта категория кўрсатилади; қолгани «Яна N та» орқали.
 *
 * Сон **ўлчаб** танланган: рўйхат карточкаси ёнидаги «Статуслар тақсимоти»
 * карточкаси билан бир хил баландликда туриши керак. Донат карточкаси —
 * қобиқ 32px + донат 132px + изоҳ 26.7px ≈ **190.7px**. Рўйхат карточкаси —
 * қобиқ 32px + «Яна» тугмаси 35.2px + жадвал тугмаси 37.2px = 104.5px, устига
 * ҳар бир қатор 28px (`text-[12px]` × 1.5 + `py-[5px]`).
 *
 *   104.5 + 28 × 3 = 188.5px  → фарқ −2.2px  ✔
 *   104.5 + 28 × 4 = 216.5px  → фарқ +25.8px ✘ (рўйхат донатдан баланд бўларди)
 *
 * Шунинг учун 3. Ўлчов ўзгарса (донат `size`, изоҳ қатори, қатор паддинги)
 * бу сон ҳам қайта ҳисобланиши керак.
 */
export const KPI_CATEGORY_FIRST = 3;

/** Ҳолат учун ўқиладиган ном — ранг ёлғиз маъно ташимаслиги учун. */
export const KPI_STATUS_LABEL: Record<Status, string> = {
  good: "Норма",
  warn: "Диққат",
  crit: "Муаммо",
  mute: "Баҳоланмайди",
};

/** Ҳолат ранги (фон/устун) — CSS токени, hex ёзилмайди. */
export const KPI_STATUS_TOKEN: Record<Status, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  mute: "var(--rule)",
};

/** Ҳолат матни ранги — фонда ўқилиши учун алоҳида токен. */
export const KPI_STATUS_INK: Record<Status, string> = {
  good: "var(--good-ink)",
  warn: "var(--warn-ink)",
  crit: "var(--crit-ink)",
  mute: "var(--ink-3)",
};

/** Донат ва тақсимотда ҳолатлар шу тартибда: оғирдан енгилга. */
export const KPI_STATUS_ORDER: Status[] = ["crit", "warn", "good", "mute"];

/** Фоиздан ҳолат — **фақат шу бўлимнинг** чегараси бўйича. */
export function kpiStatusOf(pct: number | null | undefined): Status {
  if (pct === null || pct === undefined || !isFinite(pct)) return "mute";
  if (pct >= KPI_THRESHOLDS.norm) return "good";
  if (pct >= KPI_THRESHOLDS.attention) return "warn";
  return "crit";
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

/** IEEE-754 шовқинини кесиш — яхлитлаш эмас. */
function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

export interface KpiCellVM {
  plan: number | null;
  fakt: number | null;
  /** Бэкенддан келган фоиз — қайта ҳисобланмайди ва текширилмайди. */
  pct: number | null;
  /** Прогресс учун `0…KPI_PCT_MAX` оралиғига келтирилган фоиз. */
  barPct: number | null;
  /** Фоиз шкаладан ошган — устун кесилади, сон тўлиқ ёзилади. */
  anomaly: boolean;
  /** Факт бор, режа қўйилмаган — фоиз маънога эга эмас. */
  planless: boolean;
  /** Режа ҳам, факт ҳам йўқ (нол эмас — маълумот йўқ). */
  empty: boolean;
  how: KpiHow;
}

export interface KpiRowVM {
  no: number;
  name: string;
  category: string;
  site: string;
  unit: string;
  /** `false` — манба варағи ҳали импорт қилинмаган. */
  available: boolean;
  /** Манбада чеклов қайд этилган (изоҳ матни экранга чиқмайди). */
  hasLimit: boolean;
  cell: KpiCellVM | null;
  /** Олдинги ойдаги фоиз — қатор тафсилотида кўрсатилади. */
  prevPct: number | null;
  /** Оғиш: факт − режа, кўрсаткич ўз бирлигида. */
  gap: number | null;
  status: Status;
  /** Фоизи бор — рейтинг, донат ва прогрессга киради. */
  comparable: boolean;
  /** Режа юритилмайди (ҳисоблагич/журнал) — фақат факт бор. */
  factOnly: boolean;
}

export type KpiCounts = Record<Status, number> & { total: number };

export interface KpiCategoryVM {
  key: string;
  title: string;
  /** Категория бўйича медиана фоиз; таққосланадиган қатор бўлмаса `null`. */
  pct: number | null;
  status: Status;
  counts: KpiCounts;
}

export interface KpiOverallVM {
  /** Медиана бажарилиш фоизи; таққосланадиган қатор бўлмаса `null`. */
  pct: number | null;
  /** Олдинги ойда — **айнан шу** кўрсаткичлар тўплами бўйича. */
  prevPct: number | null;
  /** Фарқ, фоиз пункти. */
  delta: number | null;
}

/**
 * Битта ойнинг тарихдаги кесими. Спарклайн (медиана) ва ҳолат динамикаси
 * диаграммаси (санолар) **битта** массивдан ўқийди — иккиси ҳар доим бир хил
 * кўрсаткичлар тўплами ва бир хил чегара бўйича ҳисобланган бўлиши учун.
 */
export interface KpiHistoryPoint {
  month: string;
  /** Ўқдаги қисқа белги. */
  label: string;
  /** Тултип сарлавҳаси. */
  full: string;
  /** Медиана бажарилиш фоизи. */
  pct: number | null;
  good: number;
  warn: number;
  crit: number;
  /**
   * Фоизи йўқ кўрсаткичлар. Диаграммада **устун сифатида чизилмайди**
   * (уч устун талаб қилинган), шунинг учун `good + warn + crit` ойлик
   * жамидан кам чиқади — фарқ айнан шу сон. У тултип сарлавҳасида ва
   * жадвал кўринишида очиқ ёзилади.
   */
  mute: number;
  /** Шу ойдаги жами кўрсаткич (тўртталасининг йиғиндиси). */
  total: number;
}

/** Фильтр — «ҳаммаси» учун шу қиймат. */
export const KPI_ALL = "ALL";

export interface KpiFilter {
  category: string;
  site: string;
  /** `Status` ёки `KPI_ALL`. */
  status: string;
}

export const KPI_EMPTY_FILTER: KpiFilter = {
  category: KPI_ALL,
  site: KPI_ALL,
  status: KPI_ALL,
};

export const kpiFilterActive = (f: KpiFilter): boolean =>
  f.category !== KPI_ALL || f.site !== KPI_ALL || f.status !== KPI_ALL;

export interface KpiVM {
  month: string;
  reference: string;
  months: string[];
  /** Олдинги ой (жавобдаги) — тренд шу билан ҳисобланган. */
  previous: string | null;
  /** Фильтрдан ўтган қаторлар. */
  rows: KpiRowVM[];
  /** Фильтрсиз жами — «нечтадан нечтаси» кўрсатиш учун. */
  totalAll: number;
  counts: KpiCounts;
  overall: KpiOverallVM;
  /** Ойлар кесимидаги ҳолат динамикаси ва медиана — қаранг `KpiHistoryPoint`. */
  history: KpiHistoryPoint[];
  categories: KpiCategoryVM[];
  /** Жадвалнинг биринчи экрани. */
  table: KpiRowVM[];
  /** Фильтр рўйхатлари — фильтрдан **олдинги** тўлиқ тўпламдан. */
  options: { categories: string[]; sites: string[] };
  hasValues: boolean;
}

/* -------------------------------------------------------------------------- */
/* ҳисоблаш                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Медиана — ўртача эмас. Сабаби: паспортда ҳақиқий 1000% (№27) ва 392% (№16)
 * қаторлари бор; ўртача улар туфайли юқорига сурилиб, «умумий бажарилиш»
 * ёлғон оптимистик чиқарди. Медиана бундай четки қийматларга барқарор.
 */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const a = values.slice().sort((x, y) => x - y);
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : Number(((a[m - 1] + a[m]) / 2).toPrecision(15));
}

const medianOf = (rows: KpiRowVM[], pick: (r: KpiRowVM) => number | null): number | null =>
  median(rows.map(pick).filter((v): v is number => v !== null));

function toCell(v: KpiCell | null | undefined): KpiCellVM | null {
  if (!v) return null;
  const plan = clean(v.plan);
  const fakt = clean(v.fakt);
  const pct = clean(v.pct);

  return {
    plan,
    fakt,
    pct,
    barPct: pct === null ? null : Math.max(0, Math.min(pct, KPI_PCT_MAX)),
    anomaly: pct !== null && pct > KPI_PCT_MAX,
    planless: pct === null && (plan === null || plan === 0) && fakt !== null,
    empty: plan === null && fakt === null,
    how: v.how,
  };
}

function toRow(k: KpiIndicator, month: string, previous: string | null): KpiRowVM {
  const cell = toCell(k.values[month]);
  const prev = previous ? toCell(k.values[previous]) : null;
  const comparable =
    cell !== null && !cell.empty && cell.pct !== null && (cell.plan ?? 0) > 0;
  const prevPct = prev?.pct ?? null;

  return {
    no: k.no,
    name: k.name,
    category: k.category,
    site: k.site,
    unit: k.unit,
    available: k.available,
    hasLimit: k.note !== null && k.note.trim() !== "",
    cell,
    prevPct,
    gap:
      cell && cell.plan !== null && cell.fakt !== null
        ? Number((cell.fakt - cell.plan).toPrecision(15))
        : null,
    status: comparable ? kpiStatusOf(cell.pct) : "mute",
    comparable,
    factOnly: cell !== null && cell.how === "aggregate",
  };
}

const emptyCounts = (): KpiCounts => ({ good: 0, warn: 0, crit: 0, mute: 0, total: 0 });

// Фақат шу файл ичида — панел саноқни `KpiVM.counts` дан олади.
function kpiCounts(rows: KpiRowVM[]): KpiCounts {
  const c = emptyCounts();
  for (const r of rows) {
    c[r.status] += 1;
    c.total += 1;
  }
  return c;
}

/** Фильтрни қўллаш — фильтр майдонлари бир-биридан мустақил (VA боғланиши). */
function kpiApplyFilter(rows: KpiRowVM[], f: KpiFilter): KpiRowVM[] {
  return rows.filter(
    (r) =>
      (f.category === KPI_ALL || r.category === f.category) &&
      (f.site === KPI_ALL || r.site === f.site) &&
      (f.status === KPI_ALL || r.status === f.status),
  );
}

/** Кўрсатиладиган ой: сўралгани жавобда бўлмаса — рўйхатдаги охиргиси. */
export function kpiMonth(res: KpiResponse, wanted: string | null): string {
  if (wanted && res.months.includes(wanted)) return wanted;
  return res.months[res.months.length - 1] ?? res.reference;
}

/**
 * Манба тартибини сақлаган ҳолда гуруҳлаш: гуруҳлар биринчи учраган
 * кўрсаткич тартибида чиқади (паспортдаги «№»), алифбо бўйича эмас.
 */
function groupBy(rows: KpiRowVM[], keyOf: (r: KpiRowVM) => string): Map<string, KpiRowVM[]> {
  const by = new Map<string, KpiRowVM[]>();
  for (const r of rows) {
    const k = keyOf(r);
    const list = by.get(k);
    if (list) list.push(r);
    else by.set(k, [r]);
  }
  return by;
}

export function kpiView(res: KpiResponse, month: string, filter: KpiFilter): KpiVM {
  const idx = res.months.indexOf(month);
  const previous = idx > 0 ? res.months[idx - 1] : null;

  const all = res.kpis.map((k) => toRow(k, month, previous));
  const rows = kpiApplyFilter(all, filter);

  // Спарклайн ва «олдинги ойга» фарқи — **айнан шу** кўрсаткичлар тўплами
  // бўйича. Ҳолат фильтри жорий ойга боғлиқ бўлгани учун тарихга у эмас,
  // категория ва цех фильтри қўлланади: акс ҳолда ҳар ой бошқа тўплам
  // солиштирилиб, тренд маънога эга бўлмасди.
  const scope = new Set(
    kpiApplyFilter(all, { ...filter, status: KPI_ALL }).map((r) => r.no),
  );
  const scoped = res.kpis.filter((k) => scope.has(k.no));
  const history: KpiHistoryPoint[] = res.months.map((m) => {
    const at = scoped.map((k) => toRow(k, m, null));
    const c = kpiCounts(at);
    return {
      month: m,
      label: monthTick(m),
      full: monthLabel(m),
      pct: medianOf(at.filter((r) => r.comparable), (r) => r.cell?.pct ?? null),
      good: c.good,
      warn: c.warn,
      crit: c.crit,
      mute: c.mute,
      total: c.total,
    };
  });

  const overallPct = medianOf(rows, (r) => (r.comparable ? (r.cell?.pct ?? null) : null));
  const prevPct = medianOf(rows, (r) => r.prevPct);

  const categories: KpiCategoryVM[] = [...groupBy(rows, (r) => r.category).entries()].map(
    ([key, list]) => {
      const pct = medianOf(list, (r) => (r.comparable ? (r.cell?.pct ?? null) : null));
      return { key, title: key, pct, status: kpiStatusOf(pct), counts: kpiCounts(list) };
    },
  );
  // Энг оғир категория тепада — раҳбар аввал шуни кўради.
  categories.sort((a, b) => (a.pct ?? Number.POSITIVE_INFINITY) - (b.pct ?? Number.POSITIVE_INFINITY));

  const comparable = rows.filter((r) => r.comparable);
  const byPct = comparable.slice().sort((a, b) => (a.cell?.pct ?? 0) - (b.cell?.pct ?? 0));

  return {
    month,
    reference: res.reference,
    months: res.months,
    previous,
    rows,
    totalAll: all.length,
    counts: kpiCounts(rows),
    overall: {
      pct: overallPct,
      prevPct,
      delta:
        overallPct !== null && prevPct !== null
          ? Number((overallPct - prevPct).toPrecision(15))
          : null,
    },
    history,
    categories,
    // Жадвал ҳам энг паст бажарилишдан бошланади: биринчи экранда энг муҳими.
    table: byPct.slice(0, KPI_TABLE_TOP),
    options: {
      categories: [...new Set(all.map((r) => r.category))],
      sites: [...new Set(all.map((r) => r.site))],
    },
    hasValues: all.some((r) => r.cell !== null && !r.cell.empty),
  };
}

/**
 * Қатор нима учун баҳоланмаганини қисқа ўзбекча изоҳ билан беради.
 * Бэкенддаги `note` матни бу ерга **кўчирилмайди** — у ишлаб чиқувчи учун
 * ёзилган ва mapping тафсилотларини сақлайди.
 */
export function kpiWhyMute(r: KpiRowVM): string | null {
  if (!r.available) return "манба ҳали импорт қилинмаган";
  if (!r.cell) return "кўрсаткич манба варағида топилмади";
  if (r.cell.empty) return "бу ой учун маълумот йўқ";
  if (r.factOnly) return "режа юритилмайди — фақат факт";
  if (r.cell.planless) return "режа қўйилмаган";
  return null;
}

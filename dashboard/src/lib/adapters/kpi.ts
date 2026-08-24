import type { KpiCell, KpiHow, KpiIndicator, KpiResponse } from "../../api/types";
import type { Status } from "../../types";
import { monthLabel, monthTick, statusOf } from "../format";

/**
 * «Паспорт показателей» (45 кўрсаткич): API жавобидан панел кутадиган
 * кўринишга ўтказиш. Панел `KpiIndicator` ни кўрмайди — фақат шу ердаги
 * view-model'ни.
 *
 * ─── Уч қарор шу файлда, чунки уларнинг ҳаммаси маълумотнинг ўзига тегишли ──
 *
 *  1. **Такрорланишни кесиш.** 45 кўрсаткичнинг 22 таси (`inBalance`) айни
 *     пайтда «Металлар баланси» занжирининг босқичи ҳамдир. Битта экранда
 *     битта кўрсаткич икки марта турмаслиги учун қоида: **занжир кўринган
 *     жойда рўйхат уни такрорламайди**. Амалда:
 *       · «Ишлаб чиқариш» кўринишида занжир (`BalanceSection`) тўлиқ чизилади,
 *         шунинг учун KPI рўйхатлари фақат `inBalance === false` қаторларни
 *         олади (`operational`);
 *       · «Раҳбарият» кўринишида занжир чизилмайди, унинг ўрнида фақат
 *         **йиғма** ҳолат (сех/категория кесимида санолар) кўрсатилади —
 *         у якка кўрсаткич номи ва қийматини чиқармайди, шунинг учун TOP
 *         рўйхатлар барча 45 кўрсаткичдан танлай олади.
 *     Тўлиқ 45 қаторли жадвал ҳар икки кўринишда ҳам бор, лекин **йиғилган
 *     ҳолда** (`TableToggle`) — очиш фойдаланувчининг ўз ҳаракати.
 *
 *  2. **Фоиз текширилмайди.** `pct` бэкенддан ҳар доим тўғри келади: K устуни
 *     ҳақиқатан фоиз бўлса хом ҳолда, бўлмаса бэкенднинг ўзи `fakt/plan` дан
 *     ҳисоблайди (`pctSource` шуни билдиради, лекин бу техник тафсилот —
 *     view-model'га ўтмайди).
 *
 *     Бу ерда «фоиз режа/фактга ўхшамаса — бузуқ» деган текширув **йўқ ва
 *     бўлмаслиги керак**: манбада ҳақиқий 1000% ҳам бор (№27 «Молибденовая
 *     проволока», 2026-03 да режа 10, факт 100 — бу ҳақиқий ортиқча
 *     бажарилиш). Бундай эвристика ўша қаторни жимгина яшириб қўярди.
 *     Аномал фоиз яширилмайди: устун шкалада кесилади (`anomaly`), ҳақиқий
 *     сон эса тўлиқ ёзилади.
 *
 *  3. **Техник тафсилот экранга чиқмайди.** `row` (манба сатри), `anchor` ва
 *     `note` (бэкенддаги лотин ёзувли mapping изоҳи) view-model'га ўтмайди.
 *     `note` дан фақат мавжудлик белгиси (`hasLimit`) олинади — рақам эмас,
 *     балки «манбада чеклов қайд этилган» огоҳлантириши.
 */

/** Фоиз ўқининг юқори чегараси — балансдаги шкала билан бир хил. */
export const KPI_PCT_MAX = 150;

/** Ўқдаги «100%» белгисининг ўрни (устун кенглигининг фоизи). */
export const KPI_PCT_REF_AT = (100 / KPI_PCT_MAX) * 100;

/** TOP рўйхатларда нечта қатор кўрсатилади. */
export const KPI_TOP_N = 6;

/**
 * IEEE-754 шовқинини олиб ташлаш: `3.0000000000000013` → `3`.
 * Бу **яхлитлаш эмас** — `adapters/balance.ts` даги `clean()` билан бир хил.
 */
function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

export interface KpiCellVM {
  plan: number | null;
  fakt: number | null;
  /** Бэкенддан келган бажарилиш фоизи — қайта ҳисобланмайди ва текширилмайди. */
  pct: number | null;
  /** Устун учун `0…KPI_PCT_MAX` оралиғига келтирилган фоиз. */
  barPct: number | null;
  /** Ҳақиқий фоиз чегарадан ошган — устун кесилган, сон тўлиқ ёзилади. */
  anomaly: boolean;
  /** Факт бор, режа қўйилмаган — бажарилиш фоизи маънога эга эмас. */
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
  /** `false` — манба варағи ҳали импорт қилинмаган (№43, 44, 45). */
  available: boolean;
  /** `true` — «Металлар баланси» занжирида босқич сифатида ҳам бор. */
  inBalance: boolean;
  /** Манбада чеклов қайд этилган (изоҳ матни экранга чиқмайди). */
  hasLimit: boolean;
  /** Танланган ой учун қиймат; кўрсаткич варақда умуман бўлмаса `null`. */
  cell: KpiCellVM | null;
  /** Рейтинг ва рангда ишлатиладиган ҳолат. */
  status: Status;
  /** Фоизи ишончли — TOP рўйхат ва фоиз диаграммасига кириши мумкин. */
  comparable: boolean;
  /** Режа юритилмайди (ҳисоблагич/журнал) — фақат факт бор. */
  factOnly: boolean;
}

export interface KpiGroupVM {
  key: string;
  title: string;
  rows: KpiRowVM[];
  counts: KpiCounts;
}

export interface KpiCounts {
  good: number;
  warn: number;
  crit: number;
  /** Ҳолати аниқланмаган: маълумот йўқ ёки режа қўйилмаган/юритилмайди. */
  mute: number;
  total: number;
}

export interface KpiTrendPoint {
  month: string;
  /** Ўқдаги қисқа белги. */
  label: string;
  /** Тултипдаги тўлиқ ном. */
  full: string;
  good: number;
  warn: number;
  crit: number;
}

export interface KpiVM {
  /** Кўрсатилаётган ой. */
  month: string;
  /** Эталон ой — рўйхатда алоҳида белгиланади. */
  reference: string;
  months: string[];
  /** Барча 45 қатор, `no` тартибида — тўлиқ жадвал учун. */
  all: KpiRowVM[];
  /**
   * Занжирда кўрсатилмайдиган кўрсаткичлар (`inBalance === false`).
   * «Ишлаб чиқариш» кўриниши шуларни рўйхатлайди.
   */
  operational: KpiRowVM[];
  /** Занжир босқичи ҳам бўлган кўрсаткичлар — фақат йиғма ҳолат учун. */
  inBalance: KpiRowVM[];
  /** Манба варағи импорт қилинмаганлар — алоҳида кўрсатилади, яширилмайди. */
  unavailable: KpiRowVM[];
  /** Барча 45 кўрсаткич бўйича ҳолат тақсимоти. */
  counts: KpiCounts;
  /** Категория кесимида (барча кўрсаткичлар). */
  categories: KpiGroupVM[];
  /** Сех/участка кесимида (барча кўрсаткичлар) — «жараён» блоки учун. */
  sites: KpiGroupVM[];
  /** Энг паст бажарилиш — фоизи ишончли қаторлардан. */
  problems: KpiRowVM[];
  /** Энг юқори бажарилиш — фоизи ишончли қаторлардан. */
  wins: KpiRowVM[];
  /** Танланган ойда бирорта сон борми. */
  hasValues: boolean;
}

/* -------------------------------------------------------------------------- */
/* катак                                                                      */
/* -------------------------------------------------------------------------- */

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

function toRow(k: KpiIndicator, month: string): KpiRowVM {
  const cell = toCell(k.values[month]);
  const comparable = cell !== null && !cell.empty && cell.pct !== null && (cell.plan ?? 0) > 0;

  return {
    no: k.no,
    name: k.name,
    category: k.category,
    site: k.site,
    unit: k.unit,
    available: k.available,
    inBalance: k.inBalance,
    hasLimit: k.note !== null && k.note.trim() !== "",
    cell,
    status: comparable ? statusOf(cell.pct) : "mute",
    comparable,
    // `aggregate` — ҳисоблагич/журнал: режа умуман юритилмайди.
    factOnly: cell !== null && cell.how === "aggregate",
  };
}

/* -------------------------------------------------------------------------- */
/* гуруҳлаш                                                                   */
/* -------------------------------------------------------------------------- */

export function kpiCounts(rows: KpiRowVM[]): KpiCounts {
  const c: KpiCounts = { good: 0, warn: 0, crit: 0, mute: 0, total: rows.length };
  for (const r of rows) c[r.status] += 1;
  return c;
}

/**
 * Манба тартибини сақлаган ҳолда гуруҳлаш: гуруҳлар биринчи учраган
 * кўрсаткич тартибида чиқади (паспортдаги «№» тартиби), алифбо бўйича эмас —
 * шунда 1-цехдан бошланадиган табиий кетма-кетлик сақланади.
 */
function groupBy(rows: KpiRowVM[], keyOf: (r: KpiRowVM) => string): KpiGroupVM[] {
  const byKey = new Map<string, KpiRowVM[]>();
  for (const r of rows) {
    const k = keyOf(r);
    const list = byKey.get(k);
    if (list) list.push(r);
    else byKey.set(k, [r]);
  }
  return [...byKey.entries()].map(([key, list]) => ({
    key,
    title: key,
    rows: list,
    counts: kpiCounts(list),
  }));
}

export const kpiGroupByCategory = (rows: KpiRowVM[]): KpiGroupVM[] =>
  groupBy(rows, (r) => r.category);

export const kpiGroupBySite = (rows: KpiRowVM[]): KpiGroupVM[] => groupBy(rows, (r) => r.site);

/* -------------------------------------------------------------------------- */
/* асосий кўриниш                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Кўрсатиладиган ой: сўралган ой жавобда бўлмаса — рўйхатдаги охиргиси.
 * Қиймат ойлар бўйича қўшилмайди, шунинг учун давр бир нечта ойни қамраса
 * ҳам экранда битта ой туради (панел буни изоҳда ёзади).
 */
export function kpiMonth(res: KpiResponse, wanted: string | null): string {
  if (wanted && res.months.includes(wanted)) return wanted;
  return res.months[res.months.length - 1] ?? res.reference;
}

export function kpiView(res: KpiResponse, month: string): KpiVM {
  const all = res.kpis.map((k) => toRow(k, month));
  const withData = all.filter((r) => r.available);

  const comparable = all.filter((r) => r.comparable);
  const byPct = comparable
    .slice()
    .sort((a, b) => (a.cell?.pct ?? 0) - (b.cell?.pct ?? 0));

  return {
    month,
    reference: res.reference,
    months: res.months,
    all,
    operational: withData.filter((r) => !r.inBalance),
    inBalance: withData.filter((r) => r.inBalance),
    unavailable: all.filter((r) => !r.available),
    counts: kpiCounts(all),
    // Гуруҳлар **барча 45** қатор устидан: манбаси импорт қилинмаганлари ҳам
    // «баҳоланмайди» бўлиб саналади, шунда гуруҳлар йиғиндиси умумий ҳолат
    // билан мос келади ва бирорта кўрсаткич ҳисобдан тушиб қолмайди.
    categories: kpiGroupByCategory(all),
    sites: kpiGroupBySite(all),
    problems: byPct.slice(0, KPI_TOP_N),
    wins: byPct.slice(-KPI_TOP_N).reverse(),
    hasValues: all.some((r) => r.cell !== null && !r.cell.empty),
  };
}

/**
 * Ойлар кесимида ҳолат тақсимоти.
 *
 * Нега сано, миқдор эмас: кўрсаткичлар турли бирликда (т, кг, м³, шт, соат) —
 * уларни битта ўққа қўшиб бўлмайди. «Режани бажарган кўрсаткичлар сони» эса
 * бирликсиз ва ойдан-ойга солиштириладиган ягона тўғри йиғма.
 */
export function kpiTrend(res: KpiResponse): KpiTrendPoint[] {
  return res.months.map((m) => {
    const c = kpiCounts(res.kpis.map((k) => toRow(k, m)));
    return {
      month: m,
      label: monthTick(m),
      full: monthLabel(m),
      good: c.good,
      warn: c.warn,
      crit: c.crit,
    };
  });
}

/**
 * Гуруҳларни «эътибор талаб қилиши» бўйича тартиблайди: аввал муаммоси кўпи,
 * кейин диққат талаб қилгани, сўнг каттароғи.
 *
 * Гуруҳлашнинг ўзи манба тартибини сақлайди (паспортдаги «№»), чунки сех
 * кесимида у табиий жараён кетма-кетлигини беради. Тартибни ўзгартириш
 * кераклиги — **кўрсатиш** қарори, шунинг учун алоҳида функция.
 */
export function kpiSortByRisk(groups: KpiGroupVM[]): KpiGroupVM[] {
  return groups
    .slice()
    .sort(
      (a, b) =>
        b.counts.crit - a.counts.crit ||
        b.counts.warn - a.counts.warn ||
        b.counts.total - a.counts.total,
    );
}

/* -------------------------------------------------------------------------- */
/* матн ёрдамчилари                                                           */
/* -------------------------------------------------------------------------- */

/** Ҳолатнинг ўқиладиган номи — ранг ягона маъно ташувчиси бўлмаслиги учун. */
export const KPI_STATUS_LABEL: Record<Status, string> = {
  good: "режа бажарилган",
  warn: "диққат талаб қилади",
  crit: "режадан ортда",
  mute: "баҳоланмайди",
};

/** Ҳолат учун CSS ранг токени — hex ҳеч қаерда ёзилмайди. */
export const KPI_STATUS_TOKEN: Record<Status, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  crit: "var(--crit)",
  mute: "var(--rule)",
};

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

import type { Status } from "../../types";
import type { FinanceReportDashboard } from "../../api/types";
import { deltaTxt, exact, nf } from "../format";
// Ҳолат → CSS ранг токени: бу карта умумий (KPI'га хос эмас), шунинг учун
// иккинчи нусхаси ёзилмайди — `var(--good)` каби токенлар бир жойда туради.
import { KPI_STATUS_TOKEN as STATUS_TOKEN } from "./kpi";

/**
 * Сатр калитлари — бэкенддаги `FINANCE_REPORT_ROWS` (`finance-report.constants.ts`)
 * билан бир хил ва бир хил тартибда. Аввал бу рўйхат ва барча қийматлар шу
 * лойиҳада (`lib/finance/financeSource.ts`) статик турарди — энди улар
 * `/finance-report/dashboard` дан келади, фақат калит номлари шу турда қолди:
 * панел ва бу адаптер уларга типли равишда мурожаат қилади (`r.revenue` каби).
 */
export type FinRowKey =
  | "revenue"
  | "profit"
  | "margin"
  | "netCash"
  | "assetsTotal"
  | "assetsCurrent"
  | "assetsNonCurrent"
  | "liabTotal"
  | "liabCurrent"
  | "liabNonCurrent"
  | "equityAndLiab"
  | "equityTotal"
  | "buildInProgress"
  | "subsidiaryInvest"
  | "fixedAssets"
  | "otherNonCurrent"
  | "receivables"
  | "inventories"
  | "cash"
  | "otherCurrent"
  | "charterCapital"
  | "retainedEarnings"
  | "otherReserves"
  | "currentRatio"
  | "debtToEquity"
  | "cfOperating"
  | "cfInvesting"
  | "cfFinancing"
  | "cashEquivalents";

export interface FinRow {
  key: FinRowKey;
  /** Интерфейсда кўринадиган ном — кирилл ўзбекча. */
  label: string;
  /** Ойлар бўйича қиймат, `FinVM.months` тартибида. Сумма — минг сўм. */
  values: number[];
}

/**
 * Молиявий кўрсаткичлар бўлими учун view-model.
 *
 * Панел манба тузилмасини билмайди: у фақат шу файл тайёрлаган қийматларни
 * олади. Манба янгиланса ёки сатр номи ўзгарса — тузатиш шу ерда бўлади.
 *
 * ═══ Бирлик ва форматлаш ════════════════════════════════════════════════
 *
 * Манбадаги сумма — **минг сўм**. Диаграммада ўқ белгиси млрд сўмга
 * келтирилади (÷1 000 000), чунки минг сўмдаги тўққиз хонали сон ўқда
 * ўқилмайди. Тултип ва жадвалда эса **манбадаги аниқ қиймат** қолади:
 * `75247733.6331 / 1e6` сузувчи нуқтада `75.24773363310002` беради, шунинг
 * учун қиймат ҳеч қаерда бўлинмайди — фақат ўқ белгиси ҳисобланади.
 *
 * Маржа ва коэффициентлар — нисбат. Фоизга ўтказиш (`×100`) манбадаги етти
 * қиймат учун ҳам аниқ чиқади (текширилган), шунинг учун жадвалда
 * `exact()` билан тўлиқ кўрсатилади; тултип ва плиткада — икки хонагача,
 * лойиҳада фоиз шундай ёзилади (`pctTxt`).
 */

/* -------------------------------------------------------------------------- */
/* форматлагичлар                                                             */
/* -------------------------------------------------------------------------- */

/** Ўқ белгиси: минг сўм → млрд сўм, бутун сон. */
export const finAxis = (v: number): string => nf(v / 1e6, 0);

/** Тултип ва жадвал: манбадаги аниқ қиймат, яхлитланмайди. */
export const finSum = (v: number): string => exact(v) + " минг сўм";

/** Плитка учун ихчам сумма: млрд сўм, икки хона. */
export const finBln = (v: number): string => nf(v / 1e6, 2);

/** Нисбат → фоиз, жадвал учун тўлиқ аниқликда. */
export const finPctExact = (v: number): string => exact(v * 100) + "%";

/**
 * **Ҳисобланган** қиймат (фарқ, йиғинди) — манбада турмаган сон.
 *
 * Бу ерда `exact()` ишлатилмайди: сузувчи нуқтада `105227473 − 93952590.8287`
 * натижаси `11274882.171299994` бўлиб чиқади ва экранга IEEE «думи» тушарди.
 * Икки хона манбадаги аниқликдан ортиқ, шунинг учун маълумот йўқолмайди.
 * Манбанинг ўз қиймати эса ҳамон `finSum()` билан, ўзгаришсиз чиқади.
 */
export const finCalc = (v: number): string => nf(v, 2);

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface FinKpi {
  key: string;
  label: string;
  /** Тайёр форматланган асосий қиймат. */
  value: string;
  unit: string;
  /** Олдинги ойга нисбатан ўзгариш — тайёр матн. */
  delta: string;
  status: Status;
  /** Ҳолат ранги токени — плитка чизиғи ва спарклайн учун. */
  token: string;
  /** 7 ойлик тренд. */
  spark: number[];
}

export interface FinCashPoint {
  label: string;
  /** Баланс таркибидаги «Пул маблағлари». */
  balance: number;
  /** Пул оқими ҳисоботидаги «Пул маблағлари ва эквивалентлари». */
  equivalents: number;
  /** Иккисининг фарқи — тизимли, яширилмайди. */
  gap: number;
}

export interface FinChainBreak {
  label: string;
  /** Олдинги ой қолдиғи + шу ойнинг соф оқими. */
  expected: number;
  /** Манбадаги қолдиқ. */
  actual: number;
  diff: number;
}

export interface FinVM {
  /** Тўлиқ ой номлари — йилсиз. */
  months: string[];
  /** Ўқ белгилари. */
  ticks: string[];
  lastMonth: string;
  prevMonth: string;
  rows: Record<FinRowKey, FinRow>;
  /** Маржа фоизда — диаграмма учун. */
  marginPct: number[];
  kpis: FinKpi[];
  cash: FinCashPoint[];
  gapMin: number;
  gapMax: number;
  /** Қолдиқ занжири ёпилмаган ойлар (бўш бўлса — ҳаммаси мос). */
  chainBreaks: FinChainBreak[];
}

/**
 * Ойлик ўзгариш ранги.
 *
 * Чегара молиявий стандарт эмас — фақат кўз тортиш учун: ўсиш «норма»,
 * 10% гача пасайиш «диққат», ундан кўпи «муаммо». Ранг ёлғиз маъно ташувчи
 * эмас: ўзгариш сони доим ёнида ёзилади.
 */
const SEVERE_PCT = 10;
/** Маржа учун худди шундай чегара, фақат пункт (п.п.) ҳисобида. */
const SEVERE_PP = 3;

const statusOfPct = (pct: number, severeAt: number): Status =>
  pct > 0 ? "good" : pct === 0 ? "mute" : pct <= -severeAt ? "crit" : "warn";

/** Ишорали пункт матни: «−9,28 п.п.». */
const ppTxt = (pp: number): string => (pp >= 0 ? "+" : "−") + nf(Math.abs(pp), 2) + " п.п.";

/** Ишорали млрд матни: «+41,77 млрд сўм». */
const blnTxt = (v: number): string =>
  (v >= 0 ? "+" : "−") + nf(Math.abs(v) / 1e6, 2) + " млрд сўм";

/**
 * Қолдиқ занжирини текшириш чегараси, минг сўмда.
 *
 * Манбадаги йиғиндилар сузувчи нуқта сабабли мингдан бир улушга фарқ қилади
 * (масалан 0,0003) — бу фарқ эмас. 1 минг сўмдан катта фарқ эса ҳақиқий
 * узилиш ва кўрсатилади.
 */
const CHAIN_EPS = 1;

/** `/finance-report/dashboard` жавобидаги қаторларни `FinRowKey` бўйича йиғади. */
function rowsByKey(rows: FinanceReportDashboard["rows"]): Record<FinRowKey, FinRow> {
  const map = {} as Record<FinRowKey, FinRow>;
  for (const row of rows) {
    const key = row.key as FinRowKey;
    map[key] = { key, label: row.label, values: row.values };
  }
  return map;
}

/**
 * @param data — `getFinanceReport()` жавоби (`api/endpoints.ts`). Панел уни
 * `useQuery` орқали олади, бу функцияга ҳом API маълумоти эмас, шу жавоб
 * узатилади — панел эса фақат қайтган view-model'ни кўради.
 */
export function financeVM(data: FinanceReportDashboard): FinVM {
  const r = rowsByKey(data.rows);
  const months = data.months;
  const ticks = months.map((m) => m.slice(0, 3));
  const n = months.length;
  const last = n - 1;
  const prev = n - 2;

  const marginPct = r.margin.values.map((v) => v * 100);

  /* --- плиткалар: охирги ой ва олдинги ойга нисбатан ўзгариш ------------ */

  const revPct = ((r.revenue.values[last] - r.revenue.values[prev]) / r.revenue.values[prev]) * 100;
  const proPct = ((r.profit.values[last] - r.profit.values[prev]) / r.profit.values[prev]) * 100;
  const marginPp = marginPct[last] - marginPct[prev];
  const cashDiff = r.netCash.values[last] - r.netCash.values[prev];

  // Соф пул оқимида фоиз ўзгариш маъносиз: ишора алмашганда у ёлғон гапиради
  // (−31,5 дан +10,3 га ўтиш «−133%» бўлиб кўринарди). Шунинг учун абсолют
  // фарқ ёзилади, ҳолат эса қийматнинг ўз ишорасидан олинади.
  const cashStatus: Status =
    r.netCash.values[last] < 0 ? (cashDiff > 0 ? "warn" : "crit") : cashDiff > 0 ? "good" : "warn";

  const kpi = (
    key: string,
    label: string,
    value: string,
    unit: string,
    delta: string,
    status: Status,
    spark: number[],
  ): FinKpi => ({ key, label, value, unit, delta, status, token: STATUS_TOKEN[status], spark });

  const kpis: FinKpi[] = [
    kpi(
      "revenue",
      r.revenue.label,
      finBln(r.revenue.values[last]),
      "млрд сўм",
      deltaTxt(r.revenue.values[prev], r.revenue.values[last]),
      statusOfPct(revPct, SEVERE_PCT),
      r.revenue.values,
    ),
    kpi(
      "profit",
      r.profit.label,
      finBln(r.profit.values[last]),
      "млрд сўм",
      deltaTxt(r.profit.values[prev], r.profit.values[last]),
      statusOfPct(proPct, SEVERE_PCT),
      r.profit.values,
    ),
    kpi(
      "margin",
      r.margin.label,
      nf(marginPct[last], 2),
      "%",
      ppTxt(marginPp),
      statusOfPct(marginPp, SEVERE_PP),
      marginPct,
    ),
    kpi(
      "netCash",
      r.netCash.label,
      finBln(r.netCash.values[last]),
      "млрд сўм",
      blnTxt(cashDiff),
      cashStatus,
      r.netCash.values,
    ),
  ];

  /* --- икки хил «пул» рақами ------------------------------------------- */

  const cash: FinCashPoint[] = months.map((label, i) => ({
    label,
    balance: r.cash.values[i],
    equivalents: r.cashEquivalents.values[i],
    gap: r.cash.values[i] - r.cashEquivalents.values[i],
  }));
  const gaps = cash.map((c) => c.gap);

  /* --- қолдиқ занжири --------------------------------------------------- */

  const chainBreaks: FinChainBreak[] = [];
  for (let i = 1; i < n; i++) {
    const expected = r.cashEquivalents.values[i - 1] + r.netCash.values[i];
    const actual = r.cashEquivalents.values[i];
    const diff = actual - expected;
    if (Math.abs(diff) > CHAIN_EPS) {
      chainBreaks.push({ label: months[i], expected, actual, diff });
    }
  }

  return {
    months,
    ticks,
    lastMonth: months[last],
    prevMonth: months[prev],
    rows: r,
    marginPct,
    kpis,
    cash,
    gapMin: Math.min(...gaps),
    gapMax: Math.max(...gaps),
    chainBreaks,
  };
}

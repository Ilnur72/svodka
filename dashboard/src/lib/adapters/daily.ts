import type {
  DailyBlock,
  DailyMetric,
  DailyResponse,
  DailyStockCell,
  DailyStockTrend,
  DailyTripleCell,
  DailyTripleTrend,
  DailyWindow,
} from "../../api/types";
import type { Status } from "../../types";
import type { Period } from "../period";

/**
 * «Кунлик сводка»: API жавобидан панел кутадиган кўринишга ўтказиш.
 *
 * ─── «Ҳолат» устуни қандай ҳисобланади ────────────────────────────────────
 * Ҳолат **фақат манбадаги маълумотдан** олинади — фоиз ва қолдиқ миқдоридан.
 * Ҳеч нарса тахмин қилинмайди ва тўқилмайди.
 *
 *  · Оқим кўрсаткичлари (`triple`) — бажарилиш фоизи бўйича:
 *
 *      pct ≥ 110  → «Режадан юқори»
 *      95 … 110   → «Нормада»
 *      85 … 95    → «Режадан паст»
 *      pct < 85   → «Муаммоли»
 *
 *    Чегаралар нимага асосланган: лойиҳанинг қолган ҳамма жойида (баланс,
 *    паспорт, занжир) ягона чегара — **100% режа, 85% муаммо** (`statusOf()`).
 *    Бу ерга «Нормада» алоҳида ҳолат сифатида қўшилгани учун 100% атрофида
 *    тор йўлак керак бўлди: кунлик режа бутун сонларда қўйилади ва ±5%
 *    четланиш кундалик тебраниш, режанинг бузилиши эмас. 110% дан юқориси
 *    эса аллақачон сезиларли ортиқча бажарилиш — уни «Нормада» ичида
 *    яшириш рақамни бекитиб қўярди.
 *
 *    ⚠️ Ҳолат номи **баҳо эмас, тавсиф**: энергия блокида «Режадан юқори»
 *    ортиқча сарф деганидир (блок изоҳида ёзилган).
 *
 *  · Қолдиқ кўрсаткичлари (`stock` / `stock_note`) — миқдор бўйича:
 *
 *      манбадаги «Муаммо» устуни тўлдирилган → «Муаммоли»
 *      қиймат йўқ (null)                    → «Маълумот мавжуд эмас»
 *      қиймат = 0                           → «Қолдиқ кам»
 *      қиймат > 0                           → «Қолдиқ етарли»
 *
 *    ⚠️ Манбада **минимал норма йўқ**, шунинг учун «Қолдиқ етарли» фақат
 *    «қолдиқ мавжуд» деганини билдиради — етарлилик даражаси ҳисобланмайди.
 *    Бу чегара экрандаги легендада ҳам очиқ ёзилади.
 *
 * ─── Қайси ойна бўйича баҳоланади ─────────────────────────────────────────
 * Кунлик сводка бўлгани учун аввал **кунлик** фоиз қаралади. Лекин ўлчов:
 * охирги кунда 64 оқим кўрсаткичидан фақат 30 тасида кунлик фоиз бор,
 * ойликда 33, йилликда 50. Фақат кунлик билан чегараланилса кўрсаткичларнинг
 * ярмидан кўпи «баҳоланмайди» бўлиб қоларди.
 *
 * Шунинг учун тартиб: **кунлик → ой бошидан → йил бошидан**, ва қайси ойна
 * ишлатилгани қатор ёнида кўрсатилади. Бу тўқиш эмас — ҳар учаласи ҳам
 * манбадаги ҳақиқий устун.
 *
 * ─── Йўналиш хулосаси (РАҲБАРЛИК ХУЛОСАСИ) ────────────────────────────────
 * Йўналишга битта ҳолат берилади. У блокнинг **бош қаторлари** бўйича
 * ҳисобланади: манбада «… жами» қаторлари бўлса ўшалар, бўлмаса қисм
 * бўлмаган барча қаторлар (шунда битта миқдор икки марта саналмайди).
 *
 * Қоида — **кўпчилик**: баҳоланган қаторларнинг қайси ҳолати кўп бўлса,
 * йўналиш ҳолати ўша. Тенг бўлса оғирроғи танланади. «Маълумот мавжуд эмас»
 * қаторлари овоз бермайди; ҳаммаси шундай бўлса йўналиш ҳам шу ҳолатда.
 *
 * Нега «энг оғири» эмас: у билан 9 йўналишдан 8 таси «Муаммоли» бўлиб чиқди
 * ва устун маъносини йўқотди — раҳбар қайси йўналиш оғирроқ эканини ажрата
 * олмасди. Энг оғир қатор эса йўқолмайди: у ёнида **сабаб** сифатида номи
 * билан кўрсатилади.
 *
 * ─── Нима ҳисобланмайди ───────────────────────────────────────────────────
 * Кунлик қиймат йўқ бўлса у ой ёки йил қийматидан **чиқарилмайди** (айирма
 * орқали ҳам). `null` ҳеч қачон `0` эмас. `pct` ни `fakt/plan` билан
 * солиштирадиган эвристика **йўқ**.
 *
 * ─── Техник майдонлар ─────────────────────────────────────────────────────
 * `row`, `key`, `occurrence`, `pctSource`, `pctRaw`, варақ номлари ва катак
 * манзиллари view-model'га **ўтмайди**. Бэкенддаги блок изоҳи (`block.note`)
 * ҳам чиқмайди: у лотин ёзувида ва ишлаб чиқувчи учун ёзилган. 7-блокдаги
 * `note` эса бошқа нарса — манбанинг «Муаммо» устуни, домен мазмуни, у
 * `problemNote` бўлиб кўрсатилади.
 */

/* -------------------------------------------------------------------------- */
/* ҳолат                                                                      */
/* -------------------------------------------------------------------------- */

export type DailyStatus =
  | "abovePlan"
  | "normal"
  | "belowPlan"
  | "problem"
  | "stockOk"
  | "stockLow"
  | "noData";

export const DAILY_STATUS_LABEL: Record<DailyStatus, string> = {
  abovePlan: "Режадан юқори",
  normal: "Нормада",
  belowPlan: "Режадан паст",
  problem: "Муаммоли",
  stockOk: "Қолдиқ етарли",
  stockLow: "Қолдиқ кам",
  noData: "Маълумот мавжуд эмас",
};

/** Ранг учун — лойиҳадаги тўртта оҳанг; ранг ягона маъно ташувчиси эмас. */
export const DAILY_STATUS_TONE: Record<DailyStatus, Status> = {
  abovePlan: "good",
  normal: "good",
  belowPlan: "warn",
  problem: "crit",
  stockOk: "good",
  stockLow: "warn",
  noData: "mute",
};

/** Йўналиш хулосасини топишда «энг оғири» шу тартиб бўйича танланади. */
const SEVERITY: Record<DailyStatus, number> = {
  problem: 4,
  belowPlan: 3,
  stockLow: 3,
  abovePlan: 2,
  normal: 1,
  stockOk: 1,
  noData: 0,
};

/** Бажарилиш фоизи чегаралари — юқоридаги изоҳда асосланган. */
export const PCT_ABOVE = 110;
export const PCT_NORMAL = 95;
export const PCT_PROBLEM = 85;

function statusOfPct(pct: number): DailyStatus {
  if (pct >= PCT_ABOVE) return "abovePlan";
  if (pct >= PCT_NORMAL) return "normal";
  if (pct >= PCT_PROBLEM) return "belowPlan";
  return "problem";
}

/** Манбадаги «Муаммо» устуни тўлдирилганми: `"0"`, `"-"`, бўш — муаммо эмас. */
function hasProblemNote(note: string | null): boolean {
  if (note === null) return false;
  const t = note.trim();
  return t !== "" && t !== "0" && t !== "-" && t !== "—";
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export type DailyWindowKey = "day" | "month" | "year";

export interface DailyWindowVM {
  plan: number | null;
  fakt: number | null;
  diff: number | null;
  /** Бэкенддан келган фоиз — қайта ҳисобланмайди ва текширилмайди. */
  pct: number | null;
}

export interface DailyMetricVM {
  id: string;
  name: string;
  unit: string | null;
  section: string | null;
  parent: string | null;
  /** «… жами» — йиғиндига қўшилмайди, лекин йўналиш хулосасининг асоси. */
  isTotal: boolean;
  /** «шундан …» — устки қаторнинг қисми, йиғиндига қўшилмайди. */
  isSubset: boolean;
  /** Манбада бирдан ортиқ ўлчов бирлиги кўрилган — бирлик қаторда кўрсатилади. */
  mixedUnit: boolean;
  /** Манбада бўлим ёрлиғи тушиб қолган кун (`key` да `#N`). */
  sectionMissing: boolean;
  kind: "flow" | "stock";
  /** `kind === "flow"` да тўлдирилади. */
  day: DailyWindowVM | null;
  month: DailyWindowVM | null;
  year: DailyWindowVM | null;
  /** `kind === "stock"` да тўлдирилади. */
  warehouse: number | null;
  workshop: number | null;
  total: number | null;
  /** Манбадаги «Муаммо» матни — домен мазмуни, кўрсатилади. */
  problemNote: string | null;
  /** Олдинги кунга нисбатан ўзгариш (бэкенд ҳисоблаган). */
  delta: number | null;
  status: DailyStatus;
  /** Ҳолат қайси ойнадан олингани; қолдиқда `null`. */
  statusWindow: DailyWindowKey | null;
}

export type DailyCounts = Record<DailyStatus, number> & { total: number };

export interface DailyBlockVM {
  no: number;
  key: string;
  /** Сарлавҳа рақамсиз: «№» устуни алоҳида. */
  title: string;
  layout: "triple" | "stock" | "stock_note";
  metrics: DailyMetricVM[];
  /** Блокнинг бош қаторлари — «жами» бўлса ўшалар, бўлмаса қисм бўлмаганлари. */
  headline: DailyMetricVM[];
  counts: DailyCounts;
  /** Кўпчилик қоидаси бўйича йўналиш ҳолати. */
  verdict: DailyStatus;
  /** Энг оғир қатор — хулоса ёнида сабаб сифатида кўрсатилади. */
  worst: DailyMetricVM | null;
}

export interface DailySummaryRowVM {
  id: string;
  no: number;
  title: string;
  /** Блок ичидаги бўлим (3-блокда ВОЛЬФРАМ / МОЛИБДЕН). */
  section: string | null;
  metricCount: number;
  counts: DailyCounts;
  verdict: DailyStatus;
  worst: DailyMetricVM | null;
}

export interface DailyVM {
  day: string;
  previous: string | null;
  days: string[];
  /** `default` — сервер ўзи охирги 31 кунни берган. */
  rangeSource: "query" | "default";
  available: { from: string | null; to: string | null; days: number };
  blocks: DailyBlockVM[];
  /** 8 йўналиш; 3-блок ВОЛЬФРАМ ва МОЛИБДЕН бўйича иккига ажралади. */
  summary: DailySummaryRowVM[];
  problems: { day: string; items: { no: number | null; text: string }[]; notes: string[] } | null;
  /** Танланган оралиқдаги муаммо кунлари ва бандлари сони. */
  problemDays: number;
  problemItems: number;
  counts: DailyCounts;
  /** Кунлик қиймати манбада йўқ бўлган оқим кўрсаткичлари сони. */
  noDayValue: number;
  hasValues: boolean;
}

/* -------------------------------------------------------------------------- */
/* оралиқ                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Жавоб ҳажми катта (31 кун ≈ 835 KB, бутун тарих ≈ 4 MB), шунинг учун
 * сўров оралиғи шу ерда чегараланади: даврнинг **охирги** 31 куни олинади.
 * Чегара ишлаганини панел экранда очиқ ёзади — жимгина кесиш эмас.
 */
export const DAILY_MAX_DAYS = 31;

const shiftDays = (iso: string, n: number): string => {
  const t = Date.parse(iso + "T00:00:00Z");
  if (!isFinite(t)) return iso;
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
};

export function dailyRange(period: Period): { from: string; to: string; capped: boolean } {
  const start = shiftDays(period.to, -(DAILY_MAX_DAYS - 1));
  const capped = start > period.from;
  return { from: capped ? start : period.from, to: period.to, capped };
}

/* -------------------------------------------------------------------------- */
/* ўтказиш                                                                    */
/* -------------------------------------------------------------------------- */

const emptyCounts = (): DailyCounts => ({
  abovePlan: 0,
  normal: 0,
  belowPlan: 0,
  problem: 0,
  stockOk: 0,
  stockLow: 0,
  noData: 0,
  total: 0,
});

export function countStatuses(rows: DailyMetricVM[]): DailyCounts {
  const c = emptyCounts();
  for (const r of rows) {
    c[r.status] += 1;
    c.total += 1;
  }
  return c;
}

// `pctRaw` ва `pctSource` **атайлаб олинмайди**: улар манба ҳақидаги техник
// белги ва экранга чиқмаслиги керак. `pct` нинг ўзи етарли — у режа 0/йўқ
// бўлганда `null`, демак «фоиз йўқ» ҳолати аллақачон ифодаланган.
const toWindow = (w: DailyWindow): DailyWindowVM => ({
  plan: w.plan,
  fakt: w.fakt,
  diff: w.diff,
  pct: w.pct,
});

const isTriple = (c: DailyTripleCell | DailyStockCell): c is DailyTripleCell =>
  (c as DailyTripleCell).day !== undefined;

function toMetric(m: DailyMetric, day: string, layout: DailyBlock["layout"]): DailyMetricVM {
  const cell = m.values[day] ?? null;
  const base = {
    id: m.key,
    name: m.name,
    unit: m.unit,
    section: m.section,
    parent: m.parent,
    isTotal: m.isTotal,
    isSubset: m.isSubset,
    mixedUnit: m.unitVariants.length > 1,
    // `key` нинг охиридаги `#N` — манбада бўлим ёрлиғи тушиб қолган кун.
    sectionMissing: /#\d+$/.test(m.key),
  };

  if (layout === "triple") {
    const c = cell !== null && isTriple(cell) ? cell : null;
    const day_ = c ? toWindow(c.day) : null;
    const month = c ? toWindow(c.month) : null;
    const year = c ? toWindow(c.year) : null;

    // Кунлик → ой → йил: биринчи мавжуд фоиз бўйича баҳоланади.
    let status: DailyStatus = "noData";
    let statusWindow: DailyWindowKey | null = null;
    for (const [k, w] of [
      ["day", day_],
      ["month", month],
      ["year", year],
    ] as [DailyWindowKey, DailyWindowVM | null][]) {
      if (w && w.pct !== null) {
        status = statusOfPct(w.pct);
        statusWindow = k;
        break;
      }
    }

    const t = m.trend as DailyTripleTrend | null;
    return {
      ...base,
      kind: "flow",
      day: day_,
      month,
      year,
      warehouse: null,
      workshop: null,
      total: null,
      problemNote: null,
      delta: t?.day.faktDelta ?? null,
      status,
      statusWindow,
    };
  }

  const c = cell !== null && !isTriple(cell) ? cell : null;
  const warehouse = c?.warehouse ?? null;
  const workshop = c?.workshop ?? null;
  const total = c?.total ?? null;
  const note = c?.note ?? null;

  // 6-блокда «Омборда» + «Цехда», 7-блокда «Қолдиқ миқдори».
  const parts = [warehouse, workshop, total].filter((x): x is number => x !== null);
  const amount = parts.length ? parts.reduce((a, b) => a + b, 0) : null;

  const status: DailyStatus = hasProblemNote(note)
    ? "problem"
    : amount === null
      ? "noData"
      : amount === 0
        ? "stockLow"
        : "stockOk";

  const t = m.trend as DailyStockTrend | null;
  const delta =
    t === null
      ? null
      : layout === "stock_note"
        ? t.totalDelta
        : t.warehouseDelta === null && t.workshopDelta === null
          ? null
          : (t.warehouseDelta ?? 0) + (t.workshopDelta ?? 0);

  return {
    ...base,
    kind: "stock",
    day: null,
    month: null,
    year: null,
    warehouse,
    workshop,
    total,
    problemNote: hasProblemNote(note) ? note : null,
    delta,
    status,
    statusWindow: null,
  };
}

/** Блокнинг бош қаторлари: «жами» бўлса ўшалар, бўлмаса қисм бўлмаганлари. */
function headlineOf(rows: DailyMetricVM[]): DailyMetricVM[] {
  const totals = rows.filter((r) => r.isTotal);
  return totals.length ? totals : rows.filter((r) => !r.isSubset);
}

/** Энг оғир ҳолатли қатор — хулоса ёнида «сабаб» сифатида кўрсатилади. */
function worstOf(rows: DailyMetricVM[]): DailyMetricVM | null {
  let worst: DailyMetricVM | null = null;
  for (const r of rows) {
    if (!worst || SEVERITY[r.status] > SEVERITY[worst.status]) worst = r;
  }
  return worst;
}

/**
 * Йўналиш ҳолати — баҳоланган қаторларнинг **кўпчилиги** қайси ҳолатда
 * бўлса ўша; тенг бўлса оғирроғи. «Маълумот мавжуд эмас» овоз бермайди.
 */
function verdictOf(rows: DailyMetricVM[]): DailyStatus {
  const voted = rows.filter((r) => r.status !== "noData");
  if (voted.length === 0) return "noData";

  const tally = new Map<DailyStatus, number>();
  for (const r of voted) tally.set(r.status, (tally.get(r.status) ?? 0) + 1);

  let best: DailyStatus = "noData";
  let bestN = -1;
  for (const [st, n] of tally) {
    if (n > bestN || (n === bestN && SEVERITY[st] > SEVERITY[best])) {
      best = st;
      bestN = n;
    }
  }
  return best;
}

/** Сарлавҳадаги «3. » каби рақам префикси олиб ташланади — «№» устуни алоҳида. */
const stripNo = (title: string): string => title.replace(/^\s*\d+\.\s*/, "");

/** Кўрсатиладиган кун: сўралгани жавобда бўлмаса — рўйхатдаги охиргиси. */
export function dailyDay(res: DailyResponse, wanted: string | null): string {
  if (wanted && res.days.includes(wanted)) return wanted;
  return res.latest ?? res.days[res.days.length - 1] ?? "";
}

export function dailyView(res: DailyResponse, day: string): DailyVM {
  const blocks: DailyBlockVM[] = res.blocks.map((b) => {
    const metrics = b.metrics.map((m) => toMetric(m, day, b.layout));
    const headline = headlineOf(metrics);
    return {
      no: b.no,
      key: b.key,
      title: stripNo(b.title),
      layout: b.layout,
      metrics,
      headline,
      counts: countStatuses(metrics),
      verdict: verdictOf(headline),
      worst: worstOf(headline),
    };
  });

  // ── Йўналишлар хулосаси ───────────────────────────────────────────────────
  // 3-блок ичида ВОЛЬФРАМ ва МОЛИБДЕН цикллари алоҳида — фойдаланувчи шуни
  // сўраган. Бўлимлар манбадан келади (`section`), тўқилмайди.
  const summary: DailySummaryRowVM[] = [];
  for (const b of blocks) {
    const sections = [...new Set(b.metrics.map((m) => m.section).filter((s): s is string => !!s))];
    const split = b.key === "chirchiq" && sections.length > 1;

    if (!split) {
      summary.push({
        id: b.key,
        no: b.no,
        title: b.title,
        section: null,
        metricCount: b.metrics.length,
        counts: b.counts,
        verdict: b.verdict,
        worst: b.worst,
      });
      continue;
    }

    for (const sec of sections) {
      const rows = b.metrics.filter((m) => m.section === sec);
      const head = headlineOf(rows);
      summary.push({
        id: `${b.key}:${sec}`,
        no: b.no,
        title: b.title,
        section: sec,
        metricCount: rows.length,
        counts: countStatuses(rows),
        verdict: verdictOf(head),
        worst: worstOf(head),
      });
    }
  }

  const all = blocks.flatMap((b) => b.metrics);
  const problems = res.problems.find((p) => p.day === day) ?? null;

  return {
    day,
    previous: res.previous,
    days: res.days,
    rangeSource: res.range.source,
    available: res.available,
    blocks,
    summary,
    problems: problems
      ? {
          day: problems.day,
          items: problems.items.map((i) => ({ no: i.no, text: i.text })),
          notes: problems.notes,
        }
      : null,
    problemDays: res.problems.length,
    problemItems: res.problems.reduce((a, p) => a + p.items.length, 0),
    counts: countStatuses(all),
    noDayValue: all.filter((m) => m.kind === "flow" && (m.day === null || m.day.fakt === null))
      .length,
    hasValues: all.some((m) =>
      m.kind === "flow"
        ? m.day?.fakt != null || m.month?.fakt != null || m.year?.fakt != null
        : m.warehouse != null || m.workshop != null || m.total != null,
    ),
  };
}

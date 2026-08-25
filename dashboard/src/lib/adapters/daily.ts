import type {
  DailyBlock,
  DailyMetric,
  DailyResponse,
  DailyStockCell,
  DailyTripleCell,
  DailyWindow,
} from "../../api/types";
import type { Status } from "../../types";
import type { Period } from "../period";

/**
 * «Кунлик сводка»: API жавобидан панел кутадиган кўринишга ўтказиш.
 *
 * ═══ 1. Ҳолат чегаралари — ФАҚАТ шу бўлимга тегишли ═══════════════════════
 *
 * Лойиҳанинг умумий чегараси (`lib/format.ts` → `statusOf()`) — 100 / 85, у
 * «Металлар баланси» ва «Цехлар занжири» бўлимларида ишлатилади.
 * «Кўрсаткичлар паспорти» да ўз чегараси бор (95 / 80). Кунлик сводка учун
 * учинчи чегара сўралди, шунинг учун у ҳам **шу файлда алоҳида** эълон
 * қилинган ва `statusOf()` га умуман тегмайди:
 *
 *   < 90 %        → Муаммоли      (қизил)
 *   90 … 99,9 %   → Эътибор       (сариқ)
 *   ≥ 100 %       → Нормада       (яшил)
 *   фоиз йўқ      → Маълумот йўқ  (кулранг)
 *
 * Чегара **созланадиган**: битта константада (`DAILY_THRESHOLDS`). Уни
 * ўзгартириш карточкалардаги нуқталарга, устунларга, огоҳлантириш қаторига
 * ва легендага автоматик тарқалади.
 *
 * ═══ 2. Ойна — фойдаланувчи танлайди ══════════════════════════════════════
 *
 * Манба ҳар кўрсаткич учун учта устун беради: «Кунлик», «Ой бошидан»,
 * «Йил бошидан». Аввал улар бир вақтда кўрсатиларди ва ҳолат «кунлик → ой →
 * йил» тартибида биринчи топилганидан олинарди. Энди экранда **ойна
 * танлагич** бор, шунинг учун ҳолат ҳам, режа/факт/фарқ ҳам **айнан
 * танланган ойнадан** олинади — қаторлар ўзаро таққосланадиган бўлади.
 *
 * ═══ 3. Сузувчи нуқта артефакти ═══════════════════════════════════════════
 *
 * Манбадаги сонлар Excel double'лари: жавобда `9.600000000000001` (кунлик
 * режа), `2105.2780000000002` (йил бошидан) каби қийматлар учрайди — ўлчанди,
 * 20 кун × 3 ойнада **1801 та** `plan`/`fakt` ва **1860 та** `diff` шундай.
 * Улар экранда 19–22 белгили бўлиб устундан чиқиб кетарди.
 *
 * Шунинг учун ҳар бир сон `clean()` дан ўтади — `adapters/balance.ts`,
 * `chain.ts` ва `kpi.ts` да аллақачон ишлатиладиган усул. `toPrecision(12)`
 * 12 та маънодор рақамгача **яхлитлайди** — артефакт думи кесилади
 * (`9.600000000000001` → `9.6`), фарқ 1e-9 атрофида, тонна/кВт·с да
 * аҳамиятсиз. 15 та рақам етмади: `0.004999999999999893` унда ҳам
 * `0,00499999999999989` бўлиб қоларди.
 *
 * ═══ 4. Ҳисоблаш йўқ ══════════════════════════════════════════════════════
 *
 * Кунлик қиймат манбада бўлмаса у ой ёки йил қийматидан **чиқарилмайди**.
 * `null` ҳеч қачон `0` эмас — қаторда «—» туради ва қатор кулранг бўлади.
 * `pct` ни `fakt/plan` билан солиштирадиган эвристика **йўқ**.
 *
 * ═══ 5. Қайси қаторлар кўрсатилади ════════════════════════════════════════
 *
 * `blocks[].metrics` — **бутун давр** бўйича кўрсаткичларнинг бирлашмаси,
 * чунки манба варағида қаторлар кундан-кунга ўзгаради. Экран эса **битта
 * кунни** кўрсатади, шунинг учун ўша кунда манбада бўлмаган қаторлар
 * чизилмайди (`absent`).
 *
 * Икки ҳолат **фарқланади** ва улар бир хил эмас:
 *
 *   `values[кун] === null`        → қатор ўша кунда варақда **умуман йўқ**
 *                                   → кўрсатилмайди (`absent: true`)
 *   `values[кун]` бор, ичи бўш    → қатор бор, лекин **тўлдирилмаган**
 *                                   → кўрсатилади, сонлар ўрнида «—»
 *
 * Ўлчов (2026-03-10, 1-блок): 12 та кўрсаткичдан 8 таси ўша кунда мавжуд,
 * улардан 5 тасида қиймат бор. Яъни 4 та қатор олиб ташланади, 3 таси эса
 * «—» билан қолади — уларни яшириш «манбада қатор бор, лекин тўлдирилмаган»
 * фактини бекитган бўларди.
 *
 * ═══ 6. Техник майдонлар ══════════════════════════════════════════════════
 *
 * `row`, `key`, `occurrence`, `pctSource`, `pctRaw`, варақ номлари ва
 * бэкенддаги лотин ёзувли блок изоҳи (`block.note`) view-model'га **ўтмайди**.
 */

/* -------------------------------------------------------------------------- */
/* созламалар                                                                 */
/* -------------------------------------------------------------------------- */

/** Бажарилиш фоизи чегаралари — **бир жойда**, фақат шу бўлим учун. */
export const DAILY_THRESHOLDS = {
  /** Шу фоиздан бошлаб — «Нормада». */
  norm: 100,
  /** Шу фоиздан бошлаб — «Эътибор»; ундан пасти «Муаммоли». */
  attention: 90,
} as const;

/** «Бажарилиши» устунидаги шкаланинг охири; 100% белгиси шу шкалада турадi. */
export const DAILY_BAR_MAX = 150;

/** Ўқдаги «100%» тик чизиғининг ўрни (устун кенглигининг фоизи). */
export const DAILY_BAR_REF = (100 / DAILY_BAR_MAX) * 100;

/** Огоҳлантириш қаторида нечта кўрсаткич номи ёзилади. */
export const DAILY_ATTENTION_MAX = 6;

export type DailyWindowKey = "day" | "month" | "year";

export const DAILY_WINDOWS: { id: DailyWindowKey; label: string }[] = [
  { id: "day", label: "Кунлик" },
  { id: "month", label: "Ой бошидан" },
  { id: "year", label: "Йил бошидан" },
];

export const DAILY_STATUS_LABEL: Record<Status, string> = {
  crit: "Муаммоли",
  warn: "Эътибор",
  good: "Нормада",
  mute: "Маълумот йўқ",
};

/** Ранг — CSS токени, hex ёзилмайди. */
export const DAILY_STATUS_TOKEN: Record<Status, string> = {
  crit: "var(--crit)",
  warn: "var(--warn)",
  good: "var(--good)",
  mute: "var(--rule)",
};

/** Нуқталар ва саноқлар шу тартибда: оғирдан енгилга. */
export const DAILY_STATUS_ORDER: Status[] = ["crit", "warn", "good", "mute"];

/** Фоиздан ҳолат — **фақат шу бўлимнинг** чегараси бўйича. */
export function dailyStatusOf(pct: number | null | undefined): Status {
  if (pct === null || pct === undefined || !isFinite(pct)) return "mute";
  if (pct >= DAILY_THRESHOLDS.norm) return "good";
  if (pct >= DAILY_THRESHOLDS.attention) return "warn";
  return "crit";
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

/** Қатор қандай ўқилади: оқим (режа/факт) ёки қолдиқ (ҳолат). */
export type DailyRowKind = "flow" | "stockSplit" | "stockTotal";

export interface DailyRowVM {
  id: string;
  name: string;
  unit: string | null;
  /**
   * Манбада бу кўрсаткич учун бирдан ортиқ ўлчов бирлиги кўрилган.
   *
   * Амалда **учрамайди**: бэкенд бирликни калитнинг бир қисми қилади, шунинг
   * учун бирлик ўзгарса қатор **иккита алоҳида кўрсаткич** бўлиб келади.
   * Ўлчанди — «Қаттиқ қотишмалар» 2026-03-01…03-12 да `тн`, 03-13 дан `кг`,
   * иккови ҳар хил калит ва **кунлари кесишмайди**, шунинг учун битта кунда
   * фақат биттаси кўринади. Байроқ ҳимоя учун қолдирилган: манба ўзгариб
   * иккита бирлик битта калитга тушса, экранда ⚠ билан белгиланади.
   */
  mixedUnit: boolean;
  /** Манбадаги бўлим номи; қаторлар устида сарлавҳа бўлиб чиқади. */
  section: string | null;
  /** «ш.ж.:» остидаги қатор — чапдан сурилади. */
  isSubset: boolean;
  /** «… жами» — қалинроқ ёзилади, йиғиндига қўшилмайди. */
  isTotal: boolean;
  kind: DailyRowKind;

  /* оқим (танланган ойна) */
  plan: number | null;
  fakt: number | null;
  diff: number | null;
  pct: number | null;

  /* қолдиқ */
  warehouse: number | null;
  workshop: number | null;
  total: number | null;
  /** Омбор улуши, `0…1`; иккови ҳам йўқ бўлса `null`. */
  ratio: number | null;
  /** 7-блокдаги «Муаммо» устуни — домен матни, кўрсатилади. */
  note: string | null;

  status: Status;
  /** Қиймат умуман йўқ — қатор кулранг, сонлар ўрнида «—». */
  empty: boolean;
  /**
   * Қатор **шу кунда** манба варағида йўқ (`values[кун] === null`). Бундай
   * қатор чизилмайди — у бошқа кунларнинг қатори. `empty` дан фарқли:
   * `empty` — қатор бор, лекин тўлдирилмаган.
   */
  absent: boolean;
}

export type DailyCounts = Record<Status, number> & { total: number };

export interface DailyBlockVM {
  no: number;
  key: string;
  /** Сарлавҳа рақамсиз — рақам алоҳида белги бўлиб чиқади. */
  title: string;
  kind: DailyRowKind;
  rows: DailyRowVM[];
  counts: DailyCounts;
}

/** Огоҳлантириш қаторидаги битта ёзув. */
export interface DailyAttentionVM {
  id: string;
  blockNo: number;
  name: string;
  pct: number;
}

export interface DailyVM {
  day: string;
  previous: string | null;
  days: string[];
  window: DailyWindowKey;
  rangeSource: "query" | "default";
  available: { from: string | null; to: string | null; days: number };
  blocks: DailyBlockVM[];
  /**
   * Юқоридаги саноқ — **фақат оқим кўрсаткичлари** бўйича: ҳолат режанинг
   * бажарилишини билдиради, қолдиқ қаторларида эса режа умуман юритилмайди.
   * Қолдиқ блокларининг ўз саноғи карточка сарлавҳасида.
   */
  counts: DailyCounts;
  /** Энг паст бажарилишлар — сарлавҳа остидаги огоҳлантириш қатори учун. */
  attention: DailyAttentionVM[];
  /** Чегарадан паст тушган кўрсаткичлар сони (огоҳлантириш матни учун). */
  attentionTotal: number;
  hasValues: boolean;
}

/* -------------------------------------------------------------------------- */
/* оралиқ                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Жавоб ҳажми катта (31 кун ≈ 835 KB), шунинг учун сўров оралиғи шу ерда
 * чегараланади: даврнинг **охирги** 31 куни. Чегара ишлаганини панел экранда
 * очиқ ёзади — жимгина кесиш эмас.
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

/**
 * IEEE-754 шовқинини кесиш.
 *
 * Бошқа адаптерларда (`balance.ts`, `chain.ts`, `kpi.ts`) 15 та маънодор
 * рақам етарли, чунки у ердаги қийматлар катта. Кунлик сводкада эса кичик
 * айирмалар бор ва 15 та рақам артефактни **кесмайди** — ўлчанди:
 *
 *   0.004999999999999893 → p15 = 0,00499999999999989 ✗ · p12 = 0,005 ✓
 *   61.7899999999999     → p15 = 61,7899999999999   ✗ · p12 = 61,79 ✓
 *
 * Шунинг учун бу ерда **12** та маънодор рақам. Бу ҳам яхлитлаш эмас:
 * манбадаги энг узун ҳақиқий қиймат 10 та маънодор рақам (`1 021,779823`)
 * ва у ўзгаришсиз қолади; 12 дан кейинги рақамлар фақат қўшиш артефакти.
 */
const CLEAN_DIGITS = 12;

function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(CLEAN_DIGITS));
}

const emptyCounts = (): DailyCounts => ({ crit: 0, warn: 0, good: 0, mute: 0, total: 0 });

function countRows(rows: DailyRowVM[]): DailyCounts {
  const c = emptyCounts();
  for (const r of rows) {
    c[r.status] += 1;
    c.total += 1;
  }
  return c;
}

const isTriple = (c: DailyTripleCell | DailyStockCell): c is DailyTripleCell =>
  (c as DailyTripleCell).day !== undefined;

/** Манбадаги «Муаммо» устуни тўлдирилганми: `"0"`, `"-"`, бўш — муаммо эмас. */
function realNote(note: string | null): string | null {
  if (note === null) return null;
  const t = note.trim();
  return t === "" || t === "0" || t === "-" || t === "—" ? null : t;
}

function kindOf(layout: DailyBlock["layout"]): DailyRowKind {
  if (layout === "triple") return "flow";
  return layout === "stock" ? "stockSplit" : "stockTotal";
}

function toRow(m: DailyMetric, day: string, kind: DailyRowKind, w: DailyWindowKey): DailyRowVM {
  const cell = m.values[day] ?? null;
  // Кун калити жавобда доим бор; қиймати `null` бўлса қатор ўша кунда йўқ.
  const absent = cell === null;
  const base = {
    id: m.key,
    name: m.name,
    unit: m.unit,
    mixedUnit: m.unitVariants.length > 1,
    section: m.section,
    isSubset: m.isSubset,
    isTotal: m.isTotal,
    kind,
    absent,
  };

  if (kind === "flow") {
    const c = cell !== null && isTriple(cell) ? cell : null;
    // Ҳолат ва сонлар **айнан танланган ойнадан** — бошқасидан олинмайди.
    const win: DailyWindow | null = c ? c[w] : null;
    const plan = clean(win?.plan);
    const fakt = clean(win?.fakt);
    const pct = clean(win?.pct);
    // Фарқ экрандаги режа ва факт билан **мос** бўлиши учун тозаланганлардан
    // қайта ҳисобланади: API'нинг `diff` и ҳам ўша айирма, лекин тозаланмаган
    // операндлардан олингани учун ўзида артефакт олиб келади
    // (`+0,0430000000001`). Иккови ҳам бўлмаса API қиймати ишлатилади.
    const diff = plan !== null && fakt !== null ? clean(fakt - plan) : clean(win?.diff);

    return {
      ...base,
      plan,
      fakt,
      diff,
      pct,
      warehouse: null,
      workshop: null,
      total: null,
      ratio: null,
      note: null,
      status: dailyStatusOf(pct),
      empty: plan === null && fakt === null,
    };
  }

  const c = cell !== null && !isTriple(cell) ? cell : null;
  const warehouse = clean(c?.warehouse);
  const workshop = clean(c?.workshop);
  const total = clean(c?.total);
  const note = realNote(c?.note ?? null);

  // 6-блокда «Жами» = омбор + цех (иккови ҳам ўша бирликда, қўшилади).
  const split =
    warehouse === null && workshop === null ? null : clean((warehouse ?? 0) + (workshop ?? 0));
  const amount = kind === "stockSplit" ? split : total;

  return {
    ...base,
    plan: null,
    fakt: null,
    diff: null,
    pct: null,
    warehouse,
    workshop,
    total: kind === "stockSplit" ? split : total,
    ratio: kind === "stockSplit" && split !== null && split > 0 ? (warehouse ?? 0) / split : null,
    note,
    // Қолдиқда режа йўқ — «нормада» фақат «қиймат кўрсатилган» деганини
    // билдиради; кўрсатилмаган бўлса «маълумот йўқ».
    status: amount === null ? "mute" : "good",
    empty: amount === null,
  };
}

/** Кўрсатиладиган кун: сўралгани жавобда бўлмаса — рўйхатдаги охиргиси. */
export function dailyDay(res: DailyResponse, wanted: string | null): string {
  if (wanted && res.days.includes(wanted)) return wanted;
  return res.latest ?? res.days[res.days.length - 1] ?? "";
}

/** Сарлавҳадаги «3. » каби рақам префикси олиб ташланади. */
const stripNo = (title: string): string => title.replace(/^\s*\d+\.\s*/, "");

export function dailyView(res: DailyResponse, day: string, w: DailyWindowKey): DailyVM {
  const blocks: DailyBlockVM[] = res.blocks.map((b) => {
    const kind = kindOf(b.layout);
    // Фақат шу кунда мавжуд қаторлар: бошқа кунларники экранда бўш ўрин
    // эгаллаб, «дубликат» ва «маълумот йўқ» таассуротини берарди.
    const rows = b.metrics.map((m) => toRow(m, day, kind, w)).filter((r) => !r.absent);
    return {
      no: b.no,
      key: b.key,
      title: stripNo(b.title),
      kind,
      rows,
      counts: countRows(rows),
    };
  });

  // Юқоридаги саноқ — фақат оқим блоклари бўйича (қолдиқда режа йўқ).
  const flow = blocks.filter((b) => b.kind === "flow").flatMap((b) => b.rows);

  const attention = blocks
    .filter((b) => b.kind === "flow")
    .flatMap((b) =>
      b.rows
        .filter((r) => r.status === "crit" && r.pct !== null)
        .map((r) => ({ id: r.id, blockNo: b.no, name: r.name, pct: r.pct as number })),
    )
    .sort((a, b) => a.pct - b.pct);

  return {
    day,
    previous: res.previous,
    days: res.days,
    window: w,
    rangeSource: res.range.source,
    available: res.available,
    blocks,
    counts: countRows(flow),
    attention: attention.slice(0, DAILY_ATTENTION_MAX),
    attentionTotal: attention.length,
    hasValues: blocks.some((b) => b.rows.some((r) => !r.empty)),
  };
}

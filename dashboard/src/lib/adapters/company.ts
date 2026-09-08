import type {
  ChainResponse,
  ChainStep,
  DashboardData,
  ElectricityTypeRow,
  FinanceReportDashboard,
  KpiResponse,
  MobplanResponse,
  SalesMonthlyRow,
  SalesProductRow,
} from "../../api/types";
import type { Status } from "../../types";
import { deltaTxt, exact, monthLabel, nf } from "../format";
import { monthEnd, monthMinus, monthStart, type Period } from "../period";
import { isEnergySubtotal, isSgpSuspect } from "../dataQuality";
import { materialLabel } from "./sales";
import { finBln } from "./finance";
import { KPI_STATUS_TOKEN } from "./kpi";
import { INVEST_PROJECTS, type InvestProject } from "../invest/investSource";

/**
 * «Корхона» бўлими — корхона инфографикаси учун view-model.
 *
 * Панел API тузилмасини билмайди: у фақат шу файл тайёрлаган қийматларни
 * олади. Манбалар (спецификация: `reference/company-dashboard/README.md`):
 *
 *   · `/dashboard?plant=Чирчик завод` — тайёр маҳсулот (жами `total` эмас:
 *     у Ингичка отвал рудасини ўз ичига олади, спец. CONF-001) ва металл кесими;
 *   · `/chain` — Ингичка, ГТЦ «Навоий», ГТЦ-1, цехлар, реагентлар, огарок;
 *   · `/kpi` — «Численность цеха» (фақат 1 цех) · `/mobplan` — TMK Chemicals штати;
 *   · `/sales/monthly` + `/sales/products` — реализация, қолдиқлар, бирлик шубҳаси;
 *   · `/electricity?groupBy=type` — электр энергия;
 *   · `/finance-report/dashboard` — тушум (йил манбада йўқ);
 *   · `investSource.ts` — қурилаётган лойиҳалар (статик реестр, йил йўқ).
 *
 * ═══ Ҳисобланган қийматлар ══════════════════════════════════════════════
 *
 * Экрандаги ҳар бир сон манбадан (`exact()`). Ҳисобланган фақат иккитаси:
 *   1. олдинги ойга нисбатан ўзгариш — иккита ҳақиқий қийматдан (`deltaTxt`);
 *   2. реестр йиғиндиси (иш ўрни, қиймат) — `round()` билан, чунки
 *      `21.5 + 41 + …` сузувчи нуқтада «дум» қолдиради (`metals.ts` даги
 *      `pctTotal` дарси).
 * Манбада йўқ кўрсаткич (`null`) нол билан ҳам, тахмин билан ҳам
 * тўлдирилмайди — панел уни «маълумот йўқ» деб ёзади.
 *
 * ═══ Жорий ва олдинги ой ════════════════════════════════════════════════
 *
 * Жорий ой — давр танлагичидаги охирги ой. Ҳар бир манба учун жавобда
 * мавжуд бўлган энг яқин ой олинади (`pickMonth`): жорий ой ҳали импорт
 * қилинмаган бўлса, бўш плитка ўрнига мавжуд охирги ой ва унинг номи чиқади.
 * Олдинги ой — аниқ бир ой олдингиси; у жавобда бўлмаса ўзгариш чизилмайди
 * (узилиш «0%» деб кўрсатилмайди).
 */

/* -------------------------------------------------------------------------- */
/* созламалар                                                                 */
/* -------------------------------------------------------------------------- */

/** Бўш катак матни. Нол эмас — қиймат йўқлиги. */
export const NO_DATA = "маълумот йўқ";

/**
 * Завод номи — бэкенддаги `main_object` (`/dashboard` `plants[].name`,
 * `plant` фильтри) ва `elektr_objects.type_object` (`/electricity?groupBy=type`)
 * билан айнан бир хил. Икки жойда бир хил ёзув — шунинг учун битта константа.
 */
export const COMPANY_PLANT = "Чирчик завод";

/** Спарклайн учун сўраладиган ойлар сони (жорий ой билан бирга). */
export const COMPANY_TREND_MONTHS = 7;

/** Спарклайн учун давр: жорий ойдан 6 ой орқага. */
export const companyTrendRange = (cur: string): Period => ({
  from: monthStart(monthMinus(cur, COMPANY_TREND_MONTHS - 1)),
  to: monthEnd(cur),
});

/** Фақат жорий ой — бэкенд олдинги ойни ўзи ҳисоблайдиган сўровлар учун. */
export const companyMonthRange = (cur: string): Period => ({
  from: monthStart(cur),
  to: monthEnd(cur),
});

/** Ҳисобланган йиғинди учун — сузувчи нуқта думи кесилади. */
function round(v: number, d: number): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/** IEEE-754 шовқинини кесиш — `adapters/chain.ts` даги `clean()` билан бир хил. */
function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

/** Жавобдаги ойлардан сўралганига энг яқини (≤); ҳеч бири бўлмаса охиргиси. */
function pickMonth(months: string[], wanted: string): string | null {
  const le = months.filter((m) => m <= wanted);
  if (le.length) return le[le.length - 1];
  return months.length ? months[months.length - 1] : null;
}

/** Олдинги ой — фақат аниқ бир ой олдингиси жавобда бўлса. */
const prevOf = (months: string[], cur: string): string | null => {
  const p = monthMinus(cur, 1);
  return months.includes(p) ? p : null;
};

/* -------------------------------------------------------------------------- */
/* ўзгариш                                                                    */
/* -------------------------------------------------------------------------- */

export interface CompanyDelta {
  /** «+12,4%» / «−3,1%». */
  text: string;
  status: Status;
}

/**
 * `growth` — ўсиш яхши (ишлаб чиқариш, сотув, тушум);
 * `neutral` — йўналишнинг ўзи баҳоланмайди (қолдиқ, электр, тўхташ) —
 * ранг нейтрал, сон эса барибир ёзилади.
 */
export type DeltaTone = "growth" | "neutral";

/** Чегара молиявий стандарт эмас — `finance.ts` билан бир хил: 10% дан ортиқ пасайиш «муаммо». */
const SEVERE_PCT = 10;

export function companyDelta(
  prev: number | null,
  cur: number | null,
  tone: DeltaTone,
): CompanyDelta | null {
  if (prev === null || cur === null || prev === 0) return null;
  const pct = ((cur - prev) / prev) * 100;
  const status: Status =
    tone === "neutral"
      ? "mute"
      : pct > 0
        ? "good"
        : pct === 0
          ? "mute"
          : pct <= -SEVERE_PCT
            ? "crit"
            : "warn";
  return { text: deltaTxt(prev, cur), status };
}

/* -------------------------------------------------------------------------- */
/* плитка ва қатор                                                            */
/* -------------------------------------------------------------------------- */

export interface CompanyTile {
  key: string;
  label: string;
  /** Тайёр форматланган қиймат; `null` — «маълумот йўқ». */
  value: string | null;
  unit: string;
  /** Қиймат қайси ойга тегишли — «Август 2026» (молияда йилсиз: «Июль»). */
  period: string | null;
  delta: CompanyDelta | null;
  /** «Июль 2026» — «… га нисбатан» матни учун. */
  prevPeriod: string | null;
  /** Ойлар бўйича қатор; `null` ой — узилиш. */
  spark: (number | null)[] | null;
  /** Спарклайннинг матнли муқобили. */
  sparkText: string | null;
  /** Плитка чизиғи ва спарклайн ранги — CSS токени. */
  token: string;
  /** Қисқа изоҳлар — плитка остида нуқта билан ажратиб ёзилади. */
  notes: string[];
  /** Огоҳлантириш чипи матни (масалан бирлик шубҳаси). */
  warn: string | null;
}

const tileOf = (
  key: string,
  label: string,
  unit: string,
  part: Partial<Omit<CompanyTile, "key" | "label" | "unit">> = {},
): CompanyTile => ({
  key,
  label,
  unit,
  value: null,
  period: null,
  delta: null,
  prevPeriod: null,
  spark: null,
  sparkText: null,
  token: "var(--rule)",
  notes: [],
  warn: null,
  ...part,
});

/** Ойлик қаторнинг матнли муқобили: «Фев 2026 — 12,3; Мар 2026 — …». */
function sparkText(label: string, months: string[], values: (number | null)[], unit: string): string {
  return (
    `${label} — ойлар бўйича: ` +
    months.map((m, i) => `${monthLabel(m)} ${values[i] === null ? "—" : exact(values[i])} ${unit}`).join("; ")
  );
}

/** Плитка ранги ўзгариш ҳолатидан — `finance.ts` даги плиткалар билан бир хил. */
const tokenOf = (d: CompanyDelta | null): string => KPI_STATUS_TOKEN[d?.status ?? "mute"];

/** Карточка ичидаги битта кўрсаткич қатори. */
export interface CompanyRow {
  key: string;
  label: string;
  /** Тайёр форматланган қиймат; `null` — «маълумот йўқ». */
  value: string | null;
  unit: string;
  delta: CompanyDelta | null;
  /** Режа — фақат манбада бўлса. */
  plan: string | null;
  /** Бажарилиш % — режа > 0 бўлсагина (нолга бўлиш йўқ). */
  planPct: number | null;
  /** Босқич жавобда умуман топилмади (маълумот йўқ эмас — тузилма ўзгарган). */
  missing: boolean;
}

/* -------------------------------------------------------------------------- */
/* ишлаб чиқариш — `/dashboard?plant=`                                        */
/* -------------------------------------------------------------------------- */

export interface CompanyMetalRow {
  key: string;
  name: string;
  value: string;
  /** Бэкенд ҳисоблаган ўзгариш, % — олдинги ой; кўп ҳолатда `null`. */
  delta: CompanyDelta | null;
  /** Режа бажарилиши, % — бэкенддан; режа йўқ бўлса `null`. */
  planPct: number | null;
  unnamed: boolean;
}

export interface CompanyProduction {
  tile: CompanyTile;
  /** «Август 2026» — жавобдаги ой; маълумот бўлмаса `null`. */
  month: string | null;
  total: CompanyRow;
  metals: CompanyMetalRow[];
}

/**
 * @param cur   — фақат жорий ой, `plant` фильтри билан: бэкенд олдинги ойни
 *                (`previousTotal`) ва режа фоизини (`totalPercent`) ўзи беради.
 * @param trend — 7 ойлик, ўша фильтр билан — фақат спарклайн учун; ҳали
 *                келмаган бўлса плитка спарклайнсиз чизилади.
 */
export function companyProduction(
  cur: DashboardData,
  trend: DashboardData | null,
  curMonth: string,
): CompanyProduction {
  // Спец. бўйича қиймат `plants[]` дан олинади — фильтр ишлаганини ҳам шу
  // тасдиқлайди: завод рўйхатда бўлмаса қиймат йўқ, `total` га ўтилмайди.
  const plant = cur.plants.find((p) => p.name === COMPANY_PLANT) ?? null;
  const total = plant && cur.months.length > 0 ? clean(plant.value) : null;
  const prev = clean(cur.previousTotal);
  const delta = companyDelta(prev, total, "growth");
  const plan = clean(cur.totalPlan);
  const month = cur.months.length ? monthLabel(cur.months[cur.months.length - 1].key) : null;
  const wanted = monthLabel(curMonth);

  const trendPlant = trend?.plants.find((p) => p.name === COMPANY_PLANT) ?? null;
  const spark = trendPlant ? trendPlant.monthly.map((v) => clean(v)) : null;
  const sparkMonths = trend ? trend.months.map((m) => m.key) : [];

  const notes: string[] = [];
  if (month && month !== wanted) notes.push(`${wanted} учун ёзув йўқ — охирги мавжуд ой кўрсатилди`);
  if (plan !== null && plan > 0 && cur.totalPercent !== null) {
    notes.push(`режа ${exact(plan)} т · бажарилиши ${nf(cur.totalPercent, 1)}%`);
  }

  return {
    tile: tileOf("production", "Ишлаб чиқариш (тайёр маҳсулот)", "т", {
      value: total === null ? null : exact(total),
      period: month,
      delta,
      prevPeriod: cur.period.previous ? monthLabel(cur.period.previous.from.slice(0, 7)) : null,
      spark: spark && spark.length >= 2 ? spark : null,
      sparkText: spark ? sparkText("Тайёр маҳсулот", sparkMonths, spark, "т") : null,
      token: total === null ? "var(--rule)" : tokenOf(delta),
      notes,
    }),
    month,
    total: {
      key: "total",
      label: "Тайёр маҳсулот",
      value: total === null ? null : exact(total),
      unit: "т",
      delta,
      plan: plan === null || plan <= 0 ? null : exact(plan),
      planPct: plan !== null && plan > 0 ? clean(cur.totalPercent) : null,
      missing: false,
    },
    metals: cur.metals.map((m) => {
      const d = clean(m.delta);
      return {
        key: m.material ?? "unknown",
        name: materialLabel(m.material),
        value: exact(m.value),
        delta:
          d === null
            ? null
            : { text: (d >= 0 ? "+" : "−") + nf(Math.abs(d), 1) + "%", status: "mute" },
        planPct: m.plan > 0 ? clean(m.percent) : null,
        unnamed: m.material === null,
      };
    }),
  };
}

/* -------------------------------------------------------------------------- */
/* занжир — `/chain`                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Босқич бирлиги — манбадаги ёзувдан ўқиладиган кўринишга. Қавс ичидаги
 * техник изоҳ («не агрегировано», «ед. не подписана явно») экранга чиқмайди,
 * бош бўлак эса луғат бўйича: `тыс.т` → «минг т», `шт` → «дона», `ч` → «соат».
 */
const UNIT_LABEL: Record<string, string> = {
  "тыс.т": "минг т",
  "тыс.шт": "минг дона",
  шт: "дона",
  ч: "соат",
  м3: "м³",
};

function chainUnit(u: string): string {
  const head = u.replace(/\s*\(.*$/, "").trim().split(/\s+/)[0] ?? "";
  return UNIT_LABEL[head] ?? head;
}

/** Босқич тўхтаган — манбанинг ўз «простой» белгиси (`stage` матни). */
const isIdle = (s: ChainStep): boolean => /простой/i.test(s.stage);

interface StepPick {
  id: string;
  label: string;
  tone?: DeltaTone;
  /** Карточкада катта кўрсаткич блоки сифатида (акс ҳолда — тафсилот рўйхатида). */
  big?: boolean;
}

function rowOf(
  byId: Map<string, ChainStep>,
  pick: StepPick,
  cur: string,
  prev: string | null,
): CompanyRow {
  const s = byId.get(pick.id);
  if (!s) {
    return { key: pick.id, label: pick.label, value: null, unit: "", delta: null, plan: null, planPct: null, missing: true };
  }
  const c = s.values[cur] ?? null;
  const p = prev ? (s.values[prev] ?? null) : null;
  const fakt = clean(c?.fakt);
  const plan = clean(c?.plan);
  return {
    key: pick.id,
    label: pick.label,
    value: fakt === null ? null : exact(fakt),
    unit: chainUnit(s.unit),
    delta: companyDelta(clean(p?.fakt), fakt, pick.tone ?? "growth"),
    plan: plan === null || plan <= 0 ? null : exact(plan),
    planPct: plan !== null && plan > 0 ? clean(c?.pct) : null,
    missing: false,
  };
}

export interface CompanySite {
  key: string;
  name: string;
  /** Объект тури — карточка сарлавҳаси остидаги изоҳ. */
  kind: string;
  /** Манбада «простой» — қиймат йўқлиги тўхтаганлик билан изоҳланади. */
  idle: boolean;
  /** Карточкадаги катта кўрсаткич блоклари (2–3 та). */
  primary: CompanyRow[];
  /** Қолган кўрсаткичлар — карточка остидаги ихчам рўйхат. */
  detail: CompanyRow[];
}

export interface CompanyWorkshop {
  key: string;
  /** «4 цех» — манбадаги `site`. */
  name: string;
  /** Маҳсулот — манбадаги `output`, ўзгаришсиз. */
  product: string;
  row: CompanyRow;
}

export interface CompanyFlowNode {
  key: string;
  site: string;
  output: string;
  value: string | null;
  unit: string;
}

export interface CompanyFlow {
  key: string;
  title: string;
  nodes: CompanyFlowNode[];
}

export interface CompanyChain {
  month: string;
  monthLabel: string;
  prevLabel: string | null;
  /** Плитка: W-отвал қайта ишлаш (руда), минг т. */
  raw: CompanyTile;
  /** Устун жами: гравиконцентрат, т. */
  concentrate: CompanyRow;
  sites: CompanySite[];
  workshops: CompanyWorkshop[];
  /** Заводга келадиган реагентлар (қабул) — Чирчик карточкаси учун. */
  reagents: CompanyRow[];
  /** Огарок — Ингичка чиқиндиси. */
  ogarok: CompanyRow;
  flows: CompanyFlow[];
  hasValues: boolean;
}

const INGICHKA_ROWS: StepPick[] = [
  { id: "ing-pererabotano-otvalov", label: "Отвал қайта ишлаш (руда)", big: true },
  { id: "ing-itogo-gravikoncentrat", label: "Гравиконцентрат, жами", big: true },
  { id: "ing-postavka-iof", label: "Заводга юборилди (4 цех)", big: true },
  { id: "ing-uch1-gravikoncentrat", label: "Гравиконцентрат, уч.№1" },
  { id: "ing-uch2-gravikoncentrat", label: "Гравиконцентрат, уч.№2" },
  { id: "ing-uch3-gravikoncentrat", label: "Гравиконцентрат, уч.№3" },
  { id: "prostoy-ingichka", label: "Линиялар тўхташи", tone: "neutral" },
];

const NAVOIY_ROWS: StepPick[] = [
  { id: "nav-isxodnyy-rastvor", label: "Дастлабки эритма", big: true },
  { id: "nav-perrenat", label: "Аммоний перренати", big: true },
  { id: "nav-reniy-metallicheskiy", label: "Рений (перренат таркибида, ҳисобий)", big: true },
  { id: "nav-tfr", label: "ТФР" },
];

const GTC1_ROWS: StepPick[] = [
  { id: "gtc1-chernyy-perrenat", label: "Қора аммоний перренати", big: true },
];

/** Объект турлари — спецификациядаги тавсиф, сон эмас. */
const SITE_KIND = {
  ingichka: "W-отвал (техноген чиқинди) — гравитацион бойитиш",
  navoiy: "Геотехнология — рений (ер ости эритмаси)",
  gtc1: "Геотехнология — қора перренат",
} as const;

const WORKSHOP_STEPS = [
  "c4-vypusk-wo3",
  "c5-vypusk-tma",
  "c1-moo3-vnutrennee",
  "c3-tverdosplavnye-izdeliya",
  "c10-nozhi",
  "c35-kirpichi",
];

const REAGENT_ROWS: StepPick[] = [
  { id: "snab-azotnaya-kislota", label: "Азот кислотаси (қабул)", tone: "neutral" },
  { id: "snab-ammiak", label: "Аммиак (қабул)", tone: "neutral" },
];

/**
 * Хомашё оқими — босқич идентификаторлари кетма-кетлиги. Жавобда йўқ босқич
 * ташлаб кетилади (занжир узилмайди, фақат тугун кам бўлади).
 */
const FLOWS: { key: string; title: string; ids: string[] }[] = [
  {
    key: "w-1",
    title: "Вольфрам: Ингичка → 4 цех → 1 цех",
    ids: ["ing-itogo-gravikoncentrat", "ing-postavka-iof", "c4-vypusk-wo3", "c1-volframovye-shtabiki"],
  },
  {
    key: "w-3",
    title: "Вольфрам: 4 цех → 3 цех",
    ids: ["c4-vypusk-wo3", "c3-karbid-volframa", "c3-tverdosplavnye-izdeliya"],
  },
  {
    key: "mo",
    title: "Молибден: 5 цех → 1 цех → СГП",
    ids: ["c5-vypusk-tma", "c5-peredacha-tma", "c1-moo3-vnutrennee", "c1-sdacha-sgp"],
  },
  {
    key: "re",
    title: "Рений: ГТЦ «Навоий» → перренат",
    ids: ["nav-isxodnyy-rastvor", "nav-tfr", "nav-perrenat", "nav-reniy-metallicheskiy"],
  },
];

export function companyChain(res: ChainResponse, curMonth: string): CompanyChain | null {
  const cur = pickMonth(res.months, curMonth);
  if (!cur) return null;
  const prev = prevOf(res.months, cur);
  const all = [...res.steps, ...res.resources];
  const byId = new Map<string, ChainStep>(all.map((s) => [s.id, s]));
  const row = (p: StepPick): CompanyRow => rowOf(byId, p, cur, prev);

  const site = (key: keyof typeof SITE_KIND, name: string, picks: StepPick[]): CompanySite => {
    const first = byId.get(picks[0].id);
    return {
      key,
      name,
      kind: SITE_KIND[key],
      idle: first ? isIdle(first) : false,
      primary: picks.filter((p) => p.big).map(row),
      detail: picks.filter((p) => !p.big).map(row),
    };
  };

  // Плитка: W-отвал қайта ишлаш, спарклайн жавобдаги барча ойлар бўйича.
  const rawStep = byId.get("ing-pererabotano-otvalov") ?? null;
  const rawRow = row(INGICHKA_ROWS[0]);
  const rawSpark = rawStep ? res.months.map((m) => clean(rawStep.values[m]?.fakt)) : null;
  const rawNotes: string[] = [];
  if (monthLabel(cur) !== monthLabel(curMonth)) {
    rawNotes.push(`${monthLabel(curMonth)} учун ёзув йўқ — охирги мавжуд ой кўрсатилди`);
  }
  if (rawRow.plan !== null && rawRow.planPct !== null) {
    rawNotes.push(`режа ${rawRow.plan} ${rawRow.unit} · бажарилиши ${nf(rawRow.planPct, 1)}%`);
  }

  const raw = tileOf("raw", "Хомашё (W-отвал қайта ишлаш)", rawRow.unit || "минг т", {
    value: rawRow.value,
    period: monthLabel(cur),
    delta: rawRow.delta,
    prevPeriod: prev ? monthLabel(prev) : null,
    spark: rawSpark && rawSpark.filter((v) => v !== null).length >= 2 ? rawSpark : null,
    sparkText: rawSpark ? sparkText("W-отвал қайта ишлаш", res.months, rawSpark, rawRow.unit) : null,
    token: rawRow.value === null ? "var(--rule)" : tokenOf(rawRow.delta),
    notes: rawNotes,
  });

  const workshops: CompanyWorkshop[] = WORKSHOP_STEPS.flatMap((id) => {
    const s = byId.get(id);
    if (!s) return [];
    return [{ key: id, name: s.site, product: s.output, row: rowOf(byId, { id, label: s.output }, cur, prev) }];
  });

  const flows: CompanyFlow[] = FLOWS.map((f) => ({
    key: f.key,
    title: f.title,
    nodes: f.ids.flatMap((id) => {
      const s = byId.get(id);
      if (!s) return [];
      const fakt = clean(s.values[cur]?.fakt);
      return [
        {
          key: id,
          site: s.site,
          output: s.output,
          value: fakt === null ? null : exact(fakt),
          unit: chainUnit(s.unit),
        },
      ];
    }),
  })).filter((f) => f.nodes.length > 0);

  return {
    month: cur,
    monthLabel: monthLabel(cur),
    prevLabel: prev ? monthLabel(prev) : null,
    raw,
    concentrate: row(INGICHKA_ROWS[1]),
    sites: [
      site("ingichka", "Ингичка ИОФ", INGICHKA_ROWS),
      site("navoiy", "ГТЦ «Навоий»", NAVOIY_ROWS),
      site("gtc1", "ГТЦ-1 «Зарафшан»", GTC1_ROWS),
    ],
    workshops,
    reagents: REAGENT_ROWS.map(row),
    ogarok: row({ id: "othod-ogarok", label: "Огарок (чиқинди)", tone: "neutral" }),
    flows,
    hasValues: all.some((s) => clean(s.values[cur]?.fakt) !== null),
  };
}

/* -------------------------------------------------------------------------- */
/* ходимлар — `/kpi` + `/mobplan`                                             */
/* -------------------------------------------------------------------------- */

export interface CompanyStaff {
  tile: CompanyTile;
  /** 1 цех «Численность цеха» — қиймат ва қайси ой. */
  workshop1: { value: string; month: string } | null;
  /** TMK Chemicals штат жадвали жамлари. */
  chemicals: { shtat: string | null; band: string | null; vakansiya: string | null } | null;
}

/** Паспортдаги қатор — ном ва цех бўйича (спец.: `name === "Численность цеха"`, `site === "1 цех"`). */
const STAFF_KPI = { name: "Численность цеха", site: "1 цех" };

export function companyStaff(
  kpi: KpiResponse | null,
  mob: MobplanResponse | null,
  curMonth: string,
): CompanyStaff {
  let workshop1: CompanyStaff["workshop1"] = null;
  const k = kpi?.kpis.find((x) => x.name === STAFF_KPI.name && x.site === STAFF_KPI.site) ?? null;
  if (k) {
    // Жорий ойдан бошлаб орқага — қиймати бор энг яқин ой.
    const months = Object.keys(k.values)
      .filter((m) => m <= curMonth)
      .sort()
      .reverse();
    for (const m of months) {
      const v = clean(k.values[m]?.fakt);
      if (v !== null) {
        workshop1 = { value: exact(v), month: monthLabel(m) };
        break;
      }
    }
  }

  const st = mob?.sheetTotals ?? null;
  const chemicals =
    st === null
      ? null
      : {
          shtat: st.shtat === null ? null : exact(st.shtat),
          band: st.band === null ? null : exact(st.band),
          vakansiya: st.vakansiya === null ? null : exact(st.vakansiya),
        };

  const notes: string[] = [];
  if (workshop1) notes.push(`1 цех: ${workshop1.value} киши (${workshop1.month})`);
  if (chemicals) {
    notes.push(
      `TMK Chemicals: штат ${chemicals.shtat ?? "—"} · банд ${chemicals.band ?? "—"} · вакансия ${chemicals.vakansiya ?? "—"}`,
    );
  }

  return {
    tile: tileOf("staff", "Жами ходимлар", "киши", { notes, warn: "қисман" }),
    workshop1,
    chemicals,
  };
}

/* -------------------------------------------------------------------------- */
/* сотув ва қолдиқлар — `/sales/monthly` + `/sales/products`                  */
/* -------------------------------------------------------------------------- */

/** Оғирлик оиласи — бэкенднинг `value_base` мантиқи билан бир хил (`т` / `тн`). */
const isWeightUnit = (u: string | null): boolean => u === "т" || u === "тн";

const CAT_SALES = "Реализация готовой продукции";
const CAT_STOCK = "Остатки готовой продукции";
const CAT_RAW = "Остатки основного сырья и материалов";

export interface CompanySales {
  monthLabel: string;
  prevLabel: string | null;
  realization: CompanyTile;
  stock: CompanyTile;
  rawStock: CompanyTile;
  /** Хомашё қолдиғининг оғирликдан бошқа бирликлари — қўшилмайди, алоҳида санаб ўтилади. */
  rawOtherUnits: { unit: string; value: string }[];
}

/** Ой + категория бўйича оғирлик йиғиндиси; категория ўша ойда бўлмаса `null`. */
function weightOf(rows: SalesMonthlyRow[], month: string, category: string): number | null {
  const r = rows.find((x) => x.month === month && x.category === category);
  if (!r) return null;
  if (r.byUnit) {
    return clean(r.byUnit.filter((u) => isWeightUnit(u.baseUnit)).reduce((a, u) => a + (u.value ?? 0), 0));
  }
  return clean(r.value_base);
}

export function companySales(
  rows: SalesMonthlyRow[],
  products: SalesProductRow[] | null,
  curMonth: string,
): CompanySales | null {
  const months = [...new Set(rows.map((r) => r.month))].sort();
  const cur = pickMonth(months, curMonth);
  if (!cur) return null;
  const prev = prevOf(months, cur);

  const suspectIn = (cat: string): number =>
    products ? products.filter((p) => p.sgpCategory === cat && isSgpSuspect(p)).length : 0;

  const tile = (
    key: string,
    label: string,
    cat: string,
    tone: DeltaTone,
    withSpark: boolean,
  ): CompanyTile => {
    const v = weightOf(rows, cur, cat);
    const p = prev ? weightOf(rows, prev, cat) : null;
    const delta = companyDelta(p, v, tone);
    const spark = withSpark ? months.map((m) => weightOf(rows, m, cat)) : null;
    const suspect = suspectIn(cat);
    const notes: string[] = [];
    if (monthLabel(cur) !== monthLabel(curMonth)) {
      notes.push(`${monthLabel(curMonth)} учун ёзув йўқ — охирги мавжуд ой кўрсатилди`);
    }
    return tileOf(key, label, "т", {
      value: v === null ? null : exact(v),
      period: monthLabel(cur),
      delta,
      prevPeriod: prev ? monthLabel(prev) : null,
      spark: spark && spark.filter((x) => x !== null).length >= 2 ? spark : null,
      sparkText: spark ? sparkText(label, months, spark, "т") : null,
      token: v === null ? "var(--rule)" : tokenOf(delta),
      notes,
      warn: suspect > 0 ? `${exact(suspect)} та маҳсулот бирлиги текширилмоқда` : null,
    });
  };

  const rawRow = rows.find((x) => x.month === cur && x.category === CAT_RAW) ?? null;
  const rawOtherUnits = (rawRow?.byUnit ?? [])
    .filter((u) => !isWeightUnit(u.baseUnit) && u.value !== null)
    .map((u) => ({ unit: u.baseUnit && u.baseUnit !== "—" ? u.baseUnit : "бирлиги аниқланмаган", value: exact(u.value) }));

  return {
    monthLabel: monthLabel(cur),
    prevLabel: prev ? monthLabel(prev) : null,
    realization: tile("sales", "Реализация (тайёр маҳсулот)", CAT_SALES, "growth", true),
    stock: tile("stock", "Тайёр маҳсулот қолдиғи", CAT_STOCK, "neutral", false),
    rawStock: tile("rawStock", "Хомашё ва материаллар қолдиғи", CAT_RAW, "neutral", false),
    rawOtherUnits,
  };
}

/* -------------------------------------------------------------------------- */
/* электр энергия — `/electricity?groupBy=type&period=monthly`                */
/* -------------------------------------------------------------------------- */

export interface CompanyEnergy {
  tile: CompanyTile;
  /** Завод кесими — Чирчик карточкаси учун. */
  plant: CompanyRow;
  external: CompanyRow;
}

export function companyEnergy(rows: ElectricityTypeRow[], curMonth: string): CompanyEnergy | null {
  // Йиғинди сатрлари («ЭНЦ общ.» → «Белгиланмаган» тури) чиқарилади —
  // `adapters/energy.ts` даги худди шу қоида, акс ҳолда энергия икки марта саналади.
  const byMonth = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const m = r.month ?? "";
    if (!m || isEnergySubtotal(r.type)) continue;
    const types = byMonth.get(m) ?? new Map<string, number>();
    types.set(r.type, (types.get(r.type) ?? 0) + (r.kwh ?? 0));
    byMonth.set(m, types);
  }
  const months = [...byMonth.keys()].sort();
  const cur = pickMonth(months, curMonth);
  if (!cur) return null;
  const prev = prevOf(months, cur);

  const totalOf = (m: string | null): number | null => {
    if (!m) return null;
    const t = byMonth.get(m);
    return t ? clean([...t.values()].reduce((a, b) => a + b, 0)) : null;
  };
  const typeOf = (m: string | null, type: string): number | null => {
    if (!m) return null;
    const v = byMonth.get(m)?.get(type);
    return v === undefined ? null : clean(v);
  };

  const total = totalOf(cur);
  const delta = companyDelta(totalOf(prev), total, "neutral");
  const spark = months.map(totalOf);

  const rowFor = (key: string, label: string, type: string): CompanyRow => {
    const v = typeOf(cur, type);
    return {
      key,
      label,
      value: v === null ? null : exact(v),
      unit: "кВт·с",
      delta: companyDelta(typeOf(prev, type), v, "neutral"),
      plan: null,
      planPct: null,
      missing: false,
    };
  };

  const notes: string[] = [];
  if (monthLabel(cur) !== monthLabel(curMonth)) {
    notes.push(`${monthLabel(curMonth)} учун ёзув йўқ — охирги мавжуд ой кўрсатилди`);
  }

  return {
    tile: tileOf("energy", "Электр энергия", "кВт·с", {
      value: total === null ? null : exact(total),
      period: monthLabel(cur),
      delta,
      prevPeriod: prev ? monthLabel(prev) : null,
      spark: spark.filter((x) => x !== null).length >= 2 ? spark : null,
      sparkText: sparkText("Электр энергия", months, spark, "кВт·с"),
      token: total === null ? "var(--rule)" : "var(--s1)",
      notes,
    }),
    plant: rowFor("plant", "Электр энергия", COMPANY_PLANT),
    external: rowFor("external", "Ташқи истеъмолчилар", "Внешние потребители"),
  };
}

/* -------------------------------------------------------------------------- */
/* тушум — `/finance-report/dashboard`                                        */
/* -------------------------------------------------------------------------- */

export function companyRevenue(fin: FinanceReportDashboard): CompanyTile {
  const row = fin.rows.find((r) => r.key === "revenue") ?? null;
  const n = fin.months.length;
  if (!row || n === 0) {
    return tileOf("revenue", "Тушум", "млрд сўм", { notes: ["молиявий ҳисоботда тушум қатори йўқ"] });
  }
  const last = clean(row.values[n - 1]);
  const prev = n > 1 ? clean(row.values[n - 2]) : null;
  const delta = companyDelta(prev, last, "growth");
  const spark = row.values.map((v) => clean(v));
  return tileOf("revenue", "Тушум", "млрд сўм", {
    value: last === null ? null : finBln(last),
    period: fin.months[n - 1],
    delta,
    prevPeriod: n > 1 ? fin.months[n - 2] : null,
    spark: spark.filter((x) => x !== null).length >= 2 ? spark : null,
    sparkText:
      `Тушум — ойлар бўйича: ` +
      fin.months.map((m, i) => `${m} ${spark[i] === null ? "—" : exact(spark[i])} минг сўм`).join("; "),
    token: last === null ? "var(--rule)" : tokenOf(delta),
    notes: [last === null ? "" : `манбада ${exact(last)} минг сўм`].filter(Boolean),
  });
}

/* -------------------------------------------------------------------------- */
/* қурилаётган лойиҳалар — статик реестр                                      */
/* -------------------------------------------------------------------------- */

export interface CompanyProject {
  id: string;
  name: string;
  /** «2025–2027» — реестрдаги бошланиш/тугаш йили. */
  years: string;
  /** Чип матни: реестрдаги лойиҳа туридан — қурилиш/кенгайтириш → «Қурилиш», геология → «Лойиҳа». */
  phase: string;
  capacity: string;
  jobs: string;
  /** млн $ — манбадаги қиймат, яхлитланмайди. */
  cost: string;
  disbursed: string;
  /** Улуш → фоиз (ҳисобланган). */
  progressPct: number;
  commissioning: string | null;
}

export interface CompanyProjects {
  mine: CompanyProject[];
  metal: CompanyProject[];
  totals: { count: number; jobs: string; cost: string; disbursed: string };
}

/**
 * Реестрда «кон» объект тури йўқ: «Сарикўл» кони ҳам `objectKind: "Завод"`
 * деб ёзилган. Шунинг учун хомашё базасига тегишли лойиҳалар барқарор
 * идентификатор бўйича ажратилади — спецификациядаги `pillar` билан бир хил.
 */
const MINE_PROJECT_IDS = new Set(["miskon", "sarikul"]);

const yearOf = (s: string): string => s.replace(/\s*йил\s*$/i, "").trim();

/** Геология-қидирув — ҳали лойиҳа босқичи; қолгани (янги қурилиш, кенгайтириш) — қурилиш. */
const phaseOf = (p: InvestProject): string => (/геология/i.test(p.kind) ? "Лойиҳа" : "Қурилиш");

const projectOf = (p: InvestProject): CompanyProject => ({
  id: p.id,
  name: p.name,
  years: `${yearOf(p.startYear)}–${yearOf(p.endYear)}`,
  phase: phaseOf(p),
  capacity: p.capacity,
  jobs: exact(p.jobs),
  cost: exact(p.totalCost),
  disbursed: exact(p.disbursed),
  progressPct: p.progressShare * 100,
  commissioning: p.commissioning,
});

export function companyProjects(): CompanyProjects {
  const items = INVEST_PROJECTS;
  return {
    mine: items.filter((p) => MINE_PROJECT_IDS.has(p.id)).map(projectOf),
    metal: items.filter((p) => !MINE_PROJECT_IDS.has(p.id)).map(projectOf),
    totals: {
      count: items.length,
      jobs: exact(items.reduce((a, p) => a + p.jobs, 0)),
      cost: nf(round(items.reduce((a, p) => a + p.totalCost, 0), 2), 2),
      disbursed: nf(round(items.reduce((a, p) => a + p.disbursed, 0), 2), 2),
    },
  };
}

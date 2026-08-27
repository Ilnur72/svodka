import type { Status } from "../../types";
import { exact, nf, pctTxt } from "../format";
import {
  INVEST_DOC_STATES,
  INVEST_EMPTY_FIELDS,
  INVEST_FIELD_LABEL,
  INVEST_FIELD_ORDER,
  INVEST_PROJECTS,
  INVEST_UNNAMED_EMPTY_COUNT,
  type InvestCell,
  type InvestFieldKey,
  type InvestProject,
} from "../invest/investSource";
// Ҳолат → CSS ранг токени: карта умумий (KPI'га хос эмас), шунинг учун
// иккинчи нусхаси ёзилмайди — `var(--good)` каби токенлар бир жойда туради.
import { KPI_STATUS_TOKEN as STATUS_TOKEN } from "./kpi";

/**
 * Инвестиция лойиҳалари бўлими учун view-model.
 *
 * Панел манба тузилмасини билмайди: у фақат шу файл тайёрлаган қийматларни
 * олади. Реестр янгиланса ёки устун номи ўзгарса — тузатиш шу ерда бўлади.
 *
 * ═══ Иккита «бажарилиш» ════════════════════════════════════════════════
 *
 * Реестрда бажарилиш **иккита** мустақил устунда: жисмоний бажарилиш фоизи
 * ва ўзлаштирилган маблағ. Улар бир-бирига мос келмайди — еттитадан
 * тўрттасида жисмоний бажарилиш молиявий ўзлаштиришдан кескин олдинда.
 *
 * Иккови қўшилмайди, ўртачаси олинмайди ва бир-бирига тенглаштирилмайди:
 * бу иккита ҳар хил ўлчов, фарқнинг ўзи эса — бўлимдаги энг қимматли
 * маълумот. Шунинг учун адаптер иккаласини ҳам, фарқини ҳам алоҳида
 * майдон сифатида беради.
 *
 * ═══ Форматлаш ══════════════════════════════════════════════════════════
 *
 * Манбадаги сон **яхлитланмайди** — `exact()`. Ҳисобланган сон (йиғинди,
 * қолдиқ, улуш) эса `nf(..., 2)` билан чиқади: `21.5 − 7.5` каби амаллар
 * сузувчи нуқтада «дум» қолдиради (жами ўзлаштирилган маблағ айнан шундай:
 * 28.200000000000003), у экранга тушмаслиги керак. Иккита хона манбадаги
 * аниқликдан ортиқ, шунинг учун маълумот йўқолмайди.
 *
 * Фоиз ҳам ҳисобланган қиймат: манбада улуш турибди (0,7), `0.7 * 100` эса
 * 70.00000000000001 беради. Шу сабабли фоиз ҳеч қаерда `exact()` билан
 * кўрсатилмайди — доим `pctTxt()` (бир хона), лойиҳанинг қолган қисмидаги
 * фоизлар билан бир хил кўринишда.
 *
 * ═══ Бўш катак нол эмас ═════════════════════════════════════════════════
 *
 * Реестрда учта ҳолат бор ва учаласи фарқланади:
 *   - сон (шу жумладан ҳақиқий `0` — «ҳали ҳеч нарса ўзлаштирилмаган»),
 *   - матн («ТИАда аниқланади» — ҳисоблаш ҳали олдинда),
 *   - бўш катак — «маълумот йўқ».
 * Ҳеч бири иккинчисига айлантирилмайди ва нол билан тўлдирилмайди.
 */

/** Сумма ўлчови — реестрда барча сумма шу бирликда. */
export const USD = "млн $";

/** Бўш катак матни. Нол эмас — қиймат йўқлиги. */
export const NO_DATA = "маълумот йўқ";

/** Манбадаги қиймат — яхлитланмайди. */
export const investExact = (v: number): string => exact(v);

/** Ҳисобланган қиймат (йиғинди, қолдиқ) — сузувчи нуқта думисиз. */
export const investCalc = (v: number): string => nf(v, 2);

/** Улуш → фоиз. Ҳисобланган қиймат, шунинг учун `exact()` эмас. */
const toPct = (share: number): number => share * 100;

/** Ишорали пункт матни: «−35,1 п.п.». */
export const investPp = (pp: number): string =>
  (pp >= 0 ? "+" : "−") + nf(Math.abs(pp), 1) + " п.п.";

/* -------------------------------------------------------------------------- */
/* диаграмма ўқи учун қисқа ёрлиқ                                             */
/* -------------------------------------------------------------------------- */

/**
 * Лойиҳа номлари вертикал устун диаграммасининг ўқи учун жуда узун —
 * «Молибден куйиндисини қайта ишлаш бўйича янги гидрометаллургия цехини
 * қуриш» каби еттита ёрлиқ ўқ остида бир-бирининг устига чиқади ва
 * диаграмма ўқилмай қолади. Шунинг учун **фақат ўқда** қисқа ёрлиқ туради,
 * тўлиқ ном эса тултипда ва жадвалда ўзгаришсиз сақланади.
 *
 * Қисқартма фақат шу ерда — лойиҳа номлари учун — ишлатилади. Кесимлар
 * (ҳудуд, лойиҳа тури, объект тури, молиялаштириш манбаи) горизонтал
 * диаграммада чизилади: у ерда ёрлиққа бутун бир устун ажратилган ва ном
 * тўлиқ ёзилади, шунинг учун қисқартиришнинг ҳожати йўқ.
 *
 * Қисқа ёрлиқ **ўйлаб топилмайди** — доим манба матнидан кесиб олинади:
 *   - қўштирноқ ичидаги ном: «"Мискон" мис-порфирли...» → «Мискон»;
 *   - акс ҳолда номнинг бошидан чегарага сиққанича сўз.
 *
 * Иккита ёрлиқ бир хил чиқиб қолмаслиги учун такрорланувчиларга кейинги сўз
 * қўшилади — шунда фарқловчи бўлак ёрлиқда қолади. Ноёблик барибир топилмаса
 * — тўлиқ ном қайтарилади: тушунарсиз қисқартмадан кўра узун ёрлиқ яхши.
 */

/** Ўқ ёрлиғининг чегараси, белгиларда. Ундан узуни қўшни ёрлиққа тегади. */
const SHORT_MAX = 18;

/** Кесиш учун бўлаклар — фақат манба матнидан олинади. */
function shortTokens(full: string): string[] {
  const quoted = /"([^"]+)"/.exec(full);
  if (quoted) return [quoted[1]];
  return full.split(/\s+/).filter(Boolean);
}

/** Кесилган бўлакнинг охирида қолиб кетган тиниш белгиси олиб ташланади. */
const trimTail = (v: string): string => v.replace(/[,;.:]+$/, "");

function shortenLabels(fulls: string[]): string[] {
  const src = fulls.map(shortTokens);
  const join = (i: number, k: number): string => trimTail(src[i].slice(0, k).join(" "));

  // Бошланғич кесим: чегарага сиққанича сўз, лекин камида биттаси.
  const take = src.map((_, i) => {
    let k = 1;
    while (k < src[i].length && join(i, k + 1).length <= SHORT_MAX) k += 1;
    return k;
  });

  let out = fulls.map((_, i) => join(i, take[i]));

  // Такрорланувчи ёрлиққа кейинги сўз қўшилади — фарқ ёрлиқда кўринсин.
  for (let pass = 0; pass < 8; pass++) {
    const byLabel = new Map<string, number[]>();
    out.forEach((v, i) => byLabel.set(v, [...(byLabel.get(v) ?? []), i]));
    let grew = false;
    for (const idx of byLabel.values()) {
      if (idx.length < 2) continue;
      for (const i of idx) {
        if (take[i] < src[i].length) {
          take[i] += 1;
          grew = true;
        }
      }
    }
    if (!grew) break;
    out = fulls.map((_, i) => join(i, take[i]));
  }

  const seen = new Map<string, number>();
  for (const v of out) seen.set(v, (seen.get(v) ?? 0) + 1);
  return out.map((v, i) => ((seen.get(v) ?? 0) > 1 ? fulls[i] : v));
}

/* -------------------------------------------------------------------------- */
/* фарқнинг чегаралари                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Чегаралар молиявий стандарт эмас — фақат диққатни қаратиш учун:
 * 3 п.п. гача фарқ «мос келади», 10 п.п. дан ортиғи «кескин фарқ».
 * Ранг ёлғиз маъно ташувчи эмас: фарқнинг ўзи доим сон билан ёзилади.
 */
const GAP_NOTICE = 3;
const GAP_SEVERE = 10;

const gapStatus = (pp: number): Status =>
  pp <= -GAP_SEVERE ? "crit" : Math.abs(pp) <= GAP_NOTICE ? "mute" : "warn";

/**
 * Молиявий баҳонинг ҳолати учта катакдан аниқланади. Матн («ТИАда
 * аниқланади») ва бўш катак бир-бирига айлантирилмайди: биринчиси —
 * ҳисоблаш ҳали олдинда, иккинчиси — маълумотнинг ўзи йўқ.
 */
const finKind = (p: InvestProject): InvestFinKind => {
  const cells: InvestCell[] = [p.payback, p.irrShare, p.npv];
  if (cells.every((c) => typeof c === "number")) return "complete";
  if (cells.some((c) => typeof c === "string")) return "pending";
  return "empty";
};

/* -------------------------------------------------------------------------- */
/* майдон қийматини матнга айлантириш                                         */
/* -------------------------------------------------------------------------- */

/** Тайёр матн + у сон сифатида (моноширинали) ёзилиши кераклиги. */
export interface InvestVal {
  v: string;
  num: boolean;
}

/** Ёрлиғи билан биргаликдаги майдон — «барча майдонлар» рўйхати учун. */
export interface InvestField extends InvestVal {
  k: string;
}

const txt = (v: string): InvestVal => ({ v, num: false });
const val = (v: string): InvestVal => ({ v, num: true });

/**
 * Сон/матн/бўш учаласини ажратадиган катак.
 * Матн манбадагидек қолади — қайта ёзилмайди ва таржима қилинмайди.
 */
const cell = (v: InvestCell, unit: string): InvestVal =>
  v === null ? txt(NO_DATA) : typeof v === "string" ? txt(v) : val(unit ? `${exact(v)} ${unit}` : exact(v));

type FieldFmt = (p: InvestProject) => InvestVal;

/**
 * Ҳар бир майдоннинг матн кўриниши. `Record` тўлиқлиги TypeScript томонидан
 * текширилади — реестрга майдон қўшилса, бу ерда ҳам мажбурий пайдо бўлади.
 */
const FIELD_TEXT: Record<InvestFieldKey, FieldFmt> = {
  enterprise: (p) => txt(p.enterprise),
  name: (p) => txt(p.name),
  region: (p) => txt(p.region),
  goal: (p) => txt(p.goal),
  kind: (p) => txt(p.kind),
  progressShare: (p) => val(pctTxt(toPct(p.progressShare))),
  state: (p) => txt(p.state),
  priority: (p) => val(exact(p.priority)),
  capacity: (p) => txt(p.capacity),
  durationMonths: (p) => val(`${exact(p.durationMonths)} ой`),
  startYear: (p) => txt(p.startYear),
  endYear: (p) => txt(p.endYear),
  totalCost: (p) => val(`${exact(p.totalCost)} ${USD}`),
  disbursed: (p) => val(`${exact(p.disbursed)} ${USD}`),
  payback: (p) => cell(p.payback, "йил"),
  // IRR манбада улуш: 0,189 → 18,9%. Матн бўлса ўз ҳолида қолади.
  irrShare: (p) => (typeof p.irrShare === "number" ? val(pctTxt(toPct(p.irrShare))) : cell(p.irrShare, "")),
  npv: (p) => cell(p.npv, USD),
  jobs: (p) => val(`${exact(p.jobs)} та`),
  product: (p) => (p.product === null ? txt(NO_DATA) : txt(p.product)),
  annualOutputUsd: (p) => (p.annualOutputUsd === null ? txt(NO_DATA) : val(`${exact(p.annualOutputUsd)} ${USD}`)),
  // Аралаш ўлчов: сон бўлса тонна, матн бўлса ўз бирлигини ўзи ташийди.
  annualOutputQty: (p) => cell(p.annualOutputQty, "тонна"),
  fsState: (p) => txt(p.fsState),
  buildStart: (p) => (p.buildStart === null ? txt(NO_DATA) : txt(p.buildStart)),
  commissioning: (p) => (p.commissioning === null ? txt(NO_DATA) : txt(p.commissioning)),
  docState: (p) => (p.docState === null ? txt(NO_DATA) : txt(p.docState)),
  areaHa: (p) => (p.areaHa === null ? txt(NO_DATA) : val(`${exact(p.areaHa)} га`)),
  equipment: (p) => txt(p.equipment),
  objectKind: (p) => txt(p.objectKind),
  funding: (p) => txt(p.funding),
  risks: (p) => txt(p.risks),
};

const fieldOf = (p: InvestProject, key: InvestFieldKey): InvestField => ({
  k: INVEST_FIELD_LABEL[key],
  ...FIELD_TEXT[key](p),
});

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface InvestTotals {
  count: number;
  totalCost: number;
  disbursed: number;
  /** Ўзлаштирилган маблағнинг умумий қийматдаги улуши, фоизда. */
  disbursedPct: number;
  jobs: number;
}

/** Битта лойиҳанинг иккита бажарилиши — ёнма-ён, бирлаштирилмаган. */
export interface InvestProgressRow {
  id: string;
  name: string;
  /** Диаграмма ўқи учун қисқа ном. Тўлиқ ном `name` да қолади. */
  short: string;
  region: string;
  /** Жисмоний бажарилиш, фоизда. */
  physPct: number;
  /** Молиявий ўзлаштириш, фоизда. */
  finPct: number;
  /** Иккисининг фарқи, пунктда. Манфий — жисмоний олдинда. */
  gapPp: number;
  gapText: string;
  status: Status;
  token: string;
  totalCost: number;
  disbursed: number;
}

export interface InvestCostRow {
  id: string;
  name: string;
  /** Диаграмма ўқи учун қисқа ном. Тўлиқ ном `name` да қолади. */
  short: string;
  totalCost: number;
  disbursed: number;
  /** Ҳисобланган қолдиқ. */
  remaining: number;
  disbursedPct: number;
  annualOutputUsd: number | null;
}

export interface InvestGroup {
  /** Манбадаги тўлиқ ном — кесим диаграммасида қисқартирилмайди. */
  name: string;
  count: number;
  totalCost: number;
  disbursed: number;
}

/** Кесим танлагичининг қиймати. */
export type InvestCutId = "region" | "kind" | "objectKind" | "funding";

export interface InvestSection {
  id: InvestCutId;
  title: string;
  /** Танлагич остидаги қисқа изоҳ — бу кесим нимани кўрсатади. */
  hint: string;
  groups: InvestGroup[];
}

/**
 * Молиявий баҳонинг учта ҳолати. Улар бир-биридан фарқланади ва экранда ҳам
 * бошқача ёзилади:
 *   - `complete` — учала кўрсаткич ҳам ҳисобланган;
 *   - `pending`  — камида биттасида «ТИАда аниқланади» деб ёзилган;
 *   - `empty`    — катаклар бўш, маълумотнинг ўзи йўқ.
 * «Бўш» ҳеч қачон нолга ҳам, «аниқланади»га ҳам айлантирилмайди.
 */
export type InvestFinKind = "complete" | "pending" | "empty";

/** IRR / NPV / қоплаш муддати — тайёр матн, чунки сон ҳам, матн ҳам бўлиши мумкин. */
export interface InvestFinRow {
  id: string;
  name: string;
  irr: InvestVal;
  npv: InvestVal;
  payback: InvestVal;
  kind: InvestFinKind;
}

export interface InvestReadyRow {
  id: string;
  /** Диаграмма ва ихчам қатор учун қисқа ном. Тўлиқ ном `name` да қолади. */
  short: string;
  name: string;
  fsState: string;
  docState: string;
  equipment: string;
  endYear: string;
  commissioning: string;
}

/**
 * Қурилиш лойиҳа-смета ҳужжатлари ҳолати бўйича гуруҳ. Учта гуруҳ бор,
 * шунинг учун бу ерда диаграмма ҳам, жадвал ҳам эмас — ихчам қатор.
 */
export interface InvestDocGroup {
  /** Манбадаги ёзув ёки бўш катак матни. */
  state: string;
  /** Манбада катак бўш бўлган гуруҳ — «ҳали ҳолат кўрсатилмаган». */
  noData: boolean;
  count: number;
  /** Гуруҳдаги лойиҳаларнинг қисқа номи — қаторда санаб ўтилади. */
  names: string[];
}

export interface InvestCard {
  id: string;
  name: string;
  region: string;
  kind: string;
  physPct: number;
  finPct: number;
  gapText: string;
  status: Status;
  token: string;
  /** Карточкада доим кўринадиган асосий кўрсаткичлар. */
  head: InvestField[];
  /** Реестрдаги барча майдонлар — очилганда. */
  details: InvestField[];
}

export interface InvestVM {
  totals: InvestTotals;
  progress: InvestProgressRow[];
  /** Жисмоний бажарилиш молиявийдан кескин олдинда кетган лойиҳалар. */
  behind: InvestProgressRow[];
  cost: InvestCostRow[];
  sections: InvestSection[];
  fin: InvestFinRow[];
  /** Учта ҳолат бўйича лойиҳалар сони. Йиғиндиси — жами лойиҳалар сони. */
  finCounts: Record<InvestFinKind, number>;
  ready: InvestReadyRow[];
  /** Ҳужжат ҳолати бўйича гуруҳлар — реестрдаги босқич тартибида. */
  readyDocGroups: InvestDocGroup[];
  cards: InvestCard[];
  /** Ҳар бир лойиҳанинг паспорти — реестрдаги тартибда. */
  passports: InvestPassport[];
  /**
   * «Асосий хатарлар» устуни барча лойиҳада бир хил тўлдирилганми.
   * Ҳозир — ҳа: еттитасида ҳам битта ёзув турибди. Паспортдаги хатарлар
   * блоки шуни очиқ айтиши учун керак: у ерда даража ҳам, рўйхат ҳам
   * ўйлаб топилмайди, манбада нима бўлса шу кўринади.
   */
  risksAllSame: boolean;
  /** Барча лойиҳада бир хил бўлган майдонлар — улар ҳеч нимани ажратмайди. */
  constants: InvestField[];
  emptyFields: string[];
  unnamedEmptyCount: number;
  /** Ҳужжат ҳолатининг реестрдаги биронта лойиҳа турмаган босқичлари. */
  unusedDocStates: string[];
}

/** Фақат бир хил қийматли майдонлар — уларни фильтр ёки ўқ қилиб бериш маъносиз. */
function constantFields(items: InvestProject[]): InvestField[] {
  const out: InvestField[] = [];
  for (const key of INVEST_FIELD_ORDER) {
    const first = fieldOf(items[0], key);
    if (items.every((p) => fieldOf(p, key).v === first.v)) out.push(first);
  }
  return out;
}

function groupBy(items: InvestProject[], get: (p: InvestProject) => string): InvestGroup[] {
  const map = new Map<string, InvestGroup>();
  for (const p of items) {
    const name = get(p);
    const g = map.get(name) ?? { name, count: 0, totalCost: 0, disbursed: 0 };
    g.count += 1;
    g.totalCost += p.totalCost;
    g.disbursed += p.disbursed;
    map.set(name, g);
  }
  // Қиймат бўйича — «пул қаерга кетяпти» саволига мос тартиб. Ном
  // қисқартирилмайди: кесим горизонтал диаграммада чизилади ва у ерда
  // ёрлиққа бутун бир устун ажратилган.
  return [...map.values()].sort((a, b) => b.totalCost - a.totalCost);
}

/**
 * Кесимлар. Тўрттаси ҳам битта блокда, танлагич орқали алмашади: гуруҳлар
 * сони 2 тадан 5 тагача, ҳар бирига алоҳида карточка берилса экран
 * майдаланарди.
 */
const SECTION_DEFS: {
  id: InvestCutId;
  title: string;
  hint: string;
  get: (p: InvestProject) => string;
}[] = [
  {
    id: "region",
    title: "Ҳудуд",
    hint: "Лойиҳа жойлашган туман. Қиймат ҳудудлар бўйича қандай тақсимланганини кўрсатади.",
    get: (p) => p.region,
  },
  {
    id: "kind",
    title: "Лойиҳа тури",
    hint: "Янги қурилиш, мавжуд ишлаб чиқаришни кенгайтириш ёки геология-қидирув иши.",
    get: (p) => p.kind,
  },
  {
    id: "objectKind",
    title: "Объект тури",
    hint: "Реестрда фақат иккита тур учрайди — шунинг учун бу кесимда иккита қатор бор.",
    get: (p) => p.objectKind,
  },
  {
    id: "funding",
    title: "Молиялаштириш манбаи",
    hint: "Манбалар таркиби манбада битта матн бўлиб ёзилган, шунинг учун таркиб бўйича эмас, айнан шу ёзув бўйича гуруҳланган.",
    get: (p) => p.funding,
  },
];

/** Карточка бошида кўрсатиладиган майдонлар. */
const HEAD_FIELDS: InvestFieldKey[] = [
  "totalCost",
  "disbursed",
  "jobs",
  "endYear",
  "capacity",
];

/* -------------------------------------------------------------------------- */
/* паспорт — битта лойиҳанинг тўлиқ кўриниши                                  */
/* -------------------------------------------------------------------------- */

/** Паспортдаги битта блок: сарлавҳа ва унга тегишли майдонлар. */
export interface InvestBlock {
  title: string;
  fields: InvestField[];
}

/**
 * Паспорт бошидаги плитка. Бу ерда ўлчов бирлиги қийматдан ажратилган:
 * плиткада сон катта ҳарфда, бирлик эса ёнида кичик ёзилади. Қолган
 * жойларда бирлик қиймат матнининг ичида қолади (`InvestField`).
 */
export interface InvestTile {
  k: string;
  v: string;
  unit?: string;
  /** Плитканинг чап чизиғи учун CSS ранг токени. */
  stripe: string;
}

/**
 * Паспорт марказидаги «Лойиҳа майдони» блоки.
 *
 * ═══ Расм ═══════════════════════════════════════════════════════════════
 *
 * Реестрда сурат ҳам, координата ҳам, харита ҳам йўқ — шунинг учун бу ерда
 * ҳеч нарса чизилмайди ва ҳисоблаб чиқарилмайди. Расм — қўлда қўйиладиган
 * файл: `public/invest/<id>.jpg`. Файл бор-йўқлигини build пайтида билиб
 * бўлмайди (у бандлга кирмайди, бевосита сервердан олинади), шунинг учун
 * қарор браузерда, расм юкланиш натижасига қараб қабул қилинади: юкланмаса
 * блок бўш қолмайди, «сурат йўқ» плашкаси кўринади ва остидаги
 * кўрсаткичлар барибир чизилаверади.
 *
 * `src` шу ерда, адаптерда ясалади: панел файл номи қоидасини билмайди.
 * `import.meta.env.BASE_URL` — илова илдиз каталогда турмаса ҳам манзил
 * тўғри бўлиши учун (`vite.config.ts` да `base: "./"`).
 *
 * ═══ Кўрсаткичлар ══════════════════════════════════════════════════════
 *
 * Расм остидаги тўртта қатор — реестрдаги катаклар, ўз ҳолида. Уларнинг
 * учтаси паспортнинг бошқа жойида ҳам учрайди (ҳудуд сарлавҳада, қувват ва
 * объект тури тавсиф тасмасида) — бу такрор атайин: блок «лойиҳа қаерда ва
 * нима» саволига ўз ичида, бошқа жойга қарамасдан жавоб бериши керак.
 * Қиймат иккала жойда ҳам битта манбадан олинади, шунинг учун улар
 * бир-биридан фарқ қила олмайди.
 *
 * Лойиҳа майдони реестрда етти лойиҳанинг фақат учтасида тўлдирилган.
 * Қолган тўрттасида катак бўш — у нол билан ҳам, тахмин билан ҳам
 * тўлдирилмайди ва яширилмайди ҳам: «маълумот йўқ» бўлиб ўз ўрнида туради.
 */
export interface InvestArea {
  /** `public/invest/<id>.jpg` манзили. Файл бўлмаса — плашка кўринади. */
  src: string;
  /** Расмнинг матнли муқобили — лойиҳа номи билан. */
  alt: string;
  /** Расм остидаги қаторлар: майдон · ҳудуд · объект тури · қувват. */
  fields: InvestField[];
  /** Блок остидаги изоҳ — майдон нечта лойиҳада тўлдирилгани. */
  note: string;
}

/**
 * Битта лойиҳанинг паспорти: реестрдаги **ўттизта майдоннинг ҳаммаси**
 * блокларга тақсимланган.
 *
 * Тақсимот — маънога кўра, реестрдаги устун тартибига эмас: муддат муддат
 * билан, пул пул билан, тайёргарлик тайёргарлик билан туради. Биронта майдон
 * тушиб қолмайди — бўш катаклар ҳам «маълумот йўқ» бўлиб ўз ўрнида кўринади.
 *
 * `tiles` даги тўртта қиймат (бошланиш, тугаш, умумий қиймат, ўзлаштирилган)
 * қуйидаги блокларда **яна бир марта** учрайди ва бу атайин: плиткалар —
 * бир қарашда ўқиладиган тасма, блоклар эса шу қийматни ўз контекстида
 * (муддатлар қатори, молиялаштириш қатори) кўрсатади. Қиймат иккала жойда
 * ҳам битта манбадан олинади, шунинг учун улар ҳеч қачон бир-биридан
 * фарқ қила олмайди.
 *
 * Иккита фоиз — `physPct` ва `finPct` — алоҳида майдон бўлиб қолади:
 * улар қўшилмайди, ўртачаси олинмайди ва битта кўрсаткичга айлантирилмайди.
 */
export interface InvestPassport {
  id: string;
  /** Танлагич ёрлиғи учун қисқа ном. Тўлиқ ном `name` да. */
  short: string;
  name: string;
  region: string;
  enterprise: string;
  /** Лойиҳа ҳолати — манбадаги ёзувда, қайта ёзилмайди. */
  state: string;
  /** Жисмоний бажарилиш, фоизда. */
  physPct: number;
  /** Молиявий ўзлаштириш, фоизда. */
  finPct: number;
  gapText: string;
  status: Status;
  token: string;
  /** Сарлавҳа остидаги тўртта плитка. */
  tiles: InvestTile[];
  /** Лойиҳа мақсади — узун матн, рўйхат эмас, абзац бўлиб чизилади. */
  goal: InvestField;
  /** Марказдаги «Лойиҳа майдони» блоки: сурат ва тўртта кўрсаткич. */
  area: InvestArea;
  /** Чап устун: муддатлар · молиялаштириш · иш ўринлари. */
  left: InvestBlock[];
  /** Марказ: лойиҳа қай босқичда. */
  readiness: InvestBlock;
  /** Ўнг устун: нима ишлаб чиқарилади ва қаерда. */
  product: InvestBlock;
  /** Пастки тасма: лойиҳанинг умумий тавсифи. */
  strip: InvestField[];
  /** Асосий хатарлар — манбадаги матн. Даража ўйлаб топилмайди. */
  risks: InvestField;
}

function passportOf(
  p: InvestProject,
  pr: InvestProgressRow | undefined,
  short: string,
  areaNote: string,
): InvestPassport {
  const f = (k: InvestFieldKey): InvestField => fieldOf(p, k);
  return {
    id: p.id,
    short,
    name: p.name,
    region: p.region,
    enterprise: p.enterprise,
    state: p.state,
    physPct: pr?.physPct ?? 0,
    finPct: pr?.finPct ?? 0,
    gapText: pr?.gapText ?? NO_DATA,
    status: pr?.status ?? "mute",
    token: pr?.token ?? STATUS_TOKEN.mute,
    tiles: [
      { k: INVEST_FIELD_LABEL.startYear, v: p.startYear, stripe: "var(--s1)" },
      { k: INVEST_FIELD_LABEL.endYear, v: p.endYear, stripe: "var(--rule)" },
      {
        k: INVEST_FIELD_LABEL.totalCost,
        v: investExact(p.totalCost),
        unit: USD,
        stripe: "var(--s2)",
      },
      {
        k: INVEST_FIELD_LABEL.disbursed,
        v: investExact(p.disbursed),
        unit: USD,
        stripe: "var(--s3)",
      },
    ],
    goal: f("goal"),
    area: {
      src: `${import.meta.env.BASE_URL}invest/${p.id}.jpg`,
      alt: `${p.name} — лойиҳа майдонининг сурати`,
      fields: [f("areaHa"), f("region"), f("objectKind"), f("capacity")],
      note: areaNote,
    },
    left: [
      { title: "Муддатлар", fields: [f("startYear"), f("endYear"), f("durationMonths")] },
      {
        title: "Молиялаштириш",
        fields: [f("funding"), f("totalCost"), f("disbursed"), f("irrShare"), f("npv"), f("payback")],
      },
      { title: "Иш ўринлари", fields: [f("jobs")] },
    ],
    readiness: {
      title: "Тайёргарлик",
      fields: [f("fsState"), f("docState"), f("buildStart"), f("commissioning"), f("equipment")],
    },
    product: {
      title: "Маҳсулот ва майдон",
      fields: [
        f("product"),
        f("annualOutputUsd"),
        f("annualOutputQty"),
        f("areaHa"),
        f("kind"),
      ],
    },
    strip: [f("priority"), f("capacity"), f("durationMonths"), f("objectKind")],
    risks: f("risks"),
  };
}

export function investVM(): InvestVM {
  const items = INVEST_PROJECTS;
  // Қисқа ном битта марта, бутун рўйхат бўйича ҳисобланади: у ноёбликка
  // боғлиқ, шунинг учун лойиҳани алоҳида қисқартириб бўлмайди. Тартиблаш
  // ёки фильтр ёрлиқни ўзгартирмаслиги учун у `id` га боғлаб қўйилади.
  const shortNames = shortenLabels(items.map((p) => p.name));
  const shortById = new Map(items.map((p, i) => [p.id, shortNames[i]]));

  const totalCost = items.reduce((a, p) => a + p.totalCost, 0);
  const disbursed = items.reduce((a, p) => a + p.disbursed, 0);

  const totals: InvestTotals = {
    count: items.length,
    totalCost,
    disbursed,
    disbursedPct: (disbursed / totalCost) * 100,
    jobs: items.reduce((a, p) => a + p.jobs, 0),
  };

  // Саралаш бўлимнинг маъносига мос: энг олдин фарқи катта — молиявий
  // ўзлаштириш жисмоний бажарилишдан энг кўп орқада қолган лойиҳа. Ранг
  // серияга бириктирилган, шунинг учун тартиб ранг маъносини ўзгартирмайди.
  const progress: InvestProgressRow[] = items.map((p) => {
    const physPct = toPct(p.progressShare);
    // Молиявий ўзлаштириш реестрда алоҳида устун сифатида турмайди —
    // у ўзлаштирилган маблағнинг умумий қийматга нисбати.
    const finPct = (p.disbursed / p.totalCost) * 100;
    const gapPp = finPct - physPct;
    const status = gapStatus(gapPp);
    return {
      id: p.id,
      name: p.name,
      short: shortById.get(p.id) ?? p.name,
      region: p.region,
      physPct,
      finPct,
      gapPp,
      gapText: status === "mute" ? "мос келади" : investPp(gapPp),
      status,
      token: STATUS_TOKEN[status],
      totalCost: p.totalCost,
      disbursed: p.disbursed,
    };
  }).sort((a, b) => a.gapPp - b.gapPp);

  const cost: InvestCostRow[] = items
    .map((p) => ({
      id: p.id,
      name: p.name,
      short: shortById.get(p.id) ?? p.name,
      totalCost: p.totalCost,
      disbursed: p.disbursed,
      remaining: p.totalCost - p.disbursed,
      disbursedPct: (p.disbursed / p.totalCost) * 100,
      annualOutputUsd: p.annualOutputUsd,
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  const fin: InvestFinRow[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    irr: FIELD_TEXT.irrShare(p),
    npv: FIELD_TEXT.npv(p),
    payback: FIELD_TEXT.payback(p),
    kind: finKind(p),
  }));

  const finCounts: Record<InvestFinKind, number> = { complete: 0, pending: 0, empty: 0 };
  for (const r of fin) finCounts[r.kind] += 1;

  const ready: InvestReadyRow[] = items.map((p) => ({
    id: p.id,
    short: shortById.get(p.id) ?? p.name,
    name: p.name,
    fsState: p.fsState,
    docState: FIELD_TEXT.docState(p).v,
    equipment: p.equipment,
    endYear: p.endYear,
    commissioning: FIELD_TEXT.commissioning(p).v,
  }));

  // Ҳужжат ҳолати бўйича гуруҳлар — реестрдаги босқич тартибида, бўш катак
  // эса охирида алоҳида гуруҳ бўлиб туради (у босқич эмас, маълумот йўқлиги).
  const docGroupOf = (state: string, noData: boolean): InvestDocGroup => ({
    state,
    noData,
    count: ready.filter((r) => (noData ? r.docState === NO_DATA : r.docState === state)).length,
    names: ready
      .filter((r) => (noData ? r.docState === NO_DATA : r.docState === state))
      .map((r) => r.short),
  });
  const readyDocGroups: InvestDocGroup[] = [
    ...INVEST_DOC_STATES.map((st) => docGroupOf(st, false)),
    docGroupOf(NO_DATA, true),
  ].filter((g) => g.count > 0);

  const byId = new Map(progress.map((r) => [r.id, r]));
  const cards: InvestCard[] = items.map((p) => {
    const pr = byId.get(p.id);
    return {
      id: p.id,
      name: p.name,
      region: p.region,
      kind: p.kind,
      physPct: pr?.physPct ?? 0,
      finPct: pr?.finPct ?? 0,
      gapText: pr?.gapText ?? NO_DATA,
      status: pr?.status ?? "mute",
      token: pr?.token ?? STATUS_TOKEN.mute,
      head: HEAD_FIELDS.map((k) => fieldOf(p, k)),
      details: INVEST_FIELD_ORDER.map((k) => fieldOf(p, k)),
    };
  });

  // Паспорт реестрдаги тартибда қолади: танлагичдаги қаторни саралаш билан
  // ўзгартириш фойдаланувчининг ёдидаги жойни силжитарди.
  // Изоҳ санаб чиқарилади, қўлда ёзилмайди: реестрда майдон тўлдирилган
  // лойиҳалар сони ўзгарса, матн ўзи билан бирга ўзгаради.
  const areaFilled = items.filter((p) => p.areaHa !== null).length;
  const areaNote =
    `Реестрда лойиҳа майдони ${investExact(items.length)} та лойиҳадан ` +
    `${investExact(areaFilled)} тасида тўлдирилган. Қолганида катак бўш — ` +
    `у нол билан ҳам, тахмин билан ҳам тўлдирилмади.`;

  const passports: InvestPassport[] = items.map((p) =>
    passportOf(p, byId.get(p.id), shortById.get(p.id) ?? p.name, areaNote),
  );

  const usedDocStates = new Set(items.map((p) => p.docState).filter((v): v is string => v !== null));

  return {
    totals,
    progress,
    behind: progress.filter((r) => r.status === "crit"),
    cost,
    sections: SECTION_DEFS.map((s) => ({
      id: s.id,
      title: s.title,
      hint: s.hint,
      groups: groupBy(items, s.get),
    })),
    fin,
    finCounts,
    ready,
    readyDocGroups,
    cards,
    passports,
    risksAllSame: items.every((x) => x.risks === items[0].risks),
    constants: constantFields(items),
    emptyFields: INVEST_EMPTY_FIELDS,
    unnamedEmptyCount: INVEST_UNNAMED_EMPTY_COUNT,
    unusedDocStates: INVEST_DOC_STATES.filter((s) => !usedDocStates.has(s)),
  };
}

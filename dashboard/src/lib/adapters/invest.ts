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
  totalCost: number;
  disbursed: number;
  /** Ҳисобланган қолдиқ. */
  remaining: number;
  disbursedPct: number;
  annualOutputUsd: number | null;
}

export interface InvestGroup {
  name: string;
  count: number;
  totalCost: number;
  disbursed: number;
}

export interface InvestSection {
  id: string;
  title: string;
  groups: InvestGroup[];
}

/** IRR / NPV / қоплаш муддати — тайёр матн, чунки сон ҳам, матн ҳам бўлиши мумкин. */
export interface InvestFinRow {
  id: string;
  name: string;
  irr: InvestVal;
  npv: InvestVal;
  payback: InvestVal;
  /** Учаласи ҳам сон бўлган лойиҳа. */
  complete: boolean;
}

export interface InvestReadyRow {
  id: string;
  name: string;
  fsState: string;
  docState: string;
  equipment: string;
  endYear: string;
  commissioning: string;
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
  maxCost: number;
  sections: InvestSection[];
  fin: InvestFinRow[];
  finCompleteCount: number;
  ready: InvestReadyRow[];
  cards: InvestCard[];
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
  // Қиймат бўйича — «пул қаерга кетяпти» саволига мос тартиб.
  return [...map.values()].sort((a, b) => b.totalCost - a.totalCost);
}

const SECTION_DEFS: { id: string; title: string; get: (p: InvestProject) => string }[] = [
  { id: "region", title: "Ҳудуд", get: (p) => p.region },
  { id: "kind", title: "Лойиҳа тури", get: (p) => p.kind },
  { id: "objectKind", title: "Объект тури", get: (p) => p.objectKind },
  { id: "funding", title: "Молиялаштириш манбаи", get: (p) => p.funding },
];

/** Карточка бошида кўрсатиладиган майдонлар. */
const HEAD_FIELDS: InvestFieldKey[] = [
  "totalCost",
  "disbursed",
  "jobs",
  "endYear",
  "capacity",
];

export function investVM(): InvestVM {
  const items = INVEST_PROJECTS;

  const totalCost = items.reduce((a, p) => a + p.totalCost, 0);
  const disbursed = items.reduce((a, p) => a + p.disbursed, 0);

  const totals: InvestTotals = {
    count: items.length,
    totalCost,
    disbursed,
    disbursedPct: (disbursed / totalCost) * 100,
    jobs: items.reduce((a, p) => a + p.jobs, 0),
  };

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
  });

  const cost: InvestCostRow[] = items
    .map((p) => ({
      id: p.id,
      name: p.name,
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
    complete:
      typeof p.irrShare === "number" && typeof p.npv === "number" && typeof p.payback === "number",
  }));

  const ready: InvestReadyRow[] = items.map((p) => ({
    id: p.id,
    name: p.name,
    fsState: p.fsState,
    docState: FIELD_TEXT.docState(p).v,
    equipment: p.equipment,
    endYear: p.endYear,
    commissioning: FIELD_TEXT.commissioning(p).v,
  }));

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

  const usedDocStates = new Set(items.map((p) => p.docState).filter((v): v is string => v !== null));

  return {
    totals,
    progress,
    behind: progress.filter((r) => r.status === "crit"),
    cost,
    maxCost: Math.max(...items.map((p) => p.totalCost)),
    sections: SECTION_DEFS.map((s) => ({
      id: s.id,
      title: s.title,
      groups: groupBy(items, s.get),
    })),
    fin,
    finCompleteCount: fin.filter((r) => r.complete).length,
    ready,
    cards,
    constants: constantFields(items),
    emptyFields: INVEST_EMPTY_FIELDS,
    unnamedEmptyCount: INVEST_UNNAMED_EMPTY_COUNT,
    unusedDocStates: INVEST_DOC_STATES.filter((s) => !usedDocStates.has(s)),
  };
}

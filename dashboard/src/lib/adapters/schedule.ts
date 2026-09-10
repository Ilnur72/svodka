import type {
  ProjectScheduleDashboard,
  ProjectScheduleFinanceRow,
  ProjectScheduleRow,
  ProjectScheduleTaskKind,
  ProjectScheduleTaskRow,
} from "../../api/types";
import { M_UZ } from "../format";

/**
 * «Лойиҳа графиклари» — `/project-schedule/dashboard` жавобидан панел
 * кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * 5 та инвестиция лойиҳасининг Gantt-графиги (`investitsiya_va_loyihalar/`
 * папкасидаги xlsx файллари), кунлик cron билан қайта импорт қилинади.
 * Жами 669 қатор: 5 илдиз, 75 босқич, 589 иш.
 *
 * ═══ Улуш → фоиз, битта жойда ═══════════════════════════════════════════
 *
 * API'даги `progress`, `avgProgress`, `sourceProgress`, `financePercent` —
 * **улуш 0…1**. 100 га кўпайтириш фақат шу файлда бўлади, панеллар тайёр
 * фоизни олади. Float шовқини (`0.3930769… × 100 = 39.30769…`) `round1()`
 * билан тозаланади — акс ҳолда экранда «39,307692307692%» чиқарди.
 *
 * ═══ `null` нол эмас ════════════════════════════════════════════════════
 *
 * 18 қаторда (12 иш + 6 босқич) режа санаси умуман кўрсатилмаган, 2 қаторда
 * фоиз йўқ, 2 лойиҳада умумий қиймат йўқ, 3 лойиҳада молиялаштириш жадвали
 * йўқ. Ҳеч қайси бири нолга айлантирилмайди: сана йўқ иш вақт ўқида
 * чизилмайди, лекин рўйхатдан **тушиб қолмайди** — «сана кўрсатилмаган»
 * ёзуви билан ўз ўрнида туради.
 *
 * ═══ «Фарқ» устунининг иккита маъноси ═══════════════════════════════════
 *
 * `diffDays` манбада иккита турли нарсани англатади (текширилган: 639 та
 * қатордан 170 тасида `actualEnd` бор, 469 тасида йўқ):
 *
 *  - `actualEnd` бор  → `planEnd − actualEnd`: муддатдан неча кун олдин
 *    (мусбат) ёки кеч (манфий) якунлангани. 170/170 қаторда айнан шундай.
 *  - `actualEnd` йўқ  → Excel'даги тирик `TODAY()` формуласи қолдиғи, яъни
 *    оддийгина `planEnd − бугун` (468/469 қаторда айнан шундай). Бу
 *    «кечикди» дегани эмас — у ҳатто 100% бажарилган босқичларда ҳам
 *    манфий чиқади.
 *
 * Шунинг учун адаптер уни фақат `actualEnd` билан бирга ўқийди
 * (`finishedDiff`), акс ҳолда `null` беради. Муддат ўтгани ҳақидаги хабарни
 * бэкенднинг ўз `isOverdue` байроғи беради.
 *
 * ═══ `excluded` яширилмайди ═════════════════════════════════════════════
 *
 * Манбадаги «Исключить = ДА» белгиси 58 қаторда бор ва **ҳаммаси йиғма
 * қатор**: 4 та илдиз ва 54 та босқич (`kind: "task"` да битта ҳам йўқ) —
 * яъни бу ерда у «ҳисобдан чиқарилган иш» эмас, «бу қатор ишлар йиғиндиси»
 * дегани. Шунинг учун байроқ ишларда чипга айланади (агар пайдо бўлса),
 * босқич ва илдизда эса кўрсатилмайди: у ерда у янгилик эмас, шовқин.
 * Ишлар бўйича сони `excludedCount` да очиқ турибди.
 */

/** Қиймати кўрсатилмаган катак учун ягона матн. */
export const NO_DATA = "маълумот йўқ";

const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Улуш 0…1 → фоиз. `null` — фоиз кўрсатилмаган (нол эмас). */
const pctOf = (share: number | null): number | null =>
  share === null ? null : round1(share * 100);

const MS_DAY = 86_400_000;

/** `"2026-09-09"` → UTC кун рақами. Нотўғри матнда `null`. */
export function dayOf(iso: string | null): number | null {
  if (iso === null || iso.length < 10) return null;
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
  const t = Date.UTC(y, m - 1, d);
  return isFinite(t) ? t / MS_DAY : null;
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

/** Ишнинг ҳолати — бэкенддаги `completed/inProgress/notStarted` билан айнан бир хил қоида. */
export type SchedState = "done" | "run" | "todo";

/**
 * Ҳолат ранги. `--good` ва `--crit` бу ерда ҳақиқий ҳолатни билдиради
 * (бажарилган / муддати ўтган), «жараёнда» ва «бошланмаган» эса ҳолат
 * баҳоси эмас — улар нейтрал `--s1` ва `--rule` да қолади.
 */
export const SCHED_STATE_TOKEN: Record<SchedState, string> = {
  done: "var(--good)",
  run: "var(--s1)",
  todo: "var(--rule)",
};

export const SCHED_STATE_LABEL: Record<SchedState, string> = {
  done: "бажарилган",
  run: "жараёнда",
  todo: "бошланмаган",
};

/** Вақт ўқидаги битта иш чизиғи. Улуш 0…1 — жойлаштиришни компонент қилади. */
export interface SchedBar {
  /** Ўқ бошидан улуш (0…1). */
  left: number;
  /** Узунлиги улушда (0…1); бир кунлик ишда 0 бўлиши мумкин. */
  width: number;
}

export interface SchedTask {
  id: number;
  kind: ProjectScheduleTaskKind;
  no: number | null;
  name: string;
  responsible: string | null;
  start: string | null;
  end: string | null;
  days: number | null;
  /** Бажарилиш фоизи (0…100+); манбада кўрсатилмаган бўлса `null`. */
  pct: number | null;
  state: SchedState;
  overdue: boolean;
  dueSoon: boolean;
  excluded: boolean;
  note: string | null;
  actualEnd: string | null;
  /** Фақат `actualEnd` бор бўлганда: мусбат — муддатдан олдин, манфий — кечикиб. */
  finishedDiff: number | null;
  amount: number | null;
  group: string | null;
  sortOrder: number;
  /**
   * `planEnd` гача қолган кун (бугунга нисбатан): муддати ўтганда манфий.
   * Сана кўрсатилмаган бўлса `null`. Бу — `diffDays` эмас: у манбадаги
   * устун, бу эса `meta.today` дан ҳисобланган, `isOverdue` билан бир хил
   * кундан.
   */
  daysToEnd: number | null;
  /** Лойиҳа вақт ўқидаги ўрни; сана кўрсатилмаган бўлса `null`. */
  bar: SchedBar | null;
}

/** Босқич (`kind: "group"`) ва унинг остидаги ишлар. */
export interface SchedGroup {
  row: SchedTask;
  tasks: SchedTask[];
}

/** Вақт ўқи белгиси. */
export interface SchedTick {
  /** Ўқ бошидан улуш (0…1). */
  at: number;
  label: string;
}

export interface SchedAxis {
  start: string;
  end: string;
  /** Ўқ узунлиги, кун (ҳеч қачон 0 эмас). */
  days: number;
  ticks: SchedTick[];
  /** «Бугун» чизиғи — ўқдан ташқарида бўлса `null`. */
  today: number | null;
}

export interface SchedFinanceRow {
  id: number;
  category: string;
  total: number | null;
  paid: number | null;
  /** `paid / total`, фоизда; ҳисоблаб бўлмаса `null`. */
  pct: number | null;
  /** `true` — тоифа эмас, «қолган сумма» қатори. Йиғиндига кирмайди. */
  isTotal: boolean;
}

export interface SchedProject {
  id: number;
  key: string;
  title: string;
  sourceFile: string;
  sourceSheet: string;
  cost: number | null;
  /** Манбадаги илдиз қатор фоизи — ҳисобланган `avgPct` билан аралашмайди. */
  sourcePct: number | null;
  /** Ишлар бўйича ўртача бажарилиш, фоизда. */
  avgPct: number | null;
  deadline: string | null;
  totalDays: number | null;
  planStart: string | null;
  planEnd: string | null;
  daysLeft: number | null;
  taskCount: number;
  groupCount: number;
  done: number;
  run: number;
  todo: number;
  overdue: number;
  dueSoon: number;
  /** Ишлардаги «Молиявий ҳолати» йиғиндиси ($). */
  taskAmount: number;
  financeTotal: number | null;
  financePaid: number | null;
  financePct: number | null;
  /** Сана кўрсатилмаган ишлар сони. */
  noDateCount: number;
  /** «Исключить = ДА» белгиланган **ишлар** сони (йиғма қаторлар ҳисобга кирмайди). */
  excludedCount: number;
  importedAt: string | null;
  tasks: SchedTask[];
  groups: SchedGroup[];
  finance: SchedFinanceRow[];
  axis: SchedAxis;
}

export interface SchedTotals {
  projects: number;
  tasks: number;
  done: number;
  run: number;
  todo: number;
  avgPct: number | null;
  overdue: number;
  dueSoon: number;
  cost: number;
  /** Умумий қиймати кўрсатилмаган лойиҳалар сони. */
  costMissing: number;
  financeTotal: number;
  financePaid: number;
  financePct: number | null;
  planStart: string | null;
  planEnd: string | null;
  groups: number;
}

export interface SchedView {
  projects: SchedProject[];
  totals: SchedTotals;
  today: string;
  dueSoonDays: number;
  lastImportedAt: string | null;
}

/** Битта иш ва у тегишли лойиҳа — умумий рўйхатда лойиҳа номи ёнида турсин. */
export interface SchedTaskRef {
  project: SchedProject;
  task: SchedTask;
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

const stateOf = (pct: number | null): SchedState =>
  pct === null ? "todo" : pct >= 100 ? "done" : pct > 0 ? "run" : "todo";

/**
 * Вақт ўқи белгилари: ой бошлари.
 *
 * Қадам ой сонига қараб танланади — 33 ойлик лойиҳада (ТМК Chemicals) ҳар
 * ойни ёзсак ёрлиқлар бир-бирининг устига чиқиб кетарди. Ёрлиқ ҳамиша йили
 * билан (`Дек 25`): иккита йил чегарасидан ўтадиган ўқда ойнинг ўзи етарли
 * эмас.
 */
function ticksOf(a0: number, span: number, startIso: string, endIso: string): SchedTick[] {
  const y0 = Number(startIso.slice(0, 4));
  const m0 = Number(startIso.slice(5, 7)) - 1;
  const y1 = Number(endIso.slice(0, 4));
  const m1 = Number(endIso.slice(5, 7)) - 1;
  const months = (y1 - y0) * 12 + (m1 - m0) + 1;
  if (!isFinite(months) || months <= 0) return [];
  const step = months <= 15 ? 1 : months <= 40 ? 3 : 6;

  const out: SchedTick[] = [];
  for (let i = 0; i < months; i += step) {
    const y = y0 + Math.floor((m0 + i) / 12);
    const m = (m0 + i) % 12;
    const at = (Date.UTC(y, m, 1) / MS_DAY - a0) / span;
    // Биринчи ой боши ўқ бошидан олдин туриши мумкин (ой ўртасида
    // бошланган лойиҳа) — бундай белги чизилмайди.
    if (at < 0 || at > 1) continue;
    out.push({ at, label: `${(M_UZ[m] ?? "").slice(0, 3)} ${String(y).slice(2)}` });
  }
  return out;
}

/** Лойиҳанинг вақт ўқи — санаси бор **барча** қаторлар бўйича (босқич ҳам). */
function axisOf(rows: ProjectScheduleTaskRow[], today: string): SchedAxis {
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    const s = dayOf(r.planStart);
    const e = dayOf(r.planEnd);
    if (s !== null && s < lo) lo = s;
    if (e !== null && e > hi) hi = e;
    if (s !== null && s > hi) hi = s;
    if (e !== null && e < lo) lo = e;
  }
  // Ҳеч бир қаторда сана бўлмаса ўқ ясалмайди — компонент уни `days: 0` дан
  // билиб, вақт ўқисиз рўйхат чизади.
  if (!isFinite(lo) || !isFinite(hi)) {
    return { start: today, end: today, days: 0, ticks: [], today: null };
  }
  const span = Math.max(hi - lo, 1);
  const iso = (d: number): string => new Date(d * MS_DAY).toISOString().slice(0, 10);
  const t = dayOf(today);
  return {
    start: iso(lo),
    end: iso(hi),
    days: hi - lo,
    ticks: ticksOf(lo, span, iso(lo), iso(hi)),
    today: t === null || t < lo || t > hi ? null : (t - lo) / span,
  };
}

function taskOf(
  r: ProjectScheduleTaskRow,
  a0: number | null,
  span: number,
  todayDay: number | null,
): SchedTask {
  const pct = pctOf(r.progress);
  const s = dayOf(r.planStart);
  const e = dayOf(r.planEnd);
  let bar: SchedBar | null = null;
  if (a0 !== null && s !== null && e !== null) {
    const left = (s - a0) / span;
    bar = { left, width: Math.max((e - s) / span, 0) };
  }
  return {
    id: r.id,
    kind: r.kind,
    no: r.taskNo,
    name: r.name,
    responsible: r.responsible,
    start: r.planStart,
    end: r.planEnd,
    days: r.durationDays,
    pct,
    state: stateOf(pct),
    overdue: r.isOverdue,
    dueSoon: r.isDueSoon,
    excluded: r.excluded,
    note: r.note,
    actualEnd: r.actualEnd,
    // Қаранг: файл бошидаги «Фарқ устунининг иккита маъноси».
    finishedDiff: r.actualEnd === null ? null : r.diffDays,
    amount: r.amount,
    group: r.parentName,
    sortOrder: r.sortOrder,
    daysToEnd: e === null || todayDay === null ? null : e - todayDay,
    bar,
  };
}

const financeOf = (f: ProjectScheduleFinanceRow): SchedFinanceRow => ({
  id: f.id,
  category: f.category,
  total: f.totalAmount,
  paid: f.paidAmount,
  pct:
    f.totalAmount === null || f.totalAmount === 0 || f.paidAmount === null
      ? null
      : round1((f.paidAmount / f.totalAmount) * 100),
  isTotal: f.isTotal,
});

function projectOf(p: ProjectScheduleRow, today: string): SchedProject {
  const axis = axisOf(p.tasks, today);
  const a0 = axis.days === 0 ? null : dayOf(axis.start);
  const span = Math.max(axis.days, 1);
  // Жавобдаги тартиб аллақачон `sortOrder` бўйича, лекин бунга таянилмайди:
  // манбадаги иерархия айнан шу тартибда ўқилади.
  const rows = [...p.tasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const todayDay = dayOf(today);
  const tasks = rows.map((r) => taskOf(r, a0, span, todayDay));

  // Босқичлар — рўйхат тартибида, ишлар эса ўз босқичига `parentName`
  // бўйича бириктирилади. Текширилган: 589 ишнинг ҳаммасида босқич топилади
  // ва битта лойиҳа ичида босқич номи такрорланмайди.
  const groups: SchedGroup[] = [];
  const byName = new Map<string, SchedGroup>();
  for (const t of tasks) {
    if (t.kind !== "group") continue;
    const g: SchedGroup = { row: t, tasks: [] };
    groups.push(g);
    byName.set(t.name, g);
  }
  for (const t of tasks) {
    if (t.kind !== "task") continue;
    const g = t.group === null ? undefined : byName.get(t.group);
    g?.tasks.push(t);
  }

  const only = tasks.filter((t) => t.kind === "task");
  const st = p.stats;
  return {
    id: p.id,
    key: p.key,
    title: p.title,
    sourceFile: p.sourceFile,
    sourceSheet: p.sourceSheet,
    cost: p.totalCostUsd,
    sourcePct: pctOf(p.sourceProgress),
    avgPct: pctOf(st.avgProgress),
    deadline: p.deadlineDate,
    totalDays: p.totalDays,
    planStart: st.planStart,
    planEnd: st.planEnd,
    daysLeft: st.daysLeft,
    taskCount: st.taskCount,
    groupCount: st.groupCount,
    done: st.completedCount,
    run: st.inProgressCount,
    todo: st.notStartedCount,
    overdue: st.overdueCount,
    dueSoon: st.dueSoonCount,
    taskAmount: st.taskAmountTotal,
    financeTotal: st.financeTotal,
    financePaid: st.financePaid,
    financePct: pctOf(st.financePercent),
    noDateCount: only.filter((t) => t.start === null || t.end === null).length,
    excludedCount: only.filter((t) => t.excluded).length,
    importedAt: p.importedAt,
    tasks,
    groups,
    finance: [...p.finance].sort((a, b) => a.sortOrder - b.sortOrder).map(financeOf),
    axis,
  };
}

/**
 * Лойиҳалар тартиби — муддати яқинроғи юқорида (`daysLeft` ўсиш бўйича).
 * Бу `summary.nextDeadlines` даги тартиб билан бир хил, шунинг учун иккита
 * жойда иккита турли навбат кўринмайди. Муддати кўрсатилмаган лойиҳа охирда.
 */
const byDeadline = (a: SchedProject, b: SchedProject): number =>
  (a.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.daysLeft ?? Number.MAX_SAFE_INTEGER);

export function scheduleView(d: ProjectScheduleDashboard): SchedView {
  const projects = d.projects.map((p) => projectOf(p, d.meta.today)).sort(byDeadline);
  const s = d.summary;
  return {
    projects,
    totals: {
      projects: s.projectCount,
      tasks: s.taskCount,
      done: s.completedCount,
      run: s.inProgressCount,
      todo: s.notStartedCount,
      avgPct: pctOf(s.avgProgress),
      overdue: s.overdueCount,
      dueSoon: s.dueSoonCount,
      cost: s.totalCostUsd,
      costMissing: projects.filter((p) => p.cost === null).length,
      financeTotal: s.financeTotal,
      financePaid: s.financePaid,
      financePct: pctOf(s.financePercent),
      planStart: s.planStart,
      planEnd: s.planEnd,
      groups: projects.reduce((a, p) => a + p.groupCount, 0),
    },
    today: d.meta.today,
    dueSoonDays: d.meta.dueSoonDays,
    lastImportedAt: d.meta.lastImportedAt,
  };
}

/** Хэшдаги калит бўйича лойиҳа (`#schedule/tmk-chemicals-grafik`). */
export const schedProjectByKey = (
  projects: SchedProject[],
  key: string | null,
): SchedProject | null => (key === null ? null : (projects.find((p) => p.key === key) ?? null));

/* -------------------------------------------------------------------------- */
/* фильтр                                                                     */
/* -------------------------------------------------------------------------- */

export type SchedStateFilter = "all" | "overdue" | "run" | "done" | "todo";

export interface SchedFilter {
  /** Лойиҳа калити; `""` — барчаси. */
  project: string;
  state: SchedStateFilter;
  responsible: string[];
  query: string;
}

export const SCHED_FILTER_EMPTY: SchedFilter = {
  project: "",
  state: "all",
  responsible: [],
  query: "",
};

/**
 * Умумий рўйхат «Муддати ўтган» дан бошланади: 238 та кечиккан иш — бу
 * бўлимдаги энг муҳим хабар, 589 та ишнинг тўлиқ рўйхати эса уни кўмиб
 * юборарди. Фильтрни бир қадамда «Барчаси» га ўтказиш мумкин.
 */
export const SCHED_FILTER_OVERDUE: SchedFilter = { ...SCHED_FILTER_EMPTY, state: "overdue" };

export const schedFilterDirty = (f: SchedFilter, base: SchedFilter): boolean =>
  f.project !== base.project ||
  f.state !== base.state ||
  f.query.trim() !== base.query.trim() ||
  f.responsible.length !== base.responsible.length ||
  f.responsible.some((r, i) => r !== base.responsible[i]);

const matchState = (t: SchedTask, s: SchedStateFilter): boolean =>
  s === "all" ? true : s === "overdue" ? t.overdue : t.state === s;

/** Фильтр фақат ишларга (`kind: "task"`) қўлланади — босқич ва илдиз йиғма қатор. */
export function schedMatch(t: SchedTask, f: SchedFilter): boolean {
  if (!matchState(t, f.state)) return false;
  if (f.responsible.length > 0) {
    if (t.responsible === null || !f.responsible.includes(t.responsible)) return false;
  }
  const q = f.query.trim().toLowerCase();
  if (q !== "") {
    const hay = `${t.name} ${t.responsible ?? ""} ${t.group ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/**
 * Кечикиш тартиби: аввал муддати ўтганлар (энг кеч қолгани биринчи), сўнг
 * яқин 30 кунда тугайдиганлар, кейин қолгани — ҳаммаси `planEnd` бўйича.
 * Санаси кўрсатилмаган ишлар охирида.
 */
function urgency(a: SchedTask, b: SchedTask): number {
  const rank = (t: SchedTask) => (t.overdue ? 0 : t.dueSoon ? 1 : 2);
  const r = rank(a) - rank(b);
  if (r !== 0) return r;
  const ae = dayOf(a.end);
  const be = dayOf(b.end);
  if (ae === null && be === null) return a.sortOrder - b.sortOrder;
  if (ae === null) return 1;
  if (be === null) return -1;
  return ae - be;
}

/** Барча лойиҳалар бўйича фильтрланган ишлар — кечикиш тартибида. */
export function schedTaskRefs(projects: SchedProject[], f: SchedFilter): SchedTaskRef[] {
  const out: SchedTaskRef[] = [];
  for (const p of projects) {
    if (f.project !== "" && p.key !== f.project) continue;
    for (const t of p.tasks) {
      if (t.kind === "task" && schedMatch(t, f)) out.push({ project: p, task: t });
    }
  }
  return out.sort((x, y) => urgency(x.task, y.task));
}

/**
 * Битта лойиҳанинг босқичлари — фильтрдан ўтган ишлари билан.
 * Ишлари қолмаган босқич умуман чизилмайди: бўш сарлавҳа маълумот бермайди.
 */
export function schedGroups(p: SchedProject, f: SchedFilter): SchedGroup[] {
  return p.groups
    .map((g) => ({ row: g.row, tasks: g.tasks.filter((t) => schedMatch(t, f)) }))
    .filter((g) => g.tasks.length > 0);
}

/** Масъуллар рўйхати — фильтр учун, ҳар бирида нечта иш борлиги билан. */
export function schedResponsibles(
  projects: SchedProject[],
  projectKey: string,
): { key: string; label: string; count: number }[] {
  const m = new Map<string, number>();
  for (const p of projects) {
    if (projectKey !== "" && p.key !== projectKey) continue;
    for (const t of p.tasks) {
      if (t.kind !== "task" || t.responsible === null) continue;
      m.set(t.responsible, (m.get(t.responsible) ?? 0) + 1);
    }
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .map(([key, count]) => ({ key, label: key, count }));
}

/** Танланган лойиҳа (ёки барчаси) бўйича ҳолат фильтрининг сонлари. */
export function schedStateCounts(
  projects: SchedProject[],
  projectKey: string,
): Record<SchedStateFilter, number> {
  const out: Record<SchedStateFilter, number> = { all: 0, overdue: 0, run: 0, done: 0, todo: 0 };
  for (const p of projects) {
    if (projectKey !== "" && p.key !== projectKey) continue;
    for (const t of p.tasks) {
      if (t.kind !== "task") continue;
      out.all++;
      if (t.overdue) out.overdue++;
      out[t.state]++;
    }
  }
  return out;
}

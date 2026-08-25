import type {
  ChainCell,
  ChainHow,
  ChainResponse,
  ChainStep,
} from "../../api/types";
import type { Status } from "../../types";
import { statusOf } from "../format";

/**
 * «Цехлар занжири»: API жавобидан **оқим харитаси** учун view-model.
 *
 * ═══ 1. Нега `level` устунга айлантирилмайди ══════════════════════════════
 *
 * `level` — файлдаги технологик даража, **граф чуқурлиги эмас**: 38
 * боғланишнинг 20 таси битта даража ичида қолади (`nav-isxodnyy → nav-tfr`,
 * иккиси ҳам 0-даража), айримлари эса 3–4 даража сакрайди (`ing-itogo` lv0 →
 * `othod-ogarok` lv4). Даража тўғридан-тўғри устунга айлантирилса занжир
 * узилиб кўринарди — 0-даражанинг ичидаги тўрт босқичли рений занжири битта
 * устунга тиқилиб, `4 цех → 1 цех` стрелкаси эса орқага қараб қоларди.
 *
 * Шунинг учун икки нарса **қатъий ажратилган**:
 *   · **устун** (`col`) — граф топологиясидан, стрелка ҳеч қачон орқага
 *     қарамайди;
 *   · **даража** (`level`) — фильтр ва тугундаги ёрлиқ, жойлашувни ўзи
 *     белгиламайди, фақат **қуйи чегара** беради.
 *
 * ─── Устун қандай ҳисобланади ─────────────────────────────────────────────
 *
 *   col(v) = max( level(v), max( col(p) + 1 ) )      p — v нинг ота тугунлари
 *
 * Бу — «энг узун йўл» (longest-path) қатламлаши, устига даража қуйи чегара
 * қилиб қўйилгани. Иккита хосса шундан келиб чиқади:
 *
 *   1. `col(v) > col(p)` ҳар доим — **орқага қараган стрелка бўлмайди**;
 *   2. кириши аниқланмаган, лекин технологик жиҳатдан кечки босқич
 *      (`c3-karbid-volframa`, lv3 — файлда «не детализировано») биринчи
 *      устунга тушиб қолмайди, ўз даражасининг ўрнида туради.
 *
 * Соф longest-path (даража чегарасисиз) 0-устунга 17 та тугунни тиқарди;
 * даража чегараси билан энг тўлиқ устунда 10 та қолади.
 *
 * ─── Қатор (`row`) қандай ҳисобланади ─────────────────────────────────────
 *
 * Уч қадам, Sugiyama услубида, лекин ташқи кутубхонасиз:
 *   1. **барицентр** — устун ичидаги тартиб қўшнилар медианаси бўйича 6 марта
 *      (олдинга/орқага) саралаб чиқилади: кесишувлар сони шу ерда тушади;
 *   2. **слот** — ҳар бир тугун ота тугунлари қаторининг ўртачасига қўйилади,
 *      тўқнашганда пастга сурилади; сўнг иккита силлиқлаш ўтиши. Шу сабабли
 *      `Ингичка → 4 цех → WO3 → 1 цех → W-порошок` каби занжирлар **тўғри
 *      горизонтал чизиқда** қолади;
 *   3. **сиқиш** — ҳамма устунда бўш қолган қаторлар олиб ташланади. Бу
 *      монотон алмаштириш, шунинг учун тартиб ҳам, тўғриланган занжирлар ҳам
 *      бузилмайди.
 *
 * Натижа (барча даража, 2026): 10 устун × 14 қатор, **0 та кесишув**.
 *
 * ═══ 2. Кириши номаълум босқичлар ═════════════════════════════════════════
 *
 * `inputKnown: false` (6 та) — файлнинг ўзи «не детализировано» деб ёзган.
 * Бундай босқичга **кирувчи чизиқ тортилмайди** ва у граф қирраси сифатида
 * ҳам ҳисобланмайди. Иккитасида бэкенд шунга қарамай `probable` ҳавола
 * эълон қилган — у **йўқотилмайди**: чизиқ ўрнига тугуннинг «эҳтимолий
 * кириш» рўйхатига тушади (`probableInputs`).
 *
 * ═══ 3. Техник майдонлар ══════════════════════════════════════════════════
 *
 * `excelRow`, `anchor`, `cells`, `row`, `source`, `pctSource`, `balanceStepId`
 * view-model'га **умуман ўтмайди**. `note` дан фақат мавжудлик олинади.
 */

/** Фоиз ўқининг юқори чегараси — KPI ва баланс билан бир хил шкала. */
export const CHAIN_PCT_MAX = 150;

/** Ўқдаги «100%» белгисининг ўрни (устун кенглигининг фоизи). */
export const CHAIN_PCT_REF_AT = (100 / CHAIN_PCT_MAX) * 100;

/** Манбада қиймат ўрнига «—» турган устун белгиси. */
const DASH = "—";

const isDash = (s: string | null | undefined): boolean =>
  s === null || s === undefined || s.trim() === "" || s.trim() === DASH;

/** IEEE-754 шовқинини кесиш — `adapters/balance.ts` даги `clean()` билан бир хил. */
function clean(v: number | null | undefined): number | null {
  if (v === null || v === undefined || !isFinite(v)) return null;
  return Number(v.toPrecision(15));
}

/* -------------------------------------------------------------------------- */
/* даража — фильтр ва ёрлиқ                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Даражанинг **технологик босқич** сифатидаги номи.
 *
 * Манба файлда даражанинг умумлашган номи йўқ — фақат ҳар бир қаторнинг
 * «Уровень» матни бор (`levels[].stages`). Шунинг учун бу ердаги қисқа ном
 * тўқилган умумлаштириш эмас, **навигация ёрлиғи**: файлнинг ўз матни
 * ҳар доим ёнида (`stages`) кўрсатилади ва ҳеч нарса алмаштирилмайди.
 */
const LEVEL_LABEL: Record<number, string> = {
  0: "Добыча / хомашё",
  1: "Передача сырья",
  2: "Гидрометаллургия / межцех",
  3: "Асосий ишлаб чиқариш",
  4: "Склад / чиқинди",
};

/** Тугундаги кичик белги учун — жуда қисқа. */
const LEVEL_SHORT: Record<number, string> = {
  0: "хомашё",
  1: "передача",
  2: "гидромет.",
  3: "ишлаб чиқариш",
  4: "склад/чиқинди",
};

export interface ChainLevelVM {
  level: number;
  /** Технологик босқич номи — фильтр тугмаси ва сарлавҳа учун. */
  label: string;
  /** Тугун ёрлиғи учун жуда қисқа кўриниш. */
  short: string;
  /** Файлнинг ўз «Уровень» матнлари — тўқилмаган, ўзгартирилмаган. */
  stages: string[];
  count: number;
}

export const chainLevelLabel = (level: number): string =>
  LEVEL_LABEL[level] ?? `Даража ${level}`;

/* -------------------------------------------------------------------------- */
/* катак                                                                      */
/* -------------------------------------------------------------------------- */

export interface ChainCellVM {
  plan: number | null;
  fakt: number | null;
  /** Бэкенддан келган фоиз — қайта ҳисобланмайди ва текширилмайди. */
  pct: number | null;
  /** Устун учун `0…CHAIN_PCT_MAX` оралиғига келтирилган фоиз. */
  barPct: number | null;
  /** Фоиз чегарадан ошган — устун кесилади, сон тўлиқ ёзилади. */
  anomaly: boolean;
  /** Факт бор, режа қўйилмаган — бажарилиш фоизи маънога эга эмас. */
  planless: boolean;
  /** Режа ҳам, факт ҳам йўқ (нол эмас — маълумот йўқ). */
  empty: boolean;
  how: ChainHow;
}

function toCell(v: ChainCell | null | undefined): ChainCellVM | null {
  if (!v) return null;
  const plan = clean(v.plan);
  const fakt = clean(v.fakt);
  const pct = clean(v.pct);

  return {
    plan,
    fakt,
    pct,
    barPct: pct === null ? null : Math.max(0, Math.min(pct, CHAIN_PCT_MAX)),
    anomaly: pct !== null && pct > CHAIN_PCT_MAX,
    planless: pct === null && (plan === null || plan === 0) && fakt !== null,
    empty: plan === null && fakt === null,
    how: v.how,
  };
}

/* -------------------------------------------------------------------------- */
/* тугун ва қирра                                                             */
/* -------------------------------------------------------------------------- */

export interface ChainStepVM {
  id: string;
  level: number;
  /** Файлдаги «Уровень» матни — ўзгартирилмаган. */
  stage: string;
  site: string;
  input: string;
  process: string;
  output: string;
  /** «—» бўлса `null`. */
  resource: string | null;
  /** «—» бўлса `null`. */
  waste: string | null;
  unit: string;
  /** `false` — манбада режа/факт умуман юритилмайди (омбор қаторлари). */
  available: boolean;
  /** `false` — кириш файлда «не детализировано»; чизиқ тортилмайди. */
  inputKnown: boolean;
  /** Манбада чеклов қайд этилган (изоҳ матни экранга чиқмайди). */
  hasLimit: boolean;
  /** Чизилмаган, лекин бэкенд эълон қилган эҳтимолий кириш манбалари. */
  probableInputs: string[];
  /** Шу босқичга бириктирилган ресурс сарфи (занжир тугуни эмас). */
  resources: ChainStepVM[];
  cell: ChainCellVM | null;
  status: Status;
  /** Фоизи бор — рейтинг ва рангда қатнашади. */
  comparable: boolean;
}

export interface ChainEdgeVM {
  id: string;
  from: string;
  to: string;
  /**
   * `exact` — файлда алоҳида «передача» қатори бор ёки чиқиш/кириш айнан бир
   * хил номда; `probable` — файл матни боғланишни кўрсатади, лекин алоҳида
   * қатор йўқ. Хариталарда **турли чизиқ услуби** билан чизилади.
   */
  confidence: "exact" | "probable";
}

/** Тугуннинг қисқа ўқиладиган номи — рўйхатларда ва изоҳларда. */
const labelOf = (s: { site: string; output: string }): string => `${s.site} · ${s.output}`;

/* -------------------------------------------------------------------------- */
/* умумий view-model                                                          */
/* -------------------------------------------------------------------------- */

export interface ChainCounts {
  good: number;
  warn: number;
  crit: number;
  mute: number;
  total: number;
}

export interface ChainLinkCounts {
  exact: number;
  probable: number;
  /** Чизилганлари (кириши аниқланмаган тугунга кетганлари чиқарилгандан кейин). */
  drawn: number;
  /** Кириши аниқланмагани учун чизилмагани. */
  suppressed: number;
}

export interface ChainVM {
  month: string;
  reference: string;
  months: string[];
  /** 43 та босқич — оқим харитасининг тугунлари. */
  steps: ChainStepVM[];
  /** Босқичлар + ресурслар — тўлиқ жадвал учун. */
  all: ChainStepVM[];
  /** Чизиладиган боғланишлар (кириши аниқланмаганлари бу ерда йўқ). */
  edges: ChainEdgeVM[];
  levels: ChainLevelVM[];
  counts: ChainCounts;
  linkCounts: ChainLinkCounts;
  /** Кириши аниқланмаган босқичлар сони. */
  inputUnknownCount: number;
  /** Манбада режа/факт юритилмайдиган босқичлар сони. */
  unavailableCount: number;
  hasValues: boolean;
}

/** Кўрсатиладиган ой: сўралгани жавобда бўлмаса — рўйхатдаги охиргиси. */
export function chainMonth(res: ChainResponse, wanted: string | null): string {
  if (wanted && res.months.includes(wanted)) return wanted;
  return res.months[res.months.length - 1] ?? res.reference;
}

export function chainView(res: ChainResponse, month: string): ChainVM {
  const byId = new Map<string, ChainStep>(res.steps.map((s) => [s.id, s]));

  // Ресурслар занжир тугуни эмас — улар `resourceOf` орқали босқичга уланади.
  const resourcesOf = new Map<string, ChainStepVM[]>();
  const resourceList: ChainStepVM[] = [];

  // ── Боғланишлар ────────────────────────────────────────────────────────────
  // Кириши номаълум тугунга ҳавола чизилмайди ва граф қирраси ҳам бўлмайди;
  // у йўқотилмайди — мақсад тугунида «эҳтимолий кириш» бўлиб қолади.
  const edges: ChainEdgeVM[] = [];
  const probableInputsOf = new Map<string, string[]>();
  const link: ChainLinkCounts = { exact: 0, probable: 0, drawn: 0, suppressed: 0 };

  for (const s of res.steps) {
    for (const n of s.next) {
      const target = byId.get(n.id);
      if (!target) continue;
      if (n.confidence === "exact") link.exact += 1;
      else link.probable += 1;

      if (!target.inputKnown) {
        link.suppressed += 1;
        const list = probableInputsOf.get(target.id) ?? [];
        list.push(labelOf(s));
        probableInputsOf.set(target.id, list);
        continue;
      }
      edges.push({
        id: `${s.id}~${target.id}`,
        from: s.id,
        to: target.id,
        confidence: n.confidence,
      });
      link.drawn += 1;
    }
  }

  const toVM = (s: ChainStep): ChainStepVM => {
    const cell = toCell(s.values[month]);
    const comparable = cell !== null && !cell.empty && cell.pct !== null && (cell.plan ?? 0) > 0;
    return {
      id: s.id,
      level: s.level,
      stage: s.stage,
      site: s.site,
      input: s.input,
      process: s.process,
      output: s.output,
      resource: isDash(s.resource) ? null : s.resource,
      waste: isDash(s.waste) ? null : s.waste,
      unit: s.unit,
      available: s.available,
      inputKnown: s.inputKnown,
      hasLimit: s.note !== null && s.note.trim() !== "",
      probableInputs: probableInputsOf.get(s.id) ?? [],
      resources: resourcesOf.get(s.id) ?? [],
      cell,
      status: comparable ? statusOf(cell.pct) : "mute",
      comparable,
    };
  };

  for (const r of res.resources) {
    const vm = toVM(r);
    resourceList.push(vm);
    const list = resourcesOf.get(r.resourceOf) ?? [];
    list.push(vm);
    resourcesOf.set(r.resourceOf, list);
  }

  const steps = res.steps.map(toVM);

  const levels: ChainLevelVM[] = res.levels
    .slice()
    .sort((a, b) => a.level - b.level)
    .map((lv) => ({
      level: lv.level,
      label: chainLevelLabel(lv.level),
      short: LEVEL_SHORT[lv.level] ?? `${lv.level}`,
      stages: lv.stages,
      count: steps.filter((s) => s.level === lv.level).length,
    }))
    .filter((lv) => lv.count > 0);

  const all = [...steps, ...resourceList];
  const counts: ChainCounts = { good: 0, warn: 0, crit: 0, mute: 0, total: all.length };
  for (const s of all) counts[s.status] += 1;

  return {
    month,
    reference: res.reference,
    months: res.months,
    steps,
    all,
    edges,
    levels,
    counts,
    linkCounts: link,
    inputUnknownCount: steps.filter((s) => !s.inputKnown).length,
    unavailableCount: steps.filter((s) => !s.available).length,
    hasValues: all.some((s) => s.cell !== null && !s.cell.empty),
  };
}

/* -------------------------------------------------------------------------- */
/* оқим харитасининг жойлашуви                                                */
/* -------------------------------------------------------------------------- */

export interface ChainNodeVM {
  step: ChainStepVM;
  /** Топологик устун — граф чуқурлиги, даража эмас. */
  col: number;
  /** Қатор — барицентр + слот жойлаштиришдан. */
  row: number;
  /** Фильтр туфайли кўринмай қолган кирувчи боғланишлар (ўқиладиган ном). */
  hiddenIn: string[];
  /** Фильтр туфайли кўринмай қолган чиқувчи боғланишлар. */
  hiddenOut: string[];
}

/** Узун боғланишнинг оралиқ устундаги «йўлак» нуқтаси. */
export interface ChainWaypoint {
  col: number;
  row: number;
}

export interface ChainLayoutEdge extends ChainEdgeVM {
  /**
   * Оралиқ устунлардаги нуқталар (Sugiyama'нинг «сохта тугун»лари). Битта
   * устунга сакрайдиган боғланишда бўш; узунларида чизиқ шу нуқталардан
   * ўтади ва тугунлар устидан кесиб ўтмайди.
   */
  waypoints: ChainWaypoint[];
}

/**
 * Қатор нима учун ажратилган: `node` — унда ҳақиқий босқич бор, `lane` —
 * фақат узун боғланишнинг йўлаги. Йўлак қатор пастроқ бўлади, шунинг учун
 * харита бекорга чўзилмайди.
 */
export type ChainRowKind = "node" | "lane";

export interface ChainLayoutVM {
  /** `null` — барча даража битта боғланган занжирда. */
  level: number | null;
  cols: number;
  rows: number;
  /** Ҳар бир қаторнинг тури — баландлигини компонент шундан ҳисоблайди. */
  rowKinds: ChainRowKind[];
  nodes: ChainNodeVM[];
  /** Фақат иккала учи ҳам кўринадиган боғланишлар. */
  edges: ChainLayoutEdge[];
  byId: Map<string, ChainNodeVM>;
  counts: ChainCounts;
  /** Фильтр туфайли яширинган боғланишлар сони. */
  hiddenLinks: number;
  inputUnknownCount: number;
  unavailableCount: number;
}

/** Медиана — барицентр саралашда ўртачадан барқарорроқ. */
function median(v: number[]): number {
  const a = v.slice().sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;

/**
 * Оқим харитасининг жойлашуви. Соф функция: бир хил кириш — бир хил чиқиш,
 * шунинг учун `useMemo` билан хотирада сақланади.
 *
 * @param level `null` — барча даража (боғланишлар сақланади), акс ҳолда
 *              фақат шу даражанинг тугунлари ва улар орасидаги боғланишлар.
 */
export function chainLayout(vm: ChainVM, level: number | null): ChainLayoutVM {
  const steps = level === null ? vm.steps : vm.steps.filter((s) => s.level === level);
  const shown = new Set(steps.map((s) => s.id));
  const labelById = new Map(vm.steps.map((s) => [s.id, labelOf(s)]));

  const visible = vm.edges.filter((e) => shown.has(e.from) && shown.has(e.to));

  // ── Фильтр четида қолган боғланишлар — санаб кўрсатилади, йўқотилмайди ────
  const hiddenIn = new Map<string, string[]>();
  const hiddenOut = new Map<string, string[]>();
  let hiddenLinks = 0;
  for (const e of vm.edges) {
    const a = shown.has(e.from);
    const b = shown.has(e.to);
    if (a === b) continue; // иккаласи кўринади ёки иккаласи ҳам йўқ
    hiddenLinks += 1;
    if (b) {
      const list = hiddenIn.get(e.to) ?? [];
      list.push(labelById.get(e.from) ?? e.from);
      hiddenIn.set(e.to, list);
    } else {
      const list = hiddenOut.get(e.from) ?? [];
      list.push(labelById.get(e.to) ?? e.to);
      hiddenOut.set(e.from, list);
    }
  }

  // ── 1. устун: max(даража, ота + 1) ─────────────────────────────────────────
  const realInc = new Map<string, string[]>(steps.map((s) => [s.id, []]));
  for (const e of visible) realInc.get(e.to)?.push(e.from);
  const levelOf = new Map(steps.map((s) => [s.id, s.level]));

  const colOf = new Map<string, number>();
  const visiting = new Set<string>();
  const col = (id: string): number => {
    const known = colOf.get(id);
    if (known !== undefined) return known;
    const base = levelOf.get(id) ?? 0;
    // Манбада цикл бўлмаслиги керак, лекин бўлса ҳам осилиб қолмаймиз.
    if (visiting.has(id)) return base;
    visiting.add(id);
    let d = base;
    for (const p of realInc.get(id) ?? []) d = Math.max(d, col(p) + 1);
    visiting.delete(id);
    colOf.set(id, d);
    return d;
  };
  for (const s of steps) col(s.id);

  // Бўш устунлар олиб ташланади: фильтрда даража 3 бўлса, харита 0 дан бошланади.
  const usedCols = [...new Set(steps.map((s) => colOf.get(s.id) as number))].sort((a, b) => a - b);
  const colMap = new Map(usedCols.map((c, i) => [c, i]));
  for (const s of steps) colOf.set(s.id, colMap.get(colOf.get(s.id) as number) as number);
  const nCol = usedCols.length;

  // ── 2. сохта тугунлар: узун боғланиш ҳар бир оралиқ устунда жой эгаллайди ──
  // Буларсиз `ing-itogo → othod-ogarok` (3 устун) каби чизиқлар оралиқдаги
  // тугунларнинг устидан кесиб ўтарди.
  const vcol = new Map<string, number>(steps.map((s) => [s.id, colOf.get(s.id) as number]));
  const inc = new Map<string, string[]>(steps.map((s) => [s.id, []]));
  const out = new Map<string, string[]>(steps.map((s) => [s.id, []]));
  const chainOf = new Map<string, string[]>(); // боғланиш → сохта тугунлар кетма-кетлиги

  const link = (a: string, b: string): void => {
    out.get(a)?.push(b);
    inc.get(b)?.push(a);
  };
  const addVertex = (id: string, c: number): void => {
    vcol.set(id, c);
    inc.set(id, []);
    out.set(id, []);
  };

  for (const e of visible) {
    const ca = colOf.get(e.from) as number;
    const cb = colOf.get(e.to) as number;
    if (cb - ca <= 1) {
      link(e.from, e.to);
      chainOf.set(e.id, []);
      continue;
    }
    const mids: string[] = [];
    let prev = e.from;
    for (let c = ca + 1; c < cb; c++) {
      const d = `§${e.id}§${c}`;
      addVertex(d, c);
      link(prev, d);
      mids.push(d);
      prev = d;
    }
    link(prev, e.to);
    chainOf.set(e.id, mids);
  }

  // ── 3. устун ичидаги тартиб: барицентр ─────────────────────────────────────
  const cols: string[][] = Array.from({ length: nCol }, () => []);
  for (const [id, c] of vcol) cols[c].push(id);
  const order = new Map<string, number>();
  cols.forEach((c) => c.forEach((id, i) => order.set(id, i)));

  const bary = (id: string, side: "in" | "out"): number | null => {
    const nb = (side === "in" ? inc.get(id) : out.get(id)) ?? [];
    if (nb.length === 0) return null;
    return median(nb.map((x) => order.get(x) ?? 0));
  };

  for (let pass = 0; pass < 6; pass++) {
    const forward = pass % 2 === 0;
    const idx = [...cols.keys()];
    for (const ci of forward ? idx : idx.reverse()) {
      const keyed = cols[ci].map((id, i) => ({ id, b: bary(id, forward ? "in" : "out"), i }));
      keyed.sort((a, b) => (a.b ?? a.i) - (b.b ?? b.i) || a.i - b.i);
      cols[ci] = keyed.map((k) => k.id);
      cols[ci].forEach((id, i) => order.set(id, i));
    }
  }

  // ── 4. слот: ота тугунлар ўртачасига, тўқнашганда пастга ───────────────────
  const slot = new Map<string, number>();
  const place = (ci: number, want: (id: string) => number): void => {
    let prev = Number.NEGATIVE_INFINITY;
    for (const id of cols[ci]) {
      const s = Math.max(Math.round(want(id)), prev + 1);
      slot.set(id, s);
      prev = s;
    }
  };

  for (let ci = 0; ci < nCol; ci++) {
    place(ci, (id) => {
      const ps = (inc.get(id) ?? [])
        .map((p) => slot.get(p))
        .filter((v): v is number => v !== undefined);
      return ps.length ? mean(ps) : (order.get(id) ?? 0);
    });
  }

  // Икки силлиқлаш ўтиши: аввал болалар томон, сўнг оталар томон. Ҳар қадамда
  // силжиш ±4 қатор билан чегараланади — акс ҳолда узун сакровчи боғланиш
  // бутун устунни тортиб кетарди.
  const LIMIT = 4;
  for (let pass = 0; pass < 2; pass++) {
    for (let ci = nCol - 2; ci >= 0; ci--) {
      place(ci, (id) => {
        const now = slot.get(id) as number;
        const cs = (out.get(id) ?? [])
          .map((c) => slot.get(c))
          .filter((v): v is number => v !== undefined);
        return cs.length ? Math.min(mean(cs), now + LIMIT) : now;
      });
    }
    for (let ci = 1; ci < nCol; ci++) {
      place(ci, (id) => {
        const now = slot.get(id) as number;
        const ps = (inc.get(id) ?? [])
          .map((p) => slot.get(p))
          .filter((v): v is number => v !== undefined);
        return ps.length ? Math.max(mean(ps), now - LIMIT) : now;
      });
    }
  }

  // ── 5. ҳамма устунда бўш қолган қаторларни олиб ташлаш ─────────────────────
  const usedRows = [...new Set([...slot.values()])].sort((a, b) => a - b);
  const rowMap = new Map(usedRows.map((r, i) => [r, i]));
  const realRows = new Set(steps.map((s) => rowMap.get(slot.get(s.id) as number) as number));
  const rowKinds: ChainRowKind[] = usedRows.map((_, i) => (realRows.has(i) ? "node" : "lane"));

  const nodes: ChainNodeVM[] = steps.map((s) => ({
    step: s,
    col: colOf.get(s.id) as number,
    row: rowMap.get(slot.get(s.id) as number) as number,
    hiddenIn: hiddenIn.get(s.id) ?? [],
    hiddenOut: hiddenOut.get(s.id) ?? [],
  }));

  const edges: ChainLayoutEdge[] = visible.map((e) => ({
    ...e,
    waypoints: (chainOf.get(e.id) ?? []).map((d) => ({
      col: vcol.get(d) as number,
      row: rowMap.get(slot.get(d) as number) as number,
    })),
  }));

  const counts: ChainCounts = { good: 0, warn: 0, crit: 0, mute: 0, total: steps.length };
  for (const s of steps) counts[s.status] += 1;

  return {
    level,
    cols: nCol,
    rows: usedRows.length,
    rowKinds,
    nodes,
    edges,
    byId: new Map(nodes.map((n) => [n.step.id, n])),
    counts,
    hiddenLinks,
    inputUnknownCount: steps.filter((s) => !s.inputKnown).length,
    unavailableCount: steps.filter((s) => !s.available).length,
  };
}


/** Босқич нима учун баҳоланмаганини қисқа ўзбекча изоҳ билан беради. */
export function chainWhyMute(s: ChainStepVM): string | null {
  if (!s.available) return "манбада режа ва факт юритилмайди";
  if (!s.cell) return "босқич манба варағида топилмади";
  if (s.cell.empty) return "бу ой учун маълумот йўқ";
  if (s.cell.how === "aggregate" || s.cell.how === "meter") {
    return s.cell.planless ? "режа юритилмайди — фақат факт" : null;
  }
  if (s.cell.planless) return "режа қўйилмаган";
  return null;
}

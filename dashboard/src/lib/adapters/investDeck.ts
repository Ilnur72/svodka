import type {
  InvestDeckClusterStat,
  InvestDeckDashboard,
  InvestDeckProjectDetail,
  InvestDeckProjectRow,
  InvestDeckSourceKey,
} from "../../api/types";

/**
 * «Инвестиция дастури 2026–2030» — `/invest-deck/*` жавобидан панел
 * кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * «Инв. лойиҳалар 2026-2030» тақдимоти, 03.08.2026 ҳолатига — 88 та
 * инвестиция лойиҳаси ва 4 та филиал йиғмаси. Бу вақт қатори эмас, битта
 * ҳужжатнинг қотирилган ҳолати, шунинг учун бўлим давр танлагичига
 * боғланмаган.
 *
 * ═══ Йиғма қатор йиғиндига кирмайди ═════════════════════════════════════
 *
 * `kind: "branch"` — технопарк филиали бўйича **йиғма** слайд: ундаги молия
 * жадвали ўша филиалдаги лойиҳаларнинг суммаси. Бу `production-report` даги
 * `isTotal` билан айнан бир хил ҳолат, шунинг учун бир хил муомала: у
 * лойиҳалар рўйхатига аралаштирилмайди, ҳеч қандай йиғиндига қўшилмайди ва
 * экранда алоҳида блокда, «йиғма» деб ёзилган ҳолда кўрсатилади.
 *
 * ═══ `null` нол эмас ════════════════════════════════════════════════════
 *
 * Манбада катак тўлдирилмаган жойда бэкенд `null` беради. Бу ерда у **нолга
 * айлантирилмайди**: 88 лойиҳадан IRR фақат 34 тасида, NPV 33, ROI 34,
 * йиллар жадвали эса 37 тасида кўрсатилган. `counts` майдони айнан шунинг
 * учун бор — «блок бўш» билан «блок умуман йўқ» ни ажратади.
 *
 * ═══ Иккита жами ════════════════════════════════════════════════════════
 *
 * Слайдда молия жадвалининг «Жами:» қатори бор ва у манба қаторларидан
 * АЛОҲИДА сақланади (`financeTotalMlnUsd`). Шунинг учун иккита жами бор:
 * лойиҳаларнинг ўз «Жами:» ларининг йиғиндиси ва манбалар бўйича
 * йиғинди. Улар манбада ҳар доим ҳам тенг эмас — фарқ **яширилмайди**,
 * `financeGap` сифатида ҳисобланиб экранда очиқ ёзилади.
 */

/** Қиймати кўрсатилмаган катак учун ягона матн — бўлим бўйлаб бир хил. */
export const NO_DATA = "маълумот йўқ";

/**
 * Молиялаштириш манбаининг ранги.
 *
 * Ранг бутун бўлим бўйлаб битта: улуш диаграммасида ҳам, тафсилот ойнасидаги
 * молия қаторида ҳам. Калит бўйича боғланади (ёрлиқ бўйича эмас — манбада
 * битта манба турлича ёзилган). `other` нейтрал: у «манба» эмас, «қолгани».
 */
export const DECK_SOURCE_TOKEN: Record<InvestDeckSourceKey, string> = {
  uztmk: "var(--s1)",
  uzttj: "var(--s2)",
  attracted: "var(--s3)",
  partner: "var(--s4)",
  credit: "var(--s6)",
  other: "var(--ink-3)",
};

/* -------------------------------------------------------------------------- */
/* ёрдамчилар                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Йиғинди, лекин «биронта қиймат йўқ» ҳолати нолдан ажратилади: бирорта ҳам
 * сон бўлмаса `null` қайтади. Бэкенддаги `sumOrNull` билан бир хил мантиқ —
 * «0 млн $» билан «кўрсатилмаган» экранда бир хил кўринмаслиги учун.
 */
function sumOrNull(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  // Сузувчи нуқта шовқини йиғилиб кетмасин (0.1+0.2) — 2 хонада қотирилади.
  return Number(nums.reduce((s, v) => s + v, 0).toFixed(2));
}

/** Кластер + филиал жуфтининг барқарор калити. */
const clusterKeyOf = (name: string, branch: string | null): string =>
  `${name}||${branch ?? ""}`;

/**
 * Йил сарлавҳасидаги биринчи сон: `"2027"` → 2027, `"2029-2030"` → 2029.
 * Сон топилмаса `null` — бундай устун жадвал охирида, манба тартибида қолади.
 */
function yearStart(year: string): number | null {
  const m = year.match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

/** Слайдда қайси блок борлиги — `counts` нинг ўқиладиган шакли. */
export interface DeckHas {
  works: boolean;
  finance: boolean;
  kpis: boolean;
  years: boolean;
}

export interface DeckProject {
  id: number;
  slideNo: number;
  /** `true` — лойиҳа эмас, филиал бўйича йиғма слайд. */
  isBranchTotal: boolean;
  title: string;
  cluster: string;
  branch: string | null;
  /** Кластер + филиал жуфтининг калити — фильтр ва гуруҳлаш учун. */
  clusterKey: string;
  /** Экранда кўрсатиш учун: «ВОЛЬФРАМ КЛАСТЕРИ · Чирчиқ филиали». */
  clusterLabel: string;
  /** Манбадаги ёзув («200,0 млн. АҚШ доллари») — сон эмас. */
  financeText: string | null;
  /** Млн АҚШ доллари. Кўрсатилмаган бўлса `null`. */
  finance: number | null;
  irrText: string | null;
  irr: number | null;
  npvText: string | null;
  npv: number | null;
  roiText: string | null;
  roi: number | null;
  has: DeckHas;
  counts: { works: number; finance: number; kpis: number; years: number };
  /** Қидирув учун кичик ҳарфли ўзак: ном + кластер. */
  haystack: string;
}

/** Битта филиал қатори — кластер картасининг ичида. */
export interface DeckBranch {
  key: string;
  branch: string;
  projects: number;
  finance: number | null;
}

/** Кластер — филиаллари битта қаторга йиғилган ҳолда. */
export interface DeckCluster {
  key: string;
  name: string;
  projects: number;
  finance: number | null;
  /** Бўш массив — бу кластер филиалларга бўлинмаган. */
  branches: DeckBranch[];
}

export interface DeckSource {
  key: InvestDeckSourceKey;
  label: string;
  /** Млн АҚШ доллари; биронта қаторда ҳам сон бўлмаса `null`. */
  total: number | null;
  /** Шу манба нечта молия қаторида учраган. */
  count: number;
  color: string;
}

export interface DeckFacet {
  key: string;
  label: string;
  count: number;
}

/** Нечта лойиҳада кўрсаткич кўрсатилган — «маълумот тўлиқлиги» блоки учун. */
export interface DeckFilled {
  key: string;
  label: string;
  filled: number;
  total: number;
}

export interface DeckView {
  totals: {
    projects: number;
    clusters: number;
    /** Лойиҳаларнинг «Жами:» қаторлари йиғиндиси, млн $. */
    finance: number | null;
  };
  clusters: DeckCluster[];
  sources: DeckSource[];
  /** Молия қаторлари бўйича йиғинди — `totals.finance` дан фарқ қилиши мумкин. */
  sourcesTotal: number | null;
  /**
   * `totals.finance − sourcesTotal`. Иккиси ҳам маълум ва фарқ сезиларли
   * бўлсагина сон, акс ҳолда `null`. Манбадаги ҳақиқий номувофиқлик —
   * тузатилмайди, экранда очиқ ёзилади.
   */
  financeGap: number | null;
  /** Фақат ҳақиқий лойиҳалар (`kind: "project"`). */
  projects: DeckProject[];
  /** Филиал йиғмалари — рўйхатда алоҳида, йиғиндиларга кирмайди. */
  branchTotals: DeckProject[];
  /** Рўйхат ва тафсилот бўйича қидириш учун — иккала тур ҳам. */
  all: DeckProject[];
  facets: { clusters: DeckFacet[] };
  filled: DeckFilled[];
  asOf: string;
  source: string;
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

function toProject(r: InvestDeckProjectRow): DeckProject {
  const branch = r.clusterBranch;
  return {
    id: r.id,
    slideNo: r.slideNo,
    isBranchTotal: r.kind === "branch",
    title: r.title,
    cluster: r.clusterName,
    branch,
    clusterKey: clusterKeyOf(r.clusterName, branch),
    clusterLabel: branch ? `${r.clusterName} · ${branch} филиали` : r.clusterName,
    financeText: r.financeTotalText,
    finance: r.financeTotalMlnUsd,
    irrText: r.irrText,
    irr: r.irrPercent,
    npvText: r.npvText,
    npv: r.npvMlnUsd,
    roiText: r.roiText,
    roi: r.roiYears,
    has: {
      works: r.counts.works > 0,
      finance: r.counts.finance > 0,
      kpis: r.counts.kpis > 0,
      years: r.counts.yearValues > 0,
    },
    counts: {
      works: r.counts.works,
      finance: r.counts.finance,
      kpis: r.counts.kpis,
      years: r.counts.yearValues,
    },
    haystack: `${r.title} ${r.clusterName} ${branch ?? ""}`.toLocaleLowerCase(),
  };
}

/**
 * Кластер қаторларини битта номга йиғади.
 *
 * Бэкенд уларни `name + branch` жуфти бўйича беради (15 қатор, 12 кластер) —
 * филиални ажратиб кўрсатиш учун. Панелда эса аввал кластер, ичида филиал
 * кўринади, шунинг учун бу ерда номи бўйича бирлаштирилади. Тартиб —
 * лойиҳалар сони камайиши бўйича (бэкенддагидек), тенгликда ном бўйича.
 */
function buildClusters(rows: InvestDeckClusterStat[]): DeckCluster[] {
  const map = new Map<string, DeckCluster & { financeParts: Array<number | null> }>();

  for (const r of rows) {
    const entry =
      map.get(r.name) ??
      ({
        key: r.name,
        name: r.name,
        projects: 0,
        finance: null,
        branches: [],
        financeParts: [],
      } as DeckCluster & { financeParts: Array<number | null> });

    entry.projects += r.projects;
    entry.financeParts.push(r.financeMlnUsd);
    if (r.branch !== null) {
      entry.branches.push({
        key: clusterKeyOf(r.name, r.branch),
        branch: r.branch,
        projects: r.projects,
        finance: r.financeMlnUsd,
      });
    }
    map.set(r.name, entry);
  }

  return [...map.values()]
    .map(({ financeParts, ...c }) => ({
      ...c,
      finance: sumOrNull(financeParts),
      branches: [...c.branches].sort(
        (a, b) => b.projects - a.projects || a.branch.localeCompare(b.branch),
      ),
    }))
    .sort((a, b) => b.projects - a.projects || a.name.localeCompare(b.name));
}

export function investDeckView(d: InvestDeckDashboard): DeckView {
  const all = d.projects.map(toProject);
  const projects = all.filter((p) => !p.isBranchTotal);
  const branchTotals = all.filter((p) => p.isBranchTotal);

  // `count === 0` бўлган манба чизилмайди: у бўш устун/сегмент бўлиб, ҳеч
  // қандай маълумот бермасди. Тартиб — ҳажми камайиши бўйича, суммаси
  // кўрсатилмаганлари охирида.
  const sources: DeckSource[] = d.byFinanceSource
    .filter((s) => s.count > 0)
    .map((s) => ({
      key: s.sourceKey,
      label: s.label,
      total: s.totalMlnUsd,
      count: s.count,
      color: DECK_SOURCE_TOKEN[s.sourceKey],
    }))
    .sort((a, b) => (b.total ?? -1) - (a.total ?? -1));

  const sourcesTotal = sumOrNull(sources.map((s) => s.total));
  const totalFinance = d.totals.financeTotalMlnUsd;
  const rawGap =
    totalFinance === null || sourcesTotal === null ? null : totalFinance - sourcesTotal;
  // 0,01 млн $ дан кичик фарқ — яхлитлаш қолдиғи, хабар эмас.
  const financeGap = rawGap === null || Math.abs(rawGap) < 0.01 ? null : Number(rawGap.toFixed(2));

  const clusters = buildClusters(d.byCluster);

  const facets: DeckFacet[] = clusters.map((c) => ({
    key: c.key,
    label: c.name,
    count: c.projects,
  }));

  const n = projects.length;
  const count = (fn: (p: DeckProject) => boolean): number => projects.filter(fn).length;
  const filled: DeckFilled[] = [
    { key: "finance", label: "Молия жадвали", filled: count((p) => p.has.finance), total: n },
    { key: "works", label: "Бажариладиган ишлар", filled: count((p) => p.has.works), total: n },
    { key: "kpis", label: "Кутилаётган натижа", filled: count((p) => p.has.kpis), total: n },
    { key: "years", label: "Йиллар жадвали", filled: count((p) => p.has.years), total: n },
    { key: "irr", label: "IRR", filled: count((p) => p.irr !== null), total: n },
    { key: "npv", label: "NPV", filled: count((p) => p.npv !== null), total: n },
    { key: "roi", label: "ROI", filled: count((p) => p.roi !== null), total: n },
  ];

  return {
    totals: {
      projects: d.totals.projects,
      clusters: d.totals.clusters,
      finance: totalFinance,
    },
    clusters,
    sources,
    sourcesTotal,
    financeGap,
    projects,
    branchTotals,
    all,
    facets: { clusters: facets },
    filled,
    asOf: d.meta.asOf,
    source: d.meta.source,
  };
}

/* -------------------------------------------------------------------------- */
/* фильтр                                                                     */
/* -------------------------------------------------------------------------- */

export interface DeckFilter {
  /** Кластер номлари; бўш массив — барчаси. */
  clusters: string[];
  query: string;
}

export const DECK_FILTER_EMPTY: DeckFilter = { clusters: [], query: "" };

export const deckFilterDirty = (f: DeckFilter): boolean =>
  f.clusters.length > 0 || f.query.trim() !== "";

export function deckFilter(projects: DeckProject[], f: DeckFilter): DeckProject[] {
  const q = f.query.trim().toLocaleLowerCase();
  const picked = new Set(f.clusters);
  return projects.filter((p) => {
    if (picked.size > 0 && !picked.has(p.cluster)) return false;
    if (q !== "" && !p.haystack.includes(q)) return false;
    return true;
  });
}

/**
 * Хэшнинг иккинчи сегментидан слайдни топиш (`#investdeck/42`).
 *
 * Сон бўлмаган ёки рўйхатда йўқ қиймат учун `null` — шунда эскирган ҳавола
 * сервергача бормайди ва 404 га айланмайди, панел уни жимгина тозалайди.
 */
export function deckBySlide(all: DeckProject[], sub: string | null): DeckProject | null {
  if (sub === null) return null;
  const no = Number(sub);
  if (!Number.isInteger(no)) return null;
  return all.find((p) => p.slideNo === no) ?? null;
}

/* -------------------------------------------------------------------------- */
/* тафсилот                                                                   */
/* -------------------------------------------------------------------------- */

export interface DeckWork {
  id: number;
  task: string;
  term: string | null;
}

export interface DeckKpi {
  id: number;
  no: number;
  label: string;
  value: string;
}

export interface DeckFinanceLine {
  id: number;
  label: string;
  sourceKey: InvestDeckSourceKey;
  color: string;
  text: string | null;
  value: number | null;
}

/** Бурилган жадвалнинг битта катаги. `null` — манбада бу катак бўш эди. */
export interface DeckYearCell {
  text: string;
  num: number | null;
}

export interface DeckYearRow {
  metric: string;
  cells: (DeckYearCell | null)[];
}

export interface DeckYearTable {
  /** Устун сарлавҳалари — йиллар, ўсиш бўйича. */
  years: string[];
  rows: DeckYearRow[];
}

export interface DeckDetail {
  project: DeckProject;
  works: DeckWork[];
  finance: DeckFinanceLine[];
  /** Молия қаторлари йиғиндиси — слайддаги «Жами:» дан фарқ қилиши мумкин. */
  financeSum: number | null;
  /** `project.finance − financeSum`; фарқ сезилмаса `null`. */
  financeGap: number | null;
  kpis: DeckKpi[];
  years: DeckYearTable | null;
  prev: number | null;
  next: number | null;
  /** Манбада умуман бўлмаган блоклар номи — экранда очиқ ёзиш учун. */
  missing: string[];
}

/**
 * «Йиллар» жадвалини узун (long) шаклдан бурилган кўринишга келтиради.
 *
 * API `{metric, year, value}` қаторларини беради — бу жадвалнинг сатрма-сатр
 * ўқилиши. Бўш катак умуман келмайди, шунинг учун бурилгандан кейин тешик
 * қолади: у **нолга айлантирилмайди**, `null` бўлиб қолади ва экранда «—»
 * билан чизилади.
 *
 * Сатр тартиби — манбадаги биринчи учраш тартиби (`sortOrder`). Устун тартиби
 * эса йилнинг ўзи бўйича ўсиш: манба тартибига таяниб бўлмайди, чунки
 * биринчи сатрда тушиб қолган йил кейинги сатрда биринчи марта учраши мумкин.
 */
function pivotYears(rows: InvestDeckProjectDetail["years"]): DeckYearTable | null {
  if (rows.length === 0) return null;

  const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);

  const yearSeen = new Map<string, number>();
  const metricOrder: string[] = [];
  const cells = new Map<string, DeckYearCell>();

  for (const r of ordered) {
    if (!yearSeen.has(r.year)) yearSeen.set(r.year, yearSeen.size);
    if (!metricOrder.includes(r.metric)) metricOrder.push(r.metric);
    const k = `${r.metric}||${r.year}`;
    // Биринчи учраган қиймат сақланади: манбада битта катак икки марта
    // учрамайди, лекин учраб қолса ҳам ўқиш тартиби бузилмаслиги керак.
    if (!cells.has(k)) cells.set(k, { text: r.valueText, num: r.valueNum });
  }

  const years = [...yearSeen.keys()].sort((a, b) => {
    const na = yearStart(a);
    const nb = yearStart(b);
    if (na !== null && nb !== null) return na - nb || a.localeCompare(b);
    // Йили ўқилмаган устун охирида, манбадаги тартибида қолади.
    if (na === null && nb === null) return (yearSeen.get(a) ?? 0) - (yearSeen.get(b) ?? 0);
    return na === null ? 1 : -1;
  });

  return {
    years,
    rows: metricOrder.map((metric) => ({
      metric,
      cells: years.map((y) => cells.get(`${metric}||${y}`) ?? null),
    })),
  };
}

export function deckDetailView(d: InvestDeckProjectDetail): DeckDetail {
  const project = toProject(d);

  const finance: DeckFinanceLine[] = d.finance.map((f) => ({
    id: f.id,
    label: f.label,
    sourceKey: f.sourceKey,
    color: DECK_SOURCE_TOKEN[f.sourceKey],
    text: f.valueText,
    value: f.valueMlnUsd,
  }));

  const financeSum = sumOrNull(finance.map((f) => f.value));
  const rawGap =
    project.finance === null || financeSum === null ? null : project.finance - financeSum;
  const financeGap =
    rawGap === null || Math.abs(rawGap) < 0.01 ? null : Number(rawGap.toFixed(2));

  const years = pivotYears(d.years);

  // Слайдда умуман бўлмаган блоклар рўйхати: «бўш жадвал» билан «жадвал йўқ»
  // экранда аралашмаслиги учун иккинчиси очиқ ёзилади.
  const missing: string[] = [];
  if (finance.length === 0) missing.push("молия жадвали");
  if (d.works.length === 0) missing.push("бажариладиган ишлар");
  if (d.kpis.length === 0) missing.push("кутилаётган натижа");
  if (years === null) missing.push("йиллар жадвали");

  return {
    project,
    works: d.works
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((w) => ({ id: w.id, task: w.task, term: w.term })),
    finance,
    financeSum,
    financeGap,
    kpis: d.kpis
      .slice()
      .sort((a, b) => a.no - b.no)
      .map((k) => ({ id: k.id, no: k.no, label: k.label, value: k.valueText })),
    years,
    prev: d.neighbors.prev,
    next: d.neighbors.next,
    missing,
  };
}

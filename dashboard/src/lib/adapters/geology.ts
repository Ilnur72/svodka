import type {
  GeologyCountItem,
  GeologyDashboard,
  GeologyProjectRow,
  GeologyVolumeRow,
  GeologyYearCountItem,
} from "../../api/types";
import { M_UZ } from "../format";

/**
 * «Геология лойиҳалари» — `/geology-projects/dashboard` жавобидан панел
 * кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * Геология бошқармасининг «Шакллантирилаётган ва бошқарилаётган лойиҳалар»
 * тақдимоти, 14.04.2026 ҳолатига — 46 та геология-қидирув лойиҳаси. Бу вақт
 * қатори эмас, битта ҳужжатнинг қотирилган ҳолати, шунинг учун бўлим давр
 * танлагичига боғланмаган.
 *
 * ═══ `null` нол эмас ════════════════════════════════════════════════════
 *
 * Манбада катак тўлдирилмаган жойда бэкенд `null` беради. Бу ерда у **нолга
 * айлантирилмайди**: 9 та лойиҳада қиймат, 10 тасида тугаш йили, 5 тасида
 * ҳудуд, 31 тасида ҳажм, 10 тасида иш режаси кўрсатилмаган. Ҳар бир жойда
 * фарқ сақланади — «0 млн $» билан «қиймати кўрсатилмаган» бир хил эмас.
 *
 * ═══ Фоиз ҳисобланмайди ═════════════════════════════════════════════════
 *
 * Ҳажм бўйича бажарилиш фоизини **бэкенд** беради (1 хона аниқликда) ва у
 * ерда учта ҳолат учун `null` қайтади: режа йўқ, режа 0, ёки бажарилгани
 * кўрсатилмаган. Шу сабабли ҳажм фоизлари бу ерда қайта ҳисобланмайди — акс
 * ҳолда «0%» деб кўрсатиб, «ҳисобот берилмаган» ҳолатини «ҳеч нарса
 * қилинмаган» билан алмаштириб қўйган бўлардик. Ҳажм йиғиндилари ҳам
 * бэкенддан келади.
 *
 * ЯГОНА истисно — `progress`: иш режаси бўйича бажарилиш (`Бажарилди`
 * ишлари / жами ишлар). Бу сон манбада ҳам, API'да ҳам йўқ, шунинг учун
 * шу ерда саналади ва `round1()` билан float шовқинидан тозаланади. У
 * **ҳажм фоизи эмас**: бошқа ўлчов, шунинг учун экранда ҳам ёнма-ён эмас,
 * ўз ёрлиғи билан («иш режаси бўйича») кўрсатилади.
 *
 * ═══ Ўлчов бирликлари аралашмайди ═══════════════════════════════════════
 *
 * Бурғилаш — п.м, намуналаш — дона, канава — м³, лаборатория — дона. Учта
 * турли бирлик битта шкалага қўйилмайди: ҳар бири ўз карточкасида, ўз
 * бирлиги билан чиқади.
 */

/** Қиймати кўрсатилмаган катак учун ягона матн. */
export const NO_DATA = "маълумот йўқ";

/** Манбадаги гуруҳ номлари — ранг ва фильтр шу иккитага боғланади. */
const GROUP_MANAGED = "Бошқарилаётган";
const GROUP_FORMING = "Шакллантирилаётган";

export type GeoGroupKey = "managed" | "forming" | "other";

/**
 * Гуруҳ ранги бутун панел бўйлаб битта: плитка, кесим диаграммаси, карточка
 * чизиғи ва чипи. Ном бўйича мослаштирилади — `groupNo` нинг қайси гуруҳга
 * тегишли экани манба тартибига боғлиқ ва ўзгариши мумкин.
 */
export const GEO_GROUP_TOKEN: Record<GeoGroupKey, string> = {
  managed: "var(--s1)",
  forming: "var(--s2)",
  other: "var(--ink-3)",
};

const groupKeyOf = (name: string): GeoGroupKey =>
  name === GROUP_MANAGED ? "managed" : name === GROUP_FORMING ? "forming" : "other";

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface GeoWork {
  id: number;
  work: string;
  /** «Июнь 2026» — `year`/`month` дан кирилл ёрлиқ. */
  deadline: string;
  /** `Бажарилди` бўлса `true` — карточкада яшил белги. */
  done: boolean;
  status: string;
}

export type GeoVolumeKey = "drill" | "sample" | "trench";

export interface GeoVolumeMetric {
  key: GeoVolumeKey;
  label: string;
  unit: string;
  plan: number | null;
  done: number | null;
  /** Бэкенд ҳисоблаган фоиз. `null` — режа йўқ ёки ҳисобот берилмаган. */
  pct: number | null;
  /** Режа бор, лекин бажарилгани умуман кўрсатилмаган — «0%» эмас. */
  noReport: boolean;
  /** Фоиз 100 дан юқори — манбадаги ҳақиқий сон, кесиб ташланмайди. */
  over: boolean;
}

export interface GeoVolume {
  metrics: GeoVolumeMetric[];
  labPlan: number | null;
  budget: number | null;
}

/**
 * Иш режаси бўйича бажарилиш. Иш кўрсатилмаган лойиҳада бу умуман бўлмайди
 * (`null`) — «0%» эмас: режаси йўқ лойиҳа «ҳеч нарса қилмаган» дегани эмас.
 */
export interface GeoWorkProgress {
  total: number;
  done: number;
  /** 0–100, бир хона аниқликда. */
  pct: number;
}

export interface GeoProject {
  id: number;
  no: number;
  group: string;
  groupKey: GeoGroupKey;
  name: string;
  shortName: string;
  category: string;
  direction: string;
  region: string | null;
  district: string | null;
  mineral: string;
  metals: string | null;
  /**
   * `metals` дан ажратилган рўйхат. Манбада бу вергул билан ёзилган матн
   * («Вольфрам, Қалай»), шунинг учун фильтр учун бўлакларга ажратилади.
   * Бўш массив — қиймат кўрсатилмаган (`null` ёки «—»).
   */
  metalList: string[];
  oreReserve: string | null;
  metalReserve: string | null;
  cost: number | null;
  funding: string | null;
  endYear: number | null;
  partner: string | null;
  plan2026: string | null;
  done2026: string | null;
  result: string | null;
  note: string | null;
  works: GeoWork[];
  /** Иш режаси бўйича бажарилиш; иш кўрсатилмаган лойиҳада `null`. */
  progress: GeoWorkProgress | null;
  volume: GeoVolume | null;
  /** Қидирув учун кичик ҳарфли ўзак — ном ва қисқа ном. */
  haystack: string;
}

/** Кесим диаграммаси учун қатор. `muted` — манбада кўрсатилмаган гуруҳ. */
export interface GeoSlice {
  key: string;
  name: string;
  value: number;
  muted: boolean;
}

/** Металл фильтрининг битта варианти — ёрлиқ ва нечта лойиҳада учраши. */
export interface GeoMetalFacet {
  key: string;
  label: string;
  count: number;
  /** Элемент эмас, манбадаги гуруҳ номи — рўйхат охирида туради. */
  collective: boolean;
}

export interface GeoFacets {
  categories: string[];
  directions: string[];
  /** Ҳудуди кўрсатилмаган лойиҳалар учун алоҳида калит киритилмайди. */
  regions: string[];
  /**
   * Металл/фойдали қазилма — ҳудуддан фарқли ўлароқ бу ерда «кўрсатилмаган»
   * алоҳида вариант бўлиб туради: акс ҳолда фильтр ёқилганда металли
   * ёзилмаган лойиҳалар жимгина йўқолиб қоларди.
   */
  metals: GeoMetalFacet[];
}

export interface GeoTotals {
  projects: number;
  managed: number;
  forming: number;
  costTotal: number;
  costWith: number;
  costWithout: number;
  works: number;
  worksProjects: number;
  volumeProjects: number;
  labPlan: number;
  budget: number;
  /** Жами бўйича учта ҳажм кўрсаткичи — ҳар бири ўз бирлигида. */
  metrics: GeoVolumeMetric[];
}

export interface GeoView {
  projects: GeoProject[];
  totals: GeoTotals;
  byGroup: GeoSlice[];
  byCategory: GeoSlice[];
  byDirection: GeoSlice[];
  byRegion: GeoSlice[];
  byEndYear: GeoSlice[];
  facets: GeoFacets;
  /** Манба сарлавҳа ёнида қисқа кўрсатилади. */
  asOf: string;
  source: string;
}

/* -------------------------------------------------------------------------- */
/* ёрдамчилар                                                                 */
/* -------------------------------------------------------------------------- */

/** «кўрсатилмаган» — `key: null` гуруҳининг ягона ёрлиғи. */
const UNSET = "кўрсатилмаган";

/**
 * «Металл кўрсатилмаган» фильтр вариантининг калити. Кирилл элемент номи
 * билан тўқнашмайди, шунинг учун у алоҳида қиймат сифатида хавфсиз.
 */
export const GEO_METAL_UNSET = "__unset__";

/**
 * Манбада бўш катакни билдирувчи белгилар. Бэкенд бир жойда `null`, бошқа
 * жойда «—» беради (5 та лойиҳа: иккитасида тире, учтасида `null`) — иккови
 * ҳам «кўрсатилмаган» дегани, шунинг учун улар элемент сифатида рўйхатга
 * тушмайди.
 */
const NO_VALUE = new Set(["", "—", "–", "-"]);

/**
 * `"Вольфрам, Қалай"` → `["Вольфрам", "Қалай"]`.
 *
 * Манбада вергулдан кейин бўш жой ҳам, унсиз ҳам ёзилган, шунинг учун
 * `trim()` мажбурий. Такрор ёзилган ном бир марта саналади — акс ҳолда битта
 * лойиҳа фильтр сонида икки марта кўринарди.
 */
function metalsOf(raw: string | null): string[] {
  if (raw === null) return [];
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (NO_VALUE.has(t) || out.includes(t)) continue;
    out.push(t);
  }
  return out;
}

/**
 * Манбада элемент эмас, **гуруҳ** номи бўлган қийматлар.
 *
 * Улар ўзгартирилмайди ва рўйхатдан тушмайди — фақат фильтр рўйхатининг
 * охирига қўйилади, чунки «Камёб ер элементлари» билан «Олтин» бир хил
 * даражадаги нарса эмас. Айнан шу сабабли фильтр сарлавҳаси «Кимёвий
 * элемент» эмас — рўйхатдаги ҳамма қиймат элемент эмас.
 *
 * Бу жадвал рўйхатни **чекламайди**: у ерда йўқ ҳар қандай янги қиймат
 * оддий элемент сифатида ўзи пайдо бўлади, жадвал фақат тартибга таъсир
 * қилади.
 */
const METAL_COLLECTIVE = new Set(["Камёб ер элементлари", "Критик минераллар"]);

/**
 * Металл фильтрининг вариантлари — маълумотдан қурилади.
 *
 * Тартиб: аввал элементлар (лойиҳалар сони бўйича камаювчи, тенг бўлса
 * алифбо), сўнг гуруҳ номлари, энг охирида «кўрсатилмаган». Сонлар бутун
 * рўйхат бўйича — қўшни фильтрлар (тоифа) билан бир хил хулқ.
 */
function metalFacetsOf(projects: GeoProject[]): GeoMetalFacet[] {
  const counts = new Map<string, number>();
  let unset = 0;
  for (const p of projects) {
    if (p.metalList.length === 0) {
      unset += 1;
      continue;
    }
    for (const m of p.metalList) counts.set(m, (counts.get(m) ?? 0) + 1);
  }

  const rank = (key: string): number => (METAL_COLLECTIVE.has(key) ? 1 : 0);
  const list: GeoMetalFacet[] = [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: key,
      count,
      collective: METAL_COLLECTIVE.has(key),
    }))
    .sort(
      (a, b) =>
        rank(a.key) - rank(b.key) ||
        b.count - a.count ||
        a.label.localeCompare(b.label, "ru"),
    );

  // «Кўрсатилмаган» — элемент эмас, шунинг учун саралашдан кейин, энг охирига.
  if (unset > 0) {
    list.push({ key: GEO_METAL_UNSET, label: UNSET, count: unset, collective: false });
  }
  return list;
}

const sliceOf = (items: GeologyCountItem[]): GeoSlice[] =>
  items.map((i, n) => ({
    key: i.key ?? `unset_${n}`,
    name: i.key ?? UNSET,
    value: i.count,
    muted: i.key === null,
  }));

const yearSliceOf = (items: GeologyYearCountItem[]): GeoSlice[] =>
  items.map((i, n) => ({
    key: i.year === null ? `unset_${n}` : String(i.year),
    name: i.year === null ? UNSET : String(i.year),
    value: i.count,
    muted: i.year === null,
  }));

/** `2026`, `6` → «Июнь 2026». Манбадаги матн лотин/рус аралаш, шунинг учун
 *  ёрлиқ ой рақамидан аппнинг ўз кирилл рўйхати билан қурилади. */
const deadlineOf = (year: number, month: number): string => {
  const m = M_UZ[month - 1];
  return m ? `${m} ${year}` : String(year);
};

const VOLUME_META: { key: GeoVolumeKey; label: string; unit: string }[] = [
  { key: "drill", label: "Бурғилаш", unit: "п.м" },
  { key: "sample", label: "Намуналаш", unit: "дона" },
  { key: "trench", label: "Канава", unit: "м³" },
];

/**
 * Битта ҳажм кўрсаткичи.
 *
 * `noReport` — режа бор, бажарилгани эса `null`. Айнан шу ҳолат экранда
 * «0%» бўлиб кўринмаслиги керак: 15 та лойиҳанинг **ҳаммасида** канава
 * бўйича бажарилгани кўрсатилмаган.
 */
function metricOf(
  meta: { key: GeoVolumeKey; label: string; unit: string },
  plan: number | null,
  done: number | null,
  pct: number | null,
): GeoVolumeMetric {
  return {
    ...meta,
    plan,
    done,
    pct,
    noReport: done === null && plan !== null && plan !== 0,
    over: pct !== null && pct > 100,
  };
}

function volumeOf(v: GeologyVolumeRow): GeoVolume {
  const plan: Record<GeoVolumeKey, number | null> = {
    drill: v.drillPlan,
    sample: v.samplePlan,
    trench: v.trenchPlan,
  };
  const done: Record<GeoVolumeKey, number | null> = {
    drill: v.drillDone,
    sample: v.sampleDone,
    trench: v.trenchDone,
  };
  const pct: Record<GeoVolumeKey, number | null> = {
    drill: v.drillPercent,
    sample: v.samplePercent,
    trench: v.trenchPercent,
  };
  return {
    metrics: VOLUME_META.map((m) => metricOf(m, plan[m.key], done[m.key], pct[m.key])),
    labPlan: v.labPlan,
    budget: v.budgetMlnUsd2026,
  };
}

/** Битта хона — `2/3` каби бўлинмалардаги float думини кесиш учун. */
const round1 = (v: number): number => Math.round(v * 10) / 10;

/** Хона сони берилган яхлитлаш — бэкенддаги `round()` билан бир хил. */
const roundTo = (v: number, digits: number): number => {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
};

/**
 * `null` ларни **ташлаб** йиғади: тўлдирилмаган катак нол сифатида қўшилмаса
 * ҳам, йиғиндини пасайтирмаслиги керак. Бэкенддаги `sum()` нинг айнан ўзи —
 * шунинг учун фильтрсиз ҳолатда натижа `summary.volumes2026` билан тўғри
 * келади.
 */
const sumOf = (values: (number | null)[], digits: number): number =>
  roundTo(
    values.reduce<number>((acc, v) => (v === null ? acc : acc + v), 0),
    digits,
  );

/** Иш режаси бўйича бажарилиш; иш бўлмаса ҳисоб умуман юритилмайди. */
function progressOf(works: GeoWork[]): GeoWorkProgress | null {
  if (works.length === 0) return null;
  const done = works.filter((w) => w.done).length;
  return { total: works.length, done, pct: round1((done / works.length) * 100) };
}

function projectOf(p: GeologyProjectRow): GeoProject {
  // Йил → ой → манба тартиби. Бэкенд `sortOrder` бўйича беради, лекин
  // экранда муддат бўйича ўқилиши керак.
  const works: GeoWork[] = [...p.works]
    .sort((a, b) => a.year - b.year || a.month - b.month || a.sortOrder - b.sortOrder)
    .map((w) => ({
      id: w.id,
      work: w.work,
      deadline: deadlineOf(w.year, w.month),
      done: w.status === "Бажарилди",
      status: w.status,
    }));

  return {
    id: p.id,
    no: p.projectNo,
    group: p.groupName,
    groupKey: groupKeyOf(p.groupName),
    name: p.name,
    shortName: p.shortName,
    category: p.category,
    direction: p.direction,
    region: p.region,
    district: p.district,
    mineral: p.mineral,
    metals: p.metals,
    metalList: metalsOf(p.metals),
    oreReserve: p.oreReserve,
    metalReserve: p.metalReserve,
    cost: p.costMlnUsd,
    funding: p.funding,
    endYear: p.endYear,
    partner: p.partner,
    plan2026: p.plan2026,
    done2026: p.done2026,
    result: p.result,
    note: p.note,
    works,
    progress: progressOf(works),
    volume: p.volume ? volumeOf(p.volume) : null,
    haystack: `${p.shortName} ${p.name}`.toLowerCase(),
  };
}

/** Фильтр рўйхатлари — фақат маълумотда учраган қийматлар, алифбо тартибида. */
function facetsOf(projects: GeoProject[]): GeoFacets {
  const uniq = (pick: (p: GeoProject) => string | null): string[] =>
    [...new Set(projects.map(pick).filter((v): v is string => v !== null && v !== ""))].sort(
      (a, b) => a.localeCompare(b, "ru"),
    );
  return {
    categories: uniq((p) => p.category),
    directions: uniq((p) => p.direction),
    regions: uniq((p) => p.region),
    metals: metalFacetsOf(projects),
  };
}

/* -------------------------------------------------------------------------- */
/* асосий адаптер                                                             */
/* -------------------------------------------------------------------------- */

export function geologyView(d: GeologyDashboard): GeoView {
  const projects = d.projects.map(projectOf);
  const s = d.summary;
  const v = s.volumes2026;

  const countOf = (items: GeologyCountItem[], name: string): number =>
    items.find((i) => i.key === name)?.count ?? 0;

  // Жами бўйича ҳажм: `*DoneReported === 0` бўлса «бажарилгани» сифатида
  // ноль эмас, **йўқлик** кўрсатилади. Бэкенд шу ҳолатда фоизни ҳам `null`
  // қилиб беради; канавада айнан шундай (4300 м³ режа, ҳисобот берилмаган).
  const totalPlan: Record<GeoVolumeKey, number> = {
    drill: v.drillPlan,
    sample: v.samplePlan,
    trench: v.trenchPlan,
  };
  const totalDone: Record<GeoVolumeKey, number> = {
    drill: v.drillDone,
    sample: v.sampleDone,
    trench: v.trenchDone,
  };
  const reported: Record<GeoVolumeKey, number> = {
    drill: v.drillDoneReported,
    sample: v.sampleDoneReported,
    trench: v.trenchDoneReported,
  };
  const totalPct: Record<GeoVolumeKey, number | null> = {
    drill: v.drillPercent,
    sample: v.samplePercent,
    trench: v.trenchPercent,
  };

  return {
    projects,
    totals: {
      projects: s.totalProjects,
      managed: countOf(s.byGroup, GROUP_MANAGED),
      forming: countOf(s.byGroup, GROUP_FORMING),
      costTotal: s.cost.totalMlnUsd,
      costWith: s.cost.projectsWithCost,
      costWithout: s.cost.projectsWithoutCost,
      works: s.works.total,
      worksProjects: s.works.projectsWithWorks,
      volumeProjects: v.projectsWithVolumes,
      labPlan: v.labPlan,
      budget: v.budgetMlnUsd,
      metrics: VOLUME_META.map((m) =>
        metricOf(
          m,
          totalPlan[m.key],
          reported[m.key] === 0 ? null : totalDone[m.key],
          totalPct[m.key],
        ),
      ),
    },
    byGroup: sliceOf(s.byGroup),
    byCategory: sliceOf(s.byCategory),
    byDirection: sliceOf(s.byDirection),
    byRegion: sliceOf(s.byRegion),
    byEndYear: yearSliceOf(s.byEndYear),
    facets: facetsOf(projects),
    asOf: d.meta.asOf,
    source: d.meta.source,
  };
}

/* -------------------------------------------------------------------------- */
/* фильтр                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Гуруҳ фильтри `GeoGroupKey` дан фарқ қилади: `other` танлов сифатида
 * таклиф этилмайди (манбада фақат иккита гуруҳ бор, `other` эса кутилмаган
 * қиймат учун захира), ўрнига `all` бор.
 */
export type GeoGroupFilter = "all" | "managed" | "forming";

export interface GeoFilter {
  group: GeoGroupFilter;
  categories: string[];
  direction: string;
  region: string;
  /** Металл номлари; `GEO_METAL_UNSET` — металли кўрсатилмаган лойиҳалар. */
  metals: string[];
  query: string;
}

export const GEO_FILTER_EMPTY: GeoFilter = {
  group: "all",
  categories: [],
  direction: "",
  region: "",
  metals: [],
  query: "",
};

export const geoFilterDirty = (f: GeoFilter): boolean =>
  f.group !== "all" ||
  f.categories.length > 0 ||
  f.direction !== "" ||
  f.region !== "" ||
  f.metals.length > 0 ||
  f.query.trim() !== "";

/**
 * Фильтрлаш. Тоифа кўп танловли: ҳеч нарса танланмаса — чекламайди
 * (`CheckSelect` нинг «бўш = барчаси» хулқи `ProdPanel` дан фарқли, чунки бу
 * ерда танлов маълумотни яшириш эмас, торайтириш воситаси).
 *
 * ═══ Металл: ичида ЁКИ, бошқалар билан ВА ═══════════════════════════════
 *
 * Битта лойиҳада бир нечта металл бўлади («Олтин, Кумуш, Маргимуш»), шунинг
 * учун танланганлардан **биттаси** топилса кифоя — «Олтин + Кумуш» иккови
 * ҳам бор лойиҳани эмас, иккисидан бири бор лойиҳаларни беради. Кесишма
 * бўлса рўйхат деярли ҳар доим бўш чиқарди. Бошқа фильтрлар билан эса
 * одатдагидек ВА: гуруҳ ВА тоифа ВА металл.
 */
export function geoFilter(projects: GeoProject[], f: GeoFilter): GeoProject[] {
  const q = f.query.trim().toLowerCase();
  const cats = new Set(f.categories);
  const mets = new Set(f.metals);
  return projects.filter((p) => {
    if (f.group !== "all" && p.groupKey !== f.group) return false;
    if (cats.size > 0 && !cats.has(p.category)) return false;
    if (f.direction !== "" && p.direction !== f.direction) return false;
    if (f.region !== "" && p.region !== f.region) return false;
    if (mets.size > 0) {
      // Металли кўрсатилмаган лойиҳа фақат «кўрсатилмаган» танланганда
      // кўринади — у ҳеч бир элементга тегишли эмас.
      const hit =
        p.metalList.length === 0
          ? mets.has(GEO_METAL_UNSET)
          : p.metalList.some((m) => mets.has(m));
      if (!hit) return false;
    }
    if (q !== "" && !p.haystack.includes(q)) return false;
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/* битта лойиҳа                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Хэшдаги идентификатор (`#geology/12` даги `12` — манбадаги лойиҳа рақами)
 * бўйича лойиҳа. Нотўғри ёки эскирган ҳавола хатога олиб келмайди: `null`
 * қайтади ва панел рўйхатга тушади.
 */
export function geoProjectByNo(projects: GeoProject[], no: string | null): GeoProject | null {
  if (no === null) return null;
  const n = Number(no);
  return Number.isInteger(n) ? (projects.find((p) => p.no === n) ?? null) : null;
}

/**
 * Манбада бирор қиймати кўрсатилган ҳажм кўрсаткичлари. Режаси ҳам,
 * бажарилгани ҳам йўқ кўрсаткич («— / — п.м») экранда шовқиндан бошқа нарса
 * эмас — у тушириб қолдирилади, лекин ҳисобот берилмаган ҳолат сақланади.
 */
export const geoFilledMetrics = (v: GeoVolume): GeoVolumeMetric[] =>
  v.metrics.filter((m) => m.plan !== null || m.done !== null);

/* -------------------------------------------------------------------------- */
/* ҳажм йиғиндиси — фильтрланган тўплам бўйича                                */
/* -------------------------------------------------------------------------- */

/**
 * 2026 иш ҳажмларининг йиғиндиси. Бўлим фильтрдан кейин турганлиги учун у
 * бэкенднинг `summary.volumes2026` идан эмас, **экранда кўринаётган**
 * лойиҳалардан ҳисобланади — акс ҳолда «Олтин» танланганда пастда олтинга
 * алоқаси йўқ қаторлар қолиб кетарди.
 */
export interface GeoVolumeTotals {
  /** Ҳажми кўрсатилган лойиҳалар сони — тўпламдаги ҳаммаси эмас. */
  projects: number;
  metrics: GeoVolumeMetric[];
  labPlan: number;
  budget: number;
}

/**
 * Йиғинди ҳисоби бэкенддаги `buildSummary()` билан **қатор-бақатор** бир хил:
 * `null` лар ташланади, режа/бажарилган 2 хонага, бюджет 3 хонага
 * яхлитланади, фоиз эса бажарилганини **биронта** лойиҳа берган бўлсагина
 * ҳисобланади. Шунинг учун фильтр бўш бўлганда сонлар API берганининг айнан
 * ўзи бўлади.
 *
 * `reported === 0` — «ҳисобот берилмаган»: бундай ҳолатда бажарилган нол
 * эмас, **йўқ** (`null`), фоиз ҳам `null`. Канава бўйича айнан шундай.
 */
export function geoVolumeTotals(projects: GeoProject[]): GeoVolumeTotals {
  const vols = projects.flatMap((p) => (p.volume ? [p.volume] : []));

  const metrics = VOLUME_META.map((meta) => {
    const cells = vols.map((v) => v.metrics.find((m) => m.key === meta.key) ?? null);
    const plan = sumOf(
      cells.map((c) => c?.plan ?? null),
      2,
    );
    const doneValues = cells.map((c) => c?.done ?? null);
    const reported = doneValues.filter((d) => d !== null).length;
    const done = sumOf(doneValues, 2);
    const pct = reported === 0 || plan === 0 ? null : roundTo((done / plan) * 100, 1);
    return metricOf(meta, plan, reported === 0 ? null : done, pct);
  });

  return {
    projects: vols.length,
    metrics,
    labPlan: sumOf(
      vols.map((v) => v.labPlan),
      2,
    ),
    budget: sumOf(
      vols.map((v) => v.budget),
      3,
    ),
  };
}

/** Танланган ҳажм кўрсаткичи бўйича режаси бор лойиҳалар — камаювчи тартибда. */
export function geoVolumeRows(
  projects: GeoProject[],
  key: GeoVolumeKey,
): { project: GeoProject; metric: GeoVolumeMetric }[] {
  return projects
    .flatMap((project) => {
      const metric = project.volume?.metrics.find((m) => m.key === key);
      return metric && metric.plan !== null && metric.plan !== 0 ? [{ project, metric }] : [];
    })
    .sort((a, b) => (b.metric.plan ?? 0) - (a.metric.plan ?? 0));
}

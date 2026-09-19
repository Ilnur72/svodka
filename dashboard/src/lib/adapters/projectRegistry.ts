import type {
  ProjectRegistryCoordsStatus,
  ProjectRegistryDashboard,
  ProjectRegistryFinanceSourceKey,
  ProjectRegistryGroupStat,
  ProjectRegistryProject,
} from "../../api/types";
import type { Status } from "../../types";
import { exact, nf } from "../format";

/**
 * «Лойиҳалар реестри 2026–2030» — `/project-registry/dashboard` жавобидан
 * панел кўринишига.
 *
 * ═══ Манба ══════════════════════════════════════════════════════════════
 *
 * `ТМК_Лойиҳалари_16_09_2026_тўлдирилган_2.xlsx`, `2026-2030` варағи —
 * **144 лойиҳа**, 9 кластер, 17 йўналиш, 59 устун. Бу вақт қатори эмас,
 * битта ҳужжатнинг қотирилган ҳолати, шунинг учун бўлим давр танлагичига
 * боғланмаган.
 *
 * ⚠️ Ёнидаги «Инвестиция дастури 2026–2030» (`investdeck`) билан ЎХШАШ, лекин
 * БОШҚА: у — 03.08.2026 ҳолатидаги PPTX тақдимот (88 лойиҳа, ҳар бирида KPI,
 * иш режаси ва молия жадвали), бу эса 16.09.2026 ҳолатидаги XLSX реестр
 * (144 лойиҳа, операцион устунлар: бажарилиш %, қурилиш ҳужжатлари,
 * инфратузилма, ишга тушириш санаси, масъул шахс). Улар бирлаштирилмайди —
 * бу билиб туриб қабул қилинган қарор.
 *
 * ═══ Гуруҳ қатори йиғиндига кирмайди ════════════════════════════════════
 *
 * Реестрдаги кластер, йўналиш ва «ЖАМИ» қаторлари **лойиҳа эмас** —
 * пастдаги қаторларнинг суммаси. Бэкенд уларни `projects` га умуман
 * қўшмайди (`production-report` даги `isTotal` билан бир хил мантиқ), эълон
 * қилинган сонлари эса `declared*` майдонларида, текшириш учун ёнма-ён
 * кўрсатилади.
 *
 * ═══ «Кўрсатилмаган» ≠ «нол» ════════════════════════════════════════════
 *
 * Манба ЖУДА нотекис тўлдирилган: лойиҳа номи ва умумий қиймати 144/144,
 * бажарилиш % эса атиги 5/144, ускуналар 1/144, EPC қиймати 0/144.
 * Бўш катак бу ерда **нолга айлантирилмайди** ва «—» билан жимгина
 * тўлдирилмайди: қиймат `null` бўлиб қолади, панел эса ёнида нечта
 * лойиҳадан ҳисоблангани ёзилади.
 *
 * ═══ Матн — КИРИЛЛ ══════════════════════════════════════════════════════
 *
 * API матн майдонларини ЛОТИН ёзувида беради, кириллчаси эса ёнидаги
 * `*Cyrillic` жуфтида. Сводка интерфейси кирилл — бу ерда ДОИМ `*Cyrillic`
 * олинади, панелга лотин шакли умуман чиқмайди.
 */

/** Қиймати кўрсатилмаган катак учун ягона матн — бўлим бўйлаб бир хил. */
export const NO_DATA = "кўрсатилмаган";

/**
 * Молиялаштириш манбаининг кириллча ёрлиғи.
 *
 * ⚠️ Нега бу ерда: API `label` ни фақат ЛОТИН ёзувида беради
 * (`OʻzTMK mablagʻlari`) ва унинг `labelCyrillic` жуфти йўқ — бошқа матн
 * майдонларидан фарқли ўлароқ. Ёрлиқ **манба қиймати эмас**, у бэкенддаги
 * қотирилган луғатдан келади, шунинг учун уни каноник `sourceKey` бўйича шу
 * ерда кириллга қўйиш — маълумотни «тузатиш» эмас, интерфейс тилини танлаш
 * (ранг билан бир хил ҳолат, қаранг: `REGISTRY_SOURCE_TOKEN`). Матн манбадаги
 * устун сарлавҳаларидан олинган.
 */
export const REGISTRY_SOURCE_LABEL: Record<ProjectRegistryFinanceSourceKey, string> = {
  finTmkMlnUsd: "ЎзТМК маблағлари",
  finUzttjMlnUsd: "ЎзТТЖ маблағлари",
  finCreditMlnUsd: "Тижорат кредити",
  finPartnerMlnUsd: "Ҳамкор маблағлари",
  finOfftakeMlnUsd: "Офф-тейк",
  finEurobondMlnUsd: "Евробонд",
};

/**
 * Молиялаштириш манбаининг ранги — бўлим бўйлаб битта. Калит бўйича
 * боғланади (ёрлиқ бўйича эмас), шунда улуш чизиғида ва тафсилот ойнасидаги
 * молия қаторида бир хил ранг туради.
 */
export const REGISTRY_SOURCE_TOKEN: Record<ProjectRegistryFinanceSourceKey, string> = {
  finTmkMlnUsd: "var(--s1)",
  finUzttjMlnUsd: "var(--s2)",
  finCreditMlnUsd: "var(--s3)",
  finPartnerMlnUsd: "var(--s4)",
  finOfftakeMlnUsd: "var(--s6)",
  finEurobondMlnUsd: "var(--ink-3)",
};

const SOURCE_ORDER: ProjectRegistryFinanceSourceKey[] = [
  "finTmkMlnUsd",
  "finUzttjMlnUsd",
  "finCreditMlnUsd",
  "finPartnerMlnUsd",
  "finOfftakeMlnUsd",
  "finEurobondMlnUsd",
];

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

/** Бўш сатр ҳам «кўрсатилмаган» — API'да у учрамайди, лекин кафолат эмас. */
const txt = (v: string | null): string | null => (v === null || v.trim() === "" ? null : v);

/**
 * Манбада битта тушунча иккита устунда бўлиши мумкин: сон (`areaHa`) ва матн
 * (`areaTextCyrillic`). Матнда кўпинча кўпроқ маълумот бор
 * («9,0 (ГТЦ-1: 1,30; ГТЦ-2: 3,50)»), шунинг учун у устун туради; сон эса
 * матн бўлмаганда ўз бирлиги билан чиқади. Сон **яхлитланмайди**.
 */
function textOrNum(t: string | null, n: number | null, unit?: string): string | null {
  const s = txt(t);
  if (s !== null) return s;
  if (n === null) return null;
  return unit ? `${exact(n)} ${unit}` : exact(n);
}

/* -------------------------------------------------------------------------- */
/* координата                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Координата НЕГА йўқ (ёки қандай олингани) — бўлим бўйлаб ЯГОНА матн.
 *
 * ⚠️ `notPlace` ва `unknown` бир хил ёзилмайди: биринчиси ҳал қилинган ҳолат
 * (матн ҳудуд эмас, нуқта ҳеч қачон бўлмайди), иккинчиси эса бэкендда
 * бажарилмаган иш. Иккови битта «координата йўқ» бўлиб кўринса, реестрга
 * янги имло варианти кириб келгани жимгина сезилмай қоларди.
 */
export const REG_COORDS_REASON: Record<ProjectRegistryCoordsStatus, string> = {
  resolved: "ҳудуд матнидан аниқланган",
  multiRegion: "матнда бир нечта ҳудуд аталган — нуқта биринчисиники",
  notPlace: "«Ҳудуди» устунида жой эмас, иш кўлами ёзилган",
  missing: "«Ҳудуди» устуни бўш",
  unknown: "⚠ бу ҳудуд матни бэкенд жадвалида йўқ — қўшилиши керак",
};

/**
 * Тафсилот ойнасидаги «Харитадаги нуқта» катаги.
 *
 * Координата бўлмаса ҳам катак «кўрсатилмаган» бўлиб қолмайди: сабаби
 * ёзилади. Координата бор бўлса — каноник жой номи ва аниқлиги, чунки нуқта
 * лойиҳанинг ўз жойи ЭМАС.
 */
function coordsFact(r: ProjectRegistryProject): string | null {
  const place = txt(r.coordsPlaceCyrillic);
  if (r.lat === null || r.lon === null || place === null) {
    return REG_COORDS_REASON[r.coordsStatus];
  }
  const multi =
    r.coordsPlaceCount > 1 ? ` (манбада ${r.coordsPlaceCount} ҳудуд аталган — нуқта биринчисиники)` : "";
  return `${place} — маъмурий марказ, лойиҳанинг ўз жойи эмас${multi}`;
}

/**
 * Файл номидаги ҳолат санаси: `ТМК_Лойиҳалари_16_09_2026_…` → `16.09.2026`.
 *
 * Сана манбанинг ўз номида ва ҳар янгиланишда ўзгаради, шунинг учун у
 * кодга қотириб ёзилмайди. Топилмаса `null` — панел у ҳолда фақат файл
 * номини кўрсатади ва сана ўйлаб топилмайди.
 */
function asOfFromSource(source: string): string | null {
  const m = source.match(/(\d{2})[._-](\d{2})[._-](\d{4})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

/** Кластер + йўналиш жуфтининг барқарор калити. */
const groupKeyOf = (cluster: string, direction: string | null): string =>
  `${cluster}||${direction ?? ""}`;

/* -------------------------------------------------------------------------- */
/* view-model                                                                 */
/* -------------------------------------------------------------------------- */

export interface RegProject {
  id: number;
  /** Файлдаги `Т/р`. Барқарор эмас — фақат манбадаги қаторни топиш учун. */
  ordinal: number | null;
  excelRow: number | null;
  /** КИРИЛЛ */
  name: string;
  cluster: string;
  clusterNo: string | null;
  /** `null` — реестрда бу лойиҳа учун йўналиш кўрсатилмаган. */
  direction: string | null;
  directionNo: string | null;
  /** Кластер + йўналиш калити — гуруҳлаш ва фильтр учун. */
  groupKey: string;
  kind: string;
  responsible: string | null;
  deadline: string | null;
  commissioning: string | null;
  /** Млн АҚШ доллари. */
  totalCost: number | null;
  jobs: number | null;
  /** КИРИЛЛ, манбадагидек — эркин матн («Самарканд вилояти, Нуробод ва Пахтачи тумани»). */
  region: string | null;
  /**
   * Харитадаги нуқта. `null` — матн ҳудуд эмас ёки устун бўш; сабаби
   * `coordsStatus` да. ⚠️ Нуқта — ТУМАН/ШАҲАР МАРКАЗИ, лойиҳанинг ўз жойи эмас.
   */
  lat: number | null;
  lon: number | null;
  /** Каноник ҳудуд номи (КИРИЛЛ) — координата ўшаники. */
  coordsPlace: string | null;
  /** Матнда аталган ҳудудлар сони; >1 бўлса нуқта БИРИНЧИСИНИКИ. */
  coordsPlaceCount: number;
  coordsStatus: ProjectRegistryCoordsStatus;
  /** Харитада агрегация калити: `"<lat>,<lon>"`. Координата бўлмаса `null`. */
  placeKey: string | null;
  /** Хом қиймат — манбадагидек (0.8 ёки 82). */
  progressRaw: number | null;
  /** Бэкенднинг ТАХМИНИ: `progressRaw <= 1` бўлса ×100. */
  progressPercent: number | null;
  /** Хом қийматдан ўқилган шкала — аралашгани экранда ёзилади. */
  progressScale: "share" | "percent" | null;
  /** Молия манбалари йиғиндиси; бирорта манба кўрсатилмаган бўлса `null`. */
  financeSum: number | null;
  /** `totalCost − financeSum`; ноль бўлмаса — МАНБАДАГИ номувофиқлик. */
  financeGap: number | null;
  /** Қидирув учун кичик ҳарфли ўзак: ном + кластер + йўналиш + тур. */
  haystack: string;
  /** Тафсилот ойнаси учун хом қатор — адаптердан ташқарига чиқмайди. */
  raw: ProjectRegistryProject;
}

/** Кластер ичидаги битта йўналиш (ёки «йўналиш кўрсатилмаган» гуруҳи). */
export interface RegDirection {
  key: string;
  no: string | null;
  /** `null` — йўналиш кўрсатилмаган гуруҳи. */
  name: string | null;
  projects: number;
  totalCost: number | null;
  jobs: number | null;
}

export interface RegCluster {
  key: string;
  no: string | null;
  name: string;
  projects: number;
  totalCost: number | null;
  jobs: number | null;
  /** Манбанинг ўз гуруҳ қаторида эълон қилингани — текшириш учун. */
  declaredProjects: number | null;
  declaredTotalCost: number | null;
  declaredJobs: number | null;
  matches: boolean;
  /** Бўш массив бўлмайди: йўналиши йўқ кластерда битта «кўрсатилмаган» гуруҳ. */
  directions: RegDirection[];
}

export interface RegSource {
  key: ProjectRegistryFinanceSourceKey;
  label: string;
  color: string;
  /** Млн $; бирорта лойиҳада ҳам кўрсатилмаган бўлса `null`. */
  total: number | null;
  /** Нечта лойиҳада шу манба кўрсатилган. */
  projects: number;
  /** `true` — устун манбада БУТУНЛАЙ бўш (`dataQuality.emptyColumns`). */
  empty: boolean;
}

/** Нечта лойиҳада устун тўлдирилган — «маълумот тўлиқлиги» блоки учун. */
export interface RegFilled {
  key: string;
  label: string;
  filled: number;
  total: number;
}

export interface RegFinanceMismatch {
  id: number;
  ordinal: number | null;
  excelRow: number | null;
  name: string;
  cluster: string;
  declared: number;
  sourcesSum: number;
  diff: number;
}

export interface RegDateSerial {
  key: string;
  ordinal: number | null;
  excelRow: number;
  column: string;
  serial: number;
  iso: string;
  name: string | null;
}

export interface RegProgressRow {
  key: string;
  ordinal: number | null;
  excelRow: number;
  value: number;
  scale: "share" | "percent";
  percent: number | null;
  name: string | null;
}

export interface RegClusterMismatch {
  key: string;
  cluster: string;
  field: string;
  computed: number;
  declared: number;
  diff: number;
}

export interface RegMissingResponsible {
  id: number;
  ordinal: number | null;
  name: string;
  cluster: string;
}

export interface RegQuality {
  financeMismatches: RegFinanceMismatch[];
  clusterMismatches: RegClusterMismatch[];
  dateSerials: RegDateSerial[];
  progress: RegProgressRow[];
  /** Ҳар иккала шкала ҳам учраганми — бэкенд рўйхати шунда тўлади. */
  progressMixed: boolean;
  /** Манба устун сарлавҳалари (КИРИЛЛ) — бирорта лойиҳада тўлдирилмаган. */
  emptyColumns: string[];
  missingResponsible: RegMissingResponsible[];
  warnings: string[];
  /** Нечта муаммо белгиси топилган — бўлим сарлавҳасидаги умумий сон. */
  issues: number;
}

export interface RegView {
  totals: {
    projects: number;
    clusters: number;
    directions: number;
    /** Млн $ — лойиҳалардан ҳисобланган. */
    totalCost: number | null;
    jobs: number | null;
    declaredTotalCost: number | null;
    declaredJobs: number | null;
    /** Ҳисобланган ва манбада эълон қилингани мос келдими. */
    matches: boolean;
    /** Иш ўрни кўрсатилган лойиҳалар сони. */
    jobsFilled: number;
    /** Молиялаштириш манбаси кўрсатилган лойиҳалар сони. */
    financeFilled: number;
  };
  clusters: RegCluster[];
  sources: RegSource[];
  /** Манбалар бўйича йиғинди — `totals.totalCost` дан кичик бўлиши НОРМАЛ. */
  sourcesTotal: number | null;
  projects: RegProject[];
  facets: {
    clusters: { key: string; label: string; count: number }[];
    kinds: { key: string; label: string; count: number }[];
  };
  filled: RegFilled[];
  quality: RegQuality;
  /** Манба файл номи. */
  source: string;
  /** Файл номидан ўқилган ҳолат санаси (`16.09.2026`) ёки `null`. */
  asOf: string | null;
  /** Охирги импорт вақти, ISO. */
  importedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* қуриш                                                                      */
/* -------------------------------------------------------------------------- */

function toProject(r: ProjectRegistryProject): RegProject {
  const direction = txt(r.directionNameCyrillic);
  return {
    id: r.id,
    ordinal: r.ordinal,
    excelRow: r.excelRow,
    name: r.nameCyrillic,
    cluster: r.clusterNameCyrillic,
    clusterNo: r.clusterNo,
    direction,
    directionNo: r.directionNo,
    groupKey: groupKeyOf(r.clusterNameCyrillic, direction),
    kind: r.kindCyrillic,
    responsible: txt(r.responsibleCyrillic),
    deadline: txt(r.deadlineTextCyrillic),
    commissioning: txt(r.commissioningTextCyrillic),
    totalCost: r.totalCostMlnUsd,
    jobs: r.jobs,
    region: txt(r.regionCyrillic),
    // Координата бэкенддан АЙНАН шундайлигича олинади: у `Ҳудуди` устунидаги
    // матндан аниқланган маъмурий марказ. Фронтенд уни на силжитади, на
    // номдан «тахмин қилиб» тўлдиради — нуқта йўқ бўлса, йўқ бўлиб қолади.
    lat: r.lat,
    lon: r.lon,
    coordsPlace: txt(r.coordsPlaceCyrillic),
    coordsPlaceCount: r.coordsPlaceCount,
    coordsStatus: r.coordsStatus,
    placeKey: r.lat === null || r.lon === null ? null : `${r.lat},${r.lon}`,
    progressRaw: r.progressRaw,
    progressPercent: r.progressPercent,
    progressScale: r.progressRaw === null ? null : r.progressRaw <= 1 ? "share" : "percent",
    financeSum: r.financeSourcesSumMlnUsd,
    // 0,01 млн $ дан кичик фарқ — яхлитлаш қолдиғи, хабар эмас.
    financeGap:
      r.financeGapMlnUsd === null || Math.abs(r.financeGapMlnUsd) < 0.01
        ? null
        : r.financeGapMlnUsd,
    haystack:
      `${r.nameCyrillic} ${r.clusterNameCyrillic} ${direction ?? ""} ${r.kindCyrillic} ${r.responsibleCyrillic ?? ""}`.toLocaleLowerCase(),
    raw: r,
  };
}

/**
 * Иерархия: кластер → йўналиш.
 *
 * Кластер қатори API'нинг `byCluster` идан олинади (у ерда манба билан
 * солиштирув ҳам бор), йўналишлар эса **лойиҳалардан** йиғилади. Нега
 * `byDirection` дан эмас: йўналиши умуман кўрсатилмаган 65 лойиҳа у рўйхатда
 * йўқ, лекин улар экранда кўринмай қолмаслиги керак — улар учун «йўналиш
 * кўрсатилмаган» гуруҳи ясалади. Йўналиши бор кластерда бундай гуруҳ
 * умуман пайдо бўлмайди (бўш гуруҳ чизилмайди).
 *
 * Тартиб — манбадаги биринчи учраш тартиби: `projects` аллақачон `sortOrder`
 * бўйича келади.
 */
function buildClusters(
  byCluster: ProjectRegistryGroupStat[],
  projects: RegProject[],
): RegCluster[] {
  return byCluster.map((g) => {
    const items = projects.filter((p) => p.cluster === g.nameCyrillic);

    const order: string[] = [];
    const buckets = new Map<string, RegProject[]>();
    for (const p of items) {
      const k = p.direction ?? "";
      if (!buckets.has(k)) {
        buckets.set(k, []);
        order.push(k);
      }
      buckets.get(k)?.push(p);
    }

    const directions: RegDirection[] = order.map((k) => {
      const rows = buckets.get(k) ?? [];
      return {
        key: groupKeyOf(g.nameCyrillic, k === "" ? null : k),
        no: rows[0]?.directionNo ?? null,
        name: k === "" ? null : k,
        projects: rows.length,
        totalCost: sumOrNull(rows.map((p) => p.totalCost)),
        jobs: sumOrNull(rows.map((p) => p.jobs)),
      };
    });

    return {
      key: g.nameCyrillic,
      no: g.no,
      name: g.nameCyrillic,
      projects: g.computedProjects,
      totalCost: g.computedTotalMlnUsd,
      jobs: g.computedJobs,
      declaredProjects: g.declaredProjects,
      declaredTotalCost: g.declaredTotalMlnUsd,
      declaredJobs: g.declaredJobs,
      matches: g.matches,
      directions,
    };
  });
}

/**
 * Маълумот тўлиқлиги — реестрнинг энг муҳим ҳақиқати.
 *
 * Рўйхат тўлиқлик бўйича камайиш тартибида: юқорида 144/144 тўлган устунлар,
 * пастда деярли бўшлари. Бутунлай бўш устунлар бу ерда ЙЎҚ — улар алоҳида
 * рўйхатда (`quality.emptyColumns`), чунки уларда «нечта лойиҳада бор» деган
 * савол маъносиз.
 */
function buildFilled(rows: ProjectRegistryProject[]): RegFilled[] {
  const n = rows.length;
  const has = (fn: (p: ProjectRegistryProject) => unknown): number =>
    rows.filter((p) => {
      const v = fn(p);
      return v !== null && v !== undefined && v !== "";
    }).length;

  const items: RegFilled[] = [
    { key: "name", label: "Лойиҳа номи", filled: has((p) => p.nameCyrillic), total: n },
    { key: "cost", label: "Умумий қиймати", filled: has((p) => p.totalCostMlnUsd), total: n },
    { key: "kind", label: "Лойиҳа тури", filled: has((p) => p.kindCyrillic), total: n },
    { key: "deadline", label: "Амалга ошириш муддати", filled: has((p) => p.deadlineTextCyrillic), total: n },
    { key: "responsible", label: "Масъул шахс", filled: has((p) => p.responsibleCyrillic), total: n },
    { key: "region", label: "Ҳудуди", filled: has((p) => p.regionCyrillic), total: n },
    { key: "goal", label: "Лойиҳа мақсади", filled: has((p) => p.goalCyrillic), total: n },
    { key: "endDate", label: "Тугаш санаси", filled: has((p) => p.endDateTextCyrillic), total: n },
    { key: "jobs", label: "Иш ўринлари", filled: has((p) => p.jobs), total: n },
    { key: "commissioning", label: "Ишга тушириш санаси", filled: has((p) => p.commissioningTextCyrillic), total: n },
    { key: "finance", label: "Молиялаштириш манбалари", filled: has((p) => p.financeSourcesSumMlnUsd), total: n },
    { key: "direction", label: "Йўналиши", filled: has((p) => p.directionNameCyrillic), total: n },
    { key: "capacity", label: "Қуввати", filled: has((p) => p.capacityCyrillic), total: n },
    { key: "product", label: "Маҳсулот", filled: has((p) => p.productCyrillic), total: n },
    { key: "annualOutput", label: "Йиллик ишлаб чиқариш ҳажми", filled: has((p) => p.annualOutputMlnUsd), total: n },
    { key: "irr", label: "IRR", filled: has((p) => p.irrPercent), total: n },
    { key: "npv", label: "NPV", filled: has((p) => p.npvMlnUsd), total: n },
    { key: "payback", label: "Қопланиш муддати", filled: has((p) => p.paybackYears), total: n },
    { key: "fsState", label: "ТИА/ТИХ ҳолати", filled: has((p) => p.fsStateCyrillic), total: n },
    { key: "docState", label: "Қурилиш ҳужжатлари ҳолати", filled: has((p) => p.docStateCyrillic), total: n },
    { key: "expected", label: "Кутилаётган натижа", filled: has((p) => p.expectedResultsCyrillic), total: n },
    { key: "processing", label: "Қайта ишлаш қуввати", filled: has((p) => p.processingCapacityCyrillic), total: n },
    { key: "partner", label: "Ҳамкор компания", filled: has((p) => p.partnerCompanyCyrillic), total: n },
    { key: "state", label: "Ҳозирги ҳолати", filled: has((p) => p.stateCyrillic), total: n },
    { key: "progress", label: "Бажарилиш %", filled: has((p) => p.progressRaw), total: n },
    { key: "designer", label: "Лойиҳачи ташкилот", filled: has((p) => p.designerCyrillic), total: n },
    { key: "priority", label: "Муҳимлилиги", filled: has((p) => p.priority), total: n },
    { key: "buildStart", label: "Қурилиш бошланиши", filled: has((p) => p.buildStartTextCyrillic), total: n },
    { key: "infraPower", label: "Электр тармоғи", filled: has((p) => p.powerGridCyrillic), total: n },
    { key: "infraRailway", label: "Темир йўл", filled: has((p) => p.railwayCyrillic), total: n },
    { key: "contractor", label: "Пудратчи", filled: has((p) => p.contractorCyrillic), total: n },
    { key: "equipment", label: "Ускуналар", filled: has((p) => p.equipmentCyrillic), total: n },
  ];

  return items.sort((a, b) => b.filled - a.filled || a.label.localeCompare(b.label));
}

/**
 * Маълумот сифати блоки — **яширилмайди**.
 *
 * Бэкенд топган номувофиқликлар шу ерда экранга тайёрланади: лотин номлар
 * кириллчага алмаштирилади (мослик `id`/`excelRow` бўйича топилади) ва ҳеч
 * қандай қиймат ўзгартирилмайди. Тузатиш — манбанинг ёки бэкенднинг иши.
 */
function buildQuality(d: ProjectRegistryDashboard, projects: RegProject[]): RegQuality {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const byRow = new Map(projects.filter((p) => p.excelRow !== null).map((p) => [p.excelRow, p]));
  const clusterCyr = new Map(d.byCluster.map((c) => [c.name, c.nameCyrillic]));

  const financeMismatches: RegFinanceMismatch[] = d.dataQuality.financeMismatches
    .map((m) => ({
      id: m.id,
      ordinal: m.ordinal,
      excelRow: m.excelRow,
      name: m.nameCyrillic,
      // `clusterName` фақат лотинча келади — кириллчаси лойиҳанинг ўзидан.
      cluster: byId.get(m.id)?.cluster ?? clusterCyr.get(m.clusterName) ?? m.clusterName,
      declared: m.declaredMlnUsd,
      sourcesSum: m.sourcesSumMlnUsd,
      diff: m.diffMlnUsd,
    }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const clusterMismatches: RegClusterMismatch[] = d.dataQuality.clusterMismatches.map((m, i) => ({
    key: `${m.clusterName}-${m.field}-${i}`,
    cluster: clusterCyr.get(m.clusterName) ?? m.clusterName,
    field:
      m.field === "projects"
        ? "лойиҳалар сони"
        : m.field === "totalMlnUsd"
          ? "умумий қиймат, млн $"
          : "иш ўринлари",
    computed: m.computed,
    declared: m.declared,
    diff: m.diff,
  }));

  const dateSerials: RegDateSerial[] = d.dataQuality.dateSerials.map((s, i) => ({
    key: `${s.excelRow}-${s.column}-${i}`,
    ordinal: s.ordinal,
    excelRow: s.excelRow,
    column: s.column,
    serial: s.serial,
    iso: s.iso,
    name: byRow.get(s.excelRow)?.name ?? null,
  }));

  const progress: RegProgressRow[] = d.dataQuality.progressScaleMixed.map((s, i) => ({
    key: `${s.excelRow}-${i}`,
    ordinal: s.ordinal,
    excelRow: s.excelRow,
    value: s.value,
    scale: s.scale,
    percent: byRow.get(s.excelRow)?.progressPercent ?? null,
    name: byRow.get(s.excelRow)?.name ?? null,
  }));

  const missingResponsible: RegMissingResponsible[] = d.dataQuality.missingResponsible.map((id) => {
    const p = byId.get(id);
    return {
      id,
      ordinal: p?.ordinal ?? null,
      name: p?.name ?? `id ${id}`,
      cluster: p?.cluster ?? "—",
    };
  });

  return {
    financeMismatches,
    clusterMismatches,
    dateSerials,
    progress,
    // Бэкенд рўйхатни ФАҚАТ иккала шкала ҳам учраганда тўлдиради — бўш рўйхат
    // «шкала бир хил» дегани, «текширилмаган» эмас.
    progressMixed: d.dataQuality.progressScaleMixed.length > 0,
    emptyColumns: d.dataQuality.emptyColumns,
    missingResponsible,
    warnings: d.dataQuality.warnings,
    issues:
      financeMismatches.length +
      clusterMismatches.length +
      dateSerials.length +
      progress.length +
      d.dataQuality.emptyColumns.length +
      missingResponsible.length +
      d.dataQuality.warnings.length,
  };
}

export function registryView(d: ProjectRegistryDashboard): RegView {
  const projects = d.projects.map(toProject);
  const clusters = buildClusters(d.byCluster, projects);

  // Бутунлай бўш устун «нол» деб кўрсатилмайди: манба сарлавҳаси бўйича
  // таққосланади ва қатор «маълумот киритилмаган» деб белгиланади.
  const emptyByKey = new Set<ProjectRegistryFinanceSourceKey>();
  for (const c of d.dataQuality.emptyColumns) {
    if (c.includes("офф-тейк")) emptyByKey.add("finOfftakeMlnUsd");
    if (c.includes("евробонд")) emptyByKey.add("finEurobondMlnUsd");
  }

  const order = new Map(SOURCE_ORDER.map((k, i) => [k, i]));
  const sources: RegSource[] = d.byFinanceSource
    .map((s) => ({
      key: s.sourceKey,
      label: REGISTRY_SOURCE_LABEL[s.sourceKey] ?? s.label,
      color: REGISTRY_SOURCE_TOKEN[s.sourceKey] ?? "var(--ink-3)",
      total: s.totalMlnUsd,
      projects: s.projects,
      empty: emptyByKey.has(s.sourceKey) || s.projects === 0,
    }))
    .sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));

  const kindOrder: string[] = [];
  const kindCount = new Map<string, number>();
  for (const p of projects) {
    if (!kindCount.has(p.kind)) kindOrder.push(p.kind);
    kindCount.set(p.kind, (kindCount.get(p.kind) ?? 0) + 1);
  }

  return {
    totals: {
      projects: d.totals.projects,
      clusters: d.totals.clusters,
      directions: d.totals.directions,
      totalCost: d.totals.totalMlnUsd,
      jobs: d.totals.jobs,
      declaredTotalCost: d.totals.declaredTotalMlnUsd,
      declaredJobs: d.totals.declaredJobs,
      matches: d.totals.matches,
      jobsFilled: projects.filter((p) => p.jobs !== null).length,
      financeFilled: projects.filter((p) => p.financeSum !== null).length,
    },
    clusters,
    sources,
    sourcesTotal: sumOrNull(sources.map((s) => s.total)),
    projects,
    facets: {
      clusters: clusters.map((c) => ({ key: c.key, label: c.name, count: c.projects })),
      kinds: kindOrder.map((k) => ({ key: k, label: k, count: kindCount.get(k) ?? 0 })),
    },
    filled: buildFilled(d.projects),
    quality: buildQuality(d, projects),
    source: d.meta.source,
    asOf: asOfFromSource(d.meta.source),
    importedAt: d.meta.importedAt,
  };
}

/* -------------------------------------------------------------------------- */
/* фильтр ва гуруҳлаш                                                         */
/* -------------------------------------------------------------------------- */

export interface RegFilter {
  /** Кластер номлари; бўш массив — барчаси. */
  clusters: string[];
  /** Лойиҳа турлари; бўш массив — барчаси. */
  kinds: string[];
  /**
   * Харитадаги нуқталар (`RegProject.placeKey`); бўш массив — барчаси.
   *
   * Фильтр CheckSelect'дан эмас, ХАРИТАдан келади: маркер босилганда рўйхат
   * шу нуқтадаги лойиҳаларга тораяди. Шунинг учун ёнида доим олиб ташлаш
   * тугмаси бор чип чизилади — акс ҳолда фойдаланувчи рўйхат нега қисқариб
   * қолганини тополмасди.
   */
  places: string[];
  query: string;
}

export const REG_FILTER_EMPTY: RegFilter = {
  clusters: [],
  kinds: [],
  places: [],
  query: "",
};

export const regFilterDirty = (f: RegFilter): boolean =>
  f.clusters.length > 0 ||
  f.kinds.length > 0 ||
  f.places.length > 0 ||
  f.query.trim() !== "";

export function regFilter(projects: RegProject[], f: RegFilter): RegProject[] {
  const q = f.query.trim().toLocaleLowerCase();
  const cl = new Set(f.clusters);
  const kd = new Set(f.kinds);
  const pl = new Set(f.places);
  return projects.filter((p) => {
    if (cl.size > 0 && !cl.has(p.cluster)) return false;
    if (kd.size > 0 && !kd.has(p.kind)) return false;
    // Координатаси йўқ лойиҳа ҳеч қайси нуқтага тегишли эмас: нуқта
    // танланганда у рўйхатдан чиқади, лекин «Харитада кўрсатиб бўлмайди»
    // блокида ўз жойида қолади.
    if (pl.size > 0 && (p.placeKey === null || !pl.has(p.placeKey))) return false;
    if (q !== "" && !p.haystack.includes(q)) return false;
    return true;
  });
}

/** Рўйхатдаги битта йўналиш гуруҳи — фильтрдан КЕЙИНГИ ҳолат бўйича. */
export interface RegListGroup {
  key: string;
  /** `null` — реестрда йўналиш кўрсатилмаган лойиҳалар. */
  direction: string | null;
  directionNo: string | null;
  totalCost: number | null;
  rows: RegProject[];
}

export interface RegListCluster {
  key: string;
  no: string | null;
  cluster: string;
  projects: number;
  totalCost: number | null;
  groups: RegListGroup[];
}

/**
 * Рўйхатни кластер → йўналиш бўйича гуруҳлайди.
 *
 * Сонлар **кўрсатилаётган** қаторлардан ҳисобланади, кластернинг тўлиқ
 * йиғиндисидан эмас: фильтр қўйилганда сарлавҳадаги сон экрандагиси билан
 * мос бўлиши керак. Тартиб — манбадаги тартиб (`projects` шу тартибда келади).
 */
export function regGroup(rows: RegProject[]): RegListCluster[] {
  const order: string[] = [];
  const map = new Map<string, RegProject[]>();
  for (const p of rows) {
    if (!map.has(p.cluster)) {
      map.set(p.cluster, []);
      order.push(p.cluster);
    }
    map.get(p.cluster)?.push(p);
  }

  return order.map((cluster) => {
    const items = map.get(cluster) ?? [];

    const gOrder: string[] = [];
    const gMap = new Map<string, RegProject[]>();
    for (const p of items) {
      const k = p.direction ?? "";
      if (!gMap.has(k)) {
        gMap.set(k, []);
        gOrder.push(k);
      }
      gMap.get(k)?.push(p);
    }

    return {
      key: cluster,
      no: items[0]?.clusterNo ?? null,
      cluster,
      projects: items.length,
      totalCost: sumOrNull(items.map((p) => p.totalCost)),
      groups: gOrder.map((k) => {
        const rs = gMap.get(k) ?? [];
        return {
          key: groupKeyOf(cluster, k === "" ? null : k),
          direction: k === "" ? null : k,
          directionNo: rs[0]?.directionNo ?? null,
          totalCost: sumOrNull(rs.map((p) => p.totalCost)),
          rows: rs,
        };
      }),
    };
  });
}

/**
 * Хэшнинг иккинчи сегментидан лойиҳани топиш (`#registry/61`).
 *
 * `Т/р` эмас, **база id'си**: `Т/р` барқарор эмас (қатор қўшилса сурилади),
 * шунинг учун ҳавола ундан ясалмайди. Сон бўлмаган ёки рўйхатда йўқ қиймат
 * учун `null` — эскирган ҳавола хатога айланмайди, панел уни жимгина
 * тозалайди.
 */
export function regById(projects: RegProject[], sub: string | null): RegProject | null {
  if (sub === null) return null;
  const id = Number(sub);
  if (!Number.isInteger(id)) return null;
  return projects.find((p) => p.id === id) ?? null;
}

/* -------------------------------------------------------------------------- */
/* тафсилот                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Битта лойиҳанинг тафсилоти — «Инвестиция лойиҳалари» паспорти билан
 * БИТТА шаблонда.
 *
 * ═══ Нега шаблон бир хил ════════════════════════════════════════════════
 *
 * Иккала бўлим ҳам битта саволга жавоб беради: «бу лойиҳа нима, қаерда,
 * қанча туради ва қай босқичда». Тузилиши ҳам бир хил бўлса, бир бўлимда
 * ўрганилган кўз ҳаракати иккинчисида қайтадан ўрганилмайди:
 * ҳалқалар → тўртта плитка → уч устун (муддат ва пул · майдон ва сурат ·
 * маҳсулот ва тайёргарлик) → тавсиф тасмаси.
 *
 * ═══ Лекин маълумот БИР ХИЛ ЭМАС ════════════════════════════════════════
 *
 * Паспортда еттита лойиҳа тўлиқ тўлдирилган, реестрда эса 144 та қатор
 * ЖУДА нотекис: `progressPercent` — 5/144, `disbursedMlnUsd` — 2/144,
 * `objectKind` — 1/144. Шунинг учун шаблон ўзгаришсиз кўчирилмайди:
 *
 *   · қиймати йўқ ҲАЛҚА умуман чизилмайди — нол фоизли ҳалқа «ҳеч нарса
 *     қилинмаган» деган ЁЛҒОН хулоса берарди, ҳолбуки реестрда шунчаки
 *     устун тўлдирилмаган;
 *   · плиткаларга реестрнинг ЎЗИДА тўлдириладиган тўртта кўрсаткич
 *     олинган (қиймат 144/144, муддат 144/144, иш ўрни 100/144, ишга
 *     тушириш 98/144), паспортдаги «Бошланиш санаси» (31/144) эса
 *     «Муддатлар» блокида қолди;
 *   · биронта катаги тўлмаган блок чизилмайди, номи эса пастда очиқ
 *     ёзилади (`missing`).
 *
 * Ҳар бир плитка ва ҳалқа ёнида «нечта лойиҳада тўлдирилган» деб ёзилади —
 * бўш катак шу ерда камчилик эмас, реестрнинг ҳолати.
 *
 * `prev`/`next` рўйхатнинг ўз тартибидан ҳисобланади — бэкендга иккинчи
 * сўров юборилмайди (`GET /project-registry/:id` дан келадиган `neighbors`
 * айнан шу тартибда ҳисобланган).
 */

/** Тафсилотдаги битта катак. `v === null` — реестрда тўлдирилмаган. */
export interface RegFact {
  k: string;
  v: string | null;
  /** Қиймат ёнидаги бирлик — фақат сон қийматларда. */
  unit?: string;
}

/** Тафсилотдаги битта блок. Ичида биронта тўлган катак бўлмаса чизилмайди. */
export interface RegBlock {
  key: string;
  title: string;
  facts: RegFact[];
  /** Нечта катак тўлган — сарлавҳадаги «3/9» учун. */
  filled: number;
}

export interface RegFinanceLine {
  key: ProjectRegistryFinanceSourceKey;
  label: string;
  color: string;
  value: number | null;
  /** `true` — бу устун бутун реестрда бўш, шунчаки шу лойиҳада эмас. */
  empty: boolean;
}

/**
 * Юқоридаги тўртта плитка.
 *
 * Бирлик қийматдан АЖРАТИЛГАН: плиткада сон катта ҳарфда, бирлик ёнида
 * кичик ёзилади (`StatTile` шундай тузилган). Қолган жойларда бирлик
 * қиймат матнининг ичида қолади.
 */
export interface RegTile {
  k: string;
  /** Тайёр матн; `null` — реестрда кўрсатилмаган. */
  v: string | null;
  unit?: string;
  /** Плитканинг чап чизиғи учун CSS ранг токени. */
  stripe: string;
  /** Пастки қатор: бу устун реестрда нечта лойиҳада тўлдирилган. */
  foot: string;
}

/**
 * Иккита мустақил ўлчов — жисмоний бажарилиш ва молиявий ўзлаштириш.
 *
 * Улар ҚЎШИЛМАЙДИ, ўртачаси олинмайди ва бир-бирига тенглаштирилмайди
 * («Инвестиция лойиҳалари» бўлимидаги билан бир хил қоида). Фарқи алоҳида
 * майдонда, лекин у ФАҚАТ иккови ҳам бор бўлганда ҳисобланади.
 *
 * `null` — реестрда устун тўлдирилмаган. У нолга айлантирилмайди: нол
 * фоиз «иш бошланмаган» дегани, тўлдирилмаган катак эса «билмаймиз».
 */
export interface RegProgress {
  /** Жисмоний бажарилиш, фоизда. Бэкенднинг шкала ТАХМИНИ. */
  physPct: number | null;
  /** Хом қиймат — манбадагидек (0,8 ёки 82). */
  raw: number | null;
  scale: "share" | "percent" | null;
  /** Ўзлаштирилган маблағнинг умумий қийматдаги улуши, фоизда. */
  finPct: number | null;
  disbursed: number | null;
  /** Фарқ, п.п. — фақат иккови ҳам бор бўлса. */
  gapPp: number | null;
  gapText: string | null;
  status: Status;
  /** Реестр бўйича тўлдирилганлик — ҳалқа остидаги изоҳ учун. */
  physFilled: number;
  finFilled: number;
  total: number;
}

/**
 * Марказдаги «Лойиҳа майдони» блоки: сурат ва тўртта кўрсаткич.
 *
 * ⚠️ Сурат лойиҳа НОМИГА ҚАРАБ танланмайди. Файл номи фақат база
 * идентификатори бўйича ясалади (`public/registry/<id>.jpg`), чунки
 * реестрда 144 лойиҳа бор ва уларнинг номи «Инвестиция лойиҳалари»
 * бўлимидаги еттита сурат номи билан ўхшаш бўлиши мумкин — ўхшашликка
 * қараб бириктирилган сурат бутунлай бошқа объектни кўрсатиб қўярди ва
 * буни экрандан сезиб бўлмасди (координата билан бир хил ҳолат, қаранг:
 * `project-registry.regions.ts`). Файл бўлмаса `AreaPhoto` хотиржам
 * плашка кўрсатади, кўрсаткичлар эса барибир чизилади.
 */
export interface RegArea {
  /** `public/registry/<id>.jpg` манзили. Файл бўлмаса — плашка кўринади. */
  src: string;
  alt: string;
  /** Сурат остидаги қаторлар: ер майдони · ҳудуд · харитадаги нуқта · қувват. */
  fields: RegFact[];
  /** Блок сарлавҳаси остидаги изоҳ. */
  note: string;
  /** Плашканинг иккинчи қатори — расм йўқлигида нима кўринаётгани. */
  photoNote: string;
}

export interface RegDetail {
  project: RegProject;
  /** Сарлавҳа остидаги қатор: ҳудуд · масъул шахс. */
  head: { region: string | null; responsible: string | null };
  progress: RegProgress;
  tiles: RegTile[];
  /** Лойиҳа мақсади — узун матн, абзац бўлиб чизилади. `null` — йўқ. */
  goal: string | null;
  area: RegArea;
  /** Чап устун: муддатлар. */
  terms: RegBlock | null;
  /** Чап устун: самарадорлик кўрсаткичлари. */
  effect: RegBlock | null;
  /** Ўнг устун: нима ишлаб чиқарилади. */
  product: RegBlock | null;
  /** Ўнг устун: лойиҳа қай босқичда. */
  readiness: RegBlock | null;
  /** Пастдаги кенг блок — 12 та катак, уч устунга ёйилади. */
  infra: RegBlock | null;
  /** Пастки тасма: лойиҳанинг умумий тавсифи. Бўш бўлса — чизилмайди. */
  strip: RegFact[];
  finance: RegFinanceLine[];
  financeSum: number | null;
  financeGap: number | null;
  /** Ўзлаштирилган маблағ — молия блокининг остидаги қатор. */
  disbursed: number | null;
  /** Бирорта катаги тўлмаган блоклар номи — очиқ ёзиб қўйиш учун. */
  missing: string[];
  /** Қўшни лойиҳалар (база id) — рўйхатнинг ўз тартиби бўйича. */
  prev: number | null;
  next: number | null;
}

/**
 * Фарқнинг чегаралари — «Инвестиция лойиҳалари» бўлимидагиси билан АЙНАН
 * бир хил: 3 п.п. гача «мос келади», 10 п.п. дан ортиғи «кескин фарқ».
 * Улар молиявий стандарт эмас, фақат диққатни қаратиш учун; ранг ёлғиз
 * маъно ташимайди — фарқнинг ўзи доим сон билан ёзилади.
 */
const GAP_NOTICE = 3;
const GAP_SEVERE = 10;

/** Ишорали пункт матни: «−35,1 п.п.». */
const ppText = (pp: number): string => (pp >= 0 ? "+" : "−") + nf(Math.abs(pp), 1) + " п.п.";

/** Реестрда шу катак нечта лойиҳада тўлдирилган. */
const filledCount = (all: RegProject[], has: (r: ProjectRegistryProject) => boolean): number =>
  all.filter((x) => has(x.raw)).length;

/** `null` ва бўш сатр — иккови ҳам «тўлдирилмаган». */
const isSet = (v: string | number | null): boolean =>
  v !== null && (typeof v === "number" || v.trim() !== "");

/**
 * Битта лойиҳанинг тафсилоти.
 *
 * Блоклар **аввал йиғилади, кейин фильтрланади**: биронта катаги тўлмаган
 * блок умуман чизилмайди ва номи `missing` да қолади. Шунда «бўш жадвал»
 * билан «манбада бу маълумот йўқ» экранда аралашмайди — реестрнинг ярмидан
 * кўпи тўлдирилмагани учун бу ҳолат кўп учрайди.
 */
export function regDetail(p: RegProject, all: RegProject[], emptyColumns: string[]): RegDetail {
  const r = p.raw;
  const total = all.length;

  /* --- молиялаштириш ---------------------------------------------------- */

  const offtakeEmpty = emptyColumns.some((c) => c.includes("офф-тейк"));
  const eurobondEmpty = emptyColumns.some((c) => c.includes("евробонд"));

  const lines: Array<{
    key: ProjectRegistryFinanceSourceKey;
    value: number | null;
    empty: boolean;
  }> = [
    { key: "finTmkMlnUsd", value: r.finTmkMlnUsd, empty: false },
    { key: "finUzttjMlnUsd", value: r.finUzttjMlnUsd, empty: false },
    { key: "finCreditMlnUsd", value: r.finCreditMlnUsd, empty: false },
    { key: "finPartnerMlnUsd", value: r.finPartnerMlnUsd, empty: false },
    { key: "finOfftakeMlnUsd", value: r.finOfftakeMlnUsd, empty: offtakeEmpty },
    { key: "finEurobondMlnUsd", value: r.finEurobondMlnUsd, empty: eurobondEmpty },
  ];
  const finance: RegFinanceLine[] = lines.map((f) => ({
    ...f,
    label: REGISTRY_SOURCE_LABEL[f.key],
    color: REGISTRY_SOURCE_TOKEN[f.key],
  }));

  /* --- иккита ҳалқа ------------------------------------------------------ */

  // Молиявий ўзлаштириш реестрда алоҳида устун сифатида турмайди — у
  // ўзлаштирилган маблағнинг умумий қийматга нисбати. Умумий қиймат нол ёки
  // йўқ бўлса улуш ҲИСОБЛАНМАЙДИ: нолга бўлиш ўрнига катак бўш қолади.
  const finPct =
    r.disbursedMlnUsd === null || p.totalCost === null || p.totalCost === 0
      ? null
      : (r.disbursedMlnUsd / p.totalCost) * 100;
  const physPct = p.progressPercent;
  const gapPp = physPct === null || finPct === null ? null : finPct - physPct;
  const status: Status =
    gapPp === null
      ? "mute"
      : gapPp <= -GAP_SEVERE
        ? "crit"
        : Math.abs(gapPp) <= GAP_NOTICE
          ? "mute"
          : "warn";

  const progress: RegProgress = {
    physPct,
    raw: p.progressRaw,
    scale: p.progressScale,
    finPct,
    disbursed: r.disbursedMlnUsd,
    gapPp,
    gapText: gapPp === null ? null : Math.abs(gapPp) <= GAP_NOTICE ? "мос келади" : ppText(gapPp),
    status,
    physFilled: filledCount(all, (x) => x.progressPercent !== null),
    finFilled: filledCount(all, (x) => x.disbursedMlnUsd !== null),
    total,
  };

  /* --- тўртта плитка ----------------------------------------------------- */

  const tileFoot = (n: number): string => `${nf(n)} / ${nf(total)} лойиҳада кўрсатилган`;

  const tiles: RegTile[] = [
    {
      k: "Умумий қиймати",
      v: p.totalCost === null ? null : exact(p.totalCost),
      unit: "млн $",
      stripe: "var(--s2)",
      foot: tileFoot(filledCount(all, (x) => x.totalCostMlnUsd !== null)),
    },
    {
      k: "Иш ўринлари",
      v: p.jobs === null ? null : exact(p.jobs),
      unit: "та",
      stripe: "var(--s1)",
      foot: tileFoot(filledCount(all, (x) => x.jobs !== null)),
    },
    {
      k: "Амалга ошириш муддати",
      v: p.deadline,
      stripe: "var(--rule)",
      foot: tileFoot(filledCount(all, (x) => isSet(x.deadlineTextCyrillic))),
    },
    {
      k: "Ишга тушириш",
      v: p.commissioning,
      stripe: "var(--s3)",
      foot: tileFoot(filledCount(all, (x) => isSet(x.commissioningTextCyrillic))),
    },
  ];

  /* --- марказдаги «Лойиҳа майдони» --------------------------------------- */

  const areaFilled = filledCount(all, (x) => isSet(x.areaTextCyrillic) || x.areaHa !== null);
  const area: RegArea = {
    // `import.meta.env.BASE_URL` — илова илдиз каталогда турмаса ҳам манзил
    // тўғри бўлиши учун (`vite.config.ts` да `base: "./"`).
    src: `${import.meta.env.BASE_URL}registry/${p.id}.jpg`,
    alt: `${p.name} — лойиҳа майдонининг сурати`,
    fields: [
      { k: "Ер майдони", v: textOrNum(r.areaTextCyrillic, r.areaHa, "га") },
      { k: "Ҳудуди", v: txt(r.regionCyrillic) },
      // Харитадаги нуқта манбадаги матндан АНИҚЛАНГАН қиймат, шунинг учун у
      // «Ҳудуди» ўрнига эмас, ЁНИГА қўйилади ва аниқлиги ёзилади.
      { k: "Харитадаги нуқта", v: coordsFact(r) },
      { k: "Қуввати", v: txt(r.capacityCyrillic) },
    ],
    note: `Ер майдони реестрда ${nf(areaFilled)} / ${nf(total)} лойиҳада тўлдирилган`,
    photoNote:
      "Бу лойиҳанинг сурати ҳали қўйилмаган. Қуйидаги кўрсаткичлар реестрдан олинган ва суратга боғлиқ эмас.",
  };

  /* --- блоклар ------------------------------------------------------------ */

  const missing: string[] = [];

  /** Блок ясайди; биронта катаги тўлмаса `null` қайтади ва номи `missing` га тушади. */
  const mk = (key: string, title: string, facts: RegFact[]): RegBlock | null => {
    const filled = facts.filter((f) => f.v !== null).length;
    if (filled === 0) {
      missing.push(title.toLocaleLowerCase());
      return null;
    }
    // Тўлмаган катаклар ташлаб юборилмайди: блок ичида «кўрсатилмаган» бўлиб
    // қолади, шунда ҳар бир лойиҳа бир хил тузилишда ўқилади.
    return { key, title, facts, filled };
  };

  const terms = mk("terms", "Муддатлар", [
    { k: "Бошланиш санаси", v: txt(r.startDateTextCyrillic) },
    { k: "Тугаш санаси (режа)", v: txt(r.endDateTextCyrillic) },
    { k: "Давомийлиги", v: textOrNum(r.durationTextCyrillic, r.durationMonths, "ой") },
    { k: "Қурилиш бошланиши", v: txt(r.buildStartTextCyrillic) },
    { k: "Монтаж ишлари", v: txt(r.assemblyTextCyrillic) },
  ]);

  const effect = mk("effect", "Самарадорлик", [
    { k: "IRR", v: textOrNum(r.irrTextCyrillic, r.irrPercent, "%") },
    { k: "NPV", v: textOrNum(r.npvTextCyrillic, r.npvMlnUsd, "млн $") },
    { k: "Қопланиш муддати", v: textOrNum(r.paybackTextCyrillic, r.paybackYears, "йил") },
    { k: "Иш ўринлари", v: r.jobs === null ? null : exact(r.jobs), unit: "та" },
    { k: "Кутилаётган натижа", v: txt(r.expectedResultsCyrillic) },
  ]);

  const product = mk("product", "Маҳсулот ва ҳажм", [
    { k: "Маҳсулот", v: txt(r.productCyrillic) },
    { k: "Йиллик ҳажми", v: textOrNum(r.annualOutputTextCyrillic, r.annualOutputMlnUsd, "млн $") },
    // ⚠️ Бу устунда ўлчов АРАЛАШ (тонна/дона) — шунинг учун у ҳеч қандай
    // йиғиндига қўшилмайди ва бирлиги ёзилмайди: манбадаги ёзув қандай
    // бўлса шундай қолади.
    { k: "Йиллик ҳажми (миқдор)", v: textOrNum(r.annualOutputQtyTextCyrillic, r.annualOutputQty) },
    { k: "Қайта ишлаш қуввати", v: txt(r.processingCapacityCyrillic) },
    { k: "Маъдан захираси", v: textOrNum(r.oreReserveTextCyrillic, r.oreReserveMlnT, "млн т") },
  ]);

  const readiness = mk("readiness", "Тайёргарлик", [
    { k: "ТИА/ТИХ ҳолати", v: txt(r.fsStateCyrillic) },
    { k: "Қурилиш ҳужжатлари ҳолати", v: txt(r.docStateCyrillic) },
    { k: "Лойиҳачи ташкилот", v: txt(r.designerCyrillic) },
    { k: "Пудратчи", v: txt(r.contractorCyrillic) },
    {
      k: "EPC шартнома қиймати",
      v: textOrNum(r.epcContractTextCyrillic, r.epcContractMlnUsd, "млн $"),
    },
    { k: "Ускуналар", v: txt(r.equipmentCyrillic) },
    { k: "Ускуна тўлов шартлари", v: txt(r.equipmentPaymentCyrillic) },
    { k: "Харажат тақсимоти", v: txt(r.costBreakdownCyrillic) },
    { k: "Таклифлар қабули", v: txt(r.proposalsOpenCyrillic) },
  ]);

  const infra = mk("infra", "Инфратузилма", [
    { k: "Электр тармоғи", v: txt(r.powerGridCyrillic) },
    {
      k: "Электр энергия эҳтиёжи",
      v: textOrNum(r.powerDemandTextCyrillic, r.powerDemandKwhYear, "кВт·соат/йил"),
    },
    { k: "Табиий газ тармоғи", v: txt(r.gasGridCyrillic) },
    { k: "Газ эҳтиёжи", v: textOrNum(r.gasDemandTextCyrillic, r.gasDemandMlnM3, "млн м³") },
    { k: "Ичимлик суви", v: txt(r.drinkWaterGridCyrillic) },
    {
      k: "Ичимлик сув эҳтиёжи",
      v: textOrNum(r.drinkWaterDemandTextCyrillic, r.drinkWaterDemandThsM3, "минг м³"),
    },
    { k: "Техник сув", v: txt(r.techWaterGridCyrillic) },
    {
      k: "Техник сув эҳтиёжи",
      v: textOrNum(r.techWaterDemandTextCyrillic, r.techWaterDemandThsM3, "минг м³"),
    },
    { k: "Темир йўл", v: txt(r.railwayCyrillic) },
    {
      k: "Темир йўлгача масофа",
      v: textOrNum(r.railwayDistanceTextCyrillic, r.railwayDistanceKm, "км"),
    },
    { k: "Автомобиль йўли", v: txt(r.roadCyrillic) },
    {
      k: "Аҳоли пунктигача масофа",
      v: textOrNum(r.settlementDistanceTextCyrillic, r.settlementDistanceKm, "км"),
    },
  ]);

  /* --- пастки тасма ------------------------------------------------------- */

  // Тасмада фақат ТЎЛГАН катаклар қолади: бу ерда «кўрсатилмаган» сўзи
  // тўрт-беш марта такрорланса, тасма маълумот эмас, шовқин бўларди.
  // Блоклардан фарқи шунда — блок тузилишни сақлайди, тасма эса қисқа
  // тавсиф беради. Ҳаммаси бўш бўлса тасма умуман чизилмайди.
  //
  // «Лойиҳа тури» бу ерда ЙЎҚ: у 144/144 тўлдирилган ва сарлавҳа
  // карточкасидаги нишонда турибди — иккинчи марта ёзилса, кўпчилик
  // лойиҳада тасма ўша битта такрордан иборат бўлиб қоларди.
  const strip: RegFact[] = [
    { k: "Ҳозирги ҳолати", v: txt(r.stateCyrillic) },
    { k: "Объект тури", v: txt(r.objectKindCyrillic) },
    { k: "Муҳимлилиги", v: r.priority === null ? null : exact(r.priority) },
    { k: "Ҳамкор компания", v: txt(r.partnerCompanyCyrillic) },
  ].filter((f) => f.v !== null);

  const idx = all.findIndex((x) => x.id === p.id);
  return {
    project: p,
    head: { region: p.region, responsible: p.responsible },
    progress,
    tiles,
    goal: txt(r.goalCyrillic),
    area,
    terms,
    effect,
    product,
    readiness,
    infra,
    strip,
    finance,
    financeSum: p.financeSum,
    financeGap: p.financeGap,
    disbursed: r.disbursedMlnUsd,
    missing,
    prev: idx > 0 ? all[idx - 1].id : null,
    next: idx !== -1 && idx < all.length - 1 ? all[idx + 1].id : null,
  };
}

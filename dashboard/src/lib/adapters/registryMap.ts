import { exact, nf } from "../format";
import {
  MARKER_ANCHOR_Y,
  MARKER_ASSET_HEIGHT,
  MARKER_ASSET_WIDTH,
  MARKER_TOKEN,
  type MarkerColor,
} from "../map/markers";
import type { MapField, MapPin } from "./mapObjects";
import { REG_COORDS_REASON, type RegProject } from "./projectRegistry";

/**
 * «Лойиҳалар реестри» бўлимидаги харита учун view-model.
 *
 * ═══ Нега алоҳида адаптер ═══════════════════════════════════════════════
 *
 * Хаританинг ўзи — `panels/investMap/MapCanvas`, яъни `/investmap` саҳифаси
 * билан БИТТА компонент. Янги харита ёзилмади: MapLibre қатлами, маркер
 * геометрияси, ёрлиқ тўқнашуви ва карточка аллақачон ўлчаб текширилган.
 * Фарқ фақат МАЪЛУМОТда, шунинг учун фарқ шу файлда: реестр лойиҳалари
 * `MapPin` шаклига келтирилади ва `MapCanvas` тегилмайди.
 *
 * ═══ Битта маркер = битта НУҚТА, битта лойиҳа эмас ══════════════════════
 *
 * Реестрдаги координата `Ҳудуди` устунидаги матндан аниқланган **маъмурий
 * марказ**, шунинг учун лойиҳалар нуқталарда тўпланиб қолади. Жонли
 * жавобда (2026-09-18, прод): 144 лойиҳадан 133 тасида координата бор,
 * лекин улар атиги **20 та** ўзгача нуқтада туради — фақат Чирчиқ шаҳрида
 * 63 та, Нуробод туманида 26 та, Оҳангарон туманида 14 та.
 *
 * 133 та маркер чизилса, уларнинг 103 таси устма-уст тушиб, харита
 * «учта белги» бўлиб кўринарди ва экран ЁЛҒОН гапирарди.
 *
 * Шунинг учун бу ерда **агрегация** қилинади: ҳар бир ўзгача `lat/lon` учун
 * битта маркер, ёрлиғида лойиҳалар СОНИ.
 *
 * Маркернинг ортидаги тўлиқ мазмун — `placeList` да: нуқтанинг йиғма ҳолати
 * ва ундаги БАРЧА лойиҳалар, кластер бўйича гуруҳланган. У маркер босилганда
 * очиладиган ойнага (`panels/projectRegistry/RegistryPlaceModal`) берилади.
 * Илгари бу рўйхат харита устидаги кичик карточкада эди ва олтита номдан
 * кейин «яна 57 та» деб тўхтарди — 63 лойиҳали нуқтада бу маълумотнинг
 * деярли ҳаммасини яширарди.
 *
 * ⚠️ Бу СИЛЖИТИШ ЭМАС. Фронтенд нуқтани ҳеч қаерга кўчирмайди ва номдан
 * координата «тахмин қилмайди» — нуқта базадагидек рост, фақат унда нечта
 * лойиҳа борлиги очиқ ёзилади. Устма-уст тушганни ажратиш керак бўлса, у
 * бэкенд иши (`/map/objects` даги `coordsDisplaced` каби).
 *
 * ═══ Ҳеч нарса жимгина йўқолмайди ═══════════════════════════════════════
 *
 * Координатаси йўқ 11 лойиҳа харитага тушмайди, лекин `offMap` да сабаби
 * билан гуруҳланиб қолади ва экранда очиқ кўрсатилади.
 */

/* -------------------------------------------------------------------------- */
/* нуқта катталиги — ранг билан                                               */
/* -------------------------------------------------------------------------- */

/**
 * Нуқтадаги лойиҳалар сони бўйича даража.
 *
 * ⚠️ Нега ранг, ўлчам эмас: `MapCanvas` даги маркер баландлиги ягона
 * (`MARKER_H`) ва у ёрлиқ тўқнашуви ҳисоби билан боғланган — маркерни
 * катталаштириш ўша ҳисобни ҳам қайта ёзишни талаб қиларди. Ранг эса
 * ёлғиз маъно ташувчи эмас: сон ҳар бир ёрлиқда (`Чирчиқ шаҳри · 63 та`),
 * карточкада ва легендада ҳам ёзилади.
 *
 * Чегаралар жонли тақсимотдан: 63 · 26 | 14 | 3×3, 2×7 | 1×7.
 */
interface Bucket {
  key: string;
  min: number;
  /** Карточка устидаги белги — қисқа бўлиши ШАРТ (бир қаторга сиғади). */
  name: string;
  /** Легендадаги оралиқ. */
  range: string;
  color: MarkerColor;
}

const BUCKETS: Bucket[] = [
  { key: "xl", min: 20, name: "Йирик тўплам", range: "20 та ва ундан кўп", color: "gold" },
  { key: "l", min: 5, name: "Ўрта тўплам", range: "5–19 та", color: "purple" },
  { key: "m", min: 2, name: "Кичик тўплам", range: "2–4 та", color: "cyan" },
  { key: "s", min: 1, name: "Якка лойиҳа", range: "1 та", color: "turquoise" },
];

const bucketOf = (n: number): Bucket => BUCKETS.find((b) => n >= b.min) ?? BUCKETS[BUCKETS.length - 1];

/* -------------------------------------------------------------------------- */
/* view-model                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Нуқтадаги битта КЛАСТЕР блоки — модал ойнадаги гуруҳ.
 *
 * Гуруҳлаш айнан кластер бўйича, чунки Чирчиқ нуқтасидаги 63 лойиҳа тўртта
 * кластерга тегишли (R&D парк 42, Рақамлаштириш 11, Технопарк 7, Кадрлар 3)
 * ва текис рўйхатда улар бир-биридан ажралмасди. Йўналиш бу ерда САРЛАВҲА
 * эмас, ҳар бир қаторнинг ўз ичида — 144 лойиҳанинг 65 тасида у умуман йўқ,
 * яъни йўналиш бўйича иккинчи даража кўп жойда бўш гуруҳ ясаган бўларди.
 */
export interface RegMapPlaceGroup {
  key: string;
  cluster: string;
  clusterNo: string | null;
  projects: number;
  /** Ҳисобланган йиғинди; бирорта лойиҳада ҳам қиймат бўлмаса `null`. */
  totalCost: number | null;
  /** Нечта лойиҳада қиймат кўрсатилган — йиғинди ёлғиз ўзи ёзилмайди. */
  totalCostFilled: number;
  jobs: number | null;
  jobsFilled: number;
  rows: RegProject[];
}

/**
 * Битта нуқта — унинг тўлиқ ҳолати ва ундаги БАРЧА лойиҳалар.
 *
 * ⚠️ Бу рўйхат ҳеч қаерда кесилмайди. Аввал нуқта фақат харита устидаги
 * кичик карточкада кўринарди ва у олтита номдан кейин «яна 57 та» деб
 * тўхтарди — 63 лойиҳали нуқтада бу экрандаги маълумотнинг 90% ини
 * яширарди. Энди маркер босилганда модал ойна очилади ва у шу тузилмани
 * бошидан охиригача чизади.
 */
export interface RegMapPlace {
  /** `RegProject.placeKey` — `"<lat>,<lon>"`. */
  key: string;
  /** Тўлиқ каноник ном (КИРИЛЛ). */
  name: string;
  /** Ёрлиқдаги қисқа ном — «Тошкент вилояти, Чирчиқ шаҳри» → «Чирчиқ шаҳри». */
  short: string;
  /** Даража номи (`BUCKETS`) ва унинг ранги — легенда билан бир хил. */
  bucket: string;
  token: string;
  lat: number;
  lon: number;
  projects: number;
  clusters: number;
  totalCost: number | null;
  totalCostFilled: number;
  jobs: number | null;
  jobsFilled: number;
  /** Шу нуқтада манбада бир нечта ҳудуд аталган лойиҳалар сони. */
  multiRegion: number;
  groups: RegMapPlaceGroup[];
}

/** Легенданинг битта қатори: ранг → даража → нечта нуқта ва нечта лойиҳа. */
export interface RegMapBucket {
  key: string;
  name: string;
  range: string;
  token: string;
  /** Шу даражадаги нуқталар сони. */
  places: number;
  /** Шу нуқталардаги лойиҳалар сони. */
  projects: number;
}

/** Харитага тушмаган лойиҳалар — САБАБИ бўйича гуруҳ. */
export interface RegMapOffGroup {
  key: string;
  /** Манбадаги «Ҳудуди» матни (КИРИЛЛ); `null` — устун бўш. */
  region: string | null;
  /** Нега нуқта йўқ — `REG_COORDS_REASON` дан. */
  reason: string;
  /**
   * `true` — бу БАЖАРИЛМАГАН ИШ (бэкенд жадвалида матн йўқ ёки координата
   * базага тушмаган), `false` — ҳал қилинган ҳолат (матн ҳудуд эмас).
   * Иккови бир хил кўрсатилмайди.
   */
  actionable: boolean;
  rows: RegProject[];
}

export interface RegMapVM {
  /** Маркер расмининг нисбати — экранда чўзилмаслиги учун. */
  markerRatio: number;
  /** Лангар нуқтаси, баландликнинг улуши сифатида. */
  markerAnchorY: number;
  pins: MapPin[];
  /**
   * Ҳар бир маркернинг ортидаги тўлиқ мазмун — `pins` билан БИР ХИЛ
   * тартибда ва бир хил калитда (`MapPin.id` === `RegMapPlace.key`).
   * Маркер босилганда очиладиган ойна шу ердан ўқийди.
   */
  placeList: RegMapPlace[];
  /** Харитадаги ўзгача нуқталар сони. */
  places: number;
  /** Нуқта сифатида кўрсатилган лойиҳалар сони. */
  onMap: number;
  /** Харитага умуман тушмаганлар — сабаби бўйича гуруҳланган. */
  offMap: RegMapOffGroup[];
  offCount: number;
  buckets: RegMapBucket[];
  /**
   * Манбада БИР НЕЧТА ҳудуд аталган лойиҳалар сони — уларнинг нуқтаси
   * биринчи ҳудудники, қолгани харитада кўринмайди.
   */
  multiRegion: number;
  /** Энг зич нуқтадаги лойиҳалар сони — «сонлар аралашмасин» изоҳи учун. */
  densest: number;
}

/* -------------------------------------------------------------------------- */
/* ёрдамчилар                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ёрлиқ учун қисқа жой номи: «Тошкент вилояти, Чирчиқ шаҳри» → «Чирчиқ шаҳри».
 *
 * Вилоят номи ёрлиқда такрорланса, зич жойда (Тошкент вилоятида тўртта
 * нуқта бор) ёрлиқларнинг ярми бир хил бошланиб, ажратиб бўлмай қоларди.
 * Тўлиқ ном йўқолмайди — у карточкада ва маркернинг изоҳида турибди.
 */
function shortPlace(place: string): string {
  const i = place.lastIndexOf(",");
  return (i === -1 ? place : place.slice(i + 1)).trim();
}

/** Йиғинди; бирорта қиймат бўлмаса `null` — «0» билан тўлдирилмайди. */
function sumOrNull(values: Array<number | null>): number | null {
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length === 0) return null;
  return Number(nums.reduce((s, v) => s + v, 0).toFixed(2));
}

const field = (k: string, v: string | null, num = false): MapField | null =>
  v === null ? null : { k, v, num };

/**
 * Сон + «нечта лойиҳадан ҳисобланган».
 *
 * Реестр нотекис тўлдирилган, шунинг учун йиғинди ёнида доим нечта
 * лойиҳадан олингани туради: 63 тадан 41 тасида иш ўрни кўрсатилган бўлса,
 * «12 400 та» деб ёзиб қўйиш ҳамма лойиҳа ҳисобга олингандай кўринарди.
 */
function sumField(k: string, rows: Array<number | null>, unit: string): MapField | null {
  const total = sumOrNull(rows);
  if (total === null) return null;
  const filled = rows.filter((v) => v !== null).length;
  const from = filled < rows.length ? ` · ${nf(filled)}/${nf(rows.length)} лойиҳадан` : "";
  return { k, v: `${exact(total)} ${unit}${from}`, num: true };
}

/**
 * Нуқтадаги лойиҳаларни КЛАСТЕР бўйича гуруҳлаш — модал ойна учун.
 *
 * ⚠️ Бу ерда ҳеч қандай чегара ЙЎҚ: нечта лойиҳа бўлса шунчаси қайтади ва
 * ном ҳам қисқартирилмайди. Аввалги карточка олтита номдан кейин «яна N та»
 * деб тўхтарди, чунки у хаританинг ичида, ундан баланд бўлолмайдиган
 * элемент эди. Ойна эса саҳифанинг устида турибди ва ўз ичида сурилади,
 * яъни чегаранинг сабаби ҳам йўқолди.
 *
 * Тартиб — манбадаги тартиб: кластер қайси лойиҳада биринчи учраса шу ерда
 * туради, яъни реестрнинг ўз рақамлаши (I, II, III…) сақланади.
 */
function clusterGroups(rows: RegProject[]): RegMapPlaceGroup[] {
  const order: string[] = [];
  const by = new Map<string, RegProject[]>();

  for (const p of rows) {
    if (!by.has(p.cluster)) {
      by.set(p.cluster, []);
      order.push(p.cluster);
    }
    by.get(p.cluster)?.push(p);
  }

  return order.map((cluster) => {
    const list = by.get(cluster) ?? [];
    return {
      key: cluster,
      cluster,
      clusterNo: list[0]?.clusterNo ?? null,
      projects: list.length,
      totalCost: sumOrNull(list.map((p) => p.totalCost)),
      totalCostFilled: list.filter((p) => p.totalCost !== null).length,
      jobs: sumOrNull(list.map((p) => p.jobs)),
      jobsFilled: list.filter((p) => p.jobs !== null).length,
      rows: list,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* асосий функция                                                              */
/* -------------------------------------------------------------------------- */

export function registryMapVM(projects: RegProject[], baseUrl: string): RegMapVM {
  // Тартиб — манбадаги тартиб: нуқта биринчи марта қайси лойиҳада учраса,
  // маркерлар ҳам шу тартибда ясалади. Сонга боғланмагани учун маълумот
  // ўзгарганда харита сакрамайди.
  const order: string[] = [];
  const byPlace = new Map<string, RegProject[]>();
  const offOrder: string[] = [];
  const offGroups = new Map<string, RegProject[]>();

  let multiRegion = 0;

  for (const p of projects) {
    if (p.coordsPlaceCount > 1) multiRegion += 1;

    if (p.placeKey === null) {
      // Сабаб бўйича гуруҳ: манбадаги матн + ҳолат. Иккови ҳам керак —
      // «Аниқланмокда» ва «Республика худудида» бир хил ҳолатда, лекин
      // бошқа-бошқа матн, ва уларни аралаштириш маънони йўқотарди.
      const key = `${p.coordsStatus}||${p.region ?? ""}`;
      if (!offGroups.has(key)) {
        offGroups.set(key, []);
        offOrder.push(key);
      }
      offGroups.get(key)?.push(p);
      continue;
    }

    if (!byPlace.has(p.placeKey)) {
      byPlace.set(p.placeKey, []);
      order.push(p.placeKey);
    }
    byPlace.get(p.placeKey)?.push(p);
  }

  const pins: MapPin[] = [];
  const placeList: RegMapPlace[] = [];
  const bucketStat = new Map<string, { places: number; projects: number }>();
  let onMap = 0;
  let densest = 0;

  for (const key of order) {
    const rows = byPlace.get(key) ?? [];
    const head = rows[0];
    // `placeKey` айнан `lat`/`lon` дан ясалган, яъни бу ерда иккови ҳам бор.
    if (!head || head.lat === null || head.lon === null) continue;

    const n = rows.length;
    onMap += n;
    if (n > densest) densest = n;

    const bucket = bucketOf(n);
    const stat = bucketStat.get(bucket.key) ?? { places: 0, projects: 0 };
    stat.places += 1;
    stat.projects += n;
    bucketStat.set(bucket.key, stat);

    // Каноник жой номи бэкендда ҳисобланган; у бўлмаса — манбадаги хом матн,
    // у ҳам бўлмаса нуқтанинг ўзи. Ҳеч қачон «номсиз» қолмайди.
    const place = head.coordsPlace ?? head.region ?? `${head.lat}, ${head.lon}`;
    const clusters = new Set(rows.map((p) => p.cluster));
    const multiHere = rows.filter((p) => p.coordsPlaceCount > 1).length;

    placeList.push({
      key,
      name: place,
      short: shortPlace(place),
      bucket: bucket.name,
      token: MARKER_TOKEN[bucket.color],
      lat: head.lat,
      lon: head.lon,
      projects: n,
      clusters: clusters.size,
      totalCost: sumOrNull(rows.map((p) => p.totalCost)),
      totalCostFilled: rows.filter((p) => p.totalCost !== null).length,
      jobs: sumOrNull(rows.map((p) => p.jobs)),
      jobsFilled: rows.filter((p) => p.jobs !== null).length,
      multiRegion: multiHere,
      groups: clusterGroups(rows),
    });

    const rowFields: Array<MapField | null> = [
      field("Лойиҳалар", `${nf(n)} та`, true),
      sumField("Умумий қиймати", rows.map((p) => p.totalCost), "млн $"),
      sumField("Иш ўринлари", rows.map((p) => p.jobs), "та"),
      field("Кластерлар", `${nf(clusters.size)} та`, true),
      field(
        "Бир нечта ҳудуд",
        multiHere > 0 ? `${nf(multiHere)} лойиҳада — нуқта биринчисиники` : null,
      ),
    ];

    pins.push({
      id: key,
      type: "registry",
      layerName: bucket.name,
      name: place,
      short: `${shortPlace(place)} · ${nf(n)} та`,
      // Карточканинг устки кичик сарлавҳаси — энг муҳим сон шу ерда туради.
      region: `${nf(n)} лойиҳа`,
      color: bucket.color,
      token: MARKER_TOKEN[bucket.color],
      icon: `${baseUrl}marker/marker-${bucket.color}.png`,
      // Координата базадан АЙНАН шундайлигича: силжиш ҳам, тахмин ҳам йўқ.
      lon: head.lon,
      lat: head.lat,
      place: {
        // Реестрда аниқлик ДОИМ `region` — нуқта маъмурий марказ, шунинг
        // учун ҳар бир маркер узуқ ҳалқа билан белгиланади. Бу яширилмайди:
        // акс ҳолда харита ёлғон аниқлик ваъда қиларди.
        approx: true,
        short: "нуқта — маъмурий марказ, лойиҳанинг ўз жойи эмас",
        text:
          "Координата реестрнинг «Ҳудуди» устунидаги матндан аниқланган: у туман " +
          "ёки шаҳар маркази, лойиҳанинг аниқ жойи эмас.",
      },
      // Нуқтанинг ЙИҒМА ҳолати. У ойнанинг сарлавҳасидаги сонлар билан бир
      // хил манбадан ҳисобланади — иккови ҳеч қачон ажралиб қолмайди.
      rows: rowFields.filter((r): r is MapField => r !== null),
      // Лойиҳа НОМЛАРИ бу ерда атайин ЙЎҚ. Улар харита устидаги кичик
      // карточкага сиғмасди ва «яна 57 та» деб кесиларди; энди тўлиқ рўйхат
      // маркер босилганда очиладиган ойнада (`RegistryPlaceModal`), яъни
      // кесиладиган жойнинг ўзи қолмади.
      links: [],
      // Ёрлиқ тўқнашганда катта тўплам сақланиб қолади: у кўпроқ маълумот
      // ташийди ва зич жойда унинг йўқолиши энг кўп зарар берарди.
      weight: n,
    });
  }

  const buckets: RegMapBucket[] = BUCKETS.filter((b) => bucketStat.has(b.key)).map((b) => {
    const stat = bucketStat.get(b.key) ?? { places: 0, projects: 0 };
    return {
      key: b.key,
      name: b.name,
      range: b.range,
      token: MARKER_TOKEN[b.color],
      places: stat.places,
      projects: stat.projects,
    };
  });

  const offMap: RegMapOffGroup[] = offOrder.map((key) => {
    const rows = offGroups.get(key) ?? [];
    const head = rows[0];
    const status = head?.coordsStatus ?? "missing";
    // Матн ТАНИЛГАН (каноник жой топилган), лекин базада координата бўш —
    // бу «жой эмас» эмас, базада бажарилмаган иш. Иккови бир хил ёзилмайди.
    // Жонли жавобда бундай ҳолат ҳозирча йўқ (`pendingBackfill` бўш).
    const pending = (head?.coordsPlace ?? null) !== null;
    return {
      key,
      region: head?.region ?? null,
      reason: pending
        ? "⚠ ҳудуд танилган, лекин базада координата бўш — бэкендда тўлдирилиши керак"
        : REG_COORDS_REASON[status],
      actionable: pending || status === "unknown",
      rows,
    };
  });

  return {
    markerRatio: MARKER_ASSET_WIDTH / MARKER_ASSET_HEIGHT,
    markerAnchorY: MARKER_ANCHOR_Y,
    pins,
    placeList,
    places: pins.length,
    onMap,
    offMap,
    offCount: offMap.reduce((s, g) => s + g.rows.length, 0),
    buckets,
    multiRegion,
    densest,
  };
}

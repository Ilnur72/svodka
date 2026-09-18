import type { MapItem, MapItemType, MapObjectsResponse } from "../../api/types";
import { exact, pctTxt } from "../format";
import {
  LAYER_COLOR,
  LAYER_COLOR_FALLBACK,
  LAYER_NAME,
  MARKER_ANCHOR_Y,
  MARKER_ASSET_HEIGHT,
  MARKER_ASSET_WIDTH,
  MARKER_TOKEN,
  type MarkerColor,
} from "../map/markers";
import { USD } from "./invest";

/**
 * «Лойиҳалар харитаси» саҳифаси учун view-model.
 *
 * Панел API тузилмасини БИЛМАЙДИ: у фақат шу файл тайёрлаган рўйхатни олади.
 * Жавоб шакли ўзгарса — шу файл тузатилади, `MapCanvas` тегилмайди.
 *
 * ═══ Манба энди бэкенд ══════════════════════════════════════════════════
 *
 * Аввалги `adapters/investMap.ts` бандл ичидаги реестрдан (`investSource.ts`)
 * ва қўлда ёзилган координата жадвалидан 7 та нуқта ясарди. Энди манба —
 * `GET /map/objects`: 55 объект, уччала қатлам аралаш
 * (2 завод, 46 геология, 7 инвестиция).
 *
 * ═══ Кирилл — биринчи навбатда ══════════════════════════════════════════
 *
 * `?lang=uz` сўралганда ҳам `name`/`region` ЛОТИН келади, кириллчаси эса
 * `nameCyrillic`/`regionCyrillic` да. Сводка бутунлай кирилл, шунинг учун
 * ҳамма жойда `cyr()` ишлатилади: кириллчаси бўлса ўша, бўлмаса лотинчаси
 * (жимгина бўш қолдирилмайди). Жонли жавобда `nameCyrillic` 55/55 тўлган,
 * `regionCyrillic` эса 5 та геология лойиҳасида `null`.
 *
 * ═══ Ҳеч нарса жимгина йўқолмайди ═══════════════════════════════════════
 *
 * Координатаси йўқ объект (жонли жавобда 8 та, ҳаммаси геология) харитага
 * нуқта сифатида тушмайди, лекин `offMap` рўйхатида қолади ва экранда очиқ
 * кўрсатилади. Жадвалда йўқ қатлам захира рангда чизилади ва легендада
 * «жадвалда йўқ қатлам» бўлиб санаб ўтилади.
 */

/* -------------------------------------------------------------------------- */
/* `detail` дан хавфсиз ўқиш                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `detail` — `Record<string, unknown>`, яъни турга қараб таркиби бошқача.
 * Ундан `as` билан мажбурлаб ўқиш нотўғри тур учун жимгина `undefined`
 * берарди, экранда эса у «маълумот йўқ» бўлиб кўринарди. Шунинг учун ҳар
 * бир ўқиш ТИП ТЕКШИРУВИДАН ўтади.
 */
function str(detail: Record<string, unknown>, key: string): string | null {
  const v = detail[key];
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function num(detail: Record<string, unknown>, key: string): number | null {
  const v = detail[key];
  return typeof v === "number" && isFinite(v) ? v : null;
}

/**
 * Кириллча шакл афзал, бўлмаса лотинчаси, у ҳам бўлмаса `null`.
 * Иккови ҳам бўш бўлганда чақирувчи ўзи ўрнини тўлдиради.
 */
const cyr = (cyrillic: string | null, latin: string | null): string | null =>
  (cyrillic ?? "").trim() || (latin ?? "").trim() || null;

/** `detail` даги `<key>Cyrillic` / `<key>` жуфтлиги. */
const detailCyr = (detail: Record<string, unknown>, key: string): string | null =>
  cyr(str(detail, `${key}Cyrillic`), str(detail, key));

/* -------------------------------------------------------------------------- */
/* view-model                                                                  */
/* -------------------------------------------------------------------------- */

/** Карточкадаги битта қатор. `num` — қиймат моноширинали ёзилсинми. */
export interface MapField {
  k: string;
  v: string;
  num: boolean;
}

/**
 * Жойлашув аниқлиги — карточкада ОЧИҚ айтилади.
 *
 * Уччала ҳолат бир хил эмас ва бир хил матн билан ёзилмайди:
 * аниқ координата · вилоят маркази (тахмин) · боғланган объектдан мерос.
 */
export interface MapPlaceNote {
  /** `true` — нуқта тахминий, яъни объект айнан шу ерда ЭМАС. */
  approx: boolean;
  /** Карточкадаги тўлиқ изоҳ. */
  text: string;
  /** Маркер остидаги қисқа белги матни (`aria-label` учун). */
  short: string;
}

/**
 * Маркернинг МАНБАСИ.
 *
 * `GET /map/objects` нинг уччала қатлами (`MapItemType`) устига `registry`
 * қўшилган: «Лойиҳалар реестри» бўлимидаги харита ҳам АЙНАН шу `MapPin` ва
 * `MapCanvas` дан фойдаланади, лекин унинг манбаси бошқа endpoint
 * (`/project-registry/dashboard`) ва унда битта маркер — битта объект эмас,
 * **битта нуқтадаги лойиҳалар тўплами** (қаранг: `adapters/registryMap.ts`).
 *
 * Тур `MapCanvas` да фақат битта жойда ишлатилади — карточкадаги «Батафсил →»
 * ҳаволаси жадвалида. `registry` учун у жадвалда ЙЎҚ, яъни ҳавола умуман
 * чизилмайди: реестр харитаси ўз бўлимининг ичида туради, «батафсил» эса
 * маркер босилганда пастдаги рўйхат фильтрланиши билан берилади.
 */
export type MapPinSource = MapItemType | "registry";

/** Харитадаги битта маркер. */
export interface MapPin {
  id: string;
  type: MapPinSource;
  /** Қатламнинг экрандаги номи — карточка устидаги кичик сарлавҳа. */
  layerName: string;
  /** Тўлиқ ном (кирилл). */
  name: string;
  /** Маркер ёрлиғи учун қисқартирилган ном. */
  short: string;
  /** Ҳудуд (кирилл). Манбада бўлмаса — очиқ «кўрсатилмаган». */
  region: string;
  color: MarkerColor;
  token: string;
  icon: string;
  /** КЎРСАТИШ учун нуқта — бэкенд керак бўлса силжитиб берган. */
  lon: number;
  lat: number;
  place: MapPlaceNote;
  /** Карточкадаги қаторлар — бўш қийматлар олиб ташланган. */
  rows: MapField[];
  /** Боғланган бошқа объектлар номи — карточка остида. */
  links: string[];
  /**
   * `links` рўйхатининг сарлавҳаси. Берилмаса — «Боғланган объектлар»
   * (`/map/objects` даги эвристик боғланиш).
   *
   * ⚠️ Реестр харитасида бу рўйхат бошқа нарса: у ЭВРИСТИК боғланиш эмас,
   * шу нуқтадаги лойиҳаларнинг ўз номлари. Иккови бир хил сарлавҳа остида
   * чиқса, тахмин ўлчанган маълумотдай кўринарди.
   */
  linksTitle?: string;
  /**
   * Ёрлиқ тўқнашганда кимни сақлаб қолиш кераклиги: катта сон — устунроқ.
   * Қаранг: `MapCanvas` → `layoutLabels()`.
   */
  weight: number;
}

/** Легенданинг битта қатори: ранг → қатлам номи → нечта объект. */
export interface MapLegendItem {
  type: MapItemType;
  name: string;
  color: MarkerColor;
  token: string;
  /** Харитада нуқта сифатида кўринадиганлар сони. */
  count: number;
  /** Шу қатламда координатаси йўқ объектлар сони. */
  offCount: number;
  /** Қатлам ранг жадвалида йўқ — захира рангда чизилган. */
  unknown: boolean;
}

/** Харитага тушмаган объект — рўйхатда қолади. */
export interface MapOffItem {
  id: string;
  type: MapItemType;
  layerName: string;
  name: string;
  region: string;
  token: string;
}

export interface MapVM {
  /** Маркер расмининг нисбати — экранда чўзилмаслиги учун. */
  markerRatio: number;
  /** Лангар нуқтаси, баландликнинг улуши сифатида. */
  markerAnchorY: number;
  pins: MapPin[];
  legend: MapLegendItem[];
  offMap: MapOffItem[];
  /** Жавобдаги жами объектлар сони (координатасизлар билан бирга). */
  total: number;
  /** Бэкенд ҳисоблаган «координатаси йўқ» сони — ўз ҳисобимиз билан солиштирилади. */
  withoutCoords: number;
  /** Тахминий жойлашувдаги объектлар сони (вилоят маркази ёки мерос). */
  approxCount: number;
  /** Бэкенд устма-уст тушмаслиги учун силжитган объектлар сони. */
  displacedCount: number;
  /**
   * ВАҚТИНЧАЛИК зaвод фильтри ҳақида огоҳлантириш. Бэкенд демо ёзувларни
   * тозалагач бу майдонлар жавобдан йўқолади ва бу ерда `null` бўлади.
   */
  factoryNote: string | null;
}

/* -------------------------------------------------------------------------- */
/* ном ва ҳудуд                                                                */
/* -------------------------------------------------------------------------- */

const NO_REGION = "ҳудуд кўрсатилмаган";
const NO_NAME = "номсиз объект";

/**
 * Ёрлиқ учун қисқа ном.
 *
 * Жонли жавобда ном узунлиги 11 дан 86 белгигача (медиана 26). Узун ном
 * ёрлиқда бутун экранни эгаллаб кетарди, шунинг учун у **сўз чегарасида**
 * кесилади ва «…» қўшилади. Тўлиқ ном йўқолмайди: у карточкада, ён
 * рўйхатда ва маркернинг `title` сида тўлиқ туради.
 *
 * Чегара 26 белги — ўлчов: 12,5px қалин шрифтда бу ≈ 165 px. Сон экранда
 * танланган: 34 белгида (≈210 px) бошланғич зумда 47 ёрлиқдан атиги 5 таси
 * сиғарди, 26 да эса икки баробар кўп. Тўлиқ ном йўқолмайди — у карточкада,
 * рўйхатда ва маркернинг изоҳида турибди.
 */
const LABEL_MAX = 26;

function shorten(name: string): string {
  if (name.length <= LABEL_MAX) return name;
  const cut = name.slice(0, LABEL_MAX);
  const sp = cut.lastIndexOf(" ");
  // Сўз чегараси жуда бошида бўлса (битта узун сўз) — шундайлигича кесамиз.
  return (sp > LABEL_MAX * 0.6 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

/* -------------------------------------------------------------------------- */
/* жойлашув аниқлиги                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Нуқта қанчалик ишончли эканини матнга айлантиради.
 *
 * Иккита майдон БИРГА ўқилади: нуқта қаердан олингани (`coordsSource`) ва у
 * қанчалик аниқ (`coordsAccuracy`). Учинчиси — `coordsDisplaced` — маълумот
 * сифати эмас, КЎРСАТИШ ҳақида: бэкенд устма-уст тушган белгиларни атайин
 * ажратган. Уччаласи ҳам яширилмайди.
 */
function placeOf(item: MapItem): MapPlaceNote {
  const shift = item.coordsDisplaced
    ? " Белгилар устма-уст тушмаслиги учун нуқта бир оз силжитилган."
    : "";

  if (item.coordsSource === "linked") {
    return {
      approx: true,
      short: "жой — боғланган объектдан олинган тахмин",
      text:
        "Жой ТАХМИНИЙ: координата боғланган объектдан мерос қилиб олинган, " +
        "объектнинг ўз координатаси базада йўқ." +
        shift,
    };
  }
  if (item.coordsAccuracy === "region") {
    return {
      approx: true,
      short: "жой — вилоят маркази, тахминий",
      text:
        "Жой ТАХМИНИЙ: базада вилоят маркази турибди, объект айнан шу нуқтада эмас." +
        shift,
    };
  }
  if (item.coordsAccuracy === "exact") {
    return {
      approx: false,
      short: "жой — аниқ координата",
      text: "Базадаги аниқ объект координатаси." + shift,
    };
  }
  // `own` + аниқлик эълон қилинмаган: нуқта объектники, лекин у қанчалик
  // аниқлиги базада ёзилмаган — буни «аниқ» деб кўрсатиш нотўғри бўларди.
  return {
    approx: true,
    short: "жой — аниқлиги кўрсатилмаган",
    text: "Объектнинг ўз координатаси, лекин базада унинг аниқлиги кўрсатилмаган." + shift,
  };
}

/* -------------------------------------------------------------------------- */
/* карточка қаторлари — турга қараб                                            */
/* -------------------------------------------------------------------------- */

const field = (k: string, v: string | null, isNum = false): MapField | null =>
  v === null ? null : { k, v, num: isNum };

const money = (v: number | null): string | null => (v === null ? null : `${exact(v)} ${USD}`);

/**
 * Карточка қаторлари. Ҳар бир турда БОШҚА қаторлар, чунки манба жадваллари
 * бошқа: инвестицияда молия ва иш ўринлари, геологияда фойдали қазилма ва
 * гуруҳ, заводда техник ҳолат.
 *
 * Бўш қиймат қатор сифатида чизилмайди — «—» билан тўлган жадвал маълумот
 * бермайди, фақат карточкани узайтиради. Йўқолиш эмас: майдон манбада бўш.
 *
 * ⚠️ `elements[]` ИШЛАТИЛМАЙДИ: жонли жавобда у 55 объектнинг ҳаммасида бўш.
 * Геологияда металл номлари `detail.mineralCyrillic` / `metalsCyrillic` да
 * эркин матн ҳолида туради — шунинг учун улар ўқилади.
 */
function rowsOf(item: MapItem, region: string): MapField[] {
  const d = item.detail;
  const status = cyr(item.statusCyrillic, item.status);
  let rows: (MapField | null)[];

  if (item.type === "invest") {
    const start = detailCyr(d, "startDateText");
    const end = detailCyr(d, "endDateText");
    rows = [
      field("Иш тури", detailCyr(d, "kind")),
      field("Умумий қиймати", money(item.costMlnUsd), true),
      field("Ўзлаштирилган", money(num(d, "disbursedMlnUsd")), true),
      // `progress` — УЛУШ (0…1), фоиз эмас: 100 га кўпайтирилади.
      field("Бажарилиш", item.progress === null ? null : pctTxt(item.progress * 100), true),
      field("Иш ўринлари", num(d, "jobs") === null ? null : `${exact(num(d, "jobs"))} та`, true),
      field("Маҳсулот", detailCyr(d, "product")),
      field("Муддат", start && end ? `${start} – ${end}` : (start ?? end)),
      field("Ҳолат", status),
    ];
  } else if (item.type === "geology") {
    rows = [
      field("Гуруҳ", detailCyr(d, "groupName") ?? status),
      field("Туркум", detailCyr(d, "category")),
      field("Фойдали қазилма", detailCyr(d, "mineral") ?? detailCyr(d, "metals")),
      field("Қиймати", money(item.costMlnUsd), true),
      field("Молиялаштириш", detailCyr(d, "funding")),
      field("Тугаш йили", num(d, "endYear") === null ? null : String(num(d, "endYear")), true),
      field("Туман", detailCyr(d, "district")),
    ];
  } else {
    rows = [
      field("Ҳолат", status),
      field("Бажарилиш", item.progress === null ? null : pctTxt(item.progress * 100), true),
      field("Корхона", detailCyr(d, "enterpriseName")),
      field("Объект тури", detailCyr(d, "objectType")),
      field("Мақсад", detailCyr(d, "projectGoal")),
    ];
  }

  rows.push(field("Ҳудуд", region));
  return rows.filter((r): r is MapField => r !== null);
}

/* -------------------------------------------------------------------------- */
/* асосий функция                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Ёрлиқ тўқнашганда устунлик. Аниқ координатали объект тахминийсидан
 * устун: унинг нуқтаси ҳақиқатан шу ерда, яъни ёрлиғи ҳам тўғри жойда.
 * Қатлам ҳам ҳисобга олинади — заводлар иккита, улар йўқолиб қолмасин.
 */
function weightOf(item: MapItem): number {
  const layer = item.type === "factory" ? 300 : item.type === "invest" ? 200 : 100;
  const accurate = item.coordsAccuracy === "exact" ? 50 : 0;
  const own = item.coordsSource === "own" ? 10 : 0;
  return layer + accurate + own;
}

export function mapVM(res: MapObjectsResponse, baseUrl: string): MapVM {
  const pins: MapPin[] = [];
  const offMap: MapOffItem[] = [];
  // Легенда тартиби — жавобда қатлам БИРИНЧИ марта учраган тартиб: у сонга
  // боғланмайди, шунда маълумот ўзгарганда легенда сакрамайди.
  const legend = new Map<string, MapLegendItem>();

  let approxCount = 0;
  let displacedCount = 0;

  for (const item of res.items) {
    const known = item.type in LAYER_COLOR;
    const color = LAYER_COLOR[item.type] ?? LAYER_COLOR_FALLBACK;
    const token = MARKER_TOKEN[color];
    const layerName = LAYER_NAME[item.type] ?? item.type;
    const name = cyr(item.nameCyrillic, item.name) ?? NO_NAME;
    const region = cyr(item.regionCyrillic, item.region) ?? NO_REGION;

    let row = legend.get(item.type);
    if (!row) {
      row = { type: item.type, name: layerName, color, token, count: 0, offCount: 0, unknown: !known };
      legend.set(item.type, row);
    }

    // Координатаси йўқ объект харитага тушмайди, лекин ЙЎҚОЛМАЙДИ.
    if (item.lat === null || item.lon === null) {
      row.offCount += 1;
      offMap.push({ id: item.id, type: item.type, layerName, name, region, token });
      continue;
    }

    row.count += 1;
    if (item.coordsDisplaced) displacedCount += 1;

    const place = placeOf(item);
    if (place.approx) approxCount += 1;

    pins.push({
      id: item.id,
      type: item.type,
      layerName,
      name,
      short: shorten(name),
      region,
      color,
      token,
      icon: `${baseUrl}marker/marker-${color}.png`,
      // Бэкенд берган нуқта АЙНАН шундайлигича олинади: у устма-уст тушишни
      // ҳисобга олиб силжитилган бўлиши мумкин, фронтенд эса УСТИГА ҳеч
      // қандай силжиш қўшмайди (қаранг: `MapCanvas` даги лангар изоҳи).
      lon: item.lon,
      lat: item.lat,
      place,
      rows: rowsOf(item, region),
      links: item.links
        .map((l) => (l.name ?? "").trim())
        .filter((n) => n.length > 0),
      weight: weightOf(item),
    });
  }

  const meta = res.meta;
  const factoryNote =
    meta.factoryFilter === "real-only" && typeof meta.factoriesFiltered === "number"
      ? `завод жадвалидаги ${meta.factoriesFiltered} та демо ёзув сервер томонида фильтрланган`
      : null;

  return {
    markerRatio: MARKER_ASSET_WIDTH / MARKER_ASSET_HEIGHT,
    markerAnchorY: MARKER_ANCHOR_Y,
    pins,
    legend: [...legend.values()],
    offMap,
    total: res.summary.totalItems,
    withoutCoords: res.summary.withoutCoords,
    approxCount,
    displacedCount,
    factoryNote,
  };
}

import type { FilterSpecification, LngLatBoundsLike, MapOptions } from "maplibre-gl";

/**
 * «Лойиҳалар харитаси» — MapLibre стили ва бошланғич кўриниши.
 *
 * ═══ Нега бу ерда ═══════════════════════════════════════════════════════
 *
 * Стил — катта статик объект: у панелнинг ичида турса, React мантиғи
 * қатламлар рўйхати остида кўринмай қоларди. Шунинг учун у `lib/invest/`
 * да, маркер координаталари ёнида: иккови ҳам «харита нимадан ясалади»
 * саволига жавоб беради, панел эса фақат уларни ишлатади.
 *
 * ═══ Кўриниш қаердан ════════════════════════════════════════════════════
 *
 * Мақсад — аввалги статик расмдаги кўриниш: тунги сунъий йўлдош ёруғлиги,
 * кўк дарёлар, оқ ёрқин чегара, 3D перспектива. Ҳар бир қиймат прототипда
 * (headless браузерда уч марта чизиб солиштириб) танланган ва бу ерга
 * ўзгаришсиз кўчирилган. Уларни «чиройли кўринсин» деб ўзгартиришдан олдин
 * қуйидаги сабабларни ўқинг — ҳар бири синовда аниқланган:
 *
 *   · `night` (Black Marble) ПАСТДА, `hillshade` эса УСТИДА туради.
 *     Тескарисида рельеф бутунлай кўринмай кетади.
 *   · `hillshade-exaggeration: 0.45`. 0,9 да тоғлар оқариб, шаҳар
 *     ёруғликларини босиб қўяди.
 *   · Сув иккита қатлам: тўқ ичи (`#0a2c4d`) ва ёрқин кўк контур
 *     (`#3fd0ff`). Расмдаги кўриниш айнан шундай — ичи тўқ, чети ёрқин.
 *   · Ном майдони `name:ru` → `name:uz` → `name:en` → `name` тартибида.
 *     Фолбексиз айрим объектларда араб ва хитой ёзуви чиқади.
 *   · `night` нинг шаффофлиги z11 да 0,45 га тушади: Black Marble z8 дан
 *     кейин буланади, юқори зумда унинг ўрнини вектор йўллар босади.
 *
 * ═══ Аттрибуция — ўчирилмайди ═══════════════════════════════════════════
 *
 * Манбаларнинг ҳаммаси очиқ, лекин лицензия аттрибуцияни талаб қилади:
 * NASA GIBS · VIIRS Black Marble, OpenFreeMap, © OpenMapTiles ва
 * OpenStreetMap маълумотлари. `attributionControl` ўчирилмайди ва
 * ёзувлар CSS билан яширилмайди — фақат ихчам кўринишга келтирилади.
 */

/** Стил спецификацияси — типни MapLibre'нинг ўз `MapOptions` идан оламиз. */
type StyleSpec = Exclude<NonNullable<MapOptions["style"]>, string>;

/** Тунги ёруғлик — NASA GIBS, VIIRS Black Marble (2016 йил мозаикаси). */
const NIGHT_TILES =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png";

/** Рельеф — AWS Terrain Tiles, terrarium кодлашида. */
const DEM_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** Вектор маълумот — OpenFreeMap (OpenMapTiles сxемаси, калит талаб қилмайди). */
const VECTOR_URL = "https://tiles.openfreemap.org/planet";

/**
 * Ўзбекистоннинг OpenMapTiles'даги коди (ISO 3166-1 alpha-3). Чегара
 * қатламидаги `adm0_l`/`adm0_r` айнан шу шаклда келади — маълумотдан
 * ўқиб текширилган (қўшнилар: `KAZ`, `KGZ`, `TJK`, `TKM`, `AFG`).
 */
const UZ = "UZB";

/** Чегаранинг ҳеч бўлмаса бир томони Ўзбекистон бўлган бўлаклар. */
const UZ_BORDER: FilterSpecification = [
  "all",
  ["<=", "admin_level", 2],
  ["!=", "maritime", 1],
  ["any", ["==", "adm0_l", UZ], ["==", "adm0_r", UZ]],
];

export const INVEST_MAP_STYLE: StyleSpec = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    night: {
      type: "raster",
      tiles: [NIGHT_TILES],
      tileSize: 256,
      maxzoom: 8,
      attribution: "NASA GIBS · VIIRS Black Marble",
    },
    omt: { type: "vector", url: VECTOR_URL },
    // Битта DEM иккита манба бўлиб эълон қилинган: бири 3D рельеф учун,
    // иккинчиси соя қатлами учун. Прототипда битта эди ва MapLibre ҳар
    // юкланишда огоҳлантирарди («same source for a hillshade layer and for
    // 3D terrain») — иккови DEM плиткасидан бошқа-бошқа нарса кутади.
    // Плиткалар манзили бир хил, шунинг учун иккинчиси браузер кэшидан
    // келади: тармоққа қўшимча юк деярли йўқ.
    "dem-hill": {
      type: "raster-dem",
      tiles: [DEM_TILES],
      tileSize: 256,
      maxzoom: 12,
      encoding: "terrarium",
      attribution: "AWS Terrain Tiles",
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#070b1c" } },

    // Тунги ёруғлик — асосий кўриниш.
    {
      id: "night",
      type: "raster",
      source: "night",
      paint: {
        "raster-opacity": ["interpolate", ["linear"], ["zoom"], 3, 1, 8, 1, 11, 0.45],
        "raster-saturation": 0.3,
        "raster-contrast": 0.2,
      },
    },

    // Рельеф — ёруғлик УСТИДА: шунда тоғ соялари кўринади.
    {
      id: "hill",
      type: "hillshade",
      source: "dem-hill",
      paint: {
        "hillshade-exaggeration": 0.45,
        "hillshade-shadow-color": "#01030a",
        "hillshade-highlight-color": "#6d78ad",
        "hillshade-accent-color": "#1a2140",
      },
    },

    // Сув — тўқ ичи ва ёрқин кўк контур.
    {
      id: "water-glow",
      type: "fill",
      source: "omt",
      "source-layer": "water",
      paint: { "fill-color": "#0a2c4d", "fill-opacity": 0.75 },
    },
    {
      id: "water",
      type: "line",
      source: "omt",
      "source-layer": "water",
      paint: {
        "line-color": "#3fd0ff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.1, 10, 2.4],
        "line-opacity": 1,
      },
    },
    {
      id: "waterway",
      type: "line",
      source: "omt",
      "source-layer": "waterway",
      paint: {
        "line-color": "#3bb6f5",
        "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.5, 12, 2],
        "line-opacity": 0.75,
      },
    },

    // Йўллар — юқори зумда тунги ёруғликнинг ўрнини босади.
    {
      id: "road-glow",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      filter: ["in", "class", "motorway", "trunk", "primary"],
      minzoom: 4,
      paint: {
        "line-color": "#ff8a1e",
        "line-blur": 3,
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 2, 14, 10],
        "line-opacity": 0.45,
      },
    },
    {
      id: "road",
      type: "line",
      source: "omt",
      "source-layer": "transportation",
      filter: ["in", "class", "motorway", "trunk", "primary", "secondary"],
      minzoom: 5,
      paint: {
        "line-color": "#ffb85c",
        "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.5, 14, 3],
        "line-opacity": 0.8,
      },
    },

    // Чегаралар — давлат оқ ёрқин, вилоят ингичка узуқ чизиқ.
    {
      id: "b-region",
      type: "line",
      source: "omt",
      "source-layer": "boundary",
      filter: ["all", ["==", "admin_level", 4], ["!=", "maritime", 1]],
      paint: {
        "line-color": "#8fa0c4",
        "line-width": 0.7,
        "line-opacity": 0.45,
        "line-dasharray": [3, 2],
      },
    },
    /* ═══ Чегаралар: Ўзбекистон ва қолганлар ═══════════════════════════
       Бўлимнинг мавзуси — Ўзбекистондаги лойиҳалар, шунинг учун айнан унинг
       чегараси ажралиб туриши керак. Барча давлат чегараси бир хил ёрқин
       бўлса, экранда Қозоғистон, Туркманистон ва Тожикистон чегаралари ҳам
       худди шундай кўзга ташланиб, мамлакат контури йўқолиб кетади.

       Ажратиш `adm0_l`/`adm0_r` бўйича — чегаранинг икки томонидаги давлат
       коди (OpenMapTiles сxемаси, ISO3: `UZB`, `KAZ`, `KGZ`…). Ном бўйича
       эмас: ном ўнлаб тилда келади ва ишончсиз.

       Ўзбекистон чегараси УЧТА қатламдан: кенг сўнган ҳало, ундан тор ёрқин
       ҳало ва тиниқ оқ ўзак. Битта чизиқ билан бу кўриниш чиқмайди — у ё
       ингичка бўлиб йўқолади, ё қалинлашиб плиткани босиб қўяди.

       ⚠️ `line-blur` УЧАЛАСИДА ҲАМ НОЛ — атайин. Рельеф (`terrain`) ёқилганда
       MapLibre чизиқни 3D юзага ёпиштиради, `line-blur` эса ҳар бир қисқа
       сегментда алоҳида ҳисобланади: тоғли жойда чегара «чақмоқ» каби
       сачраган нурларга айланиб қоларди (Зарафшон тизмасида яққол кўринди).
       Юмшоқлик энди blur'дан эмас, қатламлашдан келади — кенг чизиқ паст
       тиниқликда, тор чизиқ юқорида.

       `line-join`/`line-cap: "round"` ҳам шу сабабдан: стандарт `miter`
       бурчаклари тоғ ёнбағрида тишли бўлиб кўринарди. */
    {
      id: "b-foreign",
      type: "line",
      source: "omt",
      "source-layer": "boundary",
      layout: { "line-join": "round", "line-cap": "round" },
      filter: [
        "all",
        ["<=", "admin_level", 2],
        ["!=", "maritime", 1],
        ["!=", "adm0_l", UZ],
        ["!=", "adm0_r", UZ],
      ],
      paint: {
        "line-color": "#9fb0cc",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.6, 9, 1.4],
        "line-opacity": 0.5,
      },
    },
    {
      id: "b-uz-halo",
      type: "line",
      source: "omt",
      "source-layer": "boundary",
      layout: { "line-join": "round", "line-cap": "round" },
      filter: UZ_BORDER,
      paint: {
        "line-color": "#ff6a12",
        "line-blur": 0,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 5.5, 9, 12],
        "line-opacity": 0.34,
      },
    },
    {
      id: "b-uz-glow",
      type: "line",
      source: "omt",
      "source-layer": "boundary",
      layout: { "line-join": "round", "line-cap": "round" },
      filter: UZ_BORDER,
      paint: {
        "line-color": "#ffa32c",
        "line-blur": 0,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 3, 9, 7],
        "line-opacity": 0.8,
      },
    },
    {
      id: "b-uz",
      type: "line",
      source: "omt",
      "source-layer": "boundary",
      layout: { "line-join": "round", "line-cap": "round" },
      filter: UZ_BORDER,
      paint: {
        "line-color": "#fff3cf",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.5, 9, 3.4],
        "line-opacity": 1,
      },
    },

    // Шаҳар ва шаҳарча номлари.
    {
      id: "place",
      type: "symbol",
      source: "omt",
      "source-layer": "place",
      filter: ["in", "class", "city", "town"],
      minzoom: 5,
      layout: {
        // Ном майдони: русча бўлмаса ўзбекча, у ҳам бўлмаса инглизча ёки
        // объектнинг ўз номи. Фолбексиз айрим жойда араб ва хитой ёзуви
        // чиқади. Ифода айнан шу ерда ёзилади — алоҳида ўзгарувчида турса
        // TypeScript уни оддий массив деб қабул қилади ва стил типига
        // мос келмайди (контекст типлаши фақат шу жойда ишлайди).
        "text-field": [
          "coalesce",
          ["get", "name:ru"],
          ["get", "name:uz"],
          ["get", "name:en"],
          ["get", "name"],
        ],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 11, 15],
      },
      /* Шаҳар номлари АТАЙИН сўнган: улар фон маълумоти. Лойиҳа ёрлиқлари
         эса оқ ва ҳошияли — бўлимнинг асосий мазмуни ўша. Иккови бир хил
         ёрқинликда бўлса, экранда «қайси ёзув лойиҳа?» деган савол туғилади. */
      paint: {
        "text-color": "#93a2bd",
        "text-halo-color": "#05070f",
        "text-halo-width": 1.5,
      },
    },
  ],
  /* ⚠️ 3D `terrain` АТАЙИН ЁҚИЛМАГАН.
     Ёқилганда иккита носозлик пайдо бўлади:
       · маркер зум пайтида «ўйнайди» — MapLibre уни рельеф юзасига қўяди,
         DEM плиткалари эса зум ўзгарганда қайта юкланади ва баландлик
         ўзгаради (ўлчанди: битта нуқтада z6→z12 да 473,6 → 466,9 м);
       · чегара тоғли жойда тишли бўлиб кетади — чизиқ 3D юзага ёпиштирилади
         ва ҳар бир қисқа сегмент ўз бурчагида синади.
     Рельеф кўриниши `hillshade` қатламида қолди: у 2D соя, камера
     қийшайиши (`pitch`) ҳам ишлайверади — экранда фарқ деярли сезилмайди,
     лекин иккита носозлик ҳам йўқолади. Қайта ёқишдан олдин юқоридаги
     иккисини ЭКРАНДА текширинг. */};

/**
 * Бошланғич кўриниш.
 *
 * `pitch` 3D перспективани беради (аввалги расмдаги кўриниш ҳам шундай эди),
 * `bearing` эса нол: шимол доим тепада қолиши керак, акс ҳолда харита
 * ўқилмас бўлади.
 *
 * Камера headless браузерда учта вариантни чизиб солиштириб танланган.
 * Прототипдаги `zoom: 5.15` жуда узоқ эди: кўринадиган бўйлама оралиқ 51°
 * чиқиб, Каспийдан Кашғаргача тушарди ва Ўзбекистон кадрнинг кичик бир
 * қисмида қоларди. `zoom: 6` да оралиқ 28° — Нукус, Фарғона водийси ва
 * Термиз кадрга сиғади, мамлакат эса кенгликнинг катта қисмини эгаллайди.
 * Марказ ҳам шунга кўра ўнгга ва пастга сурилган.
 */
export const INVEST_MAP_HOME = {
  center: [66.6, 40.2] as [number, number],
  zoom: 6,
  pitch: 52,
  bearing: 0,
};

/**
 * Зумнинг чегаралари.
 *
 * `MIN = 5.6` — бутун мамлакат кўринадиган даража. Бу сон АНИҚ танланган:
 * ундан пастда OpenMapTiles чегара плиткаларида `adm0_l`/`adm0_r` майдонлари
 * келмайди (соддалаштирилган геометрия, камроқ атрибут), шунинг учун
 * Ўзбекистонни ажратадиган фильтр ишламай, олов ранг чегара УЗИЛИБ кетарди.
 * Ўлчанди: z4,6 да фильтрга 11 бўлак тушади, z5,6 да 21, z6 да 24.
 * Шунинг учун бу чегарани пасайтириш — чегара кўринишини бузиш.
 *
 * `MAX = 16` — ундан кейин OpenMapTiles маълумоти тугайди ва фойда қолмайди.
 */
export const INVEST_MAP_MIN_ZOOM = 5.6;
export const INVEST_MAP_MAX_ZOOM = 16;

/**
 * Суриш чегараси — фойдаланувчи харитани Европага ёки Тинч океанга олиб
 * кетиб қўймаслиги учун.
 *
 * ═══ Нега таклиф қилинганидан кенгроқ ═══════════════════════════════════
 *
 * Аввалига `[[55, 36.5], [74.5, 46]]` (19,5° × 9,5°) таклиф қилинган эди.
 * Ҳисоб шуни кўрсатди: бошланғич зумда (5,15) 1520 px энли карточкада
 * кўринадиган бўйлама оралиқ
 *
 *   1520 / (512 · 2^5,15) · 360° ≈ 30,1°
 *
 * яъни таклиф қилинган чегарадан КЕНГ. MapLibre бундай ҳолда камерани
 * чегаранинг марказига (64,75°) мажбуран тортади — текширилган бошланғич
 * кўриниш (65,8°) силжиб кетарди ва суриш бутунлай қулфланарди.
 *
 * Шунинг учун чегара кенгайтирилди: `[[40, 22], [95, 55]]` (55° × 33°).
 * У 2560 px энли экранда ҳам (кўринадиган оралиқ ≈50,8°) камерани
 * қулфламайди, лекин Ўзбекистон ва қўшни минтақадан узоққа кетишга йўл
 * бермайди. Энг кичик зумда чегара кўриниш майдонидан кичик бўлиб қолади —
 * ўшанда MapLibre харитани марказга қотиради, бу кутилган хатти-ҳаракат.
 */
export const INVEST_MAP_BOUNDS: LngLatBoundsLike = [
  [40, 22],
  [95, 55],
];

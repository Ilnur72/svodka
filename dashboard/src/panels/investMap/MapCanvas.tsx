import { useCallback, useEffect, useRef, useState } from "react";
/**
 * ⚠️ MapLibre GL **5.x** да қотирилган — 6.x га кўтарилмайди.
 *
 * `maplibre-gl@6.9.1` (шу ёзув пайтидаги `latest`) Vite бандлида плиткаларни
 * умуман юкламайди: растр қатлам чизилади, вектор ва DEM эса ҳеч қачон
 * келмайди, `isStyleLoaded()` доим `false` қолади ва ХАТО БЕРИЛМАЙДИ —
 * шунинг учун бузилганини фақат экрандан билиш мумкин.
 *
 * Ўлчов (headless Chrome, Apple M4 Pro, ANGLE Metal):
 *   6.9.1 → 60 сонияда ҳам юкланмади;  5.6.0 → 4 сонияда тўлиқ юкланди.
 * Иккиси ҳам бир хил стиль, бир хил конфиг, бир хил машинада.
 *
 * Сабаб 6.x нинг ўзида: қуйидагилар текширилди ва ҳеч бири ёрдам бермади —
 * `worker.format: "es"`, `optimizeDeps.exclude`, `prewarm()`, StrictMode'ни
 * ўчириш, `lazy`ни олиб ташлаш, `ResizeObserver`, `maxBounds`/`minZoom`,
 * `terrain`, иккита DEM манба, dev ва production бандл. Ягона ўзгарувчи —
 * версия. Бир хил код CDN'даги 5.6.0 билан ҳам ишлайди.
 *
 * 6.x га кўтаришдан олдин харитани ЭКРАНДА текширинг: `npm run build` бу
 * носозликни кўрсатмайди, консолда ҳам хато чиқмайди.
 *
 * `Map as MapLibreMap` — `MapLibreMap` алиаси фақат 6.x да бор, `Map` эса
 * иккала мажор версияда ҳам; шунинг учун алиас қўлда ёзилади.
 */
import { createPortal } from "react-dom";
import { Map as MapLibreMap, Marker, Popup, type PositionAnchor } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapPin, MapVM } from "../../lib/adapters/mapObjects";
import {
  INVEST_MAP_BOUNDS,
  INVEST_MAP_HOME,
  INVEST_MAP_MAX_ZOOM,
  INVEST_MAP_MIN_ZOOM,
  INVEST_MAP_STYLE,
} from "../../lib/invest/investMapStyle";
import { nf } from "../../lib/format";

/**
 * Лойиҳалар харитаси — MapLibre GL.
 *
 * ═══ Нега кутубхона, ўз камерамиз эмас ══════════════════════════════════
 *
 * Аввалги кўриниш битта PNG расм эди: яқинлаштирилганда у шунчаки катталашиб,
 * пикселга бўлиниб кетарди — «харита» эмас, расм. Энди фон ҳақиқий слippy
 * харита: зум ошганда янги плиткалар келади, йўллар, дарёлар ва шаҳар
 * номлари очилади.
 *
 * ═══ React ва императив қатлам орасидаги чегара ═════════════════════════
 *
 * MapLibre — императив кутубхона, шунинг учун чегара аниқ ажратилган:
 *
 *   · **харита, маркерлар ва ойна** — эффект ичида, императив тарзда.
 *     Маркер элементи `document.createElement` билан ясалади, кўриниши эса
 *     `index.css` даги `.map-pin*` синфларида;
 *   · **карточка (`PinCard`)** — оддий React компоненти. У MapLibre ойнаси
 *     ичига `createPortal` орқали чизилади.
 *
 * ═══ Координата бэкенддан — фронтенд уни СИЛЖИТМАЙДИ ════════════════════
 *
 * Нуқталар `GET /map/objects` дан келади. Устма-уст тушган белгиларни
 * **бэкенднинг ўзи** ажратиб беради (`coordsDisplaced`, `map.displace.ts`),
 * шунинг учун бу ерда ҳеч қандай қўшимча силжиш ЙЎҚ ва қўшилмайди.
 *
 * Ягона силжиш — **лангар**: расм пастидаги ёруғ ҳалқа элемент пастки
 * қиррасидан 16% юқорида, шунинг учун элемент шунча пастга сурилади ва
 * ҳалқа маркази айнан координата устида туради. Бу зумга боғлиқ эмас.
 *
 * ⚠️ Бир пайт силжиш маркер `offset` и (ЭКРАН ПИКСЕЛИ) билан берилган эди —
 * ва бу нотўғри чиқди: пиксел силжиш зум билан ўзгармайди, иккита координата
 * орасидаги экран масофаси эса зум ошганда ортади, натижада маркер ўз
 * нуқтасидан «сузиб» кетарди. Бу такрорланмайди.
 *
 * ═══ «Жойни тўғрилаш» режими ОЛИБ ТАШЛАНДИ ══════════════════════════════
 *
 * Аввал фойдаланувчи маркерни суриб тўғрилай оларди ва натижа
 * `localStorage` да сақланарди. У пайтда координаталар фронтендда қўлда
 * ёзилган тахмин эди, яъни уларни браузерда тўғрилаш ягона имконият эди.
 *
 * Энди координата **базада**. Браузерда сақланган силжиш базадаги қиймат
 * билан жимгина ажралиб кетарди: экранда бир нуқта, базада бошқаси, ва
 * фарқни ҳеч ким кўрмасди. Нуқта нотўғри бўлса тузатиш жойи — база.
 * Шунинг учун режим ҳам, `localStorage` калити ҳам олиб ташланди.
 */

export interface MapCanvasProps {
  vm: MapVM;
  /** Очиқ карточканинг объект `id` си; `null` — ёпиқ. */
  selected: string | null;
  onSelect: (id: string | null) => void;
  /**
   * Рўйхатдан танланганда маркерга учиб бориш сигнали. Фақат сон ўзгариши
   * муҳим — маркернинг ўзи босилганда харита силжимаслиги керак.
   */
  focusNonce: number;
  /**
   * `true` — харита ота-элементни ТЎЛИҚ эгаллайди: ромка, бурчак радиуси ва
   * нисбат берилмайди. Алоҳида саҳифа (`/investmap`) шу режимда ишлатади.
   */
  fill?: boolean;
}

/**
 * Маркернинг экрандаги баландлиги, px.
 *
 * ⚠️ Аввал 74 эди — 7 та маркер учун. 55 та маркерда бу ўлчам экранни
 * тўлдириб юборарди: кристаллар бир-бирига тегиб, хаританинг ўзи
 * кўринмай қоларди. 46 px — кристалл шакли ҳали ажралиб турадиган, лекин
 * ўндан ортиқ маркер ёнма-ён турганда ҳам фон кўринадиган ўлчам.
 */
const MARKER_H = 46;

/** Карточканинг эни, px. Баландлиги матндан келиб чиқади. */
const CARD_W = 320;

/**
 * Карточка билан маркер орасидаги бўшлиқ, px. Маркер кристаллининг ярим
 * эни устига қўшилади, шунда карточка расмга тегиб турмайди.
 */
const CARD_GAP = 14;

/**
 * Карточка маркернинг ЁНИДА очилиши учун керакли жой (эни + бўшлиқ).
 * Шу жойдан камида шунча бўлмаса, харита силжитилади.
 */
const CARD_ROOM = CARD_W + 40;

/** Зум чегарасига етганини солиштириш учун бўшлиқ. */
const ZOOM_EPS = 0.01;

/** Ёрлиқнинг маркер ёнидаги оралиғи, px. CSS билан бир хил бўлиши ШАРТ. */
const LABEL_GAP = 6;

/** Ёрлиқнинг маркер элементи тепасидан пастга силжиши, px. CSS билан бир хил. */
const LABEL_TOP = 9;

/**
 * Ёрлиқлар орасидаги энг кичик бўшлиқ, px. Нолда ёрлиқлар бир-бирига тегиб
 * турарди — ўқилса ҳам, зич кўринарди.
 */
const LABEL_PAD = 2;

/**
 * Маркер расмининг ТЎСИҚ сифатидаги ўлчами — расмнинг ўз қутисидан кичик.
 *
 * PNG'нинг катта қисми шаффоф: кристалл марказда, атрофида эса ёғду. Тўлиқ
 * қутини тўсиқ деб олсак, ёрлиқлар қўшни маркернинг БЎШ жойи учун ҳам
 * жой топа олмасди — ўлчов: бошланғич зумда 47 ёрлиқдан атиги 5 таси
 * сиғарди. Ёрлиқнинг ёғду четига озгина тегиши эса ўқишга халақит бермайди.
 */
const ICON_HIT_W = 0.62;

/**
 * Ёрлиқ учун СИНАБ КЎРИЛАДИГАН вертикал ўринлар, px (`LABEL_TOP` устига).
 *
 * Ёрлиқ фақат «ўнгда ёки чапда» бўлса, зич жойда у дарҳол қўшнисига тегиб
 * яширилиб қоларди: ўлчов — бошланғич зумда 47 ёрлиқдан атиги 6 таси
 * сиғди. Ҳар бир ёрлиқ иккита томон × учта баландликдан иборат олтита
 * ўринни кетма-кет синаб кўради ва биринчи БЎШ ўринга жойлашади — ўшанда
 * 18 та сиғади.
 *
 * Қадам ёрлиқ баландлигидан (≈25 px) катта: ёнма-ён турган иккита ёрлиқ
 * бир-бирининг устига чиқмасин.
 *
 * ⚠️ Поғоналар атайин УЧТА, кўпроқ эмас: тўртинчи ва бешинчи поғона
 * (±56 px) яна иккита ёрлиқ сиғдирарди, лекин ўшанда ёрлиқ ўз
 * кристаллидан шунчалик узоқлашардики, зич жойда «қайси ёрлиқ қайси
 * маркерники» деган савол туғиларди. Икки-уч ном кўпайтириш учун
 * ноаниқлик киритиш — ёмон савдо. Сичқонча маркер устига келганда ёрлиқ
 * барибир ЎРТА ўринга (dy = 0) қайтади, яъни боғланиш тикланади.
 */
const LABEL_DYS = [0, -28, 28];

/* -------------------------------------------------------------------------- */
/* иконкалар                                                                  */
/* -------------------------------------------------------------------------- */

const ICONS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  reset: "M4 7v5h5M20 17v-5h-5M6.1 16a7 7 0 0 0 11.3 1M17.9 8A7 7 0 0 0 6.6 7",
  full: "M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5",
  exit: "M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5",
  close: "M6 6l12 12M18 6 6 18",
} as const;

function Icon({ name, size = 17 }: { name: keyof typeof ICONS; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

const TOOL_BTN =
  "grid h-8 w-8 cursor-pointer place-items-center rounded-[5px] border bg-surface transition-colors " +
  "disabled:cursor-default disabled:opacity-40 disabled:hover:text-ink-2";

/* -------------------------------------------------------------------------- */
/* маркер элементи                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Битта маркернинг DOM элементи: кристалл расми, ёнидаги ёрлиқ ва тахминий
 * жой белгиси.
 *
 * ⚠️ Ёрлиқнинг ТОМОНИ ва КЎРИНИШИ бу ерда белгиланмайди — иккови ҳам
 * экрандаги ўрнига боғлиқ ва ҳар сурилишда қайта ҳисобланади
 * (`layoutLabels`). Аввал улар манбадаги қўлда ёзилган жадвалдан келарди;
 * 55 объект учун бундай жадвални ёзиб бўлмайди.
 */
function buildPinElement(pin: MapPin, markerW: number, anchorY: number): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "map-pin";
  el.dataset.side = "right";
  el.style.width = `${markerW}px`;
  el.style.height = `${MARKER_H}px`;
  el.setAttribute("aria-label", `${pin.name} · ${pin.region} · ${pin.layerName} · ${pin.place.short}`);
  // Ёрлиқ яширилган бўлса ҳам ном йўқолмайди: браузернинг ўз изоҳи доим бор.
  el.title = `${pin.name}\n${pin.region}\n${pin.layerName} · ${pin.place.short}`;
  // Қатлам ранги — ёрлиқнинг чизиғи ҲАМ, ҳошияси ҲАМ шундан олади.
  el.style.setProperty("--pin-color", pin.token);
  el.style.setProperty("--pin-anchor", `${anchorY * 100}%`);

  // Тахминий жой — узуқ ҳалқа билан белгиланади. Ранг ёлғиз маъно ташувчи
  // эмас: сабаби `title`, `aria-label` ва карточкада сўз билан ёзилган.
  if (pin.place.approx) {
    el.classList.add("map-pin--approx");
    const ring = document.createElement("i");
    ring.className = "map-pin__ring";
    ring.setAttribute("aria-hidden", "true");
    el.append(ring);
  }

  const img = document.createElement("img");
  img.className = "map-pin__icon";
  img.src = pin.icon;
  img.alt = "";
  img.draggable = false;
  img.style.transformOrigin = `50% ${anchorY * 100}%`;

  const label = document.createElement("span");
  label.className = "map-pin__label";

  const bar = document.createElement("i");
  bar.className = "map-pin__bar";
  bar.setAttribute("aria-hidden", "true");
  bar.style.background = pin.token;

  const text = document.createElement("span");
  text.className = "map-pin__text";
  text.textContent = pin.short;

  label.append(bar, text);
  el.append(img, label);
  return el;
}

/* -------------------------------------------------------------------------- */
/* маркер карточкаси                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Маркер босилганда очиладиган карточка.
 *
 * ═══ Нега дашборд карточкасидан бошқача ═════════════════════════════════
 *
 * Бу карточка ХАРИТА устида, тунги сунъий йўлдош расмида туради — саҳифа
 * фонида эмас. Шунинг учун у дашборднинг оқ/кулранг карточка услубига
 * эмас, хаританинг ўзига мослаштирилган: қорага яқин ярим шаффоф фон,
 * оқ сарлавҳа, олтин рангдаги қийматлар. Ранглар мавзу токенларидан
 * ОЛИНМАЙДИ (улар ёруғ мавзуда карточкани оқартириб қўярди) — улар
 * `index.css` даги `.map-pop*` синфларида.
 *
 * ═══ Тузилма ════════════════════════════════════════════════════════════
 *
 *   · юқори ўнг бурчакдаги белги — ҚАТЛАМ номи, маркер рангида;
 *   · кичик сарлавҳа — ҳудуд;
 *   · катта сарлавҳа — объектнинг тўлиқ номи;
 *   · жадвал — ҳар қаторда рангли чизиқ, ёрлиқ ва қиймат;
 *   · пастда — жойлашув аниқлиги ва боғланган объектлар.
 *
 * Дизайн аввалгидек сақланган, фақат қаторлар энди ТУРГА қараб бошқача
 * (қаранг: `adapters/mapObjects.ts` → `rowsOf`).
 *
 * Қатор чизиқларининг ранги МАЪНО ТАШИМАЙДИ: у фақат кўз қаторни
 * адаштирмаслиги учун, шунинг учун рўйхат қаторлар сонига боғланмаган.
 */
const ROW_BARS = ["#f5c542", "#38bdf8", "#a855f7", "#34d399", "#818cf8", "#fb923c"];

/**
 * Қайси қатлам дашборднинг қайси бўлимида батафсил кўрсатилган.
 * Заводлар учун алоҳида бўлим йўқ — ўшанда ҳавола чизилмайди.
 */
const DETAIL_HREF: Partial<Record<MapPin["type"], string>> = {
  invest: "/#invest",
  geology: "/#geology",
};

function PinCard({ pin, onClose }: { pin: MapPin; onClose: () => void }) {
  const href = DETAIL_HREF[pin.type];
  return (
    <div
      role="dialog"
      aria-label={pin.name}
      style={{ width: CARD_W, ["--pop-accent" as string]: pin.token }}
      className="map-pop"
    >
      {/* Ранг ёлғиз маъно ташувчи эмас: белгида қатламнинг НОМИ ёзилади. */}
      <span className="map-pop__badge">{pin.layerName}</span>

      <button
        type="button"
        onClick={onClose}
        aria-label="Карточкани ёпиш"
        className="map-pop__close"
      >
        <Icon name="close" size={15} />
      </button>

      <div className="map-pop__body">
        <div className="map-pop__head">
          <span className="map-pop__eyebrow">{pin.region}</span>
          <h4 className="map-pop__title">{pin.name}</h4>
        </div>

        <dl className="map-pop__rows">
          {pin.rows.map((r, i) => (
            <div key={r.k} className="map-pop__row">
              <i
                aria-hidden="true"
                className="map-pop__bar"
                style={{ background: ROW_BARS[i % ROW_BARS.length] }}
              />
              <dt className="map-pop__key">{r.k}</dt>
              <dd className={"map-pop__val" + (r.num ? " tabular-nums" : "")}>{r.v}</dd>
            </div>
          ))}
        </dl>

        {/* Боғланиш ЭВРИСТИК (ном бўйича), шунинг учун у «маълумот» эмас,
            «шу объектга алоқадор бўлиши мумкин» деб ёзилади. */}
        {pin.links.length > 0 && (
          <p className="map-pop__links">
            <b>Боғланган объектлар:</b> {pin.links.join(" · ")}
          </p>
        )}

        <div className="map-pop__foot">
          {/* Жойлашув аниқлиги ЯШИРИЛМАЙДИ — матн аниқликка қараб ўзгаради. */}
          <span className={"map-pop__hint" + (pin.place.approx ? " map-pop__hint--warn" : "")}>
            {pin.place.short}
          </span>
          {href && (
            <a href={href} className="map-pop__link">
              Батафсил →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ёрлиқларни жойлаштириш                                                     */
/* -------------------------------------------------------------------------- */

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const hits = (a: Box, b: Box): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* -------------------------------------------------------------------------- */
/* харита                                                                     */
/* -------------------------------------------------------------------------- */

export function MapCanvas({ vm, selected, onSelect, focusNonce, fill = false }: MapCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const labelsRef = useRef(new Map<string, HTMLElement>());
  const portalRef = useRef<HTMLDivElement | null>(null);
  if (portalRef.current === null && typeof document !== "undefined") {
    portalRef.current = document.createElement("div");
  }
  /** Портал учун идиш — MapLibre ойнасининг мазмуни шу элементга чизилади. */

  // Императив ҳодиса ишловчилари доим охирги қийматни кўриши учун.
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const hoveredRef = useRef<string | null>(null);
  /** `layoutLabels` эффектлар ичидан чақирилади, лекин у маркерлардан кейин ясалади. */
  const layoutRef = useRef<() => void>(() => {});

  const [isFull, setIsFull] = useState(false);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(INVEST_MAP_HOME.zoom);
  /**
   * Ёрлиқ ҳисоби — пастдаги изоҳ учун.
   *
   * ⚠️ Иккита сон ҲАМ керак: «сиғмади» фақат ЭКРАНДАГИ маркерлар орасидан
   * ҳисобланиши шарт. Аввал у `vm.pins.length - shown` эди ва яқинлашганда
   * «46 ёрлиқ сиғмади» деб ёзарди — ҳолбуки ўша 46 таси сиғмагани йўқ,
   * улар шунчаки кадрдан ташқарида эди. Бу ёлғон огоҳлантириш.
   */
  const [labelStat, setLabelStat] = useState({ shown: 0, onScreen: 0 });

  const markerW = MARKER_H * vm.markerRatio;

  useEffect(() => {
    selectedRef.current = selected;
    onSelectRef.current = onSelect;
  }, [selected, onSelect]);

  /* --- ёрлиқ тўқнашуви -------------------------------------------------- */

  /**
   * ═══ 55 ёрлиқ экранни босиб кетмаслиги учун ═════════════════════════════
   *
   * Ёрлиқлар ҳар сурилиш ва зумда ЭКРАНДА ЎЛЧАНАДИ: маркерлар экран
   * координатасига проекция қилинади, ёрлиқ қутиси ҳисобланади ва
   * бир-бирига тегадиганлари ЯШИРИЛАДИ (очкўз алгоритм, устунлик бўйича).
   *
   * Нега айнан шу йўл:
   *
   *   · **Қўлда жадвал ишламайди.** Аввалги `labelSide`/`labelDy` жадвали
   *     7 нуқта учун headless браузерда ўлчаб ёзилган эди. 55 объект учун
   *     уни ёзиб бўлмайди, ёзилса ҳам базага битта янги лойиҳа қўшилиши
   *     билан эскирарди.
   *
   *   · **Доим кўринадиган 55 ёрлиқ — ўқиб бўлмайдиган экран.** Бошланғич
   *     зумда (z6) объектлар вилоят марказларида тўпланган, ёрлиқлар эса
   *     бир-бирининг устига тушарди.
   *
   *   · **Фақат hover'да кўрсатиш ҳам етарли эмас**: ўшанда харита бўш
   *     кўринарди ва «қайси нуқта нима» саволига жавоб бермасди.
   *
   *   · **MapLibre'нинг ўз `symbol` қатлами** (`text-allow-overlap: false`)
   *     ҳам шу ишни қиларди, лекин ўшанда кристалл PNG'лари ҳам шу қатламга
   *     ўтиши, ранглар `addImage` билан юкланиши ва hover/танлов
   *     `queryRenderedFeatures` га кўчиши керак эди — яъни бутун маркер
   *     қатлами қайта ёзиларди. Устига ёрлиқ шрифти узоқдаги glyph
   *     серверига боғланиб қоларди (кирилл учун — қўшимча хавф). Мавжуд
   *     DOM маркерлари ва уларнинг CSS'и эса тайёр ва текширилган.
   *
   * **Ҳеч бир ном йўқолмайди** — ёрлиғи яширилган объект тўрт жойда қолади:
   * маркернинг `title` изоҳида, `aria-label` да, босилганда очиладиган
   * карточкада ва саҳифадаги тўлиқ рўйхатда. Устига сичқонча маркер устига
   * келганда ёрлиқ мажбуран кўрсатилади.
   */
  const layoutLabels = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const host = map.getContainer();
    const W = host.clientWidth;
    const H = host.clientHeight;

    interface Cand {
      id: string;
      el: HTMLElement;
      label: HTMLElement;
      cx: number;
      cy: number;
      w: number;
      h: number;
      weight: number;
    }

    const cands: Cand[] = [];
    // Маркер расмларининг ўзи ҳам тўсиқ: ёрлиқ бошқа объектнинг кристаллини
    // бекитиб қўймаслиги керак — акс ҳолда нуқта кўринмай қоларди.
    const taken: Box[] = [];

    for (const pin of vm.pins) {
      const marker = markersRef.current.get(pin.id);
      const label = labelsRef.current.get(pin.id);
      if (!marker || !label) continue;
      const el = marker.getElement();
      const p = map.project([pin.lon, pin.lat]);

      // Экрандан ташқаридаги маркер на ёрлиқ олади, на тўсиқ бўлади.
      const top = p.y - MARKER_H * vm.markerAnchorY;
      if (p.x < -markerW || p.x > W + markerW || top < -MARKER_H || top > H + MARKER_H) {
        label.style.visibility = "hidden";
        continue;
      }

      // Тўсиқ — кристаллнинг ўзи: эни бўйича торайтирилган ва ЛАНГАРГАЧА,
      // яъни расмнинг шаффоф этаги ҳисобга олинмайди.
      const hitW = markerW * ICON_HIT_W;
      taken.push({
        x: p.x - hitW / 2,
        y: top,
        w: hitW,
        h: MARKER_H * vm.markerAnchorY,
      });
      cands.push({
        id: pin.id,
        el,
        label,
        cx: p.x,
        cy: top,
        // Ўлчам DOM'дан олинади: ёрлиқ экранга мосланган (`white-space: nowrap`,
        // `max-width`), шунинг учун матн узунлигидан ҳисоблаш нотўғри бўларди.
        w: label.offsetWidth,
        h: label.offsetHeight,
        weight: pin.weight,
      });
    }

    // Устунлик: танланган → сичқонча остидаги → оғирлиги катта (аниқ
    // координатали ва камроқ учрайдиган қатлам) → барқарорлик учун `id`.
    const sel = selectedRef.current;
    const hov = hoveredRef.current;
    cands.sort((a, b) => {
      const pa = a.id === sel ? 3 : a.id === hov ? 2 : 0;
      const pb = b.id === sel ? 3 : b.id === hov ? 2 : 0;
      if (pa !== pb) return pb - pa;
      if (a.weight !== b.weight) return b.weight - a.weight;
      return a.id < b.id ? -1 : 1;
    });

    const placed: Box[] = [];
    let shown = 0;

    for (const c of cands) {
      const forced = c.id === sel || c.id === hov;
      // Афзал томон: экраннинг қайси ярмида турганига қараб — ёрлиқ доим
      // ичкарига қарайди, шунда у экран четидан чиқиб кетмайди. Жой
      // бўлмаса қарама-қарши томон ҳам синаб кўрилади.
      const prefer = c.cx < W / 2;
      const boxAt = (right: boolean, dy: number): Box => ({
        x:
          (right ? c.cx + markerW / 2 + LABEL_GAP : c.cx - markerW / 2 - LABEL_GAP - c.w) -
          LABEL_PAD,
        y: c.cy + LABEL_TOP + dy - LABEL_PAD,
        w: c.w + LABEL_PAD * 2,
        h: c.h + LABEL_PAD * 2,
      });

      const fits = (b: Box): boolean =>
        b.x >= 0 &&
        b.x + b.w <= W &&
        b.y >= 0 &&
        b.y + b.h <= H &&
        !placed.some((p) => hits(b, p)) &&
        !taken.some((t) => hits(b, t));

      let put: { right: boolean; dy: number; box: Box } | null = null;
      // Тартиб муҳим: аввал афзал томоннинг ЎРТА баландлиги (маркерга энг
      // яқин ва энг табиий ўрин), кейин юқори/қуйи поғоналар, охирида
      // қарама-қарши томон.
      outer: for (const right of [prefer, !prefer]) {
        for (const dy of LABEL_DYS) {
          const b = boxAt(right, dy);
          if (fits(b)) {
            put = { right, dy, box: b };
            break outer;
          }
        }
      }

      // Танланган ва сичқонча остидаги ёрлиқ ДОИМ кўринади: бўш ўрин
      // топилмаса ҳам у афзал ўринда мажбуран чизилади — фойдаланувчи
      // айнан шу объектни сўраган.
      if (put === null && forced) {
        put = { right: prefer, dy: 0, box: boxAt(prefer, 0) };
      }

      if (put === null) {
        c.label.style.visibility = "hidden";
        continue;
      }

      c.el.dataset.side = put.right ? "right" : "left";
      c.label.style.top = `${LABEL_TOP + put.dy}px`;
      c.label.style.visibility = "visible";
      placed.push(put.box);
      shown += 1;
    }

    setLabelStat({ shown, onScreen: cands.length });
  }, [vm.pins, vm.markerAnchorY, markerW]);

  useEffect(() => {
    layoutRef.current = layoutLabels;
  }, [layoutLabels]);

  /* --- харита ва маркерлар: битта эффект, битта ҳаёт цикли -------------- */

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const map = new MapLibreMap({
      container: host,
      style: INVEST_MAP_STYLE,
      center: INVEST_MAP_HOME.center,
      zoom: INVEST_MAP_HOME.zoom,
      pitch: INVEST_MAP_HOME.pitch,
      bearing: INVEST_MAP_HOME.bearing,
      minZoom: INVEST_MAP_MIN_ZOOM,
      maxZoom: INVEST_MAP_MAX_ZOOM,
      maxBounds: INVEST_MAP_BOUNDS,
      // Аттрибуция лицензия талаби — ўчирилмайди, фақат ихчам кўринишда.
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    // Ёрлиқларни қайта жойлаштириш ҳар кадрда эмас, `requestAnimationFrame`
    // орқали: суриш пайтида `move` ўнлаб марта чиқади, ҳисоб эса битта
    // кадрга биттадан ортиқ керак эмас.
    let raf = 0;
    const relayout = () => {
      if (raf !== 0) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        layoutRef.current();
      });
    };

    const onZoom = () => {
      setZoom(map.getZoom());
      relayout();
    };
    const onLoad = () => {
      setReady(true);
      relayout();
    };
    // Хаританинг бўш жойи босилса карточка ёпилади. Маркер ва ойна DOM
    // қатламида, canvas'нинг ичида эмас — шунинг учун улар босилганда бу
    // ҳодиса умуман чиқмайди.
    const onMapClick = () => onSelectRef.current(null);
    map.on("zoom", onZoom);
    map.on("move", relayout);
    map.on("load", onLoad);
    map.on("click", onMapClick);

    const made = new Map<string, Marker>();
    const labels = new Map<string, HTMLElement>();

    for (const pin of vm.pins) {
      const el = buildPinElement(pin, markerW, vm.markerAnchorY);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const cur = selectedRef.current;
        onSelectRef.current(cur === pin.id ? null : pin.id);
      });
      // Сичқонча маркер устига келганда ёрлиқ МАЖБУРАН кўрсатилади — шунда
      // тўқнашув сабабли яширилган ном ҳам бир ҳаракат билан ўқилади.
      el.addEventListener("pointerenter", () => {
        hoveredRef.current = pin.id;
        layoutRef.current();
      });
      el.addEventListener("pointerleave", () => {
        if (hoveredRef.current === pin.id) hoveredRef.current = null;
        layoutRef.current();
      });

      const marker = new Marker({
        element: el,
        // Ягона силжиш — лангар (қаранг: файл боши). Бошқа ҳеч қандай
        // пиксел ёки градус силжиш ЙЎҚ: устма-уст тушганларни бэкенд
        // ажратиб беради (`coordsDisplaced`).
        anchor: "bottom",
        offset: [0, MARKER_H * (1 - vm.markerAnchorY)],
      })
        .setLngLat([pin.lon, pin.lat])
        .addTo(map);

      made.set(pin.id, marker);
      const label = el.querySelector<HTMLElement>(".map-pin__label");
      if (label) labels.set(pin.id, label);
    }
    markersRef.current = made;
    labelsRef.current = labels;
    // Маркерлар қўшилгач биринчи жойлаштириш — `load` ни кутмасдан, чунки
    // ёрлиқлар плиткалардан мустақил.
    relayout();

    return () => {
      if (raf !== 0) cancelAnimationFrame(raf);
      for (const m of made.values()) m.remove();
      markersRef.current = new Map();
      labelsRef.current = new Map();
      map.off("zoom", onZoom);
      map.off("move", relayout);
      map.off("load", onLoad);
      map.off("click", onMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [vm, markerW]);

  /* --- танловнинг кўриниши ---------------------------------------------- */

  useEffect(() => {
    for (const pin of vm.pins) {
      const el = markersRef.current.get(pin.id)?.getElement();
      if (!el) continue;
      const on = selected === pin.id;
      el.classList.toggle("map-pin--on", on);
      el.classList.toggle("map-pin--dim", selected !== null && !on);
      el.style.zIndex = on ? "8" : "5";
    }
    // Танлов ўзгарса ёрлиқ устунлиги ҳам ўзгаради.
    layoutRef.current();
  }, [selected, vm.pins]);

  /* --- карточка ойнаси -------------------------------------------------- */

  /**
   * Карточка — маркернинг ЁНИДА. Лангар фақат «чап» ёки «ўнг» бўлади:
   * `anchor` берилмаса MapLibre уни ўзи танлайди ва баъзан «тепа»/«паст»
   * қилиб қўяди — ўшанда карточка маркернинг устига ёки остига тушиб,
   * экран четидан чиқиб кетарди.
   */
  useEffect(() => {
    const map = mapRef.current;
    const portal = portalRef.current;
    if (!map || !portal || selected === null) return;
    const marker = markersRef.current.get(selected);
    if (!marker) return;

    const ll = marker.getLngLat();
    const box = map.getContainer();
    const w = box.clientWidth;
    const px = map.project(ll).x;
    // Карточка маркернинг қайси ёнида: бўш жойи кўпроқ томонда.
    const side: PositionAnchor = px < w / 2 ? "left" : "right";

    // Жой етармикан? Етмаса харитани бир оз суриб қўямиз — карточка ҳам,
    // маркер ҳам экранда қолсин. Марказлаштириш ЭМАС: харита керагидан
    // ортиқ сакрамаслиги учун фақат етишмаган пиксел қадар сурилади.
    const room = side === "left" ? w - px : px;
    if (room < CARD_ROOM) {
      const by = CARD_ROOM - room;
      map.panBy([side === "left" ? by : -by, 0], { duration: 300 });
    }

    // Ён лангарда карточка маркернинг вертикал ЎРТАСИДА туради, лекин
    // маркернинг лангари пастда (ҳалқа) — шунинг учун у ярим бўйига
    // кўтарилади, акс ҳолда кристаллнинг остидан чиқарди.
    const dx = markerW / 2 + CARD_GAP;
    const offset: [number, number] = [side === "left" ? dx : -dx, -MARKER_H / 2];

    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
      maxWidth: "none",
      className: "map-pop-wrap",
      anchor: side,
      offset,
    })
      .setLngLat(ll)
      .setDOMContent(portal)
      .addTo(map);

    return () => {
      popup.remove();
    };
  }, [selected, vm.pins, markerW]);

  /* --- ташқи сигналлар --------------------------------------------------- */

  useEffect(() => {
    const onFs = () => {
      setIsFull(document.fullscreenElement === boxRef.current);
      // Тўлиқ экранда контейнер ўлчами кескин ўзгаради.
      mapRef.current?.resize();
      layoutRef.current();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Ойна ўлчами ўзгарса ёрлиқ тўқнашуви бошқача бўлади — қайта ҳисобланади.
  useEffect(() => {
    const onResize = () => layoutRef.current();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onSelect(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onSelect]);

  useEffect(() => {
    if (focusNonce === 0 || selected === null) return;
    const map = mapRef.current;
    const marker = markersRef.current.get(selected);
    if (!map || !marker) return;
    const ll = marker.getLngLat();
    // `essential` берилмайди: `prefers-reduced-motion` ёқилган бўлса
    // MapLibre анимациясиз, дарҳол кўчади — бу кутилган хатти-ҳаракат.
    map.flyTo({ center: [ll.lng, ll.lat], zoom: Math.max(map.getZoom(), 9), duration: 900 });
    // Боғланиш атайин фақат `focusNonce` га: маркернинг ўзи босилганда
    // харита силжимайди.
  }, [focusNonce]);

  /* --- бошқарув ---------------------------------------------------------- */

  const resetView = useCallback(() => {
    mapRef.current?.easeTo({ ...INVEST_MAP_HOME, duration: 700 });
  }, []);

  const toggleFull = useCallback(() => {
    const node = boxRef.current;
    if (!node) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void node.requestFullscreen?.();
  }, []);

  const active = selected === null ? null : (vm.pins.find((p) => p.id === selected) ?? null);
  const atMin = zoom <= INVEST_MAP_MIN_ZOOM + ZOOM_EPS;
  const atMax = zoom >= INVEST_MAP_MAX_ZOOM - ZOOM_EPS;
  // Фақат ЭКРАНДАГИ маркерлар ҳисобга олинади — қаранг: `labelStat` изоҳи.
  const hiddenLabels = labelStat.onScreen - labelStat.shown;

  return (
    <div
      ref={boxRef}
      className={
        "map-shell relative w-full overflow-hidden bg-sunken " +
        (isFull
          ? "h-screen"
          : fill
            ? "h-full"
            : "aspect-[2/1] max-h-[620px] min-h-[440px] rounded-card border border-grid")
      }
    >
      <div ref={hostRef} className="absolute inset-0" />

      {!ready && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-[12px] text-ink-3">
          Харита юкланмоқда…
        </div>
      )}

      {/* --- бошқарув тугмалари ------------------------------------------ */}
      <div
        aria-label="Харита бошқаруви"
        className="absolute top-1/2 right-2.5 z-20 flex -translate-y-1/2 flex-col gap-1.5 rounded-[7px] border border-hair bg-surface/90 p-1.5 shadow-card"
      >
        <button
          type="button"
          aria-label="Яқинлаштириш"
          disabled={atMax}
          onClick={() => mapRef.current?.zoomIn()}
          className={TOOL_BTN + " border-hair text-ink-2 hover:text-ink"}
        >
          <Icon name="plus" />
        </button>
        <button
          type="button"
          aria-label="Узоқлаштириш"
          disabled={atMin}
          title={atMin ? "Бутун мамлакат кўриниб турибди — бундан узоқлашиб бўлмайди" : undefined}
          onClick={() => mapRef.current?.zoomOut()}
          className={TOOL_BTN + " border-hair text-ink-2 hover:text-ink"}
        >
          <Icon name="minus" />
        </button>
        <span aria-hidden="true" className="mx-1 h-px bg-hair" />
        <button
          type="button"
          aria-label="Бошланғич кўринишни тиклаш"
          onClick={resetView}
          className={TOOL_BTN + " border-hair text-ink-2 hover:text-ink"}
        >
          <Icon name="reset" />
        </button>
        <button
          type="button"
          aria-label={isFull ? "Тўлиқ экрандан чиқиш" : "Тўлиқ экран"}
          onClick={toggleFull}
          className={TOOL_BTN + " border-hair text-ink-2 hover:text-ink"}
        >
          <Icon name={isFull ? "exit" : "full"} />
        </button>
      </div>

      {/* Зум даражаси ва яширилган ёрлиқлар сони. Иккинчиси МАЖБУРИЙ: ёрлиқ
          жимгина йўқолмаслиги керак — экран нечта номни кўрсатмаётганини
          ўзи айтиб туради ва нима қилиш кераклигини ёзади. */}
      <span className="pointer-events-none absolute bottom-2 left-2.5 z-20 rounded-[4px] border border-hair bg-surface/85 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
        z {nf(zoom, 1)}
        {atMin && " · энг кичик"}
        {atMax && " · энг катта"}
        {hiddenLabels > 0 && (
          <span className="font-sans">
            {" · "}
            {nf(hiddenLabels)} ёрлиқ сиғмади — яқинлаштиринг ёки маркер устига келинг
          </span>
        )}
      </span>

      {active !== null &&
        portalRef.current !== null &&
        createPortal(
          <PinCard key={active.id} pin={active} onClose={() => onSelect(null)} />,
          portalRef.current,
        )}
    </div>
  );
}

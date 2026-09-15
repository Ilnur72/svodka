import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { Map as MapLibreMap, Marker, Popup, type Offset } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { InvestMapPin, InvestMapVM } from "../../lib/adapters/investMap";
import {
  INVEST_MAP_BOUNDS,
  INVEST_MAP_HOME,
  INVEST_MAP_MAX_ZOOM,
  INVEST_MAP_MIN_ZOOM,
  INVEST_MAP_STYLE,
} from "../../lib/invest/investMapStyle";
import { nf } from "../../lib/format";
import { Pill } from "../../components/Pill";


/**
 * Инвестиция лойиҳалари харитаси — MapLibre GL.
 *
 * ═══ Нега кутубхона, ўз камерамиз эмас ══════════════════════════════════
 *
 * Аввалги кўриниш битта PNG расм эди: яқинлаштирилганда у шунчаки катталашиб,
 * пикселга бўлиниб кетарди — «харита» эмас, расм. Энди фон ҳақиқий слippy
 * харита: зум ошганда янги плиткалар келади, йўллар, дарёлар ва шаҳар
 * номлари очилади.
 *
 * Шу билан бирга камера, суриш, яқинлаштириш, чегара ва проекция ҳисоби
 * MapLibre'нинг зиммасига ўтди — аввалги қўлда ёзилган `apply/coverScale/
 * zoomAt/pan` мантиғи бутунлай олиб ташланди. Расмнинг четида бўш майдон
 * қолиши муаммоси ҳам ўз-ўзидан йўқолди: харита ҳамма жойда чизилади,
 * `maxBounds` ва `minZoom` эса минтақадан узоққа кетишга йўл бермайди
 * (қаранг: `lib/invest/investMapStyle.ts`).
 *
 * ═══ React ва императив қатлам орасидаги чегара ═════════════════════════
 *
 * MapLibre — императив кутубхона, шунинг учун чегара аниқ ажратилган:
 *
 *   · **харита, маркерлар ва ойна** — эффект ичида, императив тарзда.
 *     Маркер элементи `document.createElement` билан ясалади, кўриниши эса
 *     `index.css` даги `.map-pin*` синфларида (узун утилита сатрини
 *     JS ичида ёзгандан кўра равшанроқ — жадвал сарлавҳалари билан бир хил
 *     ёндашув);
 *   · **карточка (`PinCard`)** — оддий React компоненти. У MapLibre ойнаси
 *     ичига `createPortal` орқали чизилади: шунда иккинчи React илдизи
 *     керак бўлмайди, контекст ва ҳолат бир дарахтда қолади.
 *
 * Харита **бир марта** яратилади ва эффект тозалагичида `map.remove()`
 * чақирилади — StrictMode'да эффект икки марта ишлаганда иккита canvas
 * қолиб кетмаслиги учун.
 *
 * ═══ Жойни тўғрилаш ═════════════════════════════════════════════════════
 *
 * Координаталар туман даражасидаги тахмин (қаранг: `investMapSource.ts`),
 * шунинг учун фойдаланувчи маркерни суриб тўғрилай олади — энди MapLibre'нинг
 * ўз `draggable` механизми билан. Натижа фақат браузерда (`localStorage`)
 * сақланади: манбага ҳам, бэкендга ҳам тегмайди.
 *
 * Сақлаш калити янги (`…-lnglat-v1`): эски ёзувда расм пикселлари турарди,
 * улар координата сифатида ўқилса маркерлар Тинч океанга учиб кетарди.
 */

export interface MapCanvasProps {
  vm: InvestMapVM;
  /** Очиқ карточканинг лойиҳа `id` си; `null` — ёпиқ. */
  selected: string | null;
  onSelect: (id: string | null) => void;
  /**
   * Рўйхатдан танланганда маркерга учиб бориш сигнали. Фақат сон ўзгариши
   * муҳим — маркернинг ўзи босилганда харита силжимаслиги керак.
   */
  focusNonce: number;
}

/** Сурилган маркерларнинг координатаси шу калит остида сақланади. */
const STORAGE_KEY = "tmk-investmap-lnglat-v1";

/**
 * Маркернинг экрандаги баландлиги, px. MapLibre маркерлари яқинлаштиришда
 * ўлчамини ўзгартирмайди, шунинг учун тескари масштаб ҳисоби керак эмас.
 */
const MARKER_H = 90;

/** Карточканинг эни, px. Баландлиги матндан келиб чиқади. */
const CARD_W = 320;

/** Зум чегарасига етганини солиштириш учун бўшлиқ. */
const ZOOM_EPS = 0.01;

/**
 * Ойнанинг маркерга нисбатан силжиши — MapLibre танлаган лангарга қараб.
 * Кристаллнинг боши нуқтадан тахминан 76 px юқорида, шунинг учун «пастки»
 * лангарда ойна ундан ҳам юқорига кўтарилади; «юқори» лангарда эса ҳалқанинг
 * остига тушади.
 */
const POPUP_OFFSET: Offset = {
  center: [0, -40],
  top: [0, 18],
  bottom: [0, -82],
  left: [34, -40],
  right: [-34, -40],
  "top-left": [16, 14],
  "top-right": [-16, 14],
  "bottom-left": [16, -78],
  "bottom-right": [-16, -78],
};

interface Pos {
  lon: number;
  lat: number;
}

/**
 * Сақланган координаталар. Ёзувнинг шакли текширилади: `localStorage` —
 * ташқи манба, ундаги қиймат эскирган ёки бузилган бўлиши мумкин, шундай
 * ҳолда харита ишдан чиқмаслиги керак.
 */
function readPositions(): Record<string, Pos> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return {};
    const out: Record<string, Pos> = {};
    for (const [key, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (val === null || typeof val !== "object") continue;
      const { lon, lat } = val as { lon?: unknown; lat?: unknown };
      if (
        typeof lon === "number" &&
        typeof lat === "number" &&
        isFinite(lon) &&
        isFinite(lat) &&
        Math.abs(lon) <= 180 &&
        Math.abs(lat) <= 85
      ) {
        out[key] = { lon, lat };
      }
    }
    return out;
  } catch {
    // Бузилган ёзув ёки хусусий режим — харита манбадаги жойлар билан очилади.
    return {};
  }
}

/* -------------------------------------------------------------------------- */
/* иконкалар                                                                  */
/* -------------------------------------------------------------------------- */

const ICONS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  edit: "M4 20h4l11-11-4-4L4 16v4Zm9-13 4 4",
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
 * Битта маркернинг DOM элементи: кристалл расми ва ёнидаги доимий ёрлиқ.
 *
 * Ёрлиқ ДОИМ кўринади — харита «қайси нуқта қайси лойиҳа» саволига биринчи
 * қарашда жавоб бериши керак. Томони манбадаги жадвалдан (`labelSide`):
 * гуруҳнинг ғарбий чеккасидаги маркер чапга, қолгани ўнгга қарайди, шунда
 * ёрлиқлар бир-бирини бекитмайди. Ёрлиқнинг маркерга қараган чети —
 * ўша маркернинг ранги: ёрлиқ ва кристалл шу чизиқ орқали боғланади.
 */
function buildPinElement(pin: InvestMapPin, markerW: number, anchorY: number): HTMLButtonElement {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "map-pin";
  el.dataset.side = pin.labelSide;
  el.style.width = `${markerW}px`;
  el.style.height = `${MARKER_H}px`;
  el.setAttribute("aria-label", `${pin.name} · ${pin.region} · ${pin.kind}`);
  el.title = pin.name;
  // Ёрлиқнинг вертикал силжиши CSS'га шу орқали берилади — ўлчам ва ўрин
  // манбадаги жадвалдан келади, CSS'да қотирилган сон турмайди.
  el.style.setProperty("--pin-dy", `${pin.labelDy}px`);

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
 * Маркер босилганда очиладиган карточка. Уни MapLibre'нинг ойнаси
 * жойлаштиради (лангарни ўзи танлайди ва четга чиқмаслигини ўзи ҳал қилади),
 * шунинг учун бу ерда фақат мазмун қолади.
 *
 * Сурат учта ҳолатда чизилади — худди «Инвестиция лойиҳалари» бўлимидаги
 * `AreaBlock` каби: юкланмоқда / юкланди / юкланмади. Файл бор-йўқлигини
 * build пайтида билиб бўлмайди (у бандлга кирмайди), шунинг учун қарор
 * браузерда қабул қилинади ва сингани расм иконкаси ҳеч қачон кўринмайди.
 */
function PinCard({ pin, onClose }: { pin: InvestMapPin; onClose: () => void }) {
  const [st, setSt] = useState<"load" | "ok" | "fail">("load");

  return (
    <div
      role="dialog"
      aria-label={pin.name}
      style={{ width: CARD_W }}
      className="map-pop overflow-hidden rounded-card border border-rule bg-surface text-left shadow-card"
    >
      <div className="relative aspect-[16/8] w-full overflow-hidden bg-sunken">
        {st !== "fail" && (
          <img
            src={pin.img.src}
            alt={pin.img.alt}
            loading="lazy"
            draggable={false}
            onLoad={() => setSt("ok")}
            onError={() => setSt("fail")}
            className={"h-full w-full object-cover" + (st === "ok" ? "" : " opacity-0")}
          />
        )}
        {st === "fail" && (
          <div className="absolute inset-0 grid place-items-center px-4 text-center text-[11.5px] text-ink-3">
            Лойиҳа майдонининг сурати ҳали қўйилмаган
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Карточкани ёпиш"
        className="absolute top-1.5 right-1.5 grid h-6 w-6 cursor-pointer place-items-center rounded-[4px] border border-hair bg-surface text-ink-2 hover:text-ink"
      >
        <Icon name="close" size={13} />
      </button>

      <div className="px-3 pt-2.5 pb-3">
        <h4 className="text-[13.5px] leading-[1.3] [font-weight:650]">{pin.name}</h4>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[11.5px] text-ink-3">{pin.region}</span>
          <Pill>тахминий жой</Pill>
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-grid pt-2.5">
          {pin.rows.map((r) => (
            <div key={r.k} className="min-w-0">
              <dt className="text-[10.5px] leading-[1.3] text-ink-3">{r.k}</dt>
              <dd
                className={
                  "mt-0.5 text-[12.5px] leading-[1.3]" + (r.num ? " font-mono tabular-nums" : "")
                }
              >
                {r.v}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-grid pt-2">
          {/* Ранг ёлғиз маъно ташувчи эмас: белги ёнида доим турнинг номи
              ёзилади — маркер ранги ҳам худди шу турни билдиради. */}
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[11.5px] text-ink-2">
            <i
              aria-hidden="true"
              className="h-2.5 w-2.5 flex-none rounded-full"
              style={{ background: pin.token }}
            />
            <span className="min-w-0 truncate">{pin.kind}</span>
          </span>
          {/* Реестрдаги қолган ўттизта майдон «Инвестиция лойиҳалари»
              бўлимида — ҳавола ўша табни очади. */}
          <a
            href="#invest"
            className="flex-none rounded-[5px] bg-s1 px-2.5 py-[5px] text-[11.5px] [font-weight:650] text-white"
          >
            Батафсил →
          </a>
        </div>

        {pin.nudge !== null && (
          <p className="mt-2 text-[10.5px] leading-[1.4] text-ink-3">{pin.nudge}</p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* харита                                                                     */
/* -------------------------------------------------------------------------- */

export function MapCanvas({ vm, selected, onSelect, focusNonce }: MapCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const popupRef = useRef<Popup | null>(null);
  /** Портал учун идиш — MapLibre ойнасининг мазмуни шу элементга чизилади. */
  const portalRef = useRef<HTMLDivElement | null>(null);
  if (portalRef.current === null && typeof document !== "undefined") {
    portalRef.current = document.createElement("div");
  }

  // Императив ҳодиса ишловчилари доим охирги қийматни кўриши учун.
  const selectedRef = useRef(selected);
  const onSelectRef = useRef(onSelect);
  const editRef = useRef(false);

  const [positions, setPositions] = useState<Record<string, Pos>>(readPositions);
  const [edit, setEdit] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(INVEST_MAP_HOME.zoom);

  const markerW = MARKER_H * vm.markerRatio;

  useEffect(() => {
    selectedRef.current = selected;
    onSelectRef.current = onSelect;
    editRef.current = edit;
  }, [selected, onSelect, edit]);

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

    const onZoom = () => setZoom(map.getZoom());
    const onLoad = () => setReady(true);
    // Хаританинг бўш жойи босилса карточка ёпилади. Маркер ва ойна DOM
    // қатламида, canvas'нинг ичида эмас — шунинг учун улар босилганда бу
    // ҳодиса умуман чиқмайди.
    const onMapClick = () => onSelectRef.current(null);
    map.on("zoom", onZoom);
    map.on("load", onLoad);
    map.on("click", onMapClick);

    const made = new Map<string, Marker>();
    for (const pin of vm.pins) {
      const el = buildPinElement(pin, markerW, vm.markerAnchorY);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        // Тўғрилаш режимида босиш карточка очмайди: у ерда маркер сурилади.
        if (editRef.current) return;
        const cur = selectedRef.current;
        onSelectRef.current(cur === pin.id ? null : pin.id);
      });

      const marker = new Marker({
        element: el,
        // Иккита силжишнинг йиғиндиси:
        //   1) лангар — расм пастидаги ёруғ ҳалқа: элемент пастки қирраси
        //      нуқтадан 16% пастга сурилади, шунда ҳалқа маркази айнан
        //      координата устида туради;
        //   2) `pin.offset` — устма-уст тушган маркерларни ажратиш учун
        //      манбада берилган экран силжиши (координатага тегмайди).
        anchor: "bottom",
        offset: [pin.offset[0], MARKER_H * (1 - vm.markerAnchorY) + pin.offset[1]],
      })
        .setLngLat([pin.home.lon, pin.home.lat])
        .addTo(map);

      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        setPositions((old) => ({ ...old, [pin.id]: { lon: ll.lng, lat: ll.lat } }));
      });

      made.set(pin.id, marker);
    }
    markersRef.current = made;

    return () => {
      for (const m of made.values()) m.remove();
      markersRef.current = new Map();
      map.off("zoom", onZoom);
      map.off("load", onLoad);
      map.off("click", onMapClick);
      map.remove();
      mapRef.current = null;
    };
  }, [vm, markerW]);

  /* --- сақланган ва тикланган жойлар ----------------------------------- */

  useEffect(() => {
    try {
      if (Object.keys(positions).length === 0) window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    } catch {
      // Хусусий режимда ёзиш тақиқланган бўлиши мумкин — харита ишлайверади,
      // фақат жойлар кейинги очилишда сақланмайди.
    }
  }, [positions]);

  // Маркерни ҳолатга мослаш. Суриш пайтида MapLibre координатани ўзи
  // янгилаган бўлади, шунинг учун фарқ бўлмаса тегилмайди.
  useEffect(() => {
    for (const pin of vm.pins) {
      const marker = markersRef.current.get(pin.id);
      if (!marker) continue;
      const p = positions[pin.id] ?? pin.home;
      const cur = marker.getLngLat();
      if (Math.abs(cur.lng - p.lon) > 1e-9 || Math.abs(cur.lat - p.lat) > 1e-9) {
        marker.setLngLat([p.lon, p.lat]);
      }
    }
  }, [positions, vm.pins]);

  /* --- танлов ва тўғрилаш режимининг кўриниши --------------------------- */

  useEffect(() => {
    for (const pin of vm.pins) {
      const el = markersRef.current.get(pin.id)?.getElement();
      if (!el) continue;
      const on = selected === pin.id;
      el.classList.toggle("map-pin--on", on);
      el.classList.toggle("map-pin--dim", selected !== null && !on);
      el.style.zIndex = on ? "8" : "5";
    }
  }, [selected, vm.pins]);

  useEffect(() => {
    for (const pin of vm.pins) {
      const marker = markersRef.current.get(pin.id);
      if (!marker) continue;
      marker.setDraggable(edit);
      const el = marker.getElement();
      el.classList.toggle("map-pin--edit", edit);
      el.title = edit ? "Маркерни керакли жойга суринг" : pin.name;
    }
  }, [edit, vm.pins]);

  /* --- карточка ойнаси -------------------------------------------------- */

  useEffect(() => {
    const map = mapRef.current;
    const portal = portalRef.current;
    if (!map || !portal || selected === null) return;
    const marker = markersRef.current.get(selected);
    if (!marker) return;

    const popup = new Popup({
      closeButton: false,
      closeOnClick: false,
      focusAfterOpen: false,
      maxWidth: "none",
      className: "map-pop-wrap",
      offset: POPUP_OFFSET,
    })
      .setLngLat(marker.getLngLat())
      .setDOMContent(portal)
      .addTo(map);
    popupRef.current = popup;

    // Тўғрилаш режимида маркер сурилса, ойна ҳам у билан бирга кетсин.
    const follow = () => popup.setLngLat(marker.getLngLat());
    marker.on("drag", follow);

    return () => {
      marker.off("drag", follow);
      popup.remove();
      popupRef.current = null;
    };
  }, [selected, positions, vm.pins]);

  /* --- ташқи сигналлар --------------------------------------------------- */

  useEffect(() => {
    const onFs = () => {
      setIsFull(document.fullscreenElement === boxRef.current);
      // Тўлиқ экранда контейнер ўлчами кескин ўзгаради.
      mapRef.current?.resize();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
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
    map.flyTo({ center: [ll.lng, ll.lat], zoom: Math.max(map.getZoom(), 8.5), duration: 900 });
    // Боғланиш атайин фақат `focusNonce` га: маркернинг ўзи босилганда
    // харита силжимайди.
  }, [focusNonce]);

  /* --- бошқарув ---------------------------------------------------------- */

  const resetPositions = useCallback(() => {
    setPositions({});
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
  const changed = Object.keys(positions).length;

  return (
    <div
      ref={boxRef}
      className={
        "map-shell relative w-full overflow-hidden border border-grid bg-sunken " +
        (isFull ? "h-screen" : "aspect-[2/1] max-h-[620px] min-h-[440px] rounded-card")
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
          aria-pressed={edit}
          aria-label="Маркер жойини тўғрилаш"
          onClick={() => setEdit((v) => !v)}
          className={
            TOOL_BTN + (edit ? " border-s1 text-s1" : " border-hair text-ink-2 hover:text-ink")
          }
        >
          <Icon name="edit" />
        </button>
        <button
          type="button"
          aria-label="Жойларни ва кўринишни тиклаш"
          onClick={resetPositions}
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

      {/* Зум даражаси — хаританинг ўз ўлчови (0 — бутун сайёра). */}
      <span className="pointer-events-none absolute bottom-2 left-2.5 z-20 rounded-[4px] border border-hair bg-surface/85 px-1.5 py-0.5 font-mono text-[10.5px] text-ink-3">
        z {nf(zoom, 1)}
        {atMin && " · энг кичик"}
        {atMax && " · энг катта"}
      </span>

      {edit && (
        <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-[5px] border border-hair bg-surface/92 px-2.5 py-1 text-center text-[11px] leading-[1.35] text-ink-2 shadow-card">
          Маркерни ушлаб керакли жойга суринг — янги координата фақат шу браузерда сақланади
          {changed > 0 && <> · тўғриланган маркер: {changed} та</>}
        </div>
      )}

      {active !== null &&
        portalRef.current !== null &&
        createPortal(
          <PinCard key={active.id} pin={active} onClose={() => onSelect(null)} />,
          portalRef.current,
        )}
    </div>
  );
}

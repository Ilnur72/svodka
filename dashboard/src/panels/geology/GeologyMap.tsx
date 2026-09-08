import { useEffect, useMemo, useRef, useState } from "react";
import { UZ_MAP_HEIGHT, UZ_MAP_WIDTH } from "../../lib/geo/uzbekistan";
import {
  UZ_FULL_BOX,
  focusBoxOf,
  markerRadius,
  type GeoBox,
  type GeoMapRegion,
} from "../../lib/adapters/geologyMap";
import { nf } from "../../lib/format";

/**
 * Лойиҳаларнинг вилоятлар бўйича харитаси.
 *
 * ═══ Битта вилоят — битта маркер ════════════════════════════════════════
 *
 * Ҳар бир лойиҳага алоҳида нуқта қўйилмайди. Биринчидан, Тошкентдаги 11 та
 * лойиҳанинг нуқталари бир-бирининг устига тушарди. Иккинчидан — ва
 * муҳимроғи — манбада **координата умуман йўқ**, фақат вилоят номи бор.
 * Ўн битта нуқтани вилоят ичига сочиб ташлаш ҳар бир нуқта учун ёлғон жой
 * ўйлаб топиш бўларди. Шунинг учун маркер вилоят марказида туради, ичида
 * лойиҳалар сони ёзилади, ўлчами эса сонга қараб ўзгаради.
 *
 * Маркер ўлчами **илдиз** шкаласида (`markerRadius`): доиранинг юзи сонга
 * мутаносиб бўлсин, диаметри эмас.
 *
 * ═══ Фокус ══════════════════════════════════════════════════════════════
 *
 * Вилоят босилганда `viewBox` ўша вилоятнинг чегарасига `requestAnimationFrame`
 * билан силлиқ ўтади. CSS transition бу ерда ишламайди — `viewBox` атрибути
 * ҳамма браузерда анимацияланмайди. `prefers-reduced-motion` ёқилган бўлса
 * анимация умуман бўлмайди, кўриниш дарҳол алмашади.
 *
 * Яқинлаштирилганда чегара чизиғи (`non-scaling-stroke`) ва маркерлар
 * (`k` га тескари масштаб) экранда бир хил ўлчамда қолади — акс ҳолда 5x
 * яқинлашувда чизиқ ҳам, доира ҳам беш баравар йўғонлашиб кетарди.
 *
 * ═══ Уч қатлам ══════════════════════════════════════════════════════════
 *
 *  A. кўринадиган контурлар (сичқонча учун «шаффоф»),
 *  B. босиш майдонлари — ҳар бир вилоят учун,
 *  C. маркерлар — энг устида, клавиатура фокуси ҳам шуларда.
 *
 * Маркер алоҳида қатламда, чунки у вилоят чегарасидан бир оз чиқиб қолса
 * ҳам босилиши **ўз** вилоятини очиши керак: пастдаги қўшни вилоятнинг
 * босиш майдони уни ўғирламасин.
 */

export interface GeologyMapProps {
  regions: GeoMapRegion[];
  /** Энг катта вилоят сони — ранг ва ўлчам шкаласи учун. */
  max: number;
  /** Фокусдаги вилоят калити; `null` — бутун харита. */
  focusKey: string | null;
  onPick: (key: string) => void;
}

const DURATION = 420;

/**
 * Хаританинг энг катта кенглиги, px. Кенг экранда карточканинг бутун эни
 * олинса, 1000×654 нисбати билан баландлик 900px дан ошиб, харита экранга
 * сиғмай қоларди. 920px → тахминан 600px баландлик.
 */
const MAX_WIDTH = 920;

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

const lerpBox = (a: GeoBox, b: GeoBox, k: number): GeoBox => ({
  x: lerp(a.x, b.x, k),
  y: lerp(a.y, b.y, k),
  w: lerp(a.w, b.w, k),
  h: lerp(a.h, b.h, k),
});

const sameBox = (a: GeoBox, b: GeoBox): boolean =>
  Math.abs(a.x - b.x) < 0.01 &&
  Math.abs(a.y - b.y) < 0.01 &&
  Math.abs(a.w - b.w) < 0.01 &&
  Math.abs(a.h - b.h) < 0.01;

/** ease-in-out cubic — бошида ва охирида секин. */
const ease = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/**
 * `viewBox` ни нишонга силлиқ олиб борувчи ҳолат.
 *
 * Анимация ўртасида нишон ўзгарса, ҳаракат жорий кўринишдан давом этади
 * (`fromRef` ҳар кадрда янгиланади) — сакраш бўлмайди.
 */
function useAnimatedBox(target: GeoBox): GeoBox {
  const [box, setBox] = useState<GeoBox>(target);
  const fromRef = useRef<GeoBox>(target);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    if (sameBox(from, target)) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fromRef.current = target;
      setBox(target);
      return;
    }

    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / DURATION);
      const cur = k >= 1 ? target : lerpBox(from, target, ease(k));
      fromRef.current = cur;
      setBox(cur);
      if (k < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // Нишон объекти ҳар рендерда янги, лекин қийматлари ўзгармаса эффект
    // қайта ишламаслиги керак — шунинг учун боғланиш майдонлар бўйича.
  }, [target.x, target.y, target.w, target.h, target]);

  return box;
}

export function GeologyMap({ regions, max, focusKey, onPick }: GeologyMapProps) {
  const [hover, setHover] = useState<string | null>(null);
  /** Маркер элементлари — фокусни уларга бериш учун (қаранг: `pickFrom`). */
  const markerRefs = useRef(new Map<string, SVGGElement>());

  const target = useMemo(() => {
    const r = focusKey === null ? null : (regions.find((x) => x.key === focusKey) ?? null);
    return r === null ? UZ_FULL_BOX : focusBoxOf(r.box);
  }, [focusKey, regions]);

  const box = useAnimatedBox(target);

  // Яқинлашув коэффициенти: маркер ва ёзувни шунга кўпайтирсак, улар
  // экранда доим бир хил ўлчамда қолади.
  const k = box.w / UZ_MAP_WIDTH;

  /**
   * Вилоят туси — лойиҳалар сонига қараб `--s1` нинг интенсивлиги. Лойиҳаси
   * йўқ вилоят нейтрал фонда: «маълумот йўқ» ва «ноль» бир хил кўринмасин
   * дейилса ҳам, бу ерда иккови ҳам «бу вилоятда лойиҳа йўқ» — бир хил.
   */
  const fillOf = (r: GeoMapRegion): string => {
    if (r.count === 0) return "var(--surface-2)";
    const base = 18 + (r.count / max) * 38;
    const pct = Math.round(base + (hover === r.key ? 14 : 0));
    return `color-mix(in oklab, var(--s1) ${pct}%, var(--surface-2))`;
  };

  const hovered = hover === null ? null : (regions.find((r) => r.key === hover) ?? null);

  const enter = (key: string) => setHover(key);
  const leave = (key: string) => setHover((h) => (h === key ? null : h));

  /**
   * Танлашдан олдин фокусни вилоят маркерига беради.
   *
   * Сичқонча билан босилганда браузер SVG элементига фокусни ўзи бермайди
   * (HTML тугмадан фарқи шу). Натижада модал ёпилгач фокус `<body>` га
   * тушиб қоларди ва кейинги `Tab` саҳифанинг бошидан бошланарди. Шу ерда
   * фокус қўлда берилади — шунда клавиатура ва сичқонча йўли бир хил
   * тугайди: ойна ёпилса, фокус ўша маркерга қайтади.
   */
  const pickFrom = (key: string) => {
    markerRefs.current.get(key)?.focus();
    onPick(key);
  };

  return (
    <div
      className="relative mx-auto w-full"
      // Кенглик чекланган, баландлик эса ундан келиб чиқади. Тескариси
      // (`max-height`) ярамайди: у нисбатни бузиб, SVG ни ён томонларида
      // бўш жой қолдирган ҳолда жойлаштирарди — ўшанда пастдаги ёзувнинг
      // фоиз билан ҳисобланган ўрни маркердан сурилиб кетарди.
      style={{ aspectRatio: `${UZ_MAP_WIDTH} / ${UZ_MAP_HEIGHT}`, maxWidth: MAX_WIDTH }}
    >
      <svg
        viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid meet"
        role="group"
        aria-label="Ўзбекистон вилоятлари бўйича геология лойиҳалари харитаси"
        className="h-full w-full"
      >
        {/* --- A: кўринадиган контурлар --------------------------------- */}
        <g style={{ pointerEvents: "none" }}>
          {regions.map((r) => (
            <path
              key={r.key}
              d={r.d}
              fill={fillOf(r)}
              stroke="var(--rule)"
              strokeWidth={0.9}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{
                // Фокусда — қолган вилоятлар сусаяди, лекин йўқолмайди:
                // мамлакат шакли кўриниб турсин.
                opacity: focusKey === null || focusKey === r.key ? 1 : 0.28,
                transition: "fill .18s ease, opacity .3s ease",
              }}
            />
          ))}
        </g>

        {/* --- B: босиш майдонлари -------------------------------------- */}
        <g>
          {regions.map((r) => (
            <path
              key={r.key}
              d={r.d}
              fill="none"
              // `all` — бўялмаган шакл ҳам сичқончани тутади.
              style={{ pointerEvents: "all", cursor: r.count > 0 ? "pointer" : "default" }}
              onMouseEnter={() => enter(r.key)}
              onMouseLeave={() => leave(r.key)}
              onClick={r.count > 0 ? () => pickFrom(r.key) : undefined}
            />
          ))}
        </g>

        {/* --- C: маркерлар --------------------------------------------- */}
        <g>
          {regions
            .filter((r) => r.count > 0)
            .map((r) => {
              const rad = markerRadius(r.count, max) * k;
              const dim = focusKey !== null && focusKey !== r.key;
              const on = hover === r.key;
              return (
                <g
                  key={r.key}
                  ref={(el) => {
                    if (el) markerRefs.current.set(r.key, el);
                    else markerRefs.current.delete(r.key);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${r.nameUz} — ${r.count} та лойиҳа`}
                  onClick={() => pickFrom(r.key)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      pickFrom(r.key);
                    }
                  }}
                  onMouseEnter={() => enter(r.key)}
                  onMouseLeave={() => leave(r.key)}
                  onFocus={() => enter(r.key)}
                  onBlur={() => leave(r.key)}
                  style={{
                    cursor: "pointer",
                    opacity: dim ? 0.35 : 1,
                    transition: "opacity .3s ease",
                  }}
                >
                  <circle
                    cx={r.cx}
                    cy={r.cy}
                    r={rad}
                    fill="var(--s1)"
                    stroke="var(--surface)"
                    strokeWidth={on ? 2.5 : 1.5}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={r.cx}
                    y={r.cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-white font-mono"
                    style={{
                      fontSize: rad * 0.86,
                      fontWeight: 700,
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    {nf(r.count)}
                  </text>
                </g>
              );
            })}
        </g>
      </svg>

      {/* --- ҳолат ёзуви (tooltip) ------------------------------------- */}
      {/* Ўрни фоиз билан берилади ва маркернинг **юқори қирраси** дан
          ҳисобланади — шунда яқинлаштирилган ҳолатда ҳам жойида туради. */}
      {hovered && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full"
          style={{
            left: `${((hovered.cx - box.x) / box.w) * 100}%`,
            top: `${((hovered.cy - markerRadius(hovered.count, max) * k - box.y) / box.h) * 100}%`,
            marginTop: -8,
          }}
        >
          <div className="rounded-md border border-rule bg-surface px-2.5 py-1.5 text-[12px] whitespace-nowrap text-ink shadow-[0_4px_18px_rgba(0,0,0,.18)]">
            <span className="[font-weight:650]">{hovered.nameUz}</span>
            <span className="mx-1.5 text-ink-3">·</span>
            {hovered.count === 0 ? (
              <span className="text-ink-3">лойиҳа йўқ</span>
            ) : (
              <span className="font-mono tabular-nums">{nf(hovered.count)} та лойиҳа</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

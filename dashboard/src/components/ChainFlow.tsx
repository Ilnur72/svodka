import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type {
  ChainLayoutVM,
  ChainLevelVM,
  ChainLinkCounts,
  ChainNodeVM,
} from "../lib/adapters/chain";
import { CHAIN_PCT_MAX, CHAIN_PCT_REF_AT, chainWhyMute } from "../lib/adapters/chain";
import { exact, inkTokenOf, pctTxt, statusOf, stripeOf } from "../lib/format";
import { useElementWidth } from "../lib/useElementWidth";
import { Pill } from "./Pill";

/**
 * «Цехлар занжири» — **битта боғланган технологик оқим харитаси**.
 *
 * Асосий вазн стрелкаларда: тугунлар атайлаб кичик (ном + факт + режа + %),
 * қолган ҳамма нарса — жараён, чиқинди, ресурс сарфи, эҳтимолий кириш,
 * нима учун баҳоланмагани — тугун босилганда пастдаги инспекторда чиқади.
 * Шу сабабли харита карточкалар тўри эмас, оқим бўлиб қолади.
 *
 * ─── Геометрия ────────────────────────────────────────────────────────────
 *
 * Жойлашув `adapters/chain.ts` даги `chainLayout()` дан бутунлай тайёр
 * (устун ва қатор индекслари) келади — бу ерда фақат пиксельга кўчирилади.
 * Тугун ўлчами **қатъий**, шунинг учун DOM ўлчаш керак эмас ва боғланиш
 * эгри чизиғи биринчи кадрдаёқ тўғри жойда бўлади.
 *
 * Чизиқлар — SVG қатламида, тугунлар эса устидаги HTML қатламида: матн
 * браузернинг ўз шрифт растрлаштириши билан чиқади (SVG матндан ўткирроқ),
 * эгри чизиқлар эса ҳақиқий Безье бўлади.
 *
 * ─── Чизиқ услуби маъно ташийди ───────────────────────────────────────────
 *
 *  · **тўлиқ** чизиқ — `exact`: файлда алоҳида «передача» қатори бор ёки
 *    чиқиш ва кириш айнан бир хил номда;
 *  · **узуқ** чизиқ — `probable`: файл матни боғланишни кўрсатади, лекин
 *    алоҳида қатор йўқ;
 *  · **«?» билан тугайдиган калта узуқ дум** — `inputKnown: false`: кириш
 *    файлда «не детализировано», шунинг учун чизиқ **умуман тортилмайди**.
 *    Тахмин қилинмайди; бэкенд эҳтимолий манба берган бўлса у инспекторда
 *    «эҳтимолий кириш» бўлиб қолади.
 *  · **«+N» билан тугайдиган дум** — даража фильтри туфайли иккинчи учи
 *    кўринмаётган боғланиш. Боғланиш йўқолмайди, санаб кўрсатилади.
 *
 * Ранг ҳеч қаерда ёлғиз маъно ташимайди: услуб (тўлиқ/узуқ) ва белги
 * («?», «+N», «⚠») ҳар доим ёнида туради.
 */

/* -------------------------------------------------------------------------- */
/* ўлчамлар                                                                   */
/* -------------------------------------------------------------------------- */

const NODE_W = 164;
const NODE_H = 78;
/** Устунлар ораси — стрелка шу бўшлиқда яшайди. */
const GAP_X = 52;
const GAP_Y = 16;
const PAD_Y = 16;
/**
 * Чап томондаги заҳира — «?» (кириши аниқланмаган) ва «+N» (фильтрдан
 * ташқаридаги кириш) думлари биринчи устуннинг чапида чизилади; заҳирасиз
 * улар холстдан чиқиб кесилиб қоларди.
 */
const PAD_L = 40;
/** Ўнг томондаги заҳира — охирги устундан чиқувчи «+N» думлари учун. */
const PAD_R = 52;
/** Харита устидаги йўналиш сарлавҳаси учун жой. */
const HEAD = 26;
/** Стрелка учи тугунга тегиб турмаслиги учун. */
const TIP = 9;

const ZOOMS = [0.5, 0.6, 0.7, 0.85, 1, 1.2, 1.5] as const;
const MIN_FIT = 0.45;

/** Фақат узун боғланиш йўлаги учун ажратилган қатор — тугун қаторидан паст. */
const LANE_H = 22;

const nx = (col: number): number => PAD_L + col * (NODE_W + GAP_X);

/** Қаторларнинг юқори чегараси ва умумий баландлик: йўлак қаторлар пастроқ. */
function rowGeometry(kinds: readonly ("node" | "lane")[]): { top: number[]; height: number } {
  const top: number[] = [];
  let acc = PAD_Y + HEAD;
  for (const k of kinds) {
    top.push(acc);
    acc += (k === "node" ? NODE_H : LANE_H) + GAP_Y;
  }
  return { top, height: (kinds.length ? acc - GAP_Y : acc) + PAD_Y };
}

/* -------------------------------------------------------------------------- */
/* даража фильтри                                                             */
/* -------------------------------------------------------------------------- */

export const CHAIN_LEVEL_ALL = "all";

/** `SegmentSwitch` учун вариантлар — панелда ясалади, шу ерда тайёрланади. */
export function chainLevelOptions(
  levels: ChainLevelVM[],
  total: number,
): { id: string; label: string; hint: string }[] {
  return [
    {
      id: CHAIN_LEVEL_ALL,
      label: `Все · ${total}`,
      hint: "Барча даража битта боғланган занжирда: устунлар граф топологиясидан ҳисобланади, даража эса тугун ёрлиғи бўлиб қолади.",
    },
    ...levels.map((lv) => ({
      id: String(lv.level),
      label: `${lv.level} ${lv.short} · ${lv.count}`,
      hint: `${lv.label}. Манба файлдаги «Уровень» матнлари: ${lv.stages.join(" · ")}.`,
    })),
  ];
}

/* -------------------------------------------------------------------------- */
/* масштаб                                                                    */
/* -------------------------------------------------------------------------- */

function ZoomBar({
  scale,
  fit,
  onZoom,
  onFit,
  auto,
}: {
  scale: number;
  fit: number;
  onZoom: (z: number) => void;
  onFit: () => void;
  auto: boolean;
}) {
  const step = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z > scale + 0.001);
    const cur = i === -1 ? ZOOMS.length - 1 : Math.max(0, i - 1);
    const next = Math.min(ZOOMS.length - 1, Math.max(0, cur + dir));
    onZoom(ZOOMS[next]);
  };
  const btn =
    "cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-2 py-[3px] text-[12px] font-semibold text-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-[10.5px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
        Масштаб
      </span>
      <button type="button" className={btn} onClick={() => step(-1)} disabled={scale <= ZOOMS[0]} aria-label="Кичрайтириш">
        −
      </button>
      <span className="w-[42px] text-center font-mono text-[11.5px] tabular-nums text-ink-2">
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => step(1)}
        disabled={scale >= ZOOMS[ZOOMS.length - 1]}
        aria-label="Катталаштириш"
      >
        +
      </button>
      <button
        type="button"
        className={btn + (auto ? " opacity-55" : "")}
        onClick={onFit}
        disabled={auto}
        title={`Кенгликка мослаш (${Math.round(fit * 100)}%)`}
      >
        Мослаш
      </button>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* тугун                                                                      */
/* -------------------------------------------------------------------------- */

function FlowNode({
  node,
  top,
  state,
  onPick,
  onHover,
}: {
  node: ChainNodeVM;
  /** Пиксельдаги юқори чегара — қатор баландликлари тенг эмас. */
  top: number;
  /** `lit` — танланган/қўшни, `dim` — четда қолган, `plain` — оддий ҳолат. */
  state: "lit" | "dim" | "plain" | "self";
  onPick: () => void;
  onHover: (id: string | null) => void;
}) {
  const s = node.step;
  const cell = s.cell;
  const pct = cell?.pct ?? null;
  const missing = !cell || cell.empty;
  const stripe = missing ? "var(--rule)" : stripeOf(cell.planless ? null : pct);

  const aria = [
    `${s.site}, ${s.output}`,
    missing ? "маълумот йўқ" : `факт ${exact(cell.fakt)} ${s.unit}`,
    missing ? "" : `режа ${cell.plan === null ? "йўқ" : exact(cell.plan)}`,
    pct === null ? "" : `бажарилиш ${pctTxt(pct)}`,
    s.inputKnown ? "" : "кириши аниқланмаган",
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => onHover(s.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(s.id)}
      onBlur={() => onHover(null)}
      aria-pressed={state === "self"}
      aria-label={aria}
      title={`${s.site} · ${s.output}`}
      className={
        /* `flex flex-col` — браузернинг тугма учун ўз вертикал марказлашини
           бекор қилади: акс ҳолда матн 78px нинг ўртасига тушиб қоларди. */
        "absolute flex flex-col overflow-hidden rounded-[5px] border bg-surface pt-[5px] pr-[7px] pb-[5px] pl-[9px] text-left " +
        (state === "self"
          ? "border-s1 shadow-card ring-2 ring-s1"
          : state === "lit"
            ? "border-s1 shadow-card"
            : "border-hair shadow-card hover:border-rule")
      }
      style={{
        left: nx(node.col),
        top,
        width: NODE_W,
        height: NODE_H,
        opacity: state === "dim" ? 0.3 : 1,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: stripe }}
      />

      <span className="flex w-full flex-none items-baseline justify-between gap-1">
        <span className="min-w-0 truncate text-[9.5px] font-semibold tracking-[0.05em] text-ink-3 uppercase">
          {s.site}
        </span>
        <span
          aria-hidden="true"
          className="flex-none rounded-[3px] bg-sunken px-[4px] font-mono text-[9px] leading-[13px] font-semibold text-ink-3"
          title={`даража ${s.level}`}
        >
          {s.level}
        </span>
      </span>

      <span className="mt-[1px] line-clamp-2 w-full flex-none text-[11px] leading-[1.22] [font-weight:600] text-ink">
        {s.hasLimit && <span className="text-warn-ink">⚠ </span>}
        {s.output}
      </span>

      <span className="mt-auto w-full flex-none">
        <span className="flex w-full items-baseline justify-between gap-1">
          {missing ? (
            <span className="text-[11px] text-ink-3">маълумот йўқ</span>
          ) : (
            <span className="min-w-0 truncate font-mono text-[14.5px] leading-[1.05] [font-weight:640] tracking-[-0.02em] tabular-nums">
              {exact(cell.fakt)}
              <span className="ml-[3px] font-sans text-[9px] font-medium text-ink-3">{s.unit}</span>
            </span>
          )}
          <span
            className="flex-none font-mono text-[11.5px] [font-weight:650] tabular-nums"
            style={{ color: inkTokenOf(cell?.planless ? null : pct) }}
          >
            {cell?.anomaly && <span aria-hidden="true">⚠</span>}
            {cell?.planless ? "режасиз" : pctTxt(pct)}
          </span>
        </span>
        <span className="block w-full truncate font-mono text-[9.5px] leading-[1.25] tabular-nums text-ink-3">
          режа {missing || cell.plan === null ? "—" : exact(cell.plan)}
        </span>
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* харита                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Нуқталар кетма-кетлигидан оқувчи чизиқ. Ҳар бир бўғинда уринма горизонтал,
 * шунинг учун бирлашмалар силлиқ чиқади ва стрелка ҳар доим ўнгга қарайди.
 * Бир хил қатордаги бўғин тўғри чизиқ бўлади — `Ингичка → 4 цех → WO3 → 1 цех`
 * каби асосий занжирлар кўз билан бирдан ўқилади.
 */
function flowPath(pts: readonly (readonly [number, number])[]): string {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    if (Math.abs(y1 - y2) < 0.5) {
      d += ` L${x2.toFixed(1)} ${y2.toFixed(1)}`;
      continue;
    }
    const dx = Math.max(18, (x2 - x1) * 0.45);
    d += ` C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)}, ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }
  return d;
}

export interface ChainMapProps {
  layout: ChainLayoutVM;
  picked: string | null;
  onPick: (id: string | null) => void;
}

export function ChainMap({ layout, picked, onPick }: ChainMapProps) {
  // `useId()` махсус белгилар қайтаради («r0» каби), улар SVG `url(#…)`
  // ҳаволасида ишончсиз — фақат ҳарф/рақам қолдирилади.
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const availW = useElementWidth(wrapRef);
  const [zoom, setZoom] = useState<number | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const W = PAD_L + PAD_R + layout.cols * NODE_W + Math.max(0, layout.cols - 1) * GAP_X;
  const geo = useMemo(() => rowGeometry(layout.rowKinds), [layout.rowKinds]);
  const H = geo.height;
  /** Қаторнинг вертикал маркази — стрелкалар шу баландликда уланади. */
  const midY = (row: number): number =>
    geo.top[row] + (layout.rowKinds[row] === "node" ? NODE_H : LANE_H) / 2;

  // 1px заҳира: `W * fit` айнан `availW` га тенг бўлса яхлитлаш хатоси
  // горизонтал скроллни ёқиб-ўчириб турар ва ўлчаш цикли ҳосил бўларди.
  const fit = availW > 0 ? Math.min(1, Math.max(MIN_FIT, (availW - 1) / W)) : 1;
  const scale = zoom ?? fit;

  // Ёритиш: танланган тугун устун, бўлмаса сичқонча остидаги.
  const focusId = picked ?? hover;
  const { litNodes, litEdges } = useMemo(() => {
    if (!focusId) return { litNodes: null, litEdges: null };
    const n = new Set<string>([focusId]);
    const e = new Set<string>();
    for (const ed of layout.edges) {
      if (ed.from === focusId) {
        n.add(ed.to);
        e.add(ed.id);
      } else if (ed.to === focusId) {
        n.add(ed.from);
        e.add(ed.id);
      }
    }
    return { litNodes: n, litEdges: e };
  }, [focusId, layout.edges]);

  // DOM тартиби ўқиш тартиби билан бир хил: чапдан ўнгга, юқоридан пастга.
  const ordered = useMemo(
    () => layout.nodes.slice().sort((a, b) => a.col - b.col || a.row - b.row),
    [layout.nodes],
  );

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    if (ev.key === "Escape" && picked) {
      ev.stopPropagation();
      onPick(null);
    }
  };

  const head = layout.level === null ? "Хомашё" : `Даража ${layout.level}`;
  const tail = layout.level === null ? "Тайёр маҳсулот · склад" : "оқим йўналиши";

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
        <ZoomBar
          scale={scale}
          fit={fit}
          auto={zoom === null}
          onZoom={setZoom}
          onFit={() => setZoom(null)}
        />
      </div>

      <div
        ref={wrapRef}
        onKeyDown={onKeyDown}
        className="overflow-x-auto rounded-card border border-hair bg-surface-2"
      >
        <div className="relative" style={{ width: W * scale, height: H * scale }}>
          <div
            className="absolute top-0 left-0"
            style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            {/* Йўналиш сарлавҳаси — харита билан бирга сурилади, шунинг учун
                «Хомашё» ҳар доим биринчи устун устида туради. */}
            <div
              className="absolute flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase"
              style={{ left: PAD_L, top: PAD_Y, width: W - PAD_L - PAD_R, height: HEAD - 8 }}
            >
              <span className="flex-none">{head}</span>
              <span aria-hidden="true" className="h-0 flex-1 border-t border-dashed border-rule" />
              <span className="flex-none">{tail} →</span>
            </div>

            <svg
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              className="absolute top-0 left-0"
              aria-hidden="true"
            >
              <defs>
                <marker
                  id={`${uid}-a`}
                  viewBox="0 0 9 8"
                  refX="8.5"
                  refY="4"
                  markerWidth="9"
                  markerHeight="8"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M0 0 L9 4 L0 8 Z" fill="var(--ink-3)" />
                </marker>
                <marker
                  id={`${uid}-b`}
                  viewBox="0 0 9 8"
                  refX="8.5"
                  refY="4"
                  markerWidth="9"
                  markerHeight="8"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M0 0 L9 4 L0 8 Z" fill="var(--rule)" />
                </marker>
                <marker
                  id={`${uid}-c`}
                  viewBox="0 0 9 8"
                  refX="8.5"
                  refY="4"
                  markerWidth="9"
                  markerHeight="8"
                  markerUnits="userSpaceOnUse"
                  orient="auto"
                >
                  <path d="M0 0 L9 4 L0 8 Z" fill="var(--s1)" />
                </marker>
              </defs>

              {layout.edges.map((e) => {
                const a = layout.byId.get(e.from);
                const b = layout.byId.get(e.to);
                if (!a || !b) return null;
                const lit = litEdges?.has(e.id) ?? false;
                const dim = litEdges !== null && !lit;
                const weak = e.confidence === "probable";
                return (
                  <path
                    key={e.id}
                    d={flowPath([
                      [nx(a.col) + NODE_W, midY(a.row)] as const,
                      // Йўлак нуқтаси иккита: устуннинг чап ва ўнг чегарасида.
                      // Шунда чизиқ бутун устун кенглиги бўйлаб текис кетади ва
                      // вертикал ўтиш фақат устунлар орасидаги бўшлиқда бўлади —
                      // ҳеч қайси карточканинг устидан кесиб ўтмайди.
                      ...e.waypoints.flatMap((w) => [
                        [nx(w.col), midY(w.row)] as const,
                        [nx(w.col) + NODE_W, midY(w.row)] as const,
                      ]),
                      [nx(b.col) - TIP, midY(b.row)] as const,
                    ])}
                    fill="none"
                    stroke={lit ? "var(--s1)" : weak ? "var(--rule)" : "var(--ink-3)"}
                    strokeWidth={lit ? 2.2 : 1.5}
                    strokeDasharray={weak ? "5 4" : undefined}
                    strokeOpacity={dim ? 0.18 : 1}
                    markerEnd={`url(#${uid}-${lit ? "c" : weak ? "b" : "a"})`}
                  />
                );
              })}

              {/* Кириши аниқланмаган тугун: чизиқ ўрнига калта узуқ дум ва «?». */}
              {layout.nodes
                .filter((n) => !n.step.inputKnown)
                .map((n) => {
                  const x = nx(n.col);
                  const y = midY(n.row);
                  return (
                    <g key={`q-${n.step.id}`} opacity={litNodes && !litNodes.has(n.step.id) ? 0.25 : 1}>
                      <line
                        x1={x - 26}
                        y1={y}
                        x2={x - 3}
                        y2={y}
                        stroke="var(--rule)"
                        strokeWidth={1.4}
                        strokeDasharray="3 3"
                      />
                      <text
                        x={x - 30}
                        y={y + 4}
                        textAnchor="end"
                        fontSize="12"
                        fontWeight="700"
                        fill="var(--warn-ink)"
                      >
                        ?
                      </text>
                    </g>
                  );
                })}

              {/* Фильтр туфайли иккинчи учи кўринмаётган боғланишлар. */}
              {layout.nodes
                .filter((n) => n.hiddenIn.length > 0)
                .map((n) => {
                  const x = nx(n.col);
                  const y = midY(n.row);
                  return (
                    <g key={`hi-${n.step.id}`}>
                      <line
                        x1={x - 24}
                        y1={y}
                        x2={x - TIP}
                        y2={y}
                        stroke="var(--ink-3)"
                        strokeWidth={1.5}
                        markerEnd={`url(#${uid}-a)`}
                      />
                      <text x={x - 27} y={y - 4} textAnchor="end" fontSize="9.5" fill="var(--ink-3)">
                        +{n.hiddenIn.length}
                      </text>
                    </g>
                  );
                })}
              {layout.nodes
                .filter((n) => n.hiddenOut.length > 0)
                .map((n) => {
                  const x = nx(n.col) + NODE_W;
                  const y = midY(n.row);
                  return (
                    <g key={`ho-${n.step.id}`}>
                      <line
                        x1={x}
                        y1={y}
                        x2={x + 22}
                        y2={y}
                        stroke="var(--ink-3)"
                        strokeWidth={1.5}
                        markerEnd={`url(#${uid}-a)`}
                      />
                      <text x={x + 25} y={y - 4} fontSize="9.5" fill="var(--ink-3)">
                        +{n.hiddenOut.length}
                      </text>
                    </g>
                  );
                })}
            </svg>

            {ordered.map((n) => {
              const id = n.step.id;
              const state =
                litNodes === null
                  ? "plain"
                  : id === focusId
                    ? "self"
                    : litNodes.has(id)
                      ? "lit"
                      : "dim";
              return (
                <FlowNode
                  key={id}
                  node={n}
                  top={geo.top[n.row]}
                  state={state}
                  onPick={() => onPick(picked === id ? null : id)}
                  onHover={setHover}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* инспектор                                                                  */
/* -------------------------------------------------------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <span className="block text-[10px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
        {label}
      </span>
      <span className="block text-[12px] leading-[1.4] text-ink-2">{children}</span>
    </div>
  );
}

/**
 * Танланган босқичнинг тўлиқ тавсифи. Тугунлар кичик бўлиб қолиши учун
 * жараён, чиқинди, ресурс сарфи ва изоҳлар шу ерга кўчирилган — экрандан
 * ҳеч нарса йўқолмайди.
 */
export function ChainInspector({ node, onClose }: { node: ChainNodeVM | null; onClose: () => void }) {
  if (!node) {
    return (
      <div className="rounded-card border border-dashed border-rule px-3.5 py-2.5 text-[12px] leading-[1.45] text-ink-3">
        Харитадаги босқич устига босинг — жараён, кириш/чиқиш, чиқинди, ресурс сарфи ва изоҳлар
        шу ерда тўлиқ чиқади. Тугун ва унга уланган стрелкалар ажратиб кўрсатилади.
      </div>
    );
  }

  const s = node.step;
  const cell = s.cell;
  const pct = cell?.pct ?? null;
  const missing = !cell || cell.empty;
  const why = chainWhyMute(s);

  return (
    <div className="relative rounded-card border border-s1 bg-surface px-3.5 pt-3 pb-3.5 shadow-card">
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-[3px]"
        style={{ background: missing ? "var(--rule)" : stripeOf(cell.planless ? null : pct) }}
      />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[13.5px] leading-[1.3] [font-weight:650]">
            {s.hasLimit && <span className="text-warn-ink">⚠ </span>}
            {s.output}
          </h3>
          <p className="mt-0.5 text-[11.5px] text-ink-3">
            {s.site} · даража {s.level} · {s.stage}
          </p>
        </div>
        <div className="flex flex-none flex-wrap items-center gap-1.5">
          {missing ? (
            <Pill>қиймат йўқ</Pill>
          ) : cell.planless ? (
            <Pill>режасиз</Pill>
          ) : pct === null ? (
            <Pill>бажарилиш —</Pill>
          ) : (
            <Pill status={statusOf(pct)}>
              {cell.anomaly && <span aria-hidden="true">⚠</span>}
              {pctTxt(pct)}
            </Pill>
          )}
          {!s.inputKnown && <Pill status="warn">кириши аниқланмаган</Pill>}
          {!s.available && <Pill>режа/факт юритилмайди</Pill>}
          <button
            type="button"
            onClick={onClose}
            aria-label="Танловни бекор қилиш"
            className="cursor-pointer rounded-[5px] border border-hair bg-surface-2 px-2 py-[3px] text-[12px] font-semibold text-ink-2 hover:text-ink"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
            Факт
          </span>
          <span className="font-mono text-[20px] leading-[1.05] [font-weight:640] tracking-[-0.02em] tabular-nums">
            {missing ? "—" : exact(cell.fakt)}
          </span>
          <span className="text-[11.5px] font-medium text-ink-3">{s.unit}</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
            Режа
          </span>
          <span className="font-mono text-[14px] tabular-nums text-ink-2">
            {missing || cell.plan === null ? "—" : exact(cell.plan)}
          </span>
          <span className="text-[11.5px] font-medium text-ink-3">{s.unit}</span>
        </span>
      </div>

      {/* Бажарилиш устуни — фоиз ўқида; бирликлар турлича, абсолют сонлар
          битта шкалага қўйилмайди. */}
      {cell?.barPct != null && (
        <div className="relative mt-2 h-2.5 max-w-[420px] rounded-[3px] bg-sunken">
          <div
            className="absolute top-0 bottom-0 left-0 rounded-[3px]"
            style={{
              width: `${((cell.barPct / CHAIN_PCT_MAX) * 100).toFixed(2)}%`,
              background: stripeOf(pct),
            }}
          />
          <span
            aria-hidden="true"
            className="absolute -top-1 -bottom-1 w-[2px] rounded-[1px] bg-ink"
            style={{ left: `calc(${CHAIN_PCT_REF_AT.toFixed(2)}% - 1px)` }}
          />
          {cell.anomaly && (
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-[3px] -translate-y-1/2 font-mono text-[10px] leading-none text-ink"
            >
              »
            </span>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 gap-x-5 gap-y-2 border-t border-grid pt-2.5 mid:grid-cols-2 wide:grid-cols-3">
        <Field label="Кириш">
          {s.inputKnown ? s.input : <span className="text-warn-ink">{s.input} — аниқланмаган</span>}
        </Field>
        <Field label="Жараён">{s.process || "—"}</Field>
        <Field label="Чиқиш">{s.output}</Field>
        {s.waste && <Field label="Чиқинди">{s.waste}</Field>}
        {s.resource && <Field label="Ресурс">{s.resource}</Field>}
        {s.probableInputs.length > 0 && (
          <Field label="Эҳтимолий кириш (чизиқ тортилмади)">{s.probableInputs.join(" · ")}</Field>
        )}
        {node.hiddenIn.length > 0 && (
          <Field label="Фильтрда яширинган кириш">{node.hiddenIn.join(" · ")}</Field>
        )}
        {node.hiddenOut.length > 0 && (
          <Field label="Фильтрда яширинган чиқиш">{node.hiddenOut.join(" · ")}</Field>
        )}
        {why && <Field label="Нима учун баҳоланмайди">{why}</Field>}
      </div>

      {s.resources.length > 0 && (
        <div className="mt-2.5 border-t border-grid pt-2">
          <span className="block text-[10px] font-semibold tracking-[0.07em] text-ink-3 uppercase">
            Ресурс сарфи
          </span>
          {s.resources.map((r) => (
            <div
              key={r.id}
              className="mt-1 flex items-baseline justify-between gap-2 text-[11.5px]"
            >
              <span className="min-w-0 truncate text-ink-2">{r.resource ?? r.output}</span>
              <span className="flex flex-none items-baseline gap-2">
                <span className="font-mono tabular-nums text-ink-2">
                  {r.cell?.fakt == null ? "—" : exact(r.cell.fakt)} {r.unit}
                </span>
                <span
                  className="font-mono [font-weight:650] tabular-nums"
                  style={{ color: inkTokenOf(r.cell?.pct ?? null) }}
                >
                  {pctTxt(r.cell?.pct ?? null)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* легенда                                                                    */
/* -------------------------------------------------------------------------- */

export function ChainLegend({
  counts,
  drawn,
  hidden,
  inputUnknown,
}: {
  counts: ChainLinkCounts;
  /** Шу кўринишда ҳақиқатан чизилган боғланишлар. */
  drawn: number;
  /** Даража фильтри туфайли иккинчи учи кўринмаётганлари. */
  hidden: number;
  inputUnknown: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 text-[11.5px] leading-[1.45] text-ink-2">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="8" aria-hidden="true" className="flex-none">
            <line x1="0" y1="4" x2="19" y2="4" stroke="var(--ink-3)" strokeWidth="1.5" />
            <path d="M18 0 L26 4 L18 8 Z" fill="var(--ink-3)" />
          </svg>
          Аниқ боғланиш ({counts.exact})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="8" aria-hidden="true" className="flex-none">
            <line
              x1="0"
              y1="4"
              x2="19"
              y2="4"
              stroke="var(--rule)"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <path d="M18 0 L26 4 L18 8 Z" fill="var(--rule)" />
          </svg>
          Эҳтимолий боғланиш ({counts.probable})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="10" aria-hidden="true" className="flex-none">
            <line
              x1="8"
              y1="5"
              x2="26"
              y2="5"
              stroke="var(--rule)"
              strokeWidth="1.4"
              strokeDasharray="3 3"
            />
            <text x="6" y="9" textAnchor="end" fontSize="11" fontWeight="700" fill="var(--warn-ink)">
              ?
            </text>
          </svg>
          Кириши аниқланмаган ({inputUnknown})
        </span>
        {hidden > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="font-mono text-ink-3">
              +N →
            </span>
            Фильтрдан ташқаридаги боғланиш ({hidden})
          </span>
        )}
      </div>
      <p className="text-ink-3">
        Ҳозирги кўринишда {drawn} та боғланиш чизилди. Кириши аниқланмаган босқичга чизиқ
        тортилмайди — манба файлнинг ўзи «не детализировано» деб ёзган
        {counts.suppressed > 0 && (
          <>
            {" "}
            (шу сабабли {counts.suppressed} та боғланиш чизилмади; улар йўқолмайди — босқич
            танланганда «эҳтимолий кириш» бўлиб чиқади)
          </>
        )}
        . Устунлар граф топологиясидан ҳисобланади, файлдаги «Уровень» эмас: даража тугундаги
        рақам ва юқоридаги фильтр бўлиб қолади. Бажарилиш устуни {CHAIN_PCT_MAX}% да тугайди:
        ундан катта фоиз кесилади (⚠ ва »), ҳақиқий сон тўлиқ ёзилади.
      </p>
    </div>
  );
}

import { useMemo, useRef } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePalette } from "../lib/theme";
import { exact } from "../lib/format";
import { ChartTooltip } from "./ChartTooltip";
import { useElementWidth } from "../lib/useElementWidth";
import { truncateToWidth } from "../lib/measureText";

export interface BarRow {
  label: string;
  v: number;
  /** Per-row bar colour; falls back to --s1. */
  color?: string;
  /** Per-row colour of the value label — used to carry plan status. */
  valueColor?: string;
  /** Extra tooltip line, e.g. ["Улуш", "12,4%"]. */
  extra?: [string, string];
}

export interface BarsHProps {
  rows: BarRow[];
  /** Fixed domain maximum, e.g. 100 for a percentage chart. */
  max?: number;
  /** Draw a sunken track behind every bar. */
  track?: boolean;
  vFmt?: (v: number) => string;
  /** Series name shown in the tooltip. */
  vName: string;
  rowH?: number;
  thick?: number;
  /** Right gutter reserved for the value label. */
  padR?: number;
  /** Fixed left gutter; by default derived from the container width. */
  padL?: number;
  ariaLabel: string;
}

interface Datum {
  label: string;
  full: string;
  v: number;
  color?: string;
  extraK?: string;
  extraV?: string;
}

const LABEL_FONT = '12px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

interface EndLabelProps {
  rows: BarRow[];
  vFmt: (v: number) => string;
  defaultColor: string;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  index?: number;
}

/** Value label pinned to the end of each bar, coloured per row when needed. */
function EndLabel({ rows, vFmt, defaultColor, viewBox, index }: EndLabelProps) {
  if (index === undefined || !viewBox) return null;
  const row = rows[index];
  if (!row) return null;
  const { x = 0, y = 0, width = 0, height = 0 } = viewBox;
  return (
    <text
      x={x + width + 8}
      y={y + height / 2 + 4}
      fill={row.valueColor ?? defaultColor}
      fontSize={11.5}
      fontWeight={row.valueColor ? 600 : 400}
      style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}
    >
      {vFmt(row.v)}
    </text>
  );
}

interface CategoryTickProps {
  color: string;
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  /** Untruncated label, shown as a native SVG tooltip. */
  fullLabels: string[];
  index?: number;
}

/**
 * Custom axis tick: the built-in one word-wraps long names onto several lines,
 * which makes neighbouring rows collide. This renders a single truncated line
 * and keeps the full name available on hover.
 */
function CategoryTick({ color, x = 0, y = 0, payload, fullLabels, index }: CategoryTickProps) {
  const shown = String(payload?.value ?? "");
  const full = index !== undefined ? (fullLabels[index] ?? shown) : shown;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={color} fontSize={12}>
      {shown}
      <title>{full}</title>
    </text>
  );
}

export function BarsH({
  rows,
  max,
  track = false,
  vFmt = exact,
  vName,
  rowH = 24,
  thick = 22,
  padR = 74,
  padL,
  ariaLabel,
}: BarsHProps) {
  const p = usePalette();
  const boxRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(boxRef, 640);

  const gutter = padL ?? Math.min(230, Math.max(110, Math.round(width * 0.3)));

  const data = useMemo<Datum[]>(
    () =>
      rows.map((r) => ({
        label: truncateToWidth(r.label, gutter - 16, LABEL_FONT),
        full: r.label,
        v: r.v,
        color: r.color,
        extraK: r.extra?.[0],
        extraV: r.extra?.[1],
      })),
    [rows, gutter],
  );

  const fullLabels = useMemo(() => rows.map((r) => r.label), [rows]);

  const height = rows.length * rowH + 10;
  const domainMax = max ?? Math.max(1, ...rows.map((r) => r.v));
  const hasCustomColors = rows.some((r) => r.color);

  if (rows.length === 0) {
    return <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">Маълумот йўқ.</div>;
  }

  return (
    <div ref={boxRef} role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: padR, bottom: 2, left: 0 }}
          barCategoryGap="18%"
        >
          <XAxis type="number" domain={[0, domainMax]} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={gutter}
            tick={<CategoryTick color={p["ink-2"]} fullLabels={fullLabels} />}
            tickLine={false}
            axisLine={{ stroke: p.rule }}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: p.sunken, fillOpacity: 0.55 }}
            content={
              <ChartTooltip
                vFmt={vFmt}
                extraOf={(pl) =>
                  typeof pl.extraK === "string" && typeof pl.extraV === "string"
                    ? [[pl.extraK, pl.extraV]]
                    : undefined
                }
              />
            }
            isAnimationActive={false}
          />
          <Bar
            dataKey="v"
            name={vName}
            fill={p.s1}
            maxBarSize={Math.min(thick, 24)}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            // Recharts drops zero-width rectangles completely, which would also
            // remove the track, the value label and the tooltip for a row whose
            // value is 0 — a meaningful state here ("plan set, nothing produced").
            // A sub-pixel minimum keeps the row present without faking a value.
            minPointSize={0.6}
            background={track ? { fill: p.sunken, radius: 3 } : undefined}
          >
            {hasCustomColors && data.map((d) => <Cell key={d.full} fill={d.color ?? p.s1} />)}
            <LabelList content={<EndLabel rows={rows} vFmt={vFmt} defaultColor={p["ink-2"]} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

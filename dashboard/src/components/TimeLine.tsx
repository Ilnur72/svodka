import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePalette } from "../lib/theme";
import { smart } from "../lib/format";
import { ChartTooltip } from "./ChartTooltip";

export interface LineSeries {
  name: string;
  /** Concrete colour, taken from the palette by the caller. */
  color: string;
  values: number[];
}

export interface TimeLineProps {
  /** Short axis labels, e.g. day numbers. */
  labels: string[];
  /** Full labels used in the tooltip header, e.g. "12-май 2026". */
  fullLabels?: string[];
  series: LineSeries[];
  height?: number;
  yTickFmt?: (v: number) => string;
  /** Y ўқи учун ажратилган кенглик; узун белгиларда (масалан «100,0 млн») оширилади. */
  yWidth?: number;
  vFmt?: (v: number) => string;
  /** Single-series charts get a light area fill unless disabled. */
  area?: boolean;
  ariaLabel: string;
}

type Datum = { x: string; full: string } & Record<string, string | number>;

/**
 * Label density: keep the axis readable at 31 points and at 6, and always
 * label the last point so the period end is never ambiguous.
 */
function axisTicks(labels: string[]): string[] {
  const n = labels.length;
  const every = n > 24 ? 5 : n > 12 ? 3 : 1;
  return labels.filter((_, i) => i % every === 0 || i === n - 1);
}

export function TimeLine({
  labels,
  fullLabels,
  series,
  height = 250,
  yTickFmt = smart,
  yWidth = 56,
  vFmt,
  area = true,
  ariaLabel,
}: TimeLineProps) {
  const p = usePalette();

  // Not memoised on purpose: callers build `series` inline, so a memo would
  // miss on every render while still costing a dependency comparison.
  const data: Datum[] = labels.map((l, i) => {
    const row: Datum = { x: l, full: fullLabels?.[i] ?? l };
    series.forEach((s, k) => {
      row[`s${k}`] = s.values[i] ?? 0;
    });
    return row;
  });

  const ticks = useMemo(() => axisTicks(labels), [labels]);
  const useArea = area && series.length === 1;
  const axisTick = { fill: p["ink-3"], fontSize: 10.5, fontFamily: "var(--mono)" };

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 12, right: 14, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={p.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="x"
            ticks={ticks}
            interval={0}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: p.rule }}
            tickMargin={8}
            minTickGap={0}
          />
          <YAxis
            width={yWidth}
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            tickFormatter={yTickFmt}
          />
          <Tooltip
            cursor={{ stroke: p.rule, strokeWidth: 1 }}
            content={<ChartTooltip vFmt={vFmt} />}
            isAnimationActive={false}
          />
          {series.map((s, k) =>
            useArea ? (
              <Area
                key={s.name}
                type="linear"
                dataKey={`s${k}`}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 4.5, fill: s.color, stroke: p.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ) : (
              <Line
                key={s.name}
                type="linear"
                dataKey={`s${k}`}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4.5, fill: s.color, stroke: p.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePalette } from "../lib/theme";
import { smart } from "../lib/format";
import { ChartTooltip } from "./ChartTooltip";

export interface ColumnSeries {
  name: string;
  color: string;
  values: number[];
}

export interface ColumnsProps {
  labels: string[];
  fullLabels?: string[];
  /** One to three series, drawn side by side. */
  series: ColumnSeries[];
  height?: number;
  /** Bar thickness; capped at 24px by the chart rules. */
  thick?: number;
  yTickFmt?: (v: number) => string;
  /** Y ўқи учун ажратилган кенглик; узун белгиларда (масалан «100,0 млн») оширилади. */
  yWidth?: number;
  vFmt?: (v: number) => string;
  ariaLabel: string;
}

type Datum = { x: string; full: string } & Record<string, string | number>;

/** Same density rule as the line charts; the last column is always labelled. */
function axisTicks(labels: string[]): string[] {
  const n = labels.length;
  const every = n > 24 ? 5 : n > 14 ? 2 : 1;
  return labels.filter((_, i) => i % every === 0 || i === n - 1);
}

export function Columns({
  labels,
  fullLabels,
  series,
  height = 230,
  thick = 22,
  yTickFmt = smart,
  yWidth = 56,
  vFmt,
  ariaLabel,
}: ColumnsProps) {
  const p = usePalette();

  // See TimeLine: `series` arrives as a fresh array each render, so memoising
  // this mapping would never pay off.
  const data: Datum[] = labels.map((l, i) => {
    const row: Datum = { x: l, full: fullLabels?.[i] ?? l };
    series.forEach((s, k) => {
      row[`s${k}`] = s.values[i] ?? 0;
    });
    return row;
  });

  const ticks = useMemo(() => axisTicks(labels), [labels]);
  const axisTick = { fill: p["ink-3"], fontSize: 10.5, fontFamily: "var(--mono)" };

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 0 }} barGap={2}>
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
            cursor={{ fill: p.sunken, fillOpacity: 0.55 }}
            content={<ChartTooltip vFmt={vFmt} />}
            isAnimationActive={false}
          />
          {series.map((s, k) => (
            <Bar
              key={s.name}
              dataKey={`s${k}`}
              name={s.name}
              fill={s.color}
              maxBarSize={Math.min(thick, 24)}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

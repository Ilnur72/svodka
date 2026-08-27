import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
  /**
   * Устунлар ёнма-ён эмас, бир-бирининг устига қўйилади.
   * Фақат йиғиндиси маъноли бўлган қаторлар учун — масалан «жорий + узоқ
   * муддатли активлар». Турли ўлчов бирлигидаги қаторлар стекланмайди.
   */
  stacked?: boolean;
  /** Нол чизиғи — манфий қиймат бор диаграммада мажбурий. */
  zeroLine?: boolean;
  /**
   * Устун устидаги қиймат ёрлиғи. Ҳар бир устун учун матн ёки `null`
   * қайтарилади — `null` бўлса ёрлиқ чизилмайди. Айнан шу тарзда ёрлиқ
   * **танлаб** қўйилади: барча устунга ёзилса диаграмма сон билан тўлиб
   * кетади ва устунларнинг ўзи ўқилмай қолади.
   *
   * Берилмаса ёрлиқ умуман чизилмайди — бу мазкур компонентнинг аввалги
   * (ва қолган барча чақирувчилардаги) хулқи.
   */
  valueLabel?: (seriesIndex: number, index: number) => string | null;
  ariaLabel: string;
}

interface TopLabelProps {
  text: (index: number) => string | null;
  color: string;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  index?: number;
}

/**
 * Устун учининг устидаги қиймат. Нол баландликдаги устунда ҳам чизилади —
 * Recharts ёрлиқларни тўртбурчакдан алоҳида қатламда беради, шунинг учун
 * ҳақиқий нол экранда «0» бўлиб кўринади ва йўқолиб қолмайди.
 */
function TopLabel({ text, color, viewBox, index }: TopLabelProps) {
  if (index === undefined || !viewBox) return null;
  const v = text(index);
  if (v === null) return null;
  const { x = 0, y = 0, width = 0 } = viewBox;
  return (
    <text
      x={x + width / 2}
      y={y - 5}
      textAnchor="middle"
      fill={color}
      fontSize={11}
      style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" }}
    >
      {v}
    </text>
  );
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
  stacked = false,
  zeroLine = false,
  valueLabel,
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
        {/* Юқоридаги бўш жой қиймат ёрлиғи бор диаграммада каттароқ: энг
            баланд устун шкаланинг тепасига тегиб турганда ёрлиқ сиғмай
            кесилиб қоларди. Ёрлиқсиз диаграммада эса аввалгидек. */}
        <BarChart
          data={data}
          margin={{ top: valueLabel ? 22 : 12, right: 12, bottom: 0, left: 0 }}
          barGap={2}
        >
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
          {/* Манфий устунлар бор диаграммада нол чизиғи ўқдан ажралиб туриши
              керак — акс ҳолда пастга тушган устун «камайган» эмас, «кичик»
              бўлиб кўринади. */}
          {zeroLine && <ReferenceLine y={0} stroke={p.rule} strokeWidth={1} />}
          {series.map((s, k) => (
            <Bar
              key={s.name}
              dataKey={`s${k}`}
              name={s.name}
              fill={s.color}
              stackId={stacked ? "a" : undefined}
              maxBarSize={Math.min(thick, 24)}
              // Стекда фақат энг устки бўлак юмалоқланади: ҳар бўлакка радиус
              // берилса улар орасида «тиш» пайдо бўларди. Манфий устунда эса
              // Recharts тўртбурчакни манфий баландлик билан чизади, шунинг
              // учун бу радиус ноль чизиғида эмас, устуннинг четида қолади.
              radius={stacked && k < series.length - 1 ? 0 : [4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {valueLabel && (
                <LabelList
                  content={
                    <TopLabel text={(i) => valueLabel(k, i)} color={p["ink-2"]} />
                  }
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

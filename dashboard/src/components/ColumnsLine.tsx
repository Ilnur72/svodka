import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePalette } from "../lib/theme";
import { smart } from "../lib/format";
import { ChartTooltip } from "./ChartTooltip";

/**
 * Устун + чизиқ, **битта Y ўқида**.
 *
 * ═══ Нега алоҳида компонент ═════════════════════════════════════════════
 *
 * `Columns` — соф `BarChart`, `TimeLine` — соф чизиқ. Иккисидан бирига
 * иккинчи турни қўшиш ўн битта табда ишлаётган диаграммаларга тегарди,
 * шунинг учун бу комбинация алоҳида, ўз файлида турибди.
 *
 * ═══ Иккинчи Y ўқи йўқ ══════════════════════════════════════════════════
 *
 * Компонентда иккинчи ўқ **умуман кўзда тутилмаган**: `yAxisId` йўқ, битта
 * `YAxis` бор. Устун ҳам, чизиқ ҳам бир хил ўлчовда бўлиши шарт (масалан
 * иккаласи ҳам «киши»); акс ҳолда бу компонент ишлатилмайди — иккита
 * алоҳида диаграмма чизилади. Иккинчи ўқ сунъий боғлиқлик ясайди ва
 * дашборд қоидаларида тақиқланган.
 *
 * ═══ Сон ҳар бир нуқтада эмас ═══════════════════════════════════════════
 *
 * Устун устидаги сон фақат `barLabelAt` да кўрсатилган индексларда чизилади.
 * Қолган қиймат тултипда ва «Жадвал кўриниши» да қолади — акс ҳолда 24 та
 * сон бир-бирининг устига чиқиб кетарди.
 */

export interface ColumnsLineSeries {
  name: string;
  /** Аниқ ранг — чақирувчи `usePalette()` дан олади. */
  color: string;
  values: number[];
}

export interface ColumnsLineProps {
  /** Ўқ белгилари. */
  labels: string[];
  /** Тултип сарлавҳаси учун тўлиқ ёрлиқлар. */
  fullLabels?: string[];
  bar: ColumnsLineSeries;
  line: ColumnsLineSeries;
  /** Устун устига сон ёзиладиган индекслар. Бўш бўлса — ҳеч қаерда. */
  barLabelAt?: number[];
  height?: number;
  thick?: number;
  yTickFmt?: (v: number) => string;
  yWidth?: number;
  vFmt?: (v: number) => string;
  ariaLabel: string;
}

type Datum = { x: string; full: string; bar: number; line: number };

/** Ўқ белгиларининг зичлиги — `Columns` даги қоида билан бир хил. */
function axisTicks(labels: string[]): string[] {
  const n = labels.length;
  const every = n > 24 ? 5 : n > 14 ? 2 : 1;
  return labels.filter((_, i) => i % every === 0 || i === n - 1);
}

interface TopLabelProps {
  values: number[];
  at: number[];
  fmt: (v: number) => string;
  color: string;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  index?: number;
}

/** Устун устидаги сон — фақат танланган индексларда. */
function TopLabel({ values, at, fmt, color, viewBox, index }: TopLabelProps) {
  if (index === undefined || !viewBox || !at.includes(index)) return null;
  const v = values[index];
  if (v === undefined) return null;
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
      {fmt(v)}
    </text>
  );
}

export function ColumnsLine({
  labels,
  fullLabels,
  bar,
  line,
  barLabelAt = [],
  height = 260,
  thick = 22,
  yTickFmt = smart,
  yWidth = 56,
  vFmt,
  ariaLabel,
}: ColumnsLineProps) {
  const p = usePalette();

  // `Columns` ва `TimeLine` да бўлгани каби мемоизация қилинмайди: чақирувчи
  // қаторларни ҳар рендерда янгидан ясайди.
  const data: Datum[] = labels.map((l, i) => ({
    x: l,
    full: fullLabels?.[i] ?? l,
    bar: bar.values[i] ?? 0,
    line: line.values[i] ?? 0,
  }));

  const ticks = useMemo(() => axisTicks(labels), [labels]);
  const axisTick = { fill: p["ink-3"], fontSize: 10.5, fontFamily: "var(--mono)" };

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 16, right: 14, bottom: 0, left: 0 }}>
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
          {/* Ягона ўқ: устун ҳам, чизиқ ҳам шу шкалада ўқилади. */}
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
          <Bar
            dataKey="bar"
            name={bar.name}
            fill={bar.color}
            maxBarSize={Math.min(thick, 24)}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            <LabelList
              content={
                <TopLabel
                  values={bar.values}
                  at={barLabelAt}
                  fmt={vFmt ?? smart}
                  color={p["ink-2"]}
                />
              }
            />
          </Bar>
          <Line
            type="linear"
            dataKey="line"
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4.5, fill: line.color, stroke: p.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

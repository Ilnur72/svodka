import { useId } from "react";

/**
 * Карточка ичидаги кичик тренд чизиғи.
 *
 * Recharts эмас, оддий SVG: бу ерда ўқ, тултип, легенда ва интерактив ҳеч
 * нарса керак эмас — фақат «юқорига кетяптими ёки пастга». Recharts'нинг
 * `ResponsiveContainer` и бир карточка учун ортиқча ва катта карточкалар
 * қаторини секинлаштирарди.
 *
 * Маълумоти йўқ ойлар (`null`) **нол деб чизилмайди** — чизиқ ўша жойда
 * узилади. Шунинг учун битта `polyline` эмас, бир нечта сегмент чизилади.
 */
export interface SparklineProps {
  values: (number | null)[];
  /** CSS ранг токени, масалан `var(--good)`. */
  color: string;
  width?: number;
  height?: number;
  /** Экран ўқувчи учун — диаграмма ўзи `aria-hidden` бўлади. */
  label: string;
}

export function Sparkline({ values, color, width = 96, height = 28, label }: SparklineProps) {
  const uid = useId();
  const known = values.filter((v): v is number => v !== null);
  if (known.length < 2) return null;

  const min = Math.min(...known);
  const max = Math.max(...known);
  const span = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : width;
  const pad = 2;

  const xy = (v: number, i: number): [number, number] => [
    i * stepX,
    height - pad - ((v - min) / span) * (height - pad * 2),
  ];

  // Узилишларда сегментларга бўламиз: `null` ой чизиқни кесади.
  const segments: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current.join(" "));
      current = [];
      return;
    }
    const [x, y] = xy(v, i);
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });
  if (current.length > 1) segments.push(current.join(" "));

  const lastIdx = values.length - 1 - [...values].reverse().findIndex((v) => v !== null);
  const last = values[lastIdx];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <title id={`${uid}-t`}>{label}</title>
      {segments.map((pts) => (
        <polyline
          key={pts.slice(0, 24)}
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ))}
      {last !== null && last !== undefined && (
        <circle {...pointAttrs(xy(last, lastIdx))} r={2.5} fill={color} />
      )}
    </svg>
  );
}

const pointAttrs = ([cx, cy]: [number, number]) => ({ cx, cy });

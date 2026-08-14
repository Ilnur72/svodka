import { exact } from "../lib/format";

/** Minimal view of the payload Recharts injects into a custom tooltip. */
export interface TipEntry {
  name?: string;
  value?: number | string | (number | string)[];
  color?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  vFmt?: (v: number) => string;
  /** Extra rows appended after the series values, e.g. share of total. */
  extraOf?: (payload: Record<string, unknown>) => [string, string][] | undefined;
  /* injected by Recharts */
  active?: boolean;
  payload?: readonly TipEntry[];
  label?: string | number;
}

function toNumber(v: TipEntry["value"]): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function ChartTooltip({ vFmt, extraOf, active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const first = payload[0]?.payload;
  const head = typeof first?.full === "string" ? first.full : String(label ?? "");
  const extras = first && extraOf ? extraOf(first) : undefined;

  return (
    <div className="min-w-[120px] rounded-md border border-rule bg-surface px-2.5 py-2 text-[12px] text-ink shadow-[0_4px_18px_rgba(0,0,0,.18)]">
      <div className="mb-[5px] text-[11.5px] [font-weight:650]">{head}</div>
      {payload.map((p) => {
        const n = toNumber(p.value);
        return (
          <div key={String(p.name)} className="mt-[3px] flex items-center justify-between gap-3.5">
            <span className="flex items-center gap-1.5 text-ink-2">
              <i
                aria-hidden="true"
                className="h-[9px] w-[9px] flex-none rounded-sm"
                style={{ background: p.color }}
              />
              {p.name}
            </span>
            <span className="font-mono font-semibold tabular-nums">
              {n === null ? "—" : vFmt ? vFmt(n) : exact(n)}
            </span>
          </div>
        );
      })}
      {extras?.map(([k, v]) => (
        <div key={k} className="mt-[3px] flex items-center justify-between gap-3.5">
          <span className="text-ink-2">{k}</span>
          <span className="font-mono font-semibold tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  );
}

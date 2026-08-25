import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { Status } from "../types";
import type { KpiCounts } from "../lib/adapters/kpi";
import { KPI_STATUS_LABEL, KPI_STATUS_ORDER, KPI_STATUS_TOKEN } from "../lib/adapters/kpi";
import { usePalette } from "../lib/theme";
import { nf } from "../lib/format";

/**
 * Ҳолатлар тақсимоти — донат.
 *
 * Донат бу ерда ўринли: бу **бутуннинг қисмлари** (ҳар бир кўрсаткич айнан
 * битта ҳолатда) ва сегментлар сони кам — 3, маълумоти йўқ қаторлар бўлса 4.
 * Яқин қийматларни таққослаш учун эмас: аниқ сонлар ёнидаги легендада
 * ёзилган, донат фақат нисбатни кўрсатади.
 *
 * Марказда — жами. Сегментлар йиғиндиси марказдаги сон билан **тенг**:
 * «баҳоланмайди» гуруҳи ҳам сегмент сифатида чиқади (уни тушириб қолдириш
 * 45 та кўрсаткични 42 та қилиб кўрсатарди).
 *
 * Ранг ёлғиз маъно ташимайди: ҳар бир сегмент легендада номи ва сони билан
 * такрорланади, `title` да эса фоизи ҳам бор.
 */
export interface StatusDonutProps {
  counts: KpiCounts;
  /** Марказдаги изоҳ, масалан «жami». */
  centerNote: string;
  size?: number;
  /** Легендадаги қаторга босилса — шу ҳолат бўйича фильтр. */
  onPick?: (status: Status) => void;
  /** Ҳозир танланган ҳолат — легендада белгиланади. */
  active?: Status | null;
}

export function StatusDonut({
  counts,
  centerNote,
  size = 132,
  onPick,
  active = null,
}: StatusDonutProps) {
  const p = usePalette();
  // Recharts `var(--x)` ни тушунмайди — палитрадан аниқ ранг олинади.
  const fill: Record<Status, string> = {
    good: p.good,
    warn: p.warn,
    crit: p.crit,
    mute: p.rule,
  };

  const shown = KPI_STATUS_ORDER.filter((s) => counts[s] > 0);
  const total = counts.total;
  const data = shown.map((s) => ({ status: s, value: counts[s] }));
  const share = (n: number): string => (total ? nf((n / total) * 100, 0) + "%" : "—");

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div className="relative flex-none" style={{ width: size, height: size }}>
        {total > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="status"
                innerRadius="66%"
                outerRadius="100%"
                paddingAngle={1.5}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((d) => (
                  <Cell key={d.status} fill={fill[d.status]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[22px] leading-none [font-weight:650] tabular-nums">
            {nf(total, 0)}
          </span>
          <span className="mt-1 text-[10.5px] text-ink-3">{centerNote}</span>
        </div>
      </div>

      <ul className="flex min-w-[168px] flex-col gap-1.5">
        {shown.map((s) => {
          const on = active === s;
          const row = (
            <>
              <i
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 flex-none rounded-sm"
                style={{ background: KPI_STATUS_TOKEN[s] }}
              />
              <span className="flex-1 text-ink-2">{KPI_STATUS_LABEL[s]}</span>
              <b className="font-mono tabular-nums">{nf(counts[s], 0)}</b>
              <span className="font-mono text-ink-3 tabular-nums">({share(counts[s])})</span>
            </>
          );
          return (
            <li key={s} className="text-[12px]">
              {onPick ? (
                <button
                  type="button"
                  onClick={() => onPick(s)}
                  aria-pressed={on}
                  title={`${KPI_STATUS_LABEL[s]}: ${counts[s]} та (${share(counts[s])})`}
                  className={
                    "flex w-full cursor-pointer items-center gap-2 rounded-[5px] px-1.5 py-1 text-left " +
                    (on ? "bg-surface-2 [font-weight:600]" : "hover:bg-surface-2")
                  }
                >
                  {row}
                </button>
              ) : (
                <span className="flex items-center gap-2 px-1.5 py-1">{row}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

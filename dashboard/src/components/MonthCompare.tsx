import { deltaTxt, exact } from "../lib/format";
import { Pill } from "./Pill";
import { ChartLegend } from "./ChartLegend";

export interface CmpRow {
  label: string;
  /** Ҳар бир қатор ўз ўлчов бирлигида — қаторлар ўзаро таққосланмайди. */
  unit: string;
  a: number;
  b: number;
}

export interface MonthCompareProps {
  rows: CmpRow[];
  aName: string;
  bName: string;
}

/**
 * Two-period comparison. Each metric keeps its own unit and its own scale —
 * the rows are not comparable with one another, only within themselves.
 */
export function MonthCompare({ rows, aName, bName }: MonthCompareProps) {
  return (
    <div>
      <ChartLegend
        items={[
          { name: aName, color: "var(--s1)" },
          { name: bName, color: "var(--s2)" },
        ]}
      />
      {rows.map((r) => {
        const ref = Math.max(r.a, r.b) || 1;
        const series: [string, number, string][] = [
          ["var(--s1)", r.a, aName],
          ["var(--s2)", r.b, bName],
        ];
        return (
          <div key={r.label} className="border-t border-grid py-2.5">
            <div className="mb-[7px] flex justify-between gap-3 text-[12.5px]">
              <span className="text-ink-2">{r.label}</span>
              <Pill>{deltaTxt(r.a, r.b)}</Pill>
            </div>
            {series.map(([color, v, nm]) => (
              <div key={nm} className="mt-1 flex items-center gap-[9px]">
                <span className="w-11 flex-none text-[11px] text-ink-3">{nm.split(" ")[0]}</span>
                <span className="h-[11px] min-w-5 flex-1 overflow-hidden rounded-[3px] bg-sunken">
                  <span
                    className="block h-full rounded-[3px]"
                    style={{ width: `${((v / ref) * 100).toFixed(2)}%`, background: color }}
                  />
                </span>
                <span className="w-[78px] text-right font-mono text-[11.5px] tabular-nums">
                  {exact(v)}
                </span>
                <span className="w-[72px] text-[10.5px] whitespace-nowrap text-ink-3">
                  {r.unit}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

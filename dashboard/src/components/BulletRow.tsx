import { inkTokenOf, nf, exact } from "../lib/format";

export interface BulletDatum {
  label: string;
  plan: number;
  fact: number;
  unit?: string;
  /** Source workbook row number — kept visible for traceability. */
  src?: number;
}

/**
 * Plan-vs-fact comparison. Every row is normalised to its OWN reference
 * (`max(plan, fact)`) because rows carry different units (т, кг, шт, м³);
 * a shared x-axis across them would be meaningless.
 */
export function BulletRow({ label, plan, fact, unit, src }: BulletDatum) {
  const ref = Math.max(plan, fact) || 1;
  const pc = plan > 0 ? (fact / plan) * 100 : null;
  const pcTxt = pc === null ? "—" : nf(Math.min(pc, 99999), 1) + "%";
  const factW = Math.max(0, Math.min(100, (fact / ref) * 100));
  const planW = plan > 0 ? Math.min(100, (plan / ref) * 100) : null;
  const sub = `факт ${exact(fact)} · режа ${exact(plan)} ${unit ?? ""}`.trim();

  const title =
    `${label}\nРежа: ${exact(plan)} ${unit ?? ""}\nФакт: ${exact(fact)} ${unit ?? ""}` +
    `\nБажарилиш: ${pc === null ? "—" : nf(pc, 1) + "%"}` +
    (src ? `\nМанба сатри: №${src}` : "");

  return (
    <div className="py-2" title={title}>
      <div className="flex items-baseline justify-between gap-3 text-[12px]">
        <span className="min-w-0 truncate text-ink-2">
          {label}
          {src !== undefined && <span className="font-mono text-ink-3"> · №{src}</span>}
        </span>
        <span className="flex flex-none items-baseline gap-3">
          <span className="hidden font-mono text-[11px] tabular-nums text-ink-3 sm:inline">
            {sub}
          </span>
          <span
            className="font-mono text-[12px] font-semibold tabular-nums"
            style={{ color: inkTokenOf(pc) }}
          >
            {pcTxt}
          </span>
        </span>
      </div>
      <div className="relative mt-[9px] mb-[5px] h-3 rounded-[3px] bg-sunken">
        <div
          className="absolute top-0 bottom-0 left-0 rounded-[4px] bg-s1"
          style={{ width: `${factW.toFixed(2)}%` }}
        />
        {planW !== null && (
          <div
            className="absolute -top-1 -bottom-1 w-[2px] rounded-[1px] bg-ink"
            style={{ left: `calc(${planW.toFixed(2)}% - 1px)` }}
          />
        )}
      </div>
    </div>
  );
}

export function BulletChart({ rows }: { rows: (BulletDatum & { key: string })[] }) {
  if (rows.length === 0) {
    return <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">Маълумот йўқ.</div>;
  }
  return (
    <div>
      {rows.map(({ key, ...row }) => (
        <BulletRow key={key} {...row} />
      ))}
    </div>
  );
}

/** Shared legend: fact bar, plan marker and the meaning of the percentage colour. */
export function BulletLegend() {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11.5px] text-ink-2">
      <span className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className="inline-block h-[3px] w-[11px] flex-none rounded-sm bg-s1" />
        Факт (устун)
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i aria-hidden="true" className="inline-block h-[13px] w-[3px] flex-none rounded-[1px] bg-ink" />
        Режа (вертикал белги)
      </span>
      <span className="text-ink-3">
        ўнгдаги фоиз ранги: яшил ≥100% · сариқ 85–99% · қизил &lt;85%; ҳар бир қатор ўз шкаласида
      </span>
    </div>
  );
}

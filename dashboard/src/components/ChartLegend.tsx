export interface LegendItem {
  name: string;
  /** CSS colour, e.g. `var(--s1)`. */
  color: string;
}

/**
 * Legends are mandatory for two or more series and pointless for one, so the
 * component is only ever mounted by charts that carry ≥2 series.
 */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-ink-2">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-1.5">
          <i
            aria-hidden="true"
            className="inline-block h-[3px] w-[11px] flex-none rounded-sm"
            style={{ background: it.color }}
          />
          {it.name}
        </span>
      ))}
    </div>
  );
}

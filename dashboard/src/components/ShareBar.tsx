import { nf, exact } from "../lib/format";

export interface SharePart {
  name: string;
  value: number;
  /** CSS colour, e.g. `var(--s1)`. */
  color: string;
}

/** Part-to-whole bar with an inline legend carrying value and share. */
export function ShareBar({ parts }: { parts: SharePart[] }) {
  const total = parts.reduce((a, b) => a + b.value, 0) || 1;
  return (
    <div>
      <div className="flex h-[26px] gap-0.5 overflow-hidden rounded">
        {parts.map((p) => (
          <div
            key={p.name}
            title={`${p.name}: ${exact(p.value)}`}
            className="min-w-[2px]"
            style={{ width: `${((p.value / total) * 100).toFixed(3)}%`, background: p.color }}
          />
        ))}
      </div>
      <div className="mt-[9px] flex flex-wrap gap-4 text-[12px]">
        {parts.map((p) => (
          <span key={p.name} className="inline-flex items-center gap-[7px]">
            <i
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 flex-none rounded-sm"
              style={{ background: p.color }}
            />
            <span className="text-ink-2">{p.name}</span>
            <b className="font-mono tabular-nums">{exact(p.value)}</b>
            <span className="font-mono text-ink-3">{nf((p.value / total) * 100, 1)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export interface KeyValueRow {
  k: string;
  v: ReactNode;
}

/** Compact label/value list used inside the production-site cards. */
export function KeyValueList({ rows }: { rows: KeyValueRow[] }) {
  return (
    <dl className="mt-1 flex flex-col">
      {rows.map((r) => (
        <div
          key={r.k}
          className="flex justify-between gap-3.5 border-t border-grid py-[7px] text-[12.5px]"
        >
          <dt className="text-ink-2">{r.k}</dt>
          <dd className="text-right font-mono tabular-nums">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

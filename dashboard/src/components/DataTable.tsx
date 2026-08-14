import type { ReactNode } from "react";

export interface Col {
  t: string;
  /** Right-aligned, monospace, tabular figures. */
  num?: boolean;
  /** Allows wrapping — for long free-text columns. */
  wrap?: boolean;
}

export interface Row {
  key: string;
  cells: ReactNode[];
}

export interface DataTableProps {
  cols: Col[];
  rows: Row[];
  /** Accessible name of the table. */
  caption: string;
  emptyText?: string;
  maxHeight?: number;
  className?: string;
}

export function DataTable({
  cols,
  rows,
  caption,
  emptyText = "Маълумот топилмади.",
  maxHeight,
  className,
}: DataTableProps) {
  if (rows.length === 0) {
    return <div className="px-2.5 py-6 text-center text-[13px] text-ink-3">{emptyText}</div>;
  }
  return (
    <div className={"tbl-wrap" + (className ? " " + className : "")} style={{ maxHeight }} tabIndex={0}>
      <table className="tbl">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.t} scope="col" className={c.num ? "num" : undefined}>
                {c.t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              {r.cells.map((cell, i) => (
                <td
                  // Column order is fixed by `cols`, so the index is the stable identity here.
                  key={cols[i]?.t ?? i}
                  className={cols[i]?.num ? "num" : cols[i]?.wrap ? "wrap" : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

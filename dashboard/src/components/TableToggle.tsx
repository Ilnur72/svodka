import { useId, useState } from "react";
import { DataTable, type Col, type Row } from "./DataTable";

export interface TableToggleProps {
  cols: Col[];
  rows: Row[];
  /** Accessible name; also used as the table caption. */
  caption: string;
}

/**
 * Every chart ships a table equivalent. Screen-reader users, keyboard users and
 * anyone who needs the exact number get the same data without the SVG.
 */
export function TableToggle({ cols, rows, caption }: TableToggleProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const panelId = `tv-${id}`;

  return (
    <div className="mt-2.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={
          "cursor-pointer rounded-[5px] border px-[11px] py-[5px] text-[11.5px] font-semibold " +
          (open
            ? "border-s1 bg-s1 text-white"
            : "border-hair bg-surface-2 text-ink-2 hover:text-ink")
        }
      >
        {open ? "Жадвални яшириш" : "Жадвал кўриниши"}
      </button>
      <div id={panelId} hidden={!open} className="mt-2.5">
        {open && <DataTable cols={cols} rows={rows} caption={caption} />}
      </div>
    </div>
  );
}

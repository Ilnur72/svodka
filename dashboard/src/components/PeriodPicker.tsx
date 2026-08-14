import { useId } from "react";
import { monthLabel } from "../lib/format";
import {
  PRESETS,
  type Period,
  activePreset,
  monthOf,
  periodOfMonths,
  presetPeriod,
} from "../lib/period";

export interface PeriodPickerProps {
  /** `/filters.dateRange` дан генерация қилинган ойлар (эскидан янгига). */
  months: string[];
  period: Period;
  onChange: (p: Period) => void;
}

/**
 * Давр танлаш: бошланиш/тугаш ойи + тайёр тугмалар.
 * Қаттиқ ёзилган ой йўқ — рўйхат сервердаги маълумот чегарасидан келади.
 */
export function PeriodPicker({ months, period, onChange }: PeriodPickerProps) {
  const uid = useId();
  const from = monthOf(period.from);
  const to = monthOf(period.to);
  const preset = activePreset(period, months);

  const setFrom = (m: string) => onChange(periodOfMonths(m, m > to ? m : to));
  const setTo = (m: string) => onChange(periodOfMonths(m < from ? m : from, m));

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={`${uid}-from`}
          className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase"
        >
          Давр
        </label>
        <select
          id={`${uid}-from`}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="Давр бошланиши"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="text-ink-3">
          —
        </span>
        <select
          id={`${uid}-to`}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="Давр тугаши"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div
        className="flex flex-wrap gap-0.5 rounded-md border border-hair bg-sunken p-0.5"
        role="group"
        aria-label="Тайёр даврлар"
      >
        {PRESETS.map((p) => {
          const target = presetPeriod(p.id, months);
          const on = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!target}
              aria-pressed={on}
              onClick={() => target && onChange(target)}
              className={
                "rounded px-2.5 py-1 text-[12px] font-medium " +
                (target ? "cursor-pointer " : "cursor-not-allowed opacity-40 ") +
                (on
                  ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,.10)]"
                  : "text-ink-2 hover:text-ink")
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

export interface StatTileProps {
  label: string;
  /**
   * Тайёр форматланган қиймат — форматлаш қарори чақирувчида қолади.
   * `ReactNode`, чунки текширилмаган бўлимларда бу ерга `<MaskedValue>` тушади.
   */
  value: ReactNode;
  unit?: string;
  foot?: ReactNode;
  /** CSS colour for the 3px left stripe, e.g. `var(--s1)`. */
  stripe?: string;
}

export function StatTile({ label, value, unit, foot, stripe }: StatTileProps) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-4 shadow-card">
      {stripe && (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 left-0 w-[3px]"
          style={{ background: stripe }}
        />
      )}
      <span className="mb-1.5 block text-[11.5px] font-medium tracking-[0.02em] text-ink-3">
        {label}
      </span>
      {/* No tabular-nums here: proportional digits read better at display size. */}
      <div className="text-[27px] leading-[1.05] [font-weight:640] tracking-[-0.02em]">
        {value}
        {unit && <span className="ml-[5px] text-[13px] font-medium tracking-normal text-ink-3">{unit}</span>}
      </div>
      {foot && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-2">{foot}</div>
      )}
    </div>
  );
}

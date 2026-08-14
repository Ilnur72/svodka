import type { ReactNode } from "react";

export interface CardProps {
  title?: ReactNode;
  /** Small muted text on the right of the title row. */
  sub?: ReactNode;
  /** Explanatory paragraph under the title. */
  note?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function Card({ title, sub, note, className, children }: CardProps) {
  return (
    <div
      className={
        "relative min-w-0 overflow-hidden rounded-card border border-hair bg-surface px-4 pt-3.5 pb-4 shadow-card" +
        (className ? " " + className : "")
      }
    >
      {(title || sub) && (
        <div className="mb-0.5 flex flex-wrap items-baseline justify-between gap-2.5">
          {title && <h3 className="text-[13.5px] [font-weight:650]">{title}</h3>}
          {sub && <span className="text-[11.5px] text-ink-3">{sub}</span>}
        </div>
      )}
      {note && <p className="mt-0.5 mb-2.5 text-[11.5px] leading-[1.45] text-ink-3">{note}</p>}
      {children}
    </div>
  );
}

export interface SectionProps {
  title: string;
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Section({ title, note, className, children }: SectionProps) {
  return (
    <section className={"mb-5" + (className ? " " + className : "")}>
      <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
        <h2 className="text-[12px] [font-weight:650] tracking-[0.1em] text-ink-3 uppercase">
          {title}
        </h2>
        {note && <span className="text-[12px] text-ink-3">{note}</span>}
      </div>
      {children}
    </section>
  );
}

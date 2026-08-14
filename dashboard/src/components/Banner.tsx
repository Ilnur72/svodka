import type { ReactNode } from "react";

export interface BannerProps {
  /**
   * `crit` = маълумотга ишониб бўлмайди (рақамлар яширилган),
   * `warn`  = маълумот сифати огоҳлантириши,
   * `info`  = нейтрал изоҳ.
   */
  tone?: "crit" | "warn" | "info";
  children: ReactNode;
}

const ACCENT: Record<NonNullable<BannerProps["tone"]>, { bar: string; ink: string; icon: string }> =
  {
    crit: { bar: "var(--crit)", ink: "var(--crit-ink)", icon: "!" },
    warn: { bar: "var(--warn)", ink: "var(--warn-ink)", icon: "!" },
    info: { bar: "var(--s1)", ink: "var(--s1)", icon: "i" },
  };

export function Banner({ tone = "warn", children }: BannerProps) {
  const a = ACCENT[tone];
  return (
    <div
      className="mb-4 flex items-start gap-[11px] rounded-card border border-hair bg-surface px-[15px] py-3 shadow-card"
      style={{ borderLeft: `3px solid ${a.bar}` }}
      role="note"
    >
      <span
        aria-hidden="true"
        className="flex-none font-mono text-[13px] leading-[1.5] font-bold"
        style={{ color: a.ink }}
      >
        {a.icon}
      </span>
      <p className="text-[12.5px] leading-[1.5] text-ink-2 [&_b]:font-semibold [&_b]:text-ink">
        {children}
      </p>
    </div>
  );
}

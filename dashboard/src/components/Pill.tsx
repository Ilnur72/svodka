import type { ReactNode } from "react";
import type { Status } from "../types";

const STYLES: Record<Status, string> = {
  good: "text-good-ink bg-[color-mix(in_srgb,var(--good)_12%,transparent)] border-[color-mix(in_srgb,var(--good)_30%,transparent)]",
  warn: "text-warn-ink bg-[color-mix(in_srgb,var(--warn)_16%,transparent)] border-[color-mix(in_srgb,var(--warn)_38%,transparent)]",
  crit: "text-crit-ink bg-[color-mix(in_srgb,var(--crit)_12%,transparent)] border-[color-mix(in_srgb,var(--crit)_30%,transparent)]",
  mute: "text-ink-3 bg-sunken border-hair",
};

export interface PillProps {
  status?: Status;
  children: ReactNode;
}

/**
 * Status chip. Colour is never the only carrier of meaning — the pill always
 * contains the number or wording it qualifies.
 */
export function Pill({ status = "mute", children }: PillProps) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[-0.01em] " +
        STYLES[status]
      }
    >
      {children}
    </span>
  );
}

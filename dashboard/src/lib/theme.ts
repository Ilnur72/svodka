import { useSyncExternalStore } from "react";

/**
 * Chart libraries need concrete colours, not `var(--x)` strings, so the active
 * palette is read from the document once per theme change and shared through
 * `useSyncExternalStore`. Subscribes to both theme triggers: the OS colour
 * scheme and the `data-theme` attribute override.
 */
const TOKENS = [
  "s1",
  "s2",
  "s3",
  "ink",
  "ink-2",
  "ink-3",
  "grid",
  "rule",
  "sunken",
  "surface",
  "surface-2",
  "page",
  "good",
  "warn",
  "crit",
  "good-ink",
  "warn-ink",
  "crit-ink",
] as const;

export type TokenName = (typeof TOKENS)[number];
export type Palette = Record<TokenName, string>;

const FALLBACK: Palette = {
  s1: "#2a78d6",
  s2: "#eb6834",
  s3: "#1baf7a",
  ink: "#0d1215",
  "ink-2": "#4a5560",
  "ink-3": "#7d8892",
  grid: "#e2e7ec",
  rule: "#c8d0d8",
  sunken: "#e7ebef",
  surface: "#fbfcfd",
  "surface-2": "#f4f6f8",
  page: "#eef1f4",
  good: "#0ca30c",
  warn: "#fab219",
  crit: "#d03b3b",
  "good-ink": "#0a7a0a",
  "warn-ink": "#8a6000",
  "crit-ink": "#b02c2c",
};

function read(): Palette {
  if (typeof window === "undefined") return FALLBACK;
  const cs = getComputedStyle(document.documentElement);
  const out = {} as Palette;
  for (const t of TOKENS) {
    const v = cs.getPropertyValue("--" + t).trim();
    out[t] = v || FALLBACK[t];
  }
  return out;
}

let snapshot: Palette = FALLBACK;
let initialised = false;
const listeners = new Set<() => void>();

function refresh(): void {
  const next = read();
  const changed = TOKENS.some((t) => next[t] !== snapshot[t]);
  if (changed) {
    snapshot = next;
    listeners.forEach((l) => l());
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== "undefined") {
    mq?.addEventListener("change", refresh);
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      mq?.removeEventListener("change", refresh);
      observer?.disconnect();
    }
  };
}

const mq =
  typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
const observer = typeof window !== "undefined" ? new MutationObserver(refresh) : null;

function getSnapshot(): Palette {
  if (!initialised && typeof window !== "undefined") {
    initialised = true;
    snapshot = read();
  }
  return snapshot;
}

export function usePalette(): Palette {
  return useSyncExternalStore(subscribe, getSnapshot, () => FALLBACK);
}

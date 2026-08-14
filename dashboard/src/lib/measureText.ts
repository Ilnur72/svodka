let ctx: CanvasRenderingContext2D | null | undefined;

function context(): CanvasRenderingContext2D | null {
  if (ctx === undefined) {
    ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  return ctx;
}

/**
 * Real text measurement instead of a characters-per-pixel guess. Chart labels
 * are Cyrillic and Latin mixed, where a fixed average character width either
 * clips readable text or lets long labels overflow into the plot area.
 */
export function measureText(text: string, font: string): number {
  const c = context();
  if (!c) return text.length * 6.4;
  c.font = font;
  return c.measureText(text).width;
}

/** Shortens with an ellipsis so the result fits `maxWidth`. */
export function truncateToWidth(text: string, maxWidth: number, font: string): string {
  if (maxWidth <= 0) return "";
  if (measureText(text, font) <= maxWidth) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (measureText(text.slice(0, mid) + "…", font) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo === 0 ? "…" : text.slice(0, lo) + "…";
}

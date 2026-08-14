/**
 * Shared grid recipes. Breakpoints mirror the legacy layout exactly:
 *  ≤720px → 1 column, 721–1180px → intermediate, ≥1181px → full width layout.
 */
export const GRID = {
  g2: "grid gap-3 grid-cols-1 mid:grid-cols-2",
  g3: "grid gap-3 grid-cols-1 wide:grid-cols-3",
  g4: "grid gap-3 grid-cols-1 mid:grid-cols-2 wide:grid-cols-4",
  g6: "grid gap-3 grid-cols-1 mid:grid-cols-3 wide:grid-cols-6",
  g23: "grid gap-3 grid-cols-1 wide:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]",
  g32: "grid gap-3 grid-cols-1 wide:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]",
} as const;

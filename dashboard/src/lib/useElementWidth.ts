import { useEffect, useState, type RefObject } from "react";

/**
 * Observes an element's width. Needed because the horizontal bar charts size
 * their label gutter from the available width, exactly like the legacy build.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>, initial = 0): number {
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Sync once immediately: ResizeObserver fires async and the first paint
    // would otherwise use the initial guess.
    setWidth(node.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.target.clientWidth ?? 0;
      if (w > 0) setWidth(w);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}

import { useEffect, useState, type RefObject } from 'react';

/**
 * Picks a grid square size (in px) so the whole garden fits on screen:
 * as wide as the box allows, and short enough that the bottom row stays above
 * the bottom of a laptop screen (no scrolling sideways, very little up and down).
 */
export function useFitCell(
  ref: RefObject<HTMLElement | null>,
  cols: number,
  rows: number,
  { min = 22, max = 60, sideGutter = 70, bottomGap = 90 } = {},
) {
  const [cell, setCell] = useState(44);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const width = el.clientWidth - sideGutter;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const height = Math.max(260, window.innerHeight - top - bottomGap);
      const next = Math.floor(Math.min(width / cols, height / rows));
      setCell(Math.max(min, Math.min(max, next)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener('resize', fit);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [ref, cols, rows, min, max, sideGutter, bottomGap]);
  return cell;
}

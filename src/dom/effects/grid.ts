import {el} from "../../utils/dom";
import {stagger} from "../motion/stagger";

// Background structure. "rules" draws column hairlines in, poster style.
// "dots" is a quiet coordinate field that fades up.

export type GridOptions = {
  variant: "rules" | "dots" | "none";
  start: number;
  duration: number;
  /** rules: column count across the inner frame. dots: spacing in px. */
  density?: number;
  /** Inner margin in px; rules sit inside it. */
  margin?: number;
  easing?: string;
};

export function grid(
  container: HTMLElement,
  timeline: gsap.core.Timeline,
  {variant, start, duration, density, margin = 96, easing = "power4.inOut"}: GridOptions,
): HTMLElement | null {
  if (variant === "none") return null;
  const layer = el("div", `k-layer k-grid k-grid-${variant}`, container);

  if (variant === "dots") {
    const spacing = density ?? 40;
    layer.style.backgroundSize = `${spacing}px ${spacing}px`;
    timeline.fromTo(layer, {opacity: 0}, {opacity: 1, duration, ease: easing}, start);
    return layer;
  }

  const columns = density ?? 12;
  const lines: HTMLElement[] = [];
  for (let i = 0; i <= columns; i++) {
    const line = el("div", "k-grid-col", layer);
    line.style.left = `calc(${margin}px + (100% - ${2 * margin}px) * ${i / columns})`;
    lines.push(line);
  }
  stagger(lines, duration / columns / 2, start, (line, at) => {
    timeline.fromTo(line, {scaleY: 0}, {scaleY: 1, duration: duration / 2, ease: easing}, at);
  });
  return layer;
}

// Content rises (or drops) out of a clipping mask. The target must sit inside
// an `overflow: hidden` parent; AnimatedText's lines are built that way.

export type MaskRevealOptions = {
  start: number;
  duration: number;
  direction?: "in" | "out";
  /** in: enters from below. out: exits upward. */
  easing?: string;
  stagger?: number;
};

export function maskReveal(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget,
  {start, duration, direction = "in", easing = "expo.out", stagger = 0}: MaskRevealOptions,
): gsap.core.Timeline {
  const [from, to] = direction === "in" ? [110, 0] : [0, -110];
  return timeline.fromTo(target, {yPercent: from}, {yPercent: to, duration, ease: easing, stagger, immediateRender: direction === "in"}, start);
}

/** Horizontal wipe via clip-path; for blocks, bars and labels rather than text lines. */
export function wipe(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget,
  {start, duration, direction = "in", easing = "power4.inOut", from = "left"}: MaskRevealOptions & {from?: "left" | "right"},
): gsap.core.Timeline {
  const hidden = from === "left" ? "inset(0% 100% 0% 0%)" : "inset(0% 0% 0% 100%)";
  const shown = "inset(0% 0% 0% 0%)";
  const [a, b] = direction === "in" ? [hidden, shown] : [shown, hidden];
  return timeline.fromTo(target, {clipPath: a}, {clipPath: b, duration, ease: easing, immediateRender: direction === "in"}, start);
}

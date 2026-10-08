// Translate in from (or out toward) a side, optionally with opacity.

export type SlideOptions = {
  /** Side the element travels from (in) or toward (out). */
  from: "left" | "right" | "top" | "bottom";
  /** Pixels. */
  distance: number;
  start: number;
  duration: number;
  direction?: "in" | "out";
  easing?: string;
  /** Fade alongside the move. Default true. */
  withOpacity?: boolean;
  /** Seconds between targets when several are passed. */
  stagger?: number;
};

export function slide(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget,
  {from, distance, start, duration, direction = "in", easing = "power3.out", withOpacity = true, stagger = 0}: SlideOptions,
): gsap.core.Timeline {
  const axis = from === "left" || from === "right" ? "x" : "y";
  const sign = from === "left" || from === "top" ? -1 : 1;
  const offset = {[axis]: sign * distance, ...(withOpacity ? {opacity: 0} : {})};
  const rest = {[axis]: 0, ...(withOpacity ? {opacity: 1} : {})};
  const [a, b] = direction === "in" ? [offset, rest] : [rest, offset];
  return timeline.fromTo(target, a, {...b, duration, ease: easing, stagger, immediateRender: direction === "in"}, start);
}

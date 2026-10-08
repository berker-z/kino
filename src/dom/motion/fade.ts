// Opacity in or out, placed on a timeline at an explicit time. Pure timeline
// placement: no wall-clock, so any frame can be seeked deterministically.

export type FadeOptions = {
  /** Seconds from the start of the timeline. */
  start: number;
  /** Seconds. */
  duration: number;
  direction?: "in" | "out";
  /** Any GSAP ease string. */
  easing?: string;
};

export function fade(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget,
  {start, duration, direction = "in", easing = "power2.out"}: FadeOptions,
): gsap.core.Timeline {
  const [from, to] = direction === "in" ? [0, 1] : [1, 0];
  return timeline.fromTo(target, {opacity: from}, {opacity: to, duration, ease: easing, immediateRender: direction === "in"}, start);
}

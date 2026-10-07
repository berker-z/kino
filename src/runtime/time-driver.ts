// Calls `render(t)` for every frame the timeline is seeked to.
//
// HyperFrames seeks with callbacks suppressed, so onUpdate never fires during
// a render. Tweened properties are still applied, and GSAP treats a function
// property as a getter/setter, so tweening `at` from 0 → duration calls the
// setter on every seek. Time is quantized to whole frames so a canvas painted
// from it is identical between preview and render.

export type TimeDriverOptions = {
  start?: number;
  duration: number;
  fps?: number;
};

export function timeDriver(
  timeline: gsap.core.Timeline,
  {start = 0, duration, fps = 30}: TimeDriverOptions,
  render: (t: number, frame: number) => void,
): void {
  let current = -1;
  const target = {
    at(value?: number): number | void {
      if (value === undefined) return Math.max(current, 0);
      const frame = Math.round(value * fps);
      if (frame === current) return;
      current = frame;
      render(frame / fps, frame);
    },
  };
  timeline.fromTo(target, {at: 0}, {at: duration, duration, ease: "none"}, start);
  render(0, 0);
}

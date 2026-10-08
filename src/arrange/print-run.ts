// A print run: one long sheet coming off the drum, never a page turn. From
// the second risograph take, which replaced a page-by-page zine that read as
// a slideshow. Two parts:
//
// - printRun: the sheet scroll. Constant whole pixels per frame (so halftone
//   and thin lines don't crawl), then an eased stop at `stopAt`.
// - registerDrift: how far one ink sits off another. It swings away across
//   each bar and lands exactly back in register on the downbeat, alternating
//   direction, so the composed image locks once a bar. Smooth only: a
//   per-beat position kick was tried and read as jitter.

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export type PrintRunOptions = {
  fps: number;
  /** Whole px per frame. */
  pxPerFrame: number;
  /** Sheet offset at t = 0 (negative starts with paper above the content). */
  start?: number;
  /** Time the scroll starts easing to a stop. */
  stopAt: number;
  /** Seconds the stop takes. */
  ease?: number;
};

/** Sheet offset (px scrolled) at time t. */
export function printRun({fps, pxPerFrame, start = 0, stopAt, ease = 2.2}: PrintRunOptions): (t: number) => number {
  const v = pxPerFrame * fps;
  return (t) => {
    if (t <= stopAt) return start + Math.round(t * fps) * pxPerFrame;
    const u = clamp((t - stopAt) / ease);
    return Math.round(start + Math.round(stopAt * fps) * pxPerFrame + v * ease * (u - (u * u) / 2));
  };
}

export type RegisterDriftOptions = {
  /** Downbeat times; drift runs between the first and `until`. */
  bars: readonly number[];
  /** Locked (0) from here on. */
  until: number;
  /** Peak offset in px. */
  x?: number;
  y?: number;
};

/** Ink offset at time t: a half-sine per bar, zero on every downbeat. */
export function registerDrift({bars, until, x = 70, y = 150}: RegisterDriftOptions): (t: number) => {x: number; y: number} {
  return (t) => {
    if (t < bars[0] || t >= until) return {x: 0, y: 0};
    let k = 0;
    while (k + 1 < bars.length - 1 && t >= bars[k + 1]) k++;
    const phase = clamp((t - bars[k]) / (bars[k + 1] - bars[k]));
    const s = Math.sin(Math.PI * phase);
    const dir = k % 2 ? -1 : 1;
    return {x: dir * x * s, y: dir * y * s};
  };
}

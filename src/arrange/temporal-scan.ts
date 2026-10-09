// Temporal slit-scan: one output frame built from strips of a source, each
// strip sampled at a different source time. The frame's left edge sees an
// earlier moment than its right (or top than bottom), so anything moving
// becomes a shape stretched or sheared through time.
//
// Not the optical slit-scan of 2001's Stargate (a slit moving during one
// long exposure); that's a different algorithm and a different look.
//
// Stateless by construction: frame t is the source painted at a fixed set
// of other times, each clipped to its strip. No previous frame, no feedback
// buffer, no frame cache, so seeking in any order gives the same picture.
// The price is that the source is painted once per strip; a source can use
// the strip it gets to skip drawing what the clip would discard.
//
// For strip i of n, centre u = (i + 0.5) / n across the axis:
//   sampleTime = t - offset - span * u        (direction 1)
//   sampleTime = t - offset - span * (1 - u)  (direction -1)
// so with span 0 every strip shows time t - offset: the ordinary source.

export type TimeSource = (ctx: CanvasRenderingContext2D, sourceTime: number, strip: Strip) => void;

export type Strip = {x: number; y: number; w: number; h: number; index: number};

export type TemporalScanOptions = {
  width: number;
  height: number;
  /** "x": vertical strips side by side, time varies left-right. "y": horizontal bands, top-bottom. */
  axis?: "x" | "y";
  /** Number of strips. 32-96 is the useful range; each one is a full source paint. */
  bands: number;
  /** Source-time difference across the frame, in seconds. */
  span: number;
  /** 1: the far end (right or bottom) is the earliest. -1: the near end is. */
  direction?: 1 | -1;
  /** Constant delay for every strip, in seconds. */
  offset?: number;
  source: TimeSource;
};

/** The strips and their sample times at t. Whole-pixel edges, no gaps, no overlap. Pure. */
export function scanStrips(t: number, {width: W, height: H, axis = "x", bands, span, direction = 1, offset = 0}: Omit<TemporalScanOptions, "source">): (Strip & {time: number})[] {
  const n = Math.max(1, Math.floor(bands));
  const len = axis === "x" ? W : H;
  const out: (Strip & {time: number})[] = [];
  for (let i = 0; i < n; i++) {
    const a = Math.round((len * i) / n);
    const b = Math.round((len * (i + 1)) / n);
    const u = (i + 0.5) / n;
    const time = t - offset - span * (direction === 1 ? u : 1 - u);
    out.push(axis === "x" ? {x: a, y: 0, w: b - a, h: H, index: i, time} : {x: 0, y: a, w: W, h: b - a, index: i, time});
  }
  return out;
}

/** Paints the source into ctx strip by strip, each strip at its own source time. */
export function temporalScan(ctx: CanvasRenderingContext2D, t: number, options: TemporalScanOptions): void {
  for (const s of scanStrips(t, options)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(s.x, s.y, s.w, s.h);
    ctx.clip();
    options.source(ctx, s.time, s);
    ctx.restore();
  }
}

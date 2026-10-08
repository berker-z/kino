// An electron beam on phosphor, for scope and vector-display looks. A
// polyline is stroked three times (wide and faint, medium, thin and hot)
// with additive blending, so where the trace crosses itself it gets
// brighter the way phosphor does. Paint in grayscale and give screenPass a
// phosphor ramp and some bloom (see the `phosphor` look).
//
// Persistence: HyperFrames seeks frames in any order, so there is no
// previous frame to fade. Redraw the last few windows of whatever you plot
// at decaying `intensity` instead (0.5 * 0.6^k worked for the scope).

//
// Velocity: a real beam deposits the same energy per unit of time, so it is
// bright where it moves slowly and faint where it swings fast. Pass
// `{velocity: true}` when the points are equally spaced in time (audio
// samples, a parametric curve at even steps) and each segment is dimmed by
// ref / length. The law is from the oscilloscope-trace block in the
// HyperFrames registry (Apache 2.0); this is our own implementation.

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export type BeamOptions = {
  /** Dim fast segments. `true` takes the reference (full-brightness) length from the data; a number sets it in px. */
  velocity?: boolean | number;
  /** Brightness never drops below this, so the fastest swings stay faintly visible. */
  floor?: number;
};

const LAYERS = [[18, 0.05], [7, 0.16], [2.6, 0.75]] as const;
const LEVELS = 12;

export function beam(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], intensity = 1, options: BeamOptions = {}): void {
  if (pts.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = ctx.lineCap = "round";
  if (!options.velocity) {
    const path = new Path2D();
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    for (const [w, a] of LAYERS) {
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(255,255,255,${a * intensity})`;
      ctx.stroke(path);
    }
    ctx.restore();
    return;
  }
  const n = pts.length - 1;
  const len = new Float32Array(n);
  for (let i = 0; i < n; i++) len[i] = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  // The slowest the beam moves is full brightness. Taken as a low percentile
  // rather than the minimum, so a few stationary samples don't dim the rest.
  const ref = typeof options.velocity === "number" ? options.velocity : Math.max(0.5, [...len].sort((a, b) => a - b)[Math.floor(n * 0.15)]);
  const floor = options.floor ?? 0.08;
  // Segments are grouped into brightness levels and each level is stroked as
  // one path: one stroke per level instead of per segment, and no doubled-up
  // round caps where neighbouring segments of the same level meet.
  const paths = Array.from({length: LEVELS}, () => new Path2D());
  const used = new Uint8Array(LEVELS);
  for (let i = 0; i < n; i++) {
    const v = Math.max(floor, Math.min(1, ref / Math.max(len[i], 1e-6)));
    const k = Math.min(LEVELS - 1, Math.floor(v * LEVELS));
    paths[k].moveTo(pts[i][0], pts[i][1]);
    paths[k].lineTo(pts[i + 1][0], pts[i + 1][1]);
    used[k] = 1;
  }
  for (let k = 0; k < LEVELS; k++) {
    if (!used[k]) continue;
    const v = (k + 1) / LEVELS;
    for (const [w, a] of LAYERS) {
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(255,255,255,${a * intensity * v})`;
      ctx.stroke(paths[k]);
    }
  }
  ctx.restore();
}

export type BeamTextOptions = {align?: "left" | "center" | "right"; family?: string; weight?: number; intensity?: number};

/** Outlined type traced by the beam, wiped on left to right with progress p. */
export function beamText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, p: number, options: BeamTextOptions = {}): void {
  const {align = "center", family = "Antonio", weight = 700, intensity = 1} = options;
  if (p <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.textAlign = "left";
  const w = ctx.measureText(text).width;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.beginPath();
  ctx.rect(x0 - 20, y - size * 1.1, (w + 40) * clamp(p), size * 1.5);
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  for (const [lw, a] of [[16, 0.05], [6, 0.18], [2.4, 0.8]] as const) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = `rgba(255,255,255,${a * intensity})`;
    ctx.strokeText(text, x0, y);
  }
  ctx.restore();
}

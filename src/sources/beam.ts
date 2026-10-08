// An electron beam on phosphor, for scope and vector-display looks. A
// polyline is stroked three times (wide and faint, medium, thin and hot)
// with additive blending, so where the trace crosses itself it gets
// brighter the way phosphor does. Paint in grayscale and give screenPass a
// phosphor ramp and some bloom (see the `phosphor` look).
//
// Persistence: HyperFrames seeks frames in any order, so there is no
// previous frame to fade. Redraw the last few windows of whatever you plot
// at decaying `intensity` instead (0.5 * 0.6^k worked for the scope).

const clamp = (x: number) => Math.min(1, Math.max(0, x));

export function beam(ctx: CanvasRenderingContext2D, pts: readonly (readonly [number, number])[], intensity = 1): void {
  if (pts.length < 2) return;
  const path = new Path2D();
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = ctx.lineCap = "round";
  for (const [w, a] of [[18, 0.05], [7, 0.16], [2.6, 0.75]] as const) {
    ctx.lineWidth = w;
    ctx.strokeStyle = `rgba(255,255,255,${a * intensity})`;
    ctx.stroke(path);
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

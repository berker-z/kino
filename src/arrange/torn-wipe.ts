import {noise2} from "../utils/noise";

// Torn print: the next scene shows through a ragged tear that crosses the
// frame, with a strip of white paper fibre along the tear. For canvas scenes
// painted in grayscale (screenPass, ditherCanvas).

export type CanvasScene = (ctx: CanvasRenderingContext2D, t: number) => void;

export type TornWipeOptions = {
  width: number;
  height: number;
  /** Seeds the tear's shape; same seed, same tear. */
  seed?: number;
  /** 1: the tear travels right to left, -1: left to right. */
  direction?: 1 | -1;
  /** How far the tear leans across its travel, fraction of width. */
  lean?: number;
  /** Fibre strip width in px. */
  fibre?: number;
};

/** Paints `from`, then `to` beyond a tear at progress p (0-1). */
export function tornWipe(
  ctx: CanvasRenderingContext2D,
  from: CanvasScene,
  to: CanvasScene,
  t: number,
  p: number,
  {width: W, height: H, seed = 5, direction = 1, lean = 0.08, fibre = 16}: TornWipeOptions,
): void {
  from(ctx, t);
  const xAt = (y: number) => {
    const base = direction > 0 ? W * (1.1 - 1.25 * p) : W * (-0.1 + 1.25 * p);
    return base + (y / H - 0.5) * W * lean + (noise2((y / H) * 8, seed, 2) - 0.5) * 140 + (noise2((y / H) * 60, seed + 3, 2) - 0.5) * 30;
  };
  const tear = new Path2D();
  tear.moveTo(xAt(0), 0);
  for (let y = 0; y <= H; y += 8) tear.lineTo(xAt(y), y);
  const region = new Path2D(tear);
  const side = direction > 0 ? W : 0;
  region.lineTo(side, H);
  region.lineTo(side, 0);
  region.closePath();

  ctx.save();
  ctx.clip(region);
  to(ctx, t);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = fibre;
  ctx.stroke(tear);
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.6;
  ctx.translate(-direction * (fibre - 2), 0);
  ctx.stroke(tear);
  ctx.restore();
}

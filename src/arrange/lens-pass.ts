import type {ScreenSettings} from "../passes/screen-pass";
import type {CanvasScene} from "./torn-wipe";

// Lens pass: the next scene opens inside a growing glass circle. The canvas
// side clips the new scene to the circle; screenPass bends the picture at
// the rim so it reads as glass. Use both halves at the same time:
//
//   paint: (ctx, t) => lensPass(ctx, from, to, t, p, opts),
//   tune:  (t) => lensPassFx(p, opts),

export type LensPassOptions = {
  /** Centre of the circle, px. Open on something lit, not empty ground. */
  x: number;
  y: number;
  /** Radius at p = 1; make it cover the frame. */
  radius?: number;
  /** Rim refraction strength at the start, fades to 0. */
  strength?: number;
};

const radiusAt = (p: number, radius: number) => 40 + radius * Math.pow(Math.min(1, Math.max(0, p)), 2.2);

export function lensPass(ctx: CanvasRenderingContext2D, from: CanvasScene, to: CanvasScene, t: number, p: number, {x, y, radius = 2000}: LensPassOptions): void {
  from(ctx, t);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radiusAt(p, radius), 0, Math.PI * 2);
  ctx.clip();
  to(ctx, t);
  ctx.restore();
}

/** screenPass settings for the rim at progress p. */
export function lensPassFx(p: number, {x, y, radius = 2000, strength = 0.35}: LensPassOptions): Partial<ScreenSettings> {
  return {lensX: x, lensY: y, lensR: radiusAt(p, radius) * 1.04, lensK: strength * (1 - Math.min(1, Math.max(0, p)))};
}

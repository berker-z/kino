// overlap: shot changes without hard cuts.
//
// A film is a list of shots, each a paint(ctx, t) over the whole frame. Where
// two shots overlap, the outgoing one is painted, then the incoming one over
// it at a rising alpha, while both keep moving. Each shot must be paintable a
// little outside its own range (its camera still going), which is what makes
// this read as one move rather than a slide change. See
// docs/primitives/overlap.md.

export interface OverlapShot {
  id: string;
  from: number;
  to: number;
}

export interface Blend {
  /** Outgoing shot id. */
  a: string;
  /** Incoming shot id. */
  b: string;
  from: number;
  to: number;
}

const inOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** What to paint at t: one shot, or two with the second's alpha. */
export function overlapAt(shots: OverlapShot[], blends: Blend[], t: number): {a: string; b?: string; alpha: number} {
  const blend = blends.find((x) => t >= x.from && t < x.to);
  if (blend) return {a: blend.a, b: blend.b, alpha: inOut((t - blend.from) / (blend.to - blend.from))};
  const shot = shots.find((s) => t >= s.from && t < s.to) ?? shots[shots.length - 1];
  return {a: shot.id, alpha: 0};
}

/** Paint frame t: the shot, or the outgoing shot with the incoming one over it. */
export function overlap(
  ctx: CanvasRenderingContext2D,
  t: number,
  shots: OverlapShot[],
  blends: Blend[],
  paint: Record<string, (ctx: CanvasRenderingContext2D, t: number) => void>,
): void {
  const {a, b, alpha} = overlapAt(shots, blends, t);
  paint[a](ctx, t);
  if (!b) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  paint[b](ctx, t);
  ctx.restore();
}

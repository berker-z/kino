// A camera over one big canvas: the sheet never stops being one object, and
// shots are places on it. Hold a pose, glide to the next with an ease, and
// drift slowly while holding so something always moves. Zoom interpolates in
// log space, which makes zooming in and out feel equally fast. From the
// blueprint piece, where it replaces cuts entirely.

export type Shot = {
  /** Time the glide to this pose starts. */
  at: number;
  /** Glide duration; 0 for the opening pose. */
  dur: number;
  /** Sheet point at the frame centre, and zoom (screen px per sheet unit). */
  x: number;
  y: number;
  z: number;
  /** Drift while holding: [x units/s, y units/s, zoom fraction/s]. */
  drift?: readonly [number, number, number];
  /** Ease for the glide, 0-1 -> 0-1. Default: cubic in-out. */
  ease?: (x: number) => number;
};

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeInOut = (x: number) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export function sheetCamera(shots: readonly Shot[]) {
  const pose = (k: Shot, after: number) => {
    const d = k.drift ?? [0, 0, 0];
    return {x: k.x + d[0] * after, y: k.y + d[1] * after, z: k.z * (1 + d[2] * after)};
  };

  /** Camera pose at time t. */
  function at(t: number): {x: number; y: number; z: number} {
    let i = 0;
    while (i + 1 < shots.length && t >= shots[i + 1].at) i++;
    const s = shots[i];
    const prev = shots[Math.max(0, i - 1)];
    const end = s.at + s.dur;
    if (t >= end || i === 0) return pose(s, Math.max(0, t - end));
    const from = pose(prev, s.at - (prev.at + prev.dur));
    const e = (s.ease ?? easeInOut)((t - s.at) / s.dur);
    return {
      x: from.x + (s.x - from.x) * e,
      y: from.y + (s.y - from.y) * e,
      z: Math.exp(Math.log(from.z) + (Math.log(s.z) - Math.log(from.z)) * e),
    };
  }

  /** Transform ctx so sheet coordinates draw through the camera. Call inside save/restore. */
  function apply(ctx: CanvasRenderingContext2D, t: number, width: number, height: number): void {
    const cam = at(t);
    ctx.translate(width / 2, height / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
  }

  return {at, apply};
}

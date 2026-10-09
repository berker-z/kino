// The small timing maths every composition was writing for itself (clamp,
// progress through a window, a few eases). Pure functions of their inputs,
// so they're seek-safe. Compositions written before this exists keep their
// local copies; new ones import these.

/** x clamped to [0, 1]. */
export const clamp = (x: number): number => Math.min(1, Math.max(0, x));

/** Progress 0-1 through the window that starts at `at` and lasts `dur` seconds. */
export const progress = (t: number, at: number, dur: number): number => (dur > 0 ? clamp((t - at) / dur) : t >= at ? 1 : 0);

/** Smoothstep: eases in and out, zero slope at both ends. */
export const smooth = (x: number): number => {
  const c = clamp(x);
  return c * c * (3 - 2 * c);
};

/** Cubic ease-out: fast start, gentle landing. */
export const easeOut = (x: number): number => 1 - Math.pow(1 - clamp(x), 3);

/** Cubic ease-in-out. */
export const easeInOut = (x: number): number => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

// Runs one primitive per target with a fixed offset. Keeps staggering out of
// each primitive: stagger(items, 0.08, 1.2, (item, at) => fade(tl, item, {start: at, ...})).

export function stagger<T>(
  targets: readonly T[],
  each: number,
  start: number,
  place: (target: T, at: number, index: number) => void,
): number {
  targets.forEach((target, index) => place(target, start + index * each, index));
  /** Start time of the last target, for chaining. */
  return start + Math.max(0, targets.length - 1) * each;
}

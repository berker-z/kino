// Reveals characters one by one at a fixed rate. Pass the per-line caret
// elements to have a caret ride the active line. Each step is a timeline
// set(), so any frame seeks to the exact same state.

export type TypewriterOptions = {
  start: number;
  /** Seconds per character. */
  perChar: number;
  /** Extra pause at each line break, seconds. */
  linePause?: number;
};

export function typewriter(
  timeline: gsap.core.Timeline,
  lines: readonly (readonly HTMLElement[])[],
  carets: readonly HTMLElement[],
  {start, perChar, linePause = 0}: TypewriterOptions,
): number {
  timeline.set(lines.flat(), {display: "none"}, 0);
  timeline.set(carets, {visibility: "hidden"}, 0);
  let at = start;
  lines.forEach((chars, lineIndex) => {
    if (carets[lineIndex - 1]) timeline.set(carets[lineIndex - 1], {visibility: "hidden"}, at);
    if (carets[lineIndex]) timeline.set(carets[lineIndex], {visibility: "visible"}, at);
    for (const char of chars) {
      timeline.set(char, {display: "inline"}, at);
      at += perChar;
    }
    at += linePause;
  });
  /** Time the last character appeared. */
  return at;
}

/** Hard on/off caret blink, `count` cycles from `start`. */
export function blink(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget,
  {start, period = 1, count}: {start: number; period?: number; count: number},
): gsap.core.Timeline {
  for (let i = 0; i < count; i++) {
    timeline.set(target, {opacity: 0}, start + i * period + period / 2);
    timeline.set(target, {opacity: 1}, start + (i + 1) * period);
  }
  return timeline;
}

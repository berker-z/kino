import {beatTicks, tickAt} from "../signals/beat-map";
import {ridgelines} from "./painters";

// SpectrumFeed: a song's spectrum as a column of ridgelines fed upward on the
// beat, like a plotter printing one line per note. Returns a painter for
// ditherCanvas; render it with mode: "smooth".
//
// Every default here is a lesson from getting it to look right (see
// docs/primitives/spectrum-feed.md):
// - each line owns one note's averaged spectrum for its whole life, so lines
//   never re-sample (re-sampling every frame reads as jitter);
// - the column moves at constant speed, one row per note, following the
//   analysed beat times;
// - row spacing is chosen so the scroll is ~1 whole px per frame, and the
//   painter rounds the offset, so thin lines never land on fractional pixels
//   (fractional positions read as lines flickering brighter/darker);
// - the oldest rows fade out instead of popping off the top.

/** Output of scripts/spectrum.py: one row of band energies (0–1) per video frame. */
export type Spectrum = {fps: number; bands: number; duration: number; frames: number[][]};

export type SpectrumFeedOptions = {
  spectrum: Spectrum;
  /** Analysed beat times in seconds (audiomap grid.beats_sec). */
  beats: readonly number[];
  /** Composition length in seconds. */
  duration: number;
  /** Render frame rate; with rowStep "auto" it sets the spacing. 60 is smoothest. */
  fps: number;
  width: number;
  height: number;
  /** Lines per beat: 1 = quarter notes, 2 = eighths (default), 4 = sixteenths. */
  subdivision?: number;
  /** Lines on screen. */
  rows?: number;
  /** px between rows, or "auto" for whole-pixel scrolling (see pxPerFrame). */
  rowStep?: number | "auto";
  /** With rowStep "auto": target scroll per frame in px. */
  pxPerFrame?: number;
  /** "linear" glides at constant speed; "step" lunges at each note then rests. */
  motion?: "linear" | "step";
  /** Column extent and front baseline, fractions of the frame. */
  left?: number;
  right?: number;
  bottom?: number;
  /** Peak lift; a number or a function of time (e.g. grow on the drop). */
  amplitude?: number | ((t: number) => number);
  focus?: number;
  smoothing?: number;
  mirror?: boolean;
  lineWidth?: number;
  /** Rows over which the oldest lines dissolve. */
  fadeOldest?: number;
  /** Fill under each line; match the background (black under screenPass). */
  ground?: string;
};

export type SpectrumFeed = {
  paint: (ctx: CanvasRenderingContext2D, t: number) => void;
  /** px between rows actually used. */
  rowStep: number;
  /** Lines on screen. */
  rows: number;
  ticks: number[];
};

export function spectrumFeed(options: SpectrumFeedOptions): SpectrumFeed {
  const {
    spectrum,
    beats,
    duration,
    fps,
    width,
    height,
    subdivision = 2,
    rows = 52,
    pxPerFrame = 1,
    motion = "linear",
    left = 0.37,
    right = 0.69,
    bottom = 0.86,
    amplitude = 0.18,
    focus = 0.72,
    smoothing = 1,
    mirror = false,
    lineWidth = 3,
    fadeOldest = 10,
    ground = "#000",
  } = options;

  const ticks = beatTicks(beats, {subdivision, until: duration});
  const noteSeconds = (beats[beats.length - 1] - beats[0]) / (beats.length - 1) / subdivision;
  const rowStep =
    options.rowStep === undefined || options.rowStep === "auto"
      ? Math.max(1, Math.round(noteSeconds * fps) * pxPerFrame)
      : options.rowStep;

  const empty = new Array<number>(spectrum.bands).fill(0);
  const cache = new Map<number, number[]>();
  // Mean spectrum over note slot s.
  function slot(s: number): number[] {
    if (s < 0 || s + 1 >= ticks.length) return empty;
    const hit = cache.get(s);
    if (hit) return hit;
    const from = Math.round(ticks[s] * spectrum.fps);
    const to = Math.max(from + 1, Math.round(ticks[s + 1] * spectrum.fps));
    const sum = new Array<number>(spectrum.bands).fill(0);
    let n = 0;
    for (let i = from; i < to; i++) {
      const frame = spectrum.frames[i];
      if (!frame) continue;
      for (let b = 0; b < sum.length; b++) sum[b] += frame[b];
      n++;
    }
    const mean = n ? sum.map((v) => v / n) : empty;
    cache.set(s, mean);
    return mean;
  }

  const advance = motion === "linear" ? (p: number) => p : (p: number) => 1 - Math.pow(1 - Math.min(1, p / 0.45), 3);

  function paint(ctx: CanvasRenderingContext2D, t: number): void {
    const tick = tickAt(ticks, t);
    const newest = tick.index - 1; // the note that just finished
    const lines: number[][] = [];
    const keys: number[] = [];
    for (let k = 0; k < rows; k++) {
      lines.push(slot(newest - k));
      keys.push(newest - k);
    }
    ridgelines(ctx, {
      width,
      height,
      rows: lines,
      rowKeys: keys,
      left,
      right,
      bottom,
      mirror,
      focus,
      smoothing,
      amplitude: typeof amplitude === "function" ? amplitude(t) : amplitude,
      scroll: advance(tick.progress),
      rowStep,
      fadeOldest,
      lineWidth,
      ground,
    });
  }

  return {paint, rowStep, rows, ticks};
}

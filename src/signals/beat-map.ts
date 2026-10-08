// Read-side of an audiomap.json (written by the music-to-video skill's
// analyze-beatgrid.py). Everything here is a pure function of time, so
// music-reactive motion stays seekable.

export type Drum = "kick" | "snare" | "hihat" | "perc";

export type AudioMap = {
  tempo: {bpm: number; beats_per_bar: number};
  grid: {beats_sec: number[]};
  events: {t: number; bar: number; beat_in_bar: number; drum: Drum; energy: number}[];
  energy_phases: {start: number; end: number; level: string; energy: number}[];
  phrases: {index: number; start: number; end: number; bars: number}[];
  key_moments: {t: number; kind: string; delta: number}[];
  audio: {duration_sec: number};
};

export type BeatMap = ReturnType<typeof beatMap>;

export function beatMap(map: AudioMap) {
  const byDrum = (drums: Drum[], minEnergy: number) =>
    map.events.filter((e) => drums.includes(e.drum) && e.energy >= minEnergy);

  return {
    map,
    bpm: map.tempo.bpm,
    beats: map.grid.beats_sec,

    hits(drums: Drum[], minEnergy = 0) {
      return byDrum(drums, minEnergy);
    },

    /** Decaying envelope of matching hits at time t, 0–1. */
    pulse(t: number, drums: Drum[], {decay = 0.18, minEnergy = 0} = {}): number {
      let value = 0;
      for (const e of byDrum(drums, minEnergy)) {
        if (e.t > t) break;
        value = Math.max(value, e.energy * Math.exp(-(t - e.t) / decay));
      }
      return Math.min(1, value);
    },

    /** Most recent matching hit at or before t, with its index. */
    lastHit(t: number, drums: Drum[], minEnergy = 0) {
      const list = byDrum(drums, minEnergy);
      let index = -1;
      for (let i = 0; i < list.length && list[i].t <= t; i++) index = i;
      return index < 0 ? null : {...list[index], index, age: t - list[index].t};
    },

    /** Beat index (0-based) and progress through it, -1 before the first beat. */
    beatAt(t: number) {
      const beats = map.grid.beats_sec;
      let i = -1;
      while (i + 1 < beats.length && beats[i + 1] <= t) i++;
      const next = beats[i + 1] ?? beats[i] + 60 / map.tempo.bpm;
      const prev = beats[i] ?? 0;
      return {index: i, progress: i < 0 ? 0 : (t - prev) / (next - prev)};
    },

    phraseAt(t: number) {
      return map.phrases.findLast((p) => p.start <= t) ?? null;
    },

    energyAt(t: number) {
      return map.energy_phases.find((p) => t >= p.start && t < p.end) ?? map.energy_phases[map.energy_phases.length - 1];
    },
  };
}

/**
 * The song's beat grid subdivided (2 = eighth notes, 4 = sixteenths),
 * extended back to 0 and forward past `until` at the average beat spacing.
 * Uses the analysed beat times, so it follows tempo drift rather than a
 * fixed metronome.
 */
export function beatTicks(beats: readonly number[], {subdivision = 2, until}: {subdivision?: number; until: number}): number[] {
  const period = (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
  const grid: number[] = [];
  for (let b = beats[0] - period; b > -period; b -= period) grid.unshift(b);
  grid.push(...beats);
  while (grid[grid.length - 1] < until + period) grid.push(grid[grid.length - 1] + period);
  const ticks: number[] = [];
  for (let i = 0; i < grid.length - 1; i++) {
    for (let s = 0; s < subdivision; s++) ticks.push(grid[i] + ((grid[i + 1] - grid[i]) * s) / subdivision);
  }
  return ticks;
}

/** Index of the tick interval containing t, and progress 0–1 through it. */
export function tickAt(ticks: readonly number[], t: number): {index: number; progress: number} {
  let lo = 0;
  let hi = ticks.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ticks[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return {index: lo, progress: (t - ticks[lo]) / (ticks[lo + 1] - ticks[lo])};
}

// Signals read the song. Silence is valid input and should read as zero;
// a broken beat grid is invalid input and should fail loudly instead of
// hanging a render or spreading NaN through every frame.

import {test} from "node:test";
import assert from "node:assert/strict";
import {bandEnergy, bassFollower, autoGain, decodeSamples} from "../src/signals/audio";
import {beatTicks, tickAt, beatMap} from "../src/signals/beat-map";

const spectrum = (frames: number[][], fps = 30) => ({fps, bands: frames[0]?.length ?? 0, frames}) as never;

test("bandEnergy: mean of the bands, 0 for silence, error for an empty range", () => {
  const s = spectrum([[1, 0.5, 0, 0], [0, 0, 0, 0]]);
  assert.equal(bandEnergy(s, 0, 0, 2), 0.75);
  assert.equal(bandEnergy(s, 1 / 30, 0, 4), 0);
  assert.equal(bandEnergy(s, 99, 0, 4), 0, "past the end reads as silence");
  assert.throws(() => bandEnergy(s, 0, 2, 2), /range/);
});

test("bandEnergy follows the spectrum's frame rate, not the composition's", () => {
  const s = spectrum([[0], [1], [0], [0]], 2); // 2 fps: frame 1 is at 0.5 s
  assert.equal(bandEnergy(s, 0.5, 0, 1), 1);
  assert.equal(bandEnergy(s, 1 / 30, 0, 1), 0);
});

test("bassFollower: normalised 0-1 over the song, interpolated between frames", () => {
  const f = bassFollower(spectrum([[0], [0], [1], [1], [0.5]]), {bands: 1});
  for (let t = 0; t <= 5 / 30; t += 1 / 120) {
    const v = f(t);
    assert.ok(v >= 0 && v <= 1, `t=${t}: ${v}`);
  }
});

test("bassFollower: a constant or silent spectrum reads as 0, not NaN", () => {
  for (const level of [0, 0.4]) {
    const f = bassFollower(spectrum(Array.from({length: 20}, () => [level, level])), {bands: 2});
    for (const t of [0, 0.1, 0.33, 10]) assert.equal(f(t), 0, `level ${level} at t=${t}`);
  }
  assert.equal(bassFollower(spectrum([]))(0), 0, "no frames at all");
});

test("bassFollower handles a long song without blowing the stack", () => {
  const frames = Array.from({length: 300_000}, (_, i) => [Math.sin(i / 50) * 0.5 + 0.5]);
  const f = bassFollower(spectrum(frames), {bands: 1});
  assert.ok(Number.isFinite(f(100)));
});

test("beatTicks: subdivides the grid and extends it back to 0 and past `until`", () => {
  const beats = [1, 1.5, 2, 2.5];
  const ticks = beatTicks(beats, {subdivision: 2, until: 3});
  assert.equal(ticks[0] <= 0.0001 || ticks[0] < 0.5, true);
  assert.ok(ticks.includes(1.25) && ticks.includes(1.5));
  assert.ok(ticks.at(-1)! >= 3);
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i] > ticks[i - 1], "strictly increasing");
});

test("beatTicks: fewer than two beats, repeated or unsorted beats are errors, never a hang", () => {
  assert.throws(() => beatTicks([], {until: 5}), /beat/);
  assert.throws(() => beatTicks([1], {until: 5}), /beat/);
  assert.throws(() => beatTicks([1, 1, 1], {until: 5}), /beat/);
  assert.throws(() => beatTicks([2, 1.5, 1], {until: 5}), /beat/);
});

test("tickAt: index and progress inside the grid; clamps outside it", () => {
  const ticks = [0, 0.5, 1, 1.5];
  assert.deepEqual(tickAt(ticks, 0.75), {index: 1, progress: 0.5});
  assert.deepEqual(tickAt(ticks, 0), {index: 0, progress: 0});
  assert.equal(tickAt(ticks, -1).index, 0);
  assert.equal(tickAt(ticks, 99).index, 2);
  assert.throws(() => tickAt([1], 0), /tick/);
});

test("beatMap.beatAt: -1 before the first beat, progress through the current one", () => {
  const m = beatMap({tempo: {bpm: 120, beats_per_bar: 4}, grid: {beats_sec: [1, 1.5, 2]}, events: [], energy_phases: [], phrases: [], key_moments: [], audio: {duration_sec: 3}});
  assert.deepEqual(m.beatAt(0.5), {index: -1, progress: 0});
  assert.deepEqual(m.beatAt(1.25), {index: 0, progress: 0.5});
  assert.equal(m.beatAt(2.25).index, 2, "after the last beat it keeps counting from the tempo");
  assert.ok(Number.isFinite(m.beatAt(2.25).progress));
});

test("autoGain: silence clamps to max gain, a loud signal to min, never NaN", () => {
  const n = 24000;
  const silent = decodeSamples({rate: 24000, length: n, l: btoa("\0".repeat(n)), r: btoa("\0".repeat(n))});
  assert.equal(autoGain(silent, 0.5), 5);
  const loud = decodeSamples({rate: 24000, length: n, l: btoa(String.fromCharCode(127).repeat(n)), r: btoa(String.fromCharCode(127).repeat(n))});
  assert.equal(autoGain(loud, 0.75), 1);
  assert.ok(Number.isFinite(autoGain(silent, 0)), "at t = 0 the window is all before the track");
});

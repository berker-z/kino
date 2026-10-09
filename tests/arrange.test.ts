// Arrangements move things in time. They're pure functions of t, so they're
// tested as functions: continuity where motion must not jump, whole pixels
// where halftone must not crawl, and the same answer in any order.

import {test} from "node:test";
import assert from "node:assert/strict";
import {sheetCamera} from "../src/arrange/sheet-camera";
import {printRun, registerDrift} from "../src/arrange/print-run";
import {hash, noise2, noise3} from "../src/utils/noise";

const shots = [
  {at: 0, dur: 0, x: 100, y: 100, z: 1, drift: [10, 0, 0.01] as const},
  {at: 2, dur: 1.5, x: 900, y: 400, z: 2.5},
  {at: 5, dur: 1, x: 300, y: 300, z: 0.5, drift: [0, -5, 0] as const},
];

test("sheetCamera: holds the opening pose with drift before the first glide", () => {
  const cam = sheetCamera(shots);
  assert.deepEqual(cam.at(0), {x: 100, y: 100, z: 1});
  const p = cam.at(1);
  assert.equal(p.x, 110);
  assert.ok(Math.abs(p.z - 1.01) < 1e-9);
});

test("sheetCamera: no position jumps at glide starts and ends", () => {
  const cam = sheetCamera(shots);
  for (const edge of [2, 3.5, 5, 6]) {
    const a = cam.at(edge - 1e-6);
    const b = cam.at(edge + 1e-6);
    for (const k of ["x", "y", "z"] as const) assert.ok(Math.abs(a[k] - b[k]) < 1e-3, `${k} jumps at t=${edge}: ${a[k]} -> ${b[k]}`);
  }
});

test("sheetCamera: zoom interpolates in log space (the midpoint of 1x -> 4x is 2x)", () => {
  const cam = sheetCamera([{at: 0, dur: 0, x: 0, y: 0, z: 1}, {at: 0, dur: 2, x: 0, y: 0, z: 4, ease: (x) => x}]);
  assert.ok(Math.abs(cam.at(1).z - 2) < 1e-9);
});

test("sheetCamera: the same t gives the same pose whatever was asked before", () => {
  const cam = sheetCamera(shots);
  const want = cam.at(4.2);
  for (const t of [9, 0, 2.7, 6.5]) cam.at(t);
  assert.deepEqual(cam.at(4.2), want);
});

test("printRun: whole pixels per frame while running, continuous into the stop, then holds", () => {
  const run = printRun({fps: 30, pxPerFrame: 11, stopAt: 2, ease: 1});
  for (let f = 0; f <= 60; f++) {
    assert.equal(run(f / 30), f * 11);
  }
  // Velocity carries into the ease: the first stopping frame moves about one step.
  const d = run(61 / 30) - run(60 / 30);
  assert.ok(d >= 9 && d <= 11, `first eased step ${d}`);
  // And stops for good.
  assert.equal(run(10), run(20));
  for (let t = 2; t < 4; t += 1 / 30) assert.equal(run(t), Math.round(run(t)), "eased offsets are whole px too");
});

test("registerDrift: zero on every downbeat and outside the drifting range", () => {
  const bars = [1, 3, 5, 7];
  const drift = registerDrift({bars, until: 6, x: 70, y: 150});
  for (const b of [1, 3, 5]) {
    const o = drift(b);
    assert.ok(Math.abs(o.x) < 1e-9 && Math.abs(o.y) < 1e-9, `off register at downbeat ${b}`);
  }
  assert.deepEqual(drift(0.5), {x: 0, y: 0});
  assert.deepEqual(drift(6.5), {x: 0, y: 0});
  // Peaks mid-bar and alternates direction bar to bar.
  assert.ok(Math.abs(drift(2).x - 70) < 1e-9);
  assert.ok(Math.abs(drift(4).x + 70) < 1e-9);
});

test("noise: deterministic and in range", () => {
  assert.equal(hash(3, 4, 5), hash(3, 4, 5));
  assert.notEqual(hash(3, 4, 5), hash(3, 4, 6));
  for (let i = 0; i < 1000; i++) {
    const x = i * 0.37, y = i * 0.11;
    for (const v of [hash(i, i * 7), noise2(x, y), noise3(x, y, i * 0.05)]) assert.ok(v >= 0 && v < 1, `${v}`);
  }
  assert.equal(noise3(1.5, 2.5, 0.7, 3), noise3(1.5, 2.5, 0.7, 3));
});

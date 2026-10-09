// The pure halves of the 2026-10-09 primitives: temporal strip sampling,
// type fragment grids and line timing, and the film pass's threshold and
// weave maths. The canvas halves are checked in a browser by
// tests/browser/ (npm run test:browser).

import {test} from "node:test";
import assert from "node:assert/strict";
import {scanStrips} from "../src/arrange/temporal-scan";
import {fragmentGrid, lineProgress} from "../src/arrange/type-reveal";
import {gateWeave, thresholdFilter} from "../src/passes/film-pass";
import {classifyStrokes} from "../src/arrange/letter-strokes";

const W = 2560, H = 1440;

test("scanStrips: strips tile the frame with whole-pixel edges, no gaps or overlap", () => {
  for (const axis of ["x", "y"] as const) {
    for (const bands of [1, 7, 48, 64, 333]) {
      const s = scanStrips(3, {width: W, height: H, axis, bands, span: 1});
      assert.equal(s.length, bands);
      let edge = 0;
      for (const b of s) {
        const a = axis === "x" ? b.x : b.y;
        const len = axis === "x" ? b.w : b.h;
        assert.equal(a, edge, `${axis} ${bands}: gap or overlap at ${a}`);
        assert.equal(a, Math.round(a));
        assert.ok(len >= 1);
        edge = a + len;
      }
      assert.equal(edge, axis === "x" ? W : H);
    }
  }
});

test("scanStrips: span 0 samples every strip at t - offset (the ordinary source)", () => {
  for (const s of scanStrips(4.2, {width: W, height: H, bands: 40, span: 0, offset: 0.2})) assert.equal(s.time, 4.2 - 0.2);
});

test("scanStrips: neighbouring strips sample different times, spaced span / bands apart, earliest at the far end", () => {
  const s = scanStrips(5, {width: W, height: H, bands: 50, span: 2});
  for (let i = 1; i < s.length; i++) assert.ok(Math.abs(s[i - 1].time - s[i].time - 2 / 50) < 1e-9);
  assert.ok(s[0].time > s[49].time);
  // Centres: the first strip is half a strip into the span.
  assert.ok(Math.abs(s[0].time - (5 - 2 * (0.5 / 50))) < 1e-9);
  const r = scanStrips(5, {width: W, height: H, bands: 50, span: 2, direction: -1});
  assert.ok(r[0].time < r[49].time);
  assert.ok(Math.abs(r[0].time - s[49].time) < 1e-9);
});

test("scanStrips: same t, same strips, whatever was asked before", () => {
  const opts = {width: W, height: H, bands: 64, span: 1.3, axis: "y" as const};
  const want = scanStrips(4, opts);
  for (const t of [1, 7, 0, 9.5]) scanStrips(t, opts);
  assert.deepEqual(scanStrips(4, opts), want);
});

test("fragmentGrid: slabs tile the word box exactly, with whole-pixel edges", () => {
  const box = {x: 310.4, y: 520.7, w: 1880.3, h: 301.2};
  const frags = fragmentGrid(box, {cols: 23, rows: 2, seed: 4, jitter: 0.8});
  assert.equal(frags.length, 23 * 3);
  let area = 0;
  for (const f of frags) {
    for (const v of [f.x, f.y, f.w, f.h]) assert.equal(v, Math.round(v));
    assert.ok(f.w >= 1 && f.h >= 1);
    area += f.w * f.h;
  }
  const x0 = Math.floor(box.x), y0 = Math.floor(box.y);
  const x1 = Math.ceil(box.x + box.w), y1 = Math.ceil(box.y + box.h);
  assert.equal(area, (x1 - x0) * (y1 - y0));
  // No two slabs overlap.
  for (let i = 0; i < frags.length; i++) {
    for (let j = i + 1; j < frags.length; j++) {
      const a = frags[i], b = frags[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      assert.ok(ox <= 0 || oy <= 0, `slabs ${i} and ${j} overlap`);
    }
  }
});

test("fragmentGrid: deterministic per seed, appearance times evenly spread in (0, spread]", () => {
  const box = {x: 0, y: 0, w: 1000, h: 200};
  assert.deepEqual(fragmentGrid(box, {seed: 9}), fragmentGrid(box, {seed: 9}));
  assert.notDeepEqual(fragmentGrid(box, {seed: 9}), fragmentGrid(box, {seed: 10}));
  const at = fragmentGrid(box, {cols: 10, rows: 1, spread: 0.8}).map((f) => f.at).sort((a, b) => a - b);
  // Nothing at progress 0; the last slab at the spread.
  assert.ok(Math.abs(at[0] - 0.8 / 20) < 1e-12);
  assert.ok(Math.abs(at[at.length - 1] - 0.8) < 1e-12);
  for (let i = 1; i < at.length; i++) assert.ok(Math.abs(at[i] - at[i - 1] - 0.8 / 20) < 1e-12);
});

test("lineProgress: 0 at the start, 1 at the end, lines in order", () => {
  for (const n of [1, 3, 6]) {
    assert.deepEqual(lineProgress(n, 0), new Array(n).fill(0));
    assert.deepEqual(lineProgress(n, 1), new Array(n).fill(1));
    const mid = lineProgress(n, 0.5);
    for (let i = 1; i < n; i++) assert.ok(mid[i] <= mid[i - 1]);
  }
});

test("thresholdFilter: brightness then contrast maps the threshold to 0 and white to 1", () => {
  for (const th of [0.5, 0.72, 0.9]) {
    const m = /brightness\(([\d.]+)\) contrast\(([\d.]+)\)/.exec(thresholdFilter(th))!;
    const a = Number(m[1]), k = Number(m[2]);
    const f = (x: number) => Math.min(1, Math.max(0, (a * x - 0.5) * k + 0.5));
    assert.ok(Math.abs(f(th)) < 2e-3, `f(${th}) = ${f(th)}`);
    assert.ok(Math.abs(f(1) - 1) < 2e-3);
    assert.equal(f(th * 0.8), 0);
  }
});

test("gateWeave: deterministic, bounded, zero at amount 0", () => {
  assert.deepEqual(gateWeave(3.3, 99, 0.6), gateWeave(3.3, 99, 0.6));
  assert.deepEqual(gateWeave(3.3, 99, 0).map(Math.abs), [0, 0]);
  for (let f = 0; f < 300; f++) {
    const [x, y] = gateWeave(f / 24, f, 1);
    assert.ok(Math.abs(x) <= 1.3 && Math.abs(y) <= 0.8, `${x}, ${y}`);
  }
});

// Letters drawn as 0/255 bitmaps: '#' ink, '.' empty, each cell 3x3 px so
// a one-pixel fringe column isn't a big share of the letter.
function bitmap(rows: string[], k = 3): {alpha: Uint8Array; w: number; h: number} {
  const h = rows.length * k, w = rows[0].length * k;
  const alpha = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) alpha[y * w + x] = rows[(y / k) | 0][(x / k) | 0] === "#" ? 255 : 0;
  return {alpha, w, h};
}
const kindsOf = (labels: Uint8Array) => new Set(Array.from(labels).filter((v) => v));

test("classifyStrokes: an E is one stem and three bars, no curves", () => {
  const {alpha, w, h} = bitmap([
    "..########..", "..########..", "..##........", "..##........", "..#######...", "..#######...",
    "..##........", "..##........", "..#######...", "..#######...",
  ]);
  const {labels, stems} = classifyStrokes(alpha, w, h);
  assert.deepEqual(stems, [[6, 11]]);
  assert.deepEqual(kindsOf(labels), new Set([1, 2]));
  assert.equal(labels[1 * w + 24], 2, "top arm is a bar");
  assert.equal(labels[13 * w + 20], 2, "middle arm is a bar");
  assert.equal(labels[16 * w + 7], 1, "upright is a stem");
});

test("classifyStrokes: an O has no stem and no bar; every inked pixel is labelled exactly once", () => {
  const {alpha, w, h} = bitmap([
    "...####...", ".########.", "###....###", "##......##", "##......##", "##......##", "###....###", ".########.", "...####...",
  ]);
  const {labels, stems} = classifyStrokes(alpha, w, h);
  assert.deepEqual(stems, []);
  assert.deepEqual(kindsOf(labels), new Set([3]));
  for (let i = 0; i < alpha.length; i++) assert.equal(alpha[i] > 0, labels[i] > 0);
});

test("classifyStrokes: an I is all stem; an L is a stem and a foot", () => {
  const I = bitmap([".##.", ".##.", ".##.", ".##.", ".##."]);
  assert.deepEqual(kindsOf(classifyStrokes(I.alpha, I.w, I.h).labels), new Set([1]));
  const L = bitmap(["##.....", "##.....", "##.....", "##.....", "#######", "#######"]);
  const r = classifyStrokes(L.alpha, L.w, L.h);
  assert.equal(r.labels[16 * L.w + 19], 2, "foot is a bar");
  assert.equal(r.labels[0], 1);
});

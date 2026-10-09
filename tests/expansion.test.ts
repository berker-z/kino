// The pure halves of the 2026-10-09 visual expansion (KINO_VISUAL_EXPANSION_MASTER_SPEC.md):
// shutter sample timing and weights, copier generations, ... The canvas and WebGL halves are
// checked in a browser by tests/browser/ (npm run test:browser).

import {test} from "node:test";
import assert from "node:assert/strict";
import {exposureSamples} from "../src/arrange/shutter";
import {copyStep} from "../src/sources/xerox";
import {transmittance} from "../src/arrange/transmission";
import {squareToQuad, invert3, applyHomography, type Quad} from "../src/arrange/surface-project";

const sum = (xs: {weight: number}[]) => xs.reduce((a, s) => a + s.weight, 0);

test("exposureSamples: weights are positive and sum to 1, with or without flash or fade", () => {
  for (const flash of [0, 0.3, 0.6, 1]) for (const fade of [0, 0.5, 1]) for (const samples of [1, 4, 12, 33]) {
    const s = exposureSamples(5, {duration: 0.8, samples, flash, fade});
    assert.ok(Math.abs(sum(s) - 1) < 1e-12, `sum ${sum(s)} (flash ${flash} fade ${fade} n ${samples})`);
    for (const x of s) assert.ok(x.weight > 0);
  }
});

test("exposureSamples: duration 0 collapses the ambient to one sample at t", () => {
  const s = exposureSamples(3.25, {duration: 0, samples: 16});
  assert.deepEqual(s, [{time: 3.25, weight: 1, flash: false}]);
  const f = exposureSamples(3.25, {duration: 0, samples: 16, flash: 0.6, flashAt: 0.5});
  assert.ok(f.every((x) => x.time === 3.25));
  assert.ok(Math.abs(sum(f) - 1) < 1e-12);
});

test("exposureSamples: ambient samples span the interval (t - duration, t), centred in equal slices", () => {
  const s = exposureSamples(10, {duration: 2, samples: 8});
  assert.equal(s.length, 8);
  assert.ok(Math.abs(s[0].time - (10 - 2 * (0.5 / 8))) < 1e-12);
  assert.ok(Math.abs(s[7].time - (10 - 2 * (7.5 / 8))) < 1e-12);
  for (const x of s) assert.ok(x.time < 10 && x.time > 8);
  for (let i = 1; i < 8; i++) assert.ok(Math.abs(s[i - 1].time - s[i].time - 0.25) < 1e-12);
});

test("exposureSamples: flashAt 0 fires at t (rear curtain), 1 at the start, with its own weight", () => {
  const rear = exposureSamples(4, {duration: 1, samples: 6, flash: 0.5, flashAt: 0}).find((x) => x.flash)!;
  const front = exposureSamples(4, {duration: 1, samples: 6, flash: 0.5, flashAt: 1}).find((x) => x.flash)!;
  assert.equal(rear.time, 4);
  assert.equal(front.time, 3);
  assert.equal(rear.weight, 0.5);
});

test("exposureSamples: fade weights the oldest light least", () => {
  const s = exposureSamples(4, {duration: 1, samples: 10, fade: 0.8});
  for (let i = 1; i < s.length; i++) assert.ok(s[i].weight < s[i - 1].weight);
});

test("exposureSamples: same t, same samples, whatever was asked before; bad counts are bounded", () => {
  const opts = {duration: 0.7, samples: 12, flash: 0.4, flashAt: 0.2, fade: 0.3};
  const want = exposureSamples(6, opts);
  for (const t of [1, 9, 0, 6.5]) exposureSamples(t, opts);
  assert.deepEqual(exposureSamples(6, opts), want);
  assert.equal(exposureSamples(1, {duration: 1, samples: 0}).length, 1);
  assert.equal(exposureSamples(1, {duration: 1, samples: NaN}).length, 1);
  assert.equal(exposureSamples(1, {duration: 1, samples: 1e9}).length, 256);
  assert.equal(exposureSamples(1, {duration: -2, samples: 5}).length, 1);
});

// A test sheet as ink density: a solid block, a thick bar, 1 px hairlines,
// and an empty margin.
function sheet(w = 240, h = 180): Float32Array {
  const d = new Float32Array(w * h);
  const fill = (x0: number, y0: number, x1: number, y1: number, v = 1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) d[y * w + x] = v; };
  fill(20, 20, 100, 100);            // solid
  fill(120, 20, 130, 140);           // 10 px bar
  for (let x = 150; x < 230; x += 6) fill(x, 20, x + 1, 140);  // hairlines
  fill(20, 110, 100, 140, 0.5);      // mid grey
  return d;
}
const meanIn = (d: Float32Array, w: number, x0: number, y0: number, x1: number, y1: number) => {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += d[y * w + x]; n++; }
  return s / n;
};
const gens = (n: number, opts = {}) => {
  const out = [sheet()];
  for (let g = 1; g <= n; g++) out.push(copyStep(out[g - 1], 240, 180, g, opts));
  return out;
};

test("copyStep: same seed, same copy; another seed, another copy", () => {
  const a = copyStep(sheet(), 240, 180, 1, {seed: 3});
  assert.deepEqual(copyStep(sheet(), 240, 180, 1, {seed: 3}), a);
  assert.notDeepEqual(copyStep(sheet(), 240, 180, 1, {seed: 4}), a);
});

test("copyStep: output stays in 0-1 for extreme settings", () => {
  for (const opts of [{contrast: 40, ragged: 0.2, specks: 0.05, streak: 0.1, solidLoss: 1}, {contrast: 1, spread: 4, threshold: 0.05}, {threshold: 0.95, spread: 0}]) {
    for (const d of gens(3, opts)) for (const v of d) assert.ok(v >= 0 && v <= 1 && Number.isFinite(v));
  }
});

test("copyStep: fine detail goes first; large forms persist; nothing blanks", () => {
  const g = gens(6);
  // Hairline contrast: the difference between line and gap columns.
  const hair = (d: Float32Array) => { let line = 0, gap = 0; for (let y = 40; y < 120; y++) for (let x = 150; x < 228; x += 6) { line += d[y * 240 + x]; gap += d[y * 240 + x + 3]; } return (line - gap) / (80 * 13); };
  const h = g.map(hair);
  assert.ok(h[6] < h[0] * 0.6, `hairline contrast ${h.map((v) => v.toFixed(2)).join(" ")}`);
  const bar = g.map((d) => meanIn(d, 240, 122, 30, 128, 130));
  assert.ok(bar[6] > 0.75, `10 px bar after 6 copies: ${bar[6].toFixed(2)}`);
  const solid = g.map((d) => meanIn(d, 240, 30, 30, 90, 90));
  assert.ok(solid[6] > 0.3 && solid[6] < 0.98, `solid interior after 6 copies: ${solid[6].toFixed(2)} (dirty, not gone)`);
  // Grey collapses toward ink or paper.
  const grey = g[3].subarray(0, 0);
  void grey;
  let mid = 0;
  for (let y = 115; y < 135; y++) for (let x = 25; x < 95; x++) { const v = g[3][y * 240 + x]; if (v > 0.25 && v < 0.75) mid++; }
  assert.ok(mid / (20 * 70) < 0.3, `grey pixels left in the mid band after 3 copies: ${(mid / 1400).toFixed(2)}`);
});

test("copyStep: specks only near ink, never in an empty margin (streaks off)", () => {
  const g = gens(5, {streak: 0, specks: 0.05});
  // Visible means at least one 8-bit level (gaussian tails leave ~1e-7).
  for (const d of g) for (let y = 160; y < 180; y++) for (let x = 0; x < 240; x++) assert.ok(d[y * 240 + x] < 1 / 255, `speck at ${x},${y} in the bottom margin (20 px from any ink)`);
  // Near edges they do appear.
  const near = (d: Float32Array) => { let n = 0; for (let y = 100; y < 108; y++) for (let x = 20; x < 100; x++) if (d[y * 240 + x] > 0.3) n++; return n; };
  assert.ok(near(g[5]) > 0, "no specks anywhere near the solid");
});

test("copyStep: cost per generation, 1200 x 1700 sheet", () => {
  const w = 1200, h = 1700, d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = (i % 97) < 30 ? 1 : 0;
  const t0 = performance.now();
  copyStep(d, w, h, 1);
  const ms = performance.now() - t0;
  assert.ok(ms < 20000);
  console.log(`  copyStep 1200x1700: ${ms.toFixed(0)} ms`);
});

const close = (a: number[] | null, b: number[], tol = 1e-6) => a !== null && a.every((v, i) => Math.abs(v - b[i]) < tol);

test("squareToQuad: the unit square's corners land on the quad's corners, and back", () => {
  const q: Quad = [[310, 220], [2300, 470], [2290, 1010], [260, 1330]];
  const m = squareToQuad(q), inv = invert3(m);
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
  corners.forEach(([u, v], i) => {
    assert.ok(close(applyHomography(m, u, v), q[i]), `corner ${i}`);
    assert.ok(close(applyHomography(inv, q[i][0], q[i][1]), [u, v]), `inverse corner ${i}`);
  });
  // Round trip anywhere inside.
  for (const [u, v] of [[0.25, 0.75], [0.5, 0.5], [0.9, 0.1]]) {
    const p = applyHomography(m, u, v)!;
    assert.ok(close(applyHomography(inv, p[0], p[1]), [u, v]));
  }
});

test("squareToQuad: a parallelogram is affine (no perspective terms); its centre is the square's centre", () => {
  const q: Quad = [[0, 0], [400, 100], [500, 400], [100, 300]];
  const m = squareToQuad(q);
  assert.ok(Math.abs(m[6]) < 1e-12 && Math.abs(m[7]) < 1e-12);
  assert.ok(close(applyHomography(m, 0.5, 0.5), [250, 200]));
});

test("squareToQuad: perspective: equal steps in u are unequal on screen, shrinking toward the far side", () => {
  const q: Quad = [[100, 100], [1000, 400], [1000, 600], [100, 900]];
  const m = squareToQuad(q);
  const xs = [0, 0.25, 0.5, 0.75, 1].map((u) => applyHomography(m, u, 0.5)![0]);
  for (let i = 2; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] < xs[i - 1] - xs[i - 2], xs.join(" "));
});

test("squareToQuad: degenerate quads throw instead of producing NaNs", () => {
  const bad: Quad[] = [
    [[0, 0], [100, 0], [200, 0], [0, 100]],          // three in a line
    [[0, 0], [100, 100], [100, 0], [0, 100]],        // bow tie
    [[0, 0], [100, 0], [100, 100], [NaN, 100]],       // not finite
    [[5, 5], [5, 5], [5, 5], [5, 5]],                 // a point
  ];
  for (const q of bad) assert.throws(() => squareToQuad(q), /surfaceProject/);
});

test("transmittance: zero extinction passes everything; density attenuates monotonically; tint scales; bounded", () => {
  for (const d of [0, 0.3, 1]) assert.equal(transmittance(d, 0), 1);
  let last = 2;
  for (let d = 0; d <= 1; d += 0.05) { const t = transmittance(d, 4); assert.ok(t < last && t > 0); last = t; }
  assert.ok(Math.abs(transmittance(1, 5) - Math.exp(-5)) < 1e-12);
  assert.ok(Math.abs(transmittance(0.5, 2, 0.4) - 0.4 * Math.exp(-1)) < 1e-12);
  assert.equal(transmittance(-3, 4), 1);
  assert.equal(transmittance(0.5, -2), 1);
  assert.equal(transmittance(0, 1, 7), 1);
});

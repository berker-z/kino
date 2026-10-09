// Xerox: a sheet copied, and the copy copied again. Each generation is
// made from the previous one the way a photocopier makes it, so the loss
// has a direction: thin things break up first, large forms persist, greys
// collapse to toner or paper, solids go dirty in the middle.
//
// One generation, on ink density d (0 paper, 1 full toner), at the plate's
// resolution:
//
//   1. optics: a small gaussian spread (the lens and the drum). Thin lines
//      and small counters lose density before anything else.
//   2. transfer: a steep curve around `threshold`, jittered by a ragged
//      noise fixed to the sheet. Greys go to ink or paper; edges that
//      straddle the threshold shred instead of staying smooth. Because
//      the threshold sits below the middle, ink spreads a little each
//      time: strokes thicken while hairlines drop out.
//   3. solid fill: xerography develops edges harder than the middle of
//      large dark areas, so the inside of a solid (a dark photo patch, a
//      heavy rule) loses density in a blotchy pattern.
//   4. toner: specks land in the paper near printed edges (where the
//      charge is) and drop out of the ink, never in empty margins.
//   5. scan: streaks along the scan direction from the glass and the
//      corona wire. They belong to the machine (seeded once), so they
//      come back at the same columns every generation and accumulate.
//
// Everything random is a hash of (pixel, seed, generation): fixed to the
// sheet, not to the frame. Copy the sheet once, then move it as a plate;
// a camera travelling over it sees the same toner every frame.
//
// The heavy part is pure (Float32Array in, out), so it's unit-tested in
// node; copyGenerations wraps it for canvases.

export type CopyOptions = {
  /** Ink density (0-1) where the copier switches from paper to toner. Below 0.5 thickens strokes. */
  threshold?: number;
  /** Steepness of the transfer curve. 6 keeps some grey; 14 is nearly 1-bit. */
  contrast?: number;
  /** Optical spread per copy, gaussian sigma in plate px. */
  spread?: number;
  /** 0-0.2 jitter of the threshold (ragged, shredded edges). */
  ragged?: number;
  /** 0-1 density lost in the middle of large solids. */
  solidLoss?: number;
  /** 0-0.05 chance of a toner speck per pixel at an edge. */
  specks?: number;
  /** 0-0.1 density of scan streaks. */
  streak?: number;
  /** "y": the scan bar travels down the sheet, streaks run vertically. "x": across. */
  scan?: "x" | "y";
  seed?: number;
};

export const copyDefaults: Required<CopyOptions> = {
  threshold: 0.37,
  contrast: 8,
  spread: 1.15,
  ragged: 0.13,
  solidLoss: 0.2,
  specks: 0.012,
  streak: 0.02,
  scan: "y",
  seed: 12,
};

function hash(x: number, y: number, s: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(s, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Value noise on a lattice of `cell` px, 0-1, fixed to (x, y, s). */
function vnoise(x: number, y: number, cell: number, s: number): number {
  const gx = x / cell, gy = y / cell;
  const ix = Math.floor(gx), iy = Math.floor(gy);
  let fx = gx - ix, fy = gy - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Separable box blur of radius r (O(n) per pass). */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const n = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += src[row + Math.min(w - 1, Math.max(0, k))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / n;
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, k)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / n;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Separable gaussian blur, sigma in px (kernel to 3 sigma). */
function gaussBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  if (sigma <= 0.05) return src.slice();
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * src[y * w + Math.min(w - 1, Math.max(0, x + i))];
    tmp[y * w + x] = a;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let a = 0;
    for (let i = -r; i <= r; i++) a += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x];
    out[y * w + x] = a;
  }
  return out;
}

/**
 * One copy: ink density in, ink density out (both 0-1, row-major w x h).
 * `generation` is the number of the copy being made (1 for the first), so
 * its noise differs from the last copy's. Pure.
 */
export function copyStep(density: Float32Array, w: number, h: number, generation: number, options: CopyOptions = {}): Float32Array {
  const o = {...copyDefaults, ...options};
  const g = Math.max(1, Math.floor(generation));
  const s = (o.seed * 7919 + g * 104729) | 0;
  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

  // 1. Optics.
  const d = gaussBlur(density, w, h, Math.max(0, o.spread));
  // 3 (measured before the transfer): how deep inside a solid each pixel sits.
  const local = boxBlur(d, w, h, 14);
  const near = boxBlur(d, w, h, 3);

  const out = new Float32Array(w * h);
  const k = Math.max(1, o.contrast);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    // 2. Transfer around a ragged threshold (fine + coarse noise, fixed to the sheet).
    const jitter = (vnoise(x, y, 1.6, s) - 0.5) * 0.7 + (vnoise(x, y, 7, s + 1) - 0.5) * 0.3;
    const th = o.threshold + o.ragged * jitter * 2;
    // Normalised at this pixel's threshold, so paper (0) stays paper and full toner stays full.
    const lo = 1 / (1 + Math.exp(k * th)), hi = 1 / (1 + Math.exp(-k * (1 - th)));
    let v = (1 / (1 + Math.exp(-k * (d[i] - th))) - lo) / (hi - lo);
    // 3. Solid fill weakness, blotchy.
    const inside = clamp01((local[i] - 0.8) / 0.18);
    if (inside > 0) v *= 1 - o.solidLoss * inside * (0.35 + 0.65 * vnoise(x, y, 5, s + 2));
    // 4. Toner: specks in the paper near edges, dropouts in the ink.
    const edge = clamp01(near[i] * (1 - near[i]) * 4);
    if (v < 0.5 && hash(x, y, s + 3) < o.specks * edge) v = Math.max(v, 0.6 + 0.4 * hash(x, y, s + 4));
    if (v > 0.5 && hash(x, y, s + 5) < o.specks * 0.6 * (0.3 + edge)) v *= 0.35;
    // 5. Scan streaks: the machine's, so seeded without the generation.
    const along = o.scan === "y" ? x : y;
    const across = o.scan === "y" ? y : x;
    // A few dirty columns on the glass: faint, broken lines.
    const line = hash(along, 0, o.seed + 6);
    if (line < o.streak * 0.05) v = Math.max(v, 0.3 * Math.max(0, vnoise(across, along, 60, o.seed + 7) * 2 - 0.8));
    v *= 1 - o.streak * 3 * (vnoise(along, 0, 23, o.seed + 8) - 0.5) * (v > 0.5 ? 1 : 0);
    out[i] = clamp01(v);
  }
  return out;
}

/** Rec. 709 luma of a canvas as ink density (1 - luma), 0-1. */
export function densityOf(source: HTMLCanvasElement): Float32Array {
  const w = source.width, h = source.height;
  const data = source.getContext("2d", {willReadFrequently: true})!.getImageData(0, 0, w, h).data;
  const d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = 1 - (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
  return d;
}

/** Ink density as an opaque canvas: paper and toner colours. */
export function densityCanvas(d: Float32Array, w: number, h: number, paper = "#f2efe8", toner = "#111111"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const img = g.createImageData(w, h);
  const p = [1, 3, 5].map((i) => parseInt(paper.slice(i, i + 2), 16));
  const t = [1, 3, 5].map((i) => parseInt(toner.slice(i, i + 2), 16));
  for (let i = 0; i < w * h; i++) {
    const v = d[i];
    img.data[i * 4] = p[0] + (t[0] - p[0]) * v;
    img.data[i * 4 + 1] = p[1] + (t[1] - p[1]) * v;
    img.data[i * 4 + 2] = p[2] + (t[2] - p[2]) * v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export type CopyGenerationsOptions = CopyOptions & {
  /** How many copies to make after the original. */
  generations: number;
  paper?: string;
  toner?: string;
};

/**
 * The original (generation 0, the source's luma on paper) and each copy of
 * the copy after it, as canvases the source's size. Computed once.
 */
export function copyGenerations(source: HTMLCanvasElement, options: CopyGenerationsOptions): HTMLCanvasElement[] {
  const {generations, paper, toner, ...copy} = options;
  const w = source.width, h = source.height;
  let d = densityOf(source);
  const out = [densityCanvas(d, w, h, paper, toner)];
  for (let g = 1; g <= Math.max(0, Math.floor(generations)); g++) {
    d = copyStep(d, w, h, g, copy);
    out.push(densityCanvas(d, w, h, paper, toner));
  }
  return out;
}

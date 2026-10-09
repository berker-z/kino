import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";
import {blueNoise64} from "./blue-noise";

// DitherPass: any picture as a 2-4 tone ordered dither, stable in motion.
//
// Every frame, `paint` draws a grayscale picture at full size (white =
// light). The pass shrinks it to dither resolution (width / scale), preps
// it so it reads, and thresholds it against a fixed map into the palette:
//
// - prep: levels, local contrast (a wide unsharp mask), an S-curve and a
//   little sharpening. Photos fed in raw dither into mud; this is the part
//   that makes any photo read. See docs/primitives/dither-pass.md.
// - method: Bayer 8 (the default: the regular cross-hatch), Bayer 4,
//   blue noise (fixed grain, no visible pattern), halftone dots.
// - palette: 2 to 4 colours, dark to light. N colours = N tones; three
//   is the sweet spot (a third, light tone keeps two dark ones from mud).
// - amount: how much it dithers. 1 is the palette alone; lower adds
//   in-between tones along the palette's ramp, so the pattern's steps get
//   smaller and softer; 0 is a smooth gradient map with no pattern at all.
//
// The maps are fixed to the screen, so pixels only change where the
// picture does. Error diffusion (Floyd-Steinberg) is deliberately not here:
// it boils in motion, and the fix (hysteresis) needs the previous frame,
// which a seek-anywhere render doesn't have. It lives in scripts/dither.py
// for footage instead.
//
// The per-frame work is `ditherer()`, usable without a timeline (the
// playground in tools/dither uses it on live video).

export type DitherMethod = "bayer-8" | "bayer-4" | "blue-noise" | "halftone";

export type DitherPrep = {
  /** Input black and white points. "auto" measures one frame, once. */
  levels?: [number, number] | "auto";
  levelsAt?: number;
  /** Local contrast: unsharp-mask amount and radius in dither px. */
  localContrast?: number;
  localRadius?: number;
  /** S-curve strength, 0 = none. */
  contrast?: number;
  gamma?: number;
  /** Fine sharpening amount (radius 1 dither px). */
  sharpen?: number;
};

export const ditherPalettes = {
  "sepia-2": ["#16120e", "#5c4c39"],
  "sepia-3": ["#16120e", "#5c4c39", "#bfa784"],
  "sepia-4": ["#16120e", "#3d3227", "#76624a", "#d2bf9f"],
  "ice-2": ["#0A1022", "#BFD4FF"],
  "ice-3": ["#0A1022", "#3E5687", "#BFD4FF"],
  "prussian-3": ["#0B1A33", "#2F5A8C", "#C7D9EE"],
  "oxblood-3": ["#1A0606", "#7A2A20", "#E2B79C"],
  "phosphor-3": ["#0A0703", "#7A4512", "#F7B45A"],
  "bone-2": ["#111111", "#E8E1D3"],
  "paper-3": ["#1B1B1B", "#8F8778", "#F3EEE3"],
} as const;

export const ditherPreps: Record<"punch" | "levels" | "none", DitherPrep> = {
  punch: {levels: "auto", localContrast: 0.6, localRadius: 24, contrast: 0.35, sharpen: 0.7},
  levels: {levels: "auto"},
  none: {},
};

export type DitherSettings = {
  method?: DitherMethod;
  /** 2-4 colours, dark to light, or a preset name from ditherPalettes. */
  palette?: readonly string[] | keyof typeof ditherPalettes;
  /** "punch" (default), "levels", "none", or your own settings. */
  prep?: keyof typeof ditherPreps | DitherPrep;
  /** 0 smooth gradient map ... 1 full dither in the palette (default). */
  amount?: number;
  /** Halftone cell size (dither px) and angle (degrees). */
  cell?: number;
  angle?: number;
};

/** What a painter can return each frame. */
export type DitherPost = {
  /** Added to tone before the threshold: -1 all dark, +1 all light. For fades. */
  bias?: number;
  /** Overrides the amount for this frame: animate the dither in and out. */
  amount?: number;
};

function bayer(n: 4 | 8): Float32Array {
  let m = [[0]];
  while (m.length < n) {
    const k = m.length;
    const next: number[][] = Array.from({length: 2 * k}, () => new Array(2 * k).fill(0));
    for (let y = 0; y < k; y++) {
      for (let x = 0; x < k; x++) {
        const v = 4 * m[y][x];
        next[y][x] = v;
        next[y][x + k] = v + 2;
        next[y + k][x] = v + 3;
        next[y + k][x + k] = v + 1;
      }
    }
    m = next;
  }
  return Float32Array.from(m.flat(), (v) => (v + 0.5) / (n * n));
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Black and white points from the 1st and 99th percentiles. */
function percentiles(lum: Float32Array): [number, number] {
  const hist = new Uint32Array(256);
  for (let i = 0; i < lum.length; i++) hist[Math.min(255, Math.max(0, (lum[i] * 255) | 0))]++;
  const pick = (q: number) => {
    let acc = 0;
    for (let i = 0; i < 256; i++) if ((acc += hist[i]) >= q * lum.length) return i / 255;
    return 1;
  };
  const lo = pick(0.01);
  const hi = pick(0.99);
  return hi - lo < 0.02 ? [0, 1] : [lo, hi];
}

/**
 * The tone steps for an amount: k + 1 evenly spaced tones along the
 * palette's ramp. amount 1 gives exactly the palette (k = N - 1); lower
 * shrinks the step linearly towards 1/255, where the pattern disappears.
 */
export function ditherSteps(paletteSize: number, amount: number): number {
  const a = Math.min(1, Math.max(0, amount));
  const step = a / (paletteSize - 1) + (1 - a) / 255;
  return Math.max(paletteSize - 1, Math.round(1 / step));
}

export type Ditherer = {
  /** Dither resolution. */
  width: number;
  height: number;
  /** The last result, at dither resolution. Draw it scaled with smoothing off. */
  canvas: HTMLCanvasElement;
  /** Change settings; the map and palette are rebuilt as needed. */
  configure(settings: DitherSettings): void;
  /** Measure auto levels from a picture (the prep's levels must be "auto"). */
  measure(source: CanvasImageSource): void;
  /** Dither a picture (any size; it's shrunk to fit). */
  render(source: CanvasImageSource, post?: DitherPost): HTMLCanvasElement;
};

export function ditherer(width: number, height: number, initial: DitherSettings = {}): Ditherer {
  const w = width, h = height;
  let settings: Required<Omit<DitherSettings, "palette" | "prep">> & {palette: readonly string[]; prep: DitherPrep} = {
    method: "bayer-8", palette: ditherPalettes["sepia-3"], prep: ditherPreps.punch, amount: 1, cell: 5, angle: 45,
  };
  const map = new Float32Array(w * h);
  let pal: [number, number, number][] = [];
  let ramp = new Uint8Array(0);
  let rampMax = 0;
  let levels: [number, number] = [0, 1];

  function buildMap() {
    const {method, cell, angle} = settings;
    if (method === "halftone") {
      const a = (angle * Math.PI) / 180;
      const c = Math.cos(a), s = Math.sin(a);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = (x * c + y * s) / cell, v = (-x * s + y * c) / cell;
          const fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5;
          map[y * w + x] = Math.min(1, Math.sqrt(fu * fu + fv * fv) * Math.SQRT2);
        }
      }
      return;
    }
    const n = method === "blue-noise" ? 64 : method === "bayer-4" ? 4 : 8;
    const tile = method === "blue-noise" ? blueNoise64() : bayer(n as 4 | 8);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) map[y * w + x] = tile[(y % n) * n + (x % n)];
  }

  // The palette as a ramp, 255 samples between each pair of colours, so
  // any number of in-between tones lands on it and tones at amount 1 are
  // the palette colours exactly.
  function buildRamp() {
    pal = settings.palette.map(rgb);
    const segs = pal.length - 1;
    rampMax = segs * 255;
    ramp = new Uint8Array((rampMax + 1) * 3);
    for (let i = 0; i <= rampMax; i++) {
      const s = Math.min(segs - 1, Math.floor(i / 255));
      const f = (i - s * 255) / 255;
      for (let c = 0; c < 3; c++) ramp[i * 3 + c] = Math.round(pal[s][c] + (pal[s + 1][c] - pal[s][c]) * f);
    }
  }

  function configure(next: DitherSettings) {
    const before = settings;
    settings = {
      ...settings,
      ...Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)),
      palette: next.palette === undefined ? settings.palette : typeof next.palette === "string" ? ditherPalettes[next.palette] : next.palette,
      prep: next.prep === undefined ? settings.prep : typeof next.prep === "string" ? ditherPreps[next.prep] : next.prep,
    } as typeof settings;
    if (before.method !== settings.method || before.cell !== settings.cell || before.angle !== settings.angle || !map.some((v) => v > 0)) buildMap();
    if (before.palette !== settings.palette || !ramp.length) buildRamp();
    if (Array.isArray(settings.prep.levels)) levels = settings.prep.levels as [number, number];
    else if (!settings.prep.levels) levels = [0, 1];
  }

  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const smctx = small.getContext("2d", {willReadFrequently: true})!;
  smctx.imageSmoothingQuality = "high";
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = w;
  blurCanvas.height = h;
  const bctx = blurCanvas.getContext("2d", {willReadFrequently: true})!;
  const dots = document.createElement("canvas");
  dots.width = w;
  dots.height = h;
  const dctx = dots.getContext("2d")!;
  const image = dctx.createImageData(w, h);

  const lum = new Float32Array(w * h);
  const wide = new Float32Array(w * h);
  const fine = new Float32Array(w * h);
  const readLum = (ctx: CanvasRenderingContext2D, into: Float32Array) => {
    const d = ctx.getImageData(0, 0, w, h).data;
    // Rec. 709 luma, so colour sources work too.
    for (let i = 0; i < into.length; i++) into[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  };
  const blurred = (radius: number, into: Float32Array) => {
    bctx.filter = `blur(${radius}px)`;
    bctx.clearRect(0, 0, w, h);
    bctx.drawImage(small, 0, 0);
    bctx.filter = "none";
    readLum(bctx, into);
  };
  const shrink = (source: CanvasImageSource) => {
    smctx.fillStyle = "#000";
    smctx.fillRect(0, 0, w, h);
    smctx.drawImage(source, 0, 0, w, h);
    readLum(smctx, lum);
  };

  function render(source: CanvasImageSource, post: DitherPost = {}): HTMLCanvasElement {
    const prep = settings.prep;
    const bias = post.bias ?? 0;
    const k = ditherSteps(pal.length, post.amount ?? settings.amount);
    shrink(source);
    if (prep.localContrast) blurred(prep.localRadius ?? 24, wide);
    if (prep.sharpen) blurred(1, fine);
    const kk = 1 + 6 * (prep.contrast ?? 0);
    const sig = (v: number) => 1 / (1 + Math.exp(-kk * (v - 0.5)));
    const s0 = sig(0), s1 = sig(1);
    const gamma = prep.gamma ?? 1;
    const [lo, hi] = levels;
    const span = Math.max(hi - lo, 1e-3);
    const dst = image.data;
    for (let i = 0; i < lum.length; i++) {
      let v = (lum[i] - lo) / span;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      if (prep.localContrast) v += prep.localContrast * (v - (wide[i] - lo) / span);
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      if (gamma !== 1) v = Math.pow(v, gamma);
      if (prep.contrast) v = (sig(v) - s0) / (s1 - s0);
      if (prep.sharpen) v += (prep.sharpen * (lum[i] - fine[i])) / span;
      v += bias;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      // Ordered dither onto k + 1 tones: land between two neighbours and let
      // the map pick which.
      const f = v * k;
      const base = Math.floor(f);
      const q = Math.min(k, base + (f - base > map[i] ? 1 : 0));
      const r = Math.round((q / k) * rampMax) * 3;
      const o = i * 4;
      dst[o] = ramp[r];
      dst[o + 1] = ramp[r + 1];
      dst[o + 2] = ramp[r + 2];
      dst[o + 3] = 255;
    }
    dctx.putImageData(image, 0, 0);
    return dots;
  }

  configure(initial);
  return {
    width: w,
    height: h,
    canvas: dots,
    configure,
    measure(source) {
      shrink(source);
      levels = percentiles(lum);
    },
    render,
  };
}

export type DitherPassPainter = (ctx: CanvasRenderingContext2D, t: number, frame: number) => DitherPost | void;

export type DitherPassOptions = DitherSettings & {
  /** Output size in screen px. */
  width: number;
  height: number;
  /** Screen px per dither px. 2 at 1080p, 2 or 3 at 1440p. */
  scale?: number;
  start?: number;
  duration: number;
  fps?: number;
  paint: DitherPassPainter;
};

export function ditherPass(container: HTMLElement, timeline: gsap.core.Timeline, options: DitherPassOptions): HTMLCanvasElement {
  const {width: W, height: H, scale = 2, start = 0, duration, fps = 30, paint} = options;
  const d = ditherer(Math.ceil(W / scale), Math.ceil(H / scale), options);

  const screen = el("canvas", "k-layer k-dither-pass", container);
  screen.dataset.layoutAllowOverflow = "";
  screen.width = W;
  screen.height = H;
  const out = screen.getContext("2d")!;
  out.imageSmoothingEnabled = false;

  const source = document.createElement("canvas");
  source.width = W;
  source.height = H;
  const sctx = source.getContext("2d")!;
  const paintFrame = (t: number, frame: number): DitherPost => {
    sctx.save();
    sctx.fillStyle = "#000";
    sctx.fillRect(0, 0, W, H);
    const post = paint(sctx, t, frame) || {};
    sctx.restore();
    return post;
  };

  // Auto levels are measured once, from one frame, so they can't pump and
  // don't depend on which frame the renderer asks for first.
  const prep = typeof options.prep === "object" ? options.prep : ditherPreps[options.prep ?? "punch"];
  if (prep.levels === "auto") {
    const at = prep.levelsAt ?? 0;
    paintFrame(at, Math.round(at * fps));
    d.measure(source);
  }

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    const post = paintFrame(t, frame);
    out.drawImage(d.render(source, post), 0, 0, d.width * scale, d.height * scale);
  });

  return screen;
}

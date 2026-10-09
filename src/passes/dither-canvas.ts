import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";
import {hash} from "../utils/noise";

// A 1-bit screen. Each frame, `paint` draws a grayscale picture (white =
// ink) onto a small offscreen canvas; that picture is then thresholded
// through an ordered Bayer matrix into exactly two colors and scaled up with
// hard pixels. Per-frame post options carry the music-reactive damage.

export type DitherPost = {
  /** Added to luminance before thresholding. -1 → all ground, +1 → all ink. */
  bias?: number;
  /** Swap ink and ground. */
  invert?: boolean;
  /** Horizontal row shifts, in dither pixels. */
  tears?: {y: number; height: number; shift: number}[];
  /** 0–1 per-frame static. */
  noise?: number;
};

export type DitherPainter = (ctx: CanvasRenderingContext2D, t: number, frame: number) => DitherPost | void;

export type DitherCanvasOptions = {
  /** Dither-pixel resolution; the canvas is stretched to the container. */
  width: number;
  height: number;
  start?: number;
  duration: number;
  ink: string;
  ground: string;
  matrix?: 4 | 8;
  /**
   * ordered: Bayer dither, for gradients. threshold: plain 50% cut, hard
   * 1-bit. smooth: no quantizing; luminance blends ground to ink, keeping
   * antialiasing, for line art that moves (1-bit lines shimmer as they cross
   * pixel boundaries).
   */
  mode?: "ordered" | "threshold" | "smooth";
  fps?: number;
  paint: DitherPainter;
};

const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3,
  35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];
const BAYER_4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function ditherCanvas(container: HTMLElement, timeline: gsap.core.Timeline, options: DitherCanvasOptions): HTMLCanvasElement {
  const {width: w, height: h, start = 0, duration, matrix = 8, mode = "ordered", fps = 30, paint} = options;
  const size = matrix;
  const thresholds =
    mode === "threshold" ? new Array(size * size).fill(0.5) : (matrix === 8 ? BAYER_8 : BAYER_4).map((v) => (v + 0.5) / (size * size));
  const ink = rgb(options.ink);
  const ground = rgb(options.ground);

  const screen = el("canvas", "k-layer k-dither", container);
  // Full-bleed by design.
  screen.dataset.layoutAllowOverflow = "";
  screen.width = w;
  screen.height = h;
  const out = screen.getContext("2d")!;
  const image = out.createImageData(w, h);

  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const ctx = source.getContext("2d", {willReadFrequently: true})!;

  const shifts = new Int16Array(h);

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    const post = paint(ctx, t, frame) || {};
    ctx.restore();

    const {bias = 0, invert = false, tears = [], noise = 0} = post;
    shifts.fill(0);
    for (const tear of tears) {
      for (let y = Math.max(0, tear.y | 0); y < Math.min(h, tear.y + tear.height); y++) shifts[y] += tear.shift | 0;
    }

    const src = ctx.getImageData(0, 0, w, h).data;
    const dst = image.data;
    for (let y = 0; y < h; y++) {
      const row = (y % size) * size;
      const shift = shifts[y];
      for (let x = 0; x < w; x++) {
        let sx = x - shift;
        sx = sx < 0 ? 0 : sx >= w ? w - 1 : sx;
        // Rec. 709 luma rather than the red channel, like the other passes.
        const o = (y * w + sx) * 4;
        let lum = (0.2126 * src[o] + 0.7152 * src[o + 1] + 0.0722 * src[o + 2]) / 255 + bias;
        if (noise > 0) lum += (hash(x, y, frame) - 0.5) * 2 * noise;
        const i = (y * w + x) * 4;
        if (mode === "smooth") {
          let a = lum < 0 ? 0 : lum > 1 ? 1 : lum;
          if (invert) a = 1 - a;
          dst[i] = ground[0] + (ink[0] - ground[0]) * a;
          dst[i + 1] = ground[1] + (ink[1] - ground[1]) * a;
          dst[i + 2] = ground[2] + (ink[2] - ground[2]) * a;
          dst[i + 3] = 255;
          continue;
        }
        let on = lum > thresholds[row + (x % size)];
        if (invert) on = !on;
        const c = on ? ink : ground;
        dst[i] = c[0];
        dst[i + 1] = c[1];
        dst[i + 2] = c[2];
        dst[i + 3] = 255;
      }
    }
    out.putImageData(image, 0, 0);
  });

  return screen;
}

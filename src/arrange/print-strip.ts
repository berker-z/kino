import {caption} from "../sources/type";
import {hash} from "../utils/noise";

// A contact strip: a row of prints sliding sideways at a constant whole
// number of px per frame, each with a numbered caption. Constant speed and
// integer steps keep it calm and stop thin detail from shimmering.

export type PrintStripOptions = {
  /** Pre-rendered prints (e.g. sunprint()), all the same size. */
  prints: HTMLCanvasElement[];
  labels?: string[];
  /** Left edge of the first print at elapsed 0, px. */
  x?: number;
  /** Top of the row, px; each print is nudged up/down a little. */
  y?: number;
  gap?: number;
  /** Speed in whole px per frame; negative slides left. */
  pxPerFrame?: number;
  fps: number;
  frameWidth: number;
  ink?: string;
  seed?: number;
};

export function printStrip(options: PrintStripOptions) {
  const {prints, labels = [], x = 260, y = 330, gap = 70, pxPerFrame = -3, fps, frameWidth, ink = "#111", seed = 5} = options;
  return function paint(ctx: CanvasRenderingContext2D, elapsed: number): void {
    const x0 = x + Math.round(elapsed * fps) * pxPerFrame;
    prints.forEach((print, i) => {
      const px = x0 + i * (print.width + gap);
      if (px > frameWidth || px + print.width < 0) return;
      const py = y + Math.round((hash(seed, i) - 0.5) * 80);
      ctx.drawImage(print, px, py);
      if (labels[i]) caption(ctx, `${String(i + 1).padStart(2, "0")}   ${labels[i]}`, px + 40, py + print.height + 40, {ink});
    });
  };
}

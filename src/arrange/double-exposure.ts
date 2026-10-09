import type {CanvasScene} from "./torn-wipe";

// Double exposure: one picture living inside another's shape. A figure
// (the foreground) is exposed first; a second scene (the interior) is then
// exposed through a mask, so it occupies the figure's silhouette.
//
// This is compositing, not material: it doesn't grain, bloom or tone
// anything, so its output can go into any pass (filmPass, ditherPass,
// screenPass) or none.
//
// Buffer contract, because three different conventions meet here:
//
// - `foreground` and `interior` paint RGB over black, like any pass source.
// - `mask` paints onto a transparent canvas. In "alpha" mode coverage is its
//   alpha channel and its colour is ignored, so a cut-out PNG works as is.
//   In "luma" mode coverage is the Rec. 709 luma of what it paints over
//   black, so transparent areas are uncovered and white is full coverage.
//   A white-on-black image is only a mask in luma mode: in alpha mode it's
//   opaque everywhere, so it covers the whole frame.
// - The result is opaque RGB in the destination, which should be W x H and
//   already filled (passes fill it with black before painting).
//
// Two ways for the interior to land, both weighted by coverage c and mix m:
//
// - "screen": light adds, as on film exposed twice. out = screen(fg, m c B).
//   Where the foreground is bright the interior washes out, so this wants a
//   darkish figure (or a figure on white, the Photoshop recipe).
// - "replace": the interior takes over. out = fg (1 - m c) + m c B. Holes in
//   the mask (c = 0 inside the outline) show the foreground.
//
// Everything is done with 2D compositing (multiply, screen, difference,
// lighter) on three scratch canvases, so nothing is read back from the GPU
// and nothing depends on the previous frame.

export type MaskMode = "alpha" | "luma";
export type ExposureBlend = "screen" | "replace";

export type DoubleExposureOptions = {
  width: number;
  height: number;
  /** Exposed first, everywhere. Omit for black. */
  foreground?: CanvasScene;
  /** Exposed second, through the mask. */
  interior: CanvasScene;
  /** Paints the coverage onto a transparent canvas. */
  mask: CanvasScene;
  maskMode?: MaskMode;
  blend?: ExposureBlend;
  /** 0-1 how strongly the interior inhabits the figure; a number or a function of t. */
  mix?: number | ((t: number) => number);
};

export type DoubleExposure = {
  (ctx: CanvasRenderingContext2D, t: number): void;
  /** The coverage of the last frame as opaque gray (white = covered), for inspection and tests. */
  coverage: HTMLCanvasElement;
};

function scratch(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function reset(g: CanvasRenderingContext2D): void {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-over";
  g.globalAlpha = 1;
  g.filter = "none";
}

/** A painter that double-exposes `interior` into `mask` over `foreground`. */
export function doubleExposure(options: DoubleExposureOptions): DoubleExposure {
  const {width: W, height: H, foreground, interior, mask, maskMode = "alpha", blend = "screen", mix = 1} = options;
  const [cov, cg] = scratch(W, H);
  const [inner, ig] = scratch(W, H);
  const [inv, vg] = blend === "replace" ? scratch(W, H) : [null, null];

  // Coverage as opaque gray in `cov`. `inner` is free until the interior is
  // painted, so the luma path uses it as the raw mask.
  function coverage(t: number): void {
    reset(cg);
    if (maskMode === "alpha") {
      cg.clearRect(0, 0, W, H);
      cg.save();
      mask(cg, t);
      cg.restore();
      reset(cg);
      cg.globalCompositeOperation = "source-in";
      cg.fillStyle = "#fff";
      cg.fillRect(0, 0, W, H);
      cg.globalCompositeOperation = "destination-over";
      cg.fillStyle = "#000";
      cg.fillRect(0, 0, W, H);
      return;
    }
    reset(ig);
    ig.fillStyle = "#000";
    ig.fillRect(0, 0, W, H);
    ig.save();
    mask(ig, t);
    ig.restore();
    // CSS grayscale(1) is the Rec. 709 luma matrix on sRGB values, the same
    // luma the passes read.
    cg.filter = "grayscale(1)";
    cg.drawImage(inner, 0, 0);
    cg.filter = "none";
  }

  const paint = ((ctx: CanvasRenderingContext2D, t: number) => {
    const m = Math.min(1, Math.max(0, typeof mix === "function" ? mix(t) : mix));
    if (foreground) {
      ctx.save();
      foreground(ctx, t);
      ctx.restore();
    }
    coverage(t);
    if (m <= 0) return;

    // The interior, premultiplied by coverage: B c.
    reset(ig);
    ig.fillStyle = "#000";
    ig.fillRect(0, 0, W, H);
    ig.save();
    interior(ig, t);
    ig.restore();
    reset(ig);
    ig.globalCompositeOperation = "multiply";
    ig.drawImage(cov, 0, 0);

    ctx.save();
    reset(ctx);
    if (blend === "screen") {
      // (1 - m) fg + m screen(fg, B c) = screen(fg, m B c).
      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = m;
      ctx.drawImage(inner, 0, 0);
    } else {
      // 1 - m c, by differencing white with coverage at alpha m.
      reset(vg!);
      vg!.fillStyle = "#fff";
      vg!.fillRect(0, 0, W, H);
      vg!.globalCompositeOperation = "difference";
      vg!.globalAlpha = m;
      vg!.drawImage(cov, 0, 0);
      ctx.globalCompositeOperation = "multiply";
      ctx.drawImage(inv!, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = m;
      ctx.drawImage(inner, 0, 0);
    }
    ctx.restore();
  }) as DoubleExposure;
  paint.coverage = cov;
  return paint;
}

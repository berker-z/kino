// Self-mattes: mattes cut from a plate's own picture, so a second image
// can be exposed through its sky or its shadows. Where a silhouette
// exposure puts one picture inside a cut-out shape, a self-matte makes one
// photograph that couldn't exist: a tower standing in fog that was never
// there, a stair turning where its shadows were.
//
// plateKeys reads a plate once and returns two maps, both the plate's size,
// both to be drawn at the plate's position so they move with it:
//
// - sky: white with coverage in alpha (an alpha mask for doubleExposure).
//   The sky is pixels on the dark (or light) side of a threshold that are
//   connected to the top edge, so a black window in the facade isn't sky.
// - darkness: inverted luma with the sky removed, opaque (a luma mask).
//   White is the deepest shadow. Draw it through thresholdWindow to open
//   the shadows by a rule: as the threshold falls, the darkest areas admit
//   light first, then lighter ones.
//
// The reading is done at quarter size and scaled back up blurred, which is
// what a matte wants anyway; the blur also keeps texture (concrete,
// foliage) from passing as shadow.

export type PlateKeyOptions = {
  /** "dark" for a night or black sky, "light" for overcast; "auto" reads the top row. */
  sky?: "dark" | "light" | "auto";
  /** Luma 0-255: dark skies are below it, light skies above 255 minus it. */
  skyThreshold?: number;
  /** Work at 1/scale size. */
  scale?: number;
  /** Blur in plate px when scaling back up. */
  skyBlur?: number;
  darknessBlur?: number;
};

export type PlateKeys = {sky: HTMLCanvasElement; darkness: HTMLCanvasElement; skyIsDark: boolean};

/**
 * Pixels connected to the top row whose luma passes `inSky` (4-connected
 * flood fill). Pure, so it's unit-tested.
 */
export function skyRegion(lum: Uint8Array, w: number, h: number, inSky: (v: number) => boolean): Uint8Array {
  const sky = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) if (inSky(lum[x])) { sky[x] = 1; stack.push(x); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w, y = (i / w) | 0;
    if (x > 0 && !sky[i - 1] && inSky(lum[i - 1])) { sky[i - 1] = 1; stack.push(i - 1); }
    if (x < w - 1 && !sky[i + 1] && inSky(lum[i + 1])) { sky[i + 1] = 1; stack.push(i + 1); }
    if (y > 0 && !sky[i - w] && inSky(lum[i - w])) { sky[i - w] = 1; stack.push(i - w); }
    if (y < h - 1 && !sky[i + w] && inSky(lum[i + w])) { sky[i + w] = 1; stack.push(i + w); }
  }
  return sky;
}

/** Reads a plate (grayscale or colour) into a sky matte and a darkness map. */
export function plateKeys(plate: HTMLCanvasElement, options: PlateKeyOptions = {}): PlateKeys {
  const {sky: mode = "auto", skyThreshold = 34, scale = 4, skyBlur = 3, darknessBlur = 7} = options;
  const W = plate.width, H = plate.height;
  const w = Math.ceil(W / scale), h = Math.ceil(H / scale);
  const small = document.createElement("canvas");
  small.width = w;
  small.height = h;
  const g = small.getContext("2d", {willReadFrequently: true})!;
  g.drawImage(plate, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const lum = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = Math.round(0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]);

  let top = 0;
  for (let x = 0; x < w; x++) top += lum[x];
  const skyIsDark = mode === "auto" ? top / w < 128 : mode === "dark";
  const sky = skyRegion(lum, w, h, skyIsDark ? (v) => v < skyThreshold : (v) => v > 255 - skyThreshold);

  const up = (img: ImageData, blur: number): HTMLCanvasElement => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.putImageData(img, 0, 0);
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const og = out.getContext("2d")!;
    og.filter = `blur(${blur}px)`;
    og.drawImage(c, 0, 0, W, H);
    return out;
  };
  const skyImg = g.createImageData(w, h);
  const darkImg = g.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    skyImg.data[i * 4] = skyImg.data[i * 4 + 1] = skyImg.data[i * 4 + 2] = 255;
    skyImg.data[i * 4 + 3] = sky[i] ? 255 : 0;
    const v = sky[i] ? 0 : 255 - lum[i];
    darkImg.data[i * 4] = darkImg.data[i * 4 + 1] = darkImg.data[i * 4 + 2] = v;
    darkImg.data[i * 4 + 3] = 255;
  }
  return {sky: up(skyImg, skyBlur), darkness: up(darkImg, darknessBlur), skyIsDark};
}

/**
 * CSS filters mapping luma `lo` to 0 and `lo + width` to 1 (brightness, then
 * contrast): a matte edge `width` soft that moves as `lo` changes. Set it as
 * `ctx.filter` while drawing the darkness map.
 */
export function thresholdWindow(lo: number, width: number): string {
  const k = (2 * lo) / width + 1;
  const a = 1 / (width * k);
  return `brightness(${a.toFixed(5)}) contrast(${k.toFixed(5)})`;
}

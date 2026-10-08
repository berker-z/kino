import {hash, noise2} from "../utils/noise";

// Plates are the source images a composition cuts between. These helpers
// turn an ordinary photo into something that sits right under a print or
// screen treatment, and give it a printed edge.

export type Plate = HTMLCanvasElement & {
  /** Mean brightness 0-1 of a centred box, for picking ink that reads on top. */
  meanIn: (width: number, height: number, centreY?: number) => number;
};

export type PreparePlateOptions = {
  width: number;
  height: number;
  /** Percentiles stretched to black and white. */
  low?: number;
  high?: number;
  /** 0-1 blend toward a smoothstep S-curve after the stretch. */
  contrast?: number;
};

/**
 * Grayscale, cover-fit, stretch the low/high percentiles to black/white, then
 * an S-curve. Print looks (cyanotype, blueprint) want plates that are mostly
 * near-black or near-paper with little in between; daylight photos are the
 * opposite, so this does most of the work of making them belong.
 */
export function preparePlate(image: CanvasImageSource & {width: number; height: number}, options: PreparePlateOptions): Plate {
  const {width: w, height: h, low = 0.02, high = 0.98, contrast = 0.6} = options;
  const c = document.createElement("canvas") as Plate;
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", {willReadFrequently: true})!;
  const iw = (image as HTMLImageElement).naturalWidth || image.width;
  const ih = (image as HTMLImageElement).naturalHeight || image.height;
  const s = Math.max(w / iw, h / ih);
  g.drawImage(image, (w - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s);

  const data = g.getImageData(0, 0, w, h);
  const px = data.data;
  const hist = new Uint32Array(256);
  const lum = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) {
    const l = Math.round(0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]);
    lum[j] = l;
    hist[l]++;
  }
  const percentile = (p: number) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += hist[v];
      if (acc >= p * w * h) return v;
    }
    return 255;
  };
  const lo = percentile(low);
  const hi = Math.max(lo + 1, percentile(high));
  const curve = new Uint8Array(256);
  for (let v = 0; v < 256; v++) {
    const x = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    curve[v] = Math.round(255 * ((1 - contrast) * x + contrast * x * x * (3 - 2 * x)));
  }
  for (let i = 0, j = 0; i < px.length; i += 4, j++) px[i] = px[i + 1] = px[i + 2] = curve[lum[j]];
  g.putImageData(data, 0, 0);

  c.meanIn = (bw, bh, cy = h / 2) => {
    const d = g.getImageData(Math.round((w - bw) / 2), Math.round(cy - bh / 2), Math.round(bw), Math.round(bh)).data;
    let sum = 0;
    for (let i = 0; i < d.length; i += 16) sum += d[i];
    return sum / (d.length / 16) / 255;
  };
  return c;
}

/**
 * A sun-print: the source inside a ragged, brushed emulsion edge, the way
 * cyanotype is painted onto paper by hand, with bristle streaks running out
 * along each side. Seeded and drawn once, so the edge never boils (a moving
 * edge reads as jitter). Transparent outside the print.
 */
export function sunprint(source: CanvasImageSource & {width: number; height: number}, width: number, height: number, seed = 1): HTMLCanvasElement {
  const w = width;
  const h = height;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const m = Math.round(Math.min(w, h) * 0.045);
  const edge = (u: number, side: number) =>
    (noise2(u * 9, seed + side * 7.1, 3) - 0.5) * m * 1.3 + (noise2(u * 55, seed + side, 5) - 0.5) * m * 0.45;

  g.beginPath();
  const N = 160;
  for (let i = 0; i <= N; i++) g.lineTo(m + (i / N) * (w - 2 * m), m + edge(i / N, 0));
  for (let i = 0; i <= N; i++) g.lineTo(w - m + edge(i / N, 1), m + (i / N) * (h - 2 * m));
  for (let i = N; i >= 0; i--) g.lineTo(m + (i / N) * (w - 2 * m), h - m + edge(i / N, 2));
  for (let i = N; i >= 0; i--) g.lineTo(m + edge(i / N, 3), m + (i / N) * (h - 2 * m));
  g.closePath();
  g.fillStyle = "#fff";
  g.fill();

  g.strokeStyle = "#fff";
  for (let k = 0; k < 220; k++) {
    const r = (n: number) => hash(seed, k, n);
    const side = k % 4;
    const u = r(1);
    const len = (0.02 + 0.12 * r(2)) * (side % 2 ? h : w);
    const off = (r(3) - 0.3) * m * 1.4;
    const wob = (r(6) - 0.5) * 4;
    g.globalAlpha = 0.35 + 0.6 * r(4);
    g.lineWidth = 1 + 3 * r(5);
    g.beginPath();
    if (side === 0) { g.moveTo(u * w, m - off); g.lineTo(u * w + len, m - off + wob); }
    if (side === 1) { g.moveTo(w - m + off, u * h); g.lineTo(w - m + off + wob, u * h + len); }
    if (side === 2) { g.moveTo(u * w, h - m + off); g.lineTo(u * w - len, h - m + off + wob); }
    if (side === 3) { g.moveTo(m - off, u * h); g.lineTo(m - off + wob, u * h - len); }
    g.stroke();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-in";
  const s = Math.max(w / source.width, h / source.height);
  g.drawImage(source, (w - source.width * s) / 2, (h - source.height * s) / 2, source.width * s, source.height * s);
  return c;
}

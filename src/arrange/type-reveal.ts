import {hash} from "../utils/noise";
import {clamp} from "../utils/timing";
import type {HtmlPlate, PartBox} from "../sources/html-plate";

// Type revealed as geometry, over type the browser has already set.
//
// Nothing here lays out text. The plate (htmlPlate) is laid out by CSS, with
// real kerning, ligatures and shaping; these functions only decide which
// pieces of that raster are visible at a moment, and where they're drawn.
//
// - fragments: a word's box cut into a seeded grid of slabs that appear one
//   by one, so letterforms assemble from pieces (the pacing of the Alien
//   titles, not their glyphs). Cut edges are whole plate pixels, so a full
//   set drawn at scale 1 and whole-pixel offsets is seamless. Drawn scaled
//   or at fractional offsets, neighbouring slabs antialias against each
//   other and hairline seams show; draw them into a layer at scale 1 and
//   move the layer instead.
// - lineRise: each measured line (htmlPlate's `data-lines`) slides up into
//   view behind its own box, one after another. A crop, never a fade.

export type Fragment = PartBox & {
  /** 0-1 progress at which this slab appears. */
  at: number;
};

export type FragmentOptions = {
  /** Number of vertical slabs across the box (before widths are jittered). */
  cols?: number;
  /** Horizontal cuts per slab, 0 or more. */
  rows?: number;
  seed?: number;
  /** 0-1 how unequal slab widths and cut heights are. */
  jitter?: number;
  /** Fraction of the reveal the last slab waits for; the rest is spread. 0-1. */
  spread?: number;
};

/**
 * A box cut into slabs with whole-pixel edges, each with an appearance time.
 * Pure: same box and options, same fragments.
 */
export function fragmentGrid(box: PartBox, {cols = 18, rows = 2, seed = 1, jitter = 0.6, spread = 0.9}: FragmentOptions = {}): Fragment[] {
  const x0 = Math.floor(box.x), y0 = Math.floor(box.y);
  const x1 = Math.ceil(box.x + box.w), y1 = Math.ceil(box.y + box.h);
  // Column edges: evenly spaced, nudged, rounded, kept strictly increasing.
  const xs = [x0];
  for (let i = 1; i < cols; i++) {
    const even = x0 + ((x1 - x0) * i) / cols;
    const nudge = (hash(i, seed, 1) - 0.5) * jitter * ((x1 - x0) / cols);
    xs.push(Math.max(xs[xs.length - 1] + 1, Math.round(even + nudge)));
  }
  xs.push(x1);
  const out: Fragment[] = [];
  for (let i = 0; i < xs.length - 1; i++) {
    const ys = [y0];
    for (let j = 1; j <= rows; j++) {
      const even = y0 + ((y1 - y0) * j) / (rows + 1);
      const nudge = (hash(i, j, seed + 7) - 0.5) * jitter * ((y1 - y0) / (rows + 1));
      ys.push(Math.max(ys[ys.length - 1] + 1, Math.round(even + nudge)));
    }
    ys.push(y1);
    for (let j = 0; j < ys.length - 1; j++) {
      out.push({x: xs[i], y: ys[j], w: xs[i + 1] - xs[i], h: ys[j + 1] - ys[j], at: 0});
    }
  }
  // Appearance order: a seeded shuffle, spaced evenly through the spread so
  // the pace is steady rather than clumped. The first slab lands one step
  // in, so progress 0 shows nothing; the last lands at `spread`.
  const order = out.map((_, k) => k).sort((a, b) => hash(a, seed, 3) - hash(b, seed, 3));
  order.forEach((k, n) => (out[k].at = ((n + 1) / out.length) * spread));
  return out;
}

/** Drops slabs with no ink in them (alpha and luma both ~0), so the pace isn't spent on empty space. */
export function inkedFragments(plate: HtmlPlate, frags: Fragment[], respace = true): Fragment[] {
  if (!frags.length) return frags;
  // One readback covering every slab, not one per slab.
  const x0 = Math.min(...frags.map((f) => f.x)), y0 = Math.min(...frags.map((f) => f.y));
  const x1 = Math.max(...frags.map((f) => f.x + f.w)), y1 = Math.max(...frags.map((f) => f.y + f.h));
  const bw = x1 - x0;
  const d = plate.canvas.getContext("2d")!.getImageData(x0, y0, bw, y1 - y0).data;
  const kept = frags.filter((f) => {
    for (let y = f.y - y0; y < f.y - y0 + f.h; y++) {
      for (let x = f.x - x0; x < f.x - x0 + f.w; x++) {
        const i = (y * bw + x) * 4;
        if (d[i + 3] > 24 && d[i] + d[i + 1] + d[i + 2] > 60) return true;
      }
    }
    return false;
  });
  if (!respace || !kept.length) return kept;
  const spread = Math.max(...frags.map((f) => f.at));
  const sorted = [...kept].sort((a, b) => a.at - b.at);
  return sorted.map((f, n) => ({...f, at: ((n + 1) / sorted.length) * spread}));
}

/**
 * Draws the slabs visible at progress p. (dx, dy) is where the box's
 * top-left lands; keep it whole pixels. `soft` > 0 lets each slab expose
 * over that much progress instead of cutting in.
 */
export function drawFragments(ctx: CanvasRenderingContext2D, plate: HtmlPlate, box: PartBox, frags: Fragment[], dx: number, dy: number, p: number, soft = 0): void {
  const ox = dx - Math.floor(box.x), oy = dy - Math.floor(box.y);
  ctx.save();
  for (const f of frags) {
    const a = soft > 0 ? clamp((p - f.at) / soft) : p >= f.at ? 1 : 0;
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.drawImage(plate.canvas, f.x, f.y, f.w, f.h, f.x + ox, f.y + oy, f.w, f.h);
  }
  ctx.restore();
}

export type LineRiseOptions = {
  /** Progress at which each next line starts, 0-1 of the whole reveal. */
  stagger?: number;
  /** How far below its box a line starts, in line heights. */
  depth?: number;
  ease?: (x: number) => number;
  /** Extra crop around each box in px, so descenders survive. */
  pad?: number;
};

/** Where each line is at progress p: 0 hidden below its box, 1 in place. Pure. */
export function lineProgress(count: number, p: number, stagger = 0.12): number[] {
  const each = count > 1 ? Math.max(0.05, 1 - stagger * (count - 1)) : 1;
  return Array.from({length: count}, (_, i) => clamp((p - i * stagger) / each));
}

/**
 * Lines entering from below behind their own boxes, top line first. Drawn
 * at the plate's own positions plus (dx, dy).
 */
export function lineRise(ctx: CanvasRenderingContext2D, plate: HtmlPlate, lines: PartBox[], dx: number, dy: number, p: number, options: LineRiseOptions = {}): void {
  const {stagger = 0.12, depth = 1.05, ease = (x: number) => 1 - Math.pow(1 - x, 3), pad = 6} = options;
  const prog = lineProgress(lines.length, p, stagger);
  // Each line's crop runs to the middle of the gap to its neighbours (or
  // `pad` past its box, whichever is less), so crops never overlap: an
  // antialiased pixel drawn twice would come out darker than the plate's.
  const top = (i: number) => (i > 0 && lines[i - 1].y + lines[i - 1].h <= lines[i].y ? Math.round((lines[i - 1].y + lines[i - 1].h + lines[i].y) / 2) : Math.floor(lines[i].y - pad));
  lines.forEach((b, i) => {
    const q = prog[i];
    if (q <= 0) return;
    const x = Math.floor(b.x - pad);
    const w = Math.ceil(b.w + 2 * pad);
    const y = Math.max(top(i), Math.floor(b.y - pad));
    const bottom = i < lines.length - 1 ? Math.min(top(i + 1), Math.ceil(b.y + b.h + pad)) : Math.ceil(b.y + b.h + pad);
    const h = bottom - y;
    const off = Math.round((1 - ease(q)) * b.h * depth);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + dx, y + dy, w, h);
    ctx.clip();
    ctx.drawImage(plate.canvas, x, y, w, h, x + dx, y + dy + off, w, h);
    ctx.restore();
  });
}

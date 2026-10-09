import type {CharBox, HtmlPlate} from "../sources/html-plate";
import {clamp} from "../utils/timing";

// Letters taken apart into the strokes they're drafted from, so a word can
// be built in construction order: stems, then bars, then curves.
//
// Nothing here knows any glyph. The browser sets the word (htmlPlate,
// `data-chars` for each letter's box); this reads the raster and sorts its
// ink by shape:
//
// - stem: a run of pixel columns inked for nearly the letter's full height
//   (the uprights of B, E, I, K, L).
// - bar: a horizontal run of ink that starts at a stem and reaches across a
//   good part of the letter (E's arms, L's foot, B's flat tops). Only
//   strokes attached to a stem count, so the top of an O isn't a bar.
// - curve: everything else (bowls, O, S, diagonals).
//
// Every inked pixel gets exactly one kind, so drawing all the pieces gives
// back the intact word, pixel for pixel. Structure is decided on a
// thresholded mask; the antialiased fringe follows the stroke it borders.

export type StrokeKind = "stem" | "bar" | "curve";

export type StrokePiece = {
  kind: StrokeKind;
  /** Index of the letter in the word, and the letter. */
  letter: number;
  char: string;
  /** Bounding box in plate px. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The piece alone, box-sized, everything else transparent. */
  canvas: HTMLCanvasElement;
};

export type LetterStrokes = {
  pieces: StrokePiece[];
  /** Construction lines in plate px: the stems' common top and bottom, and each stem's centre. */
  guides: {cap: number; baseline: number; stems: number[]};
};

export type StrokeOptions = {
  /** Fraction of the letter's ink height a column must be inked to be a stem. */
  stemFill?: number;
  /** Fraction of the letter's ink width a stroke from a stem must reach to be a bar. */
  barReach?: number;
};

const STEM = 1, BAR = 2, CURVE = 3;
const KINDS: StrokeKind[] = ["stem", "stem", "bar", "curve"];

/**
 * Sorts one letter's ink into stems, bars and curves. `alpha` is the
 * letter's box (w x h, 0-255). Returns a label per pixel (0 empty, 1 stem,
 * 2 bar, 3 curve) and the stem column runs. Pure, so it's unit-tested.
 */
export function classifyStrokes(alpha: Uint8Array, w: number, h: number, {stemFill = 0.9, barReach = 0.7}: StrokeOptions = {}): {labels: Uint8Array; stems: [number, number][]; top: number; bottom: number} {
  const ink = (x: number, y: number) => alpha[y * w + x] >= 128;
  let top = h, bottom = -1, left = w, right = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink(x, y)) { top = Math.min(top, y); bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x); }
  const labels = new Uint8Array(w * h);
  if (bottom < 0) return {labels, stems: [], top: 0, bottom: 0};
  const inkH = bottom - top + 1, inkW = right - left + 1;

  // Stems: runs of nearly-full columns, at least 2 px wide.
  const stems: [number, number][] = [];
  let run = -1;
  for (let x = 0; x <= w; x++) {
    let n = 0;
    if (x < w) for (let y = top; y <= bottom; y++) n += ink(x, y) ? 1 : 0;
    const full = x < w && n >= stemFill * inkH;
    if (full && run < 0) run = x;
    if (!full && run >= 0) { if (x - run >= 2) stems.push([run, x - 1]); run = -1; }
  }
  const stemCol = new Uint8Array(w);
  // One column of fringe either side goes with the stem.
  for (const [a, b] of stems) for (let x = Math.max(0, a - 1); x <= Math.min(w - 1, b + 1); x++) stemCol[x] = 1;

  // Bars: per row, the unbroken run of ink through a stem (both sides, so a
  // T's crossbar counts as one stroke). If it reaches far enough, the parts
  // of it outside the stem are bar.
  // Rows of one bar are then trimmed to the shortest of them, so a bar is a
  // clean rectangle and wherever it bends into a bowl (B) goes to the curve.
  const bar = new Uint8Array(w * h);
  for (const [a, b] of stems) {
    const runs: ([number, number, number, number] | null)[] = [];
    for (let y = 0; y < h; y++) {
      if (y < top || y > bottom) { runs.push(null); continue; }
      const side = (dir: 1 | -1): [number, number] => {
        let x = dir > 0 ? b + 1 : a - 1;
        while (x >= 0 && x < w && stemCol[x]) x += dir;
        const start = x;
        while (x >= 0 && x < w && ink(x, y)) x += dir;
        return [start, x];
      };
      const [rs, re] = side(1), [ls, le] = side(-1);
      runs.push(re - le - 1 >= barReach * inkW ? [rs, re, ls, le] : null);
    }
    for (let y = 0; y < h; ) {
      if (!runs[y]) { y++; continue; }
      let y1 = y;
      while (y1 + 1 < h && runs[y1 + 1]) y1++;
      const group = runs.slice(y, y1 + 1) as [number, number, number, number][];
      const re = Math.min(...group.map((r) => r[1]));
      const le = Math.max(...group.map((r) => r[3]));
      for (let yy = y; yy <= y1; yy++) {
        const [rs, , ls] = runs[yy]!;
        // One pixel past each end: the antialiased fringe goes with the bar.
        for (let k = rs; k <= Math.min(w - 1, re); k++) if (alpha[yy * w + k]) bar[yy * w + k] = 1;
        for (let k = ls; k >= Math.max(0, le); k--) if (alpha[yy * w + k]) bar[yy * w + k] = 1;
      }
      y = y1 + 1;
    }
  }
  // A row of fringe above and below each bar run goes with it.
  const barGrown = bar.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (bar[y * w + x]) for (const dy of [-1, 1]) { const yy = y + dy; if (yy >= 0 && yy < h && !stemCol[x]) barGrown[yy * w + x] = 1; }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!alpha[i]) continue;
      labels[i] = stemCol[x] && y >= top - 1 && y <= bottom + 1 ? STEM : barGrown[i] ? BAR : CURVE;
    }
  }
  return {labels, stems, top, bottom};
}

// Connected components of one label (8-connected), as pixel index lists.
function components(labels: Uint8Array, w: number, h: number, label: number): number[][] {
  const seen = new Uint8Array(w * h);
  const out: number[][] = [];
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] !== label || seen[i]) continue;
    const comp: number[] = [];
    const stack = [i];
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop()!;
      comp.push(j);
      const x = j % w, y = (j / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (!seen[k] && labels[k] === label) { seen[k] = 1; stack.push(k); }
      }
    }
    out.push(comp);
  }
  return out;
}

/** A word's letters as stroke pieces, read from the plate raster. */
export function letterStrokes(plate: HtmlPlate, chars: CharBox[], options: StrokeOptions = {}): LetterStrokes {
  const g = plate.canvas.getContext("2d")!;
  // Whole-pixel letter boxes; a pixel belongs to the first box that claims it.
  const boxes = chars.map((c) => ({x: Math.floor(c.x), y: Math.floor(c.y), w: Math.ceil(c.x + c.w) - Math.floor(c.x), h: Math.ceil(c.y + c.h) - Math.floor(c.y), char: c.char}));
  if (!boxes.length) return {pieces: [], guides: {cap: 0, baseline: 0, stems: []}};
  const X0 = Math.min(...boxes.map((b) => b.x)), Y0 = Math.min(...boxes.map((b) => b.y));
  const X1 = Math.max(...boxes.map((b) => b.x + b.w)), Y1 = Math.max(...boxes.map((b) => b.y + b.h));
  const BW = X1 - X0;
  const img = g.getImageData(X0, Y0, BW, Y1 - Y0);
  const claimed = new Uint8Array(BW * (Y1 - Y0));

  const pieces: StrokePiece[] = [];
  const stemTops: number[] = [], stemBottoms: number[] = [], stemCentres: number[] = [];
  boxes.forEach((b, letter) => {
    const alpha = new Uint8Array(b.w * b.h);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) {
      const gi = (b.y - Y0 + y) * BW + (b.x - X0 + x);
      if (claimed[gi]) continue;
      claimed[gi] = 1;
      alpha[y * b.w + x] = img.data[gi * 4 + 3];
    }
    const {labels, stems, top, bottom} = classifyStrokes(alpha, b.w, b.h, options);
    for (const [a, c] of stems) { stemTops.push(b.y + top); stemBottoms.push(b.y + bottom); stemCentres.push(b.x + (a + c + 1) / 2); }
    for (const label of [STEM, BAR, CURVE]) {
      for (const comp of components(labels, b.w, b.h, label)) {
        let x0 = b.w, y0 = b.h, x1 = 0, y1 = 0;
        for (const j of comp) { const x = j % b.w, y = (j / b.w) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
        const pw = x1 - x0 + 1, ph = y1 - y0 + 1;
        const canvas = document.createElement("canvas");
        canvas.width = pw;
        canvas.height = ph;
        const pg = canvas.getContext("2d")!;
        const out = pg.createImageData(pw, ph);
        for (const j of comp) {
          const x = j % b.w, y = (j / b.w) | 0;
          const src = ((b.y - Y0 + y) * BW + (b.x - X0 + x)) * 4;
          const dst = ((y - y0) * pw + (x - x0)) * 4;
          for (let c = 0; c < 4; c++) out.data[dst + c] = img.data[src + c];
        }
        pg.putImageData(out, 0, 0);
        pieces.push({kind: KINDS[label], letter, char: b.char, x: b.x + x0, y: b.y + y0, w: pw, h: ph, canvas});
      }
    }
  });
  const cap = stemTops.length ? Math.min(...stemTops) : Y0;
  const baseline = stemBottoms.length ? Math.max(...stemBottoms) + 1 : Y1;
  return {pieces, guides: {cap, baseline, stems: stemCentres}};
}

export type WipeDirection = "down" | "up" | "right" | "left";

/** Draws a piece revealed by a hard wipe at progress p, at its plate position plus (dx, dy). Whole pixels only. */
export function drawStroke(ctx: CanvasRenderingContext2D, piece: StrokePiece, dx: number, dy: number, p: number, dir: WipeDirection = "down"): void {
  const q = clamp(p);
  if (q <= 0) return;
  const {w, h} = piece;
  const x = piece.x + dx, y = piece.y + dy;
  if (dir === "down") { const n = Math.ceil(h * q); ctx.drawImage(piece.canvas, 0, 0, w, n, x, y, w, n); }
  else if (dir === "up") { const n = Math.ceil(h * q); ctx.drawImage(piece.canvas, 0, h - n, w, n, x, y + h - n, w, n); }
  else if (dir === "right") { const n = Math.ceil(w * q); ctx.drawImage(piece.canvas, 0, 0, n, h, x, y, n, h); }
  else { const n = Math.ceil(w * q); ctx.drawImage(piece.canvas, w - n, 0, n, h, x + w - n, y, n, h); }
}

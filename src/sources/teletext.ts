// Teletext: a grid of character cells in eight colours, characters as chunky
// pixels, pictures as 2 x 3 block mosaics. From the teletext piece.
//
// Build a page with blankPage + text/fill/mosaic, then drawPage paints it.
// Pages are plain data, rebuilt every frame from time, so they stay seekable.
// Paint into a canvas and show it through screenPass with colorMode on.

export const teletextColors = {
  black: "#000000",
  red: "#FF0000",
  green: "#00FF00",
  yellow: "#FFFF00",
  blue: "#0000FF",
  magenta: "#FF00FF",
  cyan: "#00FFFF",
  white: "#FFFFFF",
} as const;

export type Cell = {ch: string; fg: string; bg: string; mos: number; dh: 0 | 1 | 2};
export type Page = Cell[][];

export type TeletextGrid = {
  cols?: number;
  rows?: number;
  /** Cell size in px. 64 x 56 fills 2560 x 1440 like a widescreen set stretching 40 x 25. */
  cellWidth?: number;
  cellHeight?: number;
  /** Top margin in px. */
  top?: number;
  /** Font the glyph atlas is made from; any bold mono works. */
  font?: string;
};

/**
 * A teletext renderer for one grid size. Glyphs are made by rendering a
 * real font at 8 x 14 px and thresholding it, which gives the chunky
 * verticals and thin horizontals of the SAA5050 without shipping a pixel font.
 */
export function teletext({cols = 40, rows = 25, cellWidth = 64, cellHeight = 56, top = 20, font = '700 13px "JetBrains Mono"'}: TeletextGrid = {}) {
  const glyphs = new Map<string, [number, number, number][]>();
  function glyph(ch: string) {
    const hit = glyphs.get(ch);
    if (hit) return hit;
    const c = document.createElement("canvas");
    c.width = 8;
    c.height = 14;
    const g = c.getContext("2d", {willReadFrequently: true})!;
    g.font = font;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    g.fillStyle = "#fff";
    g.fillText(ch, 4, 11);
    const d = g.getImageData(0, 0, 8, 14).data;
    // Runs of lit pixels per row, so drawing is a few rects, not 112.
    const runs: [number, number, number][] = [];
    for (let y = 0; y < 14; y++) {
      let start = -1;
      for (let x = 0; x <= 8; x++) {
        const on = x < 8 && d[(y * 8 + x) * 4 + 3] > 105;
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          runs.push([start, y, x - start]);
          start = -1;
        }
      }
    }
    glyphs.set(ch, runs);
    return runs;
  }

  const blankPage = (): Page =>
    Array.from({length: rows}, () => Array.from({length: cols}, () => ({ch: " ", fg: teletextColors.white, bg: teletextColors.black, mos: -1, dh: 0 as const})));

  /** Text at (x, y); double height spans this row and the next. */
  function text(pg: Page, x: number, y: number, str: string, fg: string = teletextColors.white, bg: string | null = null, dh = false): void {
    [...str].forEach((ch, i) => {
      if (x + i >= cols) return;
      const cell = pg[y][x + i];
      Object.assign(cell, {ch, fg, mos: -1, dh: dh ? 1 : 0});
      if (bg) cell.bg = bg;
      if (dh && y + 1 < rows) Object.assign(pg[y + 1][x + i], {ch: " ", mos: -1, dh: 2, bg: bg ?? pg[y + 1][x + i].bg});
    });
  }

  function fill(pg: Page, x: number, y: number, w: number, h: number, bg: string): void {
    for (let r = y; r < y + h; r++) for (let c = x; c < x + w; c++) if (pg[r]?.[c]) pg[r][c].bg = bg;
  }

  /** Mosaic from a bitmap of 2 x 3 sixels per cell; colour per cell from the cell's mean. */
  function mosaic(pg: Page, x: number, y: number, w: number, h: number, bits: (sx: number, sy: number) => number, colourOf: (mean: number) => string): void {
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        let m = 0;
        let sum = 0;
        for (let k = 0; k < 6; k++) {
          const v = bits(c * 2 + (k % 2), r * 3 + Math.floor(k / 2));
          sum += v;
          if (v > 0.5) m |= 1 << k;
        }
        const cell = pg[y + r]?.[x + c];
        if (!cell) continue;
        Object.assign(cell, {mos: m, fg: colourOf(sum / 6), ch: " ", dh: 0});
      }
    }
  }

  /** Paint the first `rowsShown` rows. Backgrounds go first: double height spills down. */
  function drawPage(ctx: CanvasRenderingContext2D, pg: Page, rowsShown = rows): void {
    const shown = Math.min(rows, rowsShown);
    const sx = cellWidth / 8;
    for (let r = 0; r < shown; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = pg[r][c].bg;
        ctx.fillRect(c * cellWidth, top + r * cellHeight, cellWidth, cellHeight);
      }
    }
    const thirds = [Math.round(cellHeight / 3), cellHeight - 2 * Math.round(cellHeight / 3), Math.round(cellHeight / 3)];
    for (let r = 0; r < shown; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = pg[r][c];
        const x = c * cellWidth;
        const y = top + r * cellHeight;
        ctx.fillStyle = cell.fg;
        if (cell.mos >= 0) {
          let yy = y;
          for (let k = 0; k < 3; k++) {
            if (cell.mos & (1 << (k * 2))) ctx.fillRect(x, yy, cellWidth / 2, thirds[k]);
            if (cell.mos & (1 << (k * 2 + 1))) ctx.fillRect(x + cellWidth / 2, yy, cellWidth / 2, thirds[k]);
            yy += thirds[k];
          }
        } else if (cell.dh === 1) {
          const sy = (cellHeight * 2) / 14;
          for (const [gx, gy, len] of glyph(cell.ch)) ctx.fillRect(x + gx * sx, y + gy * sy, len * sx, sy);
        } else if (cell.dh === 0 && cell.ch !== " ") {
          const sy = cellHeight / 14;
          for (const [gx, gy, len] of glyph(cell.ch)) ctx.fillRect(x + gx * sx, y + gy * sy, len * sx, sy);
        }
      }
    }
  }

  return {cols, rows, cellWidth, cellHeight, top, colors: teletextColors, blankPage, text, fill, mosaic, drawPage};
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * A sixel bitmap sampled from any image, squeezed to sw x sh sixels and
 * panned by (ox, oy) sixels, ordered-dithered so flat bright areas keep
 * their tone instead of filling solid.
 */
export function sixels(source: CanvasImageSource & {width: number; height: number}, sw: number, sh: number, ox = 0, oy = 0, zoom = 1) {
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const g = c.getContext("2d", {willReadFrequently: true})!;
  g.drawImage(source, (-ox * (source.width / sw)) / zoom, (-oy * (source.height / sh)) / zoom, source.width / zoom, source.height / zoom, 0, 0, sw, sh);
  const d = g.getImageData(0, 0, sw, sh).data;
  return (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= sw || y >= sh) return 0;
    const v = d[(y * sw + x) * 4] / 255;
    return v > (BAYER4[(y % 4) * 4 + (x % 4)] + 0.5) / 16 ? 1 : 0;
  };
}

/** A sixel bitmap of a word, for mosaic logos (the KINO masthead). */
export function sixelText(text: string, sw: number, sh: number, font = '400 24px "Anton"', tracking = 3) {
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const g = c.getContext("2d", {willReadFrequently: true})!;
  g.font = font;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#fff";
  g.letterSpacing = `${tracking}px`;
  g.fillText(text, 1, sh - 1);
  const d = g.getImageData(0, 0, sw, sh).data;
  return (x: number, y: number) => (x < 0 || y < 0 || x >= sw || y >= sh ? 0 : d[(y * sw + x) * 4 + 3] / 255);
}

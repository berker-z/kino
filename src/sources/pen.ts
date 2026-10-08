import {wipeText} from "./type";

// The pen kit: shapes that draw themselves. Every helper strokes the first p
// (0-1) of its shape with the current stroke style, so a drawing appears in
// the order a person would make it. From the blueprint piece, where it
// carries the whole film: anything drawn in drafting order reads as
// intentional, even simple geometry.

const clamp = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);

export type Point = readonly [number, number];

/** The first p of a polyline (closed back to its start if `close`). */
export function polyP(ctx: CanvasRenderingContext2D, pts: readonly Point[], p: number, close = false): void {
  if (p <= 0) return;
  const all = close ? [...pts, pts[0]] : pts;
  let total = 0;
  for (let i = 1; i < all.length; i++) total += Math.hypot(all[i][0] - all[i - 1][0], all[i][1] - all[i - 1][1]);
  let left = total * clamp(p);
  ctx.beginPath();
  ctx.moveTo(all[0][0], all[0][1]);
  for (let i = 1; i < all.length && left > 0; i++) {
    const [ax, ay] = all[i - 1];
    const [bx, by] = all[i];
    const seg = Math.hypot(bx - ax, by - ay);
    const f = Math.min(1, left / seg);
    ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
    left -= seg;
  }
  ctx.stroke();
}

export const lineP = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, p: number) =>
  polyP(ctx, [[x1, y1], [x2, y2]], p);

export const rectP = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, p: number) =>
  polyP(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], p, true);

export function arcP(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a0: number, a1: number, p: number): void {
  if (p <= 0) return;
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a0 + (a1 - a0) * clamp(p), a1 < a0);
  ctx.stroke();
}

export function ellipseP(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, p: number): void {
  if (p <= 0) return;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2 * clamp(p));
  ctx.stroke();
}

/** A filled drafting arrowhead pointing along `angle`, in the stroke colour. */
export function arrowHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size = 26): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-size, -size * 0.32);
  ctx.lineTo(-size, size * 0.32);
  ctx.closePath();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.fill();
  ctx.restore();
}

/** Section hatching: 45° lines inside a path, appearing left to right. angle 1 or -1. */
export function hatch(ctx: CanvasRenderingContext2D, path: Path2D, box: readonly [number, number, number, number], p: number, spacing = 22, angle = 1): void {
  if (p <= 0) return;
  const [x, y, w, h] = box;
  ctx.save();
  ctx.clip(path);
  ctx.beginPath();
  const n = Math.ceil((w + h) / spacing);
  for (let i = 0; i < n * clamp(p); i++) {
    const o = i * spacing;
    if (angle > 0) {
      ctx.moveTo(x + o, y);
      ctx.lineTo(x + o - h, y + h);
    } else {
      ctx.moveTo(x + w - o, y);
      ctx.lineTo(x + w - o + h, y + h);
    }
  }
  ctx.stroke();
  ctx.restore();
}

export type PenLabelOptions = {size?: number; align?: "left" | "center" | "right"; ink?: string; p?: number; weight?: number; family?: string};

/** Drafting lettering, wiped on: mono by default. */
export function penLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: PenLabelOptions = {}): void {
  const {size = 34, align = "left", ink = "#f2f2f2", p = 1, weight = 500, family = "IBM Plex Mono"} = options;
  if (p <= 0) return;
  wipeText(ctx, text, {x, y, size, progress: p, ink, align, weight, family});
}

/** A dimension line between two points: extension ticks, arrows, label. */
export function dim(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, text: string, p: number, ink = "#f2f2f2"): void {
  if (p <= 0) return;
  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = ink;
  const a = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(a) * 40;
  const ny = Math.cos(a) * 40;
  lineP(ctx, x1 - nx, y1 - ny, x1 + nx * 0.6, y1 + ny * 0.6, p * 2);
  lineP(ctx, x2 - nx, y2 - ny, x2 + nx * 0.6, y2 + ny * 0.6, p * 2);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const e = easeOut(p);
  lineP(ctx, mx, my, mx + (x1 - mx) * e, my + (y1 - my) * e, 1);
  lineP(ctx, mx, my, mx + (x2 - mx) * e, my + (y2 - my) * e, 1);
  if (p >= 1) {
    arrowHead(ctx, x1, y1, a + Math.PI);
    arrowHead(ctx, x2, y2, a);
  }
  ctx.translate(mx, my);
  ctx.rotate(Math.abs(a) > Math.PI / 2 ? a + Math.PI : a);
  penLabel(ctx, text, 0, -22, {size: 34, align: "center", ink, p: clamp(p * 1.5 - 0.5)});
  ctx.restore();
}

/** A numbered callout: leader line from a part to a circled number. */
export function balloon(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, n: number, p: number, ink = "#f2f2f2"): void {
  if (p <= 0) return;
  ctx.save();
  ctx.lineWidth = 2.5;
  lineP(ctx, x0, y0, x1 - 36, y1, p * 1.6);
  arcP(ctx, x1, y1, 36, Math.PI, Math.PI * 3, clamp(p * 1.6 - 0.6));
  penLabel(ctx, String(n), x1, y1 + 13, {size: 36, align: "center", ink, p: clamp(p * 2 - 1)});
  ctx.beginPath();
  ctx.arc(x0, y0, 6, 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.restore();
}

import {hash} from "../utils/noise";

// A network grown like a plant: a seeded branching tree whose generations
// appear one at a time, joined by dotted lines, nodes glowing. From the
// NousCon "constellation tree". Drive `generations` from the beat grid
// (one per beat read best; one per eighth was too fast).

export type NetworkTreeOptions = {
  /** Root position, px. */
  x: number;
  y: number;
  /** Direction of growth, radians (−π/2 is up). */
  angle?: number;
  /** First branch length, px; later ones shrink. */
  length?: number;
  /** Generations below the root. 6 gives ~100 nodes. */
  depth?: number;
  seed?: number;
};

export type NetworkNode = {x: number; y: number; depth: number; parent: number; r: number};

export function networkTree({x, y, angle = -Math.PI / 2, length = 230, depth = 6, seed = 1}: NetworkTreeOptions) {
  const nodes: NetworkNode[] = [];
  (function grow(px: number, py: number, a0: number, len: number, d: number, parent: number) {
    const id = nodes.length;
    nodes.push({x: px, y: py, depth: d, parent, r: 7 + 9 * hash(seed, id, 1)});
    if (d >= depth) return;
    const kids = d < 2 ? 3 : 2 + (hash(seed, id, 2) > 0.6 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const a = a0 + (k - (kids - 1) / 2) * (0.55 - d * 0.04) + (hash(seed, id, 10 + k) - 0.5) * 0.3;
      const l = len * (0.72 + 0.2 * hash(seed, id, 20 + k));
      grow(px + Math.cos(a) * l, py + Math.sin(a) * l, a, l, d + 1, id);
    }
  })(x, y, angle, length, 0, -1);

  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const easeOut = (v: number) => 1 - Math.pow(1 - clamp(v), 3);

  /**
   * Paint with `generations` grown (fractional = mid-growth). After the last
   * generation the nodes bloom a little; keep the glow small or the tree
   * turns into one white blob.
   */
  function paint(ctx: CanvasRenderingContext2D, generations: number, {ink = "255,255,255", dash = [3, 11], lineWidth = 3} = {}): void {
    ctx.save();
    ctx.setLineDash(dash);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = `rgba(${ink},0.75)`;
    for (const n of nodes) {
      if (n.parent < 0) continue;
      const g = clamp(generations - n.depth + 1);
      if (g <= 0) continue;
      const p = nodes[n.parent];
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + (n.x - p.x) * easeOut(g), p.y + (n.y - p.y) * easeOut(g));
      ctx.stroke();
    }
    ctx.restore();
    for (const n of nodes) {
      const g = clamp(generations - n.depth);
      if (g <= 0) continue;
      const bloom = clamp((generations - (depth + 0.5) - n.depth * 0.15) / 2);
      const r = n.r * easeOut(g) * (1 + 0.5 * bloom);
      const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4);
      glow.addColorStop(0, `rgba(${ink},0.95)`);
      glow.addColorStop(0.22, `rgba(${ink},0.35)`);
      glow.addColorStop(0.5, `rgba(${ink},0.06)`);
      glow.addColorStop(1, `rgba(${ink},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {nodes, paint};
}

import {hash, noise2} from "../utils/noise";

// Grayscale painters for ditherCanvas: draw in white on black, brightness =
// ink density after dithering. Every painter is a pure function of its
// arguments; pass time in, never read a clock.

type Ctx = CanvasRenderingContext2D;

/** Lit sphere with optional rotating latitude/longitude wireframe. */
export function sphere(
  ctx: Ctx,
  {x, y, radius, light = -0.6, rotation = 0, wire = 0.5, brightness = 1}: {
    x: number;
    y: number;
    radius: number;
    /** Light direction, radians around the sphere. */
    light?: number;
    rotation?: number;
    /** 0 hides the wireframe. */
    wire?: number;
    brightness?: number;
  },
): void {
  const lx = x + Math.cos(light) * radius * 0.45;
  const ly = y + Math.sin(light) * radius * 0.45;
  const g = ctx.createRadialGradient(lx, ly, radius * 0.05, x, y, radius);
  g.addColorStop(0, `rgba(255,255,255,${brightness})`);
  g.addColorStop(0.55, `rgba(150,150,150,${brightness})`);
  g.addColorStop(1, "rgba(20,20,20,1)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (wire <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.strokeStyle = `rgba(255,255,255,${wire})`;
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const lat = (i / 8) * Math.PI - Math.PI / 2;
    ctx.beginPath();
    ctx.ellipse(x, y + Math.sin(lat) * radius, Math.cos(lat) * radius, Math.cos(lat) * radius * 0.18, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const lon = ((i / 10) * Math.PI + rotation) % Math.PI;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.abs(Math.cos(lon)) * radius, radius, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Radiating rays from a point. */
export function starburst(
  ctx: Ctx,
  {x, y, rays, inner, outer, rotation = 0, brightness = 1, seed = 1}: {
    x: number;
    y: number;
    rays: number;
    inner: number;
    outer: number;
    rotation?: number;
    brightness?: number;
    seed?: number;
  },
): void {
  ctx.lineCap = "butt";
  for (let i = 0; i < rays; i++) {
    const angle = (i / rays) * Math.PI * 2 + rotation;
    const length = outer * (0.55 + 0.45 * hash(i, seed));
    ctx.strokeStyle = `rgba(255,255,255,${brightness * (0.35 + 0.65 * hash(i, seed, 7))})`;
    ctx.lineWidth = 1 + (hash(i, seed, 3) > 0.85 ? 1 : 0);
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();
  }
}

/** Fly-over heightfield with a sliced sun on the horizon. */
export function terrain(
  ctx: Ctx,
  {width, height, travel, horizon = 0.42, sun = 1, roughness = 1, seed = 3}: {
    width: number;
    height: number;
    /** Distance flown; advance it with time. */
    travel: number;
    horizon?: number;
    sun?: number;
    roughness?: number;
    seed?: number;
  },
): void {
  const hy = height * horizon;
  if (sun > 0) {
    const r = height * 0.26;
    const g = ctx.createLinearGradient(0, hy - r, 0, hy);
    g.addColorStop(0, `rgba(255,255,255,${sun})`);
    g.addColorStop(1, `rgba(90,90,90,${sun})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(width / 2, hy, r, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#000";
    for (let i = 0; i < 6; i++) ctx.fillRect(0, hy - r * 0.08 - i * i * 2.2, width, 1 + i * 0.6);
  }

  const rows = 34;
  const phase = travel % 1;
  // Back to front so nearer rows occlude farther ones.
  for (let i = rows; i >= 0; i--) {
    const z = i + 1 - phase;
    const depth = 1 / z;
    const rowY = hy + (height - hy) * depth * 1.1;
    const zWorld = Math.floor(travel) + i;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let s = 0; s <= 64; s++) {
      const u = s / 64;
      const xWorld = (u - 0.5) * 24;
      const valley = Math.min(1, Math.abs(xWorld) / 6);
      const elevation = noise2(xWorld * 0.35, zWorld * 0.35, seed) * valley * valley * roughness;
      ctx.lineTo(u * width, rowY - elevation * height * 0.55 * depth);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, 0.25 + depth * 2.2)})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** Polygonal tunnel rushing toward the viewer. */
export function tunnel(
  ctx: Ctx,
  {width, height, travel, sides = 6, twist = 0, rings = 22, brightness = 1}: {
    width: number;
    height: number;
    travel: number;
    sides?: number;
    twist?: number;
    rings?: number;
    brightness?: number;
  },
): void {
  const cx = width / 2;
  const cy = height / 2;
  const phase = travel % 1;
  for (let i = rings; i >= 0; i--) {
    const z = i + 1 - phase;
    const scale = (height * 1.6) / z;
    const alpha = Math.min(1, 1.6 / z) * brightness;
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = Math.max(1, 3 / z);
    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const a = (s / sides) * Math.PI * 2 + twist * (Math.floor(travel) + i) * 0.08;
      const px = cx + Math.cos(a) * scale;
      const py = cy + Math.sin(a) * scale * 0.82;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
}

/** Seeded star points drifting with `travel`. */
export function starfield(
  ctx: Ctx,
  {width, height, count, travel = 0, brightness = 1, seed = 9}: {
    width: number;
    height: number;
    count: number;
    travel?: number;
    brightness?: number;
    seed?: number;
  },
): void {
  for (let i = 0; i < count; i++) {
    const x = (hash(i, seed) * width + travel * (0.3 + hash(i, seed, 1)) * 40) % width;
    const y = hash(i, seed, 2) * height;
    const b = brightness * (0.3 + 0.7 * hash(i, seed, 3));
    ctx.fillStyle = `rgba(255,255,255,${b})`;
    ctx.fillRect(x | 0, y | 0, hash(i, seed, 4) > 0.9 ? 2 : 1, 1);
  }
}

/** Display text painted into the dither field. */
export function displayText(
  ctx: Ctx,
  text: string,
  {x, y, size, family, weight = 700, align = "center", brightness = 1, tracking = 0}: {
    x: number;
    y: number;
    size: number;
    family: string;
    weight?: number;
    align?: CanvasTextAlign;
    brightness?: number;
    /** em */
    tracking?: number;
  },
): void {
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = `${tracking * size}px`;
  ctx.fillStyle = `rgba(255,255,255,${brightness})`;
  ctx.fillText(text, x, y);
}

/**
 * Stacked spectrum lines, the classic ridgeline plot. rows[0] is the front
 * (now); older rows sit higher up the frame and are occluded by newer ones.
 *
 * Each row is band energies 0–1 laid out left → right (or mirrored from the
 * center) across [left, right] of the frame, weighted by a window so the
 * middle of every line carries the signal and its ends lie flat. Rows stay
 * parallel unless `perspective` is raised. `roughness` adds a small organic
 * wobble keyed to rowKeys (pass each row's source frame so the wobble travels
 * with the data instead of shimmering). Lines are drawn at full ink so the
 * dither keeps them solid.
 */
export function ridgelines(
  ctx: Ctx,
  {
    width,
    height,
    rows,
    top = 0.24,
    bottom = 0.9,
    left = -0.04,
    right = 1.04,
    amplitude = 0.2,
    perspective = 0,
    scroll = 0,
    rowStep,
    fadeOldest = 0,
    smoothing = 2,
    mirror = true,
    focus = 1,
    roughness = 0,
    rowKeys,
    lineWidth = 1,
    ground = "#000",
  }: {
    width: number;
    height: number;
    rows: readonly (readonly number[])[];
    /** Fraction of height for the farthest row's baseline. */
    top?: number;
    /** Fraction of height for the front row's baseline. */
    bottom?: number;
    /** Horizontal extent of every row, fractions of width. */
    left?: number;
    right?: number;
    /** Peak lift of a full-energy band, fraction of height. */
    amplitude?: number;
    /** 0 = evenly spaced parallel rows; >0 bunches far rows together. */
    perspective?: number;
    /** 0–1 progress toward the next row slot: rows glide up by this fraction of a row and the front row grows in. Drive it from time for a continuous feed. */
    scroll?: number;
    /**
     * Pixel-locked spacing: rows sit exactly rowStep px apart, measured up
     * from round(bottom * height), and `top` is ignored. Pick rowStep as a
     * multiple of the scroll steps per row (e.g. 12 px with 6 frames/row =
     * 2 px/frame) so flat lines land on the same sub-pixel phase every frame
     * and don't shimmer while they move.
     */
    rowStep?: number;
    /**
     * Fade the oldest rows out over this many rows, by their scrolled
     * position, so lines dissolve as they leave instead of popping off.
     * Needs an antialiased (smooth) render to show partial ink cleanly.
     */
    fadeOldest?: number;
    /** Blur radius across bands, in bands. */
    smoothing?: number;
    /** Lowest band in the center, mirrored outwards. */
    mirror?: boolean;
    /** Fraction of the row (centered) that carries signal; the rest lies flat. */
    focus?: number;
    /** Organic wobble as a fraction of height, 0 disables. */
    roughness?: number;
    /** Stable id per row (e.g. its source frame), used to seed the wobble. */
    rowKeys?: readonly number[];
    lineWidth?: number;
    /** Fill under each row, hiding the rows behind it. Match the background. */
    ground?: string;
  },
): void {
  const count = rows.length;
  const x0 = left * width;
  const span = (right - left) * width;
  const steps = Math.max(120, Math.round(span / 2));
  const spacing = (k: number) => {
    if (count < 2) return 0;
    const f = k / (count - 1);
    if (perspective <= 0) return f;
    return (1 - 1 / (1 + k * perspective)) / (1 - 1 / (1 + (count - 1) * perspective));
  };

  for (let k = count - 1; k >= 0; k--) {
    const raw = rows[k];
    if (!raw || raw.length === 0) continue;
    const row = blurBands(raw, smoothing);
    const bands = row.length;
    const f = rowStep ? ((k + scroll) * rowStep) / (height * (bottom - top)) : spacing(k + scroll);
    const baseY = rowStep ? Math.round(bottom * height) - Math.round((k + scroll) * rowStep) : height * (bottom - (bottom - top) * f);
    const grow = k === 0 ? 1 - Math.pow(1 - scroll, 3) : 1; // the newest row rises out of flat
    const lift = height * amplitude * (1 - 0.2 * f) * grow;
    const key = rowKeys?.[k] ?? k;

    const curve = new Path2D();
    for (let s = 0; s <= steps; s++) {
      const p = s / steps; // 0..1 along the row
      const x = x0 + p * span;
      const c = (p - 0.5) / (focus / 2); // -1..1 inside the signal window
      const inside = Math.abs(c) <= 1;
      let y = baseY;
      if (inside) {
        const position = (mirror ? Math.abs(c) : (c + 1) / 2) * (bands - 1);
        const v = Math.max(0, catmullRom(row, position));
        const window = 0.5 + 0.5 * Math.cos(Math.PI * c); // Hann: 1 at center, 0 at edges
        y -= Math.pow(v, 1.5) * lift * window;
      }
      if (roughness > 0) y -= (noise2(p * 60, key * 0.37, 11) - 0.5) * roughness * height;
      if (s === 0) curve.moveTo(x, y);
      else curve.lineTo(x, y);
    }
    // Occlude older rows with the area under this one, then stroke only the
    // curve itself (no side or bottom edges).
    const body = new Path2D(curve);
    body.lineTo(x0 + span, height);
    body.lineTo(x0, height);
    body.closePath();
    ctx.fillStyle = ground;
    ctx.fill(body);
    // Distance (in rows) from the exit, measured on the scrolled position.
    const toExit = count - 1 - (k + scroll);
    const fade = fadeOldest > 0 ? Math.min(1, Math.max(0, toExit / fadeOldest)) : 1;
    if (fade <= 0) continue;
    const alpha = fade * fade * (3 - 2 * fade); // smoothstep: eases in and out of the fade
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.stroke(curve);
  }
}

function blurBands(row: readonly number[], radius: number): number[] {
  if (radius <= 0) return [...row];
  const out = new Array<number>(row.length);
  for (let i = 0; i < row.length; i++) {
    let sum = 0;
    let weight = 0;
    for (let j = -radius; j <= radius; j++) {
      const w = Math.exp(-(j * j) / (2 * (radius / 2) ** 2));
      const v = row[Math.min(row.length - 1, Math.max(0, i + j))];
      sum += v * w;
      weight += w;
    }
    out[i] = sum / weight;
  }
  return out;
}

function catmullRom(row: readonly number[], position: number): number {
  const i = Math.floor(position);
  const t = position - i;
  const at = (n: number) => row[Math.min(row.length - 1, Math.max(0, n))];
  const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

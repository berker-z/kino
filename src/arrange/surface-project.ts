import {webgl2, fullscreenProgram, linearTexture} from "../passes/gl";
import type {CanvasScene} from "./torn-wipe";

// Surface projection: a moving picture thrown by a projector onto a flat
// surface in a photographed room. The projected frame lands on a
// four-cornered patch of the surface (a plane seen in perspective), and its
// light adds to the light already on that surface:
//
//   out = surface + albedo · light            (linear light)
//   albedo = clamp(albedo plate · albedoGain, 0, 1)   (the surface itself if no plate)
//   light = intensity · colour · content(uv) · edge(uv) · hotspot(uv) · (1 - occlusion)
//
// so dark stone takes less of the picture than pale stone, the wall's
// texture shows through the image, and projected black is no light at all:
// it leaves the surface exactly as it was, never paints it black. The
// photo's own brightness stands in for albedo; that's an approximation (a
// wall in shadow looks dark too), and `albedoGain` is how it's scaled.
//
// Geometry: `quad` gives the projected frame's corners on screen, in px,
// clockwise from top-left. A homography maps each screen pixel back to the
// projector frame's uv; pixels outside the frame get no light. It's exact
// for a plane; walls with relief take it as a plane (their niches won't
// bend the picture). Non-planar surfaces need a UV or depth map and are
// out of scope. A quad that isn't a proper convex four-cornered shape
// throws instead of producing NaNs.
//
// Occlusion is the author's explicit matte, drawn in screen space (alpha =
// blocked), so it moves with the room if the room moves: a column standing
// in front of the wall stops the beam where the matte says.
//
// An arrangement: it composites geometry and light, no material. Put a
// pass after it if wanted.

export type Point = [number, number];
export type Quad = [Point, Point, Point, Point];
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export type SurfaceProjectOptions = {
  width: number;
  height: number;
  /** The room as lit before the projector, painted over black. */
  surface: CanvasScene;
  /**
   * The surface's reflectance, if it isn't the surface itself: e.g. the
   * room photographed in daylight while `surface` is the same room dimmed.
   * Dimming the room shouldn't darken the stone's paint. Same geometry.
   */
  albedo?: CanvasScene;
  /** The projector's frame, painted over black into a contentWidth x contentHeight canvas. */
  image: CanvasScene;
  contentWidth?: number;
  contentHeight?: number;
  /** Corners of the projected frame on screen: top-left, top-right, bottom-right, bottom-left. */
  quad: Quad | ((t: number) => Quad);
  /** Paints where the beam is blocked, as alpha on a transparent canvas, in screen px. */
  occlusion?: CanvasScene;
  /** Projector brightness (linear gain); a number or a function of t. */
  intensity?: number | ((t: number) => number);
  /** Scale from the surface's linear brightness to albedo (how much light it reflects). */
  albedoGain?: number;
  /** Lamp colour. */
  color?: string;
  /** Feather at the frame's edges, as a fraction of the frame (lens softness at the gate). */
  edge?: number;
  /** 0-1 darkening toward the frame's corners (a projector's hot spot). */
  hotspot?: number;
  /** Blur of the projected picture in content px (focus). */
  softness?: number;
};

export type SurfaceProject = {
  (ctx: CanvasRenderingContext2D, t: number): void;
};

/** The homography taking the unit square (u, v) to the quad, as a row-major 3x3. Throws if degenerate. */
export function squareToQuad(q: Quad): Mat3 {
  assertQuad(q);
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-12 || Math.abs(dy3) > 1e-12) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (dx3 * dy2 - dx2 * dy3) / den;
    h = (dx1 * dy3 - dx3 * dy1) / den;
  }
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

/** Inverse of a 3x3. Throws if singular. */
export function invert3(m: Mat3): Mat3 {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) throw new Error("surfaceProject: the projection is singular (degenerate quad)");
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** Applies a homography to a point. Returns null where w <= 0 (behind the projector). */
export function applyHomography(m: Mat3, x: number, y: number): Point | null {
  const w = m[6] * x + m[7] * y + m[8];
  if (w <= 1e-12) return null;
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/** Throws unless the quad is four finite, distinct corners making a convex shape with area. */
export function assertQuad(q: Quad): void {
  if (!Array.isArray(q) || q.length !== 4 || q.some((p) => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite))) {
    throw new Error("surfaceProject: quad must be four [x, y] corners with finite numbers");
  }
  let sign = 0, area = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4], [cx, cy] = q[(i + 2) % 4];
    const cross = (bx - ax) * (cy - by) - (by - ay) * (cx - bx);
    if (Math.abs(cross) < 1e-9) throw new Error("surfaceProject: quad has three corners in a line");
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) throw new Error("surfaceProject: quad isn't convex (corners out of order, or a bow tie)");
    area += ax * by - bx * ay;
  }
  if (Math.abs(area) / 2 < 1) throw new Error("surfaceProject: quad has no area");
}

const VERT = `#version 300 es
layout(location = 0) in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D surf, content, occ, alb;
uniform vec2 res;
uniform mat3 toUv;
uniform float intensity, albedoGain, edge, hotspot, useOcc, useAlb;
uniform vec3 lamp;
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 px = vec2(uv.x, 1.0 - uv.y) * res;
  vec3 s = texture(surf, px / res).rgb;
  vec3 h = toUv * vec3(px, 1.0);
  vec2 f = h.xy / h.z;
  vec3 light = vec3(0.0);
  if (h.z > 0.0 && f.x >= 0.0 && f.x <= 1.0 && f.y >= 0.0 && f.y <= 1.0 && intensity > 0.0) {
    vec2 e = smoothstep(vec2(0.0), vec2(max(edge, 1e-4)), f) * smoothstep(vec2(0.0), vec2(max(edge, 1e-4)), 1.0 - f);
    vec2 c = f - 0.5;
    float hot = 1.0 - hotspot * smoothstep(0.0, 0.5, dot(c, c));
    float o = useOcc > 0.5 ? texture(occ, px / res).a : 0.0;
    light = intensity * lamp * toLinear(texture(content, f).rgb) * e.x * e.y * hot * (1.0 - o);
  }
  if (max(max(light.r, light.g), light.b) <= 0.0) { color = vec4(s, 1.0); return; }
  vec3 S = toLinear(s);
  vec3 A = useAlb > 0.5 ? toLinear(texture(alb, px / res).rgb) : S;
  vec3 albedo = clamp(A * albedoGain, 0.0, 1.0);
  color = vec4(toSrgb(clamp(S + albedo * light, 0.0, 1.0)), 1.0);
}`;

function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  return c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [number, number, number];
}

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

/** A painter that projects `image` onto `surface` through `quad`. */
export function surfaceProject(options: SurfaceProjectOptions): SurfaceProject {
  const {width: W, height: H, surface, albedo, image, contentWidth: CW = 1280, contentHeight: CH = 720, occlusion,
    albedoGain = 1.6, color = "#fff4e6", edge = 0.012, hotspot = 0.35, softness = 0} = options;
  if (typeof options.quad !== "function") assertQuad(options.quad);

  const glc = document.createElement("canvas");
  glc.width = W;
  glc.height = H;
  const gl = webgl2(glc, "surfaceProject");
  const prog = fullscreenProgram(gl, "surfaceProject", VERT, FRAG);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  const uToUv = u("toUv"), uIntensity = u("intensity");
  gl.uniform1i(u("surf"), 0);
  gl.uniform1i(u("content"), 1);
  gl.uniform1i(u("occ"), 2);
  gl.uniform1i(u("alb"), 3);
  gl.uniform1f(u("useAlb"), albedo ? 1 : 0);
  gl.uniform2f(u("res"), W, H);
  gl.uniform1f(u("albedoGain"), albedoGain);
  gl.uniform1f(u("edge"), edge);
  gl.uniform1f(u("hotspot"), hotspot);
  gl.uniform1f(u("useOcc"), occlusion ? 1 : 0);
  gl.uniform3f(u("lamp"), ...rgb01(color));
  const tex = [linearTexture(gl, 0), linearTexture(gl, 1), linearTexture(gl, 2), linearTexture(gl, 3)];
  gl.viewport(0, 0, W, H);

  const [sc, sg] = scratch(W, H);
  const [cc, cg] = scratch(CW, CH);
  const [oc, og] = occlusion ? scratch(W, H) : [null, null];
  const [ac, ag] = albedo ? scratch(W, H) : [null, null];
  const upload = (unit: number, img: HTMLCanvasElement) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };
  let lastQuad = "";
  // A 1x1 transparent occlusion, so the unit is never unbound.
  if (!occlusion) { const [one] = scratch(1, 1); upload(2, one); }
  if (!albedo) { const [one] = scratch(1, 1); upload(3, one); }

  return function paint(ctx: CanvasRenderingContext2D, t: number) {
    const q = typeof options.quad === "function" ? options.quad(t) : options.quad;
    const key = JSON.stringify(q);
    if (key !== lastQuad) {
      // Screen px -> frame uv. GLSL mat3 is column-major.
      const m = invert3(squareToQuad(q));
      gl.uniformMatrix3fv(uToUv, false, [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
      lastQuad = key;
    }
    const k = Math.max(0, typeof options.intensity === "function" ? options.intensity(t) : options.intensity ?? 1);
    gl.uniform1f(uIntensity, k);

    reset(sg);
    sg.fillStyle = "#000";
    sg.fillRect(0, 0, W, H);
    sg.save();
    surface(sg, t);
    sg.restore();
    upload(0, sc);

    reset(cg);
    cg.fillStyle = "#000";
    cg.fillRect(0, 0, CW, CH);
    if (k > 0) {
      cg.save();
      if (softness > 0) cg.filter = `blur(${softness}px)`;
      image(cg, t);
      cg.restore();
    }
    upload(1, cc);

    if (occlusion && oc && og) {
      reset(og);
      og.clearRect(0, 0, W, H);
      og.save();
      occlusion(og, t);
      og.restore();
      upload(2, oc);
    }
    if (albedo && ac && ag) {
      reset(ag);
      ag.fillStyle = "#000";
      ag.fillRect(0, 0, W, H);
      ag.save();
      albedo(ag, t);
      ag.restore();
      upload(3, ac);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    reset(ctx);
    ctx.drawImage(glc, 0, 0);
    ctx.restore();
  };
}

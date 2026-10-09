import {webgl2, fullscreenProgram, linearTexture} from "./gl";
import {thresholdFilter} from "./film-pass";
import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";

// DigicamPass: a picture as a cheap late-2000s consumer camera would have
// recorded it. Hard digital clipping into a cool lavender white, crushed
// blue-black shadows, a tight cold bloom, edge fringing, sharpening halos
// and shadow noise. Not film: no grain in the highlights, no red halation,
// no toe.
//
// What it does, in order (sRGB in, sRGB out, the middle in linear light):
//
//   1. lens: red and blue sampled slightly outward and inward from the
//      centre (lateral chromatic aberration, strongest at the corners)
//   2. in-camera sharpening: an unsharp mask on the sRGB values, so edges
//      get the bright and dark halos the curve then exaggerates
//   3. optional chroma blocks: colour taken from 8x8 block averages (a
//      crude 4:2:0 JPEG), luma left alone
//   4. decode to linear; exposure in stops; flash coverage falloff toward
//      the corners (a small flash and a cheap lens both do this)
//   5. sensor: fixed-pattern gain (per-pixel and per-column, seeded once,
//      the same every frame), cold white balance
//   6. highlight bleed: thresholded highlights blurred on a quarter-size
//      canvas, added back tinted cool
//   7. per-frame sensor noise: fine luma plus blotchier chroma, strongest
//      in the shadows and zero at true black
//   8. clip: a black point, then white at `whiteClip` with a very short
//      shoulder, and light near white in every channel pulled toward the
//      lavender highlight tint
//   9. shadow tint: a luma-preserving hue shift toward blue-violet in a
//      band above black (black itself stays black)
//  10. the camera's curve: a steep S and oversaturation in display space
//
// A flat RGB frame has no depth or normals, so this can't relight a scene
// as a flash would. The flash look (subject blown out, room gone) comes
// from the composition: an explicit matte and a gain on the subject before
// the pass. The pass supplies the camera's response to that light.
//
// Noise: the fixed pattern is a function of (pixel, seed); per-frame noise
// of (pixel, frame, seed). Both are camera-space, so they don't travel with
// the picture. Nothing reads a previous frame.
//
// `strength` 0 is an exact passthrough; in between it crossfades the
// processed frame with the source (the geometry only differs by the
// sub-pixel fringe).

export type DigicamPainter = (ctx: CanvasRenderingContext2D, t: number, frame: number) => void;

export type DigicamSettings = {
  /** 0 passthrough ... 1 full treatment. */
  strength: number;
  /** Exposure in stops. */
  exposure: number;
  /** Linear level that clips to white. Below 1 clips early, like a camera exposing for the subject. */
  whiteClip: number;
  /** Linear level that becomes black (0.004 is about sRGB 12). */
  blackPoint: number;
  /** 0-1 toward a cold white balance. */
  cold: number;
  /** 0-1 blue-violet hue shift in the shadows (luma kept). */
  shadowTint: number;
  /** 0-1 near-white pulled toward the highlight tint. */
  highlightTint: number;
  /** 0-1 cold bloom from highlights. */
  bleed: number;
  /** Luma (sRGB, of the source) above which light bleeds. */
  bleedThreshold: number;
  /** Bloom spread in px. */
  bleedRadius: number;
  /** Lateral chromatic aberration in px at the corners. */
  fringe: number;
  /** Unsharp mask amount; 0.6 already halos. */
  sharpen: number;
  /** Per-frame sensor noise amplitude (linear, at its shadow peak). */
  noise: number;
  /** Fixed-pattern gain variation, 0-0.05 is plenty. */
  pattern: number;
  /** 0-1 darkening toward the corners (flash coverage, cheap lens). */
  falloff: number;
  /** 0-1 colour from 8x8 block averages. */
  blocks: number;
  /** 0-1 the camera's punchy default tone curve (an S in display space). */
  contrast: number;
  /** Colour saturation; cheap cameras shipped above 1. */
  saturation: number;
};

export type DigicamPassOptions = Partial<DigicamSettings> & {
  width: number;
  height: number;
  start?: number;
  duration: number;
  fps?: number;
  paint: DigicamPainter;
  /** Near-white tint and bloom colour. */
  highlightColor?: string;
  /** Shadow hue. */
  shadowColor?: string;
  seed?: number;
  /** Per-frame overrides of the numeric settings. */
  tune?: (t: number) => Partial<DigicamSettings>;
};

export const digicamDefaults: DigicamSettings = {
  strength: 1,
  exposure: 0.85,
  whiteClip: 0.74,
  blackPoint: 0.014,
  cold: 0.3,
  shadowTint: 0.3,
  highlightTint: 0.55,
  bleed: 0.4,
  bleedThreshold: 0.78,
  bleedRadius: 10,
  fringe: 2.6,
  sharpen: 1.0,
  noise: 0.032,
  pattern: 0.02,
  falloff: 0.55,
  blocks: 0.4,
  contrast: 0.55,
  saturation: 1.3,
};

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D src, bloom, blockTex;
uniform vec2 res;
uniform float strength, exposure, whiteClip, blackPoint, cold, shadowTint, highlightTint, bleed, fringe, sharpen, noise, pattern, falloff, blocks, contrast, saturation;
uniform vec3 hiColor, loColor;
uniform uint frame, seed;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
// Uniform in [0, 1) from integer pixel, a salt and a stream.
float h(ivec2 c, uint salt) {
  return float(pcg(uint(c.x) * 1597u ^ pcg(uint(c.y) * 3433u ^ pcg(salt)))) / 4294967296.0;
}
// Roughly normal (sum of three uniforms), zero mean, unit-ish spread.
float gauss(ivec2 c, uint salt) {
  return (h(c, salt) + h(c, salt ^ 0x9e3779b9u) + h(c, salt ^ 0x85ebca6bu) - 1.5) * 2.0;
}
// Value noise on a lattice of s px, for blotchy chroma noise.
float blotch(vec2 px, float s, uint salt) {
  vec2 g = px / s;
  ivec2 i = ivec2(floor(g));
  vec2 f = fract(g);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(gauss(i, salt), gauss(i + ivec2(1, 0), salt), f.x),
             mix(gauss(i + ivec2(0, 1), salt), gauss(i + ivec2(1, 1), salt), f.x), f.y);
}

vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

vec3 at(vec2 px) { return texture(src, px / res).rgb; }

void main() {
  vec2 px = vec2(uv.x, 1.0 - uv.y) * res;
  vec3 orig = at(px);
  if (strength <= 0.0) { color = vec4(orig, 1.0); return; }
  ivec2 ip = ivec2(floor(px));

  // 1. Lateral CA: red a little outward, blue a little inward.
  vec2 fromC = (px - 0.5 * res) / (0.5 * res.y);
  vec2 ca = fromC * fringe / length(vec2(res.x / res.y, 1.0));
  vec3 c = vec3(at(px + ca).r, orig.g, at(px - ca).b);

  // 2. Unsharp mask against a 4-tap cross at 1.4 px.
  vec3 blur = 0.25 * (at(px + vec2(1.4, 0.0)) + at(px - vec2(1.4, 0.0)) + at(px + vec2(0.0, 1.4)) + at(px - vec2(0.0, 1.4)));
  c = clamp(c + sharpen * (c - blur), 0.0, 1.0);

  // 3. Chroma from the 8x8 block this pixel sits in.
  if (blocks > 0.0) {
    vec3 b = texture(blockTex, (floor(px / 8.0) + 0.5) * 8.0 / res).rgb;
    float y = dot(c, LUMA);
    c = mix(c, clamp(y + (b - dot(b, LUMA)), 0.0, 1.0), blocks);
  }

  // 4. Linear light, exposure, coverage falloff.
  vec3 L = toLinear(c);
  float r2 = dot(fromC, fromC) / dot(vec2(res.x / res.y, 1.0), vec2(res.x / res.y, 1.0));
  L *= exp2(exposure) * (1.0 - falloff * smoothstep(0.05, 1.0, r2));

  // 5. Fixed pattern (sensor-fixed: pixel and seed only) and white balance.
  float fpn = gauss(ip, seed * 31u + 7u) * 0.6 + gauss(ivec2(ip.x, 0), seed * 31u + 11u);
  L *= 1.0 + pattern * fpn;
  L *= mix(vec3(1.0), vec3(0.84, 0.95, 1.2), cold);

  // 6. Cold bloom from the highlights.
  vec3 bl = texture(bloom, px / res).rgb;
  L += bleed * dot(toLinear(bl), LUMA) * hiColor * 2.0;

  // 7. Per-frame noise, shadow-weighted, zero at black.
  float l = dot(L, LUMA);
  float w = smoothstep(0.0, 0.006, l) * pow(1.0 - min(l, 1.0), 3.0);
  uint fs = seed * 7919u + frame * 104729u;
  vec3 cn = vec3(blotch(px, 2.5, fs + 1u), blotch(px, 2.5, fs + 2u), blotch(px, 2.5, fs + 3u));
  // Luma noise on a 1.4 px lattice rather than per pixel: it reads the
  // same at 1440p and the encoder survives it (per-pixel noise made a 12 s
  // render 234 MB).
  vec3 n = vec3(blotch(px, 1.4, fs)) * 0.7 + 0.9 * (cn - dot(cn, LUMA));
  L = max(L + noise * w * n * (0.15 + sqrt(max(l, 0.0))), 0.0);

  // 8. Black point; white at whiteClip with a very short shoulder; near-white toward lavender.
  L = max(L - blackPoint, 0.0) / (1.0 - blackPoint);
  vec3 x = L / whiteClip;
  const float knee = 0.9;
  vec3 over = max(x - knee, 0.0);
  x = min(x, knee) + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
  // Keyed on the smallest channel: only light that is near white in every
  // channel goes lavender, so a bright yellow stays yellow.
  float lo = min(min(x.r, x.g), x.b);
  x = mix(x, hiColor * max(max(x.r, x.g), x.b), highlightTint * smoothstep(0.6, 0.95, lo));

  // 9. Shadow hue, luma kept, in a band above black.
  float ls = dot(x, LUMA);
  vec3 tint = loColor / max(dot(loColor, LUMA), 1e-4);
  float band = smoothstep(0.0, 0.008, ls) * (1.0 - smoothstep(0.015, 0.1, ls));
  x = mix(x, ls * tint, shadowTint * band);

  // 10. The camera's own curve and colour, in display space: a steep S and
  // oversaturation. Black and white are fixed points of the S.
  vec3 d = toSrgb(clamp(x, 0.0, 1.0));
  d = mix(d, d * d * (3.0 - 2.0 * d), contrast);
  float dl = dot(d, LUMA);
  d = clamp(dl + (d - dl) * saturation, 0.0, 1.0);
  vec3 outc = d;
  color = vec4(mix(orig, outc, clamp(strength, 0.0, 1.0)), 1.0);
}`;

function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** sRGB hex to linear RGB, normalised so the brightest channel is 1. */
function tintLinear(hex: string): [number, number, number] {
  const lin = rgb01(hex).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const m = Math.max(...lin, 1e-4);
  return [lin[0] / m, lin[1] / m, lin[2] / m];
}

export function digicamPass(container: HTMLElement, timeline: gsap.core.Timeline, options: DigicamPassOptions): HTMLCanvasElement {
  const {width: w, height: h, start = 0, duration, fps = 24, paint, highlightColor = "#efe6ff", shadowColor = "#3b3fa8", seed = 17} = options;
  const base: DigicamSettings = {...digicamDefaults};
  for (const k of Object.keys(digicamDefaults) as (keyof DigicamSettings)[]) if (options[k] !== undefined) base[k] = options[k]!;

  const out = el("canvas", "k-layer k-digicam", container);
  out.dataset.layoutAllowOverflow = "";
  out.width = w;
  out.height = h;
  const gl = webgl2(out, "digicamPass");

  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const ctx = source.getContext("2d")!;
  const bs = 4;
  const bloom = document.createElement("canvas");
  bloom.width = Math.ceil(w / bs);
  bloom.height = Math.ceil(h / bs);
  const bctx = bloom.getContext("2d")!;
  const blocks = document.createElement("canvas");
  blocks.width = Math.ceil(w / 8);
  blocks.height = Math.ceil(h / 8);
  const kctx = blocks.getContext("2d")!;
  kctx.imageSmoothingQuality = "high";

  const prog = fullscreenProgram(gl, "digicamPass", VERT, FRAG);
  const srcTex = linearTexture(gl, 0);
  const bloomTex = linearTexture(gl, 1);
  const blockTex = linearTexture(gl, 2);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(prog, name));
    return uniforms.get(name)!;
  };
  gl.uniform1i(u("src"), 0);
  gl.uniform1i(u("bloom"), 1);
  gl.uniform1i(u("blockTex"), 2);
  gl.uniform2f(u("res"), w, h);
  gl.uniform3f(u("hiColor"), ...tintLinear(highlightColor));
  gl.uniform3f(u("loColor"), ...tintLinear(shadowColor));
  gl.uniform1ui(u("seed"), seed >>> 0);
  gl.viewport(0, 0, w, h);
  const upload = (unit: number, tex: WebGLTexture, img: HTMLCanvasElement) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    const s = options.tune ? {...base, ...options.tune(t)} : base;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    paint(ctx, t, frame);
    ctx.restore();

    bctx.filter = "none";
    bctx.fillStyle = "#000";
    bctx.fillRect(0, 0, bloom.width, bloom.height);
    if (s.bleed > 0 && s.strength > 0) {
      bctx.filter = `${thresholdFilter(Math.min(0.99, s.bleedThreshold))} blur(${(s.bleedRadius / bs).toFixed(2)}px)`;
      bctx.drawImage(source, 0, 0, bloom.width, bloom.height);
      bctx.filter = "none";
    }
    if (s.blocks > 0 && s.strength > 0) kctx.drawImage(source, 0, 0, blocks.width, blocks.height);

    upload(0, srcTex, source);
    upload(1, bloomTex, bloom);
    upload(2, blockTex, blocks);
    for (const k of Object.keys(digicamDefaults) as (keyof DigicamSettings)[]) gl.uniform1f(u(k), s[k]);
    gl.uniform1ui(u("frame"), frame >>> 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  return out;
}

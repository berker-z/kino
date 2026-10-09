import {webgl2, fullscreenProgram, linearTexture} from "./gl";
import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";
import {noise2} from "../utils/noise";

// FilmPass: a picture as if exposed on black-and-white film and printed.
// Deliberately small. What it does, in order:
//
//   weave (the frame sits slightly differently in the gate each frame)
//   -> exposure (stops) -> halation (bright edges bloom warm into the dark)
//   -> curve (toe that keeps shadow detail, S for contrast)
//   -> toning (optional two-colour split) -> vignette -> grain
//
// Halation is light scattering back off the film base: it starts at
// highlights and spreads into the dark around them, reddish because the red
// layer sits nearest the base. So it is thresholded *before* it's blurred
// (on a quarter-size canvas, with CSS filters), never a blur over everything.
//
// Grain is value noise at `grainSize` px, re-seeded every frame from the
// frame number (so it moves, deterministically), strongest in the
// midtones, weakest in black and white so type and deep shadow stay clean.
//
// `strength` 0 is a passthrough: no weave, no curve, no grain. Content and
// geometry are the source's; the pass only treats them.
//
// Input: one RGB canvas painted over black, like screenPass. Colour is
// kept (toning, if set, replaces it with a split tone of the luma).

export type FilmPainter = (ctx: CanvasRenderingContext2D, t: number, frame: number) => void;

export type FilmSettings = {
  /** 0 passthrough ... 1 full treatment. */
  strength: number;
  /** Exposure in stops. */
  exposure: number;
  /** 0-1 blend toward an S-curve. */
  contrast: number;
  /** Black lift 0-0.1: the print's blacks aren't the screen's. */
  toe: number;
  /** Grain amplitude 0-1 (0.08 is already visible at 1440p). */
  grain: number;
  /** Grain clump size in px. */
  grainSize: number;
  /** 0-1 halation strength. */
  halation: number;
  /** Luma above which light halates. */
  halationThreshold: number;
  /** Halation spread in px. */
  halationRadius: number;
  /** 0-1 darkening toward the corners. */
  vignette: number;
  /** Gate weave in px (peak). */
  weave: number;
};

export type FilmPassOptions = Partial<FilmSettings> & {
  width: number;
  height: number;
  start?: number;
  duration: number;
  fps?: number;
  paint: FilmPainter;
  /** Halation tint. */
  halationColor?: string;
  /** Split toning, shadow and highlight colours. Omit to keep the source's colour. */
  toning?: [string, string];
  seed?: number;
  /** Per-frame overrides of the numeric settings. */
  tune?: (t: number) => Partial<FilmSettings>;
};

export const filmDefaults: FilmSettings = {
  strength: 1,
  exposure: 0,
  contrast: 0.35,
  toe: 0.025,
  grain: 0.07,
  grainSize: 1.6,
  halation: 0.45,
  halationThreshold: 0.72,
  halationRadius: 22,
  vignette: 0.28,
  weave: 0.6,
};

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D src;
uniform sampler2D halo;
uniform vec2 res, weaveOffset;
uniform float strength, exposure, contrast, toe, grain, grainSize, halation, vignette, toning;
uniform vec3 halColor, toneLo, toneHi;
uniform uint frame, seed;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// PCG hash: integer in, well-mixed integer out. Stable on every GPU.
uint pcg(uint v) {
  uint s = v * 747796405u + 2891336453u;
  uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
float h3(ivec2 c, uint f) {
  return float(pcg(uint(c.x) * 1597u ^ pcg(uint(c.y) * 3433u ^ pcg(f ^ seed)))) / 4294967295.0;
}
// Bilinear value noise on a lattice of grainSize px, new lattice per frame.
float grainAt(vec2 px) {
  vec2 g = px / grainSize;
  ivec2 i = ivec2(floor(g));
  vec2 f = fract(g);
  f = f * f * (3.0 - 2.0 * f);
  float a = h3(i, frame), b = h3(i + ivec2(1, 0), frame);
  float c = h3(i + ivec2(0, 1), frame), d = h3(i + ivec2(1, 1), frame);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y) - 0.5;
}

void main() {
  // Canvas row 0 is the top; uv.y = 0 is the bottom.
  vec2 px = vec2(uv.x, 1.0 - uv.y) * res;
  vec3 orig = texture(src, px / res).rgb;
  vec3 c = texture(src, (px - weaveOffset * strength) / res).rgb;

  c *= exp2(exposure * strength);
  vec3 h = texture(halo, (px - weaveOffset * strength) / res).rgb;
  c += strength * halation * dot(h, LUMA) * halColor;

  // Toe, then S. The toe lifts black a touch and keeps shadow steps apart.
  c = clamp(c, 0.0, 1.0);
  vec3 s = c * c * (3.0 - 2.0 * c);
  c = mix(c, s, contrast * strength);
  c = mix(c, toe + (1.0 - toe) * c, strength);

  if (toning > 0.5) {
    // The split tone's hue at this luma, rescaled to keep the luma.
    float l = dot(c, LUMA);
    vec3 tone = mix(toneLo, toneHi, l);
    c = mix(c, tone * l / max(dot(tone, LUMA), 1e-3), strength);
  }

  vec2 d = (px / res - 0.5) * vec2(res.x / res.y, 1.0);
  float v = 1.0 - vignette * strength * smoothstep(0.35, 1.05, length(d));
  c *= v;

  float l = dot(c, LUMA);
  float mid = 4.0 * l * (1.0 - l);
  c += strength * grain * grainAt(px) * (0.25 + 0.75 * mid);

  color = vec4(clamp(c, 0.0, 1.0), 1.0);
  if (strength <= 0.0) color = vec4(orig, 1.0);
}`;

function rgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * CSS filters that map luma `th` to 0 and 1 to 1 (brightness then
 * contrast), so only what's above the threshold halates.
 */
export function thresholdFilter(th: number): string {
  const ak = 1 / (1 - th);
  const k = 2 * ak - 1;
  return `brightness(${(ak / k).toFixed(4)}) contrast(${k.toFixed(4)})`;
}

/** Gate weave at t: a slow wander plus a little per-frame unsteadiness, in px. */
export function gateWeave(t: number, frame: number, amount: number, seed = 7): [number, number] {
  const wx = (noise2(t * 0.7, seed, 11) - 0.5) * 2 + (noise2(frame * 0.9, seed, 13) - 0.5) * 0.6;
  const wy = (noise2(t * 0.5, seed + 1, 17) - 0.5) * 1.2 + (noise2(frame * 0.9, seed + 1, 19) - 0.5) * 0.4;
  return [wx * amount, wy * amount];
}

export function filmPass(container: HTMLElement, timeline: gsap.core.Timeline, options: FilmPassOptions): HTMLCanvasElement {
  const {width: w, height: h, start = 0, duration, fps = 30, paint, halationColor = "#ff7a4a", toning, seed = 7} = options;
  const base: FilmSettings = {...filmDefaults};
  for (const k of Object.keys(filmDefaults) as (keyof FilmSettings)[]) if (options[k] !== undefined) base[k] = options[k]!;

  const out = el("canvas", "k-layer k-film", container);
  out.dataset.layoutAllowOverflow = "";
  out.width = w;
  out.height = h;
  const gl = webgl2(out, "filmPass");

  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const ctx = source.getContext("2d")!;
  // Halation is built at quarter size: it's a wide, soft thing.
  const hs = 4;
  const halo = document.createElement("canvas");
  halo.width = Math.ceil(w / hs);
  halo.height = Math.ceil(h / hs);
  const hctx = halo.getContext("2d")!;

  const prog = fullscreenProgram(gl, "filmPass", VERT, FRAG);
  const srcTex = linearTexture(gl, 0);
  const haloTex = linearTexture(gl, 1);
  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u("src"), 0);
  gl.uniform1i(u("halo"), 1);
  gl.uniform2f(u("res"), w, h);
  gl.uniform3f(u("halColor"), ...rgb01(halationColor));
  gl.uniform1f(u("toning"), toning ? 1 : 0);
  gl.uniform3f(u("toneLo"), ...rgb01(toning?.[0] ?? "#000000"));
  gl.uniform3f(u("toneHi"), ...rgb01(toning?.[1] ?? "#ffffff"));
  gl.uniform1ui(u("seed"), seed >>> 0);
  const uFrame = u("frame");
  const uWeave = u("weaveOffset");
  gl.viewport(0, 0, w, h);

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    const s = options.tune ? {...base, ...options.tune(t)} : base;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    paint(ctx, t, frame);
    ctx.restore();

    hctx.globalCompositeOperation = "source-over";
    hctx.filter = "none";
    hctx.fillStyle = "#000";
    hctx.fillRect(0, 0, halo.width, halo.height);
    if (s.halation > 0 && s.strength > 0) {
      hctx.filter = `${thresholdFilter(s.halationThreshold)} blur(${(s.halationRadius / hs).toFixed(2)}px)`;
      hctx.drawImage(source, 0, 0, halo.width, halo.height);
      hctx.filter = "none";
    }

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, haloTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, halo);

    for (const k of Object.keys(filmDefaults) as (keyof FilmSettings)[]) {
      if (k !== "weave") gl.uniform1f(u(k), s[k]);
    }
    gl.uniform2f(uWeave, ...gateWeave(t, frame, s.weave, seed));
    gl.uniform1ui(uFrame, frame >>> 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  return out;
}

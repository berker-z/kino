import {webgl2, fullscreenProgram, linearTexture} from "./gl";
import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";

// InfraredPass: an art-directed false infrared. Black-and-white infrared
// film sees light the eye doesn't: living leaves reflect near infrared
// strongly, so foliage and grass go pale and luminous (the Wood effect),
// while clear sky and water absorb it and go nearly black.
//
// A shader can't see near infrared. RGB carries no NIR measurement, so
// this can't know which pixels are leaves; it guesses from colour, and the
// guess fails wherever colour lies (green paint reads as foliage, a grey
// overcast sky doesn't darken, autumn leaves are a red-channel guess). It
// is a tonal transform that looks like infrared on the kind of picture
// infrared made famous, and makes no claim beyond that. Where the guess
// isn't good enough, give it explicit mattes (`regions`): the author says
// where the foliage and the sky are.
//
// In order, in linear light:
//
//   1. base: a red-heavy luma (0.65 R + 0.3 G + 0.05 B), like panchromatic
//      film behind a deep red filter, which is where IR photography starts
//   2. foliage: a proxy from colour (green or yellow-red over blue, with
//      some saturation), or the foliage matte; lifted multiplicatively, so
//      the leaves' own texture survives, then a shoulder so they never
//      flatten to white
//   3. sky: a proxy (blue over red, reasonably bright), or the sky matte;
//      pushed toward black, but clouds (bright, unsaturated) stay
//   4. contrast: an S-curve around mid-grey
//   5. glow: a small local bloom from the brightest parts (8 taps on a
//      ring), the soft halo of IR film
//   6. toning: a two-colour split of the result (silver by default)
//
// `regions`, if given, paints mattes over black: red = foliage, blue = sky,
// in the same frame geometry as `paint` (draw them with the same camera).
// `maskWeight` blends between the proxies (0) and the mattes (1).
//
// `strength` 0 is an exact passthrough.

export type InfraredPainter = (ctx: CanvasRenderingContext2D, t: number, frame: number) => void;

export type InfraredSettings = {
  /** 0 passthrough ... 1 full treatment. */
  strength: number;
  /** How much foliage is lifted (multiplier on its luma: 1 + 3 x this). */
  foliageLift: number;
  /** 0-1 how far sky is pushed to black. */
  skyDarkening: number;
  /** 0-1 S-curve. */
  contrast: number;
  /** 0-1 local bloom from highlights. */
  glow: number;
  /** Bloom ring radius in px. */
  glowRadius: number;
  /** Exposure in stops, before the curve. */
  exposure: number;
  /** 0: colour proxies only, 1: mattes only (when regions are given). */
  maskWeight: number;
};

export type InfraredPassOptions = Partial<InfraredSettings> & {
  width: number;
  height: number;
  start?: number;
  duration: number;
  fps?: number;
  paint: InfraredPainter;
  /** Mattes over black, same geometry as paint: red = foliage, blue = sky. */
  regions?: InfraredPainter;
  /** Shadow and highlight colours of the toning. */
  toning?: [string, string];
  tune?: (t: number) => Partial<InfraredSettings>;
};

export const infraredDefaults: InfraredSettings = {
  strength: 1,
  foliageLift: 0.6,
  skyDarkening: 0.9,
  contrast: 0.35,
  glow: 0.22,
  glowRadius: 7,
  exposure: 0.2,
  maskWeight: 1,
};

const VERT = `#version 300 es
layout(location = 0) in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D src, regions;
uniform vec2 res;
uniform float strength, foliageLift, skyDarkening, contrast, glow, glowRadius, exposure, maskWeight, useRegions;
uniform vec3 toneLo, toneHi;

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

// The false-infrared value of one pixel, linear, before glow and toning.
float ir(vec2 px) {
  vec3 c = toLinear(texture(src, px / res).rgb);
  float base = dot(c, vec3(0.65, 0.3, 0.05)) * exp2(exposure);
  float mx = max(max(c.r, c.g), c.b), mn = min(min(c.r, c.g), c.b);
  float sat = (mx - mn) / max(mx, 1e-4);
  float lit = smoothstep(0.004, 0.04, mx);
  // Foliage: green (or autumn yellow-red) clearly over blue, with some saturation.
  float warmOverBlue = (max(c.g, 0.8 * c.r) - c.b) / max(mx, 1e-4);
  float veg = smoothstep(0.12, 0.45, warmOverBlue) * smoothstep(0.12, 0.35, sat) * lit;
  // Sky (and water): blue over red, and not dark.
  float sky = smoothstep(0.08, 0.35, (c.b - c.r) / max(mx, 1e-4)) * smoothstep(0.03, 0.2, mx);
  if (useRegions > 0.5) {
    vec3 m = texture(regions, px / res).rgb;
    veg = mix(veg, m.r, maskWeight);
    sky = mix(sky, m.b * (1.0 - m.r), maskWeight);
  }
  // Multiplicative (keeps the leaves' texture) plus a small floor, so even
  // dark foliage turns luminous rather than staying dark grey.
  float lifted = base * (1.0 + 3.0 * foliageLift * veg) + 0.3 * foliageLift * veg;
  // Shoulder from 0.6: lifted leaves approach white without reaching it,
  // so their texture is compressed, not clipped.
  const float knee = 0.6;
  if (lifted > knee) lifted = knee + (1.0 - knee) * (1.0 - exp(-(lifted - knee) / (1.0 - knee)));
  lifted *= 1.0 - skyDarkening * sky;
  return clamp(lifted, 0.0, 1.0);
}

void main() {
  vec2 px = vec2(uv.x, 1.0 - uv.y) * res;
  vec3 orig = texture(src, px / res).rgb;
  if (strength <= 0.0) { color = vec4(orig, 1.0); return; }

  float y = ir(px);
  // Contrast around mid-grey in a perceptual space.
  float g = pow(y, 1.0 / 2.2);
  float s = g * g * (3.0 - 2.0 * g);
  g = mix(g, s, contrast);
  y = pow(g, 2.2);

  if (glow > 0.0) {
    float b = 0.0;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.785398;
      b += smoothstep(0.45, 1.0, ir(px + glowRadius * vec2(cos(a), sin(a))));
    }
    y = 1.0 - (1.0 - y) * (1.0 - glow * b / 8.0);
  }

  vec3 tone = mix(toneLo, toneHi, pow(y, 1.0 / 2.2));
  vec3 outc = tone * y / max(dot(tone, LUMA), 1e-4);
  color = vec4(mix(orig, toSrgb(clamp(outc, 0.0, 1.0)), clamp(strength, 0.0, 1.0)), 1.0);
}`;

function lin(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
}

export function infraredPass(container: HTMLElement, timeline: gsap.core.Timeline, options: InfraredPassOptions): HTMLCanvasElement {
  const {width: w, height: h, start = 0, duration, fps = 24, paint, regions, toning = ["#0a0b0d", "#f4f1ea"]} = options;
  const base: InfraredSettings = {...infraredDefaults};
  for (const k of Object.keys(infraredDefaults) as (keyof InfraredSettings)[]) if (options[k] !== undefined) base[k] = options[k]!;

  const out = el("canvas", "k-layer k-infrared", container);
  out.dataset.layoutAllowOverflow = "";
  out.width = w;
  out.height = h;
  const gl = webgl2(out, "infraredPass");
  const prog = fullscreenProgram(gl, "infraredPass", VERT, FRAG);
  const uniforms = new Map<string, WebGLUniformLocation | null>();
  const u = (name: string) => {
    if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(prog, name));
    return uniforms.get(name)!;
  };
  gl.uniform1i(u("src"), 0);
  gl.uniform1i(u("regions"), 1);
  gl.uniform2f(u("res"), w, h);
  gl.uniform1f(u("useRegions"), regions ? 1 : 0);
  gl.uniform3f(u("toneLo"), ...lin(toning[0]));
  gl.uniform3f(u("toneHi"), ...lin(toning[1]));
  const srcTex = linearTexture(gl, 0);
  const regTex = linearTexture(gl, 1);
  gl.viewport(0, 0, w, h);

  const canvasOf = (cw: number, ch: number) => {
    const c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;
    return c;
  };
  const source = canvasOf(w, h), ctx = source.getContext("2d")!;
  const mattes = regions ? canvasOf(w, h) : canvasOf(1, 1);
  const mctx = mattes.getContext("2d")!;
  const upload = (unit: number, tex: WebGLTexture, img: HTMLCanvasElement) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };
  if (!regions) upload(1, regTex, mattes);

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    const s = options.tune ? {...base, ...options.tune(t)} : base;
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    paint(ctx, t, frame);
    ctx.restore();
    upload(0, srcTex, source);
    if (regions) {
      mctx.save();
      mctx.fillStyle = "#000";
      mctx.fillRect(0, 0, w, h);
      regions(mctx, t, frame);
      mctx.restore();
      upload(1, regTex, mattes);
    }
    for (const k of Object.keys(infraredDefaults) as (keyof InfraredSettings)[]) gl.uniform1f(u(k), s[k]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  return out;
}

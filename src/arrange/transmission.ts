import {webgl2, fullscreenProgram, linearTexture} from "../passes/gl";
import type {CanvasScene} from "./torn-wipe";

// Transmitted light: a picture that exists only as matter light has to
// pass through. A glass negative, a lantern slide, a stained-glass panel:
// each is a map of optical density, and what you see is the light behind
// it, attenuated by that density. Move the light and the picture changes;
// take it away and the picture is gone.
//
// Per channel, in linear light:
//
//   transmittance T = tint · exp(-extinction · density)
//   plate         P = backlight · gain · T + front · room
//   out           = room · (1 - coverage) + P · coverage
//
// Conventions, stated once because they're easy to invert by accident:
//
// - density: painted grey over black. Black (0) is clear glass and passes
//   all the light; white (1) is the densest. A photographic negative is
//   already density (its dark parts are clear); to show a positive through
//   glass (a slide), paint 1 - luma, i.e. draw it inverted.
// - tint: the glass's colour, RGB over white. White is clear glass; a red
//   pane passes red and absorbs the rest. Omit it for monochrome plates.
// - backlight: the light behind the plate, RGB intensity, multiplied by
//   `gain` (so a canvas can stand for a light brighter than white).
// - coverage: where the plate is, as alpha on a transparent canvas. Outside
//   it, the room. Lead cames and frames are just density 1 with enough
//   extinction: they block the light, they never paint over it.
// - front: a little of the room's light reflected off the plate's face,
//   so an unlit plate is barely there, not a black hole.
//
// Output is opaque RGB, so it can go through any pass. Glow round bright
// panes belongs to that pass (filmPass's halation), not here.

export type TransmissionOptions = {
  width: number;
  height: number;
  /** Optical density, grey over black: black clear, white dense. */
  density: CanvasScene;
  /** The light behind the plate, over black. */
  backlight: CanvasScene;
  /** Glass colour over white; omit for clear (monochrome) glass. */
  tint?: CanvasScene;
  /** Where the plate is: alpha on a transparent canvas. Omit for the whole frame. */
  coverage?: CanvasScene;
  /** The surroundings, over black. Omit for black. */
  room?: CanvasScene;
  /** How strongly density 1 attenuates: T = exp(-extinction) at white. */
  extinction?: number | ((t: number) => number);
  /** Backlight intensity multiplier. */
  gain?: number | ((t: number) => number);
  /** Fraction of the room's light reflected off the plate's face. */
  front?: number;
};

export type Transmission = (ctx: CanvasRenderingContext2D, t: number) => void;

/** Transmittance of one channel. Pure: density 0-1, extinction >= 0, tint 0-1. */
export function transmittance(density: number, extinction: number, tint = 1): number {
  const d = Math.min(1, Math.max(0, density));
  return Math.min(1, Math.max(0, tint)) * Math.exp(-Math.max(0, extinction) * d);
}

const VERT = `#version 300 es
layout(location = 0) in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D dens, light, tintTex, cov, room;
uniform vec2 res;
uniform float extinction, gain, front, useTint, useCov, useRoom;
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() {
  vec2 st = vec2(uv.x, 1.0 - uv.y);
  // Density is a fraction, not a light: read it as stored (0-1), no decode.
  float d = dot(texture(dens, st).rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 tint = useTint > 0.5 ? toLinear(texture(tintTex, st).rgb) : vec3(1.0);
  vec3 T = tint * exp(-extinction * d);
  vec3 B = toLinear(texture(light, st).rgb) * gain;
  vec3 R = useRoom > 0.5 ? toLinear(texture(room, st).rgb) : vec3(0.0);
  float c = useCov > 0.5 ? texture(cov, st).a : 1.0;
  vec3 plate = B * T + front * R;
  color = vec4(toSrgb(clamp(mix(R, plate, c), 0.0, 1.0)), 1.0);
}`;

function scratch(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/** A painter that composites light transmitted through a density plate. */
export function transmissionComposite(options: TransmissionOptions): Transmission {
  const {width: W, height: H, density, backlight, tint, coverage, room, front = 0.08} = options;
  const glc = document.createElement("canvas");
  glc.width = W;
  glc.height = H;
  const gl = webgl2(glc, "transmissionComposite");
  const prog = fullscreenProgram(gl, "transmissionComposite", VERT, FRAG);
  const u = (n: string) => gl.getUniformLocation(prog, n);
  ["dens", "light", "tintTex", "cov", "room"].forEach((n, i) => gl.uniform1i(u(n), i));
  gl.uniform2f(u("res"), W, H);
  gl.uniform1f(u("useTint"), tint ? 1 : 0);
  gl.uniform1f(u("useCov"), coverage ? 1 : 0);
  gl.uniform1f(u("useRoom"), room ? 1 : 0);
  gl.uniform1f(u("front"), front);
  const uExt = u("extinction"), uGain = u("gain");
  const tex = [0, 1, 2, 3, 4].map((i) => linearTexture(gl, i));
  gl.viewport(0, 0, W, H);

  // One scratch canvas per input: density, backlight, tint, coverage, room.
  const layers: (readonly [HTMLCanvasElement, CanvasRenderingContext2D] | null)[] = [
    scratch(W, H), scratch(W, H), tint ? scratch(W, H) : null, coverage ? scratch(W, H) : null, room ? scratch(W, H) : null,
  ];
  const painters = [density, backlight, tint, coverage, room];
  const grounds = ["#000", "#000", "#fff", null, "#000"];
  const [one] = scratch(1, 1);
  const upload = (unit: number, img: HTMLCanvasElement) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  };
  layers.forEach((l, i) => { if (!l) upload(i, one); });
  const val = (v: number | ((t: number) => number) | undefined, d: number, t: number) => Math.max(0, typeof v === "function" ? v(t) : v ?? d);

  return function paint(ctx: CanvasRenderingContext2D, t: number) {
    layers.forEach((l, i) => {
      if (!l) return;
      const [c, g] = l;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.filter = "none";
      if (grounds[i]) { g.fillStyle = grounds[i]!; g.fillRect(0, 0, W, H); } else g.clearRect(0, 0, W, H);
      g.save();
      painters[i]!(g, t);
      g.restore();
      upload(i, c);
    });
    gl.uniform1f(uExt, val(options.extinction, 4, t));
    gl.uniform1f(uGain, val(options.gain, 1, t));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    ctx.drawImage(glc, 0, 0);
    ctx.restore();
  };
}

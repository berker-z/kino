import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";

// RisoPass: a two-ink risograph print. The composition paints two grayscale
// separations every frame, one canvas per ink (white = full ink), and the
// pass prints them onto paper the way a riso does:
//
// - each ink goes through its own halftone screen at its own angle, so
//   flat areas become dots and the two screens make a fine rosette;
// - each drum sits slightly off register, so the inks don't line up;
// - ink coverage is uneven: fine speckle where the drum starved, a few
//   larger blotches where it pooled;
// - inks multiply where they overlap (pink over blue goes purple), which is
//   the whole charm of overprinting.
//
// Misregistration and grain can move per printed frame (pass them through
// `tune`), which is what makes animated riso feel like a flipbook.

export type RisoPainter = (inkA: CanvasRenderingContext2D, inkB: CanvasRenderingContext2D, t: number, frame: number) => void;

export type RisoSettings = {
  /** Halftone cell size in px. */
  cell: number;
  /** Screen angles in degrees. */
  angleA: number;
  angleB: number;
  /** Register offsets in px. */
  offAX: number;
  offAY: number;
  offBX: number;
  offBY: number;
  /** 0-1 uneven ink coverage. */
  grain: number;
  /** Seed for the grain pattern; change it per printed frame. */
  seed: number;
  /** Densities above this print solid instead of as dots. */
  solid: number;
};

export type RisoPassOptions = Partial<RisoSettings> & {
  width: number;
  height: number;
  start?: number;
  duration: number;
  fps?: number;
  paint: RisoPainter;
  inkA: string;
  inkB: string;
  paper: string;
  tune?: (t: number, frame: number) => Partial<RisoSettings>;
};

/** Standard riso drum colors (approximate). */
export const risoInks = {
  fluorescentPink: "#FF48B0",
  blue: "#0078BF",
  federalBlue: "#3D5588",
  red: "#FF665E",
  yellow: "#FFE800",
  teal: "#00838A",
  orange: "#FF6C2F",
  black: "#000000",
} as const;

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D srcA, srcB;
uniform vec2 res;
uniform vec3 inkA, inkB, paper;
uniform float cell, angleA, angleB, offAX, offAY, offBX, offBY, grain, seed, solid;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + seed * 17.13) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

// Coverage 0-1 of one ink at px: halftone dot sized by density, plus grain.
float ink(sampler2D src, vec2 px, vec2 off, float angle, float salt) {
  float d = texture(src, (px - off) / res).r;
  if (d < 0.01) return 0.0;
  float a = radians(angle);
  vec2 r = mat2(cos(a), -sin(a), sin(a), cos(a)) * px / cell;
  vec2 local = fract(r) - 0.5;
  // Dot radius for area coverage d; antialiased over one screen pixel.
  float rad = sqrt(d / 3.14159265);
  float dist = length(local);
  float aa = 1.0 / cell;
  float dots = smoothstep(rad + aa, rad - aa, dist);
  float cov = mix(dots, 1.0, smoothstep(solid - 0.08, solid, d));
  // Starved drum: fine speckle; pooled ink: soft blotches.
  float speck = hash(floor(px * 0.75) + salt);
  float blotch = vnoise(px / 140.0 + salt);
  cov *= 1.0 - grain * (0.55 * step(0.82, speck) + 0.35 * smoothstep(0.55, 0.9, blotch));
  return clamp(cov, 0.0, 1.0);
}

void main() {
  vec2 px = vec2(uv.x, 1.0 - uv.y) * res;
  float a = ink(srcA, px, vec2(offAX, offAY), angleA, 3.1);
  float b = ink(srcB, px, vec2(offBX, offBY), angleB, 7.7);
  vec3 c = paper * (0.975 + 0.025 * vnoise(px / 3.0 + 11.0)) * (0.985 + 0.015 * vnoise(px / 60.0));
  c *= mix(vec3(1.0), inkB, b);
  c *= mix(vec3(1.0), inkA, a);
  color = vec4(c, 1.0);
}`;

const rgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as const;
};

export function risoPass(container: HTMLElement, timeline: gsap.core.Timeline, options: RisoPassOptions): HTMLCanvasElement {
  const {width: w, height: h, start = 0, duration, fps = 30, paint} = options;
  const base: RisoSettings = {
    cell: options.cell ?? 9,
    angleA: options.angleA ?? 15,
    angleB: options.angleB ?? 75,
    offAX: options.offAX ?? 4,
    offAY: options.offAY ?? -3,
    offBX: options.offBX ?? -2,
    offBY: options.offBY ?? 2,
    grain: options.grain ?? 0.6,
    seed: options.seed ?? 1,
    solid: options.solid ?? 0.9,
  };

  const out = el("canvas", "k-layer k-riso", container);
  out.dataset.layoutAllowOverflow = "";
  out.width = w;
  out.height = h;
  const gl = out.getContext("webgl2", {preserveDrawingBuffer: true, antialias: false})!;

  const layer = () => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return [c, c.getContext("2d")!] as const;
  };
  const [canvasA, ctxA] = layer();
  const [canvasB, ctxB] = layer();

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const texture = (unit: number) => {
    const t = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const texA = texture(0);
  const texB = texture(1);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u("srcA"), 0);
  gl.uniform1i(u("srcB"), 1);
  gl.uniform2f(u("res"), w, h);
  gl.uniform3f(u("inkA"), ...rgb(options.inkA));
  gl.uniform3f(u("inkB"), ...rgb(options.inkB));
  gl.uniform3f(u("paper"), ...rgb(options.paper));
  const apply = (s: RisoSettings) => {
    for (const [name, value] of Object.entries(s)) gl.uniform1f(u(name), value);
  };
  apply(base);
  gl.viewport(0, 0, w, h);

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    for (const ctx of [ctxA, ctxB]) {
      ctx.save();
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
    paint(ctxA, ctxB, t, frame);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasA);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvasB);
    apply({...base, ...options.tune?.(t, frame)});
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  return out;
}

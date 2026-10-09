import {timeDriver} from "../runtime/time-driver";
import {el} from "../utils/dom";

// ScreenPass: a WebGL post pass that makes a grayscale picture look like it
// was printed in cyanotype and filmed off a Trinitron, the NousCon look.
// Measured from their 4K master (research/nouscon): it's synthetic, not a
// re-photograph. The grille is luminance-only (R, G and B stripes in phase),
// the grade is a single luma -> color curve, and the soft focus falls off
// toward the left and right edges only.
//
// Order matters and mimics a camera looking at a screen:
//   source -> grade (ramp) -> grille (screen space)
//   -> curvature, edge blur, green/magenta convergence fringe, bloom (camera)

export type ScreenPainter = (ctx: CanvasRenderingContext2D, t: number, frame: number) => void;

export type ScreenPassOptions = {
  width: number;
  height: number;
  start?: number;
  duration: number;
  fps?: number;
  /** Draws a grayscale picture (white = light) each frame. */
  paint: ScreenPainter;
  /** Gradient map from black to white, any number of stops. */
  ramp?: string[];
  /** Grille period in px at this render size. 0 turns it off. */
  pitch?: number;
  /** 0-1 how dark the gaps between stripes get. */
  grille?: number;
  /** 0-1 strength of the faint horizontal beading inside stripes. */
  beads?: number;
  /** Horizontal cylinder curvature, 0 = flat. */
  curve?: number;
  /** Extra curvature in both axes, for a bulging tube (a scope, a TV). */
  curveY?: number;
  /** Keep the source's colors (teletext, color plates) instead of the ramp. */
  colorMode?: boolean;
  /** Blur radius in px everywhere, the lens never being quite sharp. */
  softness?: number;
  /** Extra blur radius in px at the left/right edges. */
  edgeBlur?: number;
  /** Exponent for how fast blur grows away from the center column. */
  edgeFalloff?: number;
  /** Green channel offset in px at the center, grows toward the edges. */
  fringe?: number;
  /** 0-1 glow around highlights. */
  bloom?: number;
  /** 0-1 fine moving noise. */
  grain?: number;
  /**
   * Per-frame overrides of the numeric settings, for A/B tests and
   * animation. Also drives the two distortions, which bend the picture but
   * not the grille, like their water-drop and glass-lens transitions:
   * ripple (centre px, age in seconds, amplitude px; age < 0 is off) and
   * lens (centre px, radius px, strength 0-1; radius 0 is off).
   */
  tune?: (t: number) => Partial<ScreenSettings>;
};

export type ScreenSettings = {
  pitch: number;
  grille: number;
  beads: number;
  curve: number;
  curveY: number;
  softness: number;
  edgeBlur: number;
  edgeFalloff: number;
  fringe: number;
  bloom: number;
  grain: number;
  rippleX: number;
  rippleY: number;
  rippleAge: number;
  rippleAmp: number;
  lensX: number;
  lensY: number;
  lensR: number;
  lensK: number;
};

/**
 * A ramp from key colours at positions 0-1, resampled to `steps` evenly
 * spaced stops. Lets a ramp put most of its range where the picture lives
 * (blueprint paper sits at 0.12, so the dark end is reserved for the table).
 */
export function makeRamp(keys: readonly (readonly [number, string])[], steps = 32): string[] {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const x = i / (steps - 1);
    let k = 0;
    while (k < keys.length - 2 && x > keys[k + 1][0]) k++;
    const [x0, c0] = keys[k];
    const [x1, c1] = keys[k + 1];
    const f = (x - x0) / (x1 - x0);
    const a = rgb(c0);
    const b = rgb(c1);
    out.push("#" + a.map((v, j) => Math.round(v + (b[j] - v) * f).toString(16).padStart(2, "0")).join(""));
  }
  return out;
}

/** Blueprint: dark table, Prussian paper at 0.12, lines up to near white. */
export const blueprintRamp = makeRamp([[0, "#071634"], [0.12, "#164B95"], [0.25, "#2C61AC"], [0.5, "#6F9AD3"], [0.8, "#C9DCF4"], [1, "#F1F6FF"]]);

/** Amber phosphor (P3-ish), black to white-hot. */
export const phosphorRamp = ["#040201", "#120803", "#2A1204", "#4A2005", "#723306", "#9A4A0A", "#C46512", "#E8841F", "#F7A23A", "#FFC062", "#FFD890", "#FFEBC2", "#FFF7E8"];

/** A look an aesthetic can carry: the ramp plus any numeric settings. */
export type ScreenLook = Partial<ScreenSettings> & {ramp?: string[]; colorMode?: boolean};

/** The 16-step grade measured from the reference, black to white. */
export const prussianRamp = [
  "#060D18", "#0A172A", "#112A46", "#1A3D5D", "#234E70", "#2F5F81", "#3D7091", "#4981A2",
  "#5A91B1", "#6FA0BC", "#84AFC8", "#9BBED2", "#B1CCDB", "#CADBE4", "#E0E9EC", "#F0F4F4",
];

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D src;
uniform sampler2D ramp;
uniform vec2 res;
uniform float pitch, grille, beads, curve, softness, edgeBlur, edgeFalloff, fringe, bloom, grain, time;
uniform float rippleX, rippleY, rippleAge, rippleAmp, lensX, lensY, lensR, lensK;
uniform float colorMode, curveY;

// Where the picture is read from: the screen position bent by the ripple and
// the lens. The grille is not bent; it belongs to the screen.
vec2 warp(vec2 px) {
  if (rippleAge >= 0.0) {
    vec2 d = px - vec2(rippleX, rippleY);
    float r = length(d) + 1e-3;
    float front = rippleAge * res.x * 0.55;
    float wl = res.x * 0.035;
    // A few rings just behind the expanding front, fading as they age.
    float band = exp(-pow((r - front) / (wl * 2.5), 2.0)) + 0.35 * smoothstep(front, 0.0, r);
    float w = sin((r - front) / wl * 6.2831853) * band * exp(-rippleAge * 1.6);
    px += d / r * w * rippleAmp;
  }
  if (lensR > 0.0) {
    vec2 d = px - vec2(lensX, lensY);
    float r = length(d) / lensR;
    if (r < 1.0) px = vec2(lensX, lensY) + d * mix(1.0, r * r * 0.6 + 0.4, lensK);
  }
  return px;
}

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// Source luminance at a screen position (px, y down).
float lum(vec2 px) {
  return dot(texture(src, px / res).rgb, LUMA);
}

// The "screen": graded and gridded, as one luminance-like value per channel
// lookup. Returns linear brightness 0-1 before the ramp.
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// The screen at px, with the picture read from px - shift. Only the picture
// is offset by the convergence fringe; the grille stays put, because the
// reference's stripes are in phase across R, G and B.
vec3 screenAt(vec2 px, float shift) {
  vec3 c = texture(src, (warp(px) - vec2(shift, 0.0)) / res).rgb;
  float l = dot(c, LUMA);
  if (lensR > 0.0) {
    // The lens rim catches light.
    float r = length(px - vec2(lensX, lensY)) / lensR;
    c += lensK * 0.5 * smoothstep(0.86, 0.97, r) * smoothstep(1.02, 0.97, r);
  }
  if (pitch > 0.0) {
    // Mean-preserving ripple on luminance, before the ramp. Fades out toward
    // white so bright type reads almost solid, as it does in the reference.
    float col = floor(px.x / pitch);
    // Narrow dark gaps between wide bright stripes: gap peaks at the stripe
    // boundary and is ~0 across most of the stripe. 0.3125 is its mean, so
    // the mask averages to 1 and the picture keeps its brightness.
    // (Named phase, not c: an inner "float c" here once shadowed the colour
    // and silently turned the whole grille into a no-op.)
    float phase = 0.5 - 0.5 * cos(6.2831853 * px.x / pitch);
    float gap = phase * phase * phase;
    // Beads: the bright stripe is beaded (phosphor slots), staggered on
    // alternate columns; the dark gaps stay continuous lines.
    float bead = 0.5 - 0.5 * cos(6.2831853 * (px.y / (pitch * 0.5) + 0.5 * mod(col, 2.0)));
    // Fibre: per-column, per-bead jitter so stripes aren't machine-perfect.
    float fib = hash(vec2(col, floor(px.y / (pitch * 0.5)))) - 0.5;
    float amp = grille * (1.0 - 0.85 * smoothstep(0.45, 0.95, l));
    float stripe = 3.2 * (0.3125 - gap) - beads * (1.0 - phase) * (bead - 0.5) * 2.0;
    float mask = 1.0 + amp * stripe + 0.1 * grille * fib;
    c *= mask;
  }
  return c;
}

void main() {
  vec2 px = vec2(uv.x, 1.0 - uv.y) * res;
  // Camera-side curvature: a cylinder, so only x bends.
  float cx = px.x / res.x * 2.0 - 1.0;
  float cy = px.y / res.y * 2.0 - 1.0;
  float bend = 1.0 + curve * cx * cx + curveY * cy * cy;
  float bendY = 1.0 + curveY * (cx * cx + cy * cy);
  vec2 q = vec2((cx * bend * 0.5 + 0.5) * res.x, (cy * bendY * 0.5 + 0.5) * res.y);

  // Focus: sharp in a center column, soft toward left/right.
  float side = pow(abs(cx), edgeFalloff);
  float r = softness + edgeBlur * side;
  float fr = fringe * (0.6 + 0.8 * side);

  // Golden-angle disc blur; each tap reads the gridded screen, so the grille
  // itself goes soft where focus drops, which is what the reference does.
  const int TAPS = 24;
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = 0; i < TAPS; i++) {
    float fi = float(i);
    float rr = r * sqrt((fi + 0.5) / float(TAPS));
    float a = fi * 2.39996323;
    vec2 o = vec2(cos(a), sin(a)) * rr;
    // Green displaced right of red/blue: magenta on a white glyph's left
    // edge, green on its right edge.
    vec3 a0 = screenAt(q + o, 0.0);
    vec3 a1 = screenAt(q + o, fr);
    // Ramp mode keeps luminance per channel for the ramp lookup below;
    // color mode keeps the source colors.
    acc += colorMode > 0.5 ? vec3(a0.r, a1.g, a0.b) : vec3(dot(a0, LUMA), dot(a1, LUMA), dot(a0, LUMA));
    wsum += 1.0;
  }
  vec3 l = acc / wsum;

  if (bloom > 0.0) {
    vec3 glow = vec3(0.0);
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      float a = fi * 2.39996323;
      vec2 o = vec2(cos(a), sin(a)) * (6.0 + 3.0 * fi) * res.x / 2560.0;
      glow += colorMode > 0.5 ? texture(src, (q + o) / res).rgb : vec3(lum(q + o));
    }
    glow /= 12.0;
    l += bloom * glow * glow;
  }

  if (grain > 0.0) l += grain * (hash(px + time * 91.7) - 0.5) * 0.12;
  l = clamp(l, 0.0, 1.0);

  // Outside a bent tube there is no picture.
  if (q.x < 0.0 || q.y < 0.0 || q.x > res.x || q.y > res.y) l = vec3(0.0);
  if (colorMode > 0.5) { color = vec4(l, 1.0); return; }
  // Ramp per channel: red and blue from one sample, green from the shifted one.
  vec3 rbCol = texture(ramp, vec2(l.r, 0.5)).rgb;
  vec3 gCol = texture(ramp, vec2(l.g, 0.5)).rgb;
  color = vec4(rbCol.r, gCol.g, rbCol.b, 1.0);
}`;

function hexToRgb(hex: string): number[] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function screenPass(container: HTMLElement, timeline: gsap.core.Timeline, options: ScreenPassOptions): HTMLCanvasElement {
  const {
    width: w,
    height: h,
    start = 0,
    duration,
    fps = 30,
    paint,
    ramp = prussianRamp,
    pitch = (11.5 * w) / 3840,
    grille = 0.55,
    beads = 0.12,
    curve = 0.03,
    curveY = 0,
    colorMode = false,
    softness = (2 * w) / 3840,
    edgeBlur = (10 * w) / 3840,
    edgeFalloff = 2.2,
    fringe = (3 * w) / 3840,
    bloom = 0.25,
    grain = 0.3,
  } = options;

  const out = el("canvas", "k-layer k-screen", container);
  out.dataset.layoutAllowOverflow = "";
  out.width = w;
  out.height = h;
  const gl = out.getContext("webgl2", {preserveDrawingBuffer: true, antialias: false})!;

  const source = document.createElement("canvas");
  source.width = w;
  source.height = h;
  const ctx = source.getContext("2d")!;

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
  const srcTex = texture(0);
  const rampTex = texture(1);
  // Ramp resampled to 256 entries so the stops interpolate evenly.
  const stops = ramp.map(hexToRgb);
  const lut = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    const x = (i / 255) * (stops.length - 1);
    const a = Math.floor(x);
    const b = Math.min(stops.length - 1, a + 1);
    const f = x - a;
    for (let c = 0; c < 3; c++) lut[i * 4 + c] = Math.round(stops[a][c] * (1 - f) + stops[b][c] * f);
    lut[i * 4 + 3] = 255;
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, lut);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u("src"), 0);
  gl.uniform1i(u("ramp"), 1);
  gl.uniform1f(u("colorMode"), colorMode ? 1 : 0);
  gl.uniform2f(u("res"), w, h);
  const base: ScreenSettings = {
    pitch, grille, beads, curve, curveY, softness, edgeBlur, edgeFalloff, fringe, bloom, grain,
    rippleX: w / 2, rippleY: h / 2, rippleAge: -1, rippleAmp: 0, lensX: 0, lensY: 0, lensR: 0, lensK: 0,
  };
  const apply = (settings: ScreenSettings) => {
    for (const [name, value] of Object.entries(settings)) gl.uniform1f(u(name), value);
  };
  apply(base);
  const uTime = u("time");
  gl.viewport(0, 0, w, h);

  timeDriver(timeline, {start, duration, fps}, (t, frame) => {
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    paint(ctx, t, frame);
    ctx.restore();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    if (options.tune) apply({...base, ...options.tune(t)});
    gl.uniform1f(uTime, frame % 997);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });

  return out;
}

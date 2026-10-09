import {webgl2, fullscreenProgram, linearTexture} from "../passes/gl";

// Shutter drag: one frame exposed over a finite interval, with a flash
// somewhere inside it. Light from the whole interval piles up into trails;
// the flash adds one short, bright exposure that freezes the subject at a
// single instant. The trails and the sharp image are two parts of the same
// exposure, not a smeared copy laid over a sharp one.
//
// For output time t, with a shutter open for `duration` seconds:
//
//   ambient samples  s_i at t - duration * u_i,  u_i = (i + 0.5) / n
//                    weights w_i ∝ 1 - fade * u_i, summing to 1 - flash
//   flash sample     s_f at t - duration * flashAt, weight `flash`
//
//   frame = Σ w_i · source(s_i) + flash · source(s_f)     (in linear light)
//
// Weights always sum to 1, so a part of the picture that doesn't move
// comes out exactly as the source paints it, however long the shutter;
// only moving things leave trails. With duration 0 every sample is at t and
// the frame is the source (to within one 8-bit level from the linear round
// trip). `flashAt` 0 is rear-curtain sync (the flash fires as the shutter
// closes, so trails lead up to the sharp subject), 1 is front-curtain.
//
// Intensity is summed in linear light on a half-float buffer, so faint
// trails keep their gradation and nothing clips on the way in (eight
// identical samples are not brighter than one). Lights brighter than a
// canvas can paint go in `glow` with a gain; they clip only at the end. It's an arrangement: the
// result is opaque RGB for any pass, or none.
//
// Stateless: each frame paints the source n + 1 times at fixed times and
// sums them. No previous frame, no history buffer, no cache, so any seek
// order gives the same picture. The price is n + 1 source paints and
// uploads per frame; `samples` is the quality knob (see the doc for a
// measured curve).

export type ShutterSource = (ctx: CanvasRenderingContext2D, sourceTime: number) => void;

export type ExposureOptions = {
  /** Shutter open time in seconds. 0 = the source at t. */
  duration: number;
  /** Ambient samples across the interval. */
  samples: number;
  /** Weight of the flash sample, 0-1. The ambient samples share the rest. */
  flash?: number;
  /** Where the flash fires, as a fraction of the interval back from t: 0 at t (rear curtain), 1 at the start. */
  flashAt?: number;
  /** 0: every instant counts equally. 1: the oldest light is weakest (trails fade into the past). */
  fade?: number;
};

export type ShutterOptions = ExposureOptions & {
  width: number;
  height: number;
  /** Paints the scene at a source time, over black. */
  source: ShutterSource;
  /** What the flash lights, if not the whole source (e.g. only the subject near the camera). */
  flashSource?: ShutterSource;
  /**
   * Luminous parts (a bulb, a headlight) painted on their own and summed at
   * `glowGain` times their painted intensity. A canvas can't paint a light
   * brighter than white, so without this a light's trail is only as bright
   * as white divided among the samples; a real bulb is far brighter than
   * the room and its streak saturates. Accumulated in the same float
   * buffer, before the clip.
   */
  glow?: ShutterSource;
  /** Intensity multiplier for `glow` (8 means eight times brighter than white). */
  glowGain?: number;
  /** Per-frame overrides of the exposure (a shutter that opens and closes over the piece). */
  tune?: (t: number) => Partial<ExposureOptions>;
};

export type ExposureSample = {time: number; weight: number; flash: boolean};

export type ShutterIntegrate = {
  (ctx: CanvasRenderingContext2D, t: number): void;
  /** The samples used for the last frame. */
  last: ExposureSample[];
};

/**
 * The sample times and weights at t. Pure. Weights are positive and sum to
 * 1; samples at the same time are merged (so duration 0 is one sample).
 */
export function exposureSamples(t: number, {duration, samples, flash = 0, flashAt = 0, fade = 0}: ExposureOptions): ExposureSample[] {
  const d = Math.max(0, duration);
  const fl = Math.min(1, Math.max(0, flash));
  const n = Math.max(1, Math.min(256, Math.floor(samples) || 1));
  const fd = Math.min(1, Math.max(0, fade));
  const raw: ExposureSample[] = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    const w = 1 - fd * u;
    raw.push({time: t - d * u, weight: w, flash: false});
    sum += w;
  }
  for (const s of raw) s.weight *= (1 - fl) / sum;
  if (fl > 0) raw.push({time: t - d * Math.min(1, Math.max(0, flashAt)), weight: fl, flash: true});
  // Merge samples that land on the same instant (a shutter of 0 is one paint).
  const out: ExposureSample[] = [];
  for (const s of raw) {
    if (s.weight <= 0) continue;
    const same = out.find((o) => o.time === s.time && o.flash === s.flash);
    if (same) same.weight += s.weight;
    else out.push({...s});
  }
  return out;
}

const VERT = `#version 300 es
layout(location = 0) in vec2 p;
out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

// Accumulate: one sample, decoded to linear, times its weight. Blended additively.
const ACC = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D src;
uniform float weight;
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void main() { color = vec4(toLinear(texture(src, vec2(uv.x, 1.0 - uv.y)).rgb) * weight, 1.0); }`;

// Resolve: the sum, back to sRGB, flipped to canvas orientation.
const RES = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
uniform sampler2D acc;
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
void main() { color = vec4(toSrgb(clamp(texture(acc, uv).rgb, 0.0, 1.0)), 1.0); }`;

/** A painter that exposes `source` over a shutter interval with an optional flash. */
export function shutterIntegrate(options: ShutterOptions): ShutterIntegrate {
  const {width: W, height: H, source, flashSource, glow, glowGain = 1, tune} = options;
  const glCanvas = document.createElement("canvas");
  glCanvas.width = W;
  glCanvas.height = H;
  const gl = webgl2(glCanvas, "shutterIntegrate");
  if (!gl.getExtension("EXT_color_buffer_float")) {
    throw new Error("shutterIntegrate: this WebGL2 has no float render targets (EXT_color_buffer_float), so it can't sum light without clipping.");
  }
  const accProg = fullscreenProgram(gl, "shutterIntegrate", VERT, ACC);
  const uWeight = gl.getUniformLocation(accProg, "weight");
  gl.uniform1i(gl.getUniformLocation(accProg, "src"), 0);
  const resProg = fullscreenProgram(gl, "shutterIntegrate", VERT, RES);
  gl.uniform1i(gl.getUniformLocation(resProg, "acc"), 1);

  const srcTex = linearTexture(gl, 0);
  const accTex = linearTexture(gl, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, accTex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("shutterIntegrate: the half-float accumulation buffer is incomplete on this WebGL2.");
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, W, H);

  const scratch = document.createElement("canvas");
  scratch.width = W;
  scratch.height = H;
  const sg = scratch.getContext("2d")!;

  const paint = ((ctx: CanvasRenderingContext2D, t: number) => {
    const opts = tune ? {...options, ...tune(t)} : options;
    const list = exposureSamples(t, opts);
    paint.last = list;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(accProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    const add = (painter: ShutterSource, time: number, weight: number) => {
      sg.save();
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.globalCompositeOperation = "source-over";
      sg.globalAlpha = 1;
      sg.filter = "none";
      sg.fillStyle = "#000";
      sg.fillRect(0, 0, W, H);
      painter(sg, time);
      sg.restore();
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
      gl.uniform1f(uWeight, weight);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    for (const s of list) {
      add(s.flash && flashSource ? flashSource : source, s.time, s.weight);
      if (glow) add(glow, s.time, s.weight * glowGain);
    }
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(resProg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.filter = "none";
    ctx.drawImage(glCanvas, 0, 0);
    ctx.restore();
  }) as ShutterIntegrate;
  paint.last = [];
  return paint;
}

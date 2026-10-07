import {el} from "../utils/dom";
import {seededRandom} from "../utils/random";

// Film grain: a tiled SVG noise layer that jumps to a new seeded offset a
// few times a second. Offsets come from the seed, so frames are reproducible.

export type GrainOptions = {
  /** 0–1 opacity; 0 adds nothing. */
  intensity: number;
  duration: number;
  seed?: number;
  /** Grain re-rolls per second. Film-ish at 12, busier at 24. */
  rate?: number;
  blend?: "multiply" | "overlay" | "screen" | "soft-light";
};

const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='7' stitchTiles='stitch'/>" +
  "<feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function grain(
  container: HTMLElement,
  timeline: gsap.core.Timeline,
  {intensity, duration, seed = 1, rate = 12, blend = "multiply"}: GrainOptions,
): HTMLElement | null {
  if (intensity <= 0) return null;
  const layer = el("div", "k-layer k-grain", container);
  Object.assign(layer.style, {backgroundImage: NOISE, opacity: String(intensity), mixBlendMode: blend});
  const random = seededRandom(seed);
  const steps = Math.ceil(duration * rate);
  for (let i = 0; i < steps; i++) {
    timeline.set(layer, {x: -Math.round(random() * 256), y: -Math.round(random() * 256)}, i / rate);
  }
  return layer;
}

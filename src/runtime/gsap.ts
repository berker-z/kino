import type {gsap as GsapInstance} from "gsap";

// GSAP is loaded by the page (vendor/gsap.min.js), not bundled, so the
// HyperFrames runtime and the library drive the same instance. Import it from
// here instead of from "gsap".
export function getGsap(): typeof GsapInstance {
  const instance = (globalThis as {gsap?: typeof GsapInstance}).gsap;
  if (!instance) throw new Error("kino: load vendor/gsap.min.js before vendor/kino.js");
  return instance;
}

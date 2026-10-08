import {el} from "../../utils/dom";

// Static edge darkening. Intensity 0 adds nothing.
export function vignette(container: HTMLElement, {intensity}: {intensity: number}): HTMLElement | null {
  if (intensity <= 0) return null;
  const layer = el("div", "k-layer k-vignette", container);
  layer.style.opacity = String(intensity);
  return layer;
}

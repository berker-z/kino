import {el} from "../../utils/dom";

// Glass on top of everything: scanlines, a curved-tube vignette, and a faint
// phosphor wash. Static layers; the motion lives in what is underneath.

export type CrtOptions = {
  /** 0–1 */
  scanlines: number;
  /** 0–1 */
  vignette: number;
  /** Tint for the phosphor wash. */
  phosphor?: string;
};

export function crt(container: HTMLElement, {scanlines, vignette, phosphor}: CrtOptions): HTMLElement {
  const glass = el("div", "k-layer k-crt", container);
  if (phosphor) {
    const wash = el("div", "k-layer k-crt-wash", glass);
    wash.style.background = `radial-gradient(ellipse at center, ${phosphor} 0%, transparent 70%)`;
  }
  if (scanlines > 0) el("div", "k-layer k-crt-scanlines", glass).style.opacity = String(scanlines);
  if (vignette > 0) el("div", "k-layer k-crt-vignette", glass).style.opacity = String(vignette);
  return glass;
}

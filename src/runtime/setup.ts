import css from "../styles/kino.css";
import fonts from "../tokens/fonts.json";
import type {MotionAesthetic} from "../looks";

let injected = false;

function injectStyles(): void {
  if (injected) return;
  const style = document.createElement("style");
  style.dataset.kino = "";
  style.textContent = css;
  document.head.appendChild(style);
  injected = true;
}

/**
 * Injects the library CSS and waits for every font the aesthetic uses.
 * Build the timeline inside .then(): text must be measured with real fonts.
 */
export async function whenReady(aesthetic: MotionAesthetic): Promise<void> {
  injectStyles();
  const families = new Set([aesthetic.typography.display, aesthetic.typography.body, aesthetic.typography.mono]);
  const loads: Promise<unknown>[] = [];
  for (const family of families) {
    const entry = (fonts as Record<string, {weights: number[]}>)[family];
    if (!entry) throw new Error(`kino: font "${family}" is not in src/tokens/fonts.json`);
    for (const weight of entry.weights) loads.push(document.fonts.load(`${weight} 32px "${family}"`));
  }
  await Promise.all(loads);
  await document.fonts.ready;
}

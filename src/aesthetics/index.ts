import {brutalistEditorial} from "./brutalist-editorial";
import {cyanotype} from "./cyanotype";
import {nordTerminal} from "./nord-terminal";
import {signalDither} from "./signal-dither";
import type {MotionAesthetic} from "./types";

export {brutalistEditorial, cyanotype, nordTerminal, signalDither};
export type {MotionAesthetic};

export const aesthetics = {brutalistEditorial, cyanotype, nordTerminal, signalDither} as const;
export type AestheticName = keyof typeof aesthetics;

/** Writes an aesthetic onto an element as CSS custom properties + data attributes. */
export function applyAesthetic(element: HTMLElement, a: MotionAesthetic): void {
  const vars: Record<string, string> = {
    "--k-bg": a.palette.background,
    "--k-fg": a.palette.foreground,
    "--k-muted": a.palette.muted,
    "--k-accent": a.palette.accent,
    "--k-surface": a.palette.surface,
    "--k-line": a.palette.line,
    "--k-font-display": `"${a.typography.display}"`,
    "--k-font-body": `"${a.typography.body}"`,
    "--k-font-mono": `"${a.typography.mono}"`,
    "--k-display-weight": String(a.typography.displayWeight),
    "--k-body-weight": String(a.typography.bodyWeight),
    "--k-display-case": a.typography.displayCase === "upper" ? "uppercase" : "none",
    "--k-display-leading": String(a.typography.displayLeading),
    "--k-display-tracking": `${a.typography.displayTracking}em`,
    "--k-radius": `${a.surfaces.radius}px`,
    "--k-border": `${a.surfaces.borderWidth}px`,
    "--k-glow": String(a.texture.glow),
  };
  for (const [key, size] of Object.entries(a.spacing)) vars[`--k-${key}`] = `${size}px`;
  for (const [key, value] of Object.entries(vars)) element.style.setProperty(key, value);
  element.dataset.aesthetic = a.name;
}

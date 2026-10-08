import {prussianRamp} from "../passes/screen-pass";
import type {MotionAesthetic} from "./types";

// Cyanotype on a Trinitron, learned from the NousCon teaser
// (research/nouscon). One Prussian-blue ramp for every frame, a synthetic
// aperture grille, a lens that is never quite sharp and softer at the sides,
// green/magenta convergence on type. Everything, type included, is painted
// in grayscale and pushed through screenPass with `texture.screen`.
//
// Two type voices: a heavy grotesk for statements, a mono for captions.
// Motion is calm and constant; transitions are physical (torn print, lens).

export const cyanotype: MotionAesthetic = {
  name: "cyanotype",
  palette: {
    background: prussianRamp[1],
    foreground: prussianRamp[14],
    muted: prussianRamp[8],
    accent: prussianRamp[15],
    surface: prussianRamp[3],
    line: prussianRamp[5],
  },
  typography: {
    display: "Inter Tight",
    body: "IBM Plex Mono",
    mono: "IBM Plex Mono",
    displayWeight: 800,
    bodyWeight: 500,
    displayCase: "upper",
    displayLeading: 0.95,
    displayTracking: -0.01,
  },
  spacing: {xs: 8, sm: 16, md: 40, lg: 96, xl: 156},
  motion: {
    fast: 0.2,
    normal: 0.5,
    slow: 1.2,
    easing: {enter: "power3.out", exit: "power2.in", emphasis: "none"},
    stagger: 0.08,
    textEntrance: "mask-rise",
    sceneExit: "settle-out",
  },
  layout: {hero: "asymmetric"},
  surfaces: {radius: 0, borderWidth: 0},
  texture: {
    grain: 0,
    vignette: 0,
    glow: 0,
    grid: "none",
    // Tuned at 2560x1440 against the 4K reference (round 6, try B, scaled).
    screen: {ramp: prussianRamp, grille: 0.34, beads: 0.35, softness: 2, fringe: 5.5, edgeBlur: 5.5, bloom: 0.2, grain: 0.2},
  },
};

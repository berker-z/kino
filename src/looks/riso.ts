import {risoInks} from "../passes/riso-pass";
import type {MotionAesthetic} from "./types";

// Riso: two inks, fluorescent pink over blue on cream stock
// (compositions/risograph). Paint two separations and print them with
// risoPass: halftone at 15° / 75°, drums off register, uneven ink, overprint
// going purple.
//
// Motion grammar: one print run, never a page turn (printRun). The pink drum
// drifts out of register across each bar and lands back on the downbeat
// (registerDrift). The bass swells dot size. No instant position jumps.

export const riso: MotionAesthetic = {
  name: "riso",
  palette: {
    background: "#F3EEE3",
    foreground: risoInks.blue,
    muted: "#8A9BB0",
    accent: risoInks.fluorescentPink,
    surface: "#E9E2D3",
    line: risoInks.blue,
  },
  typography: {
    display: "Anton",
    body: "IBM Plex Mono",
    mono: "IBM Plex Mono",
    displayWeight: 400,
    bodyWeight: 500,
    displayCase: "upper",
    displayLeading: 0.92,
    displayTracking: 0,
  },
  spacing: {xs: 8, sm: 16, md: 40, lg: 96, xl: 156},
  motion: {
    fast: 0.2,
    normal: 0.6,
    slow: 1.4,
    easing: {enter: "sine.inOut", exit: "sine.inOut", emphasis: "none"},
    stagger: 0.1,
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
    riso: {inkA: risoInks.fluorescentPink, inkB: risoInks.blue, paper: "#F3EEE3", cell: 9, offAX: 5, offAY: -4, offBX: -3, offBY: 2, grain: 0.6},
  },
};

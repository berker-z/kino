import {phosphorRamp} from "../passes/screen-pass";
import type {MotionAesthetic} from "./types";

// Phosphor: an amber oscilloscope tube (compositions/oscilloscope). Draw with
// light: black ground, the beam source stroked additively, persistence
// recomputed from time. screenPass bulges the glass in both axes, adds heavy
// bloom and no grille. Amber, not green: green phosphor is the cliché.
//
// Motion grammar: the picture is always the signal. Modes change by
// squashing to a line and reopening, like turning the mode knob.

export const phosphor: MotionAesthetic = {
  name: "phosphor",
  palette: {
    background: phosphorRamp[0],
    foreground: phosphorRamp[9],
    muted: phosphorRamp[5],
    accent: phosphorRamp[11],
    surface: phosphorRamp[1],
    line: phosphorRamp[3],
  },
  typography: {
    display: "Antonio",
    body: "IBM Plex Mono",
    mono: "IBM Plex Mono",
    displayWeight: 700,
    bodyWeight: 500,
    displayCase: "upper",
    displayLeading: 0.95,
    displayTracking: 0,
  },
  spacing: {xs: 8, sm: 16, md: 40, lg: 96, xl: 156},
  motion: {
    fast: 0.1,
    normal: 0.22,
    slow: 0.9,
    easing: {enter: "power2.out", exit: "power2.in", emphasis: "none"},
    stagger: 0.05,
    textEntrance: "type-on",
    sceneExit: "settle-out",
  },
  layout: {hero: "framed"},
  surfaces: {radius: 0, borderWidth: 0},
  texture: {
    grain: 0,
    vignette: 0,
    glow: 0,
    grid: "rules",
    screen: {ramp: phosphorRamp, pitch: 0, curve: 0.04, curveY: 0.05, softness: 1.4, edgeBlur: 2, fringe: 0, bloom: 0.55, grain: 0.25},
  },
};

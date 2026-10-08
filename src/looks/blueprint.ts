import {blueprintRamp} from "../passes/screen-pass";
import type {MotionAesthetic} from "./types";

// Blueprint: white lines on Prussian paper, an engineering sheet that draws
// itself while a camera travels across it (compositions/blueprint). A print,
// not a screen: screenPass with the grille, fringe and bend off, keeping the
// ramp, a little blur for ink bleed and paper grain. Paint paper at ~0.12
// gray and ink at ~0.95; the dark end of the ramp is the table under the sheet.
//
// Motion grammar: no cuts. Glides between details (sheetCamera), slow drift
// while holding, everything drawn with the pen kit in drafting order.

export const blueprint: MotionAesthetic = {
  name: "blueprint",
  palette: {
    background: blueprintRamp[4],
    foreground: blueprintRamp[30],
    muted: blueprintRamp[16],
    accent: blueprintRamp[31],
    surface: blueprintRamp[6],
    line: blueprintRamp[10],
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
    fast: 0.3,
    normal: 0.8,
    slow: 1.6,
    easing: {enter: "power3.inOut", exit: "power3.inOut", emphasis: "none"},
    stagger: 0.12,
    textEntrance: "type-on",
    sceneExit: "settle-out",
  },
  layout: {hero: "framed"},
  surfaces: {radius: 0, borderWidth: 3},
  texture: {
    grain: 0,
    vignette: 0,
    glow: 0,
    grid: "rules",
    screen: {ramp: blueprintRamp, pitch: 0, curve: 0, softness: 1.3, edgeBlur: 0, fringe: 0, bloom: 0.12, grain: 0.15},
  },
};

import type {MotionAesthetic} from "./types";

// One ink on one ground, every picture crushed through an ordered dither and
// shown on a CRT. Type stays crisp on top: the world is dithered, the words
// are not. Motion is stepped, and hits move the picture rather than strobe it.

/** Two-color schemes for the dither: [ink, ground]. */
export const signalPalettes = {
  boneOnSoot: {ink: "#E8E2D4", ground: "#0E0D0C"},
  cobaltOnPaper: {ink: "#1F2BFF", ground: "#ECE8DF"},
  rustOnInk: {ink: "#E4572E", ground: "#101114"},
  iceOnNavy: {ink: "#BFD4FF", ground: "#0A1022"},
} as const;

export const signalDither: MotionAesthetic = {
  name: "signalDither",
  palette: {
    background: signalPalettes.iceOnNavy.ground,
    foreground: signalPalettes.iceOnNavy.ink,
    muted: "#7F92B8",
    accent: signalPalettes.iceOnNavy.ink,
    surface: "#111A33",
    line: "rgba(191, 212, 255, 0.16)",
  },
  typography: {
    display: "Antonio",
    body: "IBM Plex Mono",
    mono: "IBM Plex Mono",
    displayWeight: 400,
    bodyWeight: 400,
    displayCase: "upper",
    displayLeading: 0.9,
    displayTracking: 0,
  },
  spacing: {xs: 8, sm: 16, md: 32, lg: 56, xl: 72},
  motion: {
    fast: 0.08,
    normal: 0.2,
    slow: 0.5,
    easing: {enter: "steps(4)", exit: "steps(3)", emphasis: "steps(6)"},
    stagger: 0.06,
    textEntrance: "type-on",
    sceneExit: "settle-out",
  },
  layout: {hero: "framed"},
  surfaces: {radius: 0, borderWidth: 1},
  texture: {grain: 0, vignette: 0.6, glow: 0, grid: "none", dither: {cell: 3, matrix: 8}, scanlines: 0.28},
};

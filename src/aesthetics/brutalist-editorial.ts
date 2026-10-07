import type {MotionAesthetic} from "./types";

// Off-white paper, black ink, one loud accent. Fast, near-linear moves, hard
// masks, visible grid, asymmetric poster layout.
export const brutalistEditorial: MotionAesthetic = {
  name: "brutalistEditorial",
  palette: {
    background: "#ECE9E2",
    foreground: "#0D0D0D",
    muted: "#6B6862",
    accent: "#FF3D00",
    surface: "#E2DED5",
    line: "rgba(13, 13, 13, 0.14)",
  },
  typography: {
    display: "Anton",
    body: "Inter Tight",
    mono: "JetBrains Mono",
    displayWeight: 400,
    bodyWeight: 500,
    displayCase: "upper",
    displayLeading: 0.86,
    displayTracking: -0.005,
  },
  spacing: {xs: 8, sm: 16, md: 32, lg: 64, xl: 96},
  motion: {
    fast: 0.28,
    normal: 0.45,
    slow: 0.8,
    easing: {enter: "expo.out", exit: "expo.in", emphasis: "power4.inOut"},
    stagger: 0.08,
    textEntrance: "mask-rise",
    sceneExit: "accent-flood",
  },
  layout: {hero: "asymmetric"},
  surfaces: {radius: 0, borderWidth: 3},
  texture: {grain: 0.16, vignette: 0, glow: 0, grid: "rules"},
};

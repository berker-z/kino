import type {MotionAesthetic} from "./types";

// Nord palette, monospace, thin borders, restrained cubic motion. Developer
// tooling, not hacker movie: one window surface, a caret, coordinate hints.
export const nordTerminal: MotionAesthetic = {
  name: "nordTerminal",
  palette: {
    background: "#242933",
    foreground: "#ECEFF4",
    muted: "#8F9AAF",
    accent: "#88C0D0",
    surface: "#2E3440",
    line: "#434C5E",
  },
  typography: {
    display: "JetBrains Mono",
    body: "JetBrains Mono",
    mono: "JetBrains Mono",
    displayWeight: 700,
    bodyWeight: 400,
    displayCase: "as-written",
    displayLeading: 1.18,
    displayTracking: -0.02,
  },
  spacing: {xs: 8, sm: 16, md: 28, lg: 56, xl: 120},
  motion: {
    fast: 0.35,
    normal: 0.7,
    slow: 1.1,
    easing: {enter: "power3.out", exit: "power2.in", emphasis: "power2.inOut"},
    stagger: 0.12,
    textEntrance: "type-on",
    sceneExit: "settle-out",
  },
  layout: {hero: "framed"},
  surfaces: {radius: 12, borderWidth: 1},
  texture: {grain: 0.05, vignette: 0.45, glow: 0.35, grid: "dots"},
};

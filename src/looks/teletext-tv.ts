import type {MotionAesthetic} from "./types";

// Teletext on a living-room TV (compositions/teletext). The picture is
// built by the teletext source (eight colours, character cells, block
// mosaics) and shown through screenPass in colour mode: shadow-mask grille,
// glass curved both ways, soft focus at the sides, a little convergence.
//
// Motion grammar: pages, not shots. A page change rolls the header's page
// number while the set "searches", then paints the new page row by row.
// Pictures can't scroll smoothly; they step, on the beat. No flash attribute.

export const teletextTV: MotionAesthetic = {
  name: "teletextTV",
  palette: {
    background: "#000000",
    foreground: "#FFFFFF",
    muted: "#00FFFF",
    accent: "#FFFF00",
    surface: "#0000FF",
    line: "#00FFFF",
  },
  typography: {
    display: "JetBrains Mono",
    body: "JetBrains Mono",
    mono: "JetBrains Mono",
    displayWeight: 700,
    bodyWeight: 700,
    displayCase: "upper",
    displayLeading: 1,
    displayTracking: 0,
  },
  spacing: {xs: 8, sm: 16, md: 32, lg: 64, xl: 128},
  motion: {
    fast: 0.05,
    normal: 0.4,
    slow: 0.8,
    easing: {enter: "steps(25)", exit: "steps(25)", emphasis: "steps(1)"},
    stagger: 0.016,
    textEntrance: "type-on",
    sceneExit: "settle-out",
  },
  layout: {hero: "framed"},
  surfaces: {radius: 0, borderWidth: 0},
  texture: {
    grain: 0,
    vignette: 0,
    glow: 0,
    grid: "none",
    screen: {colorMode: true, grille: 0.45, beads: 0.3, curve: 0.045, curveY: 0.035, softness: 1.8, edgeBlur: 3, fringe: 3, bloom: 0.3, grain: 0.15},
  },
};

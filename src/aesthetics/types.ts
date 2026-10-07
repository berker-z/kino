// An aesthetic is a motion grammar, not a theme: besides palette and type it
// decides how things enter, leave, and where they sit. Scenes read these
// fields instead of hardcoding a look. Add fields only when a component needs
// one.

export type MotionAesthetic = {
  name: string;

  palette: {
    background: string;
    foreground: string;
    muted: string;
    accent: string;
    /** Panel / raised-surface fill. */
    surface: string;
    /** Hairlines: grid, borders, rules. */
    line: string;
  };

  typography: {
    /** Family names must exist in src/tokens/fonts.json. */
    display: string;
    body: string;
    mono: string;
    displayWeight: number;
    bodyWeight: number;
    displayCase: "upper" | "as-written";
    /** Unitless line-height for display text. */
    displayLeading: number;
    /** em */
    displayTracking: number;
  };

  spacing: {xs: number; sm: number; md: number; lg: number; xl: number};

  motion: {
    /** Seconds. */
    fast: number;
    normal: number;
    slow: number;
    easing: {enter: string; exit: string; emphasis: string};
    /** Seconds between siblings in a staggered group. */
    stagger: number;
    /** How display text arrives. */
    textEntrance: "mask-rise" | "type-on";
    /** How a scene leaves. */
    sceneExit: "accent-flood" | "settle-out";
  };

  layout: {
    /** asymmetric: poster-like, edge-anchored. framed: centered in a window surface. */
    hero: "asymmetric" | "framed";
  };

  surfaces: {radius: number; borderWidth: number};

  texture: {
    /** 0–1, 0 disables. */
    grain: number;
    vignette: number;
    /** Text glow on display type, 0 disables. */
    glow: number;
    grid: "rules" | "dots" | "none";
    /** 1-bit ordered dither. cell = screen px per dither pixel. */
    dither?: {cell: number; matrix: 4 | 8};
    /** 0–1 CRT scanline strength. */
    scanlines?: number;
  };
};

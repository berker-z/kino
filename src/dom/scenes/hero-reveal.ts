import {applyAesthetic, type MotionAesthetic} from "../../looks";
import {fitToWidth} from "../components/animated-text";
import {heroTitle, type HeroTitleProps} from "../components/hero-title";
import {grain} from "../effects/grain";
import {grid} from "../effects/grid";
import {vignette} from "../effects/vignette";
import {fade} from "../motion/fade";
import {maskReveal, wipe} from "../motion/mask-reveal";
import {slide} from "../motion/slide";
import {blink, typewriter} from "../motion/typewriter";
import {el} from "../../utils/dom";

// Opening scene: background structure, headline, subheadline, exit. The same
// props render as a poster in brutalistEditorial and as a window in
// nordTerminal; the aesthetic picks layout, entrance, exit and texture.

export type HeroRevealOptions = HeroTitleProps & {
  aesthetic: MotionAesthetic;
  /** Seconds on the timeline where the scene begins. */
  start?: number;
  /** Seconds, including the exit. */
  duration: number;
  /** Canvas size in px. */
  width?: number;
  height?: number;
  seed?: number;
};

export function heroReveal(container: HTMLElement, timeline: gsap.core.Timeline, options: HeroRevealOptions): HTMLElement {
  const {aesthetic: a, start = 0, duration, width = 1920, seed = 1} = options;
  const scene = el("div", "k-scene k-hero", container);
  applyAesthetic(scene, a);
  scene.dataset.layout = a.layout.hero;

  const end = start + duration;
  const m = a.motion;

  grid(scene, timeline, {
    variant: a.texture.grid,
    start,
    duration: a.texture.grid === "rules" ? m.slow : m.slow * 1.5,
    margin: a.spacing.xl,
    easing: a.texture.grid === "rules" ? m.easing.emphasis : "power1.out",
  });

  if (a.layout.hero === "asymmetric") {
    posterLayout(scene, timeline, options, start, end, width);
  } else {
    windowLayout(scene, timeline, options, start, end);
  }

  vignette(scene, {intensity: a.texture.vignette});
  grain(scene, timeline, {
    intensity: a.texture.grain,
    duration: end,
    seed,
    blend: a.layout.hero === "asymmetric" ? "multiply" : "overlay",
  });
  return scene;
}

// Poster: hard rule, eyebrow block, oversized headline anchored bottom-left,
// subtitle pushed into the top-right column. Exits by flooding the accent.
function posterLayout(
  scene: HTMLElement,
  tl: gsap.core.Timeline,
  {aesthetic: a, eyebrow, title, subtitle}: HeroRevealOptions,
  start: number,
  end: number,
  width: number,
) {
  const m = a.motion;
  const rule = el("div", "k-rule", scene);
  const hero = heroTitle(scene, {eyebrow, title, subtitle});
  const bar = el("div", "k-accent-bar", scene);
  const flood = el("div", "k-flood", scene);

  fitToWidth(hero.title, {maxWidth: width - 2 * a.spacing.xl, maxSize: 260});

  wipe(tl, rule, {start: start + 0.15, duration: m.normal, easing: m.easing.emphasis});
  if (hero.eyebrow) wipe(tl, hero.eyebrow, {start: start + 0.3, duration: m.fast, easing: m.easing.emphasis});
  maskReveal(tl, hero.title.inners, {start: start + 0.4, duration: m.normal, easing: m.easing.enter, stagger: m.stagger});
  if (hero.subtitle) {
    slide(tl, hero.subtitle.words, {from: "left", distance: 24, start: start + 0.85, duration: m.fast, easing: "power3.out", stagger: 0.03});
  }
  wipe(tl, bar, {start: start + 1.1, duration: m.normal, easing: m.easing.emphasis});

  // Exit: type drops out of its masks, then the accent floods the frame.
  const exit = end - 0.75;
  maskReveal(tl, hero.title.inners, {start: exit, duration: m.fast, direction: "out", easing: m.easing.exit, stagger: m.stagger / 2});
  const chrome = [rule, bar, hero.eyebrow, hero.subtitle?.root].filter(Boolean) as HTMLElement[];
  wipe(tl, chrome, {start: exit + 0.05, duration: m.fast, direction: "out", from: "right", easing: m.easing.exit});
  tl.fromTo(flood, {scaleY: 0}, {scaleY: 1, duration: m.fast, ease: m.easing.emphasis}, end - m.fast - 0.1);
}

// Window: a single editor surface with the headline typed in, a caret, and
// coordinate hints outside the frame. Exits by settling up and out.
function windowLayout(
  scene: HTMLElement,
  tl: gsap.core.Timeline,
  {aesthetic: a, eyebrow, title, subtitle}: HeroRevealOptions,
  start: number,
  end: number,
) {
  const m = a.motion;
  const win = el("div", "k-window", scene);
  const bar = el("div", "k-window-bar", win);
  for (let i = 0; i < 3; i++) el("span", "k-window-dot", bar);
  const path = el("span", "k-window-path", bar);
  path.textContent = `~/${(eyebrow ?? "untitled").toLowerCase()}/README.md`;
  const body = el("div", "k-window-body", win);
  const hero = heroTitle(body, {eyebrow, title, subtitle}, {split: "chars", caret: true});

  const coords = [
    ["k-coord k-coord-tl", "x 260  y 200"],
    ["k-coord k-coord-br", "1400 × 680"],
  ].map(([cls, text]) => {
    const node = el("div", cls, scene);
    node.textContent = text;
    return node;
  });

  fitToWidth(hero.title, {maxWidth: 1240, maxSize: 84});

  slide(tl, win, {from: "bottom", distance: 16, start: start + 0.15, duration: m.normal, easing: m.easing.enter});
  fade(tl, coords, {start: start + 0.5, duration: m.normal});
  if (hero.eyebrow) fade(tl, hero.eyebrow, {start: start + 0.6, duration: m.fast});

  const typed = typewriter(tl, hero.title.chars, hero.title.carets, {start: start + 0.85, perChar: 0.034, linePause: 0.16});
  if (hero.subtitle) {
    slide(tl, hero.subtitle.words, {from: "bottom", distance: 10, start: typed + 0.2, duration: m.normal, easing: m.easing.enter, stagger: 0.025});
  }

  const exit = end - 0.7;
  const lastCaret = hero.title.carets[hero.title.carets.length - 1];
  if (lastCaret) blink(tl, lastCaret, {start: typed, period: 0.9, count: Math.floor((exit - typed) / 0.9)});
  slide(tl, win, {from: "top", distance: 12, start: exit, duration: m.fast * 1.4, direction: "out", easing: m.easing.exit});
  fade(tl, coords, {start: exit, duration: m.fast, direction: "out", easing: m.easing.exit});
}

import {el} from "../utils/dom";
import {animatedText, type AnimatedText} from "./animated-text";

// Headline with optional eyebrow and subtitle. Structure only: position and
// look come from the aesthetic's CSS, motion from the scene.

export type HeroTitleProps = {
  eyebrow?: string;
  /** Use "\n" for line breaks. */
  title: string;
  subtitle?: string;
};

export type HeroTitle = {
  root: HTMLElement;
  eyebrow: HTMLElement | null;
  title: AnimatedText;
  subtitle: AnimatedText | null;
};

export function heroTitle(
  parent: HTMLElement,
  {eyebrow, title, subtitle}: HeroTitleProps,
  {split = "words", caret = false}: {split?: "words" | "chars"; caret?: boolean} = {},
): HeroTitle {
  const root = el("div", "k-hero-title", parent);
  let eyebrowEl: HTMLElement | null = null;
  if (eyebrow) {
    eyebrowEl = el("div", "k-eyebrow", root);
    eyebrowEl.textContent = eyebrow;
  }
  return {
    root,
    eyebrow: eyebrowEl,
    title: animatedText(root, {text: title, className: "k-display", split, caret}),
    subtitle: subtitle ? animatedText(root, {text: subtitle, className: "k-subtitle"}) : null,
  };
}

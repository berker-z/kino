import {el} from "../utils/dom";

// The text primitive. Builds a predictable DOM that every text motion can
// target:
//
//   .k-text
//     .k-line (overflow: hidden, the mask)
//       .k-line-inner (what maskReveal moves)
//         .k-word / .k-char (what stagger and typewriter step through)
//         .k-caret (optional)
//
// Line breaks come from "\n" in the text, never from measuring, so lines are
// identical on every render.

export type AnimatedTextOptions = {
  text: string;
  className?: string;
  /** words: words are steppable. chars: characters too (typewriter). */
  split?: "words" | "chars";
  /** Add a caret at the end of every line (only one is shown at a time). */
  caret?: boolean;
};

export type AnimatedText = {
  root: HTMLElement;
  lines: HTMLElement[];
  inners: HTMLElement[];
  words: HTMLElement[];
  /** Per line. Empty unless split is "chars". */
  chars: HTMLElement[][];
  carets: HTMLElement[];
};

export function animatedText(parent: HTMLElement, {text, className = "", split = "words", caret = false}: AnimatedTextOptions): AnimatedText {
  const root = el("div", `k-text ${className}`.trim(), parent);
  const result: AnimatedText = {root, lines: [], inners: [], words: [], chars: [], carets: []};

  text.split("\n").forEach((lineText) => {
    const line = el("span", "k-line", root);
    const inner = el("span", "k-line-inner", line);
    const lineChars: HTMLElement[] = [];
    lineText.split(" ").forEach((wordText, index, all) => {
      const word = el("span", "k-word", inner);
      const content = index < all.length - 1 ? `${wordText} ` : wordText;
      if (split === "chars") {
        for (const glyph of content) {
          const char = el("span", "k-char", word);
          char.textContent = glyph;
          lineChars.push(char);
        }
      } else {
        word.textContent = content;
      }
      result.words.push(word);
    });
    if (caret) result.carets.push(el("span", "k-caret", inner));
    result.lines.push(line);
    result.inners.push(inner);
    result.chars.push(lineChars);
  });
  return result;
}

/** Scales font-size so the widest line fits maxWidth, capped at maxSize. Call after fonts load. */
export function fitToWidth(text: AnimatedText, {maxWidth, maxSize}: {maxWidth: number; maxSize: number}): number {
  text.root.style.fontSize = `${maxSize}px`;
  const widest = Math.max(...text.lines.map((line) => line.getBoundingClientRect().width));
  const size = Math.floor(Math.min(maxSize, (maxSize * maxWidth) / widest));
  text.root.style.fontSize = `${size}px`;
  return size;
}

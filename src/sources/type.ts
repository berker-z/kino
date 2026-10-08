// Type drawn into a canvas, for looks where the words sit under the
// treatment (cyanotype, blueprint) and should pick up its grain and fringe.
// Fonts must be loaded first (whenReady, or document.fonts.load).

export type WipeTextOptions = {
  x: number;
  /** Baseline. */
  y: number;
  size: number;
  /** 0-1; the reveal edge moves at constant speed across the line. */
  progress: number;
  ink?: string;
  align?: "left" | "center" | "right";
  weight?: number;
  family?: string;
  /** Draw outlined letters instead of filled ones; value is the stroke width. */
  outline?: number;
};

/**
 * A line of type revealed left to right behind a hard mask edge. Nothing
 * fades: Berker found per-letter relays hard to follow, whole lines wiping
 * in at a steady speed read well.
 */
export function wipeText(ctx: CanvasRenderingContext2D, text: string, options: WipeTextOptions): void {
  const {x, y, size, progress, ink = "#fff", align = "left", weight = 800, family = "Inter Tight", outline = 0} = options;
  if (progress <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const w = ctx.measureText(text).width;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  ctx.beginPath();
  ctx.rect(x0 - 10, y - size * 1.05, (w + 20) * Math.min(1, progress), size * 1.4);
  ctx.clip();
  if (outline > 0) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = outline;
    ctx.lineJoin = "round";
    ctx.strokeText(text, x0, y);
  } else {
    ctx.fillStyle = ink;
    ctx.fillText(text, x0, y);
  }
  ctx.restore();
}

export type CaptionOptions = {
  ink?: string;
  align?: "left" | "center" | "right";
  size?: number;
  family?: string;
  weight?: number;
  /** px between letters. */
  tracking?: number;
};

/** Small tracked mono caption, the "FIG. 02   CARRIERS" voice. */
export function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: CaptionOptions = {}): void {
  const {ink = "#fff", align = "left", size = 26, family = "IBM Plex Mono", weight = 500, tracking = 3} = options;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.letterSpacing = `${tracking}px`;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Black or white, whichever reads on the plate under a line of type, with a
 * soft halo of the opposite tone behind it so busy plates don't eat the words.
 * `meanUnder` is the plate brightness 0-1 under the text box (Plate.meanIn).
 */
export function haloInk(
  ctx: CanvasRenderingContext2D,
  meanUnder: number,
  {x, y, width, height}: {x: number; y: number; width: number; height: number},
  strength = 0.55,
): string {
  const light = meanUnder > 0.55;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, width * 0.62);
  halo.addColorStop(0, light ? `rgba(255,255,255,${strength})` : `rgba(0,0,0,${strength})`);
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.fillStyle = halo;
  ctx.translate(x, y);
  ctx.scale(1, height / (width * 0.62));
  ctx.translate(-x, -y);
  ctx.fillRect(x - width, y - width, width * 2, width * 2);
  ctx.restore();
  return light ? "#000" : "#fff";
}

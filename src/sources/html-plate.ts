// HTML laid out by the browser, as a picture. CSS is much better at
// typesetting than we are with fillText: columns, wrapping, tables, grids,
// letter-spacing, `text-wrap: balance`. So set the page in HTML, snapshot it
// once at load, and let a source draw it like any other plate.
//
// The snapshot goes through an SVG <foreignObject>, which is how the
// ordered-dither-pass and ascii-render-pass components in the HyperFrames
// registry (Apache 2.0) get DOM into a canvas. An SVG image can't fetch
// anything, so webfonts used by the markup are inlined as data URLs here.
//
// Elements marked `data-part="name"` come back with their boxes, measured in
// the live DOM before the snapshot. That's the useful split: layout in CSS,
// motion in canvas. Draw a part with `drawPart` and move it however you like.
//
// The plate is static. Anything that changes over time happens when you draw
// it, not in the HTML.

export type HtmlPlateOptions = {
  /** Markup for the page body. */
  html: string;
  /** Styles for it. Selectors are scoped to the page by the wrapper only, so keep them specific. */
  css?: string;
  width: number;
  height: number;
  /** Page background. Transparent by default, so the plate can sit over other paint. */
  background?: string;
};

export type PartBox = {x: number; y: number; w: number; h: number};

export type HtmlPlate = {
  canvas: HTMLCanvasElement;
  parts: Record<string, PartBox>;
};

const fontCache = new Map<string, Promise<string>>();

function toDataUrl(url: string): Promise<string> {
  let p = fontCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => r.blob())
      .then((blob) => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }));
    fontCache.set(url, p);
  }
  return p;
}

// Every @font-face in the document whose family the page mentions, rewritten
// with its file inlined.
async function inlineFonts(text: string): Promise<string> {
  const rules: Promise<string>[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList;
    try { list = sheet.cssRules; } catch { continue; }
    for (const rule of Array.from(list)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
      if (!family || !text.includes(family)) continue;
      const m = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"));
      if (!m) continue;
      const url = new URL(m[1], sheet.href ?? document.baseURI).href;
      rules.push(toDataUrl(url).then((data) => rule.cssText.replace(m[0], `url("${data}")`)));
    }
  }
  return (await Promise.all(rules)).join("\n");
}

export async function htmlPlate({html, css = "", width, height, background = "transparent"}: HtmlPlateOptions): Promise<HtmlPlate> {
  const box = `width:${width}px;height:${height}px;overflow:hidden;position:relative;background:${background};margin:0;`;

  // Lay it out for real first, offscreen, to measure the parts. Document
  // fonts are loaded already (whenReady), so the boxes match the snapshot.
  const host = document.createElement("div");
  host.setAttribute("style", `position:fixed;left:-${width + 1000}px;top:0;${box}`);
  host.innerHTML = `<style>${css}</style>${html}`;
  document.body.appendChild(host);
  const origin = host.getBoundingClientRect();
  const parts: Record<string, PartBox> = {};
  host.querySelectorAll<HTMLElement>("[data-part]").forEach((el) => {
    const r = el.getBoundingClientRect();
    parts[el.dataset.part!] = {x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height};
  });
  document.body.removeChild(host);

  const fonts = await inlineFonts(css + html);
  const wrapper = document.createElement("div");
  wrapper.setAttribute("style", box);
  wrapper.innerHTML = `<style>${fonts}\n${css}</style>${html}`;
  // No xmlns on the foreignObject: it would pull the element out of the SVG
  // namespace and render blank. The serialized div carries XHTML's.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="${width}" height="${height}">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`;
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0);
  return {canvas, parts};
}

/** Draw one measured part of a plate with its top-left at (x, y). Pad grows the crop so descenders and outlines survive. */
export function drawPart(ctx: CanvasRenderingContext2D, plate: HtmlPlate, name: string, x: number, y: number, {scale = 1, pad = 8} = {}): void {
  const p = plate.parts[name];
  if (!p) return;
  ctx.drawImage(plate.canvas, p.x - pad, p.y - pad, p.w + 2 * pad, p.h + 2 * pad, x - pad * scale, y - pad * scale, (p.w + 2 * pad) * scale, (p.h + 2 * pad) * scale);
}

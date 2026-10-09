// THE SILENT CITY: the darkroom PoC's picture, without any material.
// index.html puts it through filmPass; ab.html shows the same frames raw
// and through ditherPass and screenPass, to prove the composite doesn't
// depend on the film treatment.
//
// One shot. A marble head resolves out of black; a refinery at night rises
// inside her silhouette, its plumes drifting up through the head; the
// works dissolve optically into a harbour's lights in fog; two lines of
// type rise into the black at the right. Everything else is black.
//
// Library pieces: doubleExposure (the silhouette compositing), htmlPlate +
// lineRise (the type). Composition-only: the plate prep, the framing, the
// optical dissolve (screen-weighted, so the overlap glows like an optical
// printer's, not a video crossfade) and all timings.

(function () {
  const W = 2560, H = 1440;
  // Assets live next to this script; ab/ab.html loads it from one level down.
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";
  const {progress, smooth, easeInOut} = Kino;

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }

  // A photo as a grayscale canvas at the size it's drawn, prepared once.
  function plate(img, w, h, filter) {
    const c = document.createElement("canvas");
    c.width = Math.round(w);
    c.height = Math.round(h);
    const g = c.getContext("2d");
    g.filter = filter;
    g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  // Figure framing: the bust's box in its photo is 2296x4110 at (772, 538);
  // scaled so the head fills the upper two thirds, cropped by the frame's
  // bottom edge, standing left of centre facing into the empty right.
  const FS = 0.46;
  const FX = 380 - 772 * FS, FY = 96 - 538 * FS;

  window.darkroomScene = async function () {
    const [figure, mask, works, harbour] = await Promise.all(
      ["figure.jpg", "figure-mask.png", "works.jpg", "harbour.jpg"].map((f) => load(base + "assets/" + f)),
    );
    const fw = figure.naturalWidth * FS, fh = figure.naturalHeight * FS;
    // The marble, cut out on black and held low so the interior reads
    // through it; its own relief survives as a faint carving.
    const figPlate = plate(figure, fw, fh, "grayscale(1) contrast(1.15) brightness(0.92)");
    const fg = figPlate.getContext("2d");
    fg.globalCompositeOperation = "destination-in";
    fg.drawImage(mask, 0, 0, figPlate.width, figPlate.height);
    const maskPlate = plate(mask, fw, fh, "none");
    const worksPlate = plate(works, 1700 * (works.naturalWidth / works.naturalHeight), 1700, "grayscale(1) contrast(1.08)");
    const harbourPlate = plate(harbour, 1560 * (harbour.naturalWidth / harbour.naturalHeight), 1560, "grayscale(1) contrast(1.2) brightness(1.1)");

    // The figure breathes in very slowly: a 3% push over the whole shot,
    // about the head, shared by the figure and its mask so they never part.
    function figureTransform(ctx, t) {
      const z = 1 + 0.03 * smooth(t / 12);
      ctx.translate(900, 600);
      ctx.scale(z, z);
      ctx.translate(-900, -600);
    }

    // Resolving from black like a print coming up: a slow ease, then held.
    const reveal = (t) => smooth(progress(t, 0.3, 2.6));

    const foreground = (ctx, t) => {
      figureTransform(ctx, t);
      ctx.globalAlpha = reveal(t);
      ctx.drawImage(figPlate, FX, FY);
    };
    const silhouette = (ctx, t) => {
      figureTransform(ctx, t);
      ctx.drawImage(maskPlate, FX, FY);
    };

    // The interior keeps its own camera: plumes drift up through the head
    // while the head barely moves. Works first, then the harbour.
    const drawWorks = (ctx, t) => {
      const z = 1 + 0.05 * (t / 12);
      ctx.save();
      ctx.translate(980, 620);
      ctx.scale(z, z);
      ctx.translate(-980, -620);
      ctx.drawImage(worksPlate, -760 + 8 * t, 40 - 14 * t);
      ctx.restore();
    };
    const drawHarbour = (ctx, t) => {
      ctx.drawImage(harbourPlate, -1500 + 10 * (t - 6), -190);
    };
    const dissolve = (t) => easeInOut(progress(t, 6.6, 2.6));
    const interior = (ctx, t) => {
      const p = dissolve(t);
      if (p < 1) {
        ctx.globalAlpha = 1 - p;
        drawWorks(ctx, t);
      }
      if (p > 0) {
        ctx.globalAlpha = p;
        ctx.globalCompositeOperation = "screen";
        drawHarbour(ctx, t);
      }
    };

    const expose = Kino.doubleExposure({
      width: W, height: H, foreground, interior, mask: silhouette,
      maskMode: "alpha", blend: "replace",
      mix: (t) => 0.86 * smooth(progress(t, 2.2, 3.6)),
    });

    await Promise.all(["500 40px \"Inter Tight\"", "400 24px \"IBM Plex Mono\""].map((f) => document.fonts.load(f)));
    const type = await Kino.htmlPlate({
      width: W, height: H,
      css: `
        .t { position: absolute; left: 1720px; top: 1012px; color: #ebe6dc; }
        .t h1 { margin: 0; font: 500 46px/1.1 "Inter Tight"; letter-spacing: 0.42em; }
        .t p { margin: 26px 0 0; font: 400 22px/1.5 "IBM Plex Mono"; letter-spacing: 0.24em; color: #a9a49b; }`,
      html: `<div class="t"><h1 data-lines="title">THE SILENT CITY</h1><p data-lines="sub">LYSEKIL &nbsp;·&nbsp; 03:40</p></div>`,
    });
    const lines = [...type.lines.title, ...type.lines.sub];

    return function paint(ctx, t) {
      expose(ctx, t);
      Kino.lineRise(ctx, type, lines, 0, 0, progress(t, 8.6, 1.9), {stagger: 0.32, depth: 1.1});
    };
  };
})();

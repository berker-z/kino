// ELEVATIONS: the second darkroom piece, with no figure. One building, and
// two more pictures exposed into it through mattes cut from the building
// itself, so the result reads as a single photograph that couldn't exist.
//
// Take one put three plates side by side in rectangular mattes; it read as
// a layout. Here every matte is the architecture's own:
//
// - the sky: the tower's black sky (dark pixels connected to the top edge)
//   is the matte for a fog plate. The tower ends up standing in fog, a
//   bridge far off to the right.
// - the shadows: the tower's own darkness is the matte for a spiral
//   staircase, and it opens by a rule: a threshold falls over five seconds,
//   so the deepest shadows admit light first (the cavity under the crown,
//   the lattice cells), then the lighter ones. Looking up into the tower,
//   a stair turns where the dark was.
//
// Darkroom tells: the spiral pass is misregistered by 2 px against the
// tower (a faint bright fringe on one side of every shadow edge, like an
// optical matte line); the exposed elements are second generation (softer,
// harder); filmPass does grain, halation and the print; the title is burned
// in as a plain exposure.
//
//   0.3 s   the tower exposes up out of black; a slow tilt throughout
//   2.0     fog comes into the sky
//   5.0     the shadows open, darkest first, onto the spiral
//   9.6     the title burns into the fog at top left; hold
//
// Library: plateKeys + thresholdWindow (the self-mattes), doubleExposure
// (both passes, alpha and luma mattes), htmlPlate.

(function () {
  const W = 2560, H = 1440;
  const {progress, smooth, easeInOut} = Kino;
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }
  function plate(img, w, h, filter) {
    const c = document.createElement("canvas");
    c.width = Math.round(w);
    c.height = Math.round(h);
    const g = c.getContext("2d");
    g.filter = filter;
    g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  window.elevationsScene = async function () {
    const [tower, spiral, pylons] = await Promise.all(["tower.jpg", "spiral.jpg", "pylons.jpg"].map((f) => load(base + "assets/" + f)));

    // The tower: full frame width, so the plate's edges are never seen.
    const TS = W / tower.naturalWidth;
    const towerPlate = plate(tower, tower.naturalWidth * TS, tower.naturalHeight * TS, "grayscale(1) contrast(1.12)");
    const TW = towerPlate.width, TH = towerPlate.height;

    // Second generation: softer, harder in contrast.
    const FS = 3400 / pylons.naturalWidth;
    const fogPlate = plate(pylons, pylons.naturalWidth * FS, pylons.naturalHeight * FS, "grayscale(1) contrast(1.2) brightness(0.82) blur(0.7px)");
    const SS = 1900 / spiral.naturalHeight;
    const spiralPlate = plate(spiral, spiral.naturalWidth * SS, spiral.naturalHeight * SS, "grayscale(1) contrast(1.35) brightness(1.05) blur(0.6px)");

    // The tower's own mattes: its sky, and its darkness (Kino.plateKeys).
    const keys = Kino.plateKeys(towerPlate, {sky: "dark"});
    const skyMatte = keys.sky, darkMap = keys.darkness;

    // Placement. The tower tilts up slowly (the plate moves down a little);
    // mattes cut from it move with it, because they're drawn with it.
    const towerAt = (t) => [0, -110 + 6 * t];
    const drawTower = (ctx, t) => { const [x, y] = towerAt(t); ctx.drawImage(towerPlate, x, y); };
    // The bridge stands off to the right. Left of the plate, its own left
    // edge is drawn mirrored, which meets the plate without a line.
    const drawFog = (ctx, t) => {
      const x = Math.round(178 - 4 * t), y = -1890 + 3 * t;
      ctx.drawImage(fogPlate, x, y);
      ctx.save();
      ctx.translate(x, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(fogPlate, 0, 0, x + 2, fogPlate.height, 0, y, x + 2, fogPlate.height);
      ctx.restore();
    };
    const drawSpiral = (ctx, t) => {
      const [, y] = towerAt(t);
      ctx.translate(1280, y + 0.17 * TH);
      ctx.rotate(0.018 * t);
      ctx.drawImage(spiralPlate, -spiralPlate.width / 2, -spiralPlate.height / 2);
    };

    // The sky matte. The plate's top stays above the frame all the way
    // through, so the matte never has an edge on screen.
    const skyMask = (ctx, t) => {
      const [x, y] = towerAt(t);
      ctx.drawImage(skyMatte, x, y);
    };
    // The shadow matte: darkness above a falling threshold, soft by 0.1.
    // Misregistered 2 px right and 1 px down against the tower.
    const threshold = (t) => 0.97 - 0.27 * easeInOut(progress(t, 5.0, 5.0));
    const shadowMask = (ctx, t) => {
      const [x, y] = towerAt(t);
      ctx.filter = Kino.thresholdWindow(threshold(t), 0.1);
      ctx.drawImage(darkMap, x + 2, y + 1);
    };

    const fog = Kino.doubleExposure({width: W, height: H, interior: drawFog, mask: skyMask, maskMode: "alpha", blend: "replace", mix: (t) => 0.9 * smooth(progress(t, 2.0, 3.0))});
    const stair = Kino.doubleExposure({width: W, height: H, interior: drawSpiral, mask: shadowMask, maskMode: "luma", blend: "screen", mix: (t) => 0.85 * smooth(progress(t, 5.0, 1.5))});

    await Promise.all(['500 50px "Inter Tight"', '400 20px "IBM Plex Mono"'].map((f) => document.fonts.load(f)));
    const title = await Kino.htmlPlate({
      width: W, height: H,
      css: `.t { position: absolute; left: 160px; top: 150px; color: #f4efe6; }
            .t h1 { margin: 0; font: 500 50px/1 "Inter Tight"; letter-spacing: 0.56em; }
            .t p { margin: 22px 0 0; font: 400 20px/1 "IBM Plex Mono"; letter-spacing: 0.32em; color: #dcd6cb; }`,
      html: `<div class="t"><h1>ELEVATIONS</h1><p>THREE EXPOSURES &nbsp;·&nbsp; ONE NEGATIVE</p></div>`,
    });

    return function paint(ctx, t) {
      ctx.save();
      ctx.globalAlpha = smooth(progress(t, 0.3, 2.2));
      drawTower(ctx, t);
      ctx.restore();
      fog(ctx, t);
      stair(ctx, t);
      const a = smooth(progress(t, 9.6, 1.6));
      if (a > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = a;
        ctx.drawImage(title.canvas, 0, 0);
        ctx.restore();
      }
    };
  };
})();

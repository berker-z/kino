// THE NAME OF THE THING: the typesetting PoC's page and its motion,
// without any material. index.html paints it straight to a canvas;
// ab.html prints the same page through risoPass.
//
// The page is set once by the browser (htmlPlate): a monumental word, a
// hairline rule, a small marker and two columns of copy on a 12-column
// grid. Nothing is measured or spaced in canvas. Motion only decides which
// pieces of that raster are visible and where:
//
//   0.4 s   the marker rises into place
//   1.0 s   the rule draws across at constant speed
//   1.4 s   construction lines: cap height and baseline across the page,
//           then a hairline down through every stem position
//   3.0 s   the word is drafted: every stem drops in, left to right; then
//           the bars; then the curves and diagonals
//   7.6 s   the construction lines fade; the word stands on its own
//   8.0 s   the two columns rise line by line behind their own boxes
//   10 s    hold; the word's plane drifts towards the viewer by 1.2%
//
// Library pieces: htmlPlate (data-chars, data-lines), letterStrokes,
// drawStroke, lineRise. Composition-only: the page, the timings, the
// guides, and drawing the word into its own layer so the slow push moves
// one intact raster.

(function () {
  const W = 2560, H = 1440;
  const {progress, smooth} = Kino;

  const css = `
    .pg { position: absolute; inset: 0; color: #ebe5d8; font-family: "Inter Tight"; }
    .mark { position: absolute; left: 160px; top: 132px; font: 400 22px/1 "IBM Plex Mono"; letter-spacing: 0.28em; color: #9a9488; }
    .mark b { font-weight: 500; color: #ebe5d8; }
    .word { position: absolute; left: 0; right: 0; top: 400px; margin: 0; text-align: center;
            font-weight: 500; font-size: 380px; line-height: 1; letter-spacing: 0.3em; text-indent: 0.3em; }
    .rule { position: absolute; left: 160px; right: 160px; top: 960px; height: 2px; background: #ebe5d8; }
    .fig { position: absolute; left: 160px; top: 1010px; width: 560px; font: 400 20px/1.6 "IBM Plex Mono"; letter-spacing: 0.18em; color: #9a9488; }
    .col { position: absolute; top: 1004px; width: 520px; font-size: 27px; line-height: 1.48; font-weight: 400;
           letter-spacing: 0.005em; hyphens: manual; text-wrap: pretty; }
    .c1 { left: 1200px; } .c2 { left: 1820px; }`;

  const html = `<div class="pg">
    <div class="mark" data-lines="mark"><b>N° 07</b> &nbsp; THE NAME OF THE THING</div>
    <h1 class="word" data-part="word" data-chars="word">OBELISK</h1>
    <div class="rule" data-part="rule"></div>
    <div class="fig" data-lines="fig">FIG. 1 &nbsp; THE OBJECT, ELEVATION<br>SURVEY LEDGER, P. 114</div>
    <p class="col c1" data-lines="c1">It was found in the dry season, standing where no road went. Nobody who measured it agreed on its height, and nobody agreed on what it was for.</p>
    <p class="col c2" data-lines="c2">The survey gave it a number instead of a name. The number is still in the ledger. The name came later, and it came from somewhere else.</p>
  </div>`;

  window.typesettingScene = async function () {
    await Promise.all(['500 380px "Inter Tight"', '400 27px "Inter Tight"', '400 22px "IBM Plex Mono"', '500 22px "IBM Plex Mono"'].map((f) => document.fonts.load(f)));
    const plate = await Kino.htmlPlate({html, css, width: W, height: H});
    const word = plate.parts.word;
    // The word's letters as stems, bars and curves, read from the raster.
    const strokes = Kino.letterStrokes(plate, plate.chars.word);
    const {cap, baseline, stems: stemX} = strokes.guides;

    // Construction order: each stage's pieces start left to right, evenly
    // spaced through the stage, each revealed by a wipe along its stroke.
    const stages = [
      {kind: "stem", at: 3.0, dur: 1.9, wipe: 0.5, dir: "down"},
      {kind: "bar", at: 4.6, dur: 1.4, wipe: 0.45, dir: "right"},
      {kind: "curve", at: 5.7, dur: 1.8, wipe: 0.6, dir: "down"},
    ];
    const schedule = [];
    for (const st of stages) {
      const ps = strokes.pieces.filter((p) => p.kind === st.kind).sort((a, b) => a.x - b.x || a.y - b.y);
      ps.forEach((piece, i) => schedule.push({piece, at: st.at + (ps.length > 1 ? (i / (ps.length - 1)) * (st.dur - st.wipe) : 0), wipe: st.wipe, dir: st.dir}));
    }

    // Guides: hairlines in a dim ink, on whole pixels, outside the pushed layer.
    const GUIDE = "#57514a";
    function guides(ctx, t) {
      const fade = 1 - smooth(progress(t, 7.6, 1.0));
      if (fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = GUIDE;
      const x0 = 160, x1 = W - 160;
      for (const [y, at] of [[cap, 1.4], [baseline - 1, 1.6]]) {
        const p = progress(t, at, 1.3);
        if (p > 0) ctx.fillRect(x0, Math.round(y), Math.ceil((x1 - x0) * p), 1);
      }
      const top = Math.round(cap - 70), bottom = Math.round(baseline + 70);
      stemX.forEach((x, i) => {
        const p = smooth(progress(t, 2.3 + (i / Math.max(1, stemX.length - 1)) * 0.8, 0.6));
        if (p > 0) ctx.fillRect(Math.round(x), top, 1, Math.ceil((bottom - top) * p));
      });
      ctx.restore();
    }

    // The word's own layer, at plate scale and whole pixels.
    const layer = document.createElement("canvas");
    layer.width = W;
    layer.height = H;
    const lg = layer.getContext("2d");

    return {
      plate,
      strokes,
      /** Draws the page at t. `only` limits it to "word" (the word and rule) or "copy" (everything else). */
      paint(ctx, t, only) {
        if (only !== "copy") {
          guides(ctx, t);
          lg.clearRect(0, 0, W, H);
          for (const s of schedule) Kino.drawStroke(lg, s.piece, 0, 0, Kino.easeInOut(progress(t, s.at, s.wipe)), s.dir);
          const z = 1 + 0.012 * smooth(progress(t, 8.4, 3.6));
          const cx = word.x + word.w / 2, cy = word.y + word.h / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(z, z);
          ctx.translate(-cx, -cy);
          ctx.drawImage(layer, 0, 0);
          ctx.restore();
          // The rule: a crop that grows at constant speed.
          const r = plate.parts.rule;
          const p = progress(t, 1.0, 1.6);
          if (p > 0) ctx.drawImage(plate.canvas, r.x, r.y - 1, Math.ceil(r.w * p), r.h + 2, r.x, r.y - 1, Math.ceil(r.w * p), r.h + 2);
        }
        if (only !== "word") {
          Kino.lineRise(ctx, plate, plate.lines.mark, 0, 0, progress(t, 0.4, 1.0));
          Kino.lineRise(ctx, plate, plate.lines.fig, 0, 0, progress(t, 2.6, 1.2), {stagger: 0.3});
          Kino.lineRise(ctx, plate, plate.lines.c1, 0, 0, progress(t, 8.0, 1.9), {stagger: 0.14});
          Kino.lineRise(ctx, plate, plate.lines.c2, 0, 0, progress(t, 8.7, 1.9), {stagger: 0.14});
        }
      },
    };
  };
})();

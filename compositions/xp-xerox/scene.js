// THE TESTAMENT: one page, copied, and the copy copied, while the camera
// travels over it. Phase 3 of the visual expansion
// (KINO_VISUAL_EXPANSION_MASTER_SPEC.md).
//
// The page is set once: htmlPlate for the type, a photograph (a satellite
// dish against the sky, for a dark photographic patch), a technical drawing
// of a copier's light path in thin lines, a reversed-out box and fine print.
// Kino.copyGenerations makes generations 1-8 from it, each from the last,
// once at load. Nothing is random per frame: the toner is fixed to the
// sheet, so the camera can travel over it.
//
// The event is the copying itself. Each new copy arrives behind the
// copier's light bar sweeping down the sheet (the scan direction, which is
// also the direction of the streaks): above the bar is the new copy, below
// it the old one. A small counter, set crisp above the page, says which.
//
//   0-3     the original, the camera on the title
//   3.0     copy 1        4.6  copy 2       6.2  copy 4 (3 is skipped)
//   7.6     copy 6        9.0  copy 8; the camera keeps travelling to the
//           fine print, which is gone, while the title still reads

(function () {
  const W = 2560, H = 1440;
  const {progress, easeInOut, smooth} = Kino;
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";
  const PW = 2400, PH = 3394;

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }

  // A copier in section: platen glass, lamp, mirrors, lens, drum, rays.
  function diagram(g, x0, y0) {
    g.save();
    g.translate(x0, y0);
    g.strokeStyle = "#000";
    g.fillStyle = "#000";
    g.lineCap = "round";
    const line = (w, pts) => { g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); };
    line(5, [[0, 60], [1080, 60]]);                       // platen glass
    line(2, [[0, 74], [1080, 74]]);
    line(3, [[60, 0], [1020, 0]]);                         // the original, face down
    for (let x = 80; x < 1000; x += 24) line(1.5, [[x, 0], [x + 12, 0]]);
    line(3, [[140, 150], [200, 110], [260, 150]]);        // lamp housing
    g.beginPath(); g.arc(200, 130, 14, 0, Math.PI * 2); g.lineWidth = 2; g.stroke();
    line(4, [[330, 230], [430, 130]]);                     // mirror 1
    line(4, [[700, 330], [800, 430]]);                     // mirror 2
    g.beginPath(); g.ellipse(560, 520, 26, 90, 0, 0, Math.PI * 2); g.lineWidth = 3; g.stroke();  // lens
    g.beginPath(); g.arc(560, 860, 170, 0, Math.PI * 2); g.lineWidth = 4; g.stroke();            // drum
    g.beginPath(); g.arc(560, 860, 12, 0, Math.PI * 2); g.fill();
    g.setLineDash([10, 9]);
    line(1.5, [[200, 74], [380, 180], [750, 380], [560, 520], [560, 690]]);   // the light path
    line(1.5, [[260, 74], [400, 200], [740, 400], [575, 520], [575, 690]]);
    g.setLineDash([]);
    for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; line(1, [[560 + 150 * Math.cos(t), 860 + 150 * Math.sin(t)], [560 + 162 * Math.cos(t), 860 + 162 * Math.sin(t)]]); }
    g.font = '500 26px "IBM Plex Mono"';
    const label = (t, x, y, lx, ly) => { line(1.2, [[x, y], [lx, ly]]); g.fillText(t, lx + 8, ly + 8); };
    label("PLATEN", 980, 66, 1040, 150);
    label("LAMP", 230, 140, 300, 300);
    label("MIRROR", 790, 420, 900, 470);
    label("LENS", 586, 520, 700, 600);
    label("DRUM", 700, 820, 820, 760);
    label("TONER", 690, 960, 820, 1000);
    g.font = '400 20px "IBM Plex Mono"';
    g.fillText("FIG. 2  THE LIGHT PATH OF A COPY. EVERY PASS ADDS ONE LENS, ONE DRUM, ONE LOSS.", 0, 1110);
    g.restore();
  }

  window.testamentScene = async function (options = {}) {
    const generations = options.generations ?? 8;
    await Promise.all(['400 300px "Anton"', '600 78px "Inter Tight"', '800 78px "Inter Tight"', '500 26px "IBM Plex Mono"', '400 20px "IBM Plex Mono"'].map((f) => document.fonts.load(f)));
    const dish = await load(base + "assets/dish.jpg");

    const plate = await Kino.htmlPlate({
      width: PW, height: PH, background: "#ffffff",
      css: `
        .p { position: absolute; inset: 0; color: #000; }
        h1 { position: absolute; left: 150px; top: 120px; margin: 0; font: 400 330px/0.9 "Anton"; letter-spacing: 0.01em; }
        .sub { position: absolute; left: 156px; top: 455px; font: 500 30px/1 "IBM Plex Mono"; letter-spacing: 0.22em; }
        .rule { position: absolute; left: 150px; top: 520px; width: 2100px; height: 26px; background: #000; }
        ol { position: absolute; left: 150px; top: 640px; width: 1120px; margin: 0; padding: 0; list-style: none; font: 600 74px/1.08 "Inter Tight"; letter-spacing: -0.01em; }
        ol li { margin: 0 0 54px; }
        ol b { font-weight: 800; display: block; font-size: 30px; letter-spacing: 0.2em; margin-bottom: 12px; font-family: "IBM Plex Mono"; }
        .box { position: absolute; left: 1350px; top: 1860px; width: 900px; height: 210px; background: #000; color: #fff; font: 800 64px/210px "Inter Tight"; text-align: center; letter-spacing: 0.04em; }
        .cap { position: absolute; left: 1350px; top: 1740px; width: 900px; font: 400 20px/1.4 "IBM Plex Mono"; }
        .fine { position: absolute; left: 150px; top: 2900px; width: 2100px; columns: 2; column-gap: 90px; font: 400 21px/1.5 "IBM Plex Mono"; text-align: justify; }
        .foot { position: absolute; left: 150px; top: 3290px; font: 500 22px/1 "IBM Plex Mono"; letter-spacing: 0.2em; }`,
      html: `<div class="p">
        <h1>TESTAMENT</h1>
        <div class="sub">A STATEMENT TO BE COPIED AND PASSED ON</div>
        <div class="rule"></div>
        <ol>
          <li><b>I.</b>Nothing here is original.</li>
          <li><b>II.</b>Every copy forgets a little of what it was given.</li>
          <li><b>III.</b>What survives the copying is the message.</li>
        </ol>
        <div class="cap">FIG. 1  RECEIVER, PHOTOGRAPHED FROM BELOW. ORIGINAL PRINT, NOT RETOUCHED.</div>
        <div class="box">DO NOT DESTROY</div>
        <div class="fine">This sheet is the first of its kind and the last of its kind. It was made to be reproduced by whoever finds it, on whatever machine is at hand, and handed on. Each reproduction is understood to be faithful in intent and unfaithful in detail. The small print will go first; that is expected. The diagram will thicken and close up; that is expected. The photograph will become a shape. Do not attempt to restore what has been lost by copying. Do not retype the text. A restored copy is a new original and has no standing. Pass on only what the machine gives you. If the title can still be read, the testament is intact. If it cannot, make no further copies and keep the last one somewhere dry. Copies made from this sheet carry the same instruction. So do copies made from those.</div>
        <div class="foot">SHEET 1 OF 1 &nbsp;·&nbsp; NO. 0000</div>
      </div>`,
    });

    // The page, as one canvas: the set type, the photograph, the drawing.
    const page = document.createElement("canvas");
    page.width = PW;
    page.height = PH;
    const g = page.getContext("2d");
    g.drawImage(plate.canvas, 0, 0);
    {
      const bx = 1350, by = 640, bw = 900, bh = 1060;
      const s = Math.max(bw / dish.naturalWidth, bh / dish.naturalHeight);
      g.save();
      g.beginPath();
      g.rect(bx, by, bw, bh);
      g.clip();
      g.filter = "grayscale(1) contrast(1.25) brightness(0.92)";
      g.drawImage(dish, bx + (bw - dish.naturalWidth * s) / 2, by + (bh - dish.naturalHeight * s) / 2, dish.naturalWidth * s, dish.naturalHeight * s);
      g.restore();
    }
    diagram(g, 170, 1640);

    const copies = Kino.copyGenerations(page, {generations, seed: 12});
    return {page, copies, PW, PH};
  };

  // The film's schedule: sweeps (start time, the copy it delivers).
  const SWEEPS = [[3.0, 1], [4.6, 2], [6.2, 4], [7.6, 6], [9.0, 8]];
  const SWEEP = 0.95;

  window.testamentPainter = function ({copies, PW, PH}) {
    const scratch = document.createElement("canvas");
    scratch.width = PW;
    scratch.height = PH;
    const sg = scratch.getContext("2d");

    const cam = (t) => {
      const u = easeInOut(progress(t, 0, 12));
      // Title, down the statements to the photograph's box, the diagram, the fine print.
      const path = [[1000, 420], [1500, 1250], [1050, 2080], [1200, 2950]];
      const seg = Math.min(path.length - 2, Math.floor(u * (path.length - 1)));
      const f = u * (path.length - 1) - seg;
      const e = f * f * (3 - 2 * f);
      const [x0, y0] = path[seg], [x1, y1] = path[seg + 1];
      return {x: x0 + (x1 - x0) * e, y: y0 + (y1 - y0) * e, zoom: 1.2 + 0.1 * Math.sin(u * Math.PI)};
    };

    // Which copies show at t: the last delivered one, and the one under the bar.
    function state(t) {
      let done = 0, sweep = null;
      for (const [t0, gen] of SWEEPS) {
        if (t >= t0 + SWEEP) done = gen;
        else if (t >= t0) sweep = {gen, f: (t - t0) / SWEEP};
      }
      return {done, sweep};
    }

    function sheet(t) {
      const {done, sweep} = state(t);
      sg.drawImage(copies[done], 0, 0);
      if (sweep) {
        const y = Math.round(easeInOut(sweep.f) * PH);
        sg.drawImage(copies[sweep.gen], 0, 0, PW, y, 0, 0, PW, y);
        // The lamp: a bright bar with a soft green-white falloff.
        const gr = sg.createLinearGradient(0, y - 140, 0, y + 30);
        gr.addColorStop(0, "rgba(230,255,240,0)");
        gr.addColorStop(0.8, "rgba(230,255,240,0.55)");
        gr.addColorStop(0.95, "rgba(250,255,252,0.95)");
        gr.addColorStop(1, "rgba(230,255,240,0)");
        sg.globalCompositeOperation = "lighter";
        sg.fillStyle = gr;
        sg.fillRect(0, y - 140, PW, 170);
        sg.globalCompositeOperation = "source-over";
      }
      return {done, sweep};
    }

    return function paint(ctx, t) {
      const s = sheet(t);
      const c = cam(t);
      ctx.save();
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2, H / 2);
      ctx.scale(c.zoom, c.zoom);
      ctx.translate(-c.x, -c.y);
      ctx.drawImage(scratch, 0, 0);
      ctx.restore();

      // The counter, crisp, above the page.
      const n = s.sweep ? s.sweep.gen : s.done;
      ctx.save();
      ctx.font = '500 26px "IBM Plex Mono"';
      ctx.letterSpacing = "0.2em";
      const label = n === 0 ? "ORIGINAL" : `COPY ${String(n).padStart(2, "0")}${s.sweep ? "  ·  COPYING" : ""}`;
      const w = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(10,10,10,0.82)";
      ctx.fillRect(84, 84, w + 40, 54);
      ctx.fillStyle = "#f2efe8";
      ctx.textBaseline = "middle";
      ctx.fillText(label, 104, 112);
      ctx.restore();
    };
  };
})();

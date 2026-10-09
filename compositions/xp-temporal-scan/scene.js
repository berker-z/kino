// AN OBJECT OUTSIDE TIME: the temporal slit-scan PoC's picture, without
// any material. index.html paints it plain; ab.html runs the same frames
// through ditherPass.
//
// The source is a small world that is a pure function of its own time: a
// colonnade sliding past (the camera), a mast with a long bar turning on
// it, and a train crossing. temporalScan rebuilds every output
// frame from strips of that world sampled at different times:
//
//   0-1.6 s   span 0: the world as it is
//   1.6-4.8   vertical strips, span opens to 1.1 s: the turning bar bends
//             into a curve, the colonnade re-spaces, the train stretches
//   4.8-6.2   the x scan hands over to a y scan: for that second the y
//             scan's source is itself an x scan (nested), so the two
//             shears cross instead of cutting
//   6.2-9     horizontal bands, span 0.9 s: top rows are earlier than
//             bottom rows, so the train leans back through time and the
//             bar becomes an S
//
// Library piece: temporalScan. Composition-only: the world, the schedule,
// the nesting (a pattern, not an API).

(function () {
  const W = 2560, H = 1440;
  const {progress, smooth, easeInOut, hash} = Kino;
  const NAVY = "#0A1022", ICE = "#BFD4FF", MID = "#3E5687", DEEP = "#1a2747";
  const HORIZON = 1080;

  // --- the world at source time s ------------------------------------
  const camera = (s) => 46 * s; // px the colonnade has slid left
  const columns = Array.from({length: 22}, (_, i) => ({x: i * 240 + Math.round(hash(i, 3) * 90), top: 150 + Math.round(hash(i, 5) * 260), w: 6 + 2 * Math.round(hash(i, 9) * 2)}));

  function field(ctx, s, strip) {
    ctx.fillStyle = NAVY;
    ctx.fillRect(strip.x, strip.y, strip.w, strip.h);
    const cam = camera(s);
    const span = 22 * 240;
    ctx.fillStyle = DEEP;
    for (const c of columns) {
      const x = Math.round((((c.x - cam) % span) + span) % span) - 120;
      if (x + c.w < strip.x || x > strip.x + strip.w) continue;
      ctx.fillRect(x, c.top, c.w, HORIZON - c.top);
    }
    // Ground: the horizon and ticks that slide with the camera.
    ctx.fillStyle = MID;
    ctx.fillRect(0, HORIZON, W, 3);
    const off = Math.round(cam * 1.6) % 80;
    for (let x = -off; x < W; x += 80) {
      if (x + 3 < strip.x || x > strip.x + strip.w) continue;
      ctx.fillRect(x, HORIZON + 22, 3, x % 400 === (-off % 400 + 400) % 400 ? 34 : 16);
    }
  }

  // A mast with a long bar turning slowly on it.
  const PIVOT = {x: 1600, y: 470};
  function apparatus(ctx, s) {
    ctx.fillStyle = MID;
    ctx.fillRect(PIVOT.x - 7, PIVOT.y, 14, HORIZON - PIVOT.y);
    const a = s * Math.PI * 2 * 0.32;
    const c = Math.cos(a), si = Math.sin(a);
    ctx.strokeStyle = ICE;
    ctx.lineCap = "butt";
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(PIVOT.x - c * 620, PIVOT.y - si * 620);
    ctx.lineTo(PIVOT.x + c * 620, PIVOT.y + si * 620);
    ctx.stroke();
    ctx.fillStyle = ICE;
    for (const r of [-620, 620]) {
      ctx.beginPath();
      ctx.arc(PIVOT.x + c * r, PIVOT.y + si * r, r > 0 ? 34 : 22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.arc(PIVOT.x, PIVOT.y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ICE;
    ctx.lineWidth = 6;
    ctx.stroke();
  }

  // A short train crossing left to right along the horizon: five cars,
  // a row of windows each, wheels. Rigid and regular, so any shear or
  // stretch the scan gives it is legible at once.
  const CAR = 330, GAP = 16, CARS = 5, CAR_H = 132;
  function train(ctx, s, strip) {
    const front = -120 + 340 * s;
    for (let k = 0; k < CARS; k++) {
      const x1 = Math.round(front - k * (CAR + GAP));
      const x0 = x1 - CAR;
      if (x1 < strip.x || x0 > strip.x + strip.w) continue;
      const y0 = HORIZON - 26 - CAR_H;
      ctx.fillStyle = ICE;
      ctx.fillRect(x0, y0, CAR, CAR_H);
      ctx.fillStyle = NAVY;
      for (let w = 0; w < 6; w++) ctx.fillRect(x0 + 22 + w * 50, y0 + 26, 34, 40);
      ctx.fillRect(x0, y0 + 92, CAR, 6);
      ctx.fillStyle = ICE;
      for (const wx of [40, 92, CAR - 92, CAR - 40]) {
        ctx.beginPath();
        ctx.arc(x0 + wx, HORIZON - 14, 13, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  const world = (ctx, s, strip) => {
    field(ctx, s, strip);
    apparatus(ctx, s);
    train(ctx, s, strip);
  };

  // --- the schedule --------------------------------------------------
  const spanX = (t) => 1.1 * easeInOut(progress(t, 1.6, 2.6)) * (1 - smooth(progress(t, 4.8, 1.4)));
  const spanY = (t) => 0.9 * smooth(progress(t, 4.8, 1.4)) + 0.25 * smooth(progress(t, 6.6, 2.4));

  window.temporalScene = async function () {
    await document.fonts.load('400 22px "IBM Plex Mono"');
    await document.fonts.load('500 22px "IBM Plex Mono"');
    const type = await Kino.htmlPlate({
      width: W, height: H,
      css: `.c { position: absolute; left: 160px; top: 1250px; font: 400 22px/1.6 "IBM Plex Mono"; letter-spacing: 0.28em; color: #8fa5d6; }
            .c b { font-weight: 500; color: #BFD4FF; }`,
      html: `<div class="c" data-lines="cap"><b>AN OBJECT OUTSIDE TIME</b><br>TEMPORAL SCAN &nbsp; 256 STRIPS</div>`,
    });

    const xScan = (ctx, s, sx, bands = 256) => Kino.temporalScan(ctx, s, {width: W, height: H, axis: "x", bands, span: sx, direction: -1, source: world});

    return function paint(ctx, t) {
      const sx = spanX(t), sy = spanY(t);
      if (sy <= 0) {
        xScan(ctx, t, sx);
      } else {
        // Nesting: while the x span hasn't closed, every y band is itself
        // an x scan at that band's time. Cost is bands x bands, for about
        // a second.
        Kino.temporalScan(ctx, t, {
          width: W, height: H, axis: "y", bands: sx > 0 ? 48 : 180, span: sy, direction: -1,
          source: sx > 0 ? (c, s) => { c.save(); xScan(c, s, sx, 96); c.restore(); } : world,
        });
      }
      Kino.lineRise(ctx, type, type.lines.cap, 0, 0, progress(t, 2.2, 1.2), {stagger: 0.3});
    };
  };
})();

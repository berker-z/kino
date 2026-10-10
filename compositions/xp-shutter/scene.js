// AFTERIMAGE: a bare bulb swinging on its cord in an empty school corridor
// at night, photographed with the shutter held open and a flash. Phase 2
// of the visual expansion (docs/briefs/KINO_VISUAL_EXPANSION_MASTER_SPEC.md).
//
// The source is a pure function of source time, so Kino.shutterIntegrate
// can sample it anywhere in the interval:
//
// - the corridor: a daylight plate at a very low gain (the windows read as
//   moonlight, the sun stripes on the floor as moonlight through glass).
// - the lamp: a pendulum (pivot above the frame) with a conical shade and
//   a bulb. The bulb is the only light: it adds a pool of light to the
//   plate, in proportion to the plate (its brightness standing in for
//   albedo), falling off with distance from the bulb. In ambient samples
//   the shade is a dark shape against the glow.
// - the bulb's glow: a luminous layer (glow) summed at 30x white, because
//   a bulb is far brighter than anything a canvas can paint; its trail is
//   a saturated streak, as in a real long exposure.
// - the flash (flashSource): the same instant lit from the camera, so the
//   shade, cord and nearest floor show sharp, frozen where the flash fired.
//
// The shutter: closed (0 s) for the first two seconds, opening to 1.1 s
// over 2-6, held, then closing over 9-12. Rear-curtain flash: the trails
// lead up to the sharp lamp. Everything goes through digicamPass.

(function () {
  const W = 2560, H = 1440;
  const {progress, easeInOut} = Kino;
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }
  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.round(w);
    c.height = Math.round(h);
    return c;
  }

  // Pendulum: pivot above the frame, small-angle period ~2.7 s.
  const PIVOT = [1330, -620], LEN = 1240, AMP = 0.42, PERIOD = 2.7;
  const lampAt = (s) => {
    const a = AMP * Math.sin((2 * Math.PI * s) / PERIOD + 0.6);
    return {a, x: PIVOT[0] + LEN * Math.sin(a), y: PIVOT[1] + LEN * Math.cos(a)};
  };

  window.afterimageScene = async function () {
    const img = await load(base + "assets/corridor.jpg");
    // The plate at frame width; the band from the corridor's far door down
    // to the moonlit floor.
    const S = W / img.naturalWidth;
    const plate = canvas(W, img.naturalHeight * S);
    plate.getContext("2d").drawImage(img, 0, 0, plate.width, plate.height);
    const BAND_Y = 0.24 * plate.height;
    const frame = canvas(W, H);
    frame.getContext("2d").drawImage(plate, 0, -BAND_Y);

    const lit = canvas(W, H), lg = lit.getContext("2d");
    const AMBIENT = 0.07, BULB = 2.0, FLASH = 0.3;

    // The room lit by the bulb at (x, y): frame * radial falloff, added.
    function bulbLight(ctx, x, y, gain) {
      lg.globalCompositeOperation = "source-over";
      lg.drawImage(frame, 0, 0);
      lg.globalCompositeOperation = "multiply";
      const g = lg.createRadialGradient(x, y, 0, x, y, 1500);
      for (let i = 0; i <= 10; i++) {
        const r = i / 10, v = Math.round(255 / (1 + 60 * r * r));
        g.addColorStop(r, `rgb(${v},${v},${v})`);
      }
      lg.fillStyle = g;
      lg.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (let k = gain; k > 0; k -= 1) {
        ctx.globalAlpha = Math.min(1, k);
        ctx.drawImage(lit, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    // The lamp itself. `shade` is the shade's colour (dark in its own
    // light, grey metal in the flash).
    function lamp(ctx, s, shade, bulbOn) {
      const {a, x, y} = lampAt(s);
      ctx.save();
      ctx.strokeStyle = shade;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(PIVOT[0], PIVOT[1]);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.translate(x, y);
      ctx.rotate(-a);
      if (bulbOn === "glow") {
        // A soft, roughly gaussian core: sampled 64 times along its path it
        // sums to a continuous streak rather than a row of beads.
        const g = ctx.createRadialGradient(0, 84, 0, 0, 84, 260);
        for (let i = 0; i <= 12; i++) {
          // Falls to exactly 0 at the rim: at gain 30 any leftover tail
          // shows the square the gradient is filled into.
          const r = i / 12, v = Math.max(0, Math.exp(-r * r * 70) + 0.05 * Math.exp(-r * r * 5) - 0.05 * Math.exp(-5) - Math.exp(-70) * r);
          g.addColorStop(r, `rgba(255,${Math.round(236 - 60 * r)},${Math.round(200 - 110 * r)},${Math.min(1, v).toFixed(3)})`);
        }
        ctx.fillStyle = g;
        ctx.globalCompositeOperation = "lighter";
        ctx.fillRect(-262, -178, 524, 524);
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
        return;
      }
      // Conical shade, open at the bottom, bulb visible below its rim.
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(-14, -6);
      ctx.lineTo(14, -6);
      ctx.lineTo(92, 58);
      ctx.lineTo(-92, 58);
      ctx.closePath();
      ctx.fill();
      if (bulbOn === "lit") {
        ctx.fillStyle = "#fffaf0";
        ctx.beginPath();
        ctx.ellipse(0, 76, 26, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Ambient: moonlight plus the bulb's own light, at source time s.
    function ambient(ctx, s) {
      ctx.globalAlpha = AMBIENT;
      ctx.drawImage(frame, 0, 0);
      ctx.globalAlpha = 1;
      const {x, y} = lampAt(s);
      bulbLight(ctx, x, y + 80, BULB);
      lamp(ctx, s, "#0b0a09", "dark");
    }
    // Flash: the same instant lit from the camera (bottom centre, near).
    const flashFall = canvas(W, H);
    {
      const g = flashFall.getContext("2d");
      const grad = g.createRadialGradient(W / 2, H * 1.35, 0, W / 2, H * 1.35, 2400);
      for (let i = 0; i <= 10; i++) {
        const r = i / 10, v = Math.round(255 / (1 + 14 * r * r));
        grad.addColorStop(r, `rgb(${v},${v},${v})`);
      }
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = "multiply";
      g.drawImage(frame, 0, 0);
    }
    function flash(ctx, s) {
      ambient(ctx, s);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = FLASH;
      ctx.drawImage(flashFall, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      lamp(ctx, s, "#8d8f94", "lit");
    }

    const glow = (ctx, s) => lamp(ctx, s, "#000", "glow");
    const shutter = (t) => 1.1 * easeInOut(progress(t, 2, 4)) * (1 - easeInOut(progress(t, 9, 3)));
    const expose = Kino.shutterIntegrate({
      width: W, height: H, source: ambient, flashSource: flash,
      glow, glowGain: 30,
      duration: 0, samples: 64, flash: 0.45, flashAt: 0, fade: 0.35,
      tune: (t) => ({duration: shutter(t)}),
    });
    return {expose, ambient, flash, glow, lampAt, shutter};
  };
})();

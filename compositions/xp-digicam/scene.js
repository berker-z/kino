// THE STAIRWELL: a white plastic chair on the stairs of a cluttered house,
// photographed with an on-camera flash from too close. Phase 1 of the
// visual expansion (docs/briefs/KINO_VISUAL_EXPANSION_MASTER_SPEC.md).
//
// Neither plate is a flash photograph. The stairwell is lit by a curtained
// window; the chair stands in a garden in soft evening sun. The flash is
// authored here, explicitly, before Kino.digicamPass gives it the camera's
// response:
//
// - ambient: the stairwell plate at a low gain, the room the flash doesn't
//   reach.
// - flash: light added to the plate in proportion to the plate itself (its
//   brightness stands in for albedo) times a falloff matte centred below
//   the frame, where the nearest steps are. Inverse-square-ish, authored in
//   plate coordinates. No depth is recovered from the picture.
// - the chair: cut out with an explicit matte (make-mask.py), at a high
//   gain so the pass clips it, and a hard flash shadow: its own silhouette,
//   offset down and right (the flash sits above the lens), darkening what's
//   behind it.
//
//   0-3 s   already lit: the chair off centre, too close, bottom cut off
//   3-8     a slow push and drift; the camera's exposure settles on the
//           flash-lit chair, so the ambient room sinks toward black
//   8-12    the drift carries the banister in at the left edge and the
//           frame tilts; it ends on an uncomfortable crop
//
// No text. No flash pulse: the flash is constant, it's one exposure.

(function () {
  const W = 2560, H = 1440;
  const {progress, smooth, easeInOut} = Kino;
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

  // Plate scale: the 1920 x 2560 stairwell drawn at 1.5x.
  const P = 1.5;

  window.stairwellScene = async function (options = {}) {
    const [stair, chair, chairMask] = await Promise.all(["stairwell.jpg", "chair.jpg", "chair-mask.png"].map((f) => load(base + "assets/" + f)));
    const PW = stair.naturalWidth * P, PH = stair.naturalHeight * P;

    // The room, once, at plate scale.
    const room = canvas(PW, PH);
    room.getContext("2d").drawImage(stair, 0, 0, PW, PH);

    // Flash falloff in plate coordinates: brightest just below the frame's
    // bottom edge (the nearest step), falling off over ~1.3 frame heights.
    const FX = 1180, FY = 3700, FR = 2300;
    const fall = canvas(PW, PH);
    {
      const g = fall.getContext("2d");
      const grad = g.createRadialGradient(FX, FY, 0, FX, FY, FR);
      for (let i = 0; i <= 12; i++) {
        const r = i / 12;
        const v = 1 / (1 + 22 * r * r); // inverse-square-ish, normalised
        grad.addColorStop(r, `rgb(${Math.round(255 * v)},${Math.round(255 * v)},${Math.round(255 * v)})`);
      }
      g.fillStyle = grad;
      g.fillRect(0, 0, PW, PH);
    }
    // room * falloff, which the flash adds at a gain.
    const lit = canvas(PW, PH);
    {
      const g = lit.getContext("2d");
      g.drawImage(room, 0, 0);
      g.globalCompositeOperation = "multiply";
      g.drawImage(fall, 0, 0);
    }

    // The chair, cut out once, and its silhouette for the shadow.
    const CS = 0.98; // chair scale in plate px per chair px
    const CW = chair.naturalWidth * CS, CH = chair.naturalHeight * CS;
    const cut = canvas(CW, CH);
    {
      const g = cut.getContext("2d");
      g.drawImage(chairMask, 0, 0, CW, CH);
      g.globalCompositeOperation = "source-in";
      g.drawImage(chair, 0, 0, CW, CH);
    }
    const sil = canvas(CW, CH);
    {
      const g = sil.getContext("2d");
      g.drawImage(chairMask, 0, 0, CW, CH);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = "#000";
      g.fillRect(0, 0, CW, CH);
    }
    // Where the chair stands, in plate px (its top-left).
    const CX = 380, CY = 1880;

    // Camera: centre in plate px, zoom, roll.
    const cam = (t) => {
      const push = easeInOut(progress(t, 3, 5));
      const late = easeInOut(progress(t, 8, 4));
      return {
        x: 1500 - 120 * push - 420 * late,
        y: 2700 + 40 * push - 60 * late,
        zoom: 1.0 + 0.06 * push + 0.05 * late,
        roll: -0.045 * late,
      };
    };
    // Ambient level: the camera exposes for the flash; the room sinks.
    const ambient = (t) => 0.2 - 0.12 * smooth(progress(t, 3, 5));
    const FLASH = 1.6, CHAIR_GAIN = 1.3;

    const world = canvas(W, H);
    const wg = world.getContext("2d");

    function scene(ctx, t) {
      const c = cam(t);
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(c.roll);
      ctx.scale(c.zoom, c.zoom);
      ctx.translate(-c.x, -c.y);

      // Ambient room.
      ctx.globalAlpha = ambient(t);
      ctx.drawImage(room, 0, 0);
      // Flash on the room: lit = room * falloff, added at FLASH.
      ctx.globalCompositeOperation = "lighter";
      for (let k = FLASH; k > 0; k -= 1) {
        ctx.globalAlpha = Math.min(1, k);
        ctx.drawImage(lit, 0, 0);
      }
      // The flash shadow: the chair's silhouette, offset down and right.
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.78;
      ctx.filter = "blur(3px)";
      ctx.drawImage(sil, CX + 46, CY + 70);
      ctx.filter = "none";
      // The chair, flash-lit.
      ctx.globalAlpha = 1;
      ctx.drawImage(cut, CX, CY);
      ctx.globalCompositeOperation = "lighter";
      for (let k = CHAIR_GAIN - 1; k > 0; k -= 1) {
        ctx.globalAlpha = Math.min(1, k);
        ctx.drawImage(cut, CX, CY);
      }
      ctx.restore();
    }

    return function paint(ctx, t) {
      // Built on a scratch canvas so the painter never leaves state behind.
      wg.save();
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.globalCompositeOperation = "source-over";
      wg.globalAlpha = 1;
      wg.fillStyle = "#000";
      wg.fillRect(0, 0, W, H);
      scene(wg, t);
      wg.restore();
      ctx.drawImage(world, 0, 0);
    };
  };
})();

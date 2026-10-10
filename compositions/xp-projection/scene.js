// SANCTUARY: an engraving projected along the stone wall of a cloister walk,
// in perspective, between and behind its colonnettes. Phase 4 of the
// visual expansion (docs/briefs/KINO_VISUAL_EXPANSION_MASTER_SPEC.md).
//
// The room is one daylight photograph (Mont-Saint-Michel's cloister),
// brought down to a dim interior. Kino.surfaceProject throws the water onto
// the wall's plane: four corners authored on the plate, from the near end
// of the wall to where the arcade recedes. The picture is Doré's falling
// figure in clouds (Paradise Lost), the slide drifting slowly down it. The
// projected light adds in proportion to the stone's own brightness (the
// daylight plate is the albedo), so the moss and joints show through.
// Slow water was tried first: dark, low-contrast footage gave too little
// light to read as a picture on stone. It stays as the A/B's second source.
//
// The colonnettes stand in front of the wall, in the beam. They catch the
// picture themselves, and each throws a shadow onto the wall beside it: the
// occlusion matte is their silhouettes (authored as capital, shaft and
// base boxes on the plate) offset toward the far end, because the
// projector sits nearer the camera and a little to its left.
//
//   0-3     the room in weak light
//   3-8     the projector comes up; the slide starts to move
//   8-11    the camera pushes in and drifts along the wall; the quad and
//           the shadows go with the room, the slide keeps moving
//   11-12   hold

(function () {
  const W = 2560, H = 1440;
  const {progress, smooth, easeInOut} = Kino;
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";

  // Plate coordinates are authored on a 1280-wide preview; the plate is
  // drawn 2560 wide (x2), 1709 tall.
  const K = 2;
  const PH = 1709;
  const QUAD = [[60, 205], [1040, 380], [1040, 500], [60, 585]].map(([x, y]) => [x * K, y * K]);
  // Colonnettes: centre x, capital top/bottom, capital half-width, shaft
  // half-width, shaft bottom, base half-width, base bottom.
  const COLUMNS = [
    [75, 215, 300, 75, 32, 640, 55, 700],
    [380, 268, 330, 48, 24, 595, 36, 645],
    [578, 296, 350, 37, 19, 575, 30, 610],
    [714, 322, 365, 32, 15, 555, 24, 582],
    [820, 340, 377, 28, 14, 540, 21, 562],
    [893, 352, 385, 26, 13, 530, 19, 548],
    [958, 362, 392, 24, 12, 520, 17, 535],
    [1012, 372, 398, 22, 11, 510, 15, 522],
    [1052, 380, 403, 20, 10, 503, 14, 513],
  ];

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }

  window.sanctuaryScene = async function () {
    const plate = await load(base + "assets/cloister.jpg");
    const dore = await load(base + "assets/dore.jpg");
    const frames = await Promise.all(Array.from({length: 180}, (_, i) => load(base + `assets/water/w${String(i + 1).padStart(3, "0")}.jpg`)));

    // Camera: plate px -> screen px. A similarity, so it maps the quad and
    // the shadows exactly as it maps the room.
    const cam = (t) => {
      const m = easeInOut(progress(t, 8, 3));
      return {zoom: 1 + 0.09 * m, x: -60 * m, y: -135 - 40 * m};
    };
    const toScreen = (t) => {
      const c = cam(t);
      return ([x, y]) => [W / 2 + (x - W / 2) * c.zoom + c.x * c.zoom, (y + c.y) * c.zoom - (H / 2) * (c.zoom - 1)];
    };
    const applyCam = (ctx, t) => {
      const c = cam(t);
      ctx.translate(W / 2, 0);
      ctx.scale(c.zoom, c.zoom);
      ctx.translate(-W / 2 + c.x, c.y - ((H / 2) * (c.zoom - 1)) / c.zoom);
    };

    // The room, dimmed: the projector is the main light. The daylight
    // plate itself is the stone's albedo.
    const plateAt = (filter) => (ctx, t) => {
      ctx.save();
      applyCam(ctx, t);
      ctx.filter = filter;
      ctx.drawImage(plate, 0, 0, 2560, PH);
      ctx.restore();
    };
    const room = plateAt("brightness(0.22) saturate(0.6)");
    const stone = plateAt("saturate(0.7)");

    // Water: 6 s of footage at half speed, starting to move at 4 s.
    const sourceTime = (t) => {
      const a = Math.max(0, t - 4);
      return Math.min(a, 1.5) * Math.min(a, 1.5) / 3 + Math.max(0, a - 1.5) * 1.0;
    };
    // The engraving: a 16:9 window on Doré's plate, sliding slowly down it
    // (the projector's slide moving), from the beam of light into clouds.
    const engraving = (ctx, t) => {
      const DW = dore.naturalWidth, DH = dore.naturalHeight, ch = DW * 9 / 16;
      const y = (DH - ch) * (0.05 + 0.55 * easeInOut(progress(t, 4, 8)));
      ctx.filter = "contrast(1.15)";
      ctx.drawImage(dore, 0, y, DW, ch, 0, 0, 1280, 720);
    };
    // A projector's picture is contrastier than the footage: crushed
    // blacks (no light) and bright crests.
    const water = (ctx, t) => {
      ctx.filter = "contrast(1.3) brightness(1.35) saturate(0.8)";
      const f = Math.min(179, sourceTime(t) * 15), k = Math.floor(f), a = f - k;
      ctx.drawImage(frames[k], 0, 0, 1280, 720);
      if (a > 0.01 && k < 179) {
        ctx.globalAlpha = a;
        ctx.drawImage(frames[k + 1], 0, 0, 1280, 720);
        ctx.globalAlpha = 1;
      }
    };

    // Column silhouettes in plate px, offset by (dx, dy) * depth.
    function columns(ctx, dx, dy) {
      ctx.fillStyle = "#000";
      for (const [cx, ct, cb, chw, shw, sb, bhw, bb] of COLUMNS) {
        const d = 1 - (cx - 60) / 1100; // nearer columns stand further from their shadow
        const ox = dx * d, oy = dy * d;
        ctx.fillRect((cx - chw + ox) * K, (ct + oy) * K, 2 * chw * K, (cb - ct) * K);
        ctx.fillRect((cx - shw + ox) * K, (cb + oy) * K, 2 * shw * K, (sb - cb) * K);
        ctx.fillRect((cx - bhw + ox) * K, (sb + oy) * K, 2 * bhw * K, (bb - sb) * K);
      }
    }
    const shadows = (ctx, t) => {
      ctx.save();
      applyCam(ctx, t);
      ctx.filter = "blur(3px)";
      columns(ctx, 26, 4);
      ctx.restore();
    };

    const intensity = (t) => 3.6 * smooth(progress(t, 3, 3.5));
    const project = Kino.surfaceProject({
      width: W, height: H, surface: room, albedo: stone, image: engraving,
      quad: (t) => QUAD.map(toScreen(t)), occlusion: shadows, intensity,
      albedoGain: 1.3, color: "#fff2e2", edge: 0.01, hotspot: 0.45, softness: 1.2,
    });
    return {project, room, stone, engraving, water, shadows, intensity, toScreen, QUAD, columns, applyCam};
  };
})();

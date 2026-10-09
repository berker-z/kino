// RELIQUARY: a stained-glass lancet in the niche of a dark crypt, seen only
// by the light that passes through it. Phase 6 of the visual expansion
// (KINO_VISUAL_EXPANSION_MASTER_SPEC.md).
//
// The room is a photograph (the crypt of Saint-Marcouf), brought down to
// near darkness. The lancet is drawn here once, as two maps for
// Kino.transmissionComposite:
//
// - density (black clear, white dense): handblown glass a little uneven,
//   lead cames and the stone frame at full density.
// - tint (white clear): the panes' colours.
//
// Behind it, a band of daylight moves down the lancet; only where the band
// falls does the glass come alive, and the cames stay black inside the
// light. The band then widens to the whole panel and sinks away. A light
// filmPass after it gives the bright panes their glow.
//
//   0-3     near dark: the panel barely there (the room's light off its face)
//           (the niche's splay catches the transmitted light: an authored glow
//           that follows how much of the band is inside the panel)
//   3-7     the band descends: medallions light top to bottom
//   7-10    the band opens out: the whole motif
//   10-12   it sinks and narrows: the logic in reverse
// The camera pushes in slowly throughout.

(function () {
  const W = 2560, H = 1440;
  const {progress, easeInOut, smooth} = Kino;
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";

  // The panel's place on the plate (crypt drawn 2560 wide): an arched
  // lancet in the niche.
  const PX = 993, PY = 1830, PW = 214, PH = 713;
  const RES = 3; // panel maps drawn at 3x plate px
  const hash = (a, b) => { let h = Math.imul(a, 374761393) ^ Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  function lancet(g) {
    g.beginPath();
    g.moveTo(0, PW / 2);
    g.arc(PW / 2, PW / 2, PW / 2, Math.PI, 0);
    g.lineTo(PW, PH);
    g.lineTo(0, PH);
    g.closePath();
  }

  // The motif, in panel px (PW x PH): a diamond lattice of pale quarries,
  // three medallions with quatrefoils, a trefoil in the arch, an amber border.
  function motif(tint, dens) {
    const cames = [];
    const cx = PW / 2, meds = [[cx, 230, 66], [cx, 400, 66], [cx, 570, 66]];
    // Quarries: pale greenish glass, slightly varied.
    tint.fillStyle = "#d9e2cc";
    tint.fillRect(0, 0, PW, PH);
    // Each quarry a slightly different glass: diamonds of varied hue.
    for (let j = -2; j < PH / 17 + 2; j++) for (let i = -2; i < PW / 34 + 2; i++) {
      const qx = i * 34 + (j % 2) * 17, qy = j * 28.3;
      const h = hash(i + 50, j + 90), k = hash(i + 7, j + 3);
      tint.fillStyle = `rgb(${Math.round(200 + 40 * h)},${Math.round(206 + 30 * k)},${Math.round(170 + 50 * hash(i, j))})`;
      tint.beginPath(); tint.moveTo(qx, qy - 28.3); tint.lineTo(qx + 17, qy); tint.lineTo(qx, qy + 28.3); tint.lineTo(qx - 17, qy); tint.closePath(); tint.fill();
    }
    for (let k = -20; k < 40; k++) {
      cames.push([[k * 34, 0], [k * 34 + PH * 0.6, PH]]);
      cames.push([[k * 34, 0], [k * 34 - PH * 0.6, PH]]);
    }
    // Border.
    tint.save(); lancet(tint); tint.lineWidth = 26; tint.strokeStyle = "#d39a2c"; tint.stroke(); tint.restore();
    // Medallions: deep blue field, red quatrefoil, green centre.
    for (const [mx, my, r] of meds) {
      tint.fillStyle = "#1b3c9a"; tint.beginPath(); tint.arc(mx, my, r, 0, 7); tint.fill();
      tint.fillStyle = "#b31d2a";
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; tint.beginPath(); tint.arc(mx + Math.cos(a) * r * 0.38, my + Math.sin(a) * r * 0.38, r * 0.34, 0, 7); tint.fill(); }
      tint.fillStyle = "#2a8a6e"; tint.beginPath(); tint.arc(mx, my, r * 0.2, 0, 7); tint.fill();
      cames.push(["circle", mx, my, r], ["circle", mx, my, r * 0.2]);
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; cames.push(["circle", mx + Math.cos(a) * r * 0.38, my + Math.sin(a) * r * 0.38, r * 0.34]); }
    }
    // Trefoil in the arch: amber and blue.
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      tint.fillStyle = i ? "#e0a530" : "#3550b0";
      tint.beginPath(); tint.arc(cx + Math.cos(a) * 22, 92 + Math.sin(a) * 22, 22, 0, 7); tint.fill();
      cames.push(["circle", cx + Math.cos(a) * 22, 92 + Math.sin(a) * 22, 22]);
    }

    // Density: glass a little uneven (vertical streaks of handblown glass),
    // then the cames on top at full density.
    dens.fillStyle = "#000";
    dens.fillRect(0, 0, PW, PH);
    for (let x = 0; x < PW; x += 1) {
      const v = 0.1 + 0.28 * hash(x, 7) + 0.1 * Math.sin(x * 0.21) + 0.08 * Math.sin(x * 0.047);
      dens.fillStyle = `rgba(255,255,255,${v.toFixed(3)})`;
      dens.fillRect(x, 0, 1, PH);
    }
    for (let y = 0; y < PH; y += 6) for (let x = 0; x < PW; x += 6) {
      if (hash(x * 13 + 1, y * 7 + 3) < 0.04) { dens.fillStyle = "rgba(255,255,255,0.35)"; dens.fillRect(x, y, 3, 2); }
    }
    // Grisaille: paint on the glass, partial density: hatching in each
    // medallion's field and a radiating line on each lobe.
    for (const [mx, my, r] of meds) {
      dens.save();
      dens.beginPath(); dens.arc(mx, my, r, 0, 7); dens.clip();
      dens.strokeStyle = "rgba(255,255,255,0.55)";
      dens.lineWidth = 0.8;
      for (let k = -r; k < r; k += 3.2) { dens.beginPath(); dens.moveTo(mx + k, my - r); dens.lineTo(mx + k + r * 0.4, my + r); dens.stroke(); }
      dens.restore();
      dens.strokeStyle = "rgba(255,255,255,0.7)";
      dens.lineWidth = 1.1;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2, lx = mx + Math.cos(a) * r * 0.38, ly = my + Math.sin(a) * r * 0.38;
        for (let q = -2; q <= 2; q++) { const b = a + q * 0.35; dens.beginPath(); dens.moveTo(lx - Math.cos(b) * 4, ly - Math.sin(b) * 4); dens.lineTo(lx + Math.cos(b) * r * 0.3, ly + Math.sin(b) * r * 0.3); dens.stroke(); }
      }
    }
    dens.strokeStyle = "#fff";
    dens.lineCap = "round";
    dens.save();
    lancet(dens); dens.clip();
    // Lattice cames stop at the medallions: clip them out.
    dens.save();
    dens.beginPath(); dens.rect(0, 0, PW, PH);
    for (const [mx, my, r] of meds) { dens.moveTo(mx + r, my); dens.arc(mx, my, r, 0, 7, true); }
    dens.clip("evenodd");
    dens.lineWidth = 3.2;
    for (const c of cames) if (c[0] !== "circle") { dens.beginPath(); dens.moveTo(...c[0]); dens.lineTo(...c[1]); dens.stroke(); }
    dens.restore();
    dens.lineWidth = 4;
    for (const c of cames) if (c[0] === "circle") { dens.beginPath(); dens.arc(c[1], c[2], c[3], 0, 7); dens.stroke(); }
    dens.lineWidth = 5;
    dens.beginPath(); dens.moveTo(13, PW / 2); dens.lineTo(13, PH); dens.moveTo(PW - 13, PW / 2); dens.lineTo(PW - 13, PH); dens.stroke();
    dens.restore();
    // The stone frame round the glass: opaque.
    dens.save(); lancet(dens); dens.lineWidth = 8; dens.stroke(); dens.restore();
  }

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }

  window.reliquaryScene = async function () {
    const crypt = await load(base + "assets/crypt.jpg");
    const CH = (crypt.naturalHeight * 2560) / crypt.naturalWidth;

    const mk = () => { const c = document.createElement("canvas"); c.width = PW * RES; c.height = PH * RES; const g = c.getContext("2d"); g.scale(RES, RES); return [c, g]; };
    const [tintC, tg] = mk(), [densC, dg] = mk();
    motif(tg, dg);

    // Camera: plate px -> screen, pushing in on the niche.
    const cam = (ctx, t) => {
      const z = 1.62 + 0.14 * easeInOut(progress(t, 0, 12));
      ctx.translate(W / 2, H / 2);
      ctx.scale(z, z);
      ctx.translate(-1120, -2190);
    };
    // How much of the band is inside the panel (0-1): drives the spill.
    const lit = (t) => {
      const {y, w} = band(t);
      let s = 0;
      for (let k = 0; k <= 20; k++) { const py = (k / 20) * PH, d = (py - y) / w; s += Math.exp(-d * d); }
      return Math.min(1, s / 6);
    };
    // The room, near dark, plus the transmitted light falling on the
    // niche's splay and sill (authored: a warm glow round the panel).
    const room = (ctx, t) => {
      cam(ctx, t);
      ctx.filter = "brightness(0.13) saturate(0.6)";
      ctx.drawImage(crypt, 0, 0, 2560, CH);
      ctx.filter = "none";
      const a = lit(t);
      if (a > 0.01) {
        const {y} = band(t);
        const cy = PY + Math.min(PH, Math.max(0, y));
        const g = ctx.createRadialGradient(PX + PW / 2, cy, 20, PX + PW / 2, cy, 330);
        g.addColorStop(0, `rgba(255,214,160,${(0.22 * a).toFixed(3)})`);
        g.addColorStop(1, "rgba(255,214,160,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.fillRect(PX - 360, PY - 360, PW + 720, PH + 720);
      }
    };
    const panel = (img) => (ctx, t) => { cam(ctx, t); ctx.drawImage(img, PX, PY, PW, PH); };
    const coverage = (ctx, t) => { cam(ctx, t); ctx.translate(PX, PY); lancet(ctx); ctx.fillStyle = "#fff"; ctx.fill(); };

    // The light behind: a horizontal band moving down the lancet (in panel
    // px), widening, then sinking away. Plus a faint sky so the cames read.
    const band = (t) => ({
      y: -120 + 560 * easeInOut(progress(t, 2.5, 5)) + 520 * easeInOut(progress(t, 10, 2)),
      w: 90 + 520 * smooth(progress(t, 7, 2)) * (1 - smooth(progress(t, 10, 2))),
    });
    const backlight = (ctx, t) => {
      cam(ctx, t);
      ctx.translate(PX, PY);
      const {y, w} = band(t);
      const g = ctx.createLinearGradient(0, y - 2 * w, 0, y + 2 * w);
      for (let i = 0; i <= 16; i++) {
        const u = i / 16, d = (u - 0.5) * 4, v = Math.exp(-d * d);
        g.addColorStop(u, `rgba(255,244,222,${v.toFixed(3)})`);
      }
      ctx.fillStyle = "rgb(5,6,8)";
      ctx.fillRect(-40, -40, PW + 80, PH + 80);
      ctx.fillStyle = g;
      ctx.fillRect(-40, y - 2 * w, PW + 80, 4 * w);
    };

    const transmit = Kino.transmissionComposite({
      width: W, height: H, room, density: panel(densC), tint: panel(tintC), coverage, backlight,
      extinction: 5, gain: 3.4, front: 0.18,
    });
    return {transmit, room, density: panel(densC), tint: panel(tintC), coverage, backlight, cam, densC, tintC, band, PX, PY, PW, PH};
  };
})();

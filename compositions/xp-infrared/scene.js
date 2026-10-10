// WHITE ORCHARD: a tree's autumn canopy against a clear sky, moving in the
// wind, turned into false infrared: the leaves pale and luminous, the sky
// black. Phase 5 of the visual expansion (docs/briefs/KINO_VISUAL_EXPANSION_MASTER_SPEC.md).
//
// The source is ordinary daylight footage (Appleton Farms, Massachusetts),
// extracted offline to assets/canopy/c%03d.jpg at 24 fps (see the index),
// drawn with a slow lateral drift. Kino.infraredPass does the rest from
// colour alone: no mattes here, so what you see is the global response
// and its guesses (see the A/B for mattes on a still).
//
// The response arrives in the order an infrared photographer's kit does:
//   0-3     the ordinary colour picture
//   3-5     black and white through a deep red filter (red-heavy luma,
//           sky starting to darken, no foliage lift yet)
//   5-7.5   the infrared lift: leaves go pale, the sky goes to black
//   7.5-12  hold the strange landscape; the wind and the drift keep going

(function () {
  const W = 2560, H = 1440;
  const {progress, easeInOut} = Kino;
  const base = /\/ab\/[^/]*$/.test(location.pathname) ? "../" : "";
  const N = 288;

  function load(src) {
    const img = new Image();
    img.src = src;
    return img.decode().then(() => img);
  }

  window.orchardScene = async function () {
    const frames = await Promise.all(Array.from({length: N}, (_, i) => load(base + `assets/canopy/c${String(i + 1).padStart(3, "0")}.jpg`)));
    const FW = frames[0].naturalWidth, FH = frames[0].naturalHeight;
    // Scaled so there is room to drift sideways.
    const S = (W / FW) * 1.12;
    const paint = (ctx, t) => {
      const f = frames[Math.min(N - 1, Math.max(0, Math.round(t * 24)))];
      const x = -(FW * S - W) * (0.1 + 0.8 * easeInOut(progress(t, 0, 12)));
      ctx.drawImage(f, x, (H - FH * S) / 2, FW * S, FH * S);
    };
    const tune = (t) => {
      const red = easeInOut(progress(t, 3, 2));
      const lift = easeInOut(progress(t, 5, 2.5));
      return {strength: red, foliageLift: 0.42 * lift, skyDarkening: 0.35 * red + 0.55 * lift, glow: 0.15 * lift, exposure: -0.35 * lift, contrast: 0.35 + 0.15 * lift};
    };
    return {paint, tune, frames};
  };
})();

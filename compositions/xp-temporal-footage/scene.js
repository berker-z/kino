// TEMPORAL SCAN ON FOOTAGE: a teaching demo for Kino.temporalScan.
//
// The source is real footage (horses galloping, research/dither/media/footage
// CREDITS.txt), extracted offline to assets/frames/f%04d.jpg: horses.src from
// 35 s for 19 s at its native 29.97 fps, 1920x1080, played back at 30. The source function
// draws frame floor((sourceTime - CLIP_START) * FPS_SRC), clamped. No <video>
// seeking, so any frame order gives the same picture.
//
// Memory: the JPEGs stay compressed in <img> elements (~160 MB); Chrome
// decodes on drawImage and keeps decoded frames in its own bounded image
// cache. One output frame touches at most span * 30 distinct frames.
//
// Schedule (output t, seconds):
//   0-2       span 0: the plain footage
//   2-3.6     vertical strips (axis x), span opens to SPAN_X; left edge earlier
//   3.6-5.5   hold
//   5.5-6.4   span closes to 0
//   6.5-6.9   crossfade to the second stretch of the take (span 0)
//   7-8.6     horizontal bands (axis y), span opens to SPAN_Y; top edge earlier
//   8.6-11    hold
//   11-12     span closes; back to the plain footage
//
// A picture-in-picture of the untouched source at the same t sits bottom
// right, labelled SOURCE.

(function () {
  const W = 2560, H = 1440;
  const {progress, smooth, easeInOut} = Kino;
  // Played at 30 fps instead of its native 29.97 (0.1% slower, invisible) so
  // that at span 0 every output frame lands exactly on a source frame.
  const CLIP_START = 35, FPS_SRC = 30, N_FRAMES = 570;
  // Two stretches of the same take: A (from 36.5 s: horses gallop across) for
  // the x scan, B (from 48 s: one horse runs across) for the y scan. The
  // source's extreme close-ups in between are skipped with a 0.4 s
  // crossfade while the span is 0.
  const srcA = (t) => 36.5 + t, srcB = (t) => 41 + t;
  const XF0 = 6.5, XF1 = 6.9;
  const SPAN_X = 1.0, SPAN_Y = 1.5;
  const FONT = '"IBM Plex Mono"';
  const INK = "#E8EDF5", DIM = "#9AA6BA", PILL = "rgba(10, 16, 34, 0.74)";

  const spanX = (t) => SPAN_X * easeInOut(progress(t, 2, 1.6)) * (1 - easeInOut(progress(t, 5.5, 0.9)));
  const spanY = (t) => SPAN_Y * easeInOut(progress(t, 7.0, 1.6)) * (1 - easeInOut(progress(t, 11, 1)));

  function loadFrames() {
    return Promise.all(Array.from({length: N_FRAMES}, (_, i) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("frame " + i));
      img.src = `assets/frames/f${String(i).padStart(4, "0")}.jpg`;
    })));
  }

  function pill(ctx, text, x, y, {align = "left", size = 26, color = INK, alpha = 1} = {}) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `500 ${size}px ${FONT}`;
    ctx.letterSpacing = "0.18em";
    const w = Math.ceil(ctx.measureText(text).width);
    const padX = 18, h = Math.round(size * 1.9);
    const x0 = align === "left" ? x : x - w - 2 * padX;
    ctx.fillStyle = PILL;
    ctx.fillRect(Math.round(x0), Math.round(y), w + 2 * padX, h);
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, Math.round(x0 + padX), Math.round(y + h / 2 + 1));
    ctx.restore();
  }

  window.temporalFootageScene = async function () {
    await document.fonts.load(`400 26px ${FONT}`);
    await document.fonts.load(`500 26px ${FONT}`);
    const frames = await loadFrames();
    const IW = frames[0].naturalWidth, IH = frames[0].naturalHeight;
    const kx = IW / W, ky = IH / H;

    const frameAt = (s) => frames[Math.max(0, Math.min(N_FRAMES - 1, Math.floor((s - CLIP_START) * FPS_SRC + 1e-6)))];

    // The source: footage at source time s, only the strip's rectangle.
    // With a span of 1 s only ~30 distinct frames cover the whole width, so
    // drawing floor(frame) alone leaves ~85 px steps. Blending frame k with
    // k+1 by the fractional part makes the time gradient continuous; still
    // a pure function of s.
    const footage = (ctx, s, strip) => {
      const f = Math.max(0, Math.min(N_FRAMES - 1, (s - CLIP_START) * FPS_SRC + 1e-6));
      const k = Math.floor(f), a = f - k;
      const sx = strip.x * kx, sy = strip.y * ky, sw = strip.w * kx, sh = strip.h * ky;
      ctx.drawImage(frames[k], sx, sy, sw, sh, strip.x, strip.y, strip.w, strip.h);
      if (a > 0.02 && k + 1 < N_FRAMES) {
        ctx.globalAlpha = a;
        ctx.drawImage(frames[k + 1], sx, sy, sw, sh, strip.x, strip.y, strip.w, strip.h);
        ctx.globalAlpha = 1;
      }
    };
    const full = {x: 0, y: 0, w: W, h: H, index: 0};

    const PIP = {w: 640, h: 360, x: W - 96 - 640, y: H - 96 - 360};

    return function paint(ctx, t) {
      const xf = smooth(progress(t, XF0, XF1 - XF0)); // 0: stretch A, 1: stretch B
      const s = xf < 1 ? srcA(t) : srcB(t);
      const sx = spanX(t), sy = spanY(t);
      if (sx > 0) Kino.temporalScan(ctx, s, {width: W, height: H, axis: "x", bands: 320, span: sx, direction: -1, source: footage});
      else if (sy > 0) Kino.temporalScan(ctx, s, {width: W, height: H, axis: "y", bands: 240, span: sy, direction: -1, source: footage});
      else footage(ctx, s, full);
      if (xf > 0 && xf < 1) {
        ctx.globalAlpha = xf;
        ctx.drawImage(frameAt(srcB(t)), 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Picture-in-picture: the untouched source at the same moment.
      ctx.fillStyle = PILL;
      ctx.fillRect(PIP.x - 6, PIP.y - 6, PIP.w + 12, PIP.h + 12);
      ctx.drawImage(frameAt(s), PIP.x, PIP.y, PIP.w, PIP.h);
      if (xf > 0 && xf < 1) {
        ctx.globalAlpha = xf;
        ctx.drawImage(frameAt(srcB(t)), PIP.x, PIP.y, PIP.w, PIP.h);
        ctx.globalAlpha = 1;
      }
      pill(ctx, "SOURCE · NOW", PIP.x - 6, PIP.y - 6 - 46, {size: 22});

      // Caption, per phase, cross-faded.
      const aPlain = 1 - smooth(progress(t, 1.6, 0.3)) + smooth(progress(t, 11.7, 0.3));
      const aX = smooth(progress(t, 1.9, 0.3)) * (1 - smooth(progress(t, 6.4, 0.3)));
      const aY = smooth(progress(t, 6.9, 0.3)) * (1 - smooth(progress(t, 11.4, 0.3)));
      const CX = 96, CY = H - 96 - 50;
      pill(ctx, "TEMPORAL SCAN · SPAN 0 · EVERY STRIP SHOWS NOW = THE PLAIN FOOTAGE", CX, CY, {alpha: aPlain});
      pill(ctx, `TEMPORAL SCAN · 320 VERTICAL STRIPS · LEFT EDGE = ${sx.toFixed(1)} S AGO`, CX, CY, {alpha: aX});
      pill(ctx, `TEMPORAL SCAN · 240 HORIZONTAL BANDS · TOP EDGE = ${sy.toFixed(1)} S AGO`, CX, CY, {alpha: aY});

      // Edge markers: which side is earlier, which is now.
      const mX = Math.min(1, sx / 0.25), mY = Math.min(1, sy / 0.25);
      pill(ctx, `◂ ${sx.toFixed(1)} S AGO`, 96, 96, {alpha: mX, size: 24});
      pill(ctx, "NOW ▸", W - 96, 96, {alpha: mX, size: 24, align: "right"});
      pill(ctx, `▴ ${sy.toFixed(1)} S AGO`, 96, 96, {alpha: mY, size: 24});
      pill(ctx, "▾ NOW", 96, CY - 90, {alpha: mY, size: 24});
    };
  };
})();

# SpectrumFeed

A song's spectrum drawn as a column of ridgelines that feeds upward on the beat, like a plotter printing one line per note. Every line is real data: the averaged frequency spectrum of one note of the track. New notes enter at the bottom, older ones climb and fade out at the top.

It started as the "waves" scene in `compositions/waves-test` and took about ten rounds of looking at renders to get right. Most of the defaults below exist because the obvious version looked wrong in a specific way. Those reasons are written down so nobody has to rediscover them.

## Usage

```js
const feed = Kino.spectrumFeed({
  spectrum: window.SPECTRUM,      // from scripts/spectrum.py
  beats: map.beats,               // audiomap grid.beats_sec
  duration: 24,
  fps: 60,
  width: 2560,
  height: 1440,
  amplitude: (t) => 0.05 + 0.13 * dropProgress(t),   // or a number
});

Kino.ditherCanvas(scene, tl, {
  width: 2560, height: 1440, duration: 24, fps: 60,
  ink: colors.ink, ground: colors.ground,
  mode: "smooth",                 // required, see below
  paint: (ctx, t) => { feed.paint(ctx, t); return {}; },
});
```

The composition root needs `data-fps="60"` and `data-width`/`data-height` matching the render size. `feed.rowStep` and `feed.rows` report what it actually used.

Data comes from two analysis passes over the audio:

```
python3 scripts/spectrum.py audio/track.opus -o assets/spectrum.js --js-global SPECTRUM --bands 96
python3 ~/.claude/skills/music-to-video/scripts/analyze-beatgrid.py audio/track.opus -o audiomap.json
```

96 bands gives narrow, organic peaks. 48 looked blobby.

## Why it looks the way it does

**One line owns one note for its whole life.** The first version drew row *k* as "the spectrum *k* steps ago", recomputed every frame. Since "now" moves every frame, every line on screen changed shape every frame, and the column shimmered. Now each line is the mean spectrum over one note interval, computed once and cached, and the column scrolls between notes. Averaging over the note also takes out per-frame noise.

**Notes come from the analysed beat grid, not the BPM.** `beatTicks` subdivides the actual beat times (eighth notes by default), so the feed follows the performance's tempo drift. With `motion: "linear"` the column moves exactly one row per note at constant speed. `"step"` lunges at each note and rests; it reads as a bump per line and was rejected.

**Rows are pixel-locked.** This was the hard one. Thin, evenly spaced lines that sit at fractional pixel positions get antialiased differently from each other: a line on the pixel grid is crisp and bright, one between pixels is split across two rows and looks dim and soft. While the column scrolls, every line's sub-pixel offset changes every frame, so brightness crawls through the lines. The fix has two parts:

- `rowStep: "auto"` picks the spacing so constant-speed scroll is a whole number of pixels per frame (an eighth at 89 BPM is ~20.2 frames at 60 fps, so 20 px rows scroll ~1 px per frame).
- `ridgelines` rounds the whole column offset to whole pixels every frame, so all lines move together by the same integer amount. 96% of frames move exactly 1 px; the occasional 0 or 2 is tempo drift.

This only holds if the video is shown 1:1. See the next point.

**Render at the viewing size.** Any rescale after rendering brings the brightness flicker back, because the scaler puts lines on fractional pixels again. A 1080p render on a 2560×1440 monitor is stretched 1.333× even fullscreen, which is where most of the flicker in early tests came from. Render one master per destination at its exact pixel size (2560×1440 for Berker's screen, 1080×1920 for vertical phone video). For small playback, use fewer rows with more spacing and thicker lines rather than shrinking a dense render.

**Draw with antialiasing, not 1-bit.** `ditherCanvas` with `mode: "threshold"` (or the default ordered dither) snaps line edges to whole pixels, so a 2 px line alternates between 2, 3 and 4 px tall as it moves. `mode: "smooth"` keeps the antialiasing and just maps luminance from ground to ink. Combined with pixel-locking this gives lines that look identical frame to frame. Lines are stroked at full ink; partial ink only appears in the fade.

**Stroke only the curve.** Each row fills black underneath itself to hide older rows behind it, then strokes just the top curve. Stroking the filled shape drew vertical side edges, which showed up as a box around the column.

**Signal in the middle, flat at the ends.** Bands run low to high across the row (`mirror: false`; mirroring made the shapes symmetric and fake-looking) under a Hann window covering the middle `focus` (0.72) of the row. The mids and the voice end up down the spine of the column and the ends lie flat. The narrow column (`left` 0.37, `right` 0.69) in a lot of dark is what makes it read as a printed plot.

**The oldest rows fade.** `fadeOldest: 10` dims the top ten rows by their scrolled position with a smoothstep, so lines dissolve instead of popping off. Needs `smooth` mode to show partial ink cleanly.

**No wobble, no static, no tears.** `roughness` exists in the painter but is off. Background noise and hit-driven row shears were tried and both read as jitter.

## Known limits

- Thin lines will always fight a resampled pixel grid. Small previews in a feed or a scaled browser player will band a little. The fix is a render sized for that destination, not a setting.
- `spectrum.py` normalizes against the loudest band in the whole file, so a quiet track and a loud track look similarly busy. Fine for one song; worth revisiting if feeds of different tracks sit side by side.
- The 60 fps render takes about as long as the clip is long, times two. 24 s takes about 55 s.

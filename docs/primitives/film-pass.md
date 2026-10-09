# filmPass

`filmPass(stage, timeline, {width, height, duration, fps, paint, ...settings})` makes a picture look exposed on black-and-white film and printed. It's a WebGL pass in the same shape as `screenPass`: one RGB canvas painted over black per frame, one GL canvas out.

It does little on purpose. In order: gate weave, exposure in stops, halation, a toe and an S-curve, optional split toning, vignette, grain. Dust, scratches, misregistration and emulsion simulation are left out until the basic exposure look has earned more (see the brief, `KINO_NEXT_VISUAL_LANGUAGES.md`).

## Why the defaults

**Halation** is light bouncing back off the film base, so it starts at highlights and spreads into the dark around them, reddish because the red-sensitive layer is nearest the base. The pass thresholds *before* blurring: on a quarter-size canvas, `brightness()` then `contrast()` map luma 0.72 to black and white to white (`thresholdFilter`), then `blur()`. A blur over everything would just be soft focus. `halationColor` defaults to `#ff7a4a`; at 0.45 it's visible around the harbour lights and on bright type without tinting the frame.

**Grain** is value noise on a lattice of `grainSize` px (1.6 at 1440p), with a new lattice every frame from a PCG hash of the frame number, so it moves but the same frame always comes back identical. Its amplitude is weighted toward the midtones (`0.25 + 0.75 · 4l(1−l)`), so black and white type stay clean. At 0.07 it's already obvious on a 2560×1440 monitor. It also makes the encode big: THE SILENT CITY is 92 MB for 12 s.

**Curve**: a toe that lifts black by 0.025 (a print's black isn't the screen's), then a 35% blend toward smoothstep. **Vignette** 0.28 from about a third of the way out. **Weave** 0.6 px: a slow wander plus a small per-frame component, both from `noise2` of time and frame (`gateWeave`), so it's seek-safe.

`strength` scales all of it, and at 0 the pass is an exact passthrough: no weave, no curve, no grain. The browser test checks that to the pixel. `tune(t)` overrides any numeric setting per frame; the darkroom piece uses it for one 0.3-stop lift during its dissolve.

`toning: [shadow, highlight]` replaces the colour with a split tone of the luma, rescaled so luma is unchanged.

## Tests

`tests/browser/film-pass.html`: strength 0 equals the source, halation brightens the dark next to a bright window (13.5 → 31.8 in red), grain differs between frames but repeats after other seeks, toning.

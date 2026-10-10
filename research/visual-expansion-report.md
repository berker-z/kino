# Visual expansion: six operations

Built from `docs/briefs/KINO_VISUAL_EXPANSION_MASTER_SPEC.md` on 2026-10-09, starting at `61c5e53`. The browsable version, with films, stills and A/B rows, is `examples/expansion/index.html`. This is the written summary the brief asks for.

Every film is 12 s at 2560×1440, 24 fps, rendered on this machine with headless Chrome on SwiftShader (CPU WebGL). Render times are that, not a GPU.

| Phase | Composition | New operation | Reused existing primitives | Runtime | Automated checks | A/B result | Proposal |
|---|---|---|---|---|---|---|---|
| Digicam | THE STAIRWELL | `digicamPass` | timeDriver, `gl.ts`, filmPass's `thresholdFilter`; filmPass in the A/B | 177 s, 110 MB | 8 browser | Works on the authored scene and on a contrasty cat; a bright room only becomes a cold cheap snapshot; saturated graphics go pastel | Provisional |
| Shutter drag | AFTERIMAGE | `shutterIntegrate`, `exposureSamples` | digicamPass, filmPass, xp-temporal-footage's horse frames | 2290 s, 102 MB | 6 unit, 6 browser | Trails and the frozen subject clearly separable; works on footage | Keep, refine cost |
| Xerox | THE TESTAMENT | `copyGenerations`, `copyStep` | htmlPlate, timeDriver; ditherPass and risoPass in the A/B | 49 s, 19 MB | 5 unit | A copy of a copy; nothing like dither or riso | Keep for sheets |
| Projection | SANCTUARY | `surfaceProject` + homography helpers | filmPass | 197 s, 72 MB | 4 unit, 8 browser | Light on stone; the naive rectangle overlay clearly isn't | Keep, refine next |
| Infrared | WHITE ORCHARD | `infraredPass` | timeDriver, `gl.ts` | 73 s, 133 MB | 8 browser | Right on foliage under blue sky; moss reads as leaves; mattes fix what colour can't | Provisional, drop first |
| Transmission | RELIQUARY | `transmissionComposite`, `transmittance` | filmPass (glow) | 62 s, 32 MB | 1 unit, 6 browser | Backlit matter; the screen blend paints light over the leads | Keep, refine next |

All checks: `npm run typecheck` clean, `npm test` 57 pass, `npm run test:browser` 59 pass (old pages included), `hyperframes check` passes on all six compositions.

## Comparison

**Originality.** Projection and transmitted light are the newest things in kino: nothing before them composited light by a physical rule. Shutter drag is close behind; it's the first operation that integrates time rather than sampling it (slit-scan samples). Photocopy is a known look done properly. Digicam is a camera response, and the half of the look that matters most (the flash) is authored in the composition. False infrared is the most familiar look of the six.

**Transferability.** Photocopy transfers best within its domain: any still sheet, type or photograph, same settings, and the A/B architecture photo needed no tuning. Projection transfers to any content, but every room needs its quad and occlusion authored. Transmission works on any density plate: the photographic negative and slide in the A/B used the same code as the stained glass. Shutter drag works on any time-pure source, including footage. Digicam transfers as a camera response but not as a flash; on the living room it's a cold snapshot. Infrared transfers only where the colour guess holds.

**Complexity.** Small everywhere: each is one file. Digicam has the most settings (16); infrared 8; the arrangements 6-10 options each. Nothing became a framework.

**Render cost.** Shutter drag is by far the most expensive: one source paint per sample, 32 minutes for AFTERIMAGE. Everything else rendered in minutes or less. File size matters as much: digicam's per-frame noise made a 234 MB render (now 110 MB); photocopy, with no per-frame noise, is 19 MB.

**Value to the arsenal.** Projection and transmission add a new family (light compositing) that pairs with every material. Shutter drag adds a time move as strong as slit-scan. Digicam and photocopy add two materials with clear moods. Infrared adds a material that's mostly one specific picture.

## Bespoke versus reusable

Reusable, exported, tested, documented: the six operations and their pure helpers. Composition-only on purpose: every authored light (the stairwell's flash and shadow, the corridor's light pool, the niche's spill), every matte (the chair, the colonnettes, the field's bands), each copy arriving behind an edge, the infrared arrival order, the stained-glass motif, the Doré slide drift. None of these was needed twice, so none was promoted.

## What was inspected

Each hero film was checked as snapshots at four or more moments during development and revised at least once on what was wrong; the revisions are listed in the page's sections and in each primitive doc. The A/B stills are frames pulled from the A/B renders at identical timestamps and were looked at. Mechanical properties (exact passthrough, bounds, determinism under out-of-order seeks, mapping, attenuation, noise on black, matte alignment) are tested and were not judged by eye. Nobody has watched the films at full speed on a 2560×1440 monitor yet.

## Recommendation

Refine next: **projection** and **transmitted light**. Both have a rule you can see, both are cheap, both made the most finished-looking films, and both are new. Projection wants a second room and non-rectangular content; transmission wants a real scanned glass negative and light that falls into the room for real.

Drop first, if kino needs to stay small: **false infrared**. It's a colour guess that only holds for one kind of picture; with mattes it's mostly authored work.

Berker's verdict decides promotion, looks and defaults. Nothing here has been made into a `MotionAesthetic`.

## Known issues left as they are

- THE STAIRWELL is still 110 MB: chroma noise still changes every frame.
- WHITE ORCHARD's footage is 1080p scaled up 1.5×.
- SANCTUARY's colonnette boxes are approximate by a few px at 1:1.
- Source plates and footage are gitignored; each composition's `plates.txt` (fetched by `scripts/commons.py`) or `credits-extra.txt` says where they came from, and `assets/CREDITS.txt` holds author and licence.

# shutterIntegrate

`shutterIntegrate({width, height, source, duration, samples, flash, flashAt, fade, ...})` returns a painter `(ctx, t)` that exposes `source` over a shutter interval, with an optional flash inside it. `exposureSamples(t, ...)` is the pure half: the sample times and weights.

A slow shutter with a flash makes one picture out of two kinds of light. Everything that glows or is lit by ambient light piles up over the whole interval, so moving things leave trails. The flash is short and bright, so whatever it lights is frozen sharp at the instant it fires. The trails and the sharp subject are two parts of one exposure, which is why this is an arrangement and not a blur filter.

## How

For output time `t`, `samples` ambient samples sit at the centres of equal slices of `(t − duration, t)`, weighted `1 − fade · u` (u = 0 at t, 1 at the start) and normalised so they sum to `1 − flash`. The flash sample sits at `t − duration · flashAt` with weight `flash`. Weights always sum to 1, so anything that doesn't move comes out exactly as the source paints it, however long the shutter. With `duration` 0 every sample collapses to t and the frame is the source.

Each sample is painted into a scratch canvas, uploaded, decoded to linear light and added into a half-float framebuffer (`EXT_color_buffer_float`; it throws a readable error without it). The sum is encoded back to sRGB once. Summing linear light on a float buffer matters twice: faint trails keep their gradation instead of rounding away in 8 bits, and a stack of identical samples is exactly as bright as one (tested to 0 levels).

`flashSource` paints what the flash lights, if it isn't the whole source: in AFTERIMAGE the flash sample shows the lamp's shade in grey metal, while the ambient samples show it as a dark shape.

## Glow, the part the first take got wrong

A canvas can't paint anything brighter than white. A real bulb is hundreds of times brighter than the room, so its long-exposure streak saturates. Sampled as an ordinary source, a bulb's trail is white divided among the samples, which looks like a grey smear (take one) or a row of beads (take two, 40 samples of a sharp-cored bulb). `glow` is a second painter for luminous parts, summed at `glowGain` times its painted intensity into the same float buffer before the final clip. At gain 30 with a soft gaussian core and 64 samples the streak is continuous and saturated, and brightest where the pendulum slows at the ends of its swing, which is what a real long exposure of a pendulum looks like.

## Cost

Stateless means expensive: every frame paints the source (and glow) once per sample. The browser test measures 59 / 176 / 645 ms per 1280×720 frame at 4 / 16 / 64 samples on SwiftShader (CPU), roughly linear. AFTERIMAGE at 2560×1440 with 64 samples, a plate, a moving light pool and a glow layer per sample rendered in 32 minutes for 12 s (one worker). Cheap sources, fewer samples, or a reduced-resolution glow layer are the levers; nothing is cached across frames on purpose.

## What it doesn't do

It isn't slit-scan (`temporalScan` samples different times in different strips), a motion streak particle effect, or a radial blur. It integrates whatever the source paints, so the source has to be a pure function of time; footage needs frame-addressable frames (the A/B uses the horse frames from `xp-temporal-footage`).

## Tests

Unit (`tests/expansion.test.ts`): weights positive and summing to 1 for every combination; duration 0 is one sample at t; samples centred in equal slices; flashAt 0 and 1; fade decreasing; repeatable regardless of call order; bounded sample counts (0, NaN, 1e9, negative duration). Browser (`tests/browser/shutter.html`): duration 0 equals the source (diff 0); a static picture is unchanged by a 2 s, 32-sample shutter with flash (diff 0); a moving square leaves a trail across the interval and stays sharp with a rear flash; repeat and out-of-order renders identical; glow at gain 30 saturates where a plain source can't; the cost curve.

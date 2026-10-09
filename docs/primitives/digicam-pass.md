# digicamPass

`digicamPass(stage, timeline, {width, height, duration, fps, paint, ...settings})` makes a picture look recorded by a cheap late-2000s consumer camera: hard digital clipping into a cool lavender white, crushed blue-black shadows, a tight cold bloom, edge fringing, sharpening halos, shadow noise. It's a WebGL pass in the same shape as `filmPass`: one RGB canvas painted over black per frame, one GL canvas out.

It is the camera's response, not the flash. A flat RGB frame has no depth, normals or occlusion, so no pass can relight a scene as a direct flash would (the subject blown out, the room behind it gone, the hard shadow). THE STAIRWELL authors that in the composition with explicit pieces: a matte for the subject, a gain on it, a falloff matte for the room, and the subject's own silhouette offset as its shadow. Then the pass clips it the way a small sensor does.

## Order

sRGB in, sRGB out, the middle in linear light:

1. **Lens.** Red sampled slightly outward from the centre and blue slightly inward (lateral chromatic aberration), `fringe` px at the corners. It shows as a thin colour edge on bright edges near the frame's sides, never at the centre.
2. **In-camera sharpening.** An unsharp mask against a 4-tap cross at 1.4 px, applied to the sRGB values before the curve, the way cameras sharpened JPEGs. The curve then exaggerates the halos: dark rings round bright objects are the tell.
3. **Chroma blocks** (`blocks`, 0.4). Colour from 8×8 block averages, luma untouched: a crude 4:2:0 JPEG. Subtle at 1440p; on since the fry. No per-frame JPEG re-encode.
4. **Exposure and coverage.** Linear light × 2^`exposure`, darkened toward the corners by `falloff` (a small flash and a cheap lens both do this).
5. **Sensor.** Fixed-pattern gain: per-pixel and per-column variation from (pixel, seed) only, the same every frame. Then a cold white balance (`cold`).
6. **Bloom.** Highlights above `bleedThreshold` (source luma), blurred on a quarter-size canvas, added back tinted with the highlight colour. Cold and tight (10 px), not filmPass's wide red halation.
7. **Per-frame noise.** Fine luma noise plus blotchier chroma noise (a 2.5 px lattice, luma-neutral), from (pixel, frame, seed). Weighted toward the shadows and multiplied by a ramp that is 0 at true black, so black never sparkles.
8. **Clip.** A black point (`blackPoint`, linear), then white at `whiteClip` with a very short shoulder (linear up to 90% of clip, then exponential into 1). Light near white *in every channel* is pulled toward the lavender highlight tint; keying on the smallest channel keeps bright yellow yellow.
9. **Shadow hue.** A luma-preserving shift toward blue-violet in a narrow band above black (linear luma 0.008 to 0.1). Black stays black and midtones keep their colour.
10. **The camera's curve.** A steep S (`contrast`) and oversaturation (`saturation`) in display space, the way cheap cameras shipped their JPEGs. Black and white are fixed points of the S.

`strength` 0 is an exact passthrough (tested to the pixel). In between it crossfades the processed frame with the source.

## Why the defaults

The first take (cold 0.55, shadow tint 0.55, tint band up to luma 0.3, highlight tint keyed on luma) turned the bright living room violet, made red pink and washed yellow to white. That's "a blue grade", which the brief rules out. Narrowing the band, lowering `cold` to 0.25 and keying the lavender on the minimum channel fixed the living room and kept saturated patches recognisable (browser test: red 229/42/102, green 18/223/61, blue 51/84/248).

Second round, after Berker's look at the A/B ("these all look lowkey the same... fry the digicam a bit more"): at the first defaults the pass sat too close to raw on anything not already harsh. It gained the camera curve (`contrast` 0.55, `saturation` 1.3), and the rest went harder: `exposure` 0.85 and `whiteClip` 0.74 (clipping about two stops early), `blackPoint` 0.014, `sharpen` 1.0, `fringe` 2.6, `falloff` 0.55, `blocks` 0.4 (the JPEG chroma blocks, off before). Now the bright living room comes out crunchy and blown, which reads as a cheap camera even without a flash.

`exposure` and `whiteClip` together decide how early the clip comes: a camera exposing for the subject. The A/B shows what this costs: large bright saturated areas lose saturation through the bloom (the colour bars go pastel). That's a real cheap-sensor trait, but heavy; lower `bleed` for graphics.

`noise` 0.032 gives a standard deviation of about 12.6 levels on a dark gray field (the S-curve amplifies it). `pattern` 0.02 alone gives about 9. Both are deliberately faint at 1440p; the fixed pattern shows as faint vertical banding in the shadows when you look for it.

## What it can't do

- Relight. The flash in THE STAIRWELL is the composition's matte and gain. On the living room (bright, evenly lit, no authored flash) the same settings give a cold, cheap digital snapshot but not a flash photograph. On the cat close-up, which has strong natural contrast, they come closest without help.
- Red-eye. Left out on purpose: eyes would need annotated positions, and the look doesn't depend on them.

## Performance

SwiftShader (headless Chrome, CPU), 2560×1440, 24 fps: THE STAIRWELL (12 s, 288 frames) rendered in 177 s with the fried defaults. The file is 110 MB: 234 MB with per-pixel luma noise, 167 MB with the noise on a 1.4 px lattice, 110 MB once the fry crushed the shadows (black compresses). Lower `noise` for anything that has to travel. The pass costs one source paint, two small canvas filters (bloom) and one shader with 7 texture reads per pixel.

## Tests

`tests/browser/digicam-pass.html`: strength 0 equals the source exactly; pure black far from highlights stays exactly 0; exposure −3/+3 stays in range and orders the ramp, +3 clips earlier; saturated R/G/B stay dominant in their channel (255/0/3, 0/255/11, 9/83/255 after the fry); noise is bounded (sd 12.6 on gray after the fry), moves per frame and repeats after out-of-order seeks; with noise and pattern off, different seeds give identical frames; the fixed pattern is the same in two frames; a checker and colour bars keep their order.

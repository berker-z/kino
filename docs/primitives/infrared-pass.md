# infraredPass

`infraredPass(stage, timeline, {width, height, duration, fps, paint, regions, ...settings})` is an art-directed false infrared: leaves pale and luminous, clear sky near black, the rest a red-filtered black and white. Same shape as `filmPass`: one canvas in, one GL canvas out.

## What it can't do

Infrared film records near-infrared light, which living leaves reflect strongly and clear sky barely contains. An RGB picture has no near-infrared measurement in it. So this pass can't know which pixels are leaves; it guesses from colour, and the guess is wrong wherever colour lies. Green paint and mossy stone read as foliage (the cloister in the A/B goes pale where it's green). A grey overcast sky doesn't darken. Autumn leaves are caught only because the proxy also accepts yellow-red over blue. It's a tonal transform that looks like infrared on the kind of picture infrared made famous. Where the guess isn't good enough, the author supplies mattes.

## Order

In linear light, per pixel:

1. **Base:** `0.65 R + 0.3 G + 0.05 B`, roughly panchromatic film behind a deep red filter, which is where IR photography starts.
2. **Foliage:** a proxy (green or yellow-red clearly over blue, some saturation, not black), or the foliage matte. Lifted as `base · (1 + 3 · foliageLift · veg) + 0.3 · foliageLift · veg`: multiplicative so the leaves' texture survives, plus a small floor so dark foliage turns luminous instead of staying dark grey.
3. **Shoulder** from 0.6: lifted leaves approach white without reaching it.
4. **Sky:** a proxy (blue over red, not dark), or the sky matte (minus foliage). Pushed toward black by `skyDarkening`. Clouds are bright and unsaturated, so the proxy leaves them alone.
5. **Contrast** around mid-grey in gamma space, then a small local **glow**: 8 taps on a ring of `glowRadius` px, screen-added from the brightest parts.
6. **Toning:** a two-colour split (silver by default).

## Mattes

`regions` paints over black in the same geometry as `paint`: red = foliage, blue = sky. `maskWeight` blends from the proxies (0) to the mattes (1). They're explicit and author-made; nothing segments the picture. The A/B's field mattes are two feathered bands (sky above the tree line, foliage below), which is all a landscape like that needs. Drawn with the same camera as the plate, they stay aligned when it moves.

## Why the defaults

The first lift (`foliageLift` 0.5, multiplicative only) took the test card's foliage from 130 to 150: barely different, and dark leaves stayed dark. The floor term fixed that (130 → 199). Too much lift flattens leaves: the WHITE ORCHARD first take was a white sheet with black holes. The film uses `foliageLift` 0.42, exposure −0.35 and a little more contrast in its final state, which keeps the canopy pearly with depth. The texture test records the trade: at the default lift the foliage keeps 92% of its texture's standard deviation, at an extreme lift of 1 about 55%.

No default green night-vision, no reticle, no scanlines, no noise.

## Cost

One shader, 9 evaluations of the IR function per pixel (centre plus the glow ring). 26-42 ms per 2560×1440 frame including a simple painter on SwiftShader.

## Tests

`tests/browser/infrared-pass.html`: strength 0 exact; on proxies alone foliage brightens (130 → 199), sky goes dark (31), the cloud stays light (246); foliage keeps its texture at default and heavy lift; a grey ramp stays monotone, saturated patches stay distinct, output is opaque; a feathered foliage matte lifts exactly where drawn (0.0 change outside, graded through the feather); a sky matte darkens an overcast sky the proxy can't recognise (201 → 56); seeks repeat; cost.

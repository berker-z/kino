# Type reveals

`arrange/type-reveal.ts` reveals type that the browser has already set. Nothing in it lays out text: `htmlPlate` does that with CSS, real kerning, ligatures and shaping. These functions only decide which pieces of the raster are visible at a moment and where they go.

## Strokes (construction order)

`letterStrokes(plate, plate.chars.word)` takes each letter of a word apart into the strokes it would be drafted from, and `drawStroke(ctx, piece, dx, dy, p, dir)` wipes one in along its direction. THE NAME OF THE THING drafts its word this way: construction lines first, then every stem drops in left to right, then the bars, then the curves and diagonals.

It replaced the slab fragments below, which Berker found too random: the cuts ignored the letters and the order was a shuffle, so there was no rule to read. Construction order has one at every step.

Nothing knows a glyph. `htmlPlate` measures each letter's box (`data-chars`), and `classifyStrokes` sorts the raster's ink:

- **Stem:** a run of columns inked for at least 90% of the letter's ink height, 2 px or wider.
- **Bar:** an unbroken horizontal run through a stem (both sides, so a T's crossbar counts) reaching at least 70% of the letter's width. The rows of one bar are trimmed to the shortest of them, so a bar is a clean rectangle and where it bends into a bowl (B) goes to the curve. At 55% the junction of K's legs counted as a bar and showed as a stray stub.
- **Curve:** everything else. O and S are all curve, so they arrive whole in the last stage.

Structure is decided on alpha ≥ 128; the antialiased fringe goes with the stroke it borders (one column either side of a stem, one pixel past each bar end, one row above and below). Every inked pixel gets exactly one kind, so all the pieces together are the intact word, which the browser test checks to the pixel. Small leftovers still happen where a curve meets a stem (a nub on the K's stem at its junction); they arrive with the stem.

The guides come with it: `guides.cap` and `guides.baseline` (the stems' common top and bottom, so round overshoot doesn't move them) and `guides.stems` (each stem's centre).

## Fragments

`fragmentGrid(box, {cols, rows, seed, jitter, spread})` cuts a word's box into vertical slabs with a cut or two across each, edges on whole plate pixels, and gives each slab an appearance time. The order is a seeded shuffle spread evenly through `spread`, so the pace is steady; the first slab lands one step in, so progress 0 shows nothing. `inkedFragments(plate, frags)` drops slabs with no ink and respaces the rest, so the time is all spent on letterforms. `drawFragments(ctx, plate, box, frags, dx, dy, p)` draws the slabs visible at `p`.

This is the Alien titles' pacing, not their glyphs. The brief warned off per-glyph geometry (kerning, ligatures, grapheme clusters) and it was right: cutting the correctly shaped word raster into slabs gets the effect with none of that.

Drawn at scale 1 and whole-pixel offsets, the full set is pixel-identical to the intact word (a browser test checks this). Drawn scaled or at a fractional offset, neighbouring slabs antialias against each other and hairline seams appear: the test measures them at 255/255 at a (+0.5, +0.37) px offset. So draw slabs into their own layer at scale 1 and move the layer. THE NAME OF THE THING does that for its slow push.

## Line rise

`lineRise(ctx, plate, lines, dx, dy, p, {stagger, depth, ease})` brings lines up from below behind their own boxes, top line first. The boxes come from `htmlPlate`'s `data-lines`, which measures where the browser actually broke the lines. Each line's crop runs to the middle of the gap to its neighbours: the first version padded every box by 6 px, the crops overlapped, and antialiased pixels in the overlap were drawn twice and came out darker than the plate. The test caught it.

It's a crop, never a fade, which matches the earlier verdict that whole lines wiping in read well and fades and per-letter relays don't.

## Tests

`tests/languages.test.ts` (grid tiling, determinism, timing) and `tests/browser/type-reveal.html`: measured lines, fragments at 0, 0.5 and 1, the seam measurement, line rise landing exactly on the plate, out-of-order draws.

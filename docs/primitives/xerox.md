# copyGenerations

`copyGenerations(sourceCanvas, {generations, seed, ...})` returns the original and each copy of the copy after it, as canvases the source's size. `copyStep(density, w, h, generation, options)` is one copy on a `Float32Array` of ink density, pure, so the trajectory is unit-tested in node.

It's a precompute, not a pass. A photocopier's damage is fixed to the sheet: the same speck is in the same place when you move the paper. So THE TESTAMENT makes all eight copies once at load (about 17 s for a 2400×3394 page in headless Chrome) and then moves the copies as plates. Doing this per frame on the GPU would mean either new dirt every frame or reading the frame back to the CPU, and a static page gains nothing from either.

## One copy

On ink density (0 paper, 1 full toner):

1. **Optics.** A gaussian spread (`spread`, 1.15 px). Thin lines and small counters lose density first.
2. **Transfer.** A steep sigmoid (`contrast` 8) around `threshold` (0.37), with the threshold jittered by fine and coarse value noise (`ragged`). Greys go to toner or paper. Edges that straddle the threshold shred. The curve is normalised per pixel, so paper stays exactly paper (an early version let the jitter tint the whole sheet grey, which the margin test caught).
3. **Solid fill.** Xerography develops edges harder than the middle of big dark areas, so pixels deep inside a solid (14 px box mean above 0.8) lose up to `solidLoss` of their density in a blotchy pattern. The dark photo and the reversed-out box go dirty in the middle.
4. **Toner.** Specks land in the paper near printed edges, weighted by an edge measure, and dropouts appear in the ink. Never in an empty margin.
5. **Scan.** A few dirty columns on the glass (faint broken lines along the scan direction) and a slow column-wise density variation. These are seeded without the generation, so they're the machine's and recur at the same columns every copy.

Everything random is a hash of (pixel, seed, generation).

## Why the defaults

The first threshold (0.44) made fine print drop out into rows of dots by copy 6: a light copy. At 0.37 ink spreads a little each pass, so the fine print fattens, counters close and the labels in the diagram fill in, while the title (330 px Anton) stays readable at copy 8. That's the trajectory the brief asked for, and it's what most real generation loss looks like. The first `solidLoss` (0.35 from a 9 px measure) turned the title itself mottled grey at copy 1; it now only bites inside genuinely large solids. The first streak density drew two dozen full-height grey lines from copy 1, which read as ornament; it's now a few faint broken ones.

## Cost

All of it is at load: about 17 s for eight copies of a 2400×3394 page. After that THE TESTAMENT is plates and a camera: it rendered in 49 s, and the file is 19 MB because nothing changes frame to frame except the camera and the arriving copy. (The first render had a glowing copier light bar riding the edge; Berker hated it and it's gone.)

## Tests

Unit: same seed same copy, different seed different copy; output stays in 0-1 for extreme settings; after 6 copies hairline contrast falls below 60% of the original while a 10 px bar keeps more than 75% density and a solid's interior is dirty but not gone; greys collapse out of the mid band within 3 copies; no visible speck (≥ 1/255) 20 px from any ink with streaks off; cost (about 0.35-0.45 s for a 1200×1700 sheet in node).

What isn't tested automatically: that it looks like a photocopy. The A/B compares it against `ditherPass` and `risoPass` on the same photograph; the difference is visible, not measured.

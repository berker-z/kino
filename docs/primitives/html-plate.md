# htmlPlate

`htmlPlate({html, css, width, height})` lays a page out in HTML and CSS, snapshots it once, and returns `{canvas, parts}`. `drawPart(ctx, plate, name, x, y)` draws one measured piece of it. Sources then treat the page like any plate, so it can go through `screenPass`, `risoPass` or a dither.

We already paint type with `wipeText` and `caption`, which is fine for a title. It isn't for a page. CSS does columns, wrapping, tables, grids, `text-wrap: balance` and `pretty`, letter-spacing and real kerning, and we'd be rebuilding all of that badly in `fillText`.

## How it works

The markup goes into an SVG `<foreignObject>`, the SVG is loaded as an image, and the image is drawn into a canvas. That's the trick the `ordered-dither-pass` and `ascii-render-pass` components in the HyperFrames registry use. Two things are ours:

- **Fonts are inlined.** An SVG image can't fetch anything, so a page that uses `"Inter Tight"` would quietly fall back to a system font. `htmlPlate` finds each `@font-face` in the document whose family the page mentions, fetches the file, and puts it in the SVG as a data URL. The registry's version doesn't do this.
- **Parts are measured.** Before the snapshot, the page is laid out for real offscreen and every `data-part="name"` element's box is read. So the layout lives in CSS and the motion lives in canvas: wipe the headline in on a beat, slide a column up, move the table on its own.

## Rules

- The plate is static. It's taken once at load, inside the `.then()` after `whenReady`. Anything that changes over time happens when you draw it. Re-snapshotting per frame would be async and slow.
- `::first-line` doesn't survive the snapshot: lines styled with it vanish. Style a `<span>` instead. Assume other pseudo-element tricks are suspect until checked.
- Paint ink in white on black (or transparent). The passes read luminance; colour in the HTML is ignored.
- Through `screenPass`, small body type near the left and right edges goes soft. That's the lens blur doing its job. Keep body text at 32px or more, or near the middle.
- No images in the markup. They'd need inlining like the fonts, and a plate already does images better.

## Labs

- `compositions/html-lab`: an editorial page (masthead, balanced headline, three columns, a table) through the cyanotype screen.
- `compositions/riso-lab`: a page printed in pink over `paint.flowField` in blue.

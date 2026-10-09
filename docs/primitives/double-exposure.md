# doubleExposure

`doubleExposure({width, height, foreground, interior, mask, maskMode, blend, mix})` returns a painter `(ctx, t)` that exposes one scene inside another's shape. A figure is painted first, then a second scene is let in through a mask, so it occupies the figure's silhouette. It lives in `arrange/` because it's compositing: it doesn't grain, tone or bloom anything, and its output goes into any pass or none. `xp-darkroom/ab` shows the same frames raw, dithered and on the cyanotype screen.

## The buffer contract

Three conventions meet here, so each is fixed:

- `foreground` and `interior` paint RGB over black, like any pass source.
- `mask` paints onto a **transparent** canvas. In `"alpha"` mode coverage is its alpha and its colour is ignored, so a cut-out PNG works as it is. In `"luma"` mode coverage is the Rec. 709 luma of what it paints over black, so white covers, black and transparent don't.
- The result is opaque RGB in the destination canvas, which should be the stated size and already filled. Passes fill with black before they call `paint`, so inside a pass this is automatic.

A white-on-black image is only a mask in luma mode. In alpha mode the black is opaque too, so it covers the whole frame. There's a browser test for exactly that, because it's the mistake you'd make.

Holes in the mask (zero coverage inside the outline) show the foreground. Outside the mask is the foreground as well; leave `foreground` out for black.

## Two blends

`"screen"` adds light, as on film exposed twice: `screen(fg, m·c·B)`. Where the figure is bright the interior washes out, so it wants a darkish figure, or a figure on white (the Photoshop double-exposure recipe).

`"replace"` lets the interior take over: `fg·(1 − m·c) + m·c·B`. THE SILENT CITY uses this at `mix` 0.86, so 14% of the marble's carving survives over the refinery. That small remainder is what stops it reading as a cut-out.

`mix` is a number or a function of `t`.

## How

Three scratch canvases and 2D compositing, no readbacks. The mask becomes opaque gray coverage (alpha mode: `source-in` white, then black behind; luma mode: `grayscale(1)`, which is the same Rec. 709 matrix the passes use). The interior is multiplied by coverage. Screen is then one `screen` draw at `globalAlpha = mix`, since `(1 − m)·fg + m·screen(fg, B·c) = screen(fg, m·B·c)`. Replace multiplies the foreground by `1 − m·c` (white differenced with coverage at alpha `m`) and adds `m·c·B` with `lighter`.

At 2560×1440 the scratch canvases are about 44 MB. Nothing depends on the previous frame.

## Tests

`tests/browser/double-exposure.html`: alpha vs luma, colour ignored in alpha mode, holes, 50% gray as half coverage, the white-on-black trap, mix 0 and 1 exactly, the screen formula, repeat seeks.

## Self-mattes

`plateKeys(plate)` (`arrange/self-matte.ts`) cuts mattes out of a plate's own picture, for exposing a second image through its sky or its shadows instead of through a cut-out shape. It returns two plate-sized canvases, drawn at the plate's position so they move with it:

- `sky`: an alpha mask of the pixels past a luma threshold (dark or light sky, auto-detected from the top row) that are connected to the top edge, so a black window in a facade isn't sky.
- `darkness`: inverted luma with the sky removed, as a luma mask. Draw it with `ctx.filter = thresholdWindow(lo, width)` and the shadows open by a rule as `lo` falls: the darkest areas admit light first.

Both are read at quarter size and scaled back up blurred (3 px and 7 px). The blur is the point for the darkness map: unblurred, concrete texture passed as shadow and the second image came through in blotches.

`xp-darkroom-elevations` uses both: fog through the tower's black sky, a spiral stair through its shadows. Its first take used rectangular mattes side by side and read as a layout; mattes cut from the picture itself read as one photograph.

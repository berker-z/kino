# screenPass and the cyanotype kit

`screenPass` is a WebGL post pass. A composition paints a grayscale picture into a canvas every frame (white = light) and the pass turns it into a finished look: a color ramp, a screen texture, a lens. The `cyanotype` aesthetic carries the settings that reproduce the NousCon teaser (`research/nouscon/`), and it sits next to a few canvas pieces that came out of the same work: plates, sun-prints, torn wipes, the lens pass, wiped-in type, the print strip and the network tree.

`compositions/screen-test` uses all of it and is the reference for how they fit together.

## Usage

```js
const A = Kino.cyanotype;
await Kino.whenReady(A);
const plate = Kino.preparePlate(img, {width: W, height: H});

Kino.screenPass(stage, tl, {
  width: W, height: H, duration, fps,
  paint: (ctx, t) => { ctx.drawImage(plate, 0, 0); Kino.wipeText(ctx, "SPEECH", {x: 150, y: 1300, size: 190, progress}); },
  tune: (t) => ({}),           // per-frame overrides: lens, A/B tries
  ...A.texture.screen,         // ramp + grille + lens settings
});
```

Headless Chrome needs WebGL for this. Under Wayland it doesn't get it unless `WAYLAND_DISPLAY` is unset for Chrome; the dotfiles hyperframes package does that, or prefix commands with `env -u WAYLAND_DISPLAY`. A black render plus `Cannot read properties of null (reading 'createProgram')` means WebGL is missing.

## What the pass does, in order

It mimics a camera filming a screen. The picture is graded, the screen has a grille, the camera bends, blurs and misconverges what it sees.

- **Ramp.** Luminance goes through a gradient map. `prussianRamp` is 16 steps measured from the reference: every frame of their film sits on one curve from `#060D18` to `#F0F4F4`, with almost no scatter around it.
- **Grille.** Vertical stripes about 11.5 px apart at 4K (scaled with width), as narrow dark gaps between wide bright stripes, with staggered beads in the bright part. It is a mean-preserving ripple on luminance before the ramp: a grille that only darkens dims the picture by a fifth, and because the ramp is flat at both ends the stripes fade out in deep blacks and white type, which is what the reference measures. The stripes are the same in R, G and B. That's how we know their film is synthetic, not filmed off a CRT.
- **Lens.** A small blur everywhere (`softness`) and more toward the left and right edges only (`edgeBlur`, `edgeFalloff`). Every blur tap reads the gridded screen, so the grille itself goes soft at the sides.
- **Fringe.** Green is read from a picture shifted right of red and blue, so white type gets a magenta left edge and a green right edge. Only the picture shifts, never the grille: shifting the whole screen sample by half a stripe turned the grille green and magenta.
- **Bloom and grain**, both small.
- **Lens distortion** (`lensX/Y/R/K` via `tune`) bends the picture inside a circle and lights its rim. Like the fringe, it bends the picture and not the grille. There is also a ripple distortion (`rippleX/Y/Age/Amp`). It's off by default, and Berker didn't like the water-drop transition it was used for, so leave it out unless asked.

The numbers in `cyanotype.texture.screen` are absolute px for a 2560×1440 render. They came out of six lab rounds against their 4K master (`compositions/cyanotype-lab`), with try B of round 6 scaled down.

## Other uses

The same pass covers more than cyanotype:

- **Print, not screen:** `pitch: 0, fringe: 0, curve: 0`, keeping just the ramp, a little softness for ink bleed, and grain. `compositions/blueprint` does this with a blueprint ramp.
- **Phosphor tube:** `pitch: 0`, `curveY` for a bulge in both axes, heavy `bloom`, an amber ramp, and the picture painted with additive light. `compositions/oscilloscope`.
- **Colour TV:** `colorMode: true` keeps the source colours instead of mapping to a ramp, so colour artwork (teletext) goes through the grille, curvature and fringe untouched. `compositions/teletext`.

With `curveY` the picture bends off the glass at the edges, and anything outside goes black. That's the tube's edge, so leave room for it.

## The canvas pieces

**`preparePlate(img, {width, height})`** turns a photo into a plate: grayscale, cover-fit, stretched from the 2nd to the 98th percentile, then blended 60% toward an S-curve. Print looks want plates that are mostly near-black and near-paper, and daylight photos are the opposite. It also returns `meanIn(w, h, y)` for choosing ink.

**`sunprint(source, w, h, seed)`** puts the picture inside a ragged, brushed emulsion edge with bristle streaks, transparent outside. It's seeded and drawn once, so the edge never moves. A boiling edge reads as jitter.

**`tornWipe(ctx, from, to, t, p, opts)`** shows the next scene through a ragged tear crossing the frame, with a strip of white paper fibre. **`lensPass` + `lensPassFx`** open the next scene inside a growing glass circle. The canvas clips and the shader refracts the rim, so call both on the same progress. Open the lens on something lit; on empty ground it reads as a black disc.

**`wipeText(ctx, text, opts)`** reveals a line of type behind a hard edge moving at constant speed. Whole lines wiping in on a beat work. A letter per beat (the NousCon "letter relay") was hard to follow and Berker found it ugly. **`caption`** is the small tracked mono voice. **`haloInk`** picks black or white for the plate under the type and puts a soft opposite-tone halo behind it.

**`printStrip(opts)`** is a row of prints sliding at a whole number of px per frame, with numbered captions. **`networkTree(opts).paint(ctx, generations)`** grows a seeded branching graph with dotted links and glowing nodes. One generation per beat reads well. One per eighth was too fast, and a large bloom turned the tree into a white blob.

## Known limits

- Rendering is slow: the pass runs in SwiftShader inside headless Chrome. 20 s took 6 minutes for plates and hard cuts, 25 s took 20 minutes with the strip, the tree and the transitions.
- `hyperframes check` on screen-test crashed its browser partway through the sweep ("Target closed"). Snapshots and renders are fine. Not investigated yet.
- The fine woven speckle in the reference's close-ups is not reproduced; the softness blurs our beads away. It probably wants a texture applied after the blur.

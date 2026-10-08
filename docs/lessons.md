# Lessons

Things we learned the hard way building the first scenes. Read this before writing a new primitive or composition. Primitive-specific notes live next to the primitive in `docs/primitives/`.

## Rendering and HyperFrames

**HyperFrames suppresses GSAP callbacks while it seeks.** The renderer drives timelines with `totalTime(t, true)`, so `onUpdate` and friends never fire during a render. Anything painted from time (canvases, HUD text, counters) has to go through `timeDriver`, which tweens a function property on a proxy object. GSAP still applies property values when callbacks are suppressed, so the setter runs on every seek. It also quantizes time to whole frames.

**Exit tweens need `immediateRender: false`.** A `fromTo` that animates an element out writes its starting values the moment it's created, which overwrites the entrance's starting state at frame 0. The primitives in `src/motion/` set `immediateRender` only for direction `"in"`.

**Compositions are offline.** Headless Chrome inside the agent sandbox can't reach CDNs, and a render shouldn't depend on what a CDN serves that day anyway. GSAP, the library bundle and fonts are copied into each composition's `vendor/` by `npm run build`. Audio, analysis data and anything else the composition reads go in its `assets/`.

**Fonts are local and loaded before measuring.** `whenReady(aesthetic)` loads every weight of the aesthetic's families from `src/tokens/fonts.json` before the timeline is built, so text is measured with the real font. In inline CSS, reference fonts through the `--k-font-*` variables; a literal family name trips HyperFrames' static font check because it can't see `vendor/fonts.css`.

**`hyperframes check` refuses frozen frames.** If a 3 s+ composition shows no change across its samples it fails with `sweep_static`. A reveal that finishes early and then holds counts as frozen. Keep something moving.

**`hyperframes snapshot` segfaults on exit.** It writes the PNGs first, so the crash is harmless. Don't trust the exit code; check the files.

**Spectrum frames are at the spectrum's frame rate, not the video's.** `scripts/spectrum.py` writes rows at `spectrum.fps` (30 by default). Converting a time to a spectrum row with the composition's fps (60) reads audio from twice the actual time. This happened, and the result still looked fine, which is why it's written down.

**WebGL needs Chrome to not see Wayland.** Under a Wayland session headless Chrome asks SwiftShader for a Wayland Vulkan surface, fails, and WebGL comes up null: the canvas renders black. The dotfiles hyperframes wrapper unsets `WAYLAND_DISPLAY` for Chrome; until it's switched in, run `env -u WAYLAND_DISPLAY hyperframes ...`.

**Don't pipe a render through `tail`.** It hides the progress bar until the end and then nobody knows how far along it is.

**There is no "previous frame".** HyperFrames seeks frames in any order, so effects that accumulate (phosphor persistence, trails) must be recomputed from time: redraw the last few windows at decaying intensity instead of fading the canvas.

**Real audio needs auto gain.** A scale that fits the chorus leaves the intro as a flat line. Gain from RMS over about half a second, stepped every quarter second so the picture doesn't pump.

**Draw backgrounds before foregrounds** when anything spans cells or rows (teletext double height). Row by row, the next row's background paints over the spill.

## Borrowing from the HyperFrames registry

`hyperframes catalog` lists about 390 blocks and components (Apache 2.0). Most are ads and UI mockups, but a few overlap with kino and their comments are worth reading: they cite measurements and hit the same seek problems we did. Read the source, take the idea, write our own version, and credit the item in the file header. So far: the beam velocity law (`oscilloscope-trace`), the foreignObject snapshot (`ordered-dither-pass`), the banded field (`halftone-field`).

`hyperframes add` can't download inside the sandbox (Node ignores the proxy). To read an item, fetch it from `raw.githubusercontent.com/heygen-com/hyperframes/main/registry/{blocks,components}/<name>/<name>.html`.

Skipped on purpose: `hw-boil` and the other hand-drawn jitter. Re-posing every few frames is exactly the jitter Berker rejected in the risograph.

## Thin lines and pixels

Moving fine line art is where most of the time went. The short version:

- Antialiased lines at fractional pixel positions look brighter or dimmer depending on where they land. Moving them makes that crawl.
- 1-bit rendering (threshold or dither) makes it worse: thickness snaps between whole pixel counts.
- Any rescale after the render re-introduces fractional positions, even a "fullscreen" upscale.

So for line art: draw antialiased (`ditherCanvas` `mode: "smooth"`), keep spacing and per-frame motion in whole pixels and round offsets, render at the exact size it will be shown, and prefer 60 fps when the motion is slow and continuous. `docs/primitives/spectrum-feed.md` has the full story and numbers.

## Taste (Berker's verdicts so far)

- No full-frame flashes or strobing inversions. Hits should move the picture, not blink it.
- "Move the picture" means a smooth motion, never an instant jump. A per-beat position kick that decays (even 9 px) reads as jerky left-right jitter.
- Don't dither text. The world can be dithered; type stays crisp on top.
- No stock retro tropes: no sliced sunset sun, no hexagon tunnel, no hacker HUD for its own sake.
- Don't default to acid lime. Pick palettes per piece. `iceOnNavy` (`#BFD4FF` on `#0A1022`) is the favorite so far.
- No random static or speckle in empty space.
- Fewer ideas done properly beat many effects. Every scene should be about something.
- Calm motion reads better than busy motion. When something feels jittery, slow it down and remove detail before adding anything.
- Something has to move in every shot. Hard cuts between still full-bleed images read as "no motion, no effects, no layouts", even with a great treatment. Constant-speed pushes, sliding strips, growing graphs, layouts with more than one thing in them.
- Transitions should feel physical: a sheet sliding in, a torn print, a glass lens. The water-drop ripple was the one he didn't like.
- Whole words and lines, wiped in on beats. Not one letter per beat.
- A sequence of designed pages with a transition between them reads as a slideshow, however good the pages are (the risograph zine). The ones that worked had continuous motion built into the concept: one sheet and a roaming camera, a beam that never stops drawing, a TV that loads pages.
- To prove a look, run it on new material in a short piece with music. Matching the reference's own frames convinces nobody.

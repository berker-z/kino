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

**Canvas work gets tested in a real browser.** `npm run test:browser` runs `tests/browser/*.html` in the same headless Chrome HyperFrames uses, served over HTTP (`file://` can't `fetch()`, which `htmlPlate` needs to inline fonts). Each page also shows the canvases it checked, so it can be opened and looked at.

**Antialiased pixels drawn twice come out darker.** Overlapping crops of the same transparent raster (line boxes with padding) draw their shared edge pixels twice, and source-over accumulates alpha. Make crops meet, don't overlap.

**Clipping changes antialiasing slightly.** A curve drawn inside a clip rasterizes a little differently at the clip edge than the same curve unclipped. Strip-based effects (temporalScan) can't be pixel-exact against the unclipped source on curves; flat fills and pixel-aligned lines are.

**One HTML file with a composition id per project.** `hyperframes check` fails `multiple_root_compositions` if a second root-level HTML file has `data-composition-id`. Variants (the `xp-*/ab/ab.html` A/B pages) go in a subfolder and render with `-c ab/ab.html`.

**A setup that throws inside a promise renders black, silently.** `hyperframes snapshot` and `render` don't report page errors; the frames just come out black. End every composition's setup with `.catch((e) => console.error(...))` and run `hyperframes check` first: its Runtime section prints console errors. (Two compositions in the expansion rendered black for this reason: a missing export, and a stale `vendor/kino.js`.) Debugging with `chrome --dump-dom --virtual-time-budget` is misleading here: image decoding stalls under virtual time.

**A canvas can't paint anything brighter than white.** Summing a light over time (a long exposure, a bright window through glass) needs an explicit gain on that light, applied in linear light before the final clip. Without it a bulb's long-exposure trail is white divided among the samples: a grey smear. `shutterIntegrate`'s `glow` and `transmissionComposite`'s `gain` exist for this.

**Light adds to a surface in proportion to what the surface reflects, not to how lit it already is.** Projecting onto a dimmed photo used the dim photo as albedo and the projection nearly vanished. Keep the daylight plate as the albedo and the dimmed one as the room.

**Per-pixel noise that changes every frame defeats the encoder.** THE STAIRWELL's first render was 234 MB for 12 s with per-pixel luma noise; noise on a 1.4 px lattice reads the same at 1440p. Grain-like texture is the most expensive thing in a delivery file, so give it a size.

**`pkill` from inside the sandbox doesn't reach processes started in another command.** A queue "stopped" that way kept rendering for 40 minutes. Don't queue heavy renders ahead of approval; there's then nothing to stop.

**Stateless temporal effects cost one paint per sample.** A 64-sample shutter over a photographic scene took 32 minutes for 12 s on SwiftShader. Budget samples against the source's paint cost, and let the shutter close (one paint) when the piece doesn't need it.

## Borrowing from the HyperFrames registry

`hyperframes catalog` lists about 390 blocks and components (Apache 2.0). Most are ads and UI mockups, but a few overlap with kino and their comments are worth reading: they cite measurements and hit the same seek problems we did. Read the source, take the idea, write our own version, and credit the item in the file header. So far: the beam velocity law (`oscilloscope-trace`), the foreignObject snapshot (`ordered-dither-pass`), the banded field (`halftone-field`).

`hyperframes add` can't download inside the sandbox (Node ignores the proxy). To read an item, fetch it from `raw.githubusercontent.com/heygen-com/hyperframes/main/registry/{blocks,components}/<name>/<name>.html`.

Skipped on purpose: `hw-boil` and the other hand-drawn jitter. Re-posing every few frames is exactly the jitter Berker rejected in the risograph.

## Dithering photos and footage

- Prep decides whether a photo reads, more than the algorithm does. Levels, local contrast, an S-curve and a little sharpening, measured once per shot, never per frame.
- Two dark colours close together dither into mud. Add a third, light tone.
- Error diffusion boils in motion (13 to 22% of pixels flip with nothing changing). Fixed threshold maps don't (under 1%). Hysteresis rescues Floyd-Steinberg for footage, offline only.
- The famous ImageMagick engraving recipe is a threshold, not a dither: IM7's `-monochrome` ignores `-dither`. Its texture is the engraving's own lines.
- Berker's pick: Bayer 8 first, blue noise second. The fake line engraving was a dead end.

## Thin lines and pixels

Moving fine line art is where most of the time went. The short version:

- Antialiased lines at fractional pixel positions look brighter or dimmer depending on where they land. Moving them makes that crawl.
- 1-bit rendering (threshold or dither) makes it worse: thickness snaps between whole pixel counts.
- Any rescale after the render re-introduces fractional positions, even a "fullscreen" upscale.

So for line art: draw antialiased (`ditherCanvas` `mode: "smooth"`), keep spacing and per-frame motion in whole pixels and round offsets, render at the exact size it will be shown, and prefer 60 fps when the motion is slow and continuous. `docs/primitives/spectrum-feed.md` has the full story and numbers.

## Product films (CURRENT, the Copland launch, 2026-10-10)

- **The storyboard is the film.** Shots as pure functions of time, played live with the music in `tools/storyboard/`; notes and changes in minutes, the render last. See `docs/storyboard.md`. The 45 s film rendered at 1080p in 20 s; the review loop is what took time, and it should.
- **Use the product's own code.** Copland's /wired scene, bundled untouched and made seek-safe with `replay`, beat any screen recording: crisp at any scale, the real thing, and the beads move on the film's cues.
- **Capture the UI from a copy with made-up data.** Copy the repo to a scratch dir with its own `node_modules` (a symlinked one gets written to), give it its own `.dev.vars`, seed through the API. Nothing private on screen, nothing written to the real repo. The sandbox gives each shell command its own network, so the dev server and whatever talks to it run in one command (`works/copland-launch/capture/run.sh`).
- **Check copy against the product's docs** before it goes on screen: runtimes, leads, claims, worktrees, gates all came from Copland's daemon README and GitHub doc.
- **Ask where it's going before rendering.** Size (Twitter and GitHub want 1080p; 2560×1440 is Berker's screen) and music (a commercial track is fine privately, not on a public post).
- **Pixel canvases drawn into a shot should be transparent.** An opaque sub-canvas shows as a box while its shot dissolves in: the alpha is applied twice to its background.
- **Check the render too.** Pull frames at the transitions from the MP4 (ffmpeg `-ss`); the box above showed up there first.

## Taste (Berker's verdicts so far)

Split in two on purpose. The global rules have held across every look so far. The per-look notes are what worked for one material and its pace; a deliberately harsh or frantic new look shouldn't inherit them by accident.

### Global

- No full-frame flashes or strobing inversions. Hits should move the picture, not blink it.
- "Move the picture" means a smooth motion, never an instant jump. A per-beat position kick that decays (even 9 px) reads as jerky left-right jitter.
- No random static or speckle in empty space. (This is also why error-diffusion dither is stills-only: it boils.)
- Text stays readable. The world can be dithered, printed or damaged; type sits crisp on top.
- No stock retro tropes: no sliced sunset sun, no hexagon tunnel, no hacker HUD for its own sake.
- Pick palettes per piece; don't default to acid lime.
- Fewer ideas done properly beat many effects. Every scene should be about something.
- Something has to move in every shot. Hard cuts between still full-bleed images read as "no motion, no effects, no layouts", even with a great treatment.
- A sequence of designed pages with a transition between them reads as a slideshow, however good the pages are. The pieces that worked had continuous motion built into the concept.
- Transitions need an intelligible mechanism: a sheet sliding in, a torn print, a glass lens. The water-drop ripple was the one he didn't like.
- A material has to be obvious in an A/B at thumbnail size. Digicam's first defaults and filmPass's defaults both read as "the same" as raw next to each other; digicam got fried, and A/Bs now show filmPass with a real piece's settings.
- No glowing light bars riding a wipe: the photocopier's scan lamp sweeping each new copy in (THE TESTAMENT) was hated. A plain edge carries the same mechanism.
- Whole words and lines, wiped in on beats. Not one letter per beat.
- Reveals need a rule you can read. Shuffled slabs assembling a word were "too random"; the same word drafted in construction order (guides, stems, bars, curves) was loved. Derive the order from the thing's own structure.
- To prove a look, run it on new material in a short piece with music. Matching the reference's own frames convinces nobody.
- Every shot change comes out of motion: a push carried into the next shot, a dissolve while both move, or a match on a shape. A hard cut into the lockup was "too fast and too fucking abrupt... we can't have slideshow" (CURRENT).
- A diagram follows one rule you can say out loud. A pole with a wire of beads, git branches and little gates in one picture "has no coherence"; the same content as "left to right is time, a row is a task, the bottom line is main" read at once.
- The logo is the exact SVG, never redrawn. Current on a vector mark is soft light in the mark's own colour; a hard yellow dash looked "very ugly and unprofessional".
- Empty time at the end of a piece is a place to explain something, not to recut earlier shots.

### Per look

- **Cyanotype:** calm pushes, constant-speed strips, physical transitions. `iceOnNavy` (`#BFD4FF` on `#0A1022`) is the favourite palette so far (from the waves piece).
- **Blueprint:** one sheet and a roaming camera, no cuts; everything drawn in drafting order.
- **Phosphor:** the picture is the signal; modes squash to a line and reopen.
- **Teletext:** a one-off joke, not a visual language. Keep it light; don't build on it.
- **Riso:** one print run; inks drift off register across a bar and land on the downbeat. Smooth drift only.
- **Dither:** Bayer 8 first, blue noise second; three tones beat two; the fake line engraving was a dead end.
- **Signal dither (the first waves video):** calm beats busy; when it felt jittery, slowing down and removing detail fixed it.

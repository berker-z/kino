# How kino is built

kino is a pipeline. Every frame, a composition reads the song, paints a picture, arranges it in time, and hands it to a pass that turns it into a medium. The folders in `src/` are the stages of that pipeline.

```
 time ──► signals ──► sources ──► arrange ──► pass ──► frame
          the song    what you    how it      what it's
                      see         moves       made of
```

One rule makes the parts interchangeable: **sources paint grayscale** (white = light, or white = ink), and **the pass decides what that becomes**. So any source can go through any pass, and a look is just a pass setting plus a palette and some motion rules.

Everything is a pure function of time. HyperFrames seeks frames in any order, so nothing may depend on the previous frame. `runtime/timeDriver` calls your painter for each frame it's asked for.

## The layers

### `runtime/`: the engine
`timeDriver` (a per-frame callback that survives HyperFrames' seeking), `whenReady` (CSS and fonts loaded before anything measures text), `getGsap`.

### `signals/`: reading the song
| piece | what it gives you |
|---|---|
| `beatMap` | beats, bars, hits by drum, energy phases, phrases |
| `beatTicks`, `tickAt` | the beat grid subdivided, following tempo drift |
| `bandEnergy` | mean energy of some spectrum bands at t |
| `bassFollower` | smoothed, normalised bass for driving physical parts |
| `decodeSamples` | raw waveform samples (from `scripts/samples.py`) |
| `autoGain` | a scope's auto-set: quiet passages still fill the frame |

Data comes from `analyze-beatgrid.py` (audiomap), `scripts/spectrum.py` (spectrum) and `scripts/samples.py` (raw samples).

Footage is dithered offline by `scripts/dither.py` (same settings as `ditherPass`, plus Floyd-Steinberg with hysteresis) and used as an ordinary `<video>`.

### `sources/`: things that draw
| piece | draws |
|---|---|
| `preparePlate` | a photo as print-ready grayscale (levels + S-curve) |
| `sunprint` | a plate inside a brushed cyanotype edge |
| `paint.*` | painters: ridgelines, terrain, starfield, sphere, `flowField` (banded noise for halftoning)… |
| `spectrumFeed` | the song's spectrum as a ridgeline column fed on the beat |
| `networkTree` | a seeded branching graph that grows by generation |
| `pen` | shapes that draw themselves: lines, arcs, hatching, dimensions, callouts |
| `beam`, `beamText` | an electron beam on phosphor, additive; `{velocity: true}` dims fast swings like a real scope |
| `teletext`, `sixels`, `sixelText` | teletext pages: cells, glyphs, block mosaics |
| `wipeText`, `caption`, `haloInk` | type painted into the picture |
| `htmlPlate`, `drawPart` | a page set in HTML and CSS, snapshotted once, drawn in measured parts |

### `arrange/`: how it moves in time
| piece | does |
|---|---|
| `sheetCamera` | a camera over one big canvas: glides, drifts, no cuts |
| `printRun` | a sheet scrolling at whole pixels per frame, eased stop |
| `registerDrift` | an offset that swings across each bar and lands on the downbeat |
| `printStrip` | a row of prints sliding at constant speed |
| `tornWipe` | the next scene through a torn print |
| `lensPass` + `lensPassFx` | the next scene opening inside a glass circle |
| `doubleExposure` | one scene exposed inside another's silhouette, through an alpha or luma mask |
| `plateKeys`, `thresholdWindow` | self-mattes: a plate's own sky and shadows as mattes, shadows opening darkest first |
| `letterStrokes`, `drawStroke` | a set word taken apart into stems, bars and curves, drafted in that order |
| `fragmentGrid`, `drawFragments` | a set word assembling from slabs of its own letterforms (superseded by strokes in the typesetting piece) |
| `lineRise` | measured lines rising into place behind their own boxes |
| `temporalScan` | a frame built from strips of a source, each at a different source time |

Some arrangements are still inside their compositions because they belong to one style: the scope's mode squash and power-off, teletext's page search. Promote them when a second piece needs them.

### `passes/`: what it's made of
| pass | input | becomes |
|---|---|---|
| `screenPass` | one grayscale (or colour) canvas | cyanotype on a Trinitron, blueprint print, phosphor tube, colour TV |
| `risoPass` | two separations, one per ink | a two-colour riso print |
| `ditherPass` | one grayscale canvas (photos, camera moves) | 2-4 tone ordered dither: Bayer 8, blue noise, halftone; prep that makes photos read |
| `ditherCanvas` | one grayscale canvas | 1-bit or smooth two-colour (the first waves video; prefer `ditherPass`) |
| `filmPass` | one RGB canvas | black-and-white film, printed: halation, toe and S-curve, grain, weave, optional split tone |

### `looks/`: bundles
A look is a curated combination of three things that are independent underneath:

| | owns | where it lives |
|---|---|---|
| **Material** | what the picture is made of: ink, phosphor, cyanotype, dither | a pass and its settings, `look.texture.screen` / `texture.riso` |
| **Motion grammar** | timing, cuts, drifts, reveals, camera behaviour | arrangement primitives (`sheetCamera`, `printRun`, `printStrip`, `tornWipe`...) chosen by the composition |
| **Composition** | content, spatial structure, sequencing | the composition's own code |

Only the material is carried by the look object today. For the DOM hero scenes the `MotionAesthetic` type also drives entrances and layout (`motion`, `layout`, `spacing`), but no canvas piece reads those fields: canvas looks get their grammar from the arrangements the composition picks. That's deliberate for now (see `ARCHITECTURE_AUDIT.md`, finding 7). A typed motion grammar gets added when code first needs to read one from a look.

The three are swappable. The `compositions/xp-*` experiments mix them across looks with no library changes: blueprint's pen drawings under the cyanotype material, once with blueprint's sheet camera and once with cyanotype's own grammar (a contact strip, a torn print, a slow push); and teletext pages under blueprint's sheet camera.

Spread a look's material into its pass:

```js
Kino.screenPass(stage, tl, {width, height, duration, fps, paint, ...Kino.blueprint.texture.screen});
```

| look | pass | motion grammar |
|---|---|---|
| `cyanotype` | screenPass, Prussian ramp, grille | calm pushes, sliding strips, torn and lens transitions |
| `blueprint` | screenPass as print, no grille | one sheet, camera glides, everything drawn by the pen |
| `phosphor` | screenPass, amber ramp, bulged tube | the picture is the signal; modes squash and reopen |
| `riso` | risoPass, pink + blue | one print run; inks drift and land on the downbeat |
| `signalDither` | ditherCanvas | the first waves video |
| `brutalistEditorial`, `nordTerminal` | DOM | the first milestone's hero scenes |

`teletextTV` also exists, but it's a joke: one quick funny piece, not one of kino's visual languages. Don't build on it, recommend it, or treat it as a reference look. The teletext source is there for that piece and for experiments.

### `dom/`: the first era
GSAP motion on HTML elements: `fade`, `slide`, `stagger`, `maskReveal`, `typewriter`, `animatedText`, `heroTitle`, `heroReveal`, and CSS effects (`grain`, `grid`, `vignette`, `crt`). They work and the hero compositions use them, but nothing since the waves has. New work happens in canvas.

### `compositions/`: pieces
A composition picks a look, sources, an arrangement and a song. The reference pieces: `waves-test` (spectrumFeed), `screen-test` (cyanotype), `blueprint`, `oscilloscope`, `risograph`, `teletext`. Labs (`cyanotype-lab`) are for tuning a pass against a reference.

## Mixing

Because sources paint grayscale and passes decide the medium, most combinations need no new code. Some worth trying:

- **The pen kit under cyanotype.** A self-drawing technical drawing filmed off a Trinitron: `pen` + `sheetCamera` into `screenPass` with `...Kino.cyanotype.texture.screen`.
- **The beam in riso.** Draw `beam` into the pink separation over a halftone graticule in blue. The scope, printed.
- **The print run, cyanotype.** `printRun` scrolling `sunprint`s through the Trinitron instead of halftone separations.
- **The sheet camera over a teletext wall.** Many teletext pages laid out on one canvas, the camera gliding between them.

### What each pass reads

"Sources paint grayscale" holds for most pieces, with three exceptions worth knowing: `screenPass` has a colour mode, `risoPass` takes two pictures, and riso's white means ink rather than light.

| pass | input | reads | white means | a colour source |
|---|---|---|---|---|
| `screenPass` (ramp) | one canvas | Rec. 709 luma | light | reduced to luma |
| `screenPass` (`colorMode: true`) | one canvas | RGB | light | kept (teletext needs this) |
| `risoPass` | **two** canvases, one per drum | luma of each | full ink | reduced to luma |
| `ditherPass` | one canvas | Rec. 709 luma | light | reduced to luma |
| `ditherCanvas` | one canvas | luma | the `ink` colour | reduced to luma |
| `filmPass` | one canvas | RGB | light | kept (or split-toned from luma) |

- Every pass fills its source with black before calling `paint`, so transparent areas read as black. `htmlPlate` is transparent by default; give it a `background` if the page should be paper.
- With `risoPass`, a source chooses its drum: paint it into one separation, or into both for a near-black overprint.
- Alpha stops before the pass. Masks carry alpha (`doubleExposure` reads a mask's alpha or its luma, said explicitly with `maskMode`), and the composite they produce is opaque RGB, which is what every pass expects. No pass reads alpha.
- Nothing converts between these silently any more: until 2026-10-09 `risoPass` and `ditherCanvas` read only the red channel, so a blue-heavy colour source went dark.

## Where to read next

- `docs/arsenal.md`: every technique as a move, with how it feels and what pairs with it. Read it before proposing a piece (the `direct` skill).
- `docs/lessons.md`: what we learned the hard way, including Berker's taste verdicts.
- `docs/primitives/`: one page per primitive with the reasons behind its defaults (`spectrum-feed`, `screen-pass`, `riso-pass`, `double-exposure`, `film-pass`, `type-reveal`, `temporal-scan`, ...).
- `.claude/skills/teardown/`: how to learn a look from someone else's video.

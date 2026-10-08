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

Some arrangements are still inside their compositions because they belong to one style: the scope's mode squash and power-off, teletext's page search. Promote them when a second piece needs them.

### `passes/`: what it's made of
| pass | input | becomes |
|---|---|---|
| `screenPass` | one grayscale (or colour) canvas | cyanotype on a Trinitron, blueprint print, phosphor tube, colour TV |
| `risoPass` | two separations, one per ink | a two-colour riso print |
| `ditherCanvas` | one grayscale canvas | 1-bit or smooth two-colour |

### `looks/`: bundles
A look (`MotionAesthetic`) carries a palette, fonts, motion grammar, and the settings for its pass in `texture.screen` or `texture.riso`. Spread those into the pass:

```js
Kino.screenPass(stage, tl, {width, height, duration, fps, paint, ...Kino.blueprint.texture.screen});
```

| look | pass | motion grammar |
|---|---|---|
| `cyanotype` | screenPass, Prussian ramp, grille | calm pushes, sliding strips, torn and lens transitions |
| `blueprint` | screenPass as print, no grille | one sheet, camera glides, everything drawn by the pen |
| `phosphor` | screenPass, amber ramp, bulged tube | the picture is the signal; modes squash and reopen |
| `teletextTV` | screenPass in colour mode | pages that search and paint row by row; steps, not scrolls |
| `riso` | risoPass, pink + blue | one print run; inks drift and land on the downbeat |
| `signalDither` | ditherCanvas | the first waves video |
| `brutalistEditorial`, `nordTerminal` | DOM | the first milestone's hero scenes |

### `dom/`: the first era
GSAP motion on HTML elements: `fade`, `slide`, `stagger`, `maskReveal`, `typewriter`, `animatedText`, `heroTitle`, `heroReveal`, and CSS effects (`grain`, `grid`, `vignette`, `crt`). They work and the hero compositions use them, but nothing since the waves has. New work happens in canvas.

### `compositions/`: pieces
A composition picks a look, sources, an arrangement and a song. The reference pieces: `waves-test` (spectrumFeed), `screen-test` (cyanotype), `blueprint`, `oscilloscope`, `risograph`, `teletext`. Labs (`cyanotype-lab`) are for tuning a pass against a reference.

## Mixing

Because sources paint grayscale and passes decide the medium, most combinations need no new code. Some worth trying:

- **The pen kit under cyanotype.** A self-drawing technical drawing filmed off a Trinitron: `pen` + `sheetCamera` into `screenPass` with `...Kino.cyanotype.texture.screen`.
- **The beam in riso.** Draw `beam` into the pink separation over a halftone graticule in blue. The scope, printed.
- **Ridgelines or the network as teletext.** Paint `spectrumFeed` or `networkTree` into a small canvas and feed it to `sixels`, then `mosaic` it onto a page.
- **The print run, cyanotype.** `printRun` scrolling `sunprint`s through the Trinitron instead of halftone separations.
- **The sheet camera over a teletext wall.** Many teletext pages laid out on one canvas, the camera gliding between them.

Two seams to know:

- `risoPass` takes **two** pictures. A source has to choose its drum: paint it into one separation, or both for black-ish overprint.
- Colour sources (teletext) need `screenPass` with `colorMode: true`. In ramp mode the picture is reduced to luminance first.

## Where to read next

- `docs/lessons.md`: what we learned the hard way, including Berker's taste verdicts.
- `docs/primitives/`: one page per primitive with the reasons behind its defaults (`spectrum-feed`, `screen-pass`, `riso-pass`).
- `.claude/skills/teardown/`: how to learn a look from someone else's video.

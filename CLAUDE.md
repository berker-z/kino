# kino

A motion design library for HyperFrames: aesthetics, motion primitives, effects, painters and scenes that compositions assemble into videos. `docs/briefs/MOTION_SYSTEM_KICKSTART.md` is the original brief. `docs/lessons.md` is what we learned since; read it before writing a primitive or a composition.

## Arsenal (living document)

`docs/arsenal.md` lists every technique as a move: what it does, how it feels, what it needs, what it pairs with, what to avoid, where it's been seen, and Berker's verdicts. It's tiered: **patterns** (the shape of a piece over time: product reveal, feature breakdown, launch crescendo, music piece...), **core** moves (type, camera, sources; use freely), **materials** (usually one per piece), and a **shelf** of narrow effects (one or two per piece, as featured moments). Kino is for launch, product and hype videos as much as music pieces. When Berker brings an idea, use the `direct` skill: read the arsenal, read the idea for vibe, and propose two or three combinations, each starting from a pattern, before building anything.

Don't add effects on spec. Before building anything new, answer "what new kind of video does this let us make?"; the arsenal's Gaps section lists what real product pieces will probably need.

## Storyboard first

A film is written as shots, each a pure function of time (`paint(ctx, t)`), in a file the storyboard and the composition share. `tools/storyboard/` plays it live at preview size with the music, a scrubber and a card per shot, so Berker reviews the actual film, gives notes, and sees changes on reload in seconds. The render is the last step, run once he says go, never the review step. Before showing a storyboard, check it yourself: `node scripts/capture.mjs` with `?t=` frames, and contact sheets across every transition. `docs/storyboard.md` has the contract and the loop.

**Ask the render size before every render.** It's a question about where the video goes (Twitter and GitHub: 1920×1080; Berker's screen: 2560×1440), not a default. Also ask about the music if it isn't cleared for where it's going.

## Works

`works/` (gitignored) holds real productions: a launch film, a client piece. Their copy, product captures and music are theirs, not the library's. What a work invents that's reusable goes back into kino (a primitive, a tool, an arsenal entry, a lesson) in the same session; the work itself stays out of git. CURRENT, the Copland launch film, is `works/copland-launch/`.

Keep it true. In the same change that adds or changes a primitive, proves a new combination in a composition, or records a verdict from Berker, update the matching arsenal entry (add one if it's new, mark rejected things as rejected). `examples/arsenal/index.html` renders straight from the markdown, so there's nothing else to sync.

## Layout

`docs/architecture.md` explains the pipeline and how to mix pieces. In short: signals read the song, sources paint grayscale, arrange moves things in time, a pass turns the picture into a medium, a look bundles pass settings with palette and motion rules.

```
src/                 TypeScript library, bundled to window.Kino
  runtime/           timeDriver (seek-safe per-frame callback), whenReady (CSS + fonts), getGsap
  signals/           beatMap, beatTicks, tickAt, bandEnergy, bassFollower, decodeSamples, autoGain
  sources/           preparePlate, sunprint, htmlPlate, painters, spectrumFeed, networkTree, pen, beam, teletext, canvas type, copyGenerations
  arrange/           sheetCamera, printRun, registerDrift, printStrip, tornWipe, lensPass, doubleExposure, temporalScan, shutterIntegrate, surfaceProject, transmissionComposite, replay (a stepped scene made seek-safe), overlap (shot changes without cuts)
  passes/            screenPass (ramp / grille / lens / colour mode), risoPass (two-ink print), ditherPass (2-4 tone ordered dither), ditherCanvas, filmPass, digicamPass, infraredPass
  looks/             MotionAesthetic bundles: cyanotype, blueprint, phosphor, riso, signalDither, ... (teletextTV is a one-off joke, not a core look)
  dom/               first-era GSAP + CSS pieces (motion, heroTitle, heroReveal, grain, crt...)
scripts/build.mjs    bundles src/ and copies kino.js, gsap, fonts into every {compositions,lab,attic,works}/*/vendor/
scripts/capture.mjs  exact-size screenshots of a running page over DevTools: product UI plates, storyboard frames (?t=)
scripts/spectrum.py  per-frame spectrum of an audio file -> JSON or window.<NAME> JS
scripts/samples.py   raw waveform samples (int8, base64) -> window.<NAME> JS
scripts/dither.py    dither a photo or footage file (same settings as ditherPass, plus FS with hysteresis)
scripts/commons.py   fetch a composition's Commons plates (its plates.txt) and write assets/CREDITS.txt
scripts/stills.sh    pull exact frames from a render as JPEG stills
compositions/        pieces and xp-* experiments; each is a standalone HyperFrames project (index.html + assets/)
lab/                 rigs for tuning a pass, and smoke (the synthetic end-to-end composition)
attic/               retired first-era compositions (hero-*, future-of-speech, playground); reference only
works/               real productions, gitignored (see Works)
research/            teardowns, experiments and audit reports (media/ is gitignored)
tools/storyboard/    the storyboard: `npm run storyboard`, then /tools/storyboard/?work=/works/<name>/
tools/dither/        the dither playground: `npm run playground`, then http://127.0.0.1:8077/tools/dither/
docs/                architecture.md, lessons.md, arsenal.md, storyboard.md, handoff.md, primitives/*.md, briefs/ (the specs past rounds were built from)
examples/            rendered outputs (videos gitignored); examples/styles/index.html is the four-styles showcase
```

## Working loop

```
npm test                      # unit tests: clock, signals, arrangements (node, no browser)
scripts/smoke.sh              # end to end on a synthetic composition: tests, build, check, snapshot, grille check
npm run build                 # after any src/ change; compositions only see vendor/
npm run storyboard            # review a film live: /tools/storyboard/?work=/works/<name>/
cd compositions/<name>        # or works/<name>
hyperframes check             # lint + runtime + layout + contrast; fix everything
hyperframes snapshot --at 1,5,9 --output /tmp/...   # segfaults on exit after writing; harmless
hyperframes render --quality delivery --output ../../examples/<name>/<file>.mp4
```

Compositions using screenPass need WebGL: run `env -u WAYLAND_DISPLAY hyperframes ...` until the dotfiles wrapper that unsets it is switched in. To learn a look from someone else's video, use the `teardown` skill. Before changing a pass, snapshot what it renders now (`research/audit/snap.sh <label> <comps>`) and diff after; `scripts/bench-screen-pass.sh` times screenPass.

`hyperframes` is the Nix-packaged CLI (pinned in ~/dotfiles), wired to a local chrome-headless-shell and FFmpeg. Don't use `npx hyperframes`. Python with librosa is on PATH for audio analysis.

## Rules

- Paint anything time-driven through `timeDriver`; GSAP callbacks don't fire during HyperFrames renders.
- No network at render time. Everything a composition loads is in `vendor/` or `assets/`.
- Music and its analysis stay out of git (`audio/`, `*/*/assets/` under compositions, lab and attic; all of `works/`).
- Render at the destination's exact pixel size, and ask which destination first. Fine line art rendered small and upscaled flickers, so never render small to scale up.
- No hard cuts between shots: every change comes out of motion (a push carried over, a dissolve while both move, a match on a shape). See `docs/primitives/overlap.md`.
- Copy about a product is checked against the product's own docs before it goes on screen.
- New primitives get a doc in `docs/primitives/` explaining why the defaults are what they are.
- Don't `rm` during a session. Add paths to `cleanup.txt`; there is one cleanup pass at the end.

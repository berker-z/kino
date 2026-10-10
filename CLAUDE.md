# kino

A motion design library for HyperFrames: aesthetics, motion primitives, effects, painters and scenes that compositions assemble into videos. `docs/briefs/MOTION_SYSTEM_KICKSTART.md` is the original brief. `docs/lessons.md` is what we learned since; read it before writing a primitive or a composition.

## Arsenal (living document)

`docs/arsenal.md` lists every technique as a move: what it does, how it feels, what it needs, what it pairs with, what to avoid, where it's been seen, and Berker's verdicts. When Berker brings an idea, use the `direct` skill: read the arsenal, read the idea for vibe, and propose two or three combinations before building anything.

Keep it true. In the same change that adds or changes a primitive, proves a new combination in a composition, or records a verdict from Berker, update the matching arsenal entry (add one if it's new, mark rejected things as rejected). `examples/arsenal/index.html` renders straight from the markdown, so there's nothing else to sync.

## Layout

`docs/architecture.md` explains the pipeline and how to mix pieces. In short: signals read the song, sources paint grayscale, arrange moves things in time, a pass turns the picture into a medium, a look bundles pass settings with palette and motion rules.

```
src/                 TypeScript library, bundled to window.Kino
  runtime/           timeDriver (seek-safe per-frame callback), whenReady (CSS + fonts), getGsap
  signals/           beatMap, beatTicks, tickAt, bandEnergy, bassFollower, decodeSamples, autoGain
  sources/           preparePlate, sunprint, htmlPlate, painters, spectrumFeed, networkTree, pen, beam, teletext, canvas type, copyGenerations
  arrange/           sheetCamera, printRun, registerDrift, printStrip, tornWipe, lensPass, doubleExposure, temporalScan, shutterIntegrate, surfaceProject, transmissionComposite
  passes/            screenPass (ramp / grille / lens / colour mode), risoPass (two-ink print), ditherPass (2-4 tone ordered dither), ditherCanvas, filmPass, digicamPass, infraredPass
  looks/             MotionAesthetic bundles: cyanotype, blueprint, phosphor, riso, signalDither, ... (teletextTV is a one-off joke, not a core look)
  dom/               first-era GSAP + CSS pieces (motion, heroTitle, heroReveal, grain, crt...)
scripts/build.mjs    bundles src/ and copies kino.js, gsap, fonts into every {compositions,lab,attic}/*/vendor/
scripts/spectrum.py  per-frame spectrum of an audio file -> JSON or window.<NAME> JS
scripts/samples.py   raw waveform samples (int8, base64) -> window.<NAME> JS
scripts/dither.py    dither a photo or footage file (same settings as ditherPass, plus FS with hysteresis)
scripts/commons.py   fetch a composition's Commons plates (its plates.txt) and write assets/CREDITS.txt
scripts/stills.sh    pull exact frames from a render as JPEG stills
compositions/        pieces and xp-* experiments; each is a standalone HyperFrames project (index.html + assets/)
lab/                 rigs for tuning a pass, and smoke (the synthetic end-to-end composition)
attic/               retired first-era compositions (hero-*, future-of-speech, playground); reference only
research/            teardowns, experiments and audit reports (media/ is gitignored)
tools/dither/        the dither playground: `npm run playground`, then http://127.0.0.1:8077/tools/dither/
docs/                architecture.md, lessons.md, arsenal.md, handoff.md, primitives/*.md, briefs/ (the specs past rounds were built from)
examples/            rendered outputs (videos gitignored); examples/styles/index.html is the four-styles showcase
```

## Working loop

```
npm test                      # unit tests: clock, signals, arrangements (node, no browser)
scripts/smoke.sh              # end to end on a synthetic composition: tests, build, check, snapshot, grille check
npm run build                 # after any src/ change; compositions only see vendor/
cd compositions/<name>
hyperframes check             # lint + runtime + layout + contrast; fix everything
hyperframes snapshot --at 1,5,9 --output /tmp/...   # segfaults on exit after writing; harmless
hyperframes render --quality delivery --output ../../examples/<name>/<file>.mp4
```

Compositions using screenPass need WebGL: run `env -u WAYLAND_DISPLAY hyperframes ...` until the dotfiles wrapper that unsets it is switched in. To learn a look from someone else's video, use the `teardown` skill. Before changing a pass, snapshot what it renders now (`research/audit/snap.sh <label> <comps>`) and diff after; `scripts/bench-screen-pass.sh` times screenPass.

`hyperframes` is the Nix-packaged CLI (pinned in ~/dotfiles), wired to a local chrome-headless-shell and FFmpeg. Don't use `npx hyperframes`. Python with librosa is on PATH for audio analysis.

## Rules

- Paint anything time-driven through `timeDriver`; GSAP callbacks don't fire during HyperFrames renders.
- No network at render time. Everything a composition loads is in `vendor/` or `assets/`.
- Music and its analysis stay out of git (`audio/`, `*/*/assets/` under compositions, lab and attic).
- Render at the destination's exact pixel size. Berker's screen is 2560×1440; fine line art rendered at 1080p and upscaled flickers.
- New primitives get a doc in `docs/primitives/` explaining why the defaults are what they are.
- Don't `rm` during a session. Add paths to `cleanup.txt`; there is one cleanup pass at the end.

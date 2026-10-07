# kino

A motion design library for HyperFrames: aesthetics, motion primitives, effects, painters and scenes that compositions assemble into videos. `MOTION_SYSTEM_KICKSTART.md` is the original brief. `docs/lessons.md` is what we learned since; read it before writing a primitive or a composition.

## Layout

```
src/                 TypeScript library, bundled to window.Kino
  aesthetics/        MotionAesthetic objects (brutalistEditorial, nordTerminal, signalDither + signalPalettes, cyanotype)
  motion/            fade, slide, stagger, maskReveal, wipe, typewriter, blink
  effects/           grain, grid, vignette, crt, ditherCanvas (1-bit/smooth canvas renderer), screenPass (WebGL ramp/grille/lens pass)
  visuals/           grayscale painters (sphere, starburst, terrain, tunnel, starfield, ridgelines), spectrumFeed, networkTree, printStrip
  plates/            preparePlate (photo -> print-ready grayscale), sunprint (brushed emulsion edge)
  transitions/       tornWipe, lensPass (canvas scenes)
  components/        animatedText, heroTitle, canvas type (wipeText, caption, haloInk)
  scenes/            heroReveal
  audio/             beatMap, beatTicks, tickAt (read side of audiomap.json)
  runtime/           whenReady (CSS + fonts), timeDriver (seek-safe per-frame callback), getGsap
scripts/build.mjs    bundles src/ and copies kino.js, gsap, fonts into every compositions/*/vendor/
scripts/spectrum.py  per-frame spectrum of an audio file -> JSON or window.<NAME> JS
compositions/        each is a standalone HyperFrames project (index.html + assets/)
research/            teardowns of reference videos (index.html report + scripts; media/ is gitignored)
docs/                lessons.md, primitives/*.md
examples/            rendered outputs (gitignored where they contain music)
```

## Working loop

```
npm run build                 # after any src/ change; compositions only see vendor/
cd compositions/<name>
hyperframes check             # lint + runtime + layout + contrast; fix everything
hyperframes snapshot --at 1,5,9 --output /tmp/...   # segfaults on exit after writing; harmless
hyperframes render --quality delivery --output ../../examples/<name>/<file>.mp4
```

Compositions using screenPass need WebGL: run `env -u WAYLAND_DISPLAY hyperframes ...` until the dotfiles wrapper that unsets it is switched in. To learn a look from someone else's video, use the `teardown` skill.

`hyperframes` is the Nix-packaged CLI (pinned in ~/dotfiles), wired to a local chrome-headless-shell and FFmpeg. Don't use `npx hyperframes`. Python with librosa is on PATH for audio analysis.

## Rules

- Paint anything time-driven through `timeDriver`; GSAP callbacks don't fire during HyperFrames renders.
- No network at render time. Everything a composition loads is in `vendor/` or `assets/`.
- Music and its analysis stay out of git (`audio/`, `compositions/*/assets/`).
- Render at the destination's exact pixel size. Berker's screen is 2560×1440; fine line art rendered at 1080p and upscaled flickers.
- New primitives get a doc in `docs/primitives/` explaining why the defaults are what they are.
- Don't `rm` during a session. Add paths to `cleanup.txt`; there is one cleanup pass at the end.

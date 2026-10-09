# Handoff: 2026-10-08

Where kino stands after the session that went from "read the brief" to four finished styles. Read `CLAUDE.md`, `docs/architecture.md` and `docs/lessons.md` first. This file is only what those don't say: the state of things and what's next.

## State

Everything is committed and pushed (`berker-z/kino`, private). Dotfiles are pushed too.

**The library** follows the pipeline: `signals → sources → arrange → passes → looks` (see `docs/architecture.md`). Four canvas looks are ready to use: `cyanotype`, `blueprint`, `phosphor`, `riso`, plus `ditherPass` for photos and footage. (`teletextTV` exists for a one-off joke piece; it isn't a core look.) Older DOM pieces live in `src/dom/`.

**Reference pieces** (all on the same 27 s cut of "The Future of Speech", 3:51–4:43):

| composition | what it is | Berker's verdict |
|---|---|---|
| `waves-test` | the ridgeline spectrum feed, ice on navy | loved; became `spectrumFeed` |
| `screen-test` | cyanotype look on Commons photos, five scenes, physical transitions | "impressed beyond measure" (water drop removed since) |
| `blueprint` | one sheet, camera roaming, everything self-drawing | liked |
| `oscilloscope` | amber tube drawing the real audio in four modes | liked |
| `teletext` | a teletext service for the song | liked |
| `risograph` | one print run, inks drifting in and out of register | take two; take one was "a powerpoint slide"; a per-beat jitter was removed |

The showcase page with all four styles is `examples/styles/index.html` (videos next to it, gitignored).

**Research:** `research/nouscon/` holds the NousCon teaser teardown (report, lab and compare pages). The `teardown` skill (`.claude/skills/teardown/`) is that process written down.

## 2026-10-09: three new languages

Built from `KINO_NEXT_VISUAL_LANGUAGES.md`: `compositions/xp-darkroom` (THE SILENT CITY), `xp-typesetting` (THE NAME OF THE THING), `xp-temporal-scan` (AN OBJECT OUTSIDE TIME), each with an `ab/ab.html` cross-material version. New library pieces: `doubleExposure`, `filmPass`, `temporalScan`, `lineRise`, `fragmentGrid`/`drawFragments`, and `data-lines` in `htmlPlate`. Results, critique and verdict: `examples/languages/index.html`. Canvas code is now tested in a browser: `npm run test:browser`. Waiting on Berker's verdict before any `darkroom` look or more promotion.

Later the same day: the type reveal became construction order (loved), a footage slit-scan demo (`xp-temporal-footage`), and a second darkroom piece without a figure (`xp-darkroom-elevations`, self-mattes; take one with side-by-side panels read as a layout). Then the working method changed: **`docs/arsenal.md` is the living list of moves, and the `direct` skill turns Berker's ideas into combinations from it.** Keep the arsenal updated in the same change as any new primitive, composition or verdict (rule in CLAUDE.md, AGENTS.md links to it).

Photo note: Berker doesn't want the Kutia Kondh portrait (`portrait.jpg` in dither-lab/research) used again.

## Machine notes

- Run HyperFrames as `env -u WAYLAND_DISPLAY hyperframes …` until Home Manager is rebuilt with the dotfiles fix (commit `1e0b24c`, wraps chrome-headless-shell without `WAYLAND_DISPLAY`). Without it, WebGL is null and every pass renders black.
- Renders with `screenPass` are slow in SwiftShader: about 45 min for 27 s at 2560×1440 when three run in parallel. `risoPass` takes about 2 min. Run renders in the background with output to a log file (not piped through `tail`), and check that they're actually progressing.
- The NousCon source video (`cq3Ge2hY3rZTM_OL.mp4`) is in the repo root, gitignored. The song files are in `audio/`, gitignored.
- The sandbox leaves 0-byte placeholder files (`.bashrc`, `.claude/*`, `.mcp.json`) in the repo. They're ignored, but `git status` with the sandbox on can show them; use git unsandboxed.

## Open threads, in rough priority

1. **Done 2026-10-09:** `screenPass` renders the screen once and blurs it, 2.5x faster at 1440p. See `ARCHITECTURE_AUDIT.md` for that day's whole review: the grille bug, the clock and signal fixes, tests, the smoke test, the experiments, and what's still open (teletext grille decision, teardown PROMOTE stage).
2. **The cyanotype fine texture.** The woven speckle in the NousCon close-ups isn't reproduced; the softness blurs our beads away. Probably wants a texture applied after the blur.
3. **Promote style-specific arrangements when reused:** the scope's mode squash and power-off, teletext's page search. Left in their compositions on purpose until a second piece needs them.
4. **Try the mixes** in `docs/architecture.md`. Pen kit under cyanotype and a sheet camera over a teletext wall are done (`compositions/xp-*`); beam in riso and ridgelines as teletext are not.
5. ~~The Future of Speech video~~: not wanted. It was a test track (Berker, 2026-10-08).
6. **More teardowns** whenever Berker has reference videos. Nous Research is the standing inspiration.
7. `hyperframes check` crashed its browser ("Target closed") on screen-test once. It passes on the synthetic `smoke` composition; not reproduced since.
8. A web/share encode: the riso render is 310 MB because a moving halftone defeats compression.

## Working with Berker (also in memory)

- No `rm` during a session: keep `cleanup.txt` and do one pass at the end.
- Render at 2560×1440 (his monitor), and render in batches in the background.
- Show work in the browser (`xdg-open` unsandboxed), not as lab grids to pick from.
- Commits are his own work: no AI attribution, identity `berker-z`.

# Handoff: 2026-10-08

Where kino stands after the session that went from "read the brief" to four finished styles. Read `CLAUDE.md`, `docs/architecture.md` and `docs/lessons.md` first. This file is only what those don't say: the state of things and what's next.

## State

Everything is committed and pushed (`berker-z/kino`, private). Dotfiles are pushed too.

**The library** follows the pipeline: `signals → sources → arrange → passes → looks` (see `docs/architecture.md`). Five canvas looks are ready to use: `cyanotype`, `blueprint`, `phosphor`, `teletextTV`, `riso`. Older DOM pieces live in `src/dom/`.

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

## Machine notes

- Run HyperFrames as `env -u WAYLAND_DISPLAY hyperframes …` until Home Manager is rebuilt with the dotfiles fix (commit `1e0b24c`, wraps chrome-headless-shell without `WAYLAND_DISPLAY`). Without it, WebGL is null and every pass renders black.
- Renders with `screenPass` are slow in SwiftShader: about 45 min for 27 s at 2560×1440 when three run in parallel. `risoPass` takes about 2 min. Run renders in the background with output to a log file (not piped through `tail`), and check that they're actually progressing.
- The NousCon source video (`cq3Ge2hY3rZTM_OL.mp4`) is in the repo root, gitignored. The song files are in `audio/`, gitignored.
- The sandbox leaves 0-byte placeholder files (`.bashrc`, `.claude/*`, `.mcp.json`) in the repo. They're ignored, but `git status` with the sandbox on can show them; use git unsandboxed.

## Open threads, in rough priority

1. **Speed up `screenPass`.** The 24-tap disc blur is almost the whole render cost. Try a separable blur in two passes (render to a framebuffer).
2. **The cyanotype fine texture.** The woven speckle in the NousCon close-ups isn't reproduced; the softness blurs our beads away. Probably wants a texture applied after the blur.
3. **Promote style-specific arrangements when reused:** the scope's mode squash and power-off, teletext's page search. Left in their compositions on purpose until a second piece needs them.
4. **Try the mixes** in `docs/architecture.md` (pen kit under cyanotype, beam in riso, ridgelines as teletext).
5. **The actual Future of Speech video** (52 s) in one of these languages. Ask Berker what the song means to him first: the words and imagery have been placeholders ("SPEECH", "LISTENING", invented zine copy).
6. **More teardowns** whenever Berker has reference videos. Nous Research is the standing inspiration.
7. `hyperframes check` crashed its browser ("Target closed") on screen-test. Snapshots and renders work; not investigated.
8. A web/share encode: the riso render is 310 MB because a moving halftone defeats compression.

## Working with Berker (also in memory)

- No `rm` during a session: keep `cleanup.txt` and do one pass at the end.
- Render at 2560×1440 (his monitor), and render in batches in the background.
- Show work in the browser (`xdg-open` unsandboxed), not as lab grids to pick from.
- Commits are his own work: no AI attribution, identity `berker-z`.

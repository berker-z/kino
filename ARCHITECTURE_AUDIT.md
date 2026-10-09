# Kino architecture audit

**Date:** 2026-10-09 · **Brief:** `KINO_ARCHITECTURE_REVIEW.md` (reviewed `5f8e073`) · **Audited at:** `a320219` (the brief's baseline plus the dither tool) · **Work since:** `3be5f85`..`d22efff`, all local, not pushed.

Every claim in the brief was checked against the code before anything was changed. Each finding below says whether it was **confirmed**, **refuted** or **open**, what the evidence is, and what happened. Phase 0 and Phase 1 of the brief are done; Phase 2 and the Phase 4 optimisation are proposed, not started, except where noted.

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | `screenAt` shadowing made the grille a no-op | P0 | **confirmed, fixed** (`97f1481`) |
| 2 | `timeDriver` paints frame 0 twice at setup | P1 | **confirmed, fixed** (`3be5f85`) |
| 3 | `beatTicks` hangs on repeated beats, garbage on < 2 | P1 | **confirmed (worse than the brief said), fixed** (`5a1e5f8`) |
| 4 | `bassFollower` NaN on a constant spectrum | P1 | **confirmed, fixed**, plus a stack overflow on long songs (`5a1e5f8`) |
| 5 | WebGL setup asserts non-null, errors unnamed | P1 | **confirmed, fixed**: shared `passes/gl.ts` (`f9fa40e`) |
| 6 | Seek determinism of `timeDriver` | P0/P1 | **verified correct** by tests; no change needed beyond #2 |
| 7 | Look / material / motion grammar conflated | P1 design | **confirmed**; decision: document, don't split types yet |
| 8 | Source/pass interchangeability has exceptions | P1 design | **confirmed**; contract table below, docs change proposed |
| 9 | Shared mechanics trapped in compositions | P1 design | **open**: needs the two cross-composition experiments |
| 10 | `screenPass` cost | P2 | **measured**: 98% is the 48 `screenAt` calls per pixel |
| 11 | Toolchain is machine-specific, no smoke path | P2 | **partly fixed**: synthetic `smoke` composition + `scripts/smoke.sh` |
| 12 | Public API broad | P2 | **confirmed, left alone** (no concrete pain) |
| 13 | Teardown measures at a forced 4K | P2 | **confirmed, not fixed**: the skill folder is write-protected in agent sessions |

Tests: `npm test`, 25 tests across the clock, signals and arrangements, all passing. Regression: every composition was snapshotted before any change (`research/audit/media/baseline`, 44 frames); after Phase 1, 9 of 12 are pixel-identical and the other 3 differ only by the grille coming back (finding 1).

## Findings

### 1. The grille was a no-op (P0, fixed)

`src/passes/screen-pass.ts`, `screenAt()`: the colour became `vec3 c` while the grille block declared its own `float c`, so `c *= mask` multiplied the inner scalar and the picture came back untouched.

History matters here. In `5a8f8e4` (the first cyanotype commit) the function worked on `float l` and did `l *= mask`: correct. The bug arrived in `928ac23`, when colour mode turned `l` into `vec3 c`. So the cyanotype render Berker approved (`examples/screen-test/screen-test-02-1440p.mp4`, before the restructure) had a working grille, and every screenPass frame since hasn't.

Evidence (`research/audit/grille.py`: power at the grille frequency over nearby frequencies; ~1 means no grille):

| screen-test frame | approved render | with the bug | fixed |
|---|---|---|---|
| 1.5 s | 16.3 | 0.8 | 16.7 |
| 6 s | 68.8 | 0.9 | 61.9 |
| 12 s | 21.5 | 0.7 | 21.5 |

Crops: `research/audit/media/st-abc.png` (approved / bug / fixed). On the synthetic smoke card: 1.0 with the grille off, 6809 with it on; `scripts/smoke.sh` now fails if that difference ever disappears.

`teletextTV` is the other look with a grille, and the teletext piece was approved while the bug hid it. Fixing the shader would have added a visible shadow-mask slot pattern Berker never saw (`research/audit/media/tt-ab.png`), so its preset grille is now 0 and teletext renders pixel-identical to what was approved. **Decision for Berker:** look at `tt-ab.png` and set it back to 0.45 if the slots are wanted.

### 2. Frame 0 painted twice (P1, fixed)

`timeDriver` registers `fromTo(target, {at: 0}, ...)`. GSAP renders a `fromTo`'s start value immediately, which already calls the setter and paints frame 0; the explicit `render(0, 0)` afterwards painted it again. For `screenPass` that's a whole wasted frame (~1.6 s at 1440p) per render. Fixed by calling `target.at(0)`, which deduplicates. Found by the first clock test.

### 3. `beatTicks` and `tickAt` on broken grids (P1, fixed)

The brief said `beatTicks` "assumes at least two distinct beats". It's worse: with repeated beats the period is 0, and both extension loops (`b > -period`, `grid[last] < until + period`) never end, hanging the render. Fewer than two beats gives NaN ticks. Now: fewer than two beats, or times that don't strictly increase, throw a `RangeError` naming the problem. `tickAt` needs two ticks.

### 4. `bassFollower` (P1, fixed)

A constant or silent spectrum divided by `hi - lo = 0` and returned NaN on every frame. It now reads as 0. Also found: `Math.min(...sm)` spreads every frame as an argument, which overflows the stack on a long song at a high frame rate (300k frames in the test); now a loop. `bandEnergy` with an empty band range divided by zero; now throws.

### 5. WebGL setup (P1, fixed)

Both passes had identical inline setup with `getContext("webgl2")!`. A null context (the known Wayland/SwiftShader failure) surfaced later as a generic null error or a black frame. `src/passes/gl.ts` now holds `webgl2()`, `fullscreenProgram()` and `linearTexture()`; a missing context names the pass and the likely cause, and shader and link errors name the pass and stage. No engine, three functions.

### 6. `timeDriver` determinism (verified)

`tests/time-driver.test.ts` seeks a real paused GSAP timeline with events suppressed, as HyperFrames does: every frame in order at 30 and 60 fps, out of order with repeats, classic float-trap times (0.1×3, 1/3, 0.7, 2.3), nonzero `start`, past the end, and two drivers with different starts and frame rates on one timeline. All exact. Rendering frame N doesn't depend on what was visited before. Multiple canvases on one timeline are safe.

### 7. Look vs material vs motion grammar (design, decision: document)

Evidence from every composition (grep of what each reads from a look): canvas pieces use **only** `texture.screen` or `texture.riso` (spread into a pass), plus the font names through `whenReady(look)`. The `motion`, `layout`, `spacing` and `surfaces` fields that every look must fill are read only by the DOM hero scenes (`src/dom/scenes/hero-reveal.ts`). The motion grammar that gives the canvas looks their identity (one sheet and a roaming camera; a beam that never stops; pages that search and paint) lives in prose in `docs/architecture.md` and in the compositions.

**Decision:** don't split `MotionAesthetic` now. Splitting would mean inventing `MotionGrammar` fields no code reads. Instead:

- Document a look as four parts: palette + typography, a **material** (exactly one of `texture.screen`, `texture.riso`, or a dither setting), and a **motion grammar** (prose plus the arrangement primitives it prefers).
- Revisit when a second composition wants to read a grammar from a look rather than from its author. That's the condition for a typed `MotionGrammar`.
- One concrete wart to fix when it next hurts: `texture.dither` is the DOM-era `{cell, matrix}` for `ditherCanvas`, while `ditherPass` takes a different, richer setting. A look that wants the new dither has nowhere honest to put it. Proposed: `texture.ditherPass?: DitherSettings`, added the first time a look uses it.

### 8. Source / pass contracts (design, table below)

What each pass actually reads, from the code:

| pass | input | reads | white means | colour |
|---|---|---|---|---|
| `screenPass` (ramp mode) | one canvas, RGBA | Rec. 709 luma (`LUMA` in the shader) | light | reduced to luma, silently |
| `screenPass` (`colorMode`) | one canvas, RGBA | RGB | light | kept |
| `risoPass` | **two** canvases | the **red channel** of each | full ink (coverage) | ignored, silently |
| `ditherPass` | one canvas, RGBA | Rec. 709 luma | light | reduced to luma |
| `ditherCanvas` | one canvas | the **red channel** | "ink" colour | ignored, silently |

Alpha: every pass fills its source black before painting, so transparency reads as black (`htmlPlate` defaults to a transparent background, which then reads as black under any pass).

Implicit adaptations worth knowing: a colour source into `risoPass` or `ditherCanvas` keeps only red (a blue-heavy source goes dark); a colour source into ramp-mode `screenPass` is luma'd; the riso contract is coverage, not light. **Proposed (small, Phase 2):** this table into `docs/architecture.md`, and switch `ditherCanvas` and `risoPass` from red to luma so colour sources degrade the same way everywhere. That changes no current output (every current source is grayscale), which a regression run can prove. No `SourceKind` type yet: the table is enough until a mismatch actually bites.

### 9. Mechanics trapped in compositions (open)

Not assessed beyond the brief's list. The honest test is the two cross-composition experiments (pen kit under cyanotype; a sheet camera over a teletext wall), which haven't been run. **Proposed next.** Candidates already known: the scope's mode squash and power-off, teletext's page search. Keep both in place until an experiment needs them.

### 10. screenPass cost (measured)

`scripts/bench-screen-pass.sh`, same headless Chrome as hyperframes (ANGLE on SwiftShader), serial, synthetic card:

| | 1080p | 1440p |
|---|---|---|
| paint (canvas 2D) | 3 ms | 5 ms |
| paint + texture upload | 19 ms | 32 ms |
| screenPass, full cyanotype | 901 ms | 1595 ms |
| grille off | 897 | 1572 |
| blur radius 0 (taps still run) | 890 | 1575 |
| bloom off | 839 | 1487 |
| grain off | 894 | 1581 |

So 98% of a frame is the shader, and inside it the 24 blur taps × 2 `screenAt` calls (fringe) per pixel, each a texture read plus the grille maths. Bloom is ~7%. Upload, grille, grain and the blur *radius* don't matter. A 27 s piece at 1440p is ~22 min of shader time serially.

**Proposed optimisation:** two passes. Pass 1 evaluates the gridded screen once per pixel (both fringe samples) into an intermediate texture; pass 2 does the 24-tap blur and bloom by reading it. That keeps the treatment order the brief asks for (the grille is blurred by the lens), and turns 48 full evaluations per pixel into 2 plus 36 plain texture reads. Expected fidelity cost: taps read the intermediate with bilinear filtering instead of evaluating exactly, and the fringe shift is taken at the tap rather than the output pixel. Both are sub-pixel at the current blur radii. To be accepted only with a pixel-diff against the current output and a look at the cyanotype frames.

### 11. Toolchain and smoke path (partly fixed)

`compositions/smoke` needs no audio, photos or dotfiles: a synthetic card through all three passes. `scripts/smoke.sh` runs typecheck, tests, build, `hyperframes check` (passes), snapshot, and the grille check. It still needs the Nix-packaged hyperframes and a WebGL2-capable headless Chrome, documented in the script header. Tool behaviours kept distinct from composition failures: `hyperframes snapshot` segfaults on exit after writing its frames (judged by files), and `hyperframes check` crashed once on screen-test in an earlier session; it passes on smoke and wasn't reproduced.

### 12. Public API (left alone)

`src/index.ts` exports everything into `window.Kino`. No concrete pain; the build fan-out to 15 compositions takes about a second. Proposed only: mark exports in `docs/architecture.md` as stable or experimental.

### 13. Teardown measurement portability (open, needs Berker)

`.claude/skills/teardown/scripts/measure.py` reads every frame at 3840×2160 and `round.sh` hard-codes 4K crops, so measuring a 1080p reference rescales the very texture pitch being measured. The fix (native-resolution analysis, crops relative to frame size, report original dimensions) and the brief's PROMOTE stage both live in `.claude/skills/`, which is write-protected in agent sessions. **Needs Berker** to allow the edit or make it.

## Answers to the brief's open questions

1. **Split `MotionAesthetic` now?** No. Document material vs grammar; add a typed grammar when code reads one (finding 7).
2. **Source buffer semantics?** The table in finding 8. The implicit adaptations are red-channel reads in riso and ditherCanvas, silent luma reduction in ramp mode, alpha-as-black everywhere.
3. **Is `timeDriver` deterministic, multi-canvas safe?** Yes, tested (finding 6); the only defect was the double first paint (finding 2).
4. **What deserves extraction?** Unknown until the cross-composition experiments run; nothing is extracted on spec.
5. **Where do `htmlPlate` and DOM fit?** `htmlPlate` is a source: a static raster plus measured part boxes, colour, transparent by default. It fits the table as "one canvas, RGBA". Live DOM stays a separate authoring surface, not forced through passes.
6. **screenPass cost centres and fidelity of multi-pass?** Measured (finding 10). Fidelity cost of two passes: bilinear sampling of the intermediate, fringe shift at the tap; to be measured, not assumed.
7. **A catalog without a registry?** Frontmatter in `docs/primitives/*.md` (kind, inputs, status, examples, learned_from), plus the compatibility table. One index file generated from it if it's ever needed.
8. **What runs in CI?** `npm test` and `npm run typecheck` anywhere (pure node, no browser). `scripts/smoke.sh` needs a headless Chrome with WebGL2 (SwiftShader is fine), so a pinned environment.
9. **Minimum setup for a new developer?** node 22+, `npm ci`, the hyperframes CLI and a WebGL2 headless Chrome, python3 with numpy, ImageMagick; then `scripts/smoke.sh`. Private media only for the reference pieces.
10. **Global taste vs look-specific?** `docs/lessons.md` mixes them. Proposed: split its taste section into "global" (no strobes, no instant position kicks, physical transitions, text readable, prove on new material) and "per look" (calm cyanotype pushes, riso's register drift, Bayer 8 for dither).

## Patch series

Done, local commits:

1. `a320219` the dither tool (pre-existing work, committed to separate it from the refactor)
2. `3be5f85` timeDriver single first paint; clock tests; `npm test`
3. `97f1481` screenPass grille fix; teletext preset kept as approved
4. `5a1e5f8` signals: silence, broken grids; signal and arrangement tests
5. `f9fa40e` shared WebGL setup; synthetic smoke composition and script
6. `d22efff` screenPass benchmark

Proposed, in order, each independently verifiable:

7. Contract table in `docs/architecture.md`; `risoPass` and `ditherCanvas` read luma, not red (regression must show 0 changed pixels)
8. Two-pass screenPass (benchmark before/after; pixel diff and visual check on cyanotype frames)
9. Experiment A: pen kit under cyanotype. Experiment B: sheet camera over a teletext wall. Record glue and reuse.
10. Extract only what 9 shows is repeated
11. lessons.md: global vs per-look taste
12. Needs Berker: teardown native-resolution measuring and PROMOTE stage; teletext grille decision; push

## Left alone on purpose

The browser-global bundle and per-composition vendor copies; GSAP and HyperFrames; the composition code of the reference pieces; DOM components; any new look, effect or transition; a scene DSL, registry or type hierarchy.

## Baseline and test plan

- `research/audit/snap.sh <label> [comps]` snapshots compositions at fixed times; `research/audit/media/baseline` is the pre-refactor set (local, gitignored). Diff with `magick compare -metric AE`.
- `npm test`: clock, signals, arrangements. Add pass-parameter tests to the smoke script as passes change (the grille check is the pattern: off vs on, measured).
- `scripts/smoke.sh`: the reproducible end-to-end check.
- `scripts/bench-screen-pass.sh`: serial cost per frame, before and after any shader change.

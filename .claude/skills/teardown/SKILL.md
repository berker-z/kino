---
name: teardown
description: Take a reference video (someone else's motion piece) apart into named pieces, publish an HTML teardown report with clips, measure its look, rebuild that look as a kino primitive, and prove it on new material in a short video. Use when Berker hands over a video and says "deconstruct this", "what is this made of", "can we do this look", or names a studio/brand whose aesthetic they want to learn from.
---

# Teardown to prototype

The loop we used on the NousCon teaser (`research/nouscon/`). It goes from "here's a video I like" to "here's that look running on our own material", with a report in the middle that Berker reads in the browser. Each stage ends with something to look at; Berker judges by eye, numbers only help us get there.

Five stages: **watch, report, measure, lab, prove.** Don't skip to the lab: the report is where we find out which parts are worth building.

## 0. Setup

- The source goes in the repo root or wherever Berker put it. It's gitignored by `*.mp4`. Work in `research/<name>/`; anything derived from their video goes in `research/<name>/media/` (gitignored by `research/*/media/`). Only the HTML pages and scripts get committed.
- Scratch output (contact sheets, raw frames, lab snapshots) goes in the session scratchpad, never the repo.
- **No `rm` during the session.** Log anything to delete in `cleanup.txt` at the repo root; there is one cleanup pass at the end.
- Run HyperFrames with `env -u WAYLAND_DISPLAY hyperframes ...` unless the dotfiles wrapper already strips it (see Gotchas).

## 1. Watch

Get the whole film into view before naming anything.

```bash
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate -of compact SRC.mp4
# cut list: time + score of every sharp change
ffmpeg -i SRC.mp4 -vf "scale=320:-1,select='gt(scene,0.08)',metadata=print:file=-" -an -f null - 2>/dev/null \
  | grep -E 'pts_time|scene_score' | paste - - | sed -E 's/.*pts_time:([0-9.]+).*score=([0-9.]+)/\1 \2/'
# timestamped contact sheets: dense where cuts are fast, sparse elsewhere
FONT=$(fc-match -f '%{file}' monospace)
ffmpeg -ss 0 -t 8 -i SRC.mp4 -vf "fps=6,scale=480:-1,drawtext=fontfile=$FONT:text='%{pts\:hms}':x=6:y=6:fontsize=18:fontcolor=yellow:box=1:boxcolor=black,tile=8x6" -frames:v 1 sheetA.png
```

Then look closely at a few frames at 1:1 (`crop=1280:720:...` on the full-res master) and at 8x (`crop=160:90:...,scale=1280:720:flags=neighbor`). Fine texture (grilles, grain, fringes, focus falloff) only shows up there, and it's usually most of the look.

Note the sheet timestamps restart at 0 when you use `-ss`; add the offset back.

## 2. Report (`research/<name>/index.html`)

Split the film into pieces and name each one with a short, memorable name (e.g. "Letter relay", "Sun-print edge", "Lens pass"). Group them:

1. **Treatment**: what applies to every frame (grade, texture, screen, lens). Usually the most valuable part.
2. **Type**: the type systems and how they behave.
3. **Transitions**: how shots change.
4. **Plates**: the imagery and recurring subjects.
5. **Rhythm**: shot lengths over time, the shape of the edit.
6. **What to take into kino**: a ranked list of primitives to build, best effect for the least work first.

Cut one looping clip per piece with a script like `research/nouscon/cut.sh` (a `clip name start end [crop]` line per piece; it writes an mp4 and a poster jpg into `media/`). The page is a dark, single-file HTML report:

- **Header:** source, a short lede, and the main finding in plain words. For NousCon it was "most of the look isn't in the pictures".
- **Shot map:** a clickable bar across the full duration.
- **Cards:** one per piece, with the clip looping muted and lazy-played via IntersectionObserver. Each card has the name, a code-ish subtitle, a timecode, two or three sentences on what it is, and a **kino** line.
- **The kino line:** say whether the piece is buildable, medium, hard, careful, or plate (= source imagery, not code), and what it would take.

Use the reference's own palette for the page. Follow the writing style skill (no em dashes, plain and specific). Open it with `xdg-open` **outside the sandbox**; inside, the browser silently fails to launch.

## 3. Measure

Before building, work out what the look actually is. Decide whether it's real (filmed, printed) or synthetic, because that changes what to build. Useful measurements (numpy is on PATH via the librosa python; PIL is not, so read frames through ffmpeg rawvideo):

- **Grade:** bin all pixels by luma, take the mean color per bin and its spread. A low spread means a single gradient map, so use those bin means as the ramp. `palettegen` gives a quick swatch set.
- **Texture period:** FFT of a column-averaged (or row-averaged) high-passed region gives the pitch.
- **Per-channel phase:** run the same FFT on R, G and B. If the phases match, the texture is luminance-only, which means synthetic.
- **Strength by region:** take the std of a horizontal high-pass in the center, at the edges, in highlights and in darks. This tells you where the effect is strong, where it fades, and where focus drops.

`scripts/measure.py` (next to this file) has these. Write the conclusions into the report's treatment section.

## 4. Lab

Build the look as a kino primitive (for NousCon: `src/passes/screen-pass.ts`, a WebGL pass) and tune it in a lab composition (`compositions/<name>-lab`).

- **Resolution:** render the lab at the reference's exact resolution, so crops compare 1:1.
- **Like-for-like input:** make clean plates from the reference frames. Blur out its texture along the axis it runs on, then map the grade back to grayscale through the measured ramp. Then the only difference is the treatment.
- **Tries:** run three tries per round (A, B, C) as time segments, switched by a `tune(t)` override.
- **Each round, `scripts/round.sh`:**
  - snapshots every try,
  - builds 2×2 grids (reference top-left, then A, B and C) of the same crops: whole frame, a center close-up, and a 16× zoom,
  - prints the region measurements for the reference and each try.
- **When to stop:** when a try is within about 10% on the numbers and looks right in the zoom. Numbers matching while the zoom looks wrong means the structure is wrong, not the amounts.

Write one line per round: what changed, what was wrong, which try was best. These go on a lab page if one is useful. **But don't ask Berker to pick from lab grids.** Those are for us. If he needs to see the match, give him a single drag-split page (theirs on the left, ours on the right; `research/nouscon/compare.html`).

## 5. Prove it on new material

A treatment that only reproduces the reference's own frames proves nothing. Berker will (rightly) say "it's just the same image". Make a short piece (20 to 25 s) on new material, with music, at his screen size (2560×1440):

- **Images:** free ones from the Wikimedia Commons API (filter by license: public domain, CC0, CC BY). Save them to `compositions/<name>/assets/plates/` with a `CREDITS.txt`. Don't scrape Pinterest.
- **Plate prep:** grayscale, stretched to the 2nd to 98th percentile, then an S-curve. Reference plates tend to be mostly near-black and near-paper.
- **Build a piece, not a slideshow.** Every shot needs something moving at constant speed: a push, a drifting strip, a growing graph, the ridgeline feed. Use layouts: split screens, a strip of prints, side panels, captions. Use the reference's transitions, built as kino pieces.
- **Rhythm:** cut on the beat grid (`Kino.beatMap`, bars from `beats[2 + 4n]` or wherever the downbeat phase says).
- **Type:** whole words and lines wiped in at constant speed. **No one-letter-per-beat relays**; Berker found that hard to follow and ugly. Type goes under the treatment if the reference does that, with ink picked from the plate under it and a soft halo for legibility.

Render with `--quality delivery` in the background (a WebGL pass in SwiftShader takes about 6 to 7 minutes for 20 s), then open the mp4 for him.

## Gotchas we hit

- **WebGL in headless Chrome:** under Wayland, Chrome hands SwiftShader a Wayland Vulkan surface and WebGL comes up null, so the canvas renders black and `check` reports `Cannot read properties of null`. Fix: run Chrome without `WAYLAND_DISPLAY`. The dotfiles hyperframes package wraps chrome-headless-shell to unset it; until that's switched in, prefix commands with `env -u WAYLAND_DISPLAY`.
- **Snapshot crashes:** `hyperframes snapshot` segfaults on exit after writing. Check the files, not the exit code.
- **Texture uploads:** canvas → `texImage2D` is not flipped, so sample with `px / res` directly. The first NousCon round was upside down.
- **Channel shifts:** if a texture (grille) is in phase across channels, shift only the picture for chromatic fringing. Shifting the whole screen sample by half a stripe turned the grille green and magenta.
- **Comparison grids:** `hstack` needs identical heights. Scale every crop to a fixed `960:540`, not `960:-2`.
- **Mean-preserving textures:** a grille that only darkens dims the whole picture about 20%. Ripple around 1 instead.

## Files from the NousCon run

- `research/nouscon/index.html`, `cut.sh`: the report and the clip script.
- `research/nouscon/compare.html`: the drag-split page.
- `src/passes/screen-pass.ts`: the look, with ripple and lens distortions driven by `tune(t)`.
- `compositions/cyanotype-lab`: the lab.
- `compositions/screen-test`: the proof piece.
- `scripts/measure.py`, `scripts/round.sh` (in this skill folder): the measurement and lab-round helpers.

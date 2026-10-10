# Storyboard first

How a film gets made now. Worked out on CURRENT, the Copland launch film (2026-10-10), where it replaced "snapshot some stills, render, wait, look".

## The idea

A kino film is code: every frame is a pure function of time. So the storyboard doesn't need to be a sketch of the film. It can be the film, drawn live at preview size, playing with its music. Berker watches it, says what's wrong ("the transition at 40 is too abrupt", "this diagram has no coherence", "the logo isn't the same svg"), the shots change, he reloads. A round trip is minutes. The render only turns the approved film into a file at the size its destination needs (and frame-exact timing, and muxed audio). It's the last step, not the review step.

## The contract

A work (in `works/<name>/`, or a composition) provides:

- **scripts** that set `window.FILM = {W, H, DURATION, SHOTS, film}`:
  - `W, H`: the space shots draw in (CURRENT draws in 2560 × 1440 and is scaled to whatever is rendered).
  - `SHOTS`: `[{id, from, to, title, what}]`, the shot list. `what` is the card's description.
  - `film(inputs)` returns `{paint(ctx, t)}`. `inputs` holds the images named in `storyboard.json` and `song`, the analysis global.
- **`storyboard.json`**: `title`, `subtitle`, `intro` (paragraphs), `facts` (`[label, value]`), `fonts` (CSS to load) and `fontFaces` (to wait for), `scripts` (in load order, relative to the work), `audio`, `analysis` (the global the analysis script sets, e.g. `SONG`, with `rms`, `fps`, `sections`), `images` (`{name: path}`), `poster` (the time shown on open), `notes` (`{shotId: {camera, sync, why}}`) and `open` (questions to settle before rendering).

The composition's `index.html` loads the same scripts and calls `film(...).paint(g, t)` from `Kino.timeDriver`, scaled to its own size. There is one film, drawn two ways.

## The loop

1. **Propose** with the `direct` skill: a pattern, the moves, a rough shot list.
2. **Write the shots** (`shots.js` or similar), each pure in `t`, paintable a little past its own range so transitions can overlap (`Kino.overlap`).
3. **Check it yourself before Berker sees it.** `node scripts/capture.mjs <server> <out> name=/tools/storyboard/?work=...&t=12.5@1400x1100*1+4000 ...` gives exact frames; crop the player and make contact sheets across every transition and every dense moment. This caught stray pixels, labels sitting on wires, dead space at the edge of a pan, and a camera that missed its handoff.
4. **Open it for Berker** (`npm run storyboard`, `xdg-open` unsandboxed) and list what's open.
5. **Iterate** on his notes. Turn each note into a rule if it's general (no hard cuts; a diagram needs one readable rule; logos are the exact SVG) and write the rule down (`docs/lessons.md`, the arsenal).
6. **Ask the render size and the music question**, then render once, in the background, with a log.

## Gotchas

- Python's `http.server` doesn't answer range requests, and Chrome can't seek an `<audio>` without them, so the scrubber looked broken. The storyboard loads the track as a blob.
- `?t=` opens the storyboard at a time; with a tall enough window the strip is clickable from DevTools for testing.
- Fonts come from `node_modules/@fontsource/*` in the storyboard and from `vendor/fonts.css` in the composition; the film names the family, so both resolve to the same files.

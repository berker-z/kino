# replay

`replay({create, story, rate, dt})` makes a scene that only knows how to move forward seek-safe. `create()` returns something with `step(dt)`, `apply(data)` and `draw()`; `replay(...).at(t)` returns it in its state at `t`, drawn.

It exists for one reason: the best picture of a product is often the product's own animation code. Copland's /wired pane (poles, wires, beads travelling between them) is a class with `step(dt)` and `draw()` driven by `requestAnimationFrame`, and its beads' positions depend on every step that came before. HyperFrames asks for frames in any order, so a live loop can't be filmed directly, and a screen recording would be soft, fixed in size and full of whatever data was on screen.

## The rule

For time `t`, run the scene from a fresh `create()` in steps of `dt`, telling it each `story` entry when the clock passes its time, then draw. A later `t` continues from where the last call stopped; an earlier one rebuilds. Steps land on multiples of `dt`, so the state at `t` is identical however it was reached, which is what the unit tests check (`tests/product.test.ts`): asking 7.3, 1.1, 4.0, 0, 6.25 in that order gives the same states as asking each fresh.

`rate(t)` runs the scene's own clock faster or slower than the film's without touching its tuning: sway, current, travel and blinking all quicken together. That's how a crescendo can speed up a product's own motion honestly.

## Why the defaults

- **`dt` 1/60.** The product runs at display rate (Copland's scene caps itself at 15 fps for the browser's sake, but its motion is continuous). 60 steps a second matched a live run by eye, and the scene is tiny, so a full 45 s rebuild is 2700 steps and costs nothing next to drawing a frame.
- **Rebuild on a backward seek, not a cache of states.** Renders go forward; the storyboard scrubs. A rebuild is cheap for a small scene, and keeping snapshots would mean knowing how to copy the product's private state.

## Using a product's code

Bundle the product's module untouched (esbuild, `format: "iife"`, a `globalName`) into the work, so the film draws exactly what the product draws, and write a small adapter: construct it without its own loop (Copland's scene is built with motion off, then told it has motion but isn't visible, which is what `step` and `draw` read), feed it scripted data, and scale its canvas up with smoothing off. The Copland adapter is `works/copland-launch/copland/wired-replay.js` (gitignored with the work; the pattern is the point).

Seen: the Copland launch film (CURRENT), where /wired is the hero from the first frame to the logo.

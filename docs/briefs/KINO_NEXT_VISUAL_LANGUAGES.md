# Kino: Three New Visual Languages

**Status:** Implementation brief and PoC commission  
**For:** Coding agent working in `berker-z/kino`  
**Basis:** Repo architecture reviewed on 2026-10-09, latest observed `main` commit `5a48ebd`  
**Scope:** Darkroom, Kinetic Typesetting, Temporal Slit-Scan  
**Instruction:** Read the current code before implementing. The names and interfaces below are proposals, not a mandate to introduce abstractions that don't earn their keep.

## 0. The point

Kino is a **programmable motion-design toolkit**, not a music-video creator, an animation-preset collection, or a generic video editor. Its strength is learning distinct visual languages, extracting their mechanics, then combining those mechanics with new imagery and motion.

We have already built a vocabulary of screen, cyanotype, blueprint, phosphor, risograph, and dither materials, plus sources such as the pen, beam, HTML plate, and spectrum. The next expansion should introduce genuinely *new operations*, not three more color presets:

1. **Darkroom:** photographic layering, masking, exposure, and the physical feel of light on film.
2. **Typesetting:** browser-quality typography treated as a spatial and temporal object.
3. **Temporal Slit-Scan:** different regions of one output frame sampling a source at *different times*.

The thesis for all three: a new visual language is valuable when at least one primitive can escape the look it came from and be recombined with existing Kino pieces.

### Desired feeling

Cinematic, tactile, patient, ominous when appropriate. Precision rather than effect density. Think restrained analog title design, quietly damaged film, oppressive geometric typography, strange temporality. Avoid generic glitch packs, incessant movement, strobing, random scratches everywhere, and showreel excess. A striking image held for three seconds often beats twelve transitions.

These are aesthetic hypotheses to prove by rendering, not universal restrictions on future looks.

## 1. Read this repo first

Start with the **current versions**, in this order:

- `CLAUDE.md`, `docs/architecture.md`, `docs/lessons.md`
- `ARCHITECTURE_AUDIT.md` and `KINO_ARCHITECTURE_REVIEW.md` for the recent refactor rationale
- `src/runtime/time-driver.ts`, `src/runtime/setup.ts`, `src/index.ts`
- `src/sources/html-plate.ts`, `src/arrange/torn-wipe.ts`, `src/arrange/lens-pass.ts`, `src/arrange/sheet-camera.ts`
- `src/passes/screen-pass.ts`, `src/passes/riso-pass.ts`, `src/passes/dither-pass.ts`, `src/passes/gl.ts`
- Existing `compositions/xp-*` experiments and `compositions/smoke/`
- `.claude/skills/teardown/SKILL.md` if working from external reference footage

**Do not blindly trust this brief if the code has moved.** Record the starting commit and recheck existing functionality before designing APIs.

### Existing architecture to preserve

```text
signals / timeline time
        |
        v
sources (paint or provide image/type/geometry)
        |
        v
arrange / composite (transform, clip, layer, reveal, place in time)
        |
        v
passes (rendered material treatment)
        |
        v
HyperFrames frame / video
```

This diagram **clarifies** that compositing is one of the things an arrangement can do. It does **not** authorize a new mandatory pipeline stage, general node graph, scene DSL, editor, ECS, renderer, or top-level framework.

Keep the existing distinctions:

- `src/sources/`: content providers or painters.
- `src/arrange/`: temporal/spatial composition and transitions, including new operations involving two sources.
- `src/passes/`: physical/optical treatment of the composed picture.
- `src/looks/`: curated material settings, typography, and authoring guidance. Today's `MotionAesthetic` contains legacy DOM fields that canvas looks don't use. Do not grow or split that type speculatively.
- `src/dom/`: existing HTML/GSAP components. The `htmlPlate` bridge is a source, and can be used in canvas work.
- `compositions/`: authored films, not reusable library implementations.

### Invariants, not suggestions

1. **Arbitrary-time determinism.** Given `t`, seed, settings, and loaded assets, output must not depend on which frames were rendered before it or their order. HyperFrames suppresses GSAP callbacks while seeking. Route animated canvas work through `timeDriver` or functions of `t` called from it.
2. **Offline render.** Everything required at runtime is bundled in `vendor/` or local `assets/`. No remote fonts, CDN, runtime media fetching, or browser video seeking as an implicit source of truth.
3. **Explicit buffer contracts.** Today most passes take black-filled RGBA canvases and interpret luma as brightness; `risoPass` takes two separations and interprets white as ink. Compositing needs **alpha** as well. Do not accidentally flatten a silhouette mask to opaque black. Name each operation's RGB/alpha assumptions.
4. **Fonts are settled before measuring.** Use `whenReady`, local fonts, `htmlPlate`, and existing browser layout rather than homegrown typesetting.
5. **Stable timing and texture.** Deterministic noise should be seeded and evaluated from coordinates/time; don't use `Math.random()` in a paint callback. Grain may change by frame, but source-independent scratch artifacts should not teletransport for no reason.
6. **Lean additions.** Implement the smallest thing that makes the PoC convincing. A source or technique should stay private to its experiment until another composition benefits from it.
7. **Visual regression matters.** Snapshot baseline/variants and compare. Do not sacrifice an established look for a new experiment.

### Technical compatibility reminders

Kino bundles `src/index.ts` into `window.Kino` with esbuild, then `scripts/build.mjs` copies the bundle, GSAP, and fonts into each independent HyperFrames composition. `npm run build` must follow library changes. Use existing `passes/gl.ts` if adding a WebGL2 pass, and handle missing WebGL explicitly. Under NixOS/Wayland, use the repo's established `env -u WAYLAND_DISPLAY hyperframes ...` workaround when necessary. `scripts/smoke.sh` is the synthetic end-to-end check; `npm test` and `npm run typecheck` are the cheap gates.

## 2. Visual language A: DARKROOM

### Creative target

A photographic figure, a distant industrial landscape, and light interacting in one composed frame. A statue or silhouette contains a different place. The image feels *exposed* rather than digitally overlaid. Introduce one delicate flare or burning edge, then let the work breathe.

Reference language, **not a request to duplicate any shot**:

- [True Detective S1, title sequence and breakdown](https://www.artofthetitle.com/title/true-detective/): silhouette, landscape, negative space, double exposure.
- [Se7en, opening titles](https://www.artofthetitle.com/2008/03/26/se7en/): physical imperfection, distressed photochemical/editorial feel.

### Decompose it correctly

| Candidate | Role in Kino | What it actually does | PoC? |
|---|---|---|---|
| `doubleExposure` | `arrange/` compositing helper | Paint A, B and mask together with explicit alpha/luma handling; optionally control how strongly B inhabits A | **Yes** |
| `filmPass` | `passes/` material | Exposure curve, fine grain, restrained halation, vignette, stable gate shift/scratch model | **Yes, minimal** |
| `opticalDissolve` | `arrange/` transition | Two independently evaluated frames cross through photographic exposure, not just simple `globalAlpha` | **One use, keep local initially** |
| `lightBurn` | `arrange/` transition/overlay | Local moving exposure front plus irregular edge that reveals/replaces imagery | **Optional**, only if remaining scope permits |
| `darkroom` preset | `looks/` | A curated configuration, not an engine | **Only if the treatment works** |

**Important:** `doubleExposure()` should work regardless of `filmPass()`. A blueprint drawing under a photographic silhouette, or a dithered double exposure, should be possible without the darkroom look. Masking is composition, film is treatment.

### Proposed contract, adjust to actual code

Use the same `CanvasRenderingContext2D` painter conventions as existing arrangements. One possible public shape after experimentation:

```ts
// Illustrative, NOT an API that must be copied literally.
type Scene = (ctx: CanvasRenderingContext2D, t: number) => void;

type DoubleExposureOptions = {
  width: number;
  height: number;
  foreground: Scene;
  interior: Scene;
  mask: Scene;             // explicit alpha or luma mode
  maskMode?: "alpha" | "luma";
  mix?: number;            // 0..1, independent of material pass
};

// doubleExposure(ctx, t, opts): void
// filmPass(stage, timeline, { width, height, duration, fps, paint, ...settings })
```

If a mask is transparent PNG/canvas, honor its alpha. If it's grayscale, honor luminance. A white-on-opaque-black image is *not* automatically an alpha mask. Be deliberate about which channel defines coverage, how holes behave, and what appears outside the subject.

An implementation using a couple of 2D offscreen canvases and `globalCompositeOperation` is a good **first trial**. Use a GPU pass only if the film effects themselves require it. If you do use WebGL, stay with Kino's existing standalone-pass pattern rather than inventing pass chaining or changing every renderer.

For `filmPass`, start with:

- Small, seeded luminance/chroma grain that reads at destination resolution. Grain strength should not destroy faces, white type, or smooth midtones.
- Highlight halation that blooms *from bright edges* and has a warm bias; do not add uniform Gaussian blur over everything.
- Exposure/contrast curve with preserved dark detail; configurable subtle vignette.
- Very slight, time-derived gate weave, if it survives the visual test.

Dust, scratches, chromatic misregistration, lens artifacts, and physically simulated emulsions belong in **future research** until the fundamental compositing and exposure look earns its keep. Do not build a generic film-aging toolbox now.

### Darkroom PoC

**Working title:** `THE SILENT CITY`  
**Length:** 10-12 seconds  
**Composition:** `compositions/xp-darkroom/`

Use locally stored, licensed photos (or original/synthetic plates) consisting of: a statue or silhouetted human figure, a nocturnal city/industrial structure, and atmospheric architecture/clouds. Save file and attribution/license details adjacent to the assets. Do not use source footage/rips from the referenced TV/film titles.

One continuous or gently segmented shot: silhouette resolves, distant architecture emerges within it, small shift in exposure, a sparse line of type. Retain spacious black areas. Subtle photographic movement, with no cheap hard glitch. The image should not merely be two opaque pictures at 50% opacity.

**Proofs:**

- The masked composite remains correct without `filmPass`.
- The same image through a different existing material (`ditherPass` or `screenPass`) still composes correctly. A short A/B snapshot is enough.
- `filmPass` can be switched off or its strength set to zero without changing the underlying geometry/content.
- Tests or synthetic fixtures cover mask alpha vs mask luma, transparent holes, endpoints for mix/exposure, repeat seek.

**Success test:** A viewer should immediately understand that one *image occupies another image's shape*. The physical treatment should strengthen that impression without obscuring the source.

## 3. Visual language B: TYPESETTING

### Creative target

Typography that is laid out like a serious editorial page and animated as a physical structure. Letter fragments assemble with unbearable patience, a heading behaves like an architectural plane, small text remains readable, and a line of copy enters behind a real mask. Not kinetic-typography preset confetti.

References:

- [Alien (1979) opening titles](https://www.artofthetitle.com/title/alien/): letter fragments accumulating with extraordinary restraint.
- [Saul Bass, Anatomy of a Murder](https://www.artofthetitle.com/title/anatomy-of-a-murder/): graphic form, spatial composition and moving type.
- Later exploration: Swiss/editorial page structure, tight grid, asymmetric white space, precise tracking.

### Build on the actual typography foundation

`src/sources/html-plate.ts` already uses CSS to lay out text and snapshots the resulting DOM via SVG `foreignObject`, returning `data-part` boxes that `drawPart()` can draw separately. **That is the correct base.** Avoid manually calculating kerning, line breaking, font metrics and text positions in canvas.

There are three useful capabilities, with different risk levels:

| Candidate | Role | Definition | Priority |
|---|---|---|---|
| `typeReveal` | `arrange/` or `sources/type.ts` | Time-driven crop/clip/fragment reveal over an already-laid-out text plate | **PoC** |
| `typeParts` / measured parts | `sources/` | Thin ergonomic layer over `htmlPlate`'s `data-part` regions for words, lines and masks | **PoC only if needed** |
| `lineReflow` | composition or future arrangement | A passage visibly changes column/line layout | **Research, not engine work** |

**Do not start with `glyphLayout()`.** Per-glyph geometry is alluring but easy to get wrong with kerning, ligatures, combining characters, grapheme clusters, variable fonts, and script shaping. First prove this using **words or lines** with existing `data-part` spans/boxes. If the exact Alien-like split-glyph effect requires glyph fragments, crop a *rasterized, correctly shaped* word into geometric pieces and animate those pieces. Don't split its HTML into individual letter spans unless typography survives comparison.

### Provisional composition style

```ts
const plate = await Kino.htmlPlate({
  html: `... marked up with data-part="title" / data-part="subtitle" ...`,
  css: `... grid, typography, tracking ...`,
  width: W, height: H, background: "transparent",
});

// The painter remains a function of t.
// A reveal clips/crops regions from plate.canvas using plate.parts,
// then draws into the current canvas context at an explicit position.
```

Treat text masks as geometry. A letterform reveal should be a controlled path from invisible to legible, rather than simply `opacity: 0 -> 1`. A genuinely useful primitive can expose the original intact text raster, a portion of it, and stable measurements.

For a later `lineReflow`, consider **precomputing two (or more) legitimate CSS layouts** at setup, then animating between measured line/word rectangles. There is no reason to force the browser to reflow every rendered frame, and no reason to manufacture a browser-grade layout engine. Note that interpolation between layouts might need mapping at word level; prove that visually before promoting it.

### Typesetting PoC

**Working title:** `THE NAME OF THE THING`  
**Length:** 10-12 seconds  
**Composition:** `compositions/xp-typesetting/`

Use local fonts already in `src/tokens/fonts.json` and a dark, spare editorial composition. Beginning: an almost-empty image. A monumental word gradually emerges as *fragments* of complete letterforms, reminiscent of the pacing, not a replica, of `Alien`. A small paragraph or pair of columns follows with a measured mask/line reveal. End with one strong composition and hold it while a barely perceptible movement continues.

**Proofs:**

- At least two distinct reveal grammars: (1) fragmented large title; (2) cropped whole-line or paragraph entrance.
- Both use browser-rendered type and measured geometry. No manual letter spacing math in canvas.
- All measurement occurs after font loading. Output does not change between out-of-order seeks.
- Show one cross-material snapshot using an existing pass (`screenPass`, `risoPass`, or `ditherPass`) **without rewriting the type source**.
- A simple static layout fixture tests bounds and reveals at progress 0, 0.5, 1. Document if rasterized fragments cannot be recombined without seams at fractional pixels.

**Success test:** Type still looks impeccably typeset when the animation pauses. The movement heightens the composition, not the other way around. No individual letters appearing randomly on musical beats.

## 4. Visual language C: TEMPORAL SLIT-SCAN

### First, distinguish two techniques

**Historical optical slit-scan** (for example Douglas Trumbull's `2001: A Space Odyssey` Stargate) moves imagery behind a slit during a photographic exposure, creating extraordinary spatial/light-trail patterns. **Temporal slit-scan / time-displacement** constructs a single image from spatial strips sampled at *different source times*. They are related visual ideas, **not the same algorithm**. This spec commissions the **temporal** technique first because it introduces a new, reusable compositing operation in Kino. A true optical-style Stargate tunnel can become a separate future experiment.

References:

- [Douglas Trumbull on the slit-scan process](https://kubricks2001.wordpress.com/2014/12/21/creating-special-effects-for-2001-a-space-odyssey-douglas-trumbull/)
- [Making of the 2001 slit scan, modern recreation](https://www.youtube.com/watch?v=Wvo7pIbCGeM)

### Creative target

A moving object or figure becomes an elongated temporal structure. One end of the frame sees an earlier state than the other. A slow camera traversal makes that disagreement visible. It should feel like time has been spatialized, not like a glitch filter.

### Contract and algorithm

The operation belongs in `arrange/`, because it determines **which moment of a source appears where**. The output can subsequently enter any of Kino's existing material passes. Do not bake a phosphor, dither, color ramp, or chromatic aberration into the temporal sampler.

Define a source as a renderer of a specific time. The suggested contract is provisional:

```ts
type TimeSource = (ctx: CanvasRenderingContext2D, sourceTime: number) => void;

type TemporalScanOptions = {
  width: number;
  height: number;
  axis?: "x" | "y";
  bands: number;
  span: number;          // source-time difference across the image, seconds
  direction?: 1 | -1;
  offset?: number;
  source: TimeSource;
};

// temporalScan(ctx, t, options): void
```

For a horizontal position `x` in a vertical-strip scan, for example:

```text
u = (x + 0.5) / width
sampleTime(x, t) = t - span * u        // reverse for opposite direction
```

Use the center of each strip to compute `sampleTime`. The returned output at frame `t` is therefore constructed from a deterministic set of other times. The computation must be *stateless*: no "last frame," no feedback texture dependent on visit order, no GSAP callback accumulation, no browser `<video>.currentTime` seek per strip.

**Performance warning:** An obvious implementation that repaints an entire 2560x1440 source **once per output pixel column** is unusable. Start with a small number of bands (e.g. 32-64), benchmark at a reduced resolution, and decide between:

- Clipped, band-local drawing of a cheap procedural source (good for the first PoC).
- Rendering/caching a bounded number of sampled source frames and cropping their strips (good for sources that need whole-frame composition, but watch texture memory).
- A shader using a precomputed image atlas, only if the above is genuinely too slow and you can keep the time sampling deterministic.

Don't allocate `N` full-resolution frame canvases blindly. An RGBA 2560x1440 frame alone occupies about 14 MiB, and 64 of them approach 900 MiB before other buffers. For actual footage, investigate offline extraction/preprocessing into a locally packaged set of sampled frames; leave decoding and asset format decisions out of the core composition helper.

For band-local rendering, carefully restore the context around each clip and draw, and ensure every band fills its own pixels. This keeps each output independent of previous seeks. If the source has an internal animated camera, its position must be a pure function of the requested source time.

### Temporal Slit-Scan PoC

**Working title:** `AN OBJECT OUTSIDE TIME`  
**Length:** 8-10 seconds  
**Composition:** `compositions/xp-temporal-scan/`

Use *original procedural imagery* for the first test: a high-contrast moving geometric human-like silhouette, rotating apparatus, pendulum, or train-like object crossing a sparse architectural field. Don't let asset wrangling obscure the new algorithm. Use a background/grid that makes distortion direction legible. One version scans vertically and slowly increases `span` from zero to an obvious temporal shear; another moment changes scan direction or axis. Keep colors limited.

**Proofs:**

- With `span: 0`, the image equals the ordinary source at `t` (subject to only documented sampling/raster differences).
- With nonzero `span`, neighboring strips demonstrably sample different times. Include a test source encoding sampled time as color/position to make this mechanically verifiable.
- Out-of-order seeks (`t=4, 1, 7, 4`) reproduce the same result at repeated `t=4`.
- At least one snapshot passes the composited temporal image through an existing material (`ditherPass` is a strong candidate).
- Report frame render times and memory use at the tested resolution; note if full 2560x1440 rendering is viable. Reduce bands or fidelity honestly if not.

**Success test:** A viewer can recognize that the object is being assembled from *several moments at once*, and the result remains visually deliberate instead of becoming unreadable random slices.

## 5. Cross-language questions to answer, not pre-architect

These PoCs should help answer several design questions. **Do not create a new framework merely because these questions exist.**

1. Can we use the existing `(ctx, t)` painting idiom for all three, or do any genuinely need a richer source contract?
2. Is `doubleExposure` best represented as two scene functions plus a mask, or as a reusable buffer/canvas compositor? If the latter, what is the smallest ergonomic surface?
3. Where does alpha live before passes whose default source is black-filled RGB? Document the handoff rather than quietly changing every pass.
4. Does typesetting need anything beyond `htmlPlate` plus a small mask/reveal function? Do not move `htmlPlate` into a grand new scene system.
5. Can `temporalScan` render a procedural or deterministic source efficiently enough without the renderer becoming aware of temporal sampling?
6. Which new operations can be recombined with **existing** riso, cyanotype, blueprint, or dither components?
7. Which capabilities should remain in private PoC code because they are authored decisions, not library primitives?

A tentative code-placement map, **only if proven reusable**:

```text
src/
  arrange/
    double-exposure.ts       # maybe: reusable 2D compositor
    type-reveal.ts           # maybe: plate-part geometry and reveal
    temporal-scan.ts         # maybe: stateless temporal sampling
  passes/
    film-pass.ts             # maybe: photographic material treatment
  looks/
    darkroom.ts              # maybe: curated settings after visual approval
  sources/
    html-plate.ts            # preferably reuse unchanged
compositions/
  xp-darkroom/
  xp-typesetting/
  xp-temporal-scan/
docs/primitives/               # add docs only for promoted primitives
research/                       # optional lab/bench evidence
```

Do not make a `compositor.ts` class hierarchy, generic scene-graph or typed `MotionGrammar` because this brief mentions composition. Extract in response to verified duplication or real integration friction.

## 6. Workflow, quality gates, and artifacts

### Before coding

- Inspect the current tree and note its commit SHA. Identify any existing equivalent functionality.
- Write a **short audit and implementation order**, grounded in source, including which functionality starts locally in the PoC and which might be promoted immediately.
- For each direction, decide the smallest viable visual effect, the cheapest adequate rendering method, and a way to test that it is truly deterministic.
- Do not spend the whole session researching libraries or building shared infrastructure.

### While building

- Independent directories and independently runnable HyperFrames compositions. Prefer existing fonts and locally packaged original/suitable licensed material.
- Use the established `window.Kino`, `whenReady`, and paused GSAP timeline conventions. Animated canvases use `timeDriver` or a pass already using it.
- Keep each composition a **piece** with considered editing and visual hierarchy, not a technical checkerboard. A synthetic checkerboard may live in tests or a separate lab.
- Start at low/medium resolution for performance experiments, then render the final version at the exact intended resolution (ideally 2560x1440 if performance permits). Note any lower-resolution final fallback.
- Snapshot endpoints and intermediate frames; inspect at native size. Test rapid and out-of-order seeking rather than trusting only a linear render.
- Avoid changes to existing look semantics. Run `npm run typecheck`, `npm test`, `npm run build`, and `scripts/smoke.sh` when supported by the environment, followed by each PoC's `hyperframes check`, snapshots, and delivery render.
- For WebGL performance work, preserve existing rendering behavior and use the current benchmark/regression pattern. Distinguish measured performance from guesses.

### Hand back something observable

For **each** PoC supply:

1. Location of code and a one-paragraph explanation of what is reusable vs composition-only.
2. A playable `.mp4` (or a precise explanation if rendering is blocked) and 3-5 stills at meaningful timestamps.
3. Commands for rebuilding and rendering that specific composition.
4. Tests executed and their results, with limitations honestly stated.
5. One cross-material screenshot or short clip demonstrating composability.
6. A short critique: what works aesthetically, what feels generic or clumsy, performance bottlenecks, and what should **not** be promoted.

Then give a **single comparative verdict** answering: Which of the three is most promising? Which reusable primitive did we actually discover in each? What, if anything, should become public `Kino` API now, and what should wait for a second use? Do not automatically crown every experiment a `MotionAesthetic`.

### Keep scope bounded

**Required for this round:** a functional double exposure + restrained photochemical treatment, a browser-laid-out text-fragment reveal, and a deterministic temporal strip sampler, all each demonstrated in their own short composition.

**Not required:** generalized film physics; automatic person segmentation; per-character Unicode shaping system; real-time footage decoding; live video effects; full optical Stargate reproduction; a new render engine; an editing UI; a motion grammar schema; dozens of presets; packaging/distribution work.

A partially successful experiment with clear evidence is better than elaborate code that cannot be rendered or inspected.

---

## 7. IMPLEMENTATION REQUEST: BUILD ALL THREE PoCs

**Please implement a usable proof of concept for every one of these directions, not just the easiest or the first:**

1. `compositions/xp-darkroom/` with a genuinely masked double exposure and restrained film/exposure treatment.
2. `compositions/xp-typesetting/` with precisely typeset browser typography, fragmented title assembly, and a second masked text reveal.
3. `compositions/xp-temporal-scan/` with stateless multi-time strip sampling and a clearly legible temporal distortion.

Build them **separately**, using the existing Kino architecture. Favor small reusable primitives, but leave experimental tricks inside the compositions unless reuse is demonstrated. Test all three, render all three, inspect the results, and report back with clips/stills, commands, measured limitations, and a recommendation on which primitives are worth formally adding to Kino. **Do not declare the exercise complete after writing a plan or finishing only one PoC.**

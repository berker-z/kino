# Kino: Architecture Review and Refactor Brief

**Review date:** 2026-10-09  
**Repository:** `berker-z/kino`  
**Reviewed baseline:** `main` at `5f8e073356bf38072cc0d80f5d614c7449afdbac` (2026-10-08)  
**Purpose:** Review, stabilize, and clarify the existing architecture **before adding effects, looks, or product features**.

> **Instruction to the coding agent:** Read this brief, then inspect the current repository and its actual code. This is a review and a proposed direction, not an instruction to implement everything. First produce an evidence-based audit and a small, ordered refactor plan. Preserve working output. Make changes in independently verifiable increments. If the code has changed since the reviewed commit, revalidate every finding instead of assuming it is still true.

---

## 1. Executive assessment

Kino has evolved from an intended library of HTML motion components into a more interesting system: **a programmable collection of visual materials, signals, sources, and motion grammars**, with HyperFrames as the rendering host.

The most important existing idea is:

```text
signals (time, music, events)
       ↓
sources (what gets drawn)
       ↓
arrangements (how it moves / enters / changes)
       ↓
passes (what physical or visual medium it becomes)
       ↓
frames → HyperFrames → video
```

The pipeline is real, not aspirational. The cyanotype, blueprint, phosphor, teletext, and risograph experiments demonstrate that it can produce distinct visual worlds. `htmlPlate()` is a particularly promising bridge between browser typography/layout and canvas-based processing. `timeDriver()` solves a real HyperFrames/GSAP seek behavior. The teardown skill creates a repeatable method for studying a reference, extracting a technique, and proving it on new material.

**The main risk now is fragmentation, not lack of features.** Kino could become a collection of impressive but independent art pieces, with reusable code on the side. We want the opposite: compositions should draw increasingly from a shared visual vocabulary, while remaining free to do unusual things.

**Recommendation:** do a bounded **correctness + contract + composability** refactor. Avoid a wholesale rewrite, renderer abstraction, visual editor, complex declarative DSL, or general-purpose scene engine.

### The desired result

Kino should make it easy to say:

> Use this source, arrange it with this camera/transition, apply this material treatment, and follow this motion grammar.

The system should know what combinations are meaningful, let compositions override the rules intentionally, and make rendering and inspection reproducible.

---

## 2. Preserve these strengths

Do not accidentally refactor away the qualities that make Kino interesting.

1. **Deterministic, arbitrary-time rendering.** A frame should depend on time, inputs, and seed, never the previous rendered frame. This is crucial for seeking, distributed rendering, snapshots, and agent iteration.
2. **Sources separate from visual treatment.** Grayscale plates/paintings can receive different print/screen treatments without rewriting their content.
3. **Physical metaphors that do real work.** Ink separations, misregistration, CRT optics, beam persistence, and cameras over a printed sheet are more expressive than generic effect presets.
4. **HTML where HTML wins.** `htmlPlate()` lets the browser handle sophisticated typesetting before canvas handles motion and material.
5. **Reference pieces as experiments.** The compositions are valuable research artifacts. Keep them, even if a simpler reusable primitive is extracted later.
6. **Visual judgment as the deciding authority.** Numerical measurements assist; they cannot replace looking at the work.
7. **The teardown → lab → proof workflow.** This is an important part of Kino's knowledge-acquisition architecture, not disposable documentation.
8. **Plain HTML/CSS/JS and the browser graphics ecosystem.** HyperFrames remains the host. Do not introduce a Rust-style authoring/runtime commitment or build your own video renderer.

---

## 3. Findings: confirmed defects, risks, and design gaps

Use these labels carefully:

- **Confirmed in source:** directly visible in the reviewed code.
- **Risk to verify:** plausible problem or contract ambiguity that needs a test before changing behavior.
- **Design gap:** architecture does not yet express a desired capability cleanly; not necessarily a bug.

### P0: Fix an actual shader bug

**Confirmed in source:** [`src/passes/screen-pass.ts`](src/passes/screen-pass.ts), function `screenAt()`.

The shader defines an outer `vec3 c` holding sampled color, then defines an inner `float c` inside the `if (pitch > 0.0)` block. The subsequent `c *= mask` modifies the inner float; the value is discarded on leaving the block. The sampled `vec3` is returned unchanged.

The calculated grille/bead mask therefore does **not** affect the sampled color as intended.

Fix by renaming the scalar, e.g. `phase`, leaving `c *= mask` to modify the color vector. Then:

- Make a fixed-source A/B snapshot with `grille: 0` and a clearly enabled grille.
- Confirm a measurable difference in the expected area.
- Visually re-tune the preset if the corrected mask changes the look significantly.
- Benchmark *after* the correction. Do not optimize or retune an effect that is currently a no-op.

**Do not treat the existing cyanotype screenshots as evidence that this specific mask works.** The overall effect can still look good because its color ramp, blur, convergence, bloom, and other operations are active.

### P0/P1: Frame scheduling and deterministic behavior need explicit tests

**Confirmed in source:** [`src/runtime/time-driver.ts`](src/runtime/time-driver.ts) registers a GSAP tween on a callable setter, quantizes to `Math.round(value * fps)`, tracks the last frame, and invokes `render(0, 0)` explicitly.

This is an inventive adapter to HyperFrames seeking with callbacks suppressed. It is also foundational infrastructure. Test:

- Frame 0 initialization, including whether it renders more than once.
- Seeking `0 → N → 0`, `N → 4 → N`, and arbitrary out-of-order frames.
- Adjacent exact frame boundaries at 30 and 60 fps.
- Nonzero `start`, duration end, and off-range seeks.
- Several independently driven surfaces sharing one timeline.
- Whether preview, snapshot, and final render select identical frames.

**Risk to verify:** the explicit initial render does not update `current`; frame 0 may be painted again on the first timeline seek. That may be harmless, but should not be assumed.

Make the frame/time interpretation explicit in one place. Do not rewrite the clock abstraction until the test documents a real limitation.

### P1: Audio signal edge cases

**Confirmed in source:** [`src/signals/audio.ts`](src/signals/audio.ts): `bassFollower()` normalizes by `hi - lo` without guarding against a constant spectrum. This can produce `NaN`. [`src/signals/beat-map.ts`](src/signals/beat-map.ts): `beatTicks()` assumes at least two distinct beats and computes a period from `beats.length - 1`.

Add targeted tests and defined behavior for:

- Silent and constant-energy tracks.
- Empty, single-beat, repeated, and unsorted beat grids.
- Out-of-range times.
- Spectrum frame rate different from composition frame rate.
- Sample arrays with missing or zero-length channels.

Prefer clear errors for invalid inputs and sensible zero/empty behavior for valid silence. Do not bury mistakes under generic fallbacks.

### P1: WebGL initialization and failure diagnostics

**Confirmed in source:** [`screen-pass.ts`](src/passes/screen-pass.ts) and [`riso-pass.ts`](src/passes/riso-pass.ts) assert non-null WebGL2 contexts and create programs immediately. In the documented NixOS/Wayland environment, context initialization can fail and render black or throw an unclear error.

Introduce a **small shared WebGL setup utility** if both passes benefit, with:

- Explicit error when `getContext('webgl2')` returns `null`.
- Shader compile and program link errors with the material/pass name.
- Optional diagnostic for likely headless/Wayland issues, without embedding personal dotfile assumptions into library code.
- Clear resource ownership if contexts/textures are recreated or disposed.

Do not build a generalized GPU engine. A tiny shared `compileProgram`, `createTexture`, `assertWebGL2` module may be enough.

### P1: Aesthetic vs material vs motion grammar are conflated

**Design gap:** [`src/looks/types.ts`](src/looks/types.ts) defines `MotionAesthetic` containing palette, typography, spacing, motion, layout, surfaces, and a `texture` object with optional `screen`, `riso`, and other treatment settings.

In the original DOM scene [`hero-reveal.ts`](src/dom/scenes/hero-reveal.ts), the aesthetic actually drives entrance behavior and layout. In newer canvas compositions, presets are often consumed only through calls such as:

```js
...Kino.phosphor.texture.screen
...Kino.riso.texture.riso
```

The material treatment is reusable, but the movement that gives a style its identity often remains local to a composition. Changing a look isn't equivalent to changing a palette, and changing a material isn't always type-compatible with the same source.

**Direction:** keep a curated **Look** but distinguish its ingredients:

| Concept | Owns | Examples |
|---|---|---|
| **Source** | Content and signal-driven image generation | photo plate, network graph, typography, waveform, pen drawing |
| **Arrangement** | Spatial and temporal behavior | sheet camera, print run, push, torn wipe, lens pass |
| **Material / Pass** | Final image formation | cyanotype/CRT screen, blueprint print, phosphor tube, riso ink, dither |
| **Motion grammar** | Preferred pacing and movements | continuous glides, hard beats, restrained holds, page search |
| **Look** | Curated defaults assembled from the above | `cyanotype`, `phosphor`, `riso`, `nordTerminal` |
| **Composition** | The actual artwork/edit | blueprint song piece, risograph sequence, launch teaser |

**Important:** this is a conceptual cleanup first. Do not move files or invent six new interfaces unless the existing composition code benefits immediately.

### P1: The source/pass interchangeability claim has exceptions

**Design gap:** the architecture states that sources paint grayscale and passes determine the medium. That's useful, but isn't universally true:

- `screenPass` supports color via `colorMode`.
- `risoPass` takes **two** ink separations, not one grayscale buffer.
- Some source utilities assume white means light; others effectively mean coverage/ink.
- DOM content can be live HTML or a rasterized `htmlPlate`.

Treat this as a **small type/contract problem**, not evidence that the pipeline is wrong. Define input semantics clearly:

```ts
// Illustration, not a mandate to create this exact interface now.
type SourceKind = "luma" | "color" | "two-ink";

type SourceSpec = {
  kind: SourceKind;
  // Explicit interpretation: luminance, coverage, or ink separation.
  // Explicit dimensions, color space, and alpha behavior where relevant.
};
```

A renderer/pass should declare what it accepts. Incompatible combinations should fail clearly or use an **explicit** adapter. Do not silently map two-ink separations into single-channel media or vice versa.

A deliberately small compatibility table in docs is fine for the first iteration.

### P1: Composition logic is larger than the reusable surface

**Confirmed in source:** reference compositions contain substantial handwritten logic, e.g. [`compositions/blueprint/index.html`](compositions/blueprint/index.html) (~416 lines) and [`compositions/risograph/index.html`](compositions/risograph/index.html) (~254 lines). These are not inherently too long, and their unique artwork should stay unique. The question is whether shared movement, staging, and drawing operations remain trapped inside them.

**Direction:** promote a technique only after a second composition wants it. Candidates to examine:

- Oscilloscope mode squash and power-off transition.
- Teletext page search/reveal.
- Physical-camera and print-motion conventions.
- Shared timing helpers and per-shot/scene scheduling.

Keep the expressive scene code in compositions. Extract mechanics, not artistic decisions.

### P2: Rendering cost needs a baseline, not speculative optimization

**Confirmed in code and documentation:** `screenPass` uses 24 blur taps, multiple samples per tap, additional bloom samples, and a full canvas-to-WebGL texture upload each frame. Existing notes report slow SwiftShader rendering. `risoPass` also uploads two full-size canvases every frame. [`dither-canvas.ts`](src/passes/dither-canvas.ts) does CPU work per pixel.

Before rewriting shaders:

- Benchmark short, identical scenes at 1080p and 1440p, 30 and 60 fps where relevant.
- Record GPU backend/software renderer, machine, CPU, actual render duration, output size, and checksum or reference frames.
- Isolate source painting, texture uploads, shader pass, and encoding if possible.
- Investigate a separable blur / intermediate framebuffer for `screenPass`, **while preserving treatment order**: the screen texture itself should be blurred by the camera effect.
- Check potential gains from caching truly static plates or rendering only necessary layers.

The reported ~45 minutes for three concurrent 27-second 1440p screen renders should **not** be treated as a clean single-render benchmark. Measure serially on a fixed workload first.

### P2: Toolchain and reproducibility are too machine-specific

**Confirmed in docs:** Kino uses a Nix-packaged HyperFrames CLI with a local Chrome/FFmpeg setup; WebGL under Wayland requires an environment workaround. `hyperframes snapshot` has been observed to crash after writing images, and one `hyperframes check` run closed the browser unexpectedly.

Make a small, self-contained, synthetic smoke composition that can build, check, snapshot, and render without private audio/media assets or personal dotfiles. Document the pinned HyperFrames version, Nix entry point, headless browser assumptions, and required OS packages.

Do not interpret a crashed checker as success merely because a separate render worked. Keep **tool failure** distinct from **composition failure**, and record the exact circumstances.

### P2: The public API is convenient but broad

**Confirmed in source:** [`src/index.ts`](src/index.ts) exports many dissimilar primitives into `window.Kino`; [`scripts/build.mjs`](scripts/build.mjs) bundles everything into an IIFE and copies artifacts into every composition's `vendor/` directory.

This is a reasonable early-stage distribution strategy and should survive this review unless it creates concrete pain.

Possible incremental improvements:

- Document which exports are stable public primitives vs experiments.
- Group discovery documentation by signals, sources, arrangements, passes, and looks.
- Keep the browser-global bundle for HyperFrames now.
- Consider TypeScript/ESM consumers later only if there is a real second integration target.
- Examine whether rebuild fan-out to every composition has become a meaningful development bottleneck.

**Do not** launch a monorepo/package publishing exercise as part of this refactor.

---

## 4. Proposed architecture, with minimal migration

The clean conceptual model:

```text
       audio / time / content / media
                  │
          signals + assets
                  │
             SOURCE(s)
      luma / color / ink channels
                  │
           ARRANGEMENT
      camera / strips / transitions
                  │
              MATERIAL
     print / screen / phosphor / etc.
                  │
             frame output
                  │
             HyperFrames

LOOK = curated configuration for palette,
       typography, material and motion grammar.

COMPOSITION = chooses sources and arrangements,
              choreographs time, applies a look,
              and overrides defaults deliberately.
```

### Design constraints

1. **No framework-shaped data model just for its own sake.** Existing functions are good. Do not introduce class hierarchies, dependency injection, scene graphs, or factories everywhere.
2. **Preserve DOM and Canvas as complementary authoring surfaces.** DOM components don't need to be forced through the grayscale pipeline. `htmlPlate()` is the bridge when a DOM layout needs material treatment.
3. **Keep HyperFrames-specific concerns near the runtime boundary.** Current GSAP timeline arguments are accepted for now. A separate host adapter is justified only when tests or a second host demand it.
4. **Prefer small, honest types.** A few explicit discriminants/contracts beat a giant generic `RenderNode<T>` system.
5. **Art remains authored.** Avoid a scene DSL that tries to describe every interesting artistic choice declaratively.
6. **Names describe behavior.** `risoPass`, `sheetCamera`, `tornWipe`, `beam`, `htmlPlate` are good names and should remain understandable.

### A possible low-risk TypeScript direction

This is a sketch, **not** implementation instructions. Use it only if a real proof composition indicates the current shape gets in the way.

```ts
type MaterialPreset =
  | {kind: "screen"; settings: ScreenLook}
  | {kind: "riso"; settings: RisoSettings & {inkA: string; inkB: string; paper: string}}
  | {kind: "dither"; settings: DitherSettings};

type MotionGrammar = {
  pacing: "continuous" | "beat-led" | "stepped";
  preferredTransitions: readonly string[];
  durations: {fast: number; normal: number; slow: number};
  easing: {enter: string; exit: string; emphasis: string};
};

type Look = {
  id: string;
  palette: Palette;
  typography: Typography;
  material: MaterialPreset;
  motion: MotionGrammar;
};
```

If this design forces ugly coercions or can't describe the existing presets, keep the current objects and document the separation first. The target is **honest contracts and recombination**, not a prettier diagram.

### What proves composability

Conduct two small experiments using **existing primitives** and no new effect implementation:

**Experiment A: source transfer.** Use `pen` or `networkTree` with a different appropriate material pass (for instance, technical pen drawings under cyanotype). Measure how much code must change.

**Experiment B: arrangement transfer.** Take an existing source and run it under another arrangement (for instance, use `sheetCamera` over a larger teletext or diagram canvas, or a print strip on material other than its original source). Again, measure glue and duplication.

Each experiment should answer:

- Which pieces were truly reusable without alteration?
- What glue was necessary?
- What abstraction, if any, would eliminate repeated glue in a **second** use case?
- Did the new pairing look convincing, or merely technically work?

Do these experiments before proposing major file moves.

---

## 5. Testing strategy: visual software needs visual contracts

A passing `tsc` is necessary, not sufficient. A successful render is also insufficient if shader parameters silently do nothing.

### Layer 1: Pure unit tests

Prioritize `signals/`, `arrange/`, and non-DOM helpers:

- `beatMap`, `beatTicks`, `tickAt` including edge cases.
- `bassFollower`, `bandEnergy`, and `autoGain` with silent, constant, and changing synthetic signals.
- `sheetCamera.at(t)` at boundaries, hold periods, glides, and out-of-order times.
- `printRun` end behavior and `registerDrift` zero crossings.
- seeded noise and deterministic geometry.

Use the smallest sensible test runner. No test-framework redesign.

### Layer 2: Clock/seek contracts

Render the same frame through different seek orders. Compare image hashes or pixel values. Include first frame, last frame, and transitions. Test 30 vs 60 fps explicitly.

**Invariant:** `render(frame=N)` must not depend on whether frames `N-1`, `0`, or `N+10` were visited previously.

### Layer 3: Material/pass parameter influence

Create tiny synthetic plates: bars, gradients, grids, typography, flat fields. For each shader pass, test:

- baseline/reference snapshot;
- setting an effect to zero;
- setting it to an obviously active value;
- image difference localized to expected regions;
- repeat snapshots produce the same result when seeded.

**Include a regression case that fails under the `screenAt()` variable-shadowing bug.**

Avoid overfitting screenshots to one GPU backend. Decide which tests assert exact pixels and which tolerate bounded perceptual differences. Keep at least one pinned software-rendering baseline if practical.

### Layer 4: Golden frames and short proof videos

Maintain a tiny representative set, rather than enormous binaries in the repo:

- DOM hero.
- Grayscale + screen pass.
- Two-ink riso.
- Color-mode teletext.
- Audio-driven waveform/beam.
- One cross-composed experiment.

The test corpus must be fully local and legally redistributable, or generated synthetically. Use snapshots for CI where possible, and keep longer delivery renders for manual review.

### Layer 5: Lint/build/check integration

Minimum automated commands:

```bash
npm ci
npm run typecheck
npm run build
# new short unit/smoke test command once added
```

Then a documented, reproducible `hyperframes check`, snapshot, and tiny render for a synthetic composition. GitHub Actions can run the cheap deterministic parts first. A full GPU video-render matrix does not belong in every PR.

---

## 6. Teardown as a first-class learning pipeline

The skill at [`.claude/skills/teardown/SKILL.md`](.claude/skills/teardown/SKILL.md) is one of Kino's best investments. Preserve its workflow:

```text
WATCH → REPORT → MEASURE → LAB → PROVE
```

It forces decomposition before imitation, measurement before shader guesswork, and a proof on **new material** before claiming a technique generalizes.

### Add a sixth, deliberately small stage: PROMOTE

```text
WATCH → REPORT → MEASURE → LAB → PROVE → PROMOTE
```

**PROMOTE** is the decision about which part of a successful teardown deserves to become reusable library knowledge. A visually successful experiment may remain an artwork; it need not create a new API.

Promotion requires:

1. A clear, medium-independent description of what was learned.
2. A minimal implementation and documented parameters.
3. A self-contained example on new material.
4. A deterministic visual test or baseline.
5. Known limitations and compatible source/pass combinations.
6. A short record of aesthetic decisions, including rejected approaches.

### Lightweight machine-readable metadata

Do not build search infrastructure, a registry service, or embeddings yet. A sidecar manifest can be enough:

```yaml
id: aperture-grille
kind: material-technique
implementation: src/passes/screen-pass.ts
learned_from: research/nouscon
status: validated
inputs: [luma, color]
parameters: [pitch, grille, beads]
examples: [compositions/screen-test]
constraints:
  - measure and render texture at known pixel resolution
  - distinguish source channel shifts from screen texture
  - verify parameter influence on synthetic source
notes: docs/primitives/screen-pass.md
```

Only record fields that provide value now. A simple `manifest.json` or frontmatter in the existing primitive docs may be preferable to standalone YAML files.

### Extend the measurement discipline

The current teardown analyzes grades, spatial periodicity, channel relationships, and local contrast. Expand gradually to **motion**:

- Shot length distribution and cut density.
- Track representative object positions across time.
- Estimate velocity, acceleration, pauses, overshoot, and easing.
- Distinguish camera movement from subject movement.
- Identify changes that follow beats, bars, or musical phrases.

Use automated estimates as evidence to inspect, not unquestioned truths. A repeated RGB texture phase **does not prove** an image was generated synthetically; a narrow luminance→color distribution **does not prove** a literal gradient-map operation. State the observation, the plausible mechanism, and the uncertainty separately.

### Fix measurement portability

**Confirmed in source:** [`.claude/skills/teardown/scripts/measure.py`](.claude/skills/teardown/scripts/measure.py) normalizes frame reads to 3840×2160, and [`round.sh`](.claude/skills/teardown/scripts/round.sh) uses fixed 4K crop geometry. Rescaling is useful for a standardized comparison dashboard, but can alter the very texture pitch and pixel structure being measured.

Split the concepts:

- **Native-resolution analysis** for periodicity, channel phase, pixels, and material texture.
- **Normalized-resolution comparison** for side-by-side visualization.

Allow crop regions to be configured relative to frame size. Preserve the reference's original dimensions in the measurement report. Add a validation that all lab crops actually exist before proceeding.

### Taste memory

`docs/lessons.md` is unusually valuable because it stores actual judgments rather than marketing copy. Keep concrete constraints such as:

- No arbitrary per-beat jitter or full-frame flashes.
- Moving fine line art must respect pixel alignment and delivery resolution.
- Text stays readable over damaged/printed imagery.
- A good-looking sequence of stationary pages can still feel like a slideshow.
- Physical transitions should have an intelligible mechanism.
- New looks need proof on unfamiliar material.

Separate **global preferences** from **look-specific lessons** so a deliberately harsh, frantic new aesthetic isn't inadvertently banned by a rule learned from a calm cyanotype reference.

---

## 7. Suggested refactor execution order

This is a review sprint, not a feature roadmap. Stop at each gate and inspect the result before moving on.

### Phase 0: Baseline and evidence

**Work:**

- Read `CLAUDE.md`, `docs/architecture.md`, `docs/lessons.md`, and the teardown skill.
- Inspect current code and all active compositions; verify findings against HEAD.
- Record what builds and renders now. Distinguish tool crashes from code errors.
- Choose a tiny set of synthetic golden frames and existing reference frames.
- Publish a brief audit: defects, contracts, dependencies, and proposed changes.

**Gate:** there is a reproducible baseline against which to detect regressions.

### Phase 1: Correctness first

**Work:**

- Fix `screenAt` variable shadowing and capture its A/B impact.
- Add clock/seek tests and signal edge-case tests.
- Improve WebGL failure messages and shader compile diagnostics.
- Address any other confirmed correctness bugs uncovered by focused tests.

**Gate:** no known foundational correctness defect; representative current outputs remain intentional.

### Phase 2: Validate and clarify the architecture

**Work:**

- Define luma/color/two-ink source contracts and pass compatibility, initially in docs/types.
- Run the two cross-composition experiments.
- Decide whether `Material`, `MotionGrammar`, and `Look` should be split in code or simply documented as distinct aspects for now.
- Preserve existing browser bundle and composition entry points.

**Gate:** at least two nontrivial examples reuse existing primitives across original aesthetic boundaries with little duplicated implementation.

### Phase 3: Small extractions, no grand rewrites

**Work:**

- Promote only mechanics repeated by the cross-composition experiments.
- Consolidate clearly duplicated low-level WebGL helpers if worthwhile.
- Document stable public APIs and compatibility constraints.
- Keep unique shot choreography inside compositions.

**Gate:** less duplication, clearer contracts, no notable loss of expressivity or visual fidelity.

### Phase 4: Performance and reproducibility

**Work:**

- Benchmark `screenPass` and `risoPass` serially on controlled inputs.
- Profile shader taps, CPU painting, texture upload, encoding separately where possible.
- Try the smallest optimization with measurable impact, likely an intermediate/separable blur for `screenPass`.
- Make one asset-independent smoke composition runnable outside personal machine-specific assumptions.

**Gate:** a documented, measured performance result; at least one genuinely portable smoke path.

### Phase 5: Agent-facing knowledge architecture

**Work:**

- Add the small `PROMOTE` step to teardown.
- Record metadata and a proof example for the existing strongest techniques.
- Give agents a concise discovery index of materials, sources, arrangements, motion grammars, and their compatibility.
- Add optional motion analysis to teardown once the underlying tooling is trustworthy.

**Gate:** an agent can discover and recombine existing techniques without reading every composition's implementation.

---

## 8. What to explicitly avoid during this refactor

- Do **not** add new styles, shaders, transitions, scene archetypes, or demo concepts to make the architecture look complete.
- Do **not** rewrite all existing compositions into a new declarative format.
- Do **not** replace GSAP or HyperFrames because an abstraction could theoretically be purer.
- Do **not** make the entire project renderer-agnostic. Keep conceptual components portable where cheap; don't build hypothetical backends.
- Do **not** combine all passes into a universal shader system.
- Do **not** build a GUI editor, node editor, asset manager, database, marketplace, or cloud renderer.
- Do **not** extract a helper merely because a single large composition looks untidy.
- Do **not** automatically promote every teardown observation into a reusable API.
- Do **not** spend a week optimizing a shader before establishing which costs dominate.
- Do **not** destroy past compositions, recorded experiments, or the lessons that explain why certain approaches were rejected.

**Bias: smallest change that fixes a confirmed problem or proves a missing capability.**

---

## 9. Open architectural questions for the review agent

Answer with source references and tradeoffs, not generic software-engineering platitudes.

1. Should the `MotionAesthetic` type split now, or will a narrower alias/`material` discriminant be enough?
2. What are the actual source buffer semantics across grayscale, RGB, alpha, and dual-ink work? Which adaptations are currently implicit?
3. Is `timeDriver()` sufficiently deterministic under out-of-order seeking, and can it support multiple active canvases safely?
4. Which parts of the large compositions appear more than once and deserve extraction? Which are rightly one-offs?
5. Where do `htmlPlate()` and DOM-based components fit cleanly into the source/passes model without losing browser-native layout?
6. What are the actual cost centers of `screenPass` at production resolution, and what fidelity is lost under a multi-pass blur?
7. How should Kino expose a catalog of successful techniques without introducing a registry service or a giant DSL?
8. Which tests can run reliably in CI on commodity Linux, and which require a pinned visual-rendering environment?
9. What is the minimum independent setup required for a new developer or agent to run a synthetic composition?
10. How should global taste principles be distinguished from look-specific artistic constraints?

---

## 10. Deliverables expected from the architectural review

**First, before modifying the project:**

- `ARCHITECTURE_AUDIT.md` or an equivalent report with confirmed findings, severity, exact file/function references, and reproduction evidence.
- A concise proposed patch series, ordered by dependency and rollback safety.
- Decisions on the `Source` / `Material` / `MotionGrammar` / `Look` boundary, with at least one concrete worked example and explicit non-goals.
- A short test plan and a baseline render list.

**Only after that review is accepted:**

- Small isolated commits with observable before/after differences.
- Tests for every corrected foundational bug.
- Updated documentation where contracts change.
- Existing reference compositions still rendering as intended.
- One or two cross-composition proofs, not ten new features.

### Definition of done for this refactor

Kino is ready for the next round of visual experiments when:

- [ ] The known `screenPass` grille bug is resolved and verified visually and numerically.
- [ ] Clock and core audio signals have deterministic and edge-case tests.
- [ ] The source/pass compatibility story is accurate, including color and two-ink exceptions.
- [ ] Material treatment and motion grammar are conceptually separated, whether or not every type has been split.
- [ ] At least two cross-composition experiments prove reuse with little glue.
- [ ] Renderer/tool failures are diagnosable and a synthetic smoke project is reproducible.
- [ ] A baseline set of visual regression references exists.
- [ ] Teardown can promote validated techniques to searchable, documented library knowledge.
- [ ] Existing artistic pieces are preserved, with no visually unjustified regressions.

---

## 11. Copy-paste kickoff prompt for Codex / Claude

> Read `KINO_ARCHITECTURE_REVIEW.md` fully, then read `CLAUDE.md`, `docs/architecture.md`, `docs/lessons.md`, `.claude/skills/teardown/SKILL.md`, and inspect the actual repository at HEAD. I want an architectural audit and a conservative refactor plan **before we build anything new**. Validate every claimed issue against the code; classify confirmed bugs, design gaps, and hypotheses separately. Pay particular attention to the `screenPass` GLSL variable-shadowing bug, frame-seeking determinism, source/pass contracts, the relationship among looks/materials/motion grammars, composability across experiments, rendering costs, and the teardown-to-library promotion workflow. Do not implement a sweeping refactor, don't add new aesthetics or effects, and don't discard working compositions. First produce an audit with file references, a small proposed patch sequence, tradeoffs, tests, and explicit things we should leave alone. Prefer making the existing system more reliable and more recombinable over making it more abstract. Ask for review before starting architectural changes.

---

## Closing thesis

**Kino's primary asset is not its catalog of looks. It's the combination of a composable rendering vocabulary and a repeatable way of acquiring new visual knowledge.**

The refactor should protect that idea: stabilize the frame clock and passes, establish honest source/material contracts, promote only proven reusable mechanics, preserve artistic freedom in compositions, and give agents a small reliable catalog of what Kino already knows how to do.

A better Kino should need *less new code* to make the next interesting video.

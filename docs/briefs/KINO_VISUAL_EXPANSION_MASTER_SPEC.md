# KINO: SIX NEW VISUAL OPERATIONS

**Implementation brief for Claude Code**  
**Priority:** 1. Digicam, 2. Shutter Drag, 3. Xerox, 4. Projection / Obscura, 5. Infrared Nocturne, 6. Transmitted Light  
**Repo:** `berker-z/kino`  
**Basis reviewed:** `main` through `61c5e53e783a` (2026-10-09). Re-read the working tree before starting.  
**Assignment:** **Implement all six, sequentially.** Each phase must produce exactly one substantial visual implementation test (a short, finished Kino composition), automated checks for its genuinely reusable parts, and a short verdict. Deliver them together in a browsable results page. Do not stop after writing a plan or after finishing Digicam. Do not ask for approval between phases unless a true blocker requires it.

## 0. The artistic thesis

The source of this whole project is a photograph of a white cat, lit by an aggressively direct flash, with red eyes, blown-out lavender-white fur, almost-black background, awkward close framing, and the unfriendly color response of a cheap consumer digital camera. It has a particular late-2000s dark-electronic-music mood: intimate, accidental, vulgar, uncanny. Think early Crystal Castles, HEALTH, witch-house-adjacent imagery, and hostile domestic flash photography. **The point is to recreate the *process* that makes an arbitrary image feel that way, rather than AI-generate more images that already look that way.**

The broader visual territory includes damaged reproduction, photographs behaving unnaturally, delayed light, ghostly infrared landscapes, optical projection, and images illuminated from within. Some references are evocative rather than technically literal. Our aim is an expressive motion-design toolkit, not a scientific imaging simulator.

Favor images that are compositionally compelling when paused. The treatment should be legible in motion, but motion should obey a discernible rule. Preserve a little brutality, imperfection, darkness, negative space, and patience. Avoid turning any of these into generic retro/glitch overlays.

**Six operations, six proof films, not six new application frameworks.**

## 1. Read Kino before changing anything

Required:

- `CLAUDE.md`
- `docs/architecture.md`, `docs/lessons.md`, `docs/arsenal.md`
- `.claude/skills/direct/SKILL.md` and `.claude/skills/teardown/SKILL.md`
- `docs/primitives/film-pass.md`, `docs/primitives/double-exposure.md`, `docs/primitives/temporal-scan.md`
- `src/runtime/time-driver.ts`, `src/index.ts`, `src/passes/gl.ts`, `src/passes/film-pass.ts`, `src/passes/screen-pass.ts`, `src/passes/dither-pass.ts`
- `src/arrange/double-exposure.ts`, `src/arrange/self-matte.ts`, `src/arrange/temporal-scan.ts`, `src/sources/plates.ts`
- `scripts/build.mjs`, `scripts/browser-test.mjs`, `scripts/smoke.sh`, `package.json`
- `compositions/xp-darkroom/`, `compositions/xp-darkroom-elevations/`, `compositions/xp-temporal-footage/`
- `examples/languages/index.html`, `examples/arsenal/index.html`

**Current architecture:**

```text
signals/time -> sources -> arrange/composite -> material pass -> rendered frame
                              |                     |
                     content, mask, motion      camera/material response
```

The API is bundled via esbuild into an IIFE exposed as `window.Kino`. Compositions are standalone HyperFrames projects with local `vendor/` and `assets/`. Time-dependent rendering happens through `timeDriver` because HyperFrames seeks GSAP timelines with callbacks suppressed. Every output must be independently computable at time `t`, in arbitrary request order.

Existing resources to reuse rather than replace: `filmPass` (WebGL2 post-processing), `doubleExposure` (separately masked composites), `plateKeys`/`thresholdWindow` (self-mattes), `temporalScan` (time-sampled strips), `htmlPlate` and `lineRise` (browser-set type), `sheetCamera` (patient camera movement). Follow current exported names and actual types, not just the proposed names in this brief.

**Do not make a new DSL, general node compositor, plugin registry, interactive editor, AI-dependent rendering service, or all-purpose camera engine.** The smallest reusable operation that produces a distinctive result wins.

## 2. Global implementation contract

### Boundaries

1. **Sources** create imagery: photographs, procedural scenes, pre-extracted video frames, browser-set text, or licensed/generated source plates. Source assets may be AI-created, but the algorithm must demonstrably transform *ordinary unrelated input*, not rely on an AI image already containing the target look.
2. **Arrangements** change the relation of images, masks, projection, and time. They should be usable before different material passes.
3. **Passes** change the photographic/material response of a single opaque RGB image. Keep mask generation and manually supplied subject data outside the pass unless there is a measured reason not to.
4. Masks may be alpha or luma, declared explicitly. Follow `doubleExposure`'s input and output contract. Final pass input/output remains opaque RGB unless you deliberately document a breaking change (don't).
5. The processing may be expressive, approximate, or unphysical. **Name what is simulated and what source geometry, spectral data, or depth information cannot be recovered from RGB alone.**

### Determinism

- No dependency on the *previous rendered frame*, no persistent decay buffer as the sole definition of history, no `Math.random()` during rendering, no `requestAnimationFrame`-based accumulation.
- Seeded noise must be a pure function of seed, pixel coordinates, sampled time/frame, and any explicitly supplied input. `t=5 -> t=1 -> t=5` produces identical pixels for each test fixture. Explicitly distinguish sensor-fixed noise (camera/pixel space) from source-fixed degradation (image/material space).
- A photo/footage source with temporal sampling must be frame-addressable offline (see `xp-temporal-footage`), optionally pre-extracted to local frames. Do not rely on unpredictable HTML `<video>` seek timing.
- Protect Canvas2D state (`save`/`restore`) around painter callbacks and reset scratch contexts. Guard dimensions, ranges, and invalid sampling counts.
- No runtime CDN/network fetches in compositions. Asset licenses/credits must be recorded.

### GPU, performance, and quality

- Render at **2560×1440**. Use 24/30 fps unless the particular scene needs 60; justify deviations. Performance numbers must specify the actual machine/backend and settings, never imply universal speed.
- For WebGL passes, prefer `src/passes/gl.ts` helpers, a single full-screen shader where feasible, cached uniform locations, reused textures/canvases, explicit errors. Avoid allocating new full-resolution canvases per frame. Do not duplicate the whole WebGL framework.
- Separate per-frame visual work from precomputation. Texture sampling is generally cheaper than per-frame CPU `getImageData`/`putImageData` at 1440p.
- Keep neutral/exact-bypass behavior clear. If a `strength: 0` passthrough exists, test it pixelwise and ensure it actually bypasses all distortion including noise, resampling, and color transforms. Some algorithms (e.g. image-space warps) may have explicitly declared tolerance for interpolation; document that.
- Avoid large, compression-hostile random high-frequency detail in motion unless absolutely necessary. Report render duration and delivered file size for each PoC.

### Taste constraints

From `docs/lessons.md` and `docs/arsenal.md`: no full-frame strobes or flashing inversions, no per-beat position kicks, no random speckle on empty black, no illegible dithered typography, no kitschy vaporwave/tunnel/hacker HUD, no slide decks with fashionable transitions. Reveals have a readable mechanism. One or two moves per piece plus a material are usually enough. Type should remain crisp when treatment destroys legibility, unless damaged type is the actual subject of the piece.

### One unified deliverable per phase

For **each** operation:

- Implement the minimum necessary library code and export only the genuinely used public primitive(s) through `src/index.ts` when appropriate. Anything bespoke stays in the composition until reuse is demonstrated.
- Create **one named 9–14 second proof film** in `compositions/xp-<name>/` (normal `index.html`, `scene.js`, HyperFrames files, assets). A/B comparison may live under `ab/ab.html`, **not** a second root composition file.
- Also show a **mechanical A/B in the results page**, with identical source/frame and raw vs processed images. This does **not** require a second whole movie. At least one raw/treated comparison must use a different kind of source from the hero film.
- Add focused node/browser tests for the primitive, where relevant, using `tests/languages.test.ts` patterns and the real `tests/browser/` runner.
- Write `docs/primitives/<name>.md` explaining visual mechanism, parameters, limitations, measured choices, performance, and why its defaults exist. Update `docs/architecture.md`, `docs/arsenal.md`, and `docs/lessons.md` as appropriate. Do not automatically create a `MotionAesthetic` for every technique; material looks can wait for a visual verdict.
- Add a summary card to a single `examples/expansion/index.html` page: source/treated stills, link to local video, palette/feel, what was genuinely reusable, what stayed composition-only, where it failed, tests, performance, and proposed promotion decision. Keep rendered videos in existing gitignored destinations, but commit a handful of well-chosen stills under `examples/expansion/stills/`.
- Inspect your own stills/video; revise **at least once** if something obvious is wrong. Make an honest critique, not promotional copy.

**The assignment is complete only after all six phase films exist and are reported.** If one proves technically impossible or fails visually, report the failure clearly, leave a reproducible test and continue with the others. Do not silently relabel a mockup a working PoC.

---

# PHASE 1: DIGICAM

**Priority: immediately.**  
**Working title:** *THE STAIRWELL*  
**Core operation:** `digicamPass` in `src/passes/`  
**Mood:** late-2000s consumer-camera snapshot, violent proximity, cheap digital coldness, an unsettlingly ordinary subject.  
**Not:** VHS, CRT, film print, analog halation, random glitch, or an effect achieved only because the source photograph already looks like flash photography.

## Desired image response

In descending importance:

1. Close subject appears violently illuminated, highlights running out of detail into cool/lavender white, with near-black surroundings.
2. Strong contrast between clipped/flash-white highlights and ambient cold blue/purple shadows; retain credible midtone color so it feels digital, not monochrome with a blue overlay.
3. Small sharp optical/sensor blemishes: localized harsh bloom, slight color fringe near bright edges, ugly sharpening halo or softness. **Not** `filmPass`'s red organic halation.
4. Faint shadow-biased luma/chroma noise and stable sensor irregularity. Distinguish per-sensor fixed-pattern noise from per-frame noise. Do not generate white static on true black.
5. Optional restrained block quantization/chroma smearing approximating early JPEG encoding. Add only if it objectively improves an A/B. No expensive JPEG re-encode of every frame.
6. Odd crop/angle and too-near viewpoint are **authored in the composition**, not pretended shader parameters.

## Technical scope

Follow `filmPass(container,timeline,{width,height,duration,fps,paint,...})` lifecycle and `timeDriver`. Implement a different photographic pipeline: exposure (with a defined linear/sRGB treatment), aggressive short shoulder/clip, shadow color response, bounded highlight bleed, sensor noise/fixed pattern, optional cheap compression artifact. The exact order should be documented and verified visually.

Illustrative API, **not a mandatory parameter list**:

```ts
Kino.digicamPass(stage, timeline, {
  width: 2560, height: 1440, duration: 12, fps: 24,
  paint: (ctx, t, frame) => scene(ctx, t),
  strength: 1,
  exposureEV: 0.75,
  whiteClip: 0.9,
  blackCrush: 0.35,
  shadowBlue: 0.3,
  highlightBleed: 0.12,
  sensorNoise: 0.04,
  seed: 17,
  tune: (t) => ({}),
});
```

Suggested values are tuning candidates, **not preapproved defaults**. Simplify where visual trials show controls overlap. Avoid a mega-shader with 25 underexplained knobs.

A flattened RGB image carries no depth, surface normal, or scene occlusion, so a pass **cannot reconstruct actual direct-flash lighting or cast shadows**. If you need to foreground-isolate the subject, use explicit source/arrangement mattes (perhaps the existing self-matte helpers), then process the scene. Don't create a universal relighter in this phase.

**Red-eye / eyeshine** is separate, optional, annotation-driven compositing. Never infer coordinates from arbitrary RGB and never make glowing red pupils a requirement for this aesthetic. If a convincing need arises, a tiny composition-local overlay of eyes at explicitly supplied positions is preferable to building computer vision.

## Required implementation film: *THE STAIRWELL* (12 s)

An off-axis snapshot of a mundane object at close range in a dim domestic stairwell/corridor. Pick a white ceramic object, chair, or unsettling ordinary household subject. The flash-lit foreground should look almost pasted over a blue-black background. A picture you might discover on a forgotten SD card.

**Shot grammar:** 0–3 s: ordinary composition revealed already lit, off-centre and slightly too close. 3–8 s: slow barely perceptible push and slight spatial drift, foreground stays harshly clipped while background almost disappears. 8–12 s: framing becomes stranger as a doorway or rail enters the edge; end on an uncomfortable crop. Little or no text. **No screen-sized flash pulse.**

Use a photo **that is not already a perfect example** of flash photography, plus a differently lit source or a procedural object for validation. Licensed plates stored locally with attribution. The user-supplied cat picture is the *reference signature*, not the implementation plate.

**Required mechanical proof:** at a single matching timestamp show 3 different inputs: (a) brightly lit ordinary interior, (b) neutral everyday object or animal, (c) procedural RGB geometry; each **raw / digicam / filmPass**. Demonstrate same `digicamPass` settings work across at least two inputs, and explain where source-lighting limitations hurt the third.

**Tests:** `strength:0` raw equality, high/low exposure bounds, saturated color remains recognizably color, shadow noise bounded/seeded, no white sparkle on pure black, same-frame return after out-of-order seeks, different seed changes only intended artifacts, reasonable contrast on different RGB test patterns, end-to-end SwiftShader rendering.

**Done when:** The A/B reads as hostile, cheap digital capture, not generic blue-film grading. If it only looks like flash because the source already contains flash lighting, the proof failed.

---

# PHASE 2: SHUTTER DRAG

**Working title:** *AFTERIMAGE*  
**Core operation:** deterministic `shutterIntegrate` / `exposureSamples` in `src/arrange/` (choose one concise name).  
**Mood:** a flash-frozen object with movement stretched into trails. Nightclub, tunnel, abandoned platform, nocturnal footsteps. Intimate but haunted.

## Mechanism

A shutter interval has finite duration. Most of the image accumulates light over the interval, while a sharp final flash contribution freezes a subject at one chosen time. The trails and sharp image are **two components of one exposed frame**, not motion blur faked by adding one smeared copy.

For output time `t`, sample a deterministic source at times `t - exposureDuration * u_i`, with positive normalized weights `w_i`, **plus an independent flash sample at a specified instant** (e.g. `t` or `t - phase*duration`). The integration can use temporal-scan's source-time idiom, but `temporalScan`'s strips are *not* correct for this; sample the entire source or defined moving luminous layers. Average/integrate appropriate intensity, avoiding a stack of opaque draws that just replaces earlier samples. A useful architecture may be a scratch canvas accumulator at reduced scale, plus a sharp RGB layer blended over it. Make the strategy visually and computationally explicit. Limit clipping so the trails remain legible.

API sketch:

```ts
const expose = Kino.shutterIntegrate({
  width, height,
  source: (ctx, sourceTime) => movingScene(ctx, sourceTime),
  duration: 0.75,
  samples: 12,             // configurable bounded quality
  flashAt: "end",         // or phase: 0..1
  flashWeight: 0.6,
  // optional trail weighting curve / mode
});
// expose(ctx, t); optionally feed its result through digicamPass or filmPass
```

This is an **arrangement**, so the same exposure can pass through Digicam, Film, or no material. Avoid permanent caches that depend on render order. The method must remain correct for non-uniform and reverse seeks. If a heavy photo/footage scene makes sample cost unacceptable, report that and show a cheaper procedural or offline-frame approach instead of hiding the cost.

## Required implementation film: *AFTERIMAGE* (10–12 s)

An empty dark passage with one clear moving subject: perhaps a swinging lamp, dancer-like silhouette, a person walking past a doorway (licensed footage or image sequence), or a metallic object moving through a narrow pool of light. Use a strong subject whose path is visible in one frame. The retained current instant is pin-sharp; the previous movement lives behind it in pale ghost trails. Use the Phase 1 `digicamPass` on the final picture, if appropriate.

**Sequence:** 0–2 s: ordinary clean single exposure. 2–6 s: shutter window steadily lengthens; ghost images trace a readable path. 6–9 s: sharp frozen position and trailing history coexist; no temporal jumping. 9–12 s: exposure interval shortens; the history collapses back onto the present. Film must feel like a single continuous phenomenon, never like repetitive fade transitions.

**Required mechanical proof:** one frame with raw current position / integrated trails only / combined shutter + sharp flash / same combined exposure through `filmPass` instead of Digicam. The sharp subject and blur must be visibly separable.

**Tests:** zero exposure equals direct source (or specifically documented identical-flash behavior), normalized weights and interval endpoints, no accumulation between repeated renders, arbitrary seek order, fixed source time independent of frame request order, sample-count quality/performance curve, alpha/compositing behavior and no brightening/clipping with duplicate identical samples.

**Done when:** a moving subject leaves genuine readable time trails while the present remains sharp. This is not temporal slit-scan, motion streak particle effects, or a radial blur filter.

---

# PHASE 3: XEROX

**Working title:** *THE TESTAMENT*  
**Core operation:** `xeroxPass` for material degradation; optionally a small, independently reusable `copyGeneration` transform if the experiment establishes a need.  
**Mood:** photocopied underground ephemera, photocopied manifestos, copied evidence, degradation through repeated reproduction. Abrasive but legible.

## Mechanism

Simulate the logic of a photocopier: source -> harsh tonal transfer -> toner/edge texture -> scan-direction artifacts -> copied generation. This should feel unlike `risoPass` (two inks, registration) and unlike `ditherPass` (ordered pixel thresholds).

Prioritize:

- A hard black/white or limited-gray response with controllable threshold and local contrast.
- **Toner pickup/dropout following the source's printed regions and edges**, not independently sprinkled in empty space.
- Spatial imperfections fixed to the *copied sheet*, not new random holes every rendered frame.
- One dominant scan direction. Subtle smear/streak/banding as a consequence of reproduction rather than ornamental scratches.
- **Generational loss**: with generation number `0...N`, thin details break up, contrast collapses, edges thicken/shred, small letters become degraded while large forms persist. Image deterioration should have a discernible trajectory and bounded behavior; don't simply increase noise amplitude.
- Print black and paper-white should remain controlled and readable. Avoid gratuitous fake paper stains unless the plate calls for them.

Implementation decision: a GPU pass for arbitrary moving RGB input may be appropriate; for stationary document/source plates, **precompute a deterministic per-generation image once** and then move the plate as a composition. Do not GPU-readback/CPU-process full 1440p frames every time if there is no payoff.

Illustrative API:

```ts
Kino.xeroxPass(stage, tl, {
  width, height, duration, fps,
  paint: (ctx, t) => scene(ctx, t),
  generation: 3,
  threshold: 0.52,
  tonerLoss: 0.15,
  streak: 0.06,
  seed: 12,
  tune: (t) => ({ generation: generationAt(t) }),
});
```

**Do not force the above if a `copyGeneration(sourceCanvas, n, seed)` precompute primitive is more correct, more efficient, and more composable.** The crucial API is a deterministic *meaningful* reproduction generation, not the fact that it ends in `Pass`.

## Required implementation film: *THE TESTAMENT* (10–12 s)

An austere xeroxed page of a found technical drawing, photographic evidence, or bold manifesto-like statement. The page seems to be fed repeatedly through a copier while the camera travels across it. Details fall away through successive copies; a dark photographic patch converts to dirty toner, while the typography remains legible until late in the progression.

**Sequence:** 0–3 s: generation 0, recognizable photographic/detail source with high-contrast print. 3–7 s: first couple of generations, thin edges and letter counters change visibly as the camera tracks along the sheet. 7–10 s: late generation is nearly graphic abstraction, but preserves source structure. Last seconds hold with continuous camera travel. **No slideshow of six separate page layouts**: the deterioration itself is the evolving event.

**Required mechanical proof:** raw image / gen 1 / gen 3 / gen 6 at identical crop and size, plus one architecture or portrait-free photo to show it handles something other than type. Compare Xerox against existing dither/riso with a single neutral source.

**Tests:** seed reproducibility, no moving random dirt on static source when it travels, zero-generation passthrough (if defined), monotonic/qualitatively measurable loss of fine detail across generations without blanking whole pages, non-overflow of parameter bounds, pixel coherence under camera movement, arbitrary seek determinism.

**Done when:** the viewer sees *a copy of a copy of a copy* and can still recognize the content. It should be difficult to confuse with halftone, grain, or riso misregistration.

---

# PHASE 4: PROJECTION / OBSCURA

**Working title:** *SANCTUARY*  
**Core operation:** `surfaceProject` in `src/arrange/` and a small homography/quad-warp helper **if** required.  
**Mood:** moving images occupying a physical room, projected memories on architecture, luminous image entering matter. Cinematic and restrained.

## Mechanism

Take a moving/procedural RGB image and **project it onto a user-defined surface**. Light from the projection interacts with a base image: shadowed/bright wall regions modulate visibility, source texture remains legible, and geometric projection follows a known quad. Optional occlusion masks determine where the projection must disappear behind foreground objects. This is *compositing and geometry*, not a generic vignette/overlay filter.

Minimum physically legible ingredients:

1. User specifies four corners of a **planar receiving quadrilateral** in output pixels. Calculate an invertible mapping from screen pixel to projector content UV. If degenerate, fail clearly instead of producing NaNs.
2. Sample projected image in UV, clamp/project appropriately and mask off outside the quad.
3. Preserve wall texture using luminance-based diffuse modulation; projected black is **absence of added light**, not black paint covering the wall. Approximate additive projection in a documented sRGB/linear model.
4. Optional author-supplied occlusion mask makes architectural structure interrupt the beam. Match its transform to the wall.
5. Optional low-level lens softness and spill may belong in composition or a small light helper. Don't add fake volumetric beams unless source has geometry that makes them plausible.
6. No automatic surface reconstruction or deep-learning depth estimation. Sculptures and non-planar surfaces need additional displacement/UV/depth data and belong to a later experiment.

API sketch:

```ts
const project = Kino.surfaceProject({
  width, height,
  surface: (ctx, t) => wall(ctx, t),
  image: (ctx, t) => filmOnProjector(ctx, t),
  quad: [topLeft, topRight, bottomRight, bottomLeft],
  intensity: 0.8,
  occlusion: optionalExplicitMask,
  // map corners, retain texture, black emits no light
});
// project(ctx, t)
```

Start with constant planar geometry and allow parameterized quad movement only when actually used. Place any source material pass **after** this composition if desired; don't bake photochemical processing into a projective geometry API.

## Required implementation film: *SANCTUARY* (12 s)

An empty concrete interior or churchlike stone corridor. An image (slow-moving water, nocturnal trees, fragmented architecture, or a measured geometric pattern) is projected onto a wall **in unmistakable perspective**, spanning irregularly textured stone. As the projection image moves, the underlying physical room remains fixed. A pillar or doorframe interrupts the image with an explicit occlusion matte. No people or obligatory religious symbols needed.

**Sequence:** 0–3 s: room and wall with weak light. 3–8 s: projected content gradually illuminates the surface and begins moving slowly, respecting the quad and wall texture. 8–11 s: the camera subtly changes framing or the projected image traverses the wall; foreground architecture continues to occlude the light. 11–12 s: hold on a luminous, unsettling still.

**Required mechanical proof:** show the same projected graphic raw / planar rectangular placement / actual perspective-mapped illuminated wall. Add an occlusion on/off pair at identical times. Then use the same projector with a second very different content source (still proof is sufficient).

**Tests:** four-corner mapping/UV correctness with a numbered grid; black projector input leaves surface unchanged (within a declared pixel tolerance); intensity 0 equals raw surface; quad outside pixels unchanged; occlusion actually removes projected light; repeat arbitrary seeks; singular/degenerate quads fail safely; GPU memory use and performance.

**Done when:** it genuinely looks like **light projected onto an existing physical surface**. A rectangular semi-transparent overlay does not pass.

---

# PHASE 5: INFRARED NOCTURNE

**Working title:** *WHITE ORCHARD*  
**Core operation:** `infraredPass` in `src/passes/`; optional **explicit** vegetation/sky masks in an arrangement or source-preparation helper only if the result needs them.  
**Mood:** luminous white vegetation, deep black skies, spectral daylight, landscapes that look like a dream's photographic negative. Serious, quiet, uncanny.

## Honest limitation

Real near-infrared imagery measures wavelengths ordinary RGB cameras filter out. **A shader cannot infer real NIR reflectance from visible RGB.** In particular, white foliage vs black skies cannot be guaranteed for arbitrary input. This is an *art-directed false-infrared approximation*, optionally improved by supplied region masks, not “converting RGB to IR.” Do not falsely represent it as a physical spectrum capture.

## Mechanism

- A coherent tonal transform with bright organic/leaf-like surfaces and dark sky/nonliving regions where source data permits.
- Preserve fine botanical detail in the bright range rather than simply inverting luma.
- Offer a default monochromatic option (white/silver leaves, near-black sky) and, only if useful, a controlled false-color variant. **No default green military night vision and no green phosphor reticle.**
- For photos containing unmistakable foliage and sky, test carefully constrained RGB hue/luma proxies; if brittle, prefer **author-supplied semantic mattes** prepared once per plate. The pass should still offer a well-defined global tonal response to arbitrary RGB without claiming semantic accuracy.
- Small highlight softness can be warranted; avoid noise, scanlines, or bloom becoming the whole effect.
- Keep masks and mattes explicitly documented and spatially aligned during camera movement, as in `plateKeys`.

API sketch:

```ts
Kino.infraredPass(stage, tl, {
  width, height, duration, fps,
  paint: (ctx, t) => scene(ctx, t),
  mode: "monochrome",
  skyDarkening: 0.7,
  foliageLift: 0.65,
  contrast: 0.45,
  strength: 1,
  // optional authored mask support belongs to a separate preparation step
});
```

These names are illustrative. If a parameter needs semantic masks, don't pretend it works on all raw RGB inputs. Prefer separate plain `infraredPass` response and an optional preprocessed `infraredPlate` or matte helper.

## Required implementation film: *WHITE ORCHARD* (10–12 s)

A grove or tree-lined architectural approach where foliage is pearly white against an almost-black sky, with stone and branches retaining their own shape. The camera makes a patient lateral drift, and distant leaves slowly move. The effect is uncanny even without any text. It must contain enough actual tonal geometry to test the look rather than just a pre-generated infrared photo.

**Sequence:** 0–3 s: recognizable ordinary natural plate through a split raw/treated comparison or natural opening. 3–7 s: the ghostly false-IR tonal response emerges as the camera drifts. 7–12 s: hold the strange, luminous landscape, with motion in branches or camera. No green thermal UI.

**Required mechanical proof:** the same ordinary daylight foliage/sky photograph shown raw / global pass alone / pass with explicit semantic mattes, plus a non-vegetation source raw/treated. If the raw global pass fails on a scene, say so explicitly and show what the masks contribute.

**Tests:** neutral bypass, finite bounded output, static source under arbitrary seeks, mask edge alignment and feathering, no flat-white foliage that destroys all leaves, reasonable tones on grayscale and saturated RGB, graceful no-masks behavior, performance. Include a source limitation note in the doc and Arsenal.

**Done when:** a genuinely ordinary photograph becomes an uncanny spectral landscape, while the output is still photographic and the limitations are not hidden.

---

# PHASE 6: TRANSMITTED LIGHT

**Working title:** *RELIQUARY*  
**Core operation:** `transmitLight` / `transmissionComposite` in `src/arrange/`, with a small supporting shader/helper only if it materially improves the result.  
**Mood:** glass negatives, illuminated photographic plates, X-ray-like densities, stained glass, light passing *through* a material. Austere, numinous, slightly anatomical.

## Mechanism

A transmissive image is defined by its **optical density / transmittance**, a source of backlight, and the surrounding dark environment. Work from an author-supplied density map (grayscale or RGB), an optional color-tint / spectral absorption map, and a light source. A basic model may be `T = exp(-k * density)`, `outgoing = backlight * T` in a documented linear-intensity approximation, followed by display conversion. Varying backlight intensity/color changes **what shines through** the plate. The darkest regions attenuate light; clear regions pass light. Source content remains recognizably tied to the density plate.

- No claim that an ordinary photo is a medically accurate X-ray. X-ray densities are only a visual metaphor unless physically measured.
- Clarify semantics: `density 0` transmits fully, high density blocks more; black/white negative plates may need explicit inversion. Avoid unlabelled opposite conventions.
- For stained glass, allow multiple RGB transmittance channels or a color map and optional opaque leading network. Light must respect opaque lines instead of painting over them.
- Small localized glow/spill *after* transmission can communicate luminous edges; reuse an existing treatment if possible and preserve black frames.
- If an offscreen light changes position, prove that illumination responds in image space. Don't make a massive renderer for caustics, spectral physics, or scattering.

API sketch:

```ts
const transmit = Kino.transmissionComposite({
  width, height,
  density: (ctx, t) => densityPlate(ctx, t), // black = transparent, white = dense, explicitly documented
  backlight: (ctx, t) => lightField(ctx, t),
  color: optionalTintPlate,                  // omit for monochrome glass negative
  opacity: 1,
  extinction: 2.5,
});
// transmit(ctx, t)
```

Define the API's intermediate representations carefully. Do not pass CSS alpha through a material pass by accident; the composite result should be opaque RGB. Keep `extinction`, illumination and density distinction mathematically meaningful.

## Required implementation film: *RELIQUARY* (12 s)

A dark architectural interior with one photographic glass plate or stained-glass-like surface. A narrow backlight slowly moves behind the plate; a human-made image or geometric motif appears only where the light passes through. Dense regions remain dark. The surrounding room stays in darkness. A simple slow camera push and subtle change in backlight can carry the entire shot.

**Sequence:** 0–3 s: mostly dark, plate barely visible. 3–7 s: the moving light reveals contours and color through transmission; dense lines refuse illumination. 7–10 s: the entire motif briefly becomes readable, still restrained. 10–12 s: light drifts away, revealing the visual logic in reverse. No theatrical full-screen flash.

**Required mechanical proof:** the same density plate with two different backlight fields, plus a side-by-side comparison against naive `screen` blending to demonstrate why transmission is its own operation. Also use a plain photographic negative instead of decorative stained glass in a still A/B, proving interchangeability.

**Tests:** zero extinction means full transmission, increasing density decreases output for constant backlight, zero backlight produces zero transmitted light, channel-specific color behavior if supported, output finite/opaque, mask alignment, repeat arbitrary seeks, parameter bounds, performance.

**Done when:** the image appears **backlit through matter**. If the viewer could describe it as “a photo with a glow filter,” the implementation test has not passed.

---

## 3. Required integration with the Arsenal

The new `docs/arsenal.md` is Kino's **living inventory of visual moves**. Its UI, `examples/arsenal/index.html`, parses the Markdown structure directly, and the `direct` skill uses the text to suggest combinations. Preserve that design.

Every promoted entry must follow the existing syntax precisely:

```md
**Digital flash** (`digicamPass`)
- what: ...
- feels: ...
- needs: ...
- pairs: ...
- avoid: ...
- seen: xp-digicam-stairwell
- still: examples/expansion/stills/digicam-stairwell-06.00s.jpg
```

Do the same for Shutter Drag, Xerox, Projection, Infrared Nocturne, and Transmitted Light **after** confirming what was actually built. Place each under the correct category: Materials for image-response passes; Exposure/Time or Camera/Arrangement for cross-material operations. Never file Projection as a photographic material just because it uses a shader. If a primitive remained provisional, label it as such. Update the new evidence and verdicts honestly.

`examples/arsenal/index.html` currently depends on Google Fonts for its gallery UI; optionally switch to locally bundled fonts if easy. **Do not let an unrelated gallery restyle delay these six experiments.** Validate all referenced `still` paths exist and that the parser still renders. The available `direct` skill should be capable of recommending these moves once documented; don't needlessly rewrite the skill.

## 4. Testing and reproduction checklist

Run for each applicable phase (with notes about failures):

```bash
npm run typecheck
npm test
npm run build
npm run test:browser
scripts/smoke.sh
# then, inside each composition directory:
env -u WAYLAND_DISPLAY hyperframes check
env -u WAYLAND_DISPLAY hyperframes snapshot --at 1,5,9 --output /tmp/kino-<phase>-snapshots/
env -u WAYLAND_DISPLAY hyperframes render --quality delivery \
  --output ../../examples/<phase>/<film>.mp4
```

These are **working-loop examples**, not exact universal paths or timestamps: use valid time ranges for each composition and inspect the current CLI syntax before running. Per repository instructions, `hyperframes snapshot` may segfault *after* writing its PNGs. Verify images actually exist; do not assume a normal exit is necessary. Browser tests require `npm run build` first and no Wayland Chrome problems. Never run expensive 1440p WebGL renders in a parallel pile without checking memory/time cost.

For each new operation, the automated browser test must capture or inspect enough pixels to distinguish **substantive correct output** from a black frame or a no-op. Unit tests are for pure geometry/timing/weights, browser tests for pixels/canvas/WebGL. Use synthetic assets in tracked tests so others can reproduce them without private/licensed plate assets. Add a compact visual reference frame or image assertion where practical, but avoid brittle whole-frame tests across graphics drivers unless tolerance and backend are documented.

**Licensing:** Source plates may come from Wikimedia Commons or other appropriately licensed sources, or may be AI-generated as ordinary neutral *content*. The generator must not provide the desired final aesthetic as a shortcut. Keep author, URL, and license in `assets/CREDITS.txt`. If no suitable photographic plate is legally available, use a procedural source and report the limitation. Don't substitute a prohibited or known-disliked portrait. Don't re-use the white cat picture as test material unless explicitly supplied and licensed for that use.

**User-visible work:** create a browsable `examples/expansion/index.html` with six sections and clickable A/B stills; no runtime internet required. Put videos alongside it or link to existing local render destinations. A dedicated `README` or `/docs` entry may link to the report. Show one representative still per experiment in Arsenal and a selection of detailed comparisons in expansion. Since prior chat images sometimes failed to load, the local HTML report and explicit file locations are the source of truth.

## 5. Sequence, commits, and completion rules

### Execute in this exact order

1. **Digicam**: build the RGB camera-response pass, validate on mixed sources, make *THE STAIRWELL*, test, document, and commit.
2. **Shutter Drag**: build stateless temporal exposure accumulation, reuse Digicam on *AFTERIMAGE*, test, document, and commit.
3. **Xerox**: build reproduction degradation, make *THE TESTAMENT*, test, document, and commit.
4. **Projection**: build quad-mapped light projection, make *SANCTUARY*, test, document, and commit.
5. **Infrared**: build clearly bounded artistic false-infrared treatment, make *WHITE ORCHARD*, test, document, and commit.
6. **Transmitted Light**: build density-and-backlight compositing, make *RELIQUARY*, test, document, and commit.
7. Finish `examples/expansion/index.html`, verify Arsenal stills and paths, run the full available checks, and produce a final written comparative critique. Commit the final report and documentation. Push only according to the current repo user's workflow and instructions.

User specifically requested all six implementations. **Do not stop after phase 1 to solicit further creative directions.** Use reasonable artistic choices, state assumptions and proceed. If assets are missing and block one phase, log the blocker clearly, switch to a reliable alternate input, and keep moving. If a complex optional improvement (e.g. semantic segmentation, advanced projection geometry) jeopardizes completion, omit it with a stated reason instead of derailing the whole series.

### End-of-run report (mandatory)

Create/update `research/visual-expansion-report.md` or put an equivalent written summary in `examples/expansion/`, answering for **each**:

| Phase | Composition | New operation | Reused existing primitives | Runtime | Automated checks | A/B result | Keep / provisional / reject |
|---|---|---|---|---|---|---|---|
| Digicam | THE STAIRWELL | ... | ... | ... | ... | ... | ... |
| Shutter Drag | AFTERIMAGE | ... | ... | ... | ... | ... | ... |
| Xerox | THE TESTAMENT | ... | ... | ... | ... | ... | ... |
| Projection | SANCTUARY | ... | ... | ... | ... | ... | ... |
| Infrared | WHITE ORCHARD | ... | ... | ... | ... | ... | ... |
| Transmission | RELIQUARY | ... | ... | ... | ... | ... | ... |

Compare their originality, transferability to different input sources, complexity, render cost, and value to the Arsenal. Flag what is bespoke composition work vs reusable code. State what you **actually inspected visually** and what you only tested mechanically.

Recommend the **one or two best techniques to refine next**, and identify the one you would drop if Kino needed to remain small. Don't overpraise everything. The user's verdict on the visual results ultimately determines promotion and defaults.

## 6. Rules of engagement

- Make the six short films **actual watchable deliverables**, not mere shader playground snapshots, test HTMLs, or written concepts.
- No automatic image generation as substitute for the processing method. AI-generated source material is allowed but raw/treated unrelated inputs must prove the technique.
- Don't change unrelated legacy looks, their defaults, or their existing tests to accommodate the new ones. Don't break existing compositions.
- Respect Kino's existing no-deletion-in-session rule: write cleanup candidates to `cleanup.txt` and perform one deliberate cleanup pass at the end. Never issue `rm` during the session.
- Do not claim scientific accuracy for false infrared, simulated flash relighting, X-ray-like plates, surface projection on unknown 3D geometry, or analog copier chemistry.
- Prefer a physically intelligible *cause* over random pixels and stylistic noise.
- Keep prose and commit messages plain, specific, and readable. No em dashes. No AI credit or assistant meta-commentary in project artifacts.

**Begin with Digicam now. Implement it, make the first film, and proceed through the remaining five. The final deliverable is six real demonstrations, a trustworthy Arsenal update, and a comparative gallery that lets the user decide what Kino should keep.**

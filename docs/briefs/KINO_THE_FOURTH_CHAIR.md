# THE FOURTH CHAIR
## A 45-second short film for Kino

**Status:** Director's treatment + executable production brief for Codex  
**Target:** `compositions/the-fourth-chair/`  
**Duration:** exactly 45.000 s, 24 fps (1080 frames), 2560 × 1440, 16:9  
**Music:** Nine Inch Nails, **"A Warm Place"**, *The Downward Spiral* (1994). A 45-second passage from a locally supplied copy; see Audio.  
**No dialogue, narration, subtitles, title cards, HUD, or explanatory copy.**  
**Working title only:** the name need not appear on screen.

---

## 1. Why this film

A photograph is an arrangement of light around people and things that may no longer be there. A projector ought to be capable only of repeating that light. For forty-five seconds, it isn't.

A cheap point-and-shoot photograph of a family dinner shows three people at the table and a fourth chair, empty. The photograph is being projected onto limestone in an abandoned chapel. As we draw away from the image, the empty chair begins to cast a shadow *outside the projected frame*, down the wall and across the floor. We follow it. When the projector is switched off, the chair is standing on the chapel floor.

The film should not explain the discrepancy. This is an observation of a very small miracle, not a ghost reveal. Its emotional register is sadness with a residue of wonder. The chair is an absence that acquires weight.

**Tone:** The Leftovers' absence, the unease of an old found photograph, religious architecture as physical matter rather than gothic decoration. Patient and continuous. No jump scare.

**Arsenal axes:** patient → a little restless → still; cool photographic blue-white → pale amber limestone; photographic surface; mournful / uncanny.

## 2. Directing decision: one trick, done properly

The film is built on **one continuously moving camera and one impossible spatial event**. This is NOT a montage of Kino effects.

Use the arsenal as follows:

| Role | Move | Why |
|---|---|---|
| Main medium | `filmPass` | One unified material for the chapel. Subtle warm halation and tactile shadow detail, not heavy default film grain. |
| Main physical operation | `surfaceProject` | Project the photograph as additive light onto stone using an authored four-corner quad, the undimmed wall as albedo, and controlled falloff. The projector image must visibly belong to the masonry. |
| Source look | `digicamPass` or an equivalent pre-rendered still using it | The dinner photograph is a *diegetic object* with a different photographic provenance: violently direct onboard flash, cool lavender clipping, deep blue-black shadows, slightly awkward crop, mild red-eye. This is not a second full-film look. |
| Movement | Camera transform as a pure function of time, patterned on `xp-projection` / `sheetCamera` | A long pullback becomes a low tilt/travel that follows the shadow. No slideshow edits or instant kicks. |
| One-off composition effect | Authored chair silhouette / shadow projection outside the projector quad | This is the impossible event; keep it in the composition. Do NOT introduce a general-purpose library primitive unless an existing helper makes it trivial. |
| Final reveal | Subject matte + motivated illumination | The physical chair is in darkness before we see it; illumination exposes it as the projection fails. Avoid a cheesy morph, dissolve, or visible object popping into the scene. |

**Do not add** infrared, photocopy, shutter drag, stained glass, animated typography, or any other technique just to show the arsenal off. In particular, `shutterIntegrate` would make a very expensive render for a story that gains nothing from motion trails. The important light is the projector, not a gratuitous lens flare.

## 3. The film, second by second

### 00:00–00:05 | The photograph

We begin extremely close, close enough that we mistake the projected picture for the world itself. An ugly 2007 digital snapshot: three family members eating dinner around a small table in an ordinary, slightly tired apartment. A *fourth chair* is pulled a little way away from the table. The framing isn't elegant. One face is cut near the top edge; flash catches the back wall and ruins the whites. Tiny pupils are pink-red. The fourth chair, near the lower right, has a distinctive chipped spindle / nick on its front right leg.

At first, no one in the photograph moves. The **camera** moves, very slowly and inexorably *backwards*. This is essential: don't animate AI people to fake realism. The world is a still image because it is an actual still photograph.

Low projector motor noise under the first soft synth notes. No camera-flash pulse. The exposure is already there when the film begins.

### 00:05–00:12 | The room around it

The continuing pullback reveals the image's outer edges, skewed in perspective and projected onto the rough side wall of a deserted small chapel. Pale limestone courses run through the lit faces. Mortar joints swallow highlights. The room beyond is very dark: aisle, worn floor slabs, a low altar far back, no candles, no visible projector operator.

The lens drifts just far enough to reveal that the family photograph is *light on stone*. The photograph doesn't slide around the frame independently. Its homography follows the wall as the camera moves. The projector's color is soft near-amber; the snapshot itself keeps its chilly color.

### 00:12–00:20 | Where the eye goes

Without a cut, the camera changes from pulling straight back to a subtle sideways drift and downward tilt. The empty chair in the projected photograph is now the visual center. The three human faces lie farther toward the picture's edge. Resist highlighting the chair with a ring, zoom snap, vignette burst, or graphic callout.

The projector's ambient luminance increases barely enough for the chair's outline to read. The rhythm is the music breathing, not beat-synced kicks. The room remains still except for the camera.

At roughly 00:18 a dark shape corresponding to the empty chair's silhouette starts to reach *beyond the bottom edge of the projected rectangle*. It is ambiguous for a couple of seconds. It could be a mundane cast shadow.

### 00:20–00:30 | The violation

The chair's shadow extends down the masonry, crosses the corner where wall meets floor, then runs across stone slabs. At the wall/floor boundary the shadow changes plane correctly: first projected obliquely on the wall, then foreshortened on the floor. The projector's bright rectangle does **not** extend. That contradiction is the entire scene.

The camera tilts to follow it. Its movement is physically motivated and *continuous*: no hard cut to a new angle, no panel layouts, no effect overlays. The shadow's edges are slightly soft but clearly shaped like the distinctive fourth chair, down to the missing / damaged spindle. It stretches farther than a chair in a photograph could possibly cast it.

A very faint abrasion/scraping sound begins. Understated, almost mistaken for the projector's mechanism. Don't hit a horror sting.

### 00:30–00:38 | At the end of the shadow

The shadow reaches a part of the nave that has been dark since the opening. As the camera follows, a thin stripe of existing ambient light gradually travels over what appears to be an ordinary wooden chair. Same back, same damaged spindle, same orientation as the dinner photograph.

**Important:** we never watch the chair teleport or fade into existence. The camera finds an object we couldn't see. The impossible question is whether it was there all along. Use a physically plausible shadow and authored light falloff, not a magic dissolve or morphed AI image.

The film's camera nearly stops now, at a respectful distance. The shadow and object align for a second. The chapel is silent apart from music and projector hum.

### 00:38–00:45 | Remains

The projector loses power in one slow, smooth decline (not a flash or a strobe). The wall photograph disappears. The chair's impossible shadow disappears with it. But the chair remains, lit by just enough cold ambient light from a high window to identify its outline.

The camera continues a nearly imperceptible forward creep, then holds. At 00:43–00:45 let the image darken toward black, **not before the audience has had time to notice the chair remains**. One restrained motor click as the projector stops; the music goes with the image, on a short shaped fade. End without on-screen words.

End frame should be quiet enough to be mistaken for a painting of an ordinary abandoned room.

## 4. Music and sound

Use the *album version* of **Nine Inch Nails, "A Warm Place"** (track 10 on *The Downward Spiral*). It has the patient, weightless emotional pressure this needs: the source photo is ugly and domestic while the score treats its consequence as sacred. That contrast is why the track matters.

The source recording is ~3:23. Use an uninterrupted **45-second** excerpt, ideally one containing a gentle melodic/sustained rise. **Audition before committing the in-point**; a candidate is approximately 00:35–01:20, but choose the strongest contiguous passage based on the actual local track and don't pretend the bar/phrase positions are known beforehand. The image timeline is locked to 45 s; fine-tune animation within a second or two to its phrase changes. Avoid drum-hit editing; this score isn't for that.

Add only three diegetic audio elements: a barely perceptible projector running throughout; soft floor/chair abrasion around 00:26–00:33; a single projector motor stop near 00:42. No speech, no sampled prayer, no generic horror drone.

**Asset/rights policy:** Do not download or commit the copyrighted song automatically. Expect a user-provided local audio file under `audio/` or `compositions/the-fourth-chair/assets/`, both untracked. If missing, still build and render a visually complete silent workprint and give precise instructions for supplying the audio. A public release with the NIN recording would require music clearance.

## 5. Image assets: instructions for Codex

Use an image generator available to Codex (or a connected image service) to make the source **plates**, then use masks, lighting, and camera math in Kino to make a film. **Do not rely on generated video** to simulate a 45-second continuous camera move. A few highly controlled photographs will give a better result and maintain object continuity.

Generate at maximum available resolution. No watermarks, legible brand names, UI text, dates, subtitles, or illustrative/painted rendering. Aspect 16:9 for the master environment, 4:3 for the point-and-shoot photograph. Keep original generated assets and derived masks distinct. Put sources in `compositions/the-fourth-chair/assets/` (gitignored); write a short `assets/GENERATED.md` recording how they were produced.

### Asset A: `chapel-master.png` (the master stage)

> A single realistic architectural photograph from the nave of a small abandoned Romanesque chapel, viewed at human chest-height with a 28–35mm lens. One large uninterrupted limestone side wall faces the camera at a shallow oblique angle and occupies much of the middle-right. The wall meets a visible worn stone floor with irregular long horizontal joints. Modest shallow apse/altar in the deep background. One high narrow window gives a trace of cool ambient daylight, but the room is mostly empty and very dark. Plausible perspective, real stone textures, beautiful restrained composition, actual spatial depth, no theatrical fog, no candles, no burning crosses, no furniture, no figures, no supernatural phenomena, no projected image. Neutral, fully exposed reference plate: enough detail everywhere to estimate the reflectance/albedo of stone, later darkened and relit in compositing. Natural photographic realism, 2560x1440 or higher.

**Technical instruction:** Generate the albedo plate ONE time. Derive the dim room from it in code. Do not independently regenerate a 'night' copy, because mismatched joints will destroy the projection illusion. Select a wall with four unambiguous projected-image corners and a visible path down onto the floor.

### Asset B: `chair-master.png` + `chair-alpha.png` (the continuity anchor)

> Isolated old medium-dark walnut dining chair, modest Central European / 1980s apartment furniture, slatted back with one visibly chipped/missing bit on the right spindle, scuffed front right leg, no upholstery, plausible worn wood with imperfect varnish. Viewed slightly from the front and right, full chair visible, realistic photographic texture and proportion, neutral diffuse light, high resolution, clean neutral background for precise matting, no people, no props.

Extract a real alpha matte; don't use a green-screen rectangle as a compositing substitute. **Reuse exactly this chair asset** for the fourth chair in the dinner picture and for its physical presence in the chapel. The distinctive chip is the match cut without a cut.

If compositing the chair into the dinner photo proves visually unconvincing, use image editing/inpainting that takes `chair-master` as a reference rather than separately inventing a different chair. Scene continuity is more important than a prettier asset.

### Asset C: `dinner-background.png` (family snapshot)

> Genuine late-2000s compact digital camera photograph, 4:3, modest lived-in apartment dining room at night, a small wooden table covered with a rumpled cloth, inexpensive plates, water glasses, half-eaten family meal. Exactly three ordinary adults seated closely around the far and left sides of the table; vacant space for an unoccupied dining chair pulled out near the right foreground. Unfashionable ordinary clothing, informal postures, one person's head awkwardly clipped near the top by poor framing, cheap built-in flash cast from the camera slightly above the lens: close objects harshly exposed, distant room drops to darkness, hard shadows on wallpaper, subtle red-eye, blown lavender-cool highlights, blue-black shadows, excessive digital sharpening, early digital compressed texture. Not cinematic, not staged, not attractive in a contemporary editorial way. The vacant fourth place must be unambiguous. No text, date imprint, borders, or graphical camera overlays.

Composite the same `chair-master` into its empty foreground location, including a hard flash shadow, correct perspective, matching light, and mild compression. Then use `digicamPass` or a pre-rendered camera-response step on the composite *once*. Don't let the pass try to invent the flash: follow the existing `xp-digicam/scene.js` rule that the light and shadow are authored, and the pass is the camera's response. The result becomes `photo-2007.png`, a stable image. In the film the picture stays STILL and the camera moves around it.

### Asset D: `chair-mask.png`, `chair-shadow-plane.png`, optional room mattes

These should be **derived**, not independently generated. Derive the shadow from the final chair cutout, and explicitly warp it into the wall/floor planes. The mask should preserve the recognizable chair back and legs but allow slight optical softness. Use a second hand-authored quad for the floor plane if helpful; `surfaceProject` only knows a flat plane at a time. No need to promote this authored floor-shadow trick to `src/`.

For the chair in the nave, reuse the same chair cutout with perspective and a proper contact shadow on the floor. Match texture temperature to the chapel. If the chair looks pasted on, fix this before tuning anything else.

**Generate alternatives sparingly:** two or three candidate room layouts is reasonable, but pick one before detailed implementation. Do not generate a sequence of disconnected pretty images as 'shots'.

## 6. Geometry / rendering plan

Read these in the live repository before coding:

- `.claude/skills/direct/SKILL.md`, `docs/arsenal.md`, and `docs/lessons.md`.
- `docs/architecture.md` and `CLAUDE.md`.
- `compositions/xp-projection/scene.js`, `docs/primitives/surface-project.md` for the wall and moving camera.
- `compositions/xp-digicam/scene.js`, `docs/primitives/digicam-pass.md` for the photographic source.
- `compositions/xp-darkroom-elevations/scene.js` for quiet cinematic camera continuity, only if useful.
- `scripts/preview.sh` for quick still checkpoints.

This was written against Kino `main` at commit **`669d2355ae58e4d0b3f741b0ee702b5b9ae53a63`** (2026-10-09). Prefer the current code if it has moved, but preserve the film's intent.

### Core technical rules

1. Build `compositions/the-fourth-chair/` as a self-contained HyperFrames project (`index.html`, `scene.js`, `meta.json`, `package.json`, `hyperframes.json`), using the existing recent compositions as the templates. Render target `data-duration="45"`, 2560x1440, 24fps.
2. `scene(t)` must be **seek-safe**: every transform, shadow length, matte and lighting value is a pure function of time. Use `Kino.timeDriver` through `Kino.filmPass`. No `Date.now`, incremental frame state, random-frame flicker, GSAP callback-driven canvas rendering or HTML video seeking.
3. Model camera motion as one continuous authored path. Start very near the photograph and reveal the surrounding chapel, then move down and slightly in to follow the shadow; the room texture, wall projection, wall/floor crease, and chair must stay spatially registered. A screen-space affine or similarity transform is fine; no need for unsupported 3D camera tech. Smooth positional and rotational derivatives at path phase boundaries.
4. Project using `Kino.surfaceProject`: `surface` = a dim version of `chapel-master`, `albedo` = undimmed/contrast-tuned same photo, `image` = prepared camera snapshot, `quad(t)` = four authored wall corners mapped by camera(t). Use shadows/occlusion where architecture passes in front of the projection. Use physically meaningful projector falloff and intensity. Projected **black adds no light**.
5. The impossible chair shadow is **not** `surfaceProject` accidentally leaking outside the quad. Give it an explicitly authored painter with its own silhouette, warp, corner continuity and controlled luminance. Crucially, the photograph's rectangular gate stays in place while the chair's dark shadow goes beyond it.
6. For the final real chair, paint the room and object behind an illumination matte so it feels revealed by light, not magically cross-faded. Match the wood to the photo. Keep its perspective, contact shadow and floor position consistent in every snapshot.
7. One restrained `filmPass` over the room. Avoid uniformly smashing all details into black. The light-catching stone and wood grain should remain visible. No full-frame flash, no random speckle, no noisy VHS overlay, no lens-distortion gimmicks, no unmotivated halation. The embedded 2007 photo can be unpleasantly overexposed because it was made by a different camera.
8. Do not let any shot go dead: even the start and ending retain a subtle camera drift, slight projector intensity evolution, or visible change in scene illumination. The result must not look like still images with slow dissolves.

### A reliable approximation is better than a clever failure

This project is an art-directed photographic composite. We have no real depth maps and don't need them. If the wall/floor shadow cannot be computed exactly, author and tune its trapezoids against snapshots. The viewer must believe the room. Prefer an impeccable illusion using a few masks to a general framework that never looks right.

## 7. Review gates and acceptance criteria

**Before full render**, build one 12-second proof spanning the crucial `00:18–00:30` period, or use targeted snapshots first. Specifically prove: the photograph remains mapped to stone; the chair shadow breaches the projection frame; the wall-to-floor bend reads; the shadow leads naturally to the chair. If that visual mechanism fails, refine the art direction first instead of filling 45 seconds with compensating effects.

Recommended snapshot timestamps: `1, 7, 14, 19.5, 24.5, 29.5, 34, 40, 43.5`. Use `scripts/preview.sh the-fourth-chair 1 7 14 19.5 24.5 29.5 34 40 43.5`. Look at the stills at scale; then play the timeline end-to-end before declaring it complete.

Acceptance:

- It is unmistakably **one physical location**, and camera motion is continuous rather than a slideshow or random movement.
- The cheap family picture reads as a harsh 2007 digicam snapshot, not a glossy AI-generated film still.
- The fourth chair is visibly empty and the same identifiable chair survives the entire film.
- At a glance, the *projection* is light on stone, not a translucent rectangle glued to a photo.
- The shadow leaving the projector's border is visually legible even without knowing the script.
- The final reveal is quiet: the projected picture dies but the real chair stays.
- All frame generation is deterministic under out-of-order seeks.
- `npm run build` (if library/vendor work requires it), `npm run typecheck`, `npm test`, and `hyperframes check` pass. Avoid modifying the Kino library for this unless unavoidable.
- Output a complete 45s 2560x1440 MP4, or, if the music file is missing, a silent MP4 with an explicit audio-assembly note. Also output selected stills, asset attribution/generation notes, and a short report of what did/did not work.

**Rendering cost:** full `surfaceProject` + `filmPass` over 1080 frames is not a trivial render. Use preview/snapshot checkpoints first. Don't launch multiple full renders or a costly `shutterIntegrate` experiment by accident.

## 8. Codex instruction: execute, don't turn this into a proposal

You are directing and implementing **THE FOURTH CHAIR** using Kino as it exists. Read the files above, generate the necessary still plates with any image-generation capability available in your environment, build the composition, inspect snapshots, repair bad registration and awkward AI artifacts, check and render the result. If an image-generation capability is not connected, do the maximum honest implementation possible with appropriate placeholders and document precisely which source images are missing; do not misrepresent placeholders as finished plates.

Prioritize the audience's comprehension of one impossible event over quantity of animations. This film wins if someone can watch it once, feel a physical contradiction, and then be unexpectedly moved by a chair.

Do **not** add extra ideas or introduce effects without a dramatic reason. Don't repurpose Kino into a timeline editor. Work within the source → arrangement → pass architecture. Respect the repo's local conventions for rendering, assets, test checks, and updating the arsenal/lessons after a new composition is proven.

The decisive image is the shadow of a chair in a photograph travelling out of the photograph and becoming the shadow of a real chair. Everything else exists to earn that image.

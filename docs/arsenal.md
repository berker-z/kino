# Arsenal

Everything kino can do, as moves you can combine, in tiers: the core every piece draws on, materials that finish a piece, and a shelf of narrow effects for when an idea really calls for one. Read this before proposing a piece: the `direct` skill (`.claude/skills/direct/`) starts here. The browsable version with stills is `examples/arsenal/index.html`, which renders this file directly.

This is a living document. Whoever adds a primitive, proves a combination or a pattern in a composition, or hears a verdict from Berker updates the entry in the same change. Entries follow one format so the page can read them: `**Name** (code)`, then `- key: value` lines (`what`, `feels`, `needs`, `pairs`, `avoid`, `seen`, `status`, `still`; patterns add `shape` and `uses`). `still` is a repo-relative image path.

Verdicts are Berker's; the full list is in `docs/lessons.md` under Taste.

How to read the "feels" lines: four axes do most of the work when matching a move to an idea.

- **Pace:** still, patient, steady, restless.
- **Temperature:** cold (blues, technical, clinical) to warm (amber, paper, skin).
- **Surface:** photographic, drawn, printed, screen.
- **Mood:** the one or two words a viewer would use.

## Proportions: how much of each tier a piece takes

- **Start from a pattern, not an effect.** Decide the shape of the piece over time (a reveal, a breakdown, a flythrough, a crescendo) before choosing how it looks.
- **Core moves are unlimited.** Type, camera, transitions and sources are where a piece's variety comes from: a 45 s piece wants several type moves, several camera passes, changes of pace. Use as many as the piece needs to stay alive.
- **One material, usually.** It's what makes the piece read as one film. A deliberate second one for a contrasting section is fine; a different one per scene is a showreel.
- **Shelf effects are featured moments: one or two per piece.** One shot carries the effect; the piece doesn't run on it.
- **Before adding anything to kino, ask what new kind of video it lets us make.** "It looks cool" isn't enough. If the answer is "none", it goes on the shelf or doesn't get built.

## Patterns: the shape of a piece over time

How a piece is structured, independent of how it looks. Any pattern can wear any material. Most are hypotheses until a piece proves them; `status` says which. When a piece uses one, add it to `seen` and correct the `shape` with what actually worked.

**Music piece** (one world, driven by the song)
- what: a single continuous world that the song plays: signals drive everything, scenes change on phrases, nothing is cut to a script.
- shape: open on the world already moving, settle in for a phrase; change scene or mode on phrase boundaries (physical transitions: torn wipe, lens); the biggest change on the drop; leave on a slow pull or power-off.
- uses: beatMap and bandEnergy, one source that is the music (ridgelines, beam, terrain), contact strips or a sheet camera, a material.
- avoid: hits that kick position or flash (rule below); a page-by-page structure.
- seen: waves-test, screen-test, oscilloscope, blueprint, risograph.
- status: proven.
- still: examples/styles/stills/cyanotype-2.jpg

**Product reveal** (10–20 s)
- what: the product shown in parts before it's shown whole, so the whole lands as a payoff.
- shape: details first (tight crops of the real UI or object, type fragments), the camera finding them one by one; a pull back to the whole on the downbeat; the name built in construction order; a slow push on the lockup to hold.
- uses: sheet camera or slow push, construction drafting, line rise, one material (or none, for a clean product).
- needs: the product as material (UI plates, see Gaps).
- avoid: showing the whole in the first second; a logo flying in.
- status: hypothesis, no piece yet.

**Feature breakdown** (20–45 s)
- what: three to five claims in a row, each one a headline and its proof.
- shape: each section the same skeleton (a claim set as type, then the proof: a UI crop with a drawn callout), sections the same length so it reads as a series, a different camera move in each so it doesn't repeat; transitions on bar lines.
- uses: line rise or wiped words for the claims, pen callouts, sheet camera, torn wipe or glass lens between sections.
- needs: UI plates and callouts (see Gaps).
- avoid: identical motion in every section (repetitive); a slide per feature with a wipe between (reads as a deck).
- status: hypothesis, no piece yet.

**Interface flythrough** (15–30 s)
- what: the product laid out as one big sheet, the camera travelling through it without cuts and stopping where something matters.
- shape: start close on one corner, glide between stops, each stop marked by a label drawing itself, end on a pull back to the whole layout.
- uses: sheet camera, pen labels and leaders, line rise; blueprint or none as material.
- needs: UI plates laid out on one canvas.
- seen: blueprint is the same shape with a drawing as the sheet.
- status: hypothesis, closest proof is blueprint.

**Architecture diagram** (15–30 s)
- what: a system drawn in front of you in the order it works: parts, then connections, then something flowing through them.
- shape: the first node drawn and labelled; others drafted around it; connections drawn as leaders; a pulse travelling the graph once it's whole; the camera following the pulse; pull back to the full diagram.
- uses: pen kit, network tree, construction drafting for labels, sheet camera; blueprint, cyanotype or none.
- avoid: everything appearing at once; a reveal order without a rule.
- status: hypothesis, no piece yet. The obvious first use is Copland's daemon and its agents.

**Typographic manifesto** (20–45 s)
- what: a piece made of words: lines of copy, one idea at a time, the key word given a construction of its own.
- shape: a line per musical phrase, rising or wiped in; every third or fourth beat a key word built in drafting order; the camera drifting so the page is never still; the last line held longest.
- uses: line rise, wiped words, construction drafting, burned-in titles, sheet camera; riso, photocopy or film.
- avoid: one letter per beat (rejected); dithered type.
- seen: xp-typesetting, xp-xerox.
- status: partly proven (the type moves are; a full manifesto isn't).

**Launch crescendo** (the last 8–15 s of a launch)
- what: everything the piece has shown comes back, faster, until it stops on the name.
- shape: cuts through earlier material getting shorter with the music; density building; a sudden stop into space; the name and a date or URL set plainly; a slow push to hold.
- uses: the piece's own shots, beatMap for cut points, construction drafting or line rise for the lockup.
- avoid: strobing or flashes on the cuts (rule below); ending on a hard freeze.
- status: hypothesis, no piece yet.

## Type: core

Type stays crisp: over the material if the material would degrade it, never dithered. Every product piece needs type; use several of these in one piece.

**Construction drafting** (`letterStrokes`, `drawStroke`, `data-chars`)
- what: a word built in drafting order: guides, then stems, then bars, then curves, each wiping along its stroke.
- feels: patient, precise, architectural. Loved.
- pairs: blueprint, plain canvas, editorial pages.
- seen: xp-typesetting.
- still: examples/languages/stills/typesetting-the-name-of-the-thing-05.40s.jpg

**Line rise** (`lineRise`, `data-lines`)
- what: lines entering from below behind their own boxes, top line first.
- feels: calm, editorial.
- seen: all three language pieces.
- still: examples/languages/stills/typesetting-the-name-of-the-thing-11.80s.jpg

**Wiped words** (`wipeText`, `caption`)
- whole words and lines behind a hard mask edge. Not one letter per beat (rejected).
- seen: screen-test.

**Burned-in title** (composition code)
- a plain exposure fading up with `screen`, so it picks up the film's halation.
- seen: the darkroom pieces.

## Camera: core, how things move and change

Camera moves and transitions. Most pieces want more than one; something moves in every shot.

**Sheet camera** (`sheetCamera`)
- what: one big canvas, a camera gliding and drifting across it, no cuts.
- feels: continuous, exploratory, patient.
- seen: blueprint, xp-teletext-wall.
- still: examples/styles/stills/blueprint-0.jpg

**Print run** (`printRun`, `registerDrift`)
- what: a sheet scrolling at whole pixels per frame with an eased stop; inks drifting off register across a bar and landing on the downbeat.
- seen: risograph.
- still: examples/styles/stills/risograph-0.jpg

**Contact strip** (`printStrip`)
- what: a row of prints sliding at constant speed.
- seen: screen-test (loved, with the lens over it).

**Torn wipe** (`tornWipe`)
- what: the next scene through a ragged paper tear with a fibre edge.
- feels: physical, printed. Loved.
- seen: screen-test.

**Glass lens** (`lensPass`, `lensPassFx`)
- what: the next scene opening inside a glass circle, with the screen pass bending under it.
- seen: screen-test (loved).

**Optical dissolve** (composition code in xp-darkroom)
- what: one interior giving way to another through a screen-weighted overlap, so the middle glows like an optical printer's.
- feels: soft, photographic, time passing.
- seen: xp-darkroom.
- still: examples/languages/stills/darkroom-the-silent-city-11.50s.jpg

**Moving mattes** (composition code)
- rectangular apertures opening, sliding and widening. Read as a layout when panels sit side by side; better as a single aperture.
- seen: Elevations take one.

## Sources: core, things that draw

What the picture is of. Sources paint grayscale (mostly) and any material finishes them.

**Photographs** (`preparePlate`, `sunprint`)
- prep makes them read under any material: levels, S-curve. `sunprint` adds a brushed cyanotype edge.
- seen: screen-test, risograph, the darkroom pieces.

**Footage** (offline frames, or `scripts/dither.py`)
- extract frames with ffmpeg into `assets/`; never seek a `<video>` per frame. 1080p JPEGs, blended between frames for slow sampling.
- seen: xp-temporal-footage, dither-lab.

**Pen** (`Kino.pen`)
- what: lines, arcs, hatching, dimensions, callouts and labels that draw themselves.
- feels: technical, patient; the thing is being designed in front of you.
- pairs: blueprint, cyanotype, sheet camera.
- seen: blueprint, xp-pen-cyanotype.
- still: examples/styles/stills/blueprint-3.jpg

**HTML plate** (`htmlPlate`)
- what: a page set by the browser in HTML and CSS, snapshotted once, drawn in measured parts, lines or characters.
- it's the base for every type move below.

**Spectrum ridgelines** (`spectrumFeed`, `paint.ridgelines`)
- what: the song's spectrum as a column of ridgelines fed on the beat.
- feels: calm, cold, musical; the "waves" piece.
- avoid: angled or converging perspective, spiky peaks (rejected); speckle in empty space.
- seen: waves-test (loved, ice on navy).

**Terrain, flow field, starfield, sphere** (`paint.*`)
- terrain wave lines were liked. Flow field is banded noise for halftoning (riso).
- avoid: the tunnel and the sliced sun (rejected as cheap and vaporwave).

**Network tree** (`networkTree`)
- what: a seeded branching graph growing generation by generation.
- feels: organic, systematic; growth, spread.
- seen: screen-test (loved).

## Materials: a finishing layer, usually one per piece

The pass the whole frame goes through, so it sets the surface and the temperature. Pick it after the pattern and the moves, not first.

**Film** (`filmPass`)
- what: black-and-white film, printed. Halation from highlights, toe and S-curve, midtone grain, gate weave, optional split tone.
- feels: patient, photographic, warm-neutral; serious, a little ominous.
- needs: photographs or anything with real tonal range. Flat graphics gain little.
- pairs: double exposures and self-mattes, burned-in titles, slow pushes and tilts.
- avoid: grain over small text (keep type large or above the pass); big files (grain defeats compression).
- seen: xp-darkroom, xp-darkroom-elevations.
- still: examples/languages/stills/darkroom-the-silent-city-08.50s.jpg

**Cyanotype screen** (`screenPass` + `Kino.cyanotype`)
- what: a cyanotype print filmed off a Trinitron: Prussian blue ramp, grille, edge blur, convergence fringe.
- feels: calm, cold, screen-and-print at once; archival, a little melancholy.
- needs: grayscale sources with strong darks and lights (prepare photos with `preparePlate`).
- pairs: contact strips, torn wipes, the glass lens, pen drawings, wiped type.
- avoid: the water-drop ripple (rejected).
- seen: screen-test ("impressed beyond measure"), xp-pen-cyanotype.
- still: examples/styles/stills/cyanotype-2.jpg

**Blueprint** (`screenPass` + `Kino.blueprint`)
- what: a blueprint print: deep blue paper, lines near white, no grille.
- feels: technical, patient, cold; things being designed.
- needs: line art (the pen kit).
- pairs: sheet camera, everything drawn in drafting order, construction-order type.
- seen: blueprint (liked).
- still: examples/styles/stills/blueprint-2.jpg

**Riso** (`risoPass` + `Kino.riso`)
- what: a two-ink risograph print, pink and blue by default, inks drifting off register.
- feels: warm, printed, graphic; zine, poster, playful but considered.
- needs: two separations (two pictures, one per drum).
- pairs: one continuous print run, register drift landing on downbeats, typography.
- avoid: page-by-page layouts with wipes ("a powerpoint slide"); per-beat position kicks (jitter).
- seen: risograph (aesthetic loved, movement disliked), xp-typesetting/ab.
- still: examples/styles/stills/risograph-2.jpg

**Dither** (`ditherPass`)
- what: 2 to 4 tone ordered dither. Bayer 8 first, blue noise second; halftone too.
- feels: graphic, retro-digital, crisp; can be bleak or elegant depending on palette.
- needs: photos or footage (with prep), or clean shapes on a ground that maps to the darkest tone.
- pairs: anything; it's the most neutral material. Three tones beat two.
- avoid: dithered type; speckle in empty space (set levels so the ground is a solid tone); fake line engraving (dead end).
- seen: dither-lab, the A/Bs of all three language pieces.
- still: examples/languages/stills/darkroom-ab-04.50s.jpg

**None**
- Plain canvas is a material too. Type pieces and clean diagrams often want nothing over them.
- seen: xp-typesetting, xp-temporal-scan.
- still: examples/languages/stills/temporal-scan-an-object-outside-time-07.00s.jpg

## Shelf: narrow effects, one or two per piece as a featured moment

Real, working and documented, but each fits a narrow kind of idea. Propose one only when the idea calls for it, and let it carry one shot rather than the piece. Whatever no piece uses after the next few gets moved to `attic/` (code, doc and tests together, with `git mv`). Some of these are materials (`kind: material`): using one replaces the piece's main material for that shot.

**Phosphor** (`screenPass` + `Kino.phosphor`)
- what: an amber tube with a bulge, the picture as signal.
- feels: warm, analog, nocturnal; instruments in a dark room.
- needs: the beam, or bright lines on black.
- pairs: beam, mode squash transitions.
- seen: oscilloscope (liked).
- still: examples/styles/stills/oscilloscope-1.jpg
- kind: material

**Beam** (`beam`, `beamText`)
- what: an electron beam on phosphor; fast swings dim like a real scope.
- feels: warm, analog, alive; the signal itself.
- needs: audio samples (`scripts/samples.py`) or any path.
- seen: oscilloscope.
- still: examples/styles/stills/oscilloscope-2.jpg

**Digital flash** (`digicamPass`)
- what: a cheap late-2000s digital camera: highlights clip hard into a cool lavender white, shadows crush to blue-black, a tight cold bloom, colour fringes at the frame edges, sharpening halos, faint shadow noise that never touches true black.
- feels: hostile, intimate, cold, cheap; a picture found on a forgotten SD card.
- needs: an authored flash. The pass is the camera's response, not the light: matte the subject, push its gain so it clips, drop the room, offset the subject's silhouette as a hard shadow. On a bright evenly lit room the same settings only give a cold cheap snapshot.
- pairs: shutter drag (AFTERIMAGE), close awkward crops, slow push, no text.
- avoid: large saturated graphics (the bloom washes them pastel); per-pixel noise at full strength (the first render was 234 MB; luma noise is now on a 1.4 px lattice); flash pulses.
- seen: xp-digicam (THE STAIRWELL), xp-shutter.
- status: provisional. First defaults were "lowkey the same" as raw; fried (camera curve, oversaturation, harder clip, halos, JPEG chroma blocks). No verdict on the fried version yet.
- still: examples/expansion/stills/digicam-the-stairwell-06.00s.jpg
- kind: material

**False infrared** (`infraredPass`)
- what: black and white through a deep red filter, then leaves lifted pale and luminous and clear sky pushed to black, a small glow, silver toning. A guess from colour; explicit foliage and sky mattes (`regions`) when the guess fails.
- feels: quiet, spectral, uncanny; daylight that looks like a dream's negative.
- needs: foliage and clear blue sky in the picture. Green paint and mossy stone read as leaves; an overcast sky won't darken without a matte. It cannot see real near infrared.
- pairs: footage with wind in it, slow lateral drift, the emergence order colour, red filter, infrared.
- avoid: heavy lift (the first take was a white sheet with black holes); green night-vision anything.
- seen: xp-infrared (WHITE ORCHARD).
- status: provisional, no verdict yet.
- still: examples/expansion/stills/infrared-white-orchard-10.00s.jpg
- kind: material

**Photocopy** (`copyGenerations`, a precompute)
- what: a sheet copied and the copy copied: greys collapse, ink spreads, fine print fattens and closes up, dashed lines vanish, solids go dirty in the middle, specks near edges, the machine's streaks recurring. Big forms survive longest.
- feels: abrasive, underground, evidential; a manifesto passed hand to hand.
- needs: a still sheet (type, a drawing, a dark photo), computed once and moved as a plate; it is not a per-frame pass.
- pairs: a camera travelling over the sheet, each new copy arriving down the sheet behind a plain edge, crisp counters above the page.
- avoid: a glowing copier light bar riding the edge (rejected: "I sort of hate the white light thing"); expecting it on moving footage (dirt would boil); confusing it with dither or riso.
- seen: xp-xerox (THE TESTAMENT).
- status: provisional. The light bar was rejected and removed; no verdict on the rest yet.
- still: examples/expansion/stills/xerox-the-testament-11.50s.jpg
- kind: material

**Silhouette exposure** (`doubleExposure`, mask = a cut-out shape)
- what: one picture exposed inside another's outline. Screen (light adds) or replace.
- feels: iconic, direct, cinematic; reads instantly.
- needs: a clean cut-out (a figure, an object) and an interior plate with texture.
- pairs: film, spacious black, a sparse title.
- avoid: it's the True Detective trope. Use it when that recognition is the point, not by default.
- seen: xp-darkroom.
- still: examples/languages/stills/darkroom-the-silent-city-06.50s.jpg

**Self-matte** (`plateKeys` + `thresholdWindow` + `doubleExposure`)
- what: a second picture exposed through the first one's own sky or shadows. Shadows can open by a rule: darkest first.
- feels: quiet, uncanny, photographic; "this photograph shouldn't exist".
- needs: a plate with clean dark or bright regions: architecture against sky, deep shadows.
- pairs: film, slow tilts, burned-in titles; dither works too.
- avoid: busy plates (the key catches texture); side-by-side layouts (rejected in take one of Elevations: "letterboxed").
- seen: xp-darkroom-elevations.
- still: examples/languages/stills/elevations-09.00s.jpg

**Projection** (`surfaceProject`)
- what: a picture thrown by a projector onto a flat wall in a photographed room, in perspective (four authored corners), as light added in proportion to the stone's albedo. Black adds nothing. Columns in the beam cast authored shadows.
- feels: cinematic, restrained, sacred-ish; an image entering matter.
- needs: a photographed room with a big plane in perspective, a daylight version of it for albedo, and bright projection content with linework (dark, low-contrast footage reads as a stain).
- pairs: dimmed rooms, slow pushes that carry the quad with the room, film with warm halation.
- avoid: non-planar surfaces (out of scope); rectangles laid over a photo (the naive A/B shows why).
- seen: xp-projection (SANCTUARY).
- status: provisional, no verdict yet.
- still: examples/expansion/stills/projection-sanctuary-09.50s.jpg

**Transmitted light** (`transmissionComposite`)
- what: a picture that exists only as matter light passes through: density and tint maps lit from behind, `backlight · exp(-extinction · density)`. Move the light and the picture changes; lead cames stay black inside it.
- feels: austere, numinous, slightly anatomical; glass negatives, lancets, lantern slides.
- needs: a density plate (white dense, black clear), optionally a tint map, and a light that moves. A dark room around it.
- pairs: a band of light travelling down the plate, film's warm halation for the glow, slow pushes.
- avoid: screen-blending a picture over light (light paints over the leads; see the A/B).
- seen: xp-transmission (RELIQUARY).
- status: provisional, no verdict yet.
- still: examples/expansion/stills/transmission-reliquary-08.50s.jpg

**Slit-scan** (`temporalScan`)
- what: each strip of the frame shows the source at a different moment. Moving things bend, stretch or lean.
- feels: strange, hypnotic, analytic; time made visible.
- needs: motion. Sideways motion for vertical strips; tall things moving sideways for horizontal bands. Rigid objects read best.
- pairs: dither, plain canvas, footage, procedural sources; can nest (a scan inside a scan).
- avoid: weak motion (it does nothing); showing it without a reference (first-time viewers need the source inset or a span-0 opening).
- seen: xp-temporal-scan (procedural), xp-temporal-footage (horses).
- still: examples/languages/stills/temporal-footage-04.80s.jpg

**Shutter drag** (`shutterIntegrate`)
- what: one frame exposed over a shutter interval with a flash inside it: everything lit by ambient light piles up into trails, the flash freezes the subject sharp. Lights brighter than white go in `glow` with a gain, so their streaks saturate.
- feels: nocturnal, haunted, intimate; the present pinned on top of its own recent past.
- needs: one strong moving subject with a readable path, a source that is a pure function of time, and patience: cost is one source paint per sample (AFTERIMAGE took 32 minutes for 12 s).
- pairs: digital flash on top, dark passages, a shutter that opens and closes over the piece.
- avoid: confusing it with slit-scan or a blur filter; too few samples on a sharp light (beads, not a streak).
- seen: xp-shutter (AFTERIMAGE).
- status: provisional, no verdict yet.
- still: examples/expansion/stills/shutter-afterimage-07.50s.jpg

**Teletext** (`teletext`)
- a joke piece only. Don't propose it unless the idea is a joke.

## Gaps: what product work needs that kino doesn't have yet

- **The product as a source.** Screenshots and screen recordings of a real interface as plates: crisp, at the right scale, croppable by region. Today everything assumes photos or procedural pictures.
- **Placing a picture on a surface.** `surfaceProject` already solves four-corner perspective; the geometry should be usable on its own (a UI onto a device, a wall, a sheet) without the projector light model.
- **Callouts on a UI.** A cursor, a highlight, a drawn leader to a region. The pen kit has leaders and labels; nothing aims them at a plate.
- **A logo lockup.** Drawing or revealing a real logo (an SVG) with the same rules as construction drafting.
- **Destination sizes.** Product videos go to 16:9, 9:16 and 1:1. Pieces are built for 2560×1440 only.

Don't build these on spec. Build them when a real piece hits the gap, then move the line into the right tier.

## Global rules (from the verdicts)

- No full-frame flashes, strobing or instant position kicks. Hits move the picture smoothly.
- No random speckle in empty space.
- Something moves in every shot; still pages with transitions read as slides.
- Every reveal needs a rule you can read (construction order beat shuffled slabs).
- Pick palettes per piece; never default to acid lime. Ice on navy is the favourite so far.
- Render at 2560×1440.

# Arsenal

Everything kino can do, as moves you can combine. Read this before proposing a piece: the `direct` skill (`.claude/skills/direct/`) starts here. The browsable version with stills is `examples/arsenal/index.html`, which renders this file directly.

This is a living document. Whoever adds a primitive, proves a combination in a composition, or hears a verdict from Berker updates the entry in the same change. Entries follow one format so the page can read them: `**Name** (code)`, then `- key: value` lines (`what`, `feels`, `needs`, `pairs`, `avoid`, `seen`, `still`). `still` is a repo-relative image path.

Each entry says what the move does, how it feels, what it needs, what it pairs with, what to avoid, and where it's been seen. Verdicts are Berker's; the full list is in `docs/lessons.md` under Taste.

How to read the "feels" lines: four axes do most of the work when matching a move to an idea.

- **Pace:** still, patient, steady, restless.
- **Temperature:** cold (blues, technical, clinical) to warm (amber, paper, skin).
- **Surface:** photographic, drawn, printed, screen.
- **Mood:** the one or two words a viewer would use.

A piece usually takes one move from Material, one or two from Exposure or Time or Sources, one from Camera, and one from Type. More than that and it starts to look like a showreel.

## Material: what the picture is made of

One per piece. It's the pass the whole frame goes through, so it sets the surface and the temperature.

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

**Phosphor** (`screenPass` + `Kino.phosphor`)
- what: an amber tube with a bulge, the picture as signal.
- feels: warm, analog, nocturnal; instruments in a dark room.
- needs: the beam, or bright lines on black.
- pairs: beam, mode squash transitions.
- seen: oscilloscope (liked).
- still: examples/styles/stills/oscilloscope-1.jpg

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

**Digital flash** (`digicamPass`)
- what: a cheap late-2000s digital camera: highlights clip hard into a cool lavender white, shadows crush to blue-black, a tight cold bloom, colour fringes at the frame edges, sharpening halos, faint shadow noise that never touches true black.
- feels: hostile, intimate, cold, cheap; a picture found on a forgotten SD card.
- needs: an authored flash. The pass is the camera's response, not the light: matte the subject, push its gain so it clips, drop the room, offset the subject's silhouette as a hard shadow. On a bright evenly lit room the same settings only give a cold cheap snapshot.
- pairs: shutter drag (AFTERIMAGE), close awkward crops, slow push, no text.
- avoid: large saturated graphics (the bloom washes them pastel); per-pixel noise at full strength (the first render was 234 MB; luma noise is now on a 1.4 px lattice); flash pulses.
- seen: xp-digicam (THE STAIRWELL), xp-shutter.
- status: provisional. First defaults were "lowkey the same" as raw; fried (camera curve, oversaturation, harder clip, halos, JPEG chroma blocks). No verdict on the fried version yet.
- still: examples/expansion/stills/digicam-the-stairwell-06.00s.jpg

**False infrared** (`infraredPass`)
- what: black and white through a deep red filter, then leaves lifted pale and luminous and clear sky pushed to black, a small glow, silver toning. A guess from colour; explicit foliage and sky mattes (`regions`) when the guess fails.
- feels: quiet, spectral, uncanny; daylight that looks like a dream's negative.
- needs: foliage and clear blue sky in the picture. Green paint and mossy stone read as leaves; an overcast sky won't darken without a matte. It cannot see real near infrared.
- pairs: footage with wind in it, slow lateral drift, the emergence order colour, red filter, infrared.
- avoid: heavy lift (the first take was a white sheet with black holes); green night-vision anything.
- seen: xp-infrared (WHITE ORCHARD).
- status: provisional, no verdict yet.
- still: examples/expansion/stills/infrared-white-orchard-10.00s.jpg

**Photocopy** (`copyGenerations`, a precompute)
- what: a sheet copied and the copy copied: greys collapse, ink spreads, fine print fattens and closes up, dashed lines vanish, solids go dirty in the middle, specks near edges, the machine's streaks recurring. Big forms survive longest.
- feels: abrasive, underground, evidential; a manifesto passed hand to hand.
- needs: a still sheet (type, a drawing, a dark photo), computed once and moved as a plate; it is not a per-frame pass.
- pairs: a camera travelling over the sheet, each new copy arriving down the sheet behind a plain edge, crisp counters above the page.
- avoid: a glowing copier light bar riding the edge (rejected: "I sort of hate the white light thing"); expecting it on moving footage (dirt would boil); confusing it with dither or riso.
- seen: xp-xerox (THE TESTAMENT).
- status: provisional. The light bar was rejected and removed; no verdict on the rest yet.
- still: examples/expansion/stills/xerox-the-testament-11.50s.jpg

**None**
- Plain canvas is a material too. Type pieces and clean diagrams often want nothing over them.
- seen: xp-typesetting, xp-temporal-scan.
- still: examples/languages/stills/temporal-scan-an-object-outside-time-07.00s.jpg

## Exposure: putting pictures together

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

**Optical dissolve** (composition code in xp-darkroom)
- what: one interior giving way to another through a screen-weighted overlap, so the middle glows like an optical printer's.
- feels: soft, photographic, time passing.
- seen: xp-darkroom.
- still: examples/languages/stills/darkroom-the-silent-city-11.50s.jpg

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

## Time

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

## Sources: things that draw

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

**Beam** (`beam`, `beamText`)
- what: an electron beam on phosphor; fast swings dim like a real scope.
- feels: warm, analog, alive; the signal itself.
- needs: audio samples (`scripts/samples.py`) or any path.
- seen: oscilloscope.
- still: examples/styles/stills/oscilloscope-2.jpg

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

**HTML plate** (`htmlPlate`)
- what: a page set by the browser in HTML and CSS, snapshotted once, drawn in measured parts, lines or characters.
- it's the base for every type move below.

**Teletext** (`teletext`)
- a joke piece only. Don't propose it unless the idea is a joke.

## Camera and arrangement: how things move

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

**Moving mattes** (composition code)
- rectangular apertures opening, sliding and widening. Read as a layout when panels sit side by side; better as a single aperture.
- seen: Elevations take one.

## Type

Type stays crisp: over the material if the material would degrade it, never dithered.

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

## Global rules (from the verdicts)

- No full-frame flashes, strobing or instant position kicks. Hits move the picture smoothly.
- No random speckle in empty space.
- Something moves in every shot; still pages with transitions read as slides.
- Every reveal needs a rule you can read (construction order beat shuffled slabs).
- Pick palettes per piece; never default to acid lime. Ice on navy is the favourite so far.
- Render at 2560×1440.

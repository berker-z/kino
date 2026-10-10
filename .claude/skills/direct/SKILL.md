---
name: direct
description: Turn an idea from Berker into a kino piece by choosing from the arsenal. Read docs/arsenal.md, read the idea for vibe, propose two or three combinations of techniques with a reason and a rough shot list each, then build the one he picks and update the arsenal with what was learned. Use when Berker brings an idea, a mood, a reference, a title, a song or a subject and wants a piece ("make something that feels like...", "I have an idea", "what could we do with...").
---

# Direct: from an idea to a combination

Berker comes with an idea; you're the one who knows the toolbox. The job is to pick a small combination of existing moves that fits the idea's feeling, explain it in a line, and build it. New primitives only when the arsenal really has nothing that fits, and then say so.

## 1. Read the arsenal, every time

Read `docs/arsenal.md` in full before proposing anything. It's the living list of what kino can do, how each move feels, what it needs, what it pairs with, and what Berker rejected. Also skim the Taste section of `docs/lessons.md` and the `kino-visual-taste` memory if it's loaded. Don't propose from memory of the codebase: the arsenal is what's been proven.

## 2. Read the idea for vibe

Say back, in one or two lines, what you think the idea is going for, using the arsenal's axes:

- **Pace:** still, patient, steady, restless.
- **Temperature:** cold to warm.
- **Surface:** photographic, drawn, printed, screen.
- **Mood:** one or two words.

Plus what material exists: photos, footage, a song, text, nothing (procedural). If something decisive is missing (is there a song? does it need type?), ask one question; otherwise assume and say what you assumed.

## 3. Propose two or three combinations

Each one starts from a **pattern** (the shape of the piece over time: music piece, product reveal, feature breakdown, interface flythrough, architecture diagram, manifesto, launch crescendo, or a new one you name). Then follow the arsenal's proportions:

- **core moves** (type, camera, transitions, sources) as many as the piece needs; variety over 30–45 s comes from here, so plan several type moves and several camera moves, not one of each;
- usually one **material** (or none), chosen after the pattern and moves; a second only for a deliberate contrasting section;
- at most one or two **shelf** effects, each carrying one shot as a featured moment.

Stacking materials and shelf effects reads as a showreel. Never propose a narrative short film (THE FOURTH CHAIR was the wrong format for kino). For each option, write:

```
A. <name in three or four words>
   pattern   product reveal → launch crescendo
   moves     line rise · construction drafting · sheet camera · torn wipe · slow push
   material  film
   shelf     self-matte (one shot, 9–12 s)
   why       one sentence tying the moves to the vibe
   shots     0-3 s ..., 3-7 s ..., 7-12 s ...  (continuous motion, a readable rule)
   needs     plates to find, audio analysis, a new primitive (say so plainly)
   risk      what might not work, from the arsenal's avoid lines or new territory
```

Make the options genuinely different (different materials or different central moves), and say which one you'd pick and why. Respect the global rules at the end of the arsenal: no strobes, no speckle, something moves in every shot, every reveal follows a readable rule, crisp type, palettes picked per piece, 2560×1440.

## 4. Build the one he picks, storyboard first

`docs/storyboard.md` is the full loop. In short:

- Where: a real production (a launch film, a piece for someone) goes in `works/<name>/` (gitignored); an experiment or a showcase piece in `compositions/<name>/`. Copy `hyperframes.json`, `meta.json`, `package.json` from a recent piece.
- Write the film as shots, each a pure function of time, in one file that sets `window.FILM` (`works/copland-launch/shots.js` is the example), plus a `storyboard.json`. Shots stay paintable past their own range so changes can overlap (`Kino.overlap`): **no hard cuts**, every change comes out of motion.
- If the piece is about a product: use its own rendering code where you can (`Kino.replay`), capture its UI from a copy with made-up data (`scripts/capture.mjs`), and check every line of copy against its docs.
- Photos: Wikimedia Commons, with licence and author in `assets/CREDITS.txt`. Not the Kutia Kondh portrait.
- Check the storyboard yourself before Berker sees it: `?t=` frames and contact sheets across every transition and every dense moment. Then open it (`npm run storyboard`) and list what's open.
- Iterate on his notes in the storyboard. When he says go, **ask the render size and the music question**, wire `index.html` to the same film, `hyperframes check`, render in the background, pull frames at the transitions from the MP4, and open it.
- Report in a few lines: what you built, which moves, what to watch for, what's weak.

## 5. Update the arsenal

In the same change, update `docs/arsenal.md`:

- add the composition to the `seen` line of every move it used, with a `still` if the entry has none;
- a new move (a new primitive, or a composition trick worth naming) gets an entry in the same format, in the right tier;
- add the piece to the `seen` line of the pattern it used, correct the pattern's `shape` with what actually worked, and move its `status` from hypothesis toward proven; if the piece hit a line in Gaps, say what was built and move it into a tier;
- a shelf effect that a real piece used well is a candidate for promotion; say so in the report rather than promoting it yourself;
- when Berker gives a verdict, write it into the entry (`avoid` for rejections, praise in `seen`), and into `docs/lessons.md` Taste if it's a general rule.

The page at `examples/arsenal/index.html` renders the markdown, so keep the entry format exact: `**Name** (code)` then `- key: value` lines.

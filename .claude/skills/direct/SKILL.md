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

Each one is a recipe from the arsenal, usually:

- one **Material** (or none),
- one or two **Exposure / Time / Sources** moves,
- one **Camera** move,
- one **Type** move if there's type.

More than that reads as a showreel. For each, write:

```
A. <name in three or four words>
   moves     film · self-matte · slow tilt · burned-in title
   why       one sentence tying the moves to the vibe
   shots     0-3 s ..., 3-7 s ..., 7-12 s ...  (continuous motion, a readable rule)
   needs     plates to find, audio analysis, a new primitive (say so plainly)
   risk      what might not work, from the arsenal's avoid lines or new territory
```

Make the options genuinely different (different materials or different central moves), and say which one you'd pick and why. Respect the global rules at the end of the arsenal: no strobes, no speckle, something moves in every shot, every reveal follows a readable rule, crisp type, palettes picked per piece, 2560×1440.

## 4. Build the one he picks

- A new composition in `compositions/<name>/` with the usual structure (copy `hyperframes.json`, `meta.json`, `package.json` from a recent piece; the picture in `scene.js`, materials in `index.html`; variants in a subfolder, never a second root HTML with a composition id). `npm run build` after any `src/` change.
- Photos: Wikimedia Commons, with licence and author in `assets/CREDITS.txt`. Not the Kutia Kondh portrait.
- Snapshot, look at the frames yourself, fix what's off, then `hyperframes check` and render. Open the video for Berker.
- Report in a few lines: what you built, which moves, what to watch for, what's weak.

## 5. Update the arsenal

In the same change, update `docs/arsenal.md`:

- add the composition to the `seen` line of every move it used, with a `still` if the entry has none;
- a new move (a new primitive, or a composition trick worth naming) gets an entry in the same format;
- when Berker gives a verdict, write it into the entry (`avoid` for rejections, praise in `seen`), and into `docs/lessons.md` Taste if it's a general rule.

The page at `examples/arsenal/index.html` renders the markdown, so keep the entry format exact: `**Name** (code)` then `- key: value` lines.

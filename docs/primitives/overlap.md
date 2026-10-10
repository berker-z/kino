# overlap

`overlap(ctx, t, shots, blends, paint)` paints a film made of shots without hard cuts. Inside a blend `{a, b, from, to}` it paints shot `a`, then shot `b` over it at an alpha rising with an in-out ease; elsewhere it paints the shot whose range holds `t`. `overlapAt` returns the decision without drawing, for tests.

## Why

Berker's note on the first Copland storyboard: the transition into the logo was "too fast and too fucking abrupt... we can't have slideshow". Every shot change had been a hard cut, and a cut between two still-ish diagrams reads as the next slide. What fixed it wasn't a fancier transition but a rule: **a shot change happens while things are moving, and carries the motion across.**

The ways that worked, all in CURRENT:

- **Push carried over.** The outgoing camera is already pushing in; the incoming shot fades up mid-push and settles (/wired's doing pole into the board's doing column).
- **Dissolve in motion.** Both shots pan the same way through the overlap (the board drifting right as the loop drafts and pans right).
- **Match on shape.** The outgoing camera moves so a shape lands exactly where the same shape stands in the next shot, then a short dissolve with the shape not moving: the loop's agent pole becomes the orchestration's lead pole, and the lead pole becomes the logo's pole. A match needs a camera solved for the handoff (`cx = x_next + (W/2 - screenX) / s`), which lives in the shots, not here.

So `overlap` itself is small: it only guarantees there's never a frame of one shot followed by a frame of an unrelated one. The work is in the shots: each must be paintable past its own range (its camera still going, nothing clamped to stop at the boundary).

## Defaults

Blends of 0.4 to 0.8 s. Matches are short (the shape is already in place, so the dissolve only swaps what surrounds it); dissolves between unrelated pictures are longer and need both to be moving. Painting `b` over `a` at `globalAlpha` is a true dissolve only for the first layer of `b`; its later layers are slightly lighter mid-blend, which nobody has seen at these lengths.

Seen: CURRENT (Copland launch).

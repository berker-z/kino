# transmissionComposite

`transmissionComposite({width, height, density, backlight, tint, coverage, room, extinction, gain, front})` returns a painter `(ctx, t)` for a picture that exists only as matter light passes through: a glass negative, a slide, a stained-glass panel. `transmittance(density, extinction, tint)` is the pure per-channel model.

## The model

Per channel, in linear light:

```
T     = tint · exp(−extinction · density)
plate = backlight · gain · T + front · room
out   = room · (1 − coverage) + plate · coverage
```

`extinction` and `density` are separate on purpose. Density is the plate (how much matter is where); extinction is how strongly that matter absorbs. `gain` is the light's intensity, so a canvas (which can't paint brighter than white) can stand for daylight behind glass. Changing the light changes what shines through: a band of light lights only the panes it falls on, and the dense parts stay dark inside the light.

## Conventions

These are easy to invert by accident, so they're fixed:

- **density**: grey over black. Black is clear glass, white the densest. Density is a fraction, read as stored (no sRGB decode). A photographic negative is already density: its dark parts are clear. To show a positive through glass (a slide), draw it inverted.
- **tint**: the glass colour over white. White is clear; a red pane passes red.
- **backlight**: RGB intensity over black, times `gain`.
- **coverage**: alpha, where the plate is. Outside it, the room.
- **front**: a little of the room's light reflected off the plate's face, so an unlit plate is barely there instead of a hole.

Lead cames are just density 1 under enough extinction (e^−5 ≈ 0.7%). They block light; they never paint over it, which is the whole difference from a screen blend (the A/B has the naive version for comparison: light washes over the leads).

## What stays out

Glow round bright panes is the pass's job: RELIQUARY puts `filmPass` after it with a warm halation. The light falling into the room through the glass is authored in the composition (a warm glow on the niche's splay that follows how much of the band is inside the panel), not computed. No caustics, no scattering, no spectra. X-ray-like density plates are a visual metaphor here, not a measurement.

## Cost

One shader, five textures uploaded per frame. Cheap next to the passes: the per-frame cost is mostly painting the five layers.

## Tests

Unit: zero extinction passes everything; transmittance falls monotonically with density; e^−5 at density 1, extinction 5; tint scales; inputs clamp. Browser (`tests/browser/transmission.html`): zero extinction means full transmission of the backlight; density reduces output for constant light; zero backlight gives only the front reflection; a red tint passes red and blocks blue; output is opaque and finite; coverage confines the plate; seeks repeat.

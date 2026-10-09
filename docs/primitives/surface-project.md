# surfaceProject

`surfaceProject({width, height, surface, albedo, image, quad, occlusion, intensity, ...})` returns a painter `(ctx, t)` that throws a picture onto a flat surface in a photographed room, as light. `squareToQuad`, `invert3`, `applyHomography` and `assertQuad` are the pure geometry.

## The model

In linear light:

```
out = surface + albedo · light
albedo = clamp(albedoPlate · albedoGain, 0, 1)        (the surface itself if no plate)
light = intensity · colour · content(uv) · edge(uv) · hotspot(uv) · (1 − occlusion)
```

Projected light adds to what's already on the wall, scaled by how much the wall reflects. Dark joints and moss take less of the picture than pale stone, so the wall's texture shows through. Projected black adds nothing: the surface comes out bit-identical (the shader returns the source pixel untouched where no light arrives, so this is exact, not within a tolerance).

`albedo` is a separate painter because dimming the room shouldn't darken the stone's paint. SANCTUARY's room is the daylight photo at 22% brightness; the albedo is the same photo at full brightness. The first take estimated albedo from the dimmed room and the projection was nearly invisible. The photo's brightness standing in for reflectance is an approximation (a wall in shadow looks dark too) and `albedoGain` scales it.

## Geometry

`quad` is the projected frame's four corners on screen, clockwise from top-left. `squareToQuad` builds the homography from the unit square to the quad (Heckbert's closed form); the shader uses its inverse to map each screen pixel to the projector frame's uv, and pixels outside 0-1 get no light. That's exact for a plane. A wall with relief (SANCTUARY's niches) is treated as its plane, so the picture doesn't bend into the niches; non-planar surfaces would need a UV or depth map and are out of scope. A quad with three corners in a line, a bow tie, non-finite numbers or no area throws a readable error at construction or at render time instead of producing NaNs.

The quad can be a function of t. SANCTUARY's camera push maps the authored corners through the same similarity transform as the room, so the projection stays on the wall.

## Occlusion

An explicit matte, alpha = blocked, in screen space. SANCTUARY's colonnettes stand in front of the wall in the beam: they catch the picture themselves and throw shadows on the wall offset toward the far end (the projector is nearer the camera, a little to its left). So the matte is their silhouettes, authored as capital, shaft and base boxes, offset by depth. Nothing is inferred from the picture.

## Defaults

`edge` 0.012 feathers the frame's edge like a projector gate slightly out of focus. `hotspot` 0.35 darkens toward the frame corners. `softness` blurs the content a little (focus). `color` is a warm lamp. All small on purpose: the frame's hard edge in perspective is what tells you it's a projection.

## Content matters

The first content was slow ocean footage. Dark, low-contrast water gave too little light to read as a picture on stone; it looked like a stain. A Doré engraving (mostly paper, with dark linework) projects as strong light with a legible image, and the water stays in the A/B as the second source.

## Cost

One shader, four textures (surface, content, occlusion, albedo), uploaded each frame. 362 ms per 2560×1440 frame on SwiftShader in the browser test, most of it uploads. GPU memory: three 2560×1440 RGBA8 textures (14.7 MB each) and a 1280×720 content texture (3.7 MB). SANCTUARY, with filmPass after it, rendered in 197 s (72 MB).

## Tests

Unit: corners land on the quad and invert back; a parallelogram has no perspective terms; equal steps in u shrink toward the far side; degenerate quads throw. Browser (`tests/browser/surface-project.html`): a 4×4 grid's cells land in order where the homography says; projected black leaves the surface exactly unchanged; intensity 0 is the raw surface exactly and outside pixels are untouched at full intensity; joints take less light than stone, a bright block more; occlusion removes light behind the matte and only there; seeks repeat; degenerate quads fail readably; cost.

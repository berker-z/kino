# temporalScan

`temporalScan(ctx, t, {width, height, axis, bands, span, direction, offset, source})` builds one frame out of strips of a source, each strip sampled at a different source time. One edge of the frame sees an earlier moment than the other, so anything moving turns into a shape stretched or bent through time.

This is the temporal technique (time displacement), not the optical slit-scan of 2001's Stargate, where a slit moves during one long exposure. Different algorithm, different look; the optical one is a possible later experiment.

## The rule

For strip `i` of `n`, with its centre at `u = (i + 0.5) / n` along the axis:

```
sampleTime = t − offset − span · u          direction 1  (far end earliest)
sampleTime = t − offset − span · (1 − u)    direction −1 (near end earliest)
```

With `span` 0 every strip shows `t − offset`, which is the ordinary source. `scanStrips` returns the strips and their times without drawing, and is what the unit tests check: whole-pixel edges, no gaps or overlaps, neighbours exactly `span / n` apart.

The source is `(ctx, sourceTime, strip)`. It must be a pure function of `sourceTime`, including any camera inside it. It gets the strip rectangle so it can skip what the clip would throw away.

## Why stateless

The obvious implementations keep a ring buffer of past frames, or a feedback texture. Both depend on which frames were rendered before, which HyperFrames doesn't promise. Here frame `t` is the source painted at a fixed set of other times, each clipped to its strip, so seeking in any order gives the same picture and there's nothing to allocate. The cost is one source paint per strip.

That turned out cheap for procedural sources. AN OBJECT OUTSIDE TIME uses 256 vertical strips, 180 horizontal bands, and 48 × 96 nested strips during its handover; the whole 9 s rendered at 2560×1440 in 9 s of wall time. For a source that's expensive to paint (a photo pipeline, a whole composition) the answer would be caching a bounded number of sampled frames and cropping strips from them. That isn't built: a 2560×1440 RGBA frame is about 14 MB, so 64 of them is nearly 1 GB, and footage would want offline frame extraction anyway.

## Raster limits

Strips have hard edges, so a fast-changing thing (the turning bar) shows small steps between strips. 96 strips made visible stair-steps on a 1200 px bar; 256 mostly hides them. With `span` 0, antialiased curves can differ slightly from the unclipped source on strip edges, because Chrome rasterizes a clipped antialiased path a little differently: 35 of 38,400 pixels in the test, all on the edge of a circle. Flat fills and pixel-aligned lines match exactly.

## Nesting

A scan's source can be another scan. The piece hands a horizontal scan over to a vertical one by making each vertical band's source a horizontal scan at that band's time, for about a second, so the two shears cross instead of cutting. It's a pattern in the composition, not an option on the function.

## Tests

`tests/languages.test.ts` (strip maths) and `tests/browser/temporal-scan.html`: span 0 equals the source, strips encode their own times as colour, axis and direction, out-of-order seeks.

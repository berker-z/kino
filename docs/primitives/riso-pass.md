# risoPass

A two-ink risograph print as a WebGL pass. The composition paints two grayscale separations every frame, one canvas per drum, where white means full ink. The pass prints them onto paper. `compositions/risograph` is the reference.

```js
Kino.risoPass(stage, tl, {
  width, height, duration, fps,
  inkA: Kino.risoInks.fluorescentPink, inkB: Kino.risoInks.blue, paper: "#F3EEE3",
  paint: (pink, blue, t) => { /* draw white where each ink should print */ },
});
```

What it does, and why:

- **A halftone screen per ink**, at 15° and 75° by default. Dot area matches density (radius is √(d/π) in cell units), so tones stay correct. With different angles the two screens form a fine rosette. With the same angle they beat into stripes. Densities above `solid` print as flat ink, like real riso solids.
- **Misregistration.** Each drum gets its own offset. Keep it fixed for a whole piece, like one print run. Jittering it per frame is authentic for flipbooks but reads as the jitter Berker dislikes, so it's left off.
- **Uneven ink.** Fine speckle where the drum starved and soft blotches where ink pooled, both seeded. `grain` scales both.
- **Overprint.** Inks multiply over the paper, so pink over blue goes purple. This is most of the look; design for where the two inks meet.
- **Paper.** A faint two-scale texture on the paper colour.

The halftone grid is fixed to the page while content moves under it, so moving edges change dot sizes instead of the dots themselves moving. At a 9 px cell (at 2560 wide) that reads as print texture. Smaller cells started to crawl.

Plates for an ink are `preparePlate` output, inverted (dark in the photo = ink). Draw them with `ctx.filter = "invert(1)"` into a separation.

Shapes that look most riso: big flat type in one ink over a halftone gradient blob in the other, and rows of type in both inks crossing each other.

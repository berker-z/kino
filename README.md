# kino

A motion design library for [HyperFrames](https://github.com/heygen-com/hyperframes), which renders HTML pages into video. kino is what my music videos are built from: it reads the song, draws things in time with it, and makes the picture look printed, exposed or shown on a tube instead of on a monitor.

<table>
  <tr>
    <td><img src="examples/styles/stills/blueprint-2.jpg" alt="blueprint: a pen drawing of a microphone on a blueprint sheet"></td>
    <td><img src="examples/styles/stills/cyanotype-3.jpg" alt="cyanotype: a radio dish in Prussian blue, filmed off a Trinitron"></td>
  </tr>
  <tr>
    <td><img src="examples/styles/stills/oscilloscope-2.jpg" alt="phosphor: the song drawn by an electron beam on an amber scope"></td>
    <td><img src="examples/styles/stills/risograph-0.jpg" alt="riso: a two-ink pink and blue print with the title"></td>
  </tr>
</table>

Those are four looks rendering the same short piece, "The Future of Speech": blueprint, cyanotype, phosphor and riso. `examples/styles/index.html` has more stills from each.

## How it works

Every frame goes through the same pipeline. Signals read the song (beats, bars, drum hits, spectrum, bass). Sources paint a grayscale picture. Arrangements move it in time. A pass turns the grayscale into a medium: ink on paper, phosphor, a two-colour riso print, an ordered dither.

The rule that holds it together is that sources only paint grayscale and the pass decides what that becomes. So any source goes through any pass, and a look is just a pass setting plus a palette and some motion rules. blueprint's pen drawings, for example, run under the cyanotype material with no library changes.

Everything is a pure function of time. HyperFrames seeks frames in any order, so nothing is allowed to remember the previous frame, and anything time-driven paints through `timeDriver` instead of GSAP callbacks (which don't fire during a render).

`docs/architecture.md` goes through every piece. `docs/lessons.md` is what broke along the way and why the defaults are what they are.

## Layout

```
src/            the library, bundled to window.Kino
  signals/      beatMap, bandEnergy, bassFollower, ...
  sources/      pen, beam, sunprint, spectrumFeed, htmlPlate, painters
  arrange/      sheetCamera, printRun, registerDrift, tornWipe, lensPass
  passes/       screenPass (WebGL), risoPass, ditherPass
  looks/        cyanotype, blueprint, phosphor, riso, ...
scripts/        build, plus Python for spectrum, raw samples and dithering footage
compositions/   each one a standalone HyperFrames project
research/       teardowns of other people's videos, and experiments
tools/dither/   a playground for the dither settings
```

## Running it

You need Node, the `hyperframes` CLI with a headless Chrome that has WebGL2, and Python with librosa and numpy for the audio scripts.

```sh
npm install
npm test             # unit tests for the clock, signals and arrangements
npm run build        # bundles src/ into every composition's vendor/
scripts/smoke.sh     # end to end on a synthetic composition, no music needed
```

Then `cd compositions/<name>` and use `hyperframes snapshot` or `hyperframes render`. On Linux under Wayland, unset `WAYLAND_DISPLAY` for anything that uses `screenPass`, or headless Chrome comes up without WebGL and the canvas renders black. `scripts/smoke.sh` also wants ImageMagick.

The music and its analysis aren't in the repo, so most compositions won't render as they are. Run `scripts/spectrum.py` and `scripts/samples.py` on your own track to make the data they expect. `smoke` is the one that runs from a clean clone.

## Status

A personal library, built for my own videos and changing as they need it. The canvas looks are where the work is. The `dom/` pieces (GSAP on HTML elements) are from the first round and still work, but nothing new uses them.

## License

MIT, see [LICENSE](LICENSE).

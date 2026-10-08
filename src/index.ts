// Public surface of the library, exposed in compositions as `window.Kino`.

export {whenReady} from "./runtime/setup";
export {getGsap} from "./runtime/gsap";

export {aesthetics, applyAesthetic, blueprint, brutalistEditorial, cyanotype, nordTerminal, phosphor, riso, teletextTV} from "./looks";
export type {MotionAesthetic, AestheticName} from "./looks";

export {fade} from "./dom/motion/fade";
export {slide} from "./dom/motion/slide";
export {stagger} from "./dom/motion/stagger";
export {maskReveal, wipe} from "./dom/motion/mask-reveal";
export {typewriter, blink} from "./dom/motion/typewriter";

export {grain} from "./dom/effects/grain";
export {grid} from "./dom/effects/grid";
export {vignette} from "./dom/effects/vignette";

export {animatedText, fitToWidth} from "./dom/components/animated-text";
export {heroTitle} from "./dom/components/hero-title";

export {heroReveal} from "./dom/scenes/hero-reveal";
export type {HeroRevealOptions} from "./dom/scenes/hero-reveal";

export {signalDither} from "./looks";
export {signalPalettes} from "./looks/signal-dither";
export {timeDriver} from "./runtime/time-driver";
export {ditherCanvas} from "./passes/dither-canvas";
export type {DitherPost, DitherPainter} from "./passes/dither-canvas";
export {crt} from "./dom/effects/crt";
export {screenPass, prussianRamp, blueprintRamp, phosphorRamp, makeRamp} from "./passes/screen-pass";
export type {ScreenPassOptions, ScreenPainter, ScreenSettings, ScreenLook} from "./passes/screen-pass";
export {risoPass, risoInks} from "./passes/riso-pass";
export type {RisoPassOptions, RisoPainter, RisoSettings} from "./passes/riso-pass";
export {preparePlate, sunprint} from "./sources/plates";
export type {Plate, PreparePlateOptions} from "./sources/plates";
export {tornWipe} from "./arrange/torn-wipe";
export type {CanvasScene, TornWipeOptions} from "./arrange/torn-wipe";
export {lensPass, lensPassFx} from "./arrange/lens-pass";
export type {LensPassOptions} from "./arrange/lens-pass";
export {wipeText, caption, haloInk} from "./sources/type";
export type {WipeTextOptions, CaptionOptions} from "./sources/type";
export {networkTree} from "./sources/network-tree";
export type {NetworkTreeOptions, NetworkNode} from "./sources/network-tree";
export {printStrip} from "./arrange/print-strip";
export type {PrintStripOptions} from "./arrange/print-strip";
export {beatMap} from "./signals/beat-map";
export type {AudioMap, BeatMap, Drum} from "./signals/beat-map";
export * as paint from "./sources/painters";
export {hash, noise2} from "./utils/noise";
export {beatTicks, tickAt} from "./signals/beat-map";
export {spectrumFeed} from "./sources/spectrum-feed";
export type {Spectrum, SpectrumFeed, SpectrumFeedOptions} from "./sources/spectrum-feed";

// Signals
export {bandEnergy, bassFollower, decodeSamples, autoGain} from "./signals/audio";
export type {Samples, SampleAsset} from "./signals/audio";
// Sources
export * as pen from "./sources/pen";
export {beam, beamText} from "./sources/beam";
export type {BeamOptions} from "./sources/beam";
export {htmlPlate, drawPart} from "./sources/html-plate";
export type {HtmlPlate, HtmlPlateOptions, PartBox} from "./sources/html-plate";
export {teletext, teletextColors, sixels, sixelText} from "./sources/teletext";
export type {Cell as TeletextCell, Page as TeletextPage} from "./sources/teletext";
// Arrangement
export {sheetCamera} from "./arrange/sheet-camera";
export type {Shot} from "./arrange/sheet-camera";
export {printRun, registerDrift} from "./arrange/print-run";

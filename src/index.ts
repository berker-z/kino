// Public surface of the library, exposed in compositions as `window.Kino`.

export {whenReady} from "./runtime/setup";
export {getGsap} from "./runtime/gsap";

export {aesthetics, applyAesthetic, brutalistEditorial, cyanotype, nordTerminal} from "./aesthetics";
export type {MotionAesthetic, AestheticName} from "./aesthetics";

export {fade} from "./motion/fade";
export {slide} from "./motion/slide";
export {stagger} from "./motion/stagger";
export {maskReveal, wipe} from "./motion/mask-reveal";
export {typewriter, blink} from "./motion/typewriter";

export {grain} from "./effects/grain";
export {grid} from "./effects/grid";
export {vignette} from "./effects/vignette";

export {animatedText, fitToWidth} from "./components/animated-text";
export {heroTitle} from "./components/hero-title";

export {heroReveal} from "./scenes/hero-reveal";
export type {HeroRevealOptions} from "./scenes/hero-reveal";

export {signalDither} from "./aesthetics";
export {signalPalettes} from "./aesthetics/signal-dither";
export {timeDriver} from "./runtime/time-driver";
export {ditherCanvas} from "./effects/dither-canvas";
export type {DitherPost, DitherPainter} from "./effects/dither-canvas";
export {crt} from "./effects/crt";
export {screenPass, prussianRamp} from "./effects/screen-pass";
export type {ScreenPassOptions, ScreenPainter, ScreenSettings, ScreenLook} from "./effects/screen-pass";
export {preparePlate, sunprint} from "./plates/plates";
export type {Plate, PreparePlateOptions} from "./plates/plates";
export {tornWipe} from "./transitions/torn-wipe";
export type {CanvasScene, TornWipeOptions} from "./transitions/torn-wipe";
export {lensPass, lensPassFx} from "./transitions/lens-pass";
export type {LensPassOptions} from "./transitions/lens-pass";
export {wipeText, caption, haloInk} from "./components/canvas-type";
export type {WipeTextOptions, CaptionOptions} from "./components/canvas-type";
export {networkTree} from "./visuals/network-tree";
export type {NetworkTreeOptions, NetworkNode} from "./visuals/network-tree";
export {printStrip} from "./visuals/print-strip";
export type {PrintStripOptions} from "./visuals/print-strip";
export {beatMap} from "./audio/beat-map";
export type {AudioMap, BeatMap, Drum} from "./audio/beat-map";
export * as paint from "./visuals/painters";
export {hash, noise2} from "./utils/noise";
export {beatTicks, tickAt} from "./audio/beat-map";
export {spectrumFeed} from "./visuals/spectrum-feed";
export type {Spectrum, SpectrumFeed, SpectrumFeedOptions} from "./visuals/spectrum-feed";

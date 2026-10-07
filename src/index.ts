// Public surface of the library, exposed in compositions as `window.Kino`.

export {whenReady} from "./runtime/setup";
export {getGsap} from "./runtime/gsap";

export {aesthetics, applyAesthetic, brutalistEditorial, nordTerminal} from "./aesthetics";
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
export {beatMap} from "./audio/beat-map";
export type {AudioMap, BeatMap, Drum} from "./audio/beat-map";
export * as paint from "./visuals/painters";
export {hash, noise2} from "./utils/noise";
export {beatTicks, tickAt} from "./audio/beat-map";
export {spectrumFeed} from "./visuals/spectrum-feed";
export type {Spectrum, SpectrumFeed, SpectrumFeedOptions} from "./visuals/spectrum-feed";

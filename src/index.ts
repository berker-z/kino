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
export {ditherPass, ditherer, ditherPalettes, ditherPreps, ditherSteps} from "./passes/dither-pass";
export type {DitherMethod, DitherPrep, DitherSettings, Ditherer, DitherPost as DitherPassPost, DitherPassPainter, DitherPassOptions} from "./passes/dither-pass";
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
export {clamp, progress, smooth, easeOut, easeInOut} from "./utils/timing";
export type {HtmlPlate, HtmlPlateOptions, PartBox, CharBox} from "./sources/html-plate";
export {teletext, teletextColors, sixels, sixelText} from "./sources/teletext";
export type {Cell as TeletextCell, Page as TeletextPage} from "./sources/teletext";
// Arrangement
export {sheetCamera} from "./arrange/sheet-camera";
export type {Shot} from "./arrange/sheet-camera";
export {printRun, registerDrift} from "./arrange/print-run";
export {doubleExposure} from "./arrange/double-exposure";
export type {DoubleExposure, DoubleExposureOptions, MaskMode, ExposureBlend} from "./arrange/double-exposure";
export {fragmentGrid, inkedFragments, drawFragments, lineProgress, lineRise} from "./arrange/type-reveal";
export type {Fragment, FragmentOptions, LineRiseOptions} from "./arrange/type-reveal";
export {plateKeys, skyRegion, thresholdWindow} from "./arrange/self-matte";
export type {PlateKeys, PlateKeyOptions} from "./arrange/self-matte";
export {letterStrokes, classifyStrokes, drawStroke} from "./arrange/letter-strokes";
export type {StrokeKind, StrokePiece, LetterStrokes, StrokeOptions, WipeDirection} from "./arrange/letter-strokes";
export {temporalScan, scanStrips} from "./arrange/temporal-scan";
export type {TimeSource, Strip, TemporalScanOptions} from "./arrange/temporal-scan";
// Passes (later additions)
export {filmPass, filmDefaults, gateWeave, thresholdFilter} from "./passes/film-pass";
export type {FilmPassOptions, FilmSettings, FilmPainter} from "./passes/film-pass";
export {digicamPass, digicamDefaults} from "./passes/digicam-pass";
export type {DigicamPassOptions, DigicamSettings, DigicamPainter} from "./passes/digicam-pass";
export {shutterIntegrate, exposureSamples} from "./arrange/shutter";
export type {ShutterIntegrate, ShutterOptions, ShutterSource, ExposureOptions, ExposureSample} from "./arrange/shutter";
export {copyGenerations, copyStep, copyDefaults, densityOf, densityCanvas} from "./sources/xerox";
export type {CopyOptions, CopyGenerationsOptions} from "./sources/xerox";
export {surfaceProject, squareToQuad, invert3, applyHomography, assertQuad} from "./arrange/surface-project";
export type {SurfaceProject, SurfaceProjectOptions, Quad, Point, Mat3} from "./arrange/surface-project";
export {infraredPass, infraredDefaults} from "./passes/infrared-pass";
export type {InfraredPassOptions, InfraredSettings, InfraredPainter} from "./passes/infrared-pass";
export {transmissionComposite, transmittance} from "./arrange/transmission";
export type {Transmission, TransmissionOptions} from "./arrange/transmission";

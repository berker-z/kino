import type {Spectrum} from "../sources/spectrum-feed";

// Reading the song beyond the beat grid: band energy from the spectrum, and
// raw samples for anything that draws the waveform itself. Everything is a
// pure function of time, so it stays seekable.

/** Mean energy (0-1) of spectrum bands [from, to) at time t, unsmoothed. */
export function bandEnergy(spectrum: Spectrum, t: number, from = 0, to = 8): number {
  const f = spectrum.frames[Math.round(t * spectrum.fps)] ?? [];
  let s = 0;
  for (let i = from; i < to; i++) s += f[i] ?? 0;
  return s / (to - from);
}

/**
 * A bass follower for driving physical parts (a speaker cone): the low bands
 * averaged, lightly smoothed across neighbouring frames, normalised to the
 * song's own range, and interpolated between spectrum frames.
 */
export function bassFollower(spectrum: Spectrum, {bands = 8} = {}): (t: number) => number {
  const raw = spectrum.frames.map((f) => f.slice(0, bands).reduce((a, v) => a + v, 0) / bands);
  const sm = raw.map((_, i) => (raw[i - 1] ?? raw[i]) * 0.25 + raw[i] * 0.5 + (raw[i + 1] ?? raw[i]) * 0.25);
  const lo = Math.min(...sm);
  const hi = Math.max(...sm);
  const track = sm.map((v) => (v - lo) / (hi - lo));
  return (t) => {
    const f = t * spectrum.fps;
    const i = Math.floor(f);
    const k = f - i;
    return (track[i] ?? 0) * (1 - k) + (track[i + 1] ?? 0) * k;
  };
}

/** Raw samples as written by scripts/samples.py (int8, base64, two channels). */
export type SampleAsset = {rate: number; length: number; l: string; r: string};

export type Samples = {
  rate: number;
  left: Float32Array;
  right: Float32Array;
  /** Mid (L+R)/2 at sample index i, 0 outside the track. */
  mono: (i: number) => number;
};

export function decodeSamples(asset: SampleAsset): Samples {
  const decode = (s: string) => {
    const bin = atob(s);
    const out = new Float32Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = ((bin.charCodeAt(i) << 24) >> 24) / 127;
    return out;
  };
  const left = decode(asset.l);
  const right = decode(asset.r);
  return {rate: asset.rate, left, right, mono: (i) => (left[i | 0] ?? 0) * 0.5 + (right[i | 0] ?? 0) * 0.5};
}

/**
 * Auto gain, like a scope's auto-set, so quiet passages still fill the
 * screen: target / RMS over the last `window` seconds, sampled at `step`
 * second boundaries so it doesn't pump with every word.
 */
export function autoGain(samples: Samples, t: number, {target = 0.32, window = 0.5, step = 0.25, min = 1, max = 5} = {}): number {
  const end = Math.floor((Math.round(t / step) * step) * samples.rate);
  const n = samples.rate * window;
  let s = 0;
  for (let i = end - n; i < end; i += 8) {
    const v = samples.mono(i);
    s += v * v;
  }
  const rms = Math.sqrt(s / (n / 8));
  return Math.min(max, Math.max(min, target / Math.max(rms, 1e-3)));
}

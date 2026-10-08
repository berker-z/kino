#!/usr/bin/env python3
"""Raw audio samples for compositions that draw the waveform itself (the
oscilloscope). Writes window.<NAME> = {rate, length, l, r}: both channels as
int8 at a reduced rate, base64, normalised so the 99.7th percentile peak is
full scale. Read it with Kino.decodeSamples.

  python3 scripts/samples.py audio/track.opus -o compositions/x/assets/scope.js \
      --seconds 27 --rate 24000 --js-global SCOPE

27 s at 24 kHz is about 1.7 MB. Decoding goes through ffmpeg.
"""
import argparse
import base64
import json
import subprocess

import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--seconds", type=float, default=None)
    ap.add_argument("--rate", type=int, default=24000)
    ap.add_argument("--js-global", default="SCOPE")
    args = ap.parse_args()

    cmd = ["ffmpeg", "-v", "error", "-i", args.audio]
    if args.seconds:
        cmd += ["-t", str(args.seconds)]
    cmd += ["-ac", "2", "-ar", str(args.rate), "-f", "s16le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float32) / 32768
    peak = np.percentile(np.abs(a), 99.7)
    a = np.clip(a / peak, -1, 1)
    q = lambda x: base64.b64encode((x * 127).round().astype(np.int8).tobytes()).decode()
    data = {"rate": args.rate, "length": len(a), "l": q(a[:, 0]), "r": q(a[:, 1])}
    with open(args.out, "w") as f:
        f.write(f"window.{args.js_global}=" + json.dumps(data) + ";")
    print(f"{len(a)} samples -> {args.out}")


if __name__ == "__main__":
    main()

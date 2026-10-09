#!/usr/bin/env python3
"""Dither a photo or a piece of footage. Image in, image out; video in, video
out (sound kept).

  python3 scripts/dither.py photo.jpg -o out.png
  python3 scripts/dither.py clip.mp4 -o out.mp4 --palette ice-3 --scale 3
  python3 scripts/dither.py clip.mp4 -o out.mp4 --method floyd-steinberg --hyst 0.35
  python3 scripts/dither.py photo.jpg -o out.png --palette "#101010,#6b5a44,#e8dcc6"

Defaults: Bayer 8, "punch" prep, three-tone sepia, 2x2 pixels, output at the
input's size (pass --size 2560x1440 to fit and crop to a frame).

Methods: bayer-8 (default), blue-noise, bayer-4, halftone, lines,
floyd-steinberg, atkinson. The threshold methods are stable in motion by
construction. Error diffusion boils on footage unless you give it --hyst
(0.3 to 0.4 is a good range), which holds a pixel's tone until the picture
clearly changes there.

Prep: punch (levels + local contrast + S-curve + sharpen), levels, none.
For footage, levels are measured once over the whole clip so the exposure
doesn't pump.

Amount: 1 (default) dithers to exactly the palette; lower adds in-between
tones along the palette's ramp so the pattern softens; 0 is a smooth
gradient map.

Palettes: sepia-2/3/4, ice-2/3, prussian-3, oxblood-3, phosphor-3, bone-2,
paper-3, or your own hex list, dark to light. The number of colours is the
number of tones.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import dither_engine as E  # noqa: E402

VIDEO = {".mp4", ".mov", ".webm", ".mkv", ".m4v", ".ogv", ".avi"}


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    num, den = map(int, s["r_frame_rate"].split("/"))
    return s["width"], s["height"], num / den


def fit_filter(size, iw, ih):
    """Scale-and-crop to WxH, or keep the input size."""
    if not size:
        return iw, ih, f"scale={iw}:{ih}"
    W, H = map(int, size.lower().split("x"))
    return W, H, f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}"


def gray_frames(path, vf, w, h):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"{vf},scale={w}:{h}:flags=area,format=gray", "-f", "rawvideo", "-"],
                         stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(w * h)
        if len(buf) < w * h:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w).astype(np.float32) / 255


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("--method", default="bayer-8")
    ap.add_argument("--palette", default="sepia-3")
    ap.add_argument("--prep", default="punch", choices=list(E.PREPS))
    ap.add_argument("--scale", type=int, default=2, help="screen pixels per dither pixel")
    ap.add_argument("--size", help="output WxH, fit and cropped (default: input size)")
    ap.add_argument("--amount", type=float, default=1.0, help="0 smooth gradient map ... 1 full dither (default)")
    ap.add_argument("--hyst", type=float, default=0.0, help="hysteresis for error diffusion on footage")
    ap.add_argument("--fps", type=float, help="output frame rate (default: input's)")
    ap.add_argument("--crf", type=int, default=14)
    args = ap.parse_args()

    src = Path(args.input)
    iw, ih, rate = probe(src)
    W, H, vf = fit_filter(args.size, iw, ih)
    # Dither at ceil(size / scale) and crop the upscaled result, so the output
    # is exactly the size asked for at any scale.
    w, h = -(-W // args.scale), -(-H // args.scale)
    n = len(E.palette_colors(args.palette))
    k = E.steps(n, args.amount)  # tone steps; k + 1 tones

    def render(g, prev=None, lo=None, hi=None):
        # The frame is sampled at w*scale x h*scale, which can overshoot W x H
        # by under one dither pixel; the crop below takes it back.
        gp = E.PREPS[args.prep](g, lo=lo, hi=hi) if args.prep != "none" else g
        idx = E.dither(gp, args.method, k + 1, prev=prev, hyst=args.hyst)
        return idx, np.ascontiguousarray(E.colorize(idx, args.palette, args.scale, k)[:H, :W])

    if src.suffix.lower() not in VIDEO:
        g = next(gray_frames(src, vf, w, h))
        _, rgb = render(g)
        subprocess.run(["magick", "-size", f"{W}x{H}", "-depth", "8", "rgb:-", args.out], input=rgb.tobytes(), check=True)
        print(f"{args.out}  {W}x{H}  {args.method}  {args.palette}")
        return

    # Levels for the whole clip, from every 15th frame.
    lo = hi = None
    if args.prep != "none":
        sample = np.stack([f for i, f in enumerate(gray_frames(src, vf, w, h)) if i % 15 == 0])
        lo, hi = np.percentile(sample, [1, 99])
    fps = args.fps or rate
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                            "-i", str(src), "-map", "0:v", "-map", "1:a?", "-c:a", "aac", "-b:a", "192k", "-shortest",
                            "-c:v", "libx264", "-crf", str(args.crf), "-preset", "medium", "-pix_fmt", "yuv420p", args.out], stdin=subprocess.PIPE)
    prev = None
    frames = 0
    for g in gray_frames(src, vf + (f",fps={args.fps}" if args.fps else ""), w, h):
        idx, rgb = render(g, prev if args.hyst else None, lo, hi)
        prev = idx
        enc.stdin.write(rgb.tobytes())
        frames += 1
    enc.stdin.close()
    enc.wait()
    print(f"{args.out}  {W}x{H}  {frames} frames  {args.method}  {args.palette}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Round two: a dither tool for any photo and any footage.

  python3 research/dither/round2.py stills
  python3 research/dither/round2.py footage

Stills read media/norm/*.png (made by exp.py), footage reads
media/footage/*.mp4. Everything goes to media/out2/.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))
import dither_engine as E  # noqa: E402

ROOT = Path(__file__).parent / "media"
OUT = ROOT / "out2"
W, H = 1920, 1080
w, h = W // 2, H // 2  # dither pixels are 2x2 at 1080p

PHOTOS = ["portrait", "night", "cat", "mountain", "car", "flower", "concert", "food", "astronaut", "statue", "dish", "hands", "crowd", "waves"]


def load_gray(path, ww=w, hh=h):
    raw = subprocess.run(["magick", str(path), "-colorspace", "gray", "-resize", f"{ww}x{hh}!", "-depth", "8", "gray:-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(hh, ww).astype(np.float32) / 255


def save(rgb, path):
    hh, ww, _ = rgb.shape
    subprocess.run(["magick", "-size", f"{ww}x{hh}", "-depth", "8", "rgb:-", str(path)], input=np.ascontiguousarray(rgb).tobytes(), check=True)


def stills():
    norm = ROOT / "norm"
    picks = ["portrait", "cat", "mountain", "night"]

    d = OUT / "s1-prep"; d.mkdir(parents=True, exist_ok=True)
    for n in picks:
        g = load_gray(norm / f"{n}.png")
        for p in E.PREPS:
            save(E.colorize(E.dither(E.PREPS[p](g), "blue-noise", 3), "sepia-3"), d / f"{n}--{p}.png")

    d = OUT / "s2-method"; d.mkdir(parents=True, exist_ok=True)
    for n in picks:
        g = E.PREPS["punch"](load_gray(norm / f"{n}.png"))
        for m in ["floyd-steinberg", "atkinson", "bayer-8", "blue-noise", "halftone", "lines"]:
            save(E.colorize(E.dither(g, m, 3), "sepia-3"), d / f"{n}--{m}.png")

    d = OUT / "s3-tones"; d.mkdir(parents=True, exist_ok=True)
    for n in ["portrait", "mountain"]:
        g = E.PREPS["punch"](load_gray(norm / f"{n}.png"))
        for pal in E.PALETTES:
            k = len(E.PALETTES[pal])
            save(E.colorize(E.dither(g, "blue-noise", k), pal), d / f"{n}--{pal}.png")

    d = OUT / "s4-everything"; d.mkdir(parents=True, exist_ok=True)
    for n in PHOTOS + ["dore-2-ref", "dore-0"]:
        g = E.PREPS["punch"](load_gray(norm / f"{n}.png"))
        save(E.colorize(E.dither(g, "blue-noise", 3), "sepia-3"), d / f"{n}--blue-noise.png")
        save(E.colorize(E.dither(g, "floyd-steinberg", 3), "sepia-3"), d / f"{n}--floyd-steinberg.png")
    print("stills done")


# --- footage ---------------------------------------------------------------------

METHODS = [
    ("floyd-steinberg", dict(method="floyd-steinberg")),
    ("fs-hysteresis", dict(method="floyd-steinberg", hyst=0.35)),
    ("bayer-8", dict(method="bayer-8")),
    ("blue-noise", dict(method="blue-noise")),
    ("halftone", dict(method="halftone")),
]


def frames(path):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-vf", f"scale={w}:{h},format=gray", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(w * h)
        if len(buf) < w * h:
            break
        yield np.frombuffer(buf, np.uint8).reshape(h, w).astype(np.float32) / 255


def encoder(path, ww=W, hh=H):
    return subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{ww}x{hh}", "-r", "30", "-i", "-",
                             "-c:v", "libx264", "-crf", "14", "-preset", "medium", "-pix_fmt", "yuv420p", str(path)], stdin=subprocess.PIPE)


def footage(palette="sepia-3"):
    d = OUT / "f-footage"; d.mkdir(parents=True, exist_ok=True)
    n = len(E.PALETTES[palette])
    stats = {}
    for clip in sorted((ROOT / "footage").glob("*.mp4")):
        name = clip.stem
        # Levels measured over the whole clip, not per frame, so exposure
        # doesn't pump.
        sample = np.stack(list(frames(clip))[::15])
        lo, hi = np.percentile(sample, [1, 99])
        encs = {m: encoder(d / f"{name}--{m}.mp4") for m, _ in METHODS}
        grid = encoder(d / f"{name}--grid.mp4", 1920, 720)
        prev_idx = {m: None for m, _ in METHODS}
        prev_g = None
        flips = {m: [] for m, _ in METHODS}
        boil = {m: [] for m, _ in METHODS}
        for g in frames(clip):
            gp = E.PREPS["punch"](g, lo=lo, hi=hi)
            still = None if prev_g is None else np.abs(gp - prev_g) < 0.01
            cells = [np.repeat(np.repeat((np.clip(gp, 0, 1) * 255).astype(np.uint8)[..., None], 3, 2), 2, 0).repeat(2, 1)]
            for m, kw in METHODS:
                kw = dict(kw)
                hyst = kw.pop("hyst", 0.0)
                idx = E.dither(gp, kw["method"], n, prev=prev_idx[m] if hyst else None, hyst=hyst)
                if prev_idx[m] is not None:
                    ch = idx != prev_idx[m]
                    flips[m].append(ch.mean())
                    if still.any():
                        boil[m].append(ch[still].mean())
                prev_idx[m] = idx
                rgb = E.colorize(idx, palette)
                encs[m].stdin.write(rgb.tobytes())
                cells.append(rgb)
            prev_g = gp
            # 3x2 grid of 1:1 centre crops: prepped source, then each method.
            cy, cx = H // 2 - 180, W // 2 - 320
            crops = [c[cy:cy + 360, cx:cx + 640] for c in cells]
            grid.stdin.write(np.vstack([np.hstack(crops[:3]), np.hstack(crops[3:])]).tobytes())
        for e in list(encs.values()) + [grid]:
            e.stdin.close(); e.wait()
        stats[name] = {m: {"flips": float(np.mean(flips[m])), "boil": float(np.mean(boil[m]))} for m, _ in METHODS}
        print(name, {m: f"{v['flips']*100:.1f}/{v['boil']*100:.1f}" for m, v in stats[name].items()})
    (OUT / "footage-stats.json").write_text(json.dumps(stats, indent=1))


if __name__ == "__main__":
    {"stills": stills, "footage": footage}[sys.argv[1]]()

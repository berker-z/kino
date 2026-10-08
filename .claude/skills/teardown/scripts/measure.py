#!/usr/bin/env python3
"""Measure a reference video's look, or compare our renders against it.

  measure.py grade   SRC.mp4                     luma -> color curve (low spread = gradient map)
  measure.py pitch   SRC.mp4 TIME                texture pitch (x, y) and per-channel phase
  measure.py regions SRC.mp4 TIME [ours.png ...] stripe contrast by region, ref vs renders

Frames are read through ffmpeg rawvideo (no PIL needed). Region boxes assume
3840x2160; scale them for other sizes.
"""
import subprocess
import sys

import numpy as np


def frame(path, t=None, w=3840, h=2160):
    cmd = ["ffmpeg", "-v", "error"] + (["-ss", str(t)] if t is not None else []) + [
        "-i", path, "-frames:v", "1", "-vf", f"scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(float)


def grade(src):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-vf", "fps=3,scale=480:270",
                          "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, 3).astype(float)
    luma = a @ [0.2126, 0.7152, 0.0722]
    print("luma percentiles 1/5/25/50/75/95/99:", np.percentile(luma, [1, 5, 25, 50, 75, 95, 99]).round(0))
    for lo in range(0, 256, 16):
        m = (luma >= lo) & (luma < lo + 16)
        if m.sum() > 50:
            c = a[m].mean(0)
            print("%3d-%3d  #%02X%02X%02X  spread %.1f" % (lo, lo + 16, *c.astype(int), a[m].std(0).mean()))


def pitch(src, t):
    a = frame(src, t)

    def peak(profile):
        p = profile - np.convolve(profile, np.ones(31) / 31, "same")
        p = p[20:-20]
        f = np.abs(np.fft.rfft(p * np.hanning(len(p))))
        fr = np.fft.rfftfreq(len(p))
        k = np.argmax(f[5:]) + 5
        return 1 / fr[k], k

    for name, (y0, y1, x0, x1) in {"center": (900, 1260, 1400, 2440), "left": (900, 1260, 60, 1100),
                                   "right": (900, 1260, 2740, 3780), "top": (40, 400, 1400, 2440)}.items():
        reg = a[y0:y1, x0:x1].mean(2)
        px, _ = peak(reg.mean(0))
        py, _ = peak(reg.mean(1))
        print(f"{name:6} x-pitch {px:.2f}px  y-pitch {py:.2f}px")
    reg = a[900:1260, 1400:2440]
    profiles = [reg[:, :, c].mean(0) for c in range(3)]
    _, k = peak(profiles[1])
    phases = [float(np.angle(np.fft.rfft((p - np.convolve(p, np.ones(31) / 31, "same"))[20:-20])[k])) for p in profiles]
    print("R/G/B phase at that pitch:", [round(x, 2) for x in phases], "(equal = luminance-only texture)")


BOXES = {"center": (900, 1260, 1700, 2140), "top": (300, 600, 1500, 2300),
         "left": (900, 1260, 200, 640), "right": (900, 1260, 3200, 3640)}


def contrast(a, box):
    y0, y1, x0, x1 = box
    r = a[y0:y1, x0:x1].mean(2)
    sx = np.apply_along_axis(lambda v: np.convolve(v, np.ones(23) / 23, "same"), 1, r)
    sy = np.apply_along_axis(lambda v: np.convolve(v, np.ones(12) / 12, "same"), 0, r)
    return (r - sx)[:, 15:-15].std(), (r - sy)[15:-15, :].std(), r.mean()


def regions(src, t, ours):
    rows = [("ref", frame(src, t))] + [(p.split("/")[-1][:18], frame(p)) for p in ours]
    for label, a in rows:
        cells = []
        for name, box in BOXES.items():
            x, y, m = contrast(a, box)
            cells.append(f"{name}: x{x:.1f} y{y:.1f} m{m:.0f}")
        print(f"{label:18}", "  ".join(cells))


if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    {"grade": lambda: grade(args[0]), "pitch": lambda: pitch(args[0], args[1]),
     "regions": lambda: regions(args[0], args[1], args[2:])}[cmd]()

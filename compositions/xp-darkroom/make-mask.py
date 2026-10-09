#!/usr/bin/env python3
# Cuts the bust out of its studio backdrop: assets/figure.jpg ->
# assets/figure-mask.png (white, coverage in alpha). Run once; the
# composition only reads the PNG. The Getty photo is pale marble on a
# graded grey sweep, so a threshold against a smoothed estimate of the
# backdrop, a close, a hole fill and the largest blob is enough. No
# segmentation model on purpose: this is a fixture, not a feature.
#
#   python3 make-mask.py            (needs numpy, scipy, ImageMagick)
import subprocess, numpy as np
from scipy import ndimage as nd

src, out = "assets/figure.jpg", "assets/figure-mask.png"
w, h = map(int, subprocess.check_output(["magick", "identify", "-format", "%w %h", src]).split())
s = 2  # work at half size, scale the soft mask back up
sw, sh = w // s, h // s
raw = subprocess.check_output(["magick", src, "-resize", f"{sw}x{sh}!", "-depth", "8", "rgb:-"])
rgb = np.frombuffer(raw, np.uint8).reshape(sh, sw, 3).astype(np.float32) / 255
g = rgb.mean(axis=2)
# Marble is warm and the sweep is neutral grey, so warmth catches the
# shaded side of the face, which is no brighter than the backdrop.
warm = rgb[..., 0] - rgb[..., 2]

# The backdrop is a smooth vertical-ish gradient: estimate it from the
# outer columns, row by row, and call anything clearly brighter (or
# clearly warmer) marble.
edge = np.concatenate([g[:, :sw // 12], g[:, -sw // 12:]], axis=1)
back = nd.gaussian_filter1d(np.median(edge, axis=1), 8)[:, None]
wback = np.median(np.concatenate([warm[:, :sw // 12], warm[:, -sw // 12:]], axis=1))
fg = (g > back + 0.10) | (warm > wback + 0.035)
# The black display pin under the bust is darker than the backdrop; ignore it.
fg = nd.binary_closing(fg, iterations=3)
fg = nd.binary_fill_holes(fg)
fg = nd.binary_opening(fg, iterations=2)
lab, n = nd.label(fg)
if n:
    sizes = nd.sum(fg, lab, range(1, n + 1))
    fg = lab == (1 + int(np.argmax(sizes)))
soft = nd.gaussian_filter(fg.astype(np.float32), 1.2)
a = (np.clip(soft, 0, 1) * 255).astype(np.uint8)
print(f"coverage {fg.mean():.3f} of frame, {n} blobs before pick")
subprocess.run(["magick", "-size", f"{sw}x{sh}", "-depth", "8", "gray:-", "-resize", f"{w}x{h}!",
                "-background", "white", "-alpha", "shape", out], input=a.tobytes(), check=True)

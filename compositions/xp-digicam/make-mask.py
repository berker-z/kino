#!/usr/bin/env python3
# Cuts the white chair out of its garden: assets/chair.jpg ->
# assets/chair-mask.png (white, coverage in alpha). Run once; the
# composition only reads the PNG. White plastic against grass and leaves
# separates on saturation and brightness alone, so: low saturation and
# bright, the largest blob, small holes filled (the backrest's slots are
# big holes and stay open). A fixture, not a feature: no segmentation.
#
#   python3 make-mask.py            (needs numpy, scipy, ImageMagick)
import subprocess, numpy as np
from scipy import ndimage as nd

src, out = "assets/chair.jpg", "assets/chair-mask.png"
w, h = map(int, subprocess.check_output(["magick", "identify", "-format", "%w %h", src]).split())
raw = subprocess.check_output(["magick", src, "-depth", "8", "rgb:-"])
rgb = np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.float32) / 255
mx, mn = rgb.max(axis=2), rgb.min(axis=2)
sat = (mx - mn) / np.maximum(mx, 1e-3)
# The chair's shaded side is a cool grey, still low in saturation.
fg = (sat < 0.22) & (mx > 0.42)
fg = nd.binary_opening(fg, iterations=2)
fg = nd.binary_closing(fg, iterations=4)
lab, n = nd.label(fg)
sizes = nd.sum(fg, lab, range(1, n + 1))
fg = lab == (1 + int(np.argmax(sizes)))
# Fill holes smaller than a slot.
holes = nd.binary_fill_holes(fg) & ~fg
hl, hn = nd.label(holes)
hs = nd.sum(holes, hl, range(1, hn + 1))
for i, s in enumerate(hs):
    if s < 2500:
        fg[hl == i + 1] = True
soft = nd.gaussian_filter(fg.astype(np.float32), 1.0)
a = (np.clip(soft, 0, 1) * 255).astype(np.uint8)
print(f"coverage {fg.mean():.3f}, {n} blobs before pick, {hn} holes")
subprocess.run(["magick", "-size", f"{w}x{h}", "-depth", "8", "gray:-", "-background", "white", "-alpha", "shape", out],
               input=a.tobytes(), check=True)

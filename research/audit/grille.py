"""Grille strength: how much of the picture's horizontal detail sits at the
grille pitch. Averaged FFT along rows of the centre region (where focus is
sharp), peak power at 1/pitch over the median of nearby frequencies.
~1 means no grille; well above 1 means stripes are there.

  python3 research/audit/grille.py a.png [b.png ...] [--pitch 7.667]
"""
import subprocess, sys
import numpy as np

def load(p):
    w, h = map(int, subprocess.run(["magick", "identify", "-format", "%w %h", p], capture_output=True, text=True).stdout.split())
    raw = subprocess.run(["magick", p, "-colorspace", "gray", "-depth", "8", "gray:-"], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float64)

def score(img, pitch):
    h, w = img.shape
    reg = img[int(h * .3):int(h * .7), int(w * .35):int(w * .65)]
    reg = reg - reg.mean(axis=1, keepdims=True)
    spec = (np.abs(np.fft.rfft(reg * np.hanning(reg.shape[1]), axis=1)) ** 2).mean(axis=0)
    f = np.fft.rfftfreq(reg.shape[1])
    k = np.argmin(np.abs(f - 1 / pitch))
    peak = spec[max(k - 1, 0):k + 2].max()
    near = np.r_[spec[k - 12:k - 3], spec[k + 4:k + 13]]
    return peak / np.median(near)

args = [a for a in sys.argv[1:] if not a.startswith("--")]
pitch = float(sys.argv[sys.argv.index("--pitch") + 1]) if "--pitch" in sys.argv else 11.5 * 2560 / 3840
for p in args:
    print(f"{score(load(p), pitch):8.1f}  {p}")

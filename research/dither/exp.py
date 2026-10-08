#!/usr/bin/env python3
"""Dither experiments: the ImageMagick engraving recipe and its variations,
run on Doré engravings, our photo plates and random photos.

  python3 research/dither/exp.py

Sources live in media/src (gitignored, credits in media/src*/CREDITS.txt).
Every output is 1920x1080 in media/out/<experiment>/<name>.png.
"""
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parent / "media"
OUT = ROOT / "out"
W, H = 1920, 1080
BROWN = ("#16120e", "#5c4c39")

ENGRAVINGS = ["dore-2-ref", "dore-0", "dore-5"]
PHOTOS = ["portrait", "night", "cat", "mountain", "car", "flower", "concert", "food", "astronaut", "statue", "dish", "hands", "crowd", "waves"]


def magick(*args):
    subprocess.run(["magick", *map(str, args)], check=True)


def load_gray(path, w, h):
    raw = subprocess.run(["magick", path, "-colorspace", "gray", "-resize", f"{w}x{h}!", "-depth", "8", "gray:-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float32) / 255


def save_duo(bits, path, colors=BROWN, scale=2):
    """bits: 2D array of 0/1 (1 = light). Two colours, point-upscaled."""
    a = np.array([int(colors[0][i:i + 2], 16) for i in (1, 3, 5)], np.uint8)
    b = np.array([int(colors[1][i:i + 2], 16) for i in (1, 3, 5)], np.uint8)
    rgb = np.where(bits[..., None] > 0, b, a).astype(np.uint8)
    rgb = rgb.repeat(scale, 0).repeat(scale, 1)
    h, w, _ = rgb.shape
    subprocess.run(["magick", "-size", f"{w}x{h}", "-depth", "8", "rgb:-", str(path)], input=rgb.tobytes(), check=True)


def normalize():
    """Crop every source to 16:9 and size it to 1920x1080 (the falling Satan
    uses the exact crop of the reference)."""
    norm = ROOT / "norm"
    norm.mkdir(exist_ok=True)
    srcs = {p.stem: p for p in list((ROOT / "src").glob("*.jpg")) + list((ROOT / "src" / "misc").glob("*.jpg"))}
    for name, p in srcs.items():
        out = norm / f"{name}.png"
        if not out.exists():
            magick(p, "-resize", f"{W}x{H}^", "-gravity", "center", "-extent", f"{W}x{H}", out)


def recipe(src, out, colors=BROWN, pre=(), scale=2, dither="FloydSteinberg", contrast="4x50%"):
    """The command from the post, with hooks: `pre` runs before the dither."""
    magick(src, "-colorspace", "gray", "-resize", f"{100 / scale}%", *pre, "-sigmoidal-contrast", contrast,
           "-dither", dither, "-monochrome", "+level-colors", ",".join(colors), "-filter", "point", "-resize", f"{W}x{H}!", out)


# --- error diffusion we do ourselves (ImageMagick only has FS and Riemersma) ---

KERNELS = {
    # (dx, dy, weight), divisor
    "atkinson": ([(1, 0, 1), (2, 0, 1), (-1, 1, 1), (0, 1, 1), (1, 1, 1), (0, 2, 1)], 8),
    "stucki": ([(1, 0, 8), (2, 0, 4), (-2, 1, 2), (-1, 1, 4), (0, 1, 8), (1, 1, 4), (2, 1, 2), (-2, 2, 1), (-1, 2, 2), (0, 2, 4), (1, 2, 2), (2, 2, 1)], 42),
}


def diffuse(img, kernel):
    taps, div = KERNELS[kernel]
    a = img.copy()
    h, w = a.shape
    out = np.zeros_like(a)
    for y in range(h):
        row = a[y]
        for x in range(w):
            old = row[x]
            new = 1.0 if old >= 0.5 else 0.0
            out[y, x] = new
            err = (old - new) / div
            for dx, dy, wt in taps:
                xx, yy = x + dx, y + dy
                if 0 <= xx < w and yy < h:
                    a[yy, xx] += err * wt
    return out


def sigmoid(img, gain=4, mid=0.5):
    f = lambda v: 1 / (1 + np.exp(gain * (mid - v)))
    return (f(img) - f(0)) / (f(1) - f(0))


def bayer(n):
    m = np.array([[0]])
    while m.shape[0] < n:
        m = np.block([[4 * m, 4 * m + 2], [4 * m + 3, 4 * m + 1]])
    return (m + 0.5) / m.size


def blue_noise(h, w, seed=1):
    """Cheap blue-ish noise: white noise with its low frequencies removed,
    ranked into a uniform threshold map. Good enough to compare against Bayer."""
    rng = np.random.default_rng(seed)
    n = rng.random((h, w)).astype(np.float32)
    f = np.fft.fft2(n)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    f *= np.sqrt(fx * fx + fy * fy) ** 1.5
    hp = np.real(np.fft.ifft2(f))
    return (hp.ravel().argsort().argsort().reshape(h, w) + 0.5) / hp.size


def run():
    normalize()
    norm = ROOT / "norm"
    every = ENGRAVINGS + PHOTOS

    # A. The recipe as posted, on everything.
    d = OUT / "a-recipe"; d.mkdir(parents=True, exist_ok=True)
    for n in every:
        recipe(norm / f"{n}.png", d / f"{n}.png")

    # B. Helping photos: local contrast first (CLAHE), and a fake engraving
    # (a horizontal line screen mixed in before the dither, so FS breaks the
    # tones into streaks the way it does on Doré's hatching).
    d = OUT / "b-clahe"; d.mkdir(parents=True, exist_ok=True)
    for n in every:
        recipe(norm / f"{n}.png", d / f"{n}.png", pre=("-clahe", "12x12%+128+2.5"))
    d = OUT / "b-linescreen"; d.mkdir(parents=True, exist_ok=True)
    yy = np.arange(H // 2, dtype=np.float32)[:, None]
    screen = 0.5 + 0.5 * np.sin(yy / 3.2 * 2 * np.pi)
    for n in every:
        g = load_gray(norm / f"{n}.png", W // 2, H // 2)
        g = sigmoid(g, 4)
        g = np.clip(g + (screen - 0.5) * 0.35, 0, 1)
        save_duo(diffuse_fs(g), d / f"{n}.png")

    # C. Algorithms, on one engraving and three photos.
    d = OUT / "c-algorithms"; d.mkdir(parents=True, exist_ok=True)
    picks = ["dore-2-ref", "portrait", "mountain", "night"]
    bn = blue_noise(H // 2, W // 2)
    b8 = np.tile(bayer(8), (H // 16 + 1, W // 16 + 1))[: H // 2, : W // 2]
    for n in picks:
        g = sigmoid(load_gray(norm / f"{n}.png", W // 2, H // 2), 4)
        save_duo(diffuse_fs(g), d / f"{n}--floyd-steinberg.png")
        recipe(norm / f"{n}.png", d / f"{n}--riemersma.png", dither="Riemersma")
        save_duo(diffuse(g, "atkinson"), d / f"{n}--atkinson.png")
        save_duo(diffuse(g, "stucki"), d / f"{n}--stucki.png")
        save_duo(g > b8, d / f"{n}--bayer-8.png")
        save_duo(g > bn, d / f"{n}--blue-noise.png")

    # D. Pixel size: 1, 2, 3 and 4 screen pixels per dither pixel.
    d = OUT / "d-scale"; d.mkdir(parents=True, exist_ok=True)
    for n in ["dore-2-ref", "portrait", "cat"]:
        for s in (1, 2, 3, 4):
            recipe(norm / f"{n}.png", d / f"{n}--x{s}.png", scale=s)

    # E. Palettes.
    d = OUT / "e-palettes"; d.mkdir(parents=True, exist_ok=True)
    palettes = {
        "sepia": BROWN,
        "prussian": ("#0B1A33", "#7FA6D6"),
        "ice-on-navy": ("#0A1022", "#BFD4FF"),
        "bone": ("#111111", "#E8E1D3"),
        "oxblood": ("#1A0606", "#B0473A"),
        "phosphor": ("#0A0703", "#F7A23A"),
        "moss": ("#0E120B", "#8A9A6B"),
        "paper-ink": ("#F3EEE3", "#1B1B1B"),
    }
    for n in ["dore-2-ref", "mountain"]:
        for pname, cols in palettes.items():
            recipe(norm / f"{n}.png", d / f"{n}--{pname}.png", colors=cols)


def diffuse_fs(img):
    """Floyd-Steinberg, vectorised along rows enough to be tolerable."""
    a = img.copy()
    h, w = a.shape
    out = np.zeros_like(a)
    for y in range(h):
        row = a[y]
        nxt = a[y + 1] if y + 1 < h else None
        for x in range(w):
            old = row[x]
            new = 1.0 if old >= 0.5 else 0.0
            out[y, x] = new
            err = old - new
            if x + 1 < w:
                row[x + 1] += err * 7 / 16
            if nxt is not None:
                if x > 0:
                    nxt[x - 1] += err * 3 / 16
                nxt[x] += err * 5 / 16
                if x + 1 < w:
                    nxt[x + 1] += err * 1 / 16
    return out



def engrave(g, period=3.2, bend=0.0, angle=0.0, blur_px=6):
    """A line engraving from any picture: parallel lines that thicken where
    it's dark, optionally bent along the tones so they follow the form.
    g is 0..1 grayscale (1 = light). Returns 0/1 bits (1 = light)."""
    h, w = g.shape
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    u = y * np.cos(angle) + x * np.sin(angle)
    if bend:
        # Blur the tones and push the line phase with them: lines ride over
        # bright forms and dip into dark ones, the way a burin follows a shape.
        k = np.exp(-0.5 * (np.arange(-3 * blur_px, 3 * blur_px + 1) / blur_px) ** 2)
        k /= k.sum()
        s = np.apply_along_axis(lambda r: np.convolve(r, k, "same"), 1, g)
        s = np.apply_along_axis(lambda c: np.convolve(c, k, "same"), 0, s)
        u = u + bend * s * period * 4
    wave = 0.5 + 0.5 * np.cos(2 * np.pi * u / period)
    return (g > wave).astype(np.float32)


def run_engrave():
    norm = ROOT / "norm"
    d = OUT / "f-engrave"; d.mkdir(parents=True, exist_ok=True)
    for n in ENGRAVINGS[:1] + PHOTOS:
        g = load_gray(norm / f"{n}.png", W // 2, H // 2)
        # Stretch the tones first: most photos sit in the middle and would
        # come out as uniform medium lines.
        lo, hi = np.percentile(g, [2, 98])
        g = sigmoid(np.clip((g - lo) / max(hi - lo, 1e-3), 0, 1), 5)
        save_duo(engrave(g), d / f"{n}--straight.png")
        save_duo(engrave(g, bend=1.0), d / f"{n}--bent.png")
        save_duo(engrave(g, period=4.5, bend=1.6, angle=0.35), d / f"{n}--bent-diagonal.png")


# --- motion: the same push-in, dithered per frame by each method ---------------

def run_motion(seconds=4, fps=30):
    from scipy.ndimage import map_coordinates, gaussian_filter
    norm = ROOT / "norm"
    d = OUT / "m-motion"; d.mkdir(parents=True, exist_ok=True)
    w, h = W // 2, H // 2
    n_frames = seconds * fps

    def source(name):
        g = load_gray(norm / f"{name}.png", W, H)  # full res, sampled down per frame
        lo, hi = np.percentile(g, [2, 98])
        return np.clip((g - lo) / max(hi - lo, 1e-3), 0, 1)

    def coords(i):
        # A slow push with a little drift: screen (dither px) -> source px.
        p = i / (n_frames - 1)
        z = 1.0 + 0.10 * (p * p * (3 - 2 * p))
        cx, cy = W * (0.5 + 0.02 * p), H * (0.45 + 0.01 * p)
        ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
        return cy + (ys - h / 2) * 2 / z, cx + (xs - w / 2) * 2 / z

    def sample(img, yx):
        return map_coordinates(img, yx, order=1, mode="nearest")

    pal = d / "pal.png"
    magick("-size", "1x2", "gradient:black-white", "-colors", "2", pal)

    def fs(g):
        raw = subprocess.run(["magick", "-size", f"{w}x{h}", "-depth", "8", "gray:-", "-dither", "FloydSteinberg", "-remap", str(pal), "-depth", "8", "gray:-"],
                             input=(g * 255).astype(np.uint8).tobytes(), capture_output=True, check=True).stdout
        return np.frombuffer(raw, np.uint8).reshape(h, w) > 127

    b8 = np.tile(bayer(8), (h // 8 + 1, w // 8 + 1))[:h, :w]

    def write(name, frames):
        a = np.array([int(BROWN[0][i:i + 2], 16) for i in (1, 3, 5)], np.uint8)
        b = np.array([int(BROWN[1][i:i + 2], 16) for i in (1, 3, 5)], np.uint8)
        enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                                "-c:v", "libx264", "-crf", "12", "-preset", "slow", "-pix_fmt", "yuv420p", str(d / f"{name}.mp4")], stdin=subprocess.PIPE)
        for bits in frames:
            rgb = np.where(bits[..., None], b, a).astype(np.uint8).repeat(2, 0).repeat(2, 1)
            enc.stdin.write(rgb.tobytes())
        enc.stdin.close(); enc.wait()
        print(name)

    por = source("portrait")
    por_s = gaussian_filter(por, 12)
    dore = load_gray(norm / "dore-2-ref.png", W, H)

    write("portrait--floyd-steinberg", (fs(sigmoid(sample(por, coords(i)), 5)) for i in range(n_frames)))
    write("portrait--bayer-8", (sigmoid(sample(por, coords(i)), 5) > b8 for i in range(n_frames)))
    # Lines fixed to the screen; the picture moves under them.
    write("portrait--engrave-screen", (engrave(sigmoid(sample(por, coords(i)), 5), bend=1.0) > 0 for i in range(n_frames)))
    # Lines engraved into the picture: phase computed in source space, so the
    # lines move and scale with it like a print being filmed.
    def engraved_in_image(i):
        yx = coords(i)
        g = sigmoid(sample(por, yx), 5)
        u = yx[0] / 2 + sample(por_s, yx) * 3.2 * 4
        return g > 0.5 + 0.5 * np.cos(2 * np.pi * u / 3.2)
    write("portrait--engrave-image", (engraved_in_image(i) for i in range(n_frames)))
    write("dore--recipe-threshold", (sigmoid(sample(dore, coords(i)), 4) > 0.5 for i in range(n_frames)))
    write("dore--floyd-steinberg", (fs(sigmoid(sample(dore, coords(i)), 4)) for i in range(n_frames)))


if __name__ == "__main__":
    import sys
    {"all": run, "engrave": run_engrave, "motion": run_motion}[sys.argv[1] if len(sys.argv) > 1 else "all"]()

"""A dither engine for photos and footage. Grayscale in (0..1, 1 = light),
palette indices out. Three stages, each swappable:

  prep      makes the picture ready to be dithered (levels, local contrast,
            sharpening). Most of whether a photo reads is decided here.
  method    turns tone into pattern: a threshold map (bayer, blue noise,
            halftone dots), or error diffusion (floyd-steinberg, atkinson),
            optionally with hysteresis against the previous frame so footage
            doesn't boil.
  palette   2 to 4 colours; the method quantizes to that many levels.

Threshold maps are fixed to the screen, so they're stable in time by
construction. Error diffusion looks best on stills and boils on footage
unless it has hysteresis, which needs the previous frame (so it lives in
offline tools, not in a seek-anywhere HyperFrames render).
"""
from functools import lru_cache

import numpy as np
from numba import njit
from scipy.ndimage import gaussian_filter


# --- prep ---------------------------------------------------------------------

def levels(g, lo_pct=1.0, hi_pct=99.0, lo=None, hi=None):
    """Stretch so the darkest and lightest percent hit black and white. Pass
    lo/hi to fix them (for footage: measure once per shot, not per frame,
    or the exposure pumps)."""
    if lo is None or hi is None:
        lo, hi = np.percentile(g, [lo_pct, hi_pct])
    return np.clip((g - lo) / max(hi - lo, 1e-3), 0, 1)


def local_contrast(g, radius=24, amount=0.6):
    """Large-radius unsharp mask: pushes each area away from its
    neighbourhood mean. A cheap, temporally stable stand-in for CLAHE."""
    return np.clip(g + amount * (g - gaussian_filter(g, radius)), 0, 1)


def sharpen(g, radius=1.0, amount=0.8):
    return np.clip(g + amount * (g - gaussian_filter(g, radius)), 0, 1)


def curve(g, gamma=1.0, contrast=0.0):
    """Gamma, then an S-curve of strength `contrast` (0 = none)."""
    g = np.power(np.clip(g, 0, 1), gamma)
    if contrast:
        k = 1 + 6 * contrast
        s = lambda v: 1 / (1 + np.exp(-k * (v - 0.5)))
        g = (s(g) - s(0)) / (s(1) - s(0))
    return g


PREPS = {
    "none": lambda g, **k: g,
    "levels": lambda g, **k: levels(g, **k),
    "punch": lambda g, **k: sharpen(curve(local_contrast(levels(g, **k)), contrast=0.35), 1.0, 0.7),
}


# --- threshold maps ---------------------------------------------------------------

def bayer(n=8):
    m = np.array([[0]])
    while m.shape[0] < n:
        m = np.block([[4 * m, 4 * m + 2], [4 * m + 3, 4 * m + 1]])
    return ((m + 0.5) / m.size).astype(np.float32)


@lru_cache(None)
def blue_noise(n=64, sigma=1.5, seed=7):
    """Void-and-cluster (Ulichney 1993): a threshold tile whose minority
    pixels are always as spread out as possible. Tiles seamlessly."""
    rng = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)
    kernel = np.exp(-2 * np.pi ** 2 * sigma ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))

    def energy(bits):
        return np.real(np.fft.ifft2(np.fft.fft2(bits) * kernel))

    # Initial binary pattern: 10% random, then relax until stable.
    bits = np.zeros((n, n), np.float32)
    bits.flat[rng.choice(n * n, n * n // 10, replace=False)] = 1
    while True:
        e = energy(bits)
        tight = np.unravel_index(np.argmax(np.where(bits > 0, e, -np.inf)), bits.shape)
        bits[tight] = 0
        e = energy(bits)
        void = np.unravel_index(np.argmin(np.where(bits == 0, e, np.inf)), bits.shape)
        if void == tight:
            bits[tight] = 1
            break
        bits[void] = 1
    ones = int(bits.sum())
    rank = np.zeros((n, n), np.int32)
    # Phase 1: remove ones from the tightest cluster, ranking down.
    b = bits.copy()
    for r in range(ones - 1, -1, -1):
        e = energy(b)
        idx = np.unravel_index(np.argmax(np.where(b > 0, e, -np.inf)), b.shape)
        b[idx] = 0
        rank[idx] = r
    # Phase 2 and 3: fill the largest void, ranking up.
    b = bits.copy()
    for r in range(ones, n * n):
        e = energy(b)
        idx = np.unravel_index(np.argmin(np.where(b == 0, e, np.inf)), b.shape)
        b[idx] = 1
        rank[idx] = r
    return ((rank + 0.5) / (n * n)).astype(np.float32)


def halftone(cell=6.0, angle_deg=45.0, shape="round"):
    """A clustered-dot screen as a threshold function of position: dots grow
    from cell centres as tone darkens, like print. Returns a callable
    (h, w) -> map, since a rotated screen doesn't tile on a small square."""
    a = np.deg2rad(angle_deg)

    def make(h, w):
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        u = (x * np.cos(a) + y * np.sin(a)) / cell
        v = (-x * np.sin(a) + y * np.cos(a)) / cell
        fu, fv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
        if shape == "line":
            d = np.abs(fv) * 2
        else:
            d = np.sqrt(fu * fu + fv * fv) * np.sqrt(2)
        # Light where far from the centre, so dots of ink (dark) grow outward.
        return np.clip(d, 0, 1).astype(np.float32)

    return make


def tile(t, h, w):
    th, tw = t.shape
    return np.tile(t, (h // th + 1, w // tw + 1))[:h, :w]


def threshold_map(name, h, w):
    if name == "bayer-4":
        return tile(bayer(4), h, w)
    if name == "bayer-8":
        return tile(bayer(8), h, w)
    if name == "blue-noise":
        return tile(blue_noise(), h, w)
    if name == "halftone":
        return halftone(5.0, 45)(h, w)
    if name == "lines":
        return halftone(4.0, 0, "line")(h, w)
    raise KeyError(name)


def ordered(g, tmap, n=2):
    """N-level ordered dither: each pixel lands between two neighbouring
    levels, and the map decides which."""
    v = g * (n - 1)
    base = np.floor(v)
    return np.clip(base + (v - base > tmap), 0, n - 1).astype(np.uint8)


# --- error diffusion ---------------------------------------------------------------

@njit(cache=True)
def _diffuse(g, n, kind, prev, hyst):
    h, w = g.shape
    a = g.copy() * (n - 1)
    out = np.zeros((h, w), np.uint8)
    for y in range(h):
        # Serpentine: alternate direction each row, which breaks up the
        # diagonal worms plain left-to-right FS leaves in flat areas.
        rev = y % 2 == 1
        for i in range(w):
            x = w - 1 - i if rev else i
            old = a[y, x]
            q = np.floor(old + 0.5)
            if prev is not None:
                # Hysteresis: keep last frame's level unless the value has
                # clearly moved away from it. Kills flicker where nothing
                # changed; real changes still go through.
                p = prev[y, x]
                if abs(old - p) < 0.5 + hyst:
                    q = p
            q = min(max(q, 0), n - 1)
            out[y, x] = q
            err = old - q
            s = -1 if rev else 1
            if kind == 0:  # Floyd-Steinberg
                if 0 <= x + s < w:
                    a[y, x + s] += err * 7 / 16
                if y + 1 < h:
                    if 0 <= x - s < w:
                        a[y + 1, x - s] += err * 3 / 16
                    a[y + 1, x] += err * 5 / 16
                    if 0 <= x + s < w:
                        a[y + 1, x + s] += err * 1 / 16
            else:  # Atkinson: 6/8 of the error, so highlights and shadows clip harder
                e = err / 8
                for dx, dy in ((s, 0), (2 * s, 0), (-s, 1), (0, 1), (s, 1), (0, 2)):
                    xx, yy = x + dx, y + dy
                    if 0 <= xx < w and yy < h:
                        a[yy, xx] += e
    return out


def diffuse(g, n=2, kind="floyd-steinberg", prev=None, hyst=0.0):
    k = 0 if kind == "floyd-steinberg" else 1
    p = None if prev is None else prev.astype(np.float64)
    return _diffuse(g.astype(np.float64), n, k, p, float(hyst))


# --- palettes -----------------------------------------------------------------------

PALETTES = {
    "sepia-2": ["#16120e", "#5c4c39"],
    "sepia-3": ["#16120e", "#5c4c39", "#bfa784"],
    "sepia-4": ["#16120e", "#3d3227", "#76624a", "#d2bf9f"],
    "ice-2": ["#0A1022", "#BFD4FF"],
    "ice-3": ["#0A1022", "#3E5687", "#BFD4FF"],
    "prussian-3": ["#0B1A33", "#2F5A8C", "#C7D9EE"],
    "oxblood-3": ["#1A0606", "#7A2A20", "#E2B79C"],
    "phosphor-3": ["#0A0703", "#7A4512", "#F7B45A"],
    "bone-2": ["#111111", "#E8E1D3"],
    "paper-3": ["#F3EEE3", "#8F8778", "#1B1B1B"][::-1],
}


def palette_colors(palette):
    """A preset name, or comma-separated hex colours dark to light."""
    return PALETTES[palette] if palette in PALETTES else [c if c.startswith("#") else "#" + c for c in palette.split(",")]


def steps(n, amount=1.0):
    """Tone steps for an amount (matches ditherSteps in the pass): k + 1
    evenly spaced tones along the palette's ramp. amount 1 is exactly the
    palette; lower shrinks the step towards 1/255 and the pattern fades out."""
    a = min(1.0, max(0.0, amount))
    step = a / (n - 1) + (1 - a) / 255
    return max(n - 1, round(1 / step))


def ramp(palette):
    """The palette as a ramp, 255 samples per segment (matches the pass)."""
    cols = np.array([[int(c[i:i + 2], 16) for i in (1, 3, 5)] for c in palette_colors(palette)], np.float64)
    segs = len(cols) - 1
    i = np.arange(segs * 255 + 1)
    s = np.minimum(segs - 1, i // 255)
    f = ((i - s * 255) / 255)[:, None]
    return np.round(cols[s] + (cols[s + 1] - cols[s]) * f).astype(np.uint8)


def colorize(idx, palette, scale=2, k=None):
    """idx: tone indices 0..k (k defaults to palette size - 1)."""
    r = ramp(palette)
    k = len(palette_colors(palette)) - 1 if k is None else k
    rgb = r[np.round(idx.astype(np.float64) / k * (len(r) - 1)).astype(np.int64)]
    if scale > 1:
        rgb = rgb.repeat(scale, 0).repeat(scale, 1)
    return rgb


def dither(g, method="bayer-8", n=2, prev=None, hyst=0.0):
    h, w = g.shape
    if method in ("floyd-steinberg", "atkinson"):
        return diffuse(g, n, method, prev, hyst)
    return ordered(g, threshold_map(method, h, w), n)

# Cut-paper emblem renderer (library for cut_*.py): flat shapes with brushed textures (fingerprint ridges, wood grain, mottled
# paint), torn edges, thin chromatic fringes (orange / blue offset slivers) and khaki stars on a white
# ground with soft grey blotches. Shapes are declared in 1080 px space and rendered at 2x.
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, map_coordinates

S = 2; W = H = 1080 * S
rng = np.random.default_rng(4)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

def fbm(seed, base=6, oct_=5):
    r = np.random.default_rng(seed); out = np.zeros((H, W), np.float32); a = 1
    for o in range(oct_):
        n = base * 2 ** o; g = r.random((n + 1, n + 1)).astype(np.float32)
        out += a * np.array(Image.fromarray((g * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255; a *= .5
    return out / out.max()

NA, NB, NC = fbm(1), fbm(2, 3), fbm(3, 12, 3)
DX = (fbm(5, 10, 3) - .5) * 9 * S; DY = (fbm(6, 10, 3) - .5) * 9 * S

def hexc(h): h = h.lstrip('#'); return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255

def mask_of(draw_fn, clean=False):
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im); draw_fn(d, S); m = np.array(im, np.float32) / 255
    if clean:
        return np.clip(gaussian_filter(m, .7 * S), 0, 1)
    # torn edge: displace and re-threshold
    m = map_coordinates(m, [yy + DY, xx + DX], order=1)
    m = gaussian_filter(m, 1.6 * S)
    return np.clip((m - .5 + (NC - .5) * .55 + (rng.random(m.shape).astype(np.float32) - .5) * .25) * 5 + .5, 0, 1)

def texture(kind, seed=0, angle=0.0, freq=1.0, c=(540, 540)):
    ca, sa = np.cos(angle), np.sin(angle); u = (xx * ca + yy * sa) / S; v = (-xx * sa + yy * ca) / S
    if kind == 'finger':  # concentric ridges warped by noise, like a pressed fingertip / brush swirl
        n = fbm(10 + seed, 4, 4); t = np.sin((n * 70 + np.hypot(xx / S - c[0] - 20 * np.sin(seed), (yy / S - c[1]) * 1.3) / 2.1) * freq)
        t = np.sign(t) * np.abs(t) ** .5
    elif kind == 'wood':
        t = np.sin(v / 1.6 * freq + NA * 45 + seed)
    elif kind == 'brush':
        t = np.sin(u / 1.5 * freq + gaussian_filter(rng.random((H, W)).astype(np.float32), [8 * S, .5 * S]) * 60)
    else:
        t = NA * 2 - 1
    return t.astype(np.float32)

canvas = np.ones((H, W, 3), np.float32)
# ground: white with soft grey blotches and a faint halftone patch
blot = gaussian_filter(fbm(9, 3, 3), 40)
canvas *= (1 - .06 * np.clip((blot - .45) * 3, 0, 1))[..., None]
DRY = gaussian_filter(np.random.default_rng(21).random((H, W)).astype(np.float32), [.5 * S, 9 * S]); DRY = (DRY - DRY.mean()) / DRY.std()

def paint(m, col, tex='finger', seed=0, angle=0.0, depth=.16, grad=None, fringe=None, freq=1.0):
    global canvas
    if fringe:
        for c, (fx, fy) in fringe:
            fm = np.roll(np.roll(m, int(fy * S), 0), int(fx * S), 1)
            sl = np.clip(fm - m, 0, 1)
            canvas = canvas * (1 - sl[..., None]) + hexc(c) * sl[..., None]
    base = np.ones((H, W, 3), np.float32) * hexc(col)
    if grad is not None:  # (color2, y0, y1) vertical blend in 1080 space
        c2, y0, y1 = grad; k = np.clip((yy / S - y0) / (y1 - y0), 0, 1)[..., None]; base = base * (1 - k) + hexc(c2) * k
    ys_, xs_ = np.nonzero(m[::8, ::8] > .5); cc = (xs_.mean() * 8 / S, ys_.mean() * 8 / S) if len(xs_) else (540, 540)
    t = texture(tex, seed, angle, freq, cc)
    edge = gaussian_filter(m, 5 * S)
    shade = 1 + depth * t * 1.1 + (NB - .5) * .3 - .18 * (1 - np.clip(edge * 1.4, 0, 1)) * m
    col_ = np.clip(base * shade[..., None], 0, 1)
    # dry-brush: streaks where the paint skipped, showing a lighter tone
    skip = np.clip((DRY - 1.3) * 1.5, 0, .55) * (.6 + .4 * NA)
    col_ = col_ * (1 - skip[..., None]) + np.minimum(col_ + .25, 1) * skip[..., None]
    canvas = canvas * (1 - m[..., None]) + col_ * m[..., None]

def poly(pts): return lambda d, s: d.polygon([(x * s, y * s) for x, y in pts], fill=255)
def ell(cx, cy, rx, ry): return lambda d, s: d.ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=255)
def ring(cx, cy, r, w): return lambda d, s: d.ellipse([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], outline=255, width=int(w * s))
def line(pts, w): return lambda d, s: d.line([(x * s, y * s) for x, y in pts], fill=255, width=int(w * s), joint='curve')
def arc(cx, cy, r, a0, a1, w): return lambda d, s: d.arc([(cx - r) * s, (cy - r) * s, (cx + r) * s, (cy + r) * s], a0, a1, fill=255, width=int(w * s))
def union(*fs):
    def f(d, s):
        for g in fs: g(d, s)
    return f
def minus(a, b):
    ma, mb = mask_of(a), mask_of(b); return np.clip(ma - mb, 0, 1)

def star4(cx, cy, R, k=.26):
    pts = []
    for i in range(16):
        a = i / 16 * 2 * np.pi - np.pi / 2; rr = R if i % 4 == 0 else (R * k if i % 2 == 0 else R * k * .9)
        if i % 4 != 0 and i % 2 == 1: rr = R * k * 1.15
        pts.append((cx + rr * np.cos(a), cy + rr * np.sin(a)))
    return poly(pts)
def star8(cx, cy, R):
    pts = []
    for i in range(16):
        a = i / 16 * 2 * np.pi - np.pi / 2; rr = R if i % 2 == 0 else R * .16
        pts.append((cx + rr * np.cos(a), cy + rr * np.sin(a)))
    return poly(pts)

def save(path):
    # written at 2x (2160 px); the page shows it at 1080
    g = canvas + (rng.random((H, W, 1)).astype(np.float32) - .5) * .035
    Image.fromarray((np.clip(g, 0, 1) * 255).astype(np.uint8)).save(path, quality=90)

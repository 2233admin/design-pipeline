# Physical glow for a vector-display plate shot on film, early 80s (pairs with vector80.cjs).
# Input: crisp phosphor lines on black.
#   core heat     - bright pixels pushed toward white
#   bloom         - three gaussian halos (tight / medium / wide), added in linear light
#   heat shift    - where light piles up (crossings, dense mesh) the colour warms toward yellow-white
#   sync tear     - a few thin horizontal bands displaced sideways, like an unsteady scan
#   phosphor      - fine speckle along the strokes, slightly uneven brightness
#   film          - warm base fog, grain, vignette, a touch of barrel distortion and halation
#
# usage: python3 vector80-glow.py plate.png out.jpg [--tear Y0,Y1] [--width 1080] [--seed 80] [--contrast 1.4]
#   --tear   band, in layout pixels, where scan tears may fall (keep text out of it); default 35%-85%
#   --contrast  1 = soft film look; higher = deeper blacks, tighter halos, hotter cores (default 1.4)
#   --screen    photograph the plate on a monitor: RGB misconvergence toward the edges, scan lines and a
#               shadow-mask triad, a rounded screen inside a dark bezel, corner falloff and a glass reflection
#   --width  layout width the png was rendered from (a 2x screenshot of a 1080 plate is 2160 wide)
import argparse
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--tear'); ap.add_argument('--width', type=float, default=1080); ap.add_argument('--seed', type=int, default=80); ap.add_argument('--contrast', type=float, default=1.4); ap.add_argument('--screen', action='store_true')
a = ap.parse_args()
im = np.array(Image.open(a.src).convert('RGB')).astype(np.float32) / 255
H, W, _ = im.shape; S = W / a.width; rng = np.random.default_rng(a.seed); K = max(.5, a.contrast)
lin = im ** 2.2
# phosphor unevenness along strokes
spk = gaussian_filter(rng.random((H, W)).astype(np.float32), .8 * S); spk = (spk - spk.mean()) / spk.std()
lin = lin * (1 + .25 * spk[..., None]) * (.85 + .3 * gaussian_filter(rng.random((H, W)).astype(np.float32), 30 * S)[..., None])
# sync tear: shift a few thin bands
t0, t1 = (map(float, a.tear.split(','))) if a.tear else (.35 * H / S, .85 * H / S)
for _ in range(9 if t1 > t0 else 0):
    y0 = int(rng.integers(int(t0 * S), max(int(t0 * S) + 1, int(t1 * S) - 8))); h = int(rng.integers(2, 6) * S); dx = int(rng.integers(-14, 14) * S)
    lin[y0:y0 + h] = np.roll(lin[y0:y0 + h], dx, 1) * 1.3
# bloom
bl = sum(w * np.stack([gaussian_filter(lin[..., c], sd * S) for c in range(3)], -1) for w, sd in [(.9, 2.2), (.6 / K ** .5, 9), (.45 / K, 34)])
out = lin * 1.3 * K ** .5 + bl * 1.6
# heat shift toward yellow-white where energy is high
e = out.max(-1, keepdims=True); hot = np.clip((e - .55) / .8, 0, 1)
out = out * (1 - hot) + (out + np.array([.6, .55, .35]) * e) * hot
# halation: wide warm red glow under bright areas
hal = gaussian_filter(out.mean(-1), 60 * S)[..., None] * np.array([.35, .08, .03]) / K ** 1.5
out = out + hal
# film base: warm fog brighter in the middle of the frame, vignette
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32); rr = ((xx / W - .5) ** 2 + (yy / H - .48) ** 2)
fog = (np.exp(-rr / .09)[..., None] * np.array([.030, .020, .016]) + np.array([.012, .008, .007])) / K ** 2
out = out + fog
out = out * (1 - np.clip(rr * 1.7, 0, .75))[..., None]
# tone map back to display, grain
out = 1 - np.exp(-out * 1.4)
out = out ** (1 / 2.2)
# contrast: clamp the black point and add a gentle S-curve; both vanish at contrast 1
bp = .035 * (K - 1); out = np.clip((out - bp) / (1 - bp), 0, 1)
sk = .35 * (K - 1); out = np.clip(out + sk * out * (1 - out) * (out - .5) * 2, 0, 1)
out = out + rng.normal(0, .028 / K ** .5, (H, W, 1)).astype(np.float32)
if a.screen:
    # misconvergence: red scaled out, blue scaled in from the centre, so fringes grow toward the edges
    cx0, cy0 = W / 2, H / 2
    for ch, k in ((0, 1.0016), (2, .9984)):
        out[..., ch] = map_coordinates(out[..., ch], [cy0 + (yy - cy0) / k, cx0 + (xx - cx0) / k], order=1, mode='nearest')
    # scan lines and a fine RGB shadow-mask triad
    pitch = max(2, int(round(3 * S)))
    scan = 1 - .16 * (np.sin(yy / pitch * np.pi) ** 8)
    tri = np.stack([(xx // max(1, pitch // 2)) % 3 == c for c in range(3)], -1).astype(np.float32)
    out = out * scan[..., None] * (.9 + .16 * tri)
# barrel distortion, slight
cx, cy = W / 2, H / 2; nx, ny = (xx - cx) / cx, (yy - cy) / cy; k = .025; f = 1 + k * (nx ** 2 + ny ** 2)
out = np.stack([map_coordinates(out[..., c], [cy + ny * cy * f, cx + nx * cx * f], order=1, mode='constant') for c in range(3)], -1)
if a.screen:
    # rounded screen inside a dark plastic bezel, corner falloff, a soft diagonal glass reflection
    m = .05 * W; rad = .075 * W
    qx = np.clip(np.abs(xx - W / 2) - (W / 2 - m - rad), 0, None); qy = np.clip(np.abs(yy - H / 2) - (H / 2 - m - rad), 0, None)
    d = np.hypot(qx, qy) - rad
    inside = np.clip(-d / (2 * S), 0, 1)
    corner = np.clip(1 - (np.hypot((xx - W / 2) / (W / 2), (yy - H / 2) / (H / 2)) - .9) * 1.2, .55, 1)
    bez = np.clip(.075 - .04 * (yy / H) + .03 * np.exp(-((d - 7 * S) / (5 * S)) ** 2) - .03 * np.exp(-((d - 1.5 * S) / (2.5 * S)) ** 2), 0, 1)[..., None] * np.array([1, .96, .9])
    out = out * (inside * corner)[..., None] + bez * (1 - inside)[..., None]
    g = np.exp(-(((xx / W) * .7 + (yy / H) - .55) / .12) ** 2) * np.exp(-((xx / W - .3) / .35) ** 2)
    out = out + (g * inside * .045)[..., None]
    out = np.clip(out + rng.normal(0, .01, (H, W, 1)).astype(np.float32), 0, 1)
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(a.dst, quality=92)

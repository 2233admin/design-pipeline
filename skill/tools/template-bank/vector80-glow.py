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
#   --width  layout width the png was rendered from (a 2x screenshot of a 1080 plate is 2160 wide)
import argparse
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst')
ap.add_argument('--tear'); ap.add_argument('--width', type=float, default=1080); ap.add_argument('--seed', type=int, default=80); ap.add_argument('--contrast', type=float, default=1.4)
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
# barrel distortion, slight
cx, cy = W / 2, H / 2; nx, ny = (xx - cx) / cx, (yy - cy) / cy; k = .025; f = 1 + k * (nx ** 2 + ny ** 2)
out = np.stack([map_coordinates(out[..., c], [cy + ny * cy * f, cx + nx * cx * f], order=1, mode='constant') for c in range(3)], -1)
Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(a.dst, quality=92)

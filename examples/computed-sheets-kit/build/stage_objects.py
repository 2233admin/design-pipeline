# Raster pieces for stage.cjs (usage: stage_objects.py ART_DIR OUT_DIR HOLO_SCREENSHOT): a computed 18-segment hex mirror and a debris blob behind
# it, both duotoned cobalt -> lavender -> signal yellow with a blue halftone in the shadows.
import numpy as np, sys
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates, binary_erosion
ART, OUT, HOLO = sys.argv[1], sys.argv[2], sys.argv[3]
rng = np.random.default_rng(7)
BLUE = np.array([20, 24, 240]) / 255; LAV = np.array([150, 152, 238]) / 255; YEL = np.array([247, 222, 112]) / 255; WHI = np.array([250, 248, 236]) / 255

def duotone(l):
    l = np.clip(l, 0, 1)[..., None]
    a = np.clip(l / .45, 0, 1); b = np.clip((l - .45) / .35, 0, 1); c = np.clip((l - .85) / .15, 0, 1)
    return (BLUE * (1 - a) + LAV * a) * (1 - b) + YEL * b * (1 - c) + WHI * c * b

def halftone(rgb, l, cell):
    H, W = l.shape; yy, xx = np.mgrid[0:H, 0:W]
    d = ((xx % cell - cell / 2) ** 2 + (yy % cell - cell / 2) ** 2) / (cell / 2) ** 2
    dots = d < np.clip((.42 - l) / .42, 0, 1) * 1.3
    return np.where((dots & (l < .42))[..., None], BLUE, rgb)

def tex(name, size):
    im = Image.open(f'{ART}/{name}').convert('L').resize((size, size), Image.BICUBIC)
    return np.array(im).astype(float) / 255

# ---- hex mirror ----
N = 1100; s = 108.0; H = W = N; yy, xx = np.mgrid[0:H, 0:W].astype(float); X = xx - W / 2; Y = yy - H / 2
q = (2 / 3 * X) / s; r = (-1 / 3 * X + np.sqrt(3) / 3 * Y) / s
cx, cz = q, r; cy = -cx - cz
rx, ry, rz = np.round(cx), np.round(cy), np.round(cz)
dx, dy, dz = abs(rx - cx), abs(ry - cy), abs(rz - cz)
m1 = (dx > dy) & (dx > dz); m2 = (~m1) & (dy > dz)
rx = np.where(m1, -ry - rz, rx); ry = np.where(m2, -rx - rz, ry); rz = np.where(~m1 & ~m2, -rx - ry, rz)
ring = (abs(rx) + abs(ry) + abs(rz)) / 2
hx = s * 1.5 * rx; hy = s * np.sqrt(3) * (rz + rx / 2)
lx, ly = X - hx, Y - hy
edge = s * np.sqrt(3) / 2 - np.maximum(abs(ly), abs(lx) * np.sqrt(3) / 2 + abs(ly) / 2)
seg = (ring >= 1) & (ring <= 2) & (edge > 5)
hole = ring == 0
key = (rx * 7 + rz * 13).astype(int)
tilt = {k: rng.normal(0, .06, 2) for k in np.unique(key)}
tx = np.vectorize(lambda k: tilt[k][0])(key); ty = np.vectorize(lambda k: tilt[k][1])(key)
# curvature + per-segment tilt + bevel toward edges
bev = np.clip(1 - (edge - 5) / 22, 0, 1) ** 2
gx = np.sign(lx) * (abs(lx) * np.sqrt(3) / 2 > abs(ly)) ; gy = np.sign(ly)
nx = X / (W * 1.1) + tx + bev * .55 * (lx / (abs(lx) + abs(ly) + 1e-3))
ny = Y / (H * 1.1) + ty + bev * .55 * (ly / (abs(lx) + abs(ly) + 1e-3))
env = tex('foam.png', 600); env2 = tex('ue-depth.jpg', 600)
envT = .6 * env + .4 * env2
u = (xx / W * 1.4 + nx * 2.6) * 599; v = (yy / H * 1.4 + ny * 2.6) * 599
refl = map_coordinates(envT, [v, u], order=1, mode='grid-wrap')
L = np.array([-.5, -.7]); diff = .55 - (nx * L[0] + ny * L[1]) * 2.2
spec = np.exp(-(((nx + .18) ** 2 + (ny + .26) ** 2) / .004)) * 1.2
lum = .12 + .5 * refl + .3 * diff + spec + bev * .35 * (lx * -.5 + ly * -.7 > 0) - bev * .2 + .08 * (rng.random((H, W)) - .5)
# hole: a recessed tower seen from the front, concentric rings
rr = np.hypot(X, Y)
hl = .2 + .3 * (np.sin(rr / 4) > .7) + .3 * np.clip(1 - rr / 70, 0, 1) + .15 * map_coordinates(env, [np.clip(yy / H * 599, 0, 599), np.clip(xx / W * 599, 0, 599)], order=1)
lum = np.where(hole & (edge > 5), hl, lum)
inside = seg | (hole & (edge > 5))
rgb = halftone(duotone(lum), lum, 7)
# backplane: dark frame around the mirror (dilated outline)
out = (ring <= 2)
frame = gaussian_filter(out.astype(float), 9) > .02
fr_l = .22 + .5 * tex('constructivist.jpg', 600)[np.clip((yy / H * 599).astype(int), 0, 599), np.clip((xx / W * 599).astype(int), 0, 599)]
frame_rgb = halftone(duotone(fr_l * .7), fr_l * .7, 6)
a = np.where(inside, 1., np.where(frame & ~inside, 1., 0.))
col = np.where(inside[..., None], rgb, frame_rgb)
img = np.dstack([col, a])
Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/stage-mirror.png')

# ---- debris blob ----
BW, BH = 1500, 1000; yy, xx = np.mgrid[0:BH, 0:BW].astype(float); X = (xx - BW / 2) / (BW / 2); Y = (yy - BH / 2) / (BH / 2)
ang = np.arctan2(Y, X); rad = np.hypot(X, Y)
wob = sum(rng.normal(0, .08) * np.sin(k * ang + rng.uniform(0, 6.3)) for k in range(2, 7)) * .7
fine = gaussian_filter(rng.random((BH, BW)), 3); fine = (fine - fine.mean()) / fine.std()
mask = rad < .78 + wob + .025 * fine
t1 = np.array(Image.open(f'{ART}/ue-depth.jpg').convert('L').resize((BW, BH), Image.BICUBIC)).astype(float) / 255; t2 = np.array(Image.open(f'{ART}/foam.png').convert('L').resize((BW, BH))).astype(float) / 255
bl = .55 * t1 + .45 * t2; bl = .35 + .75 * (bl - bl.mean())
bl = bl + .25 * (1 - rad)
brgb = halftone(duotone(bl), bl, 6)
edge_ = mask & ~binary_erosion(mask, iterations=2)
brgb = np.where(edge_[..., None], np.array([.15, .15, .2]), brgb)
alpha = np.where(mask, .78, 0.); alpha = np.where(edge_, 1., alpha)
Image.fromarray((np.clip(np.dstack([brgb, alpha]), 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/stage-blob.png')

# ---- cyclotron and re-inked hologram ----

# ---- cyclotron ----
N = 1100; yy, xx = np.mgrid[0:N, 0:N].astype(float); X = xx - N / 2; Y = yy - N / 2; R = np.hypot(X, Y); A = np.arctan2(Y, X)
Rd = 430; gap = 26
disc = R < Rd
dee = disc & (abs(X) > gap / 2)
env = .6 * tex('foam.png', 600) + .4 * tex('ue-depth.jpg', 600)
# brushed radial metal + concave dish normal
nx = X / Rd * .5 + .03 * np.sin(A * 90); ny = Y / Rd * .5 + .03 * np.cos(A * 90)
refl = map_coordinates(env, [(yy / N * 1.2 + ny * 2) * 599, (xx / N * 1.2 + nx * 2) * 599], order=1, mode='grid-wrap')
lum = .15 + .45 * refl + .35 * (.5 - (nx * -.5 + ny * -.7)) + .03 * np.sin(R / 3)
rimw = np.clip(1 - abs(R - Rd + 14) / 14, 0, 1); lum = lum + rimw * .4 * (np.sin(A + 2.2) > 0) - rimw * .2
# dee edges
de = np.clip(1 - (abs(X) - gap / 2) / 10, 0, 1) * dee; lum = lum + de * .45
lum = np.where(disc & ~dee, .08 + .1 * (np.sin(Y / 5) > .5), lum)
# spiral beam: r grows with sqrt(turns); semicircles alternate centre across the gap
beam = np.zeros_like(R)
for t in np.linspace(0.05, 44 * np.pi, 30000):
    rr = 33 * np.sqrt(t); k = int(t // np.pi); sh = gap / 2 * (1 if k % 2 == 0 else -1)
    px = N / 2 + sh + rr * np.cos(t); py = N / 2 + rr * np.sin(t)
    if rr > Rd - 20: break
    ix, iy = int(px), int(py); beam[iy - 1:iy + 2, ix - 1:ix + 2] = 1
beam = gaussian_filter(beam, 1.2); beam = beam / beam.max()
rgb = halftone(duotone(lum), lum, 7)
rgb = np.where((beam > .15)[..., None], YEL * (1 - beam[..., None] * .2) + WHI * beam[..., None] * .2, rgb)
# yoke: octagonal frame
oct_ = np.maximum(abs(X), abs(Y)); oct_ = np.maximum(oct_, (abs(X) + abs(Y)) / np.sqrt(2))
yoke = (oct_ < 520) & ~disc
yl = .25 + .4 * tex('constructivist.jpg', N) * .8 + .15 * (np.sin(oct_ / 4) > .8)
rgb = np.where(yoke[..., None], halftone(duotone(yl), yl, 6), rgb)
a = (disc | yoke).astype(float)
Image.fromarray((np.clip(np.dstack([rgb, a]), 0, 1) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/stage-cyclotron.png')

# ---- hologram re-inked ----
im = np.array(Image.open(HOLO).convert('RGB')).astype(float) / 255
Hh, Ww, _ = im.shape; sc = Hh / 1080
c = im[int(170 * sc):int(1010 * sc), int(560 * sc):int(1880 * sc)]
l = c.max(-1); warm = np.clip((c[..., 1] - c[..., 2]) * 3, 0, 1) * (c[..., 0] > .8)  # pale amber prisms
l = np.clip((l - .2) / .6, 0, 1)
h, w = l.shape; yy, xx = np.mgrid[0:h, 0:w]; e = ((xx - w / 2) / (w / 2)) ** 2 + ((yy - h * .55) / (h * .55)) ** 2
fade = np.clip((1.05 - e) / .2, 0, 1)
col = np.where((warm > .3)[..., None], YEL, BLUE)
alpha = np.clip(l * 1.25, 0, 1) * fade
Image.fromarray((np.dstack([col * np.ones_like(c), alpha]) * 255).astype(np.uint8), 'RGBA').save(f'{OUT}/stage-holo-ink.png')
print('ok', w, h)

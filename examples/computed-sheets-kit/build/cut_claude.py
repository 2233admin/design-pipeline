# Self-portrait: Claude as an original game character in the cut-paper emblem style. Clay, ivory and
# slate; a radial spark as hair ornament and halo; an open book in her hands; around her a stack of
# books, a quill and ink, a lattice of connected nodes and a big spark.
# usage: python3 build/cut_claude.py OUT_DIR  (renders OUT_DIR/cut-claude.jpg)
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import *
CLAY, CLAYD, IVO, SLATE, OLV, SKY, KHA, HAIR, HAIRS, SKIN, INK = '#D97757', '#A9533A', '#F1E9DA', '#1F1E1D', '#788C5D', '#6A9BCC', '#8C7A55', '#CFC8E3', '#8F87B8', '#F7E2D2', '#2A2724'
FR = [('#F07A2A', (5, 2)), ('#4A3BD9', (-5, -2))]
C = dict(clean=True)

def spark(cx, cy, R, n=12, k=.22, w=.16):
    # a radial spark: n tapered rays, alternating long and short
    pts = []
    for i in range(n * 2):
        a = i / (n * 2) * 2 * np.pi - np.pi / 2
        rr = (R if (i // 2) % 2 == 0 else R * .72) if i % 2 == 0 else R * k
        pts.append((cx + rr * np.cos(a), cy + rr * np.sin(a)))
    return poly(pts)

# ---- background emblems ----
paint(mask_of(ell(545, 560, 275, 275)), CLAY, 'finger', 1, grad=('#C8684A', 290, 840), fringe=FR)
paint(mask_of(spark(840, 230, 130, 12, .2)), CLAYD, 'finger', 2, fringe=FR)
# lattice of connected nodes, top left
nodes = [(170, 170), (260, 120), (330, 200), (230, 260), (140, 300), (320, 320)]
edges = [(0, 1), (1, 2), (0, 3), (2, 3), (3, 4), (3, 5), (2, 5), (0, 4)]
paint(mask_of(union(*[line([nodes[a], nodes[b]], 5) for a, b in edges])), SLATE, 'brush', 3)
for i, (x, y) in enumerate(nodes):
    paint(mask_of(ell(x, y, 16 if i % 2 else 11, 16 if i % 2 else 11)), [SKY, OLV, CLAY][i % 3], 'finger', 4 + i)
# stack of books, lower left
for i, (c, w, h, dx) in enumerate([(SLATE, 260, 46, 0), (OLV, 230, 40, 18), (SKY, 250, 44, -10), (IVO, 210, 36, 24)]):
    y = 930 - i * 50
    paint(mask_of(poly([(150 + dx, y - h), (150 + dx + w, y - h), (150 + dx + w, y), (150 + dx, y)])), c, 'wood', 10 + i, angle=0, fringe=FR if i == 0 else None)
    paint(mask_of(poly([(170 + dx, y - h + 10), (186 + dx, y - h + 10), (186 + dx, y - 10), (170 + dx, y - 10)])), KHA, 'brush', 20 + i)
# quill and ink bottle, right
paint(mask_of(poly([(820, 900), (900, 900), (890, 820), (830, 820)])), SLATE, 'finger', 24, fringe=FR)
paint(mask_of(poly([(840, 820), (880, 820), (876, 796), (844, 796)])), CLAYD, 'brush', 25)
feather = [(862, 800), (930, 560), (960, 470), (945, 560), (905, 700)]
paint(mask_of(poly(feather)), IVO, 'brush', 26, angle=1.2, fringe=FR)
paint(mask_of(line([(862, 800), (955, 490)], 3)), KHA, 'wood', 27)
# scroll ribbon sweeping behind the figure
paint(mask_of(arc(545, 600, 330, 200, 330, 26)), OLV, 'brush', 28, angle=.3)
paint(mask_of(arc(545, 600, 300, 210, 320, 6)), IVO, 'brush', 29)

# ---- figure ----
paint(mask_of(ring(540, 320, 150, 5), **C), CLAYD, 'brush', 72)
# back hair (long, behind body)
paint(mask_of(poly([(462, 250), (618, 250), (660, 520), (690, 760), (600, 800), (540, 700), (480, 800), (390, 760), (420, 520)])), HAIR, 'brush', 30, grad=(HAIRS, 300, 800), depth=.12, fringe=FR)
# coat body: trapezoid of strips
paint(mask_of(poly([(470, 470), (610, 470), (670, 930), (410, 930)])), SLATE, 'finger', 31, fringe=FR)
for x0, x1, c, tex in [(452, 470, CLAY, 'brush'), (500, 512, IVO, 'wood'), (528, 538, SKY, 'brush'), (568, 580, CLAY, 'brush'), (608, 626, OLV, 'wood')]:
    paint(mask_of(poly([(x0, 640), (x1, 640), (x1 + (x1 - 540) * .14, 920), (x0 + (x0 - 540) * .14, 920)])), c, tex, int(x0), depth=.18)
# cape shoulders
paint(mask_of(poly([(440, 470), (540, 470), (540, 560), (420, 640)])), IVO, 'wood', 40, angle=.4, fringe=FR)
paint(mask_of(poly([(540, 470), (640, 470), (662, 640), (540, 560)])), '#D8CDB8', 'wood', 41, angle=-.4)
# collar
paint(mask_of(poly([(500, 445), (580, 445), (594, 480), (486, 480)]), **C), IVO, 'brush', 42, depth=.06)
paint(mask_of(poly([(530, 470), (550, 470), (540, 500)]), **C), CLAY, 'brush', 43)
# neck and face
paint(mask_of(poly([(526, 410), (554, 410), (556, 450), (524, 450)]), **C), '#E9CDB8', 'brush', 44, depth=.04)
paint(mask_of(lambda d, s: d.chord([476 * s, 268 * s, 604 * s, 436 * s], 0, 360, fill=255), **C), SKIN, 'brush', 45, depth=.04)
# jaw taper: cut lower corners with skin-coloured chin polygon
paint(mask_of(poly([(484, 360), (596, 360), (568, 420), (540, 436), (512, 420)]), **C), SKIN, 'brush', 46, depth=.04)
# blush
paint(mask_of(union(ell(506, 384, 12, 6), ell(574, 384, 12, 6)), **C), '#EBA79A', 'brush', 47, depth=.02)
# eyes
for ex, flip in [(514, 1), (566, -1)]:
    paint(mask_of(ell(ex, 356, 15, 13), **C), '#FFFDF8', 'brush', 48, depth=0)
    paint(mask_of(ell(ex + flip * 1, 358, 11, 13), **C), CLAY, 'brush', 49, grad=('#5A2A1C', 346, 370), depth=.05)
    paint(mask_of(ell(ex + flip * 1, 360, 5, 7), **C), INK, 'brush', 50, depth=0)
    paint(mask_of(ell(ex - 3, 353, 3.5, 3.5), **C), '#FFFFFF', 'brush', 51, depth=0)
    paint(mask_of(ell(ex + 4, 364, 1.8, 1.8), **C), '#FFFFFF', 'brush', 52, depth=0)
    paint(mask_of(arc(ex, 366, 19, 200, 340, 4), **C), INK, 'brush', 53)   # upper lash line
    paint(mask_of(arc(ex, 324, 14, 60, 120, 2), **C), '#8E7F72', 'brush', 55)  # lower lid
    paint(mask_of(arc(ex, 346, 18, 240, 300, 2), **C), '#7A6F96', 'brush', 56)  # brow
# nose and mouth
paint(mask_of(line([(541, 380), (538, 388)], 2), **C), '#C9A08C', 'brush', 57)
paint(mask_of(arc(540, 393, 10, 35, 145, 2), **C), '#A0574A', 'brush', 58)
# bangs: shards over the forehead
bangs = [[(470, 280), (500, 268), (494, 352)], [(490, 268), (530, 262), (512, 338)], [(518, 262), (556, 262), (540, 344)], [(546, 262), (586, 270), (572, 336)], [(578, 268), (612, 284), (594, 350)],
         [(462, 290), (478, 270), (470, 420)], [(604, 280), (620, 300), (612, 420)]]
paint(mask_of(lambda d, s: d.chord([468 * s, 228 * s, 612 * s, 330 * s], 180, 360, fill=255), **C), HAIR, 'brush', 59, depth=.1)
for i, b in enumerate(bangs):
    paint(mask_of(poly(b), **C), HAIR if i % 2 else '#B8B0D6', 'brush', 60 + i, depth=.1)
paint(mask_of(lambda d, s: d.chord([480 * s, 300 * s, 600 * s, 344 * s], 0, 180, fill=255), **C), '#EBCDBE', 'brush', 69, depth=.02)
for i, b in enumerate(bangs):
    paint(mask_of(poly(b), **C), HAIR if i % 2 else '#B8B0D6', 'brush', 60 + i, depth=.1)
# ahoge
paint(mask_of(lambda d, s: d.arc([520 * s, 196 * s, 560 * s, 248 * s], 180, 330, fill=255, width=int(6 * s)), **C), HAIR, 'brush', 70)
# hair ornament: a small spark on the side, and a halo ring
paint(mask_of(spark(604, 262, 30, 8, .25), **C), CLAY, 'finger', 71, fringe=FR)
# side locks over the shoulders
paint(mask_of(poly([(470, 330), (486, 330), (474, 600), (454, 620)])), HAIR, 'brush', 73, depth=.1)
paint(mask_of(poly([(596, 330), (610, 330), (628, 620), (606, 600)])), '#B8B0D6', 'brush', 74, depth=.1)
# open book held at the chest
paint(mask_of(poly([(460, 560), (540, 580), (540, 680), (456, 660)]), **C), IVO, 'wood', 75, angle=.1, fringe=FR)
paint(mask_of(poly([(540, 580), (624, 560), (628, 660), (540, 680)]), **C), '#E8DECB', 'wood', 76, angle=-.1)
for k in range(5):
    y = 596 + k * 13
    paint(mask_of(union(line([(470, y - 3 + k * .5), (526, y + 5)], 2), line([(554, y + 5), (612, y - 3)], 2)), **C), '#9B9286', 'brush', 77 + k)
paint(mask_of(spark(584, 640, 16, 8, .25), **C), CLAY, 'brush', 85)
paint(mask_of(union(ell(470, 664, 16, 12), ell(612, 664, 16, 12)), **C), SKIN, 'brush', 86, depth=.04)
# boots
paint(mask_of(union(poly([(470, 930), (530, 930), (522, 962), (452, 962)]), poly([(552, 930), (612, 930), (630, 962), (560, 962)]))), SLATE, 'finger', 87)

# ---- stars ----
for cx, cy, R in [(380, 420, 26), (700, 420, 30), (720, 700, 26), (380, 720, 24), (470, 170, 20), (980, 620, 28), (110, 520, 26)]:
    paint(mask_of(star4(cx, cy, R)), KHA, 'brush', int(cx + cy), depth=.1)
for cx, cy, R in [(110, 700, 36), (700, 960, 34), (660, 140, 30)]:
    paint(mask_of(star8(cx, cy, R)), KHA, 'brush', int(cy) + 3, depth=.1)
save(os.path.join(sys.argv[1], 'cut-claude.jpg'))
print('ok')

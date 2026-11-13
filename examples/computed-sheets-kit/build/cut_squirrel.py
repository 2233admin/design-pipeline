# The Squirrel: an original cut-paper animal emblem. A sitting squirrel holding an acorn, its tail one
# big spiral, in front of a night disk, with a crescent moon, a pinecone, a fir stack, a mushroom and an
# oak leaf around it.
# usage: python3 build/cut_squirrel.py OUT_DIR  (renders OUT_DIR/cut-squirrel.jpg)
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import *
ORA, RUST, NAVY, CRM, OLV, KHA, BRN, BLK, GLD = '#D9772B', '#A8302A', '#23214F', '#E6DED0', '#6F7A34', '#8C7A55', '#6B4A2E', '#151517', '#C9962E'
FR = [('#F07A2A', (5, 2)), ('#4A3BD9', (-5, -2))]

def arc_band(cx, cy, r, w, a0, a1):
    return mask_of(arc(cx, cy, r, a0, a1, w))

# ---- background ----
paint(mask_of(ell(560, 560, 250, 250)), NAVY, 'finger', 1, grad=('#2E2A66', 320, 820), fringe=FR)
paint(mask_of(poly([(300, 330), (430, 200), (560, 330), (430, 460)])), CRM, 'brush', 2, angle=.6, depth=.1)   # pale diamond behind the head
# fir stack, left: three stacked triangles
for i, (y, w) in enumerate([(150, 70), (240, 95), (340, 120)]):
    paint(mask_of(poly([(230, y), (230 + w, y + 110), (230 - 10, y + 110)])), BRN, 'wood', 3 + i, angle=1.2)
paint(mask_of(poly([(222, 450), (238, 450), (238, 520), (222, 520)])), BRN, 'wood', 6)
# crescent moon, top right
paint(np.clip(mask_of(ell(800, 230, 95, 95)) - mask_of(ell(840, 200, 82, 82)), 0, 1), GLD, 'wood', 7, angle=.5, fringe=FR)
# rust block with a quarter-circle bite, lower left
paint(np.clip(mask_of(poly([(200, 640), (420, 640), (420, 930), (200, 930)])) - mask_of(ell(420, 930, 120, 120)), 0, 1), RUST, 'finger', 8, fringe=FR)
# oak leaf, lower right
leaf = [(760, 960)]
for k in range(1, 14):
    t = k / 14; y = 960 - t * 330; half = 95 * np.sin(np.pi * t) * (1 + .18 * np.sin(k * 2.2))
    leaf.append((780 + half, y))
leaf.append((780, 620))
for k in range(13, 0, -1):
    t = k / 14; y = 960 - t * 330; half = 95 * np.sin(np.pi * t) * (1 + .18 * np.sin(k * 2.2 + 1))
    leaf.append((780 - half, y))
paint(mask_of(poly(leaf)), OLV, 'brush', 9, angle=1.4, fringe=FR)
paint(mask_of(line([(780, 640), (775, 950)], 6)), '#4F5824', 'wood', 10)
# mushroom, right
paint(mask_of(lambda d, s: d.pieslice([840 * s, 520 * s, 980 * s, 640 * s], 180, 360, fill=255)), RUST, 'finger', 11)
paint(mask_of(poly([(895, 580), (925, 580), (930, 660), (890, 660)])), CRM, 'brush', 12, depth=.08)
paint(mask_of(union(ell(880, 560, 8, 8), ell(920, 548, 6, 6), ell(948, 568, 7, 7))), CRM, 'brush', 13, depth=.05)
# pinecone, top centre-left
paint(mask_of(ell(420, 150, 48, 70)), BRN, 'wood', 14, fringe=FR)
for j in range(5):
    for i in range(3):
        cx, cy = 400 + i * 20 + (j % 2) * 10, 105 + j * 22
        paint(mask_of(poly([(cx - 9, cy), (cx + 9, cy), (cx, cy + 14)])), '#4A321E', 'brush', 15 + i + j * 3)

# ---- squirrel ----
# tail: a big spiral behind the body, banded
paint(arc_band(420, 450, 160, 92, 100, 380), ORA, 'finger', 30, fringe=FR)
paint(arc_band(440, 430, 82, 60, 200, 470), '#E08A35', 'finger', 31)
for cx_, cy_, r_, a0, a1 in [(420, 450, 135, 110, 370), (420, 450, 98, 120, 370), (440, 430, 52, 220, 460)]:
    paint(arc_band(cx_, cy_, r_, 7, a0, a1), RUST, 'brush', 32 + r_)
# body
paint(mask_of(ell(560, 650, 120, 150)), ORA, 'finger', 40, grad=('#B85A1F', 560, 800), fringe=FR)
paint(mask_of(ell(600, 660, 58, 108)), CRM, 'brush', 41, depth=.08)   # belly
# hind leg and foot
paint(mask_of(ell(500, 760, 80, 60)), '#C9652A', 'finger', 42)
paint(mask_of(poly([(470, 800), (600, 800), (610, 830), (460, 830)])), '#B85A1F', 'wood', 43)
# head
paint(mask_of(ell(640, 470, 82, 74)), ORA, 'finger', 44, fringe=FR)
paint(mask_of(poly([(690, 470), (760, 498), (690, 520)])), ORA, 'finger', 45)                    # snout
paint(mask_of(poly([(748, 484), (768, 494), (750, 506)])), BLK, 'brush', 46)                       # nose
paint(mask_of(poly([(660, 500), (740, 506), (690, 534), (655, 525)])), CRM, 'brush', 47, depth=.06)  # cheek
# ears with black tufts
for ex, tilt in [(600, -14), (650, 10)]:
    paint(mask_of(poly([(ex - 26, 420), (ex + tilt, 330), (ex + 26, 420)])), ORA, 'finger', 48 + ex)
    paint(mask_of(poly([(ex + tilt - 14, 352), (ex + tilt, 300), (ex + tilt + 14, 352)])), BLK, 'brush', 49 + ex)
    paint(mask_of(line([(ex + tilt, 330), (ex + tilt - 12, 296)], 3)), BLK, 'brush', 50 + ex)
# eye
paint(mask_of(ell(672, 460, 15, 15)), CRM, 'brush', 60, depth=.05)
paint(mask_of(ell(677, 460, 8, 9)), BLK, 'brush', 61)
paint(mask_of(ell(680, 456, 2.5, 2.5)), '#FFFFFF', 'brush', 62, depth=0)
# whiskers
paint(mask_of(union(line([(735, 500), (790, 486)], 2), line([(735, 506), (792, 508)], 2))), BLK, 'brush', 63)
# paws holding an acorn
paint(mask_of(ell(690, 600, 34, 40)), GLD, 'wood', 64, angle=1.0, fringe=FR)
paint(mask_of(lambda d, s: d.pieslice([650 * s, 548 * s, 730 * s, 608 * s], 180, 360, fill=255)), BRN, 'wood', 65)
paint(mask_of(line([(690, 552), (696, 530)], 5)), BRN, 'wood', 66)
paint(mask_of(union(ell(660, 620, 20, 14), ell(716, 624, 20, 14))), '#C9652A', 'finger', 67)

# ---- stars ----
paint(mask_of(star4(860, 400, 70, .3)), RUST, 'finger', 70, fringe=FR)
for cx, cy, R in [(320, 560, 30), (560, 300, 22), (480, 880, 26), (300, 760, 34), (920, 760, 26), (150, 470, 22)]:
    paint(mask_of(star4(cx, cy, R)), KHA, 'brush', int(cx + cy), depth=.1)
for cx, cy, R in [(640, 940, 46), (130, 300, 34), (960, 300, 30)]:
    paint(mask_of(star8(cx, cy, R)), BRN, 'brush', int(cy), depth=.1)
paint(mask_of(star4(380, 300, 26)), CRM, 'brush', 80, depth=.05)
save(os.path.join(sys.argv[1], 'cut-squirrel.jpg'))
print('ok')

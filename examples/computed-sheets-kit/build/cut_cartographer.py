# The Cartographer: a wide-brimmed surveyor in a strip coat, holding an astrolabe on a brass meridian rod,
# among the emblems of the trade: compass rose, rhumb lines, a lattice of map tiles, a crescent of
# soundings, an indigo sea disk.
# usage: python3 build/cut_cartographer.py OUT_DIR  (renders OUT_DIR/cut-cartographer.jpg)
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cut import *
IND, OCH, BLK, RUST, KHA, CRM, GRY, SEA = '#2D2F6B', '#C08A2E', '#151517', '#B4472B', '#8C7A55', '#EFE6D2', '#7A7672', '#3C6E8F'
FR = [('#F07A2A', (5, 2)), ('#3B53D9', (-5, -2))]

# ---- background emblems ----
paint(mask_of(ell(560, 600, 270, 270)), IND, 'finger', 1, grad=('#4A3E86', 330, 870), fringe=FR)
# quadrant (surveyor's quarter circle) with a graduated arc
paint(mask_of(lambda d, s: d.pieslice([(200) * s, (170) * s, (520) * s, (490) * s], 180, 270, fill=255)), BLK, 'finger', 2)
paint(mask_of(arc(360, 330, 120, 184, 266, 14)), OCH, 'wood', 3)
paint(mask_of(union(*[line([(360 - 158 * np.cos(np.radians(a)), 330 - 158 * np.sin(np.radians(a))), (360 - 136 * np.cos(np.radians(a)), 330 - 136 * np.sin(np.radians(a)))], 4) for a in range(5, 90, 10)])), CRM, 'brush', 4)
# rhumb-line triangle
paint(minus(poly([(600, 150), (880, 150), (880, 430)]), poly([(662, 176), (854, 176), (854, 368)])), GRY, 'brush', 4, angle=.8)
# sounding line: a plumb weight on a dashed rope, right side
paint(mask_of(union(*[line([(840, y), (840, y + 26)], 8) for y in range(200, 470, 40)])), BLK, 'brush', 5)
paint(mask_of(poly([(810, 480), (870, 480), (856, 590), (824, 590)])), BLK, 'finger', 6, fringe=FR)
paint(mask_of(ell(840, 482, 30, 10)), OCH, 'wood', 7)
# lattice of map tiles, lower left
for i in range(3):
    for j in range(3 - i):
        cx, cy = 250 + i * 66 + j * 66, 740 + j * 66 - i * 66
        paint(minus(poly([(cx, cy - 46), (cx + 46, cy), (cx, cy + 46), (cx - 46, cy)]), poly([(cx, cy - 24), (cx + 24, cy), (cx, cy + 24), (cx - 24, cy)])), KHA, 'wood', 9 + i * 3 + j)
# compass rose (big black 4-point) lower right
paint(mask_of(star4(790, 820, 120, .3)), BLK, 'finger', 20)
paint(mask_of(star4(790, 820, 58, .3)), OCH, 'wood', 21, angle=.7)
# rust pennant behind the figure
paint(mask_of(poly([(120, 520), (520, 470), (520, 620)])), RUST, 'brush', 22, fringe=FR)

# ---- figure ----
# coat: long trapezoid, then vertical strips
paint(mask_of(poly([(470, 380), (610, 380), (660, 920), (420, 920)])), BLK, 'finger', 30, fringe=FR)
for x0, x1, c, tex in [(470, 492, RUST, 'brush'), (520, 536, OCH, 'wood'), (566, 578, SEA, 'brush'), (600, 616, OCH, 'wood')]:
    paint(mask_of(poly([(x0, 470), (x1, 470), (x1 + (x1 - 540) * .12, 905), (x0 + (x0 - 540) * .12, 905)])), c, tex, int(x0), depth=.2)
# lapels / cape
paint(mask_of(poly([(450, 380), (540, 380), (540, 470), (430, 560)])), OCH, 'wood', 40, angle=.4, fringe=FR)
paint(mask_of(poly([(540, 380), (632, 380), (652, 560), (540, 470)])), '#9A6B22', 'wood', 41, angle=-.4)
# head: hood shadow, face, visor
paint(mask_of(ell(540, 320, 46, 54)), BLK, 'finger', 42)
paint(mask_of(ell(540, 340, 28, 30)), CRM, 'brush', 43, depth=.08)
paint(mask_of(poly([(510, 296), (570, 296), (570, 330), (510, 326)])), '#2A2A2E', 'brush', 44)
paint(mask_of(union(ell(527, 333, 3.5, 3.5), ell(553, 333, 3.5, 3.5))), BLK, 'brush', 45)
paint(mask_of(ring(553, 333, 11, 3)), OCH, 'wood', 46)
# hat: wide brim + crown
paint(mask_of(ell(540, 276, 122, 20)), BLK, 'finger', 46, fringe=FR)
paint(mask_of(poly([(500, 276), (510, 196), (570, 196), (580, 276)])), RUST, 'brush', 47, grad=('#7E2E1C', 196, 276))
paint(mask_of(poly([(500, 262), (580, 262), (580, 274), (500, 274)])), OCH, 'wood', 48)
# meridian rod (diagonal staff) and astrolabe
paint(mask_of(line([(600, 470), (860, 980)], 12)), '#B9A27A', 'wood', 49, angle=1.1, fringe=FR)
paint(mask_of(ell(700, 540, 82, 82)), OCH, 'wood', 50, angle=.3, fringe=FR)
for r_, w_ in [(70, 6), (48, 4), (26, 4)]:
    paint(mask_of(ring(700, 540, r_, w_)), BLK, 'brush', 51 + r_)
paint(mask_of(union(line([(632, 540), (768, 540)], 4), line([(700, 472), (700, 608)], 4), line([(652, 492), (748, 588)], 3))), BLK, 'brush', 60)
paint(mask_of(ell(730, 512, 10, 10)), RUST, 'brush', 61)
# hand and feet
paint(mask_of(ell(620, 500, 18, 16)), CRM, 'brush', 62, depth=.06)
paint(mask_of(union(poly([(470, 920), (530, 920), (520, 950), (450, 950)]), poly([(550, 920), (610, 920), (630, 950), (560, 950)]))), BLK, 'finger', 63)

# ---- stars ----
for cx, cy, R in [(200, 170, 34), (930, 560, 40), (300, 470, 22), (760, 760, 26), (490, 700, 28), (600, 820, 30), (430, 140, 18)]:
    paint(mask_of(star4(cx, cy, R)), KHA, 'brush', int(cx), depth=.1)
for cx, cy, R in [(170, 600, 42), (900, 220, 34), (680, 980, 36)]:
    paint(mask_of(star8(cx, cy, R)), KHA, 'brush', int(cy), depth=.1)
save(os.path.join(sys.argv[1], 'cut-cartographer.jpg'))
print('ok')

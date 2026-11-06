# ui.lattice-topbar

Top frame: brand mark, six Latin-over-CJK nav pairs with the current one in cyan, three icons in the rail, the y152 hairline.

Style: `lattice-dossier` (`styles/lattice-dossier/style.json`). The top band of every screen of a dark dossier-style site or launcher. current picks the cyan item.

## Where it comes from

computed style of the reference nav (Latin 22 / CJK 14, item starts 772, 902, 1100, 1271, 1412, 1548: gaps 79-80) and pixel samples of the hairlines. Borrow grammar, never assets: the captures of the reference site are private and nothing from them is shipped; all copy is the case's own original fiction (雾航信标).

Samples: fogwake/topbar.

- Reference: hairline y 152 at about 85/255 on black; icons at x 1733, 1808, 1883.
- Case: six pairs fit 772-1550 with our labels.

## Relations to keep

- Nav pairs start at x 772 with 80-unit gaps; Latin 22 over CJK 14, left-aligned.
- The rail hairline x 1683 crosses the band; the three icons sit inside the rail at 75-unit pitch.
- The y152 hairline closes the band.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `brand_cjk` | text | 5 | head | 雾航信标 |
| `brand_latin` | text | 10 | wide | FOGWAKE |
| `nav_en_{i}` | text | 11 | narrow | INDEX / BULLETIN / PILOTS / ATLAS / ARCHIVE / MORE |
| `nav_zh_{i}` | text | 4 | head | 首页 / 情报 / 引航员 / 设定 / 资料馆 / 更多内容 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `current` | decoration | 1-6 | 1 | which nav pair is the current screen (cyan) |
| `nav_x` | rhythm | 700-800 | 772 | x of the first nav pair, 1920 units |
| `icons` | decoration | true / false | true | share, audio (cyan) and account icons in the rail |

## Decoration

- The lens-and-beam brand mark, the icons and the hairlines: drawn.

Sizes: 1920x152, 2880x228. A passing check is technical conformance only, not visual acceptance.

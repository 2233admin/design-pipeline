# broadcast.bp-board

Ban/pick board on a full pink page: stencil timer, sprayed crosses over bans, picks as tilted paper strips, a 5 x 4 hero pool and the order track.

Style: `xerox-flyer` (`styles/xerox-flyer/style.json`). The draft (ban/pick) screen of a two-team game: three bans and five picks a side, a twenty-hero pool with per-tile state and the ban/pick order.

## Where it comes from

Positions from the case's bp.cjs (1920 x 1080); per-tile states and counts became parameters, the hero icons optional image slots with the case's stencil glyphs as stand-ins.

Samples: esports-broadcast/03-bp.

- Case v2: first pass 0 tool findings, 2 by eye (order labels touching the pool; in the 64 px test pink was only 10% of the screen, so the page became pink); final 0; 64 px difference to a generic kit 106 (v1 20).

## Relations to keep

- The page is the ink: full pink ground, black and paper plates; team A pink, team B paper, so the order track and pick bars read without a legend once the note is read.
- The hovered hero is the only tilted pool tile, framed black, with a ransom note.
- Bans get a sprayed cross in the banning team's ink; nothing fades.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `team_a_code` | lettering | 4 | - | ANV |
| `team_a_name` | text | 4 | sans | 铁砧 |
| `team_a_side` | text | 4 | sans | 先手 |
| `team_b_code` | lettering | 4 | - | NFR |
| `team_b_name` | text | 4 | sans | 夜航 |
| `team_b_side` | text | 4 | sans | 后手 |
| `timer` | lettering | 5 | - | 0:23 |
| `round_line` | text | 28 | sans | 第 4 图 熔炉站 · 系列赛 2:1 · 第二轮禁用 |
| `ban_a_{i}` | text | 4 | sans | 守夜 / 回声 /  |
| `ban_b_{i}` | text | 4 | sans | 磐石 / 游隼 /  |
| `ban_waiting` | text | 4 | sans | 待禁 |
| `ban_a_{i}_icon` | image | - | - |  |
| `ban_b_{i}_icon` | image | - | - |  |
| `pick_a_{i}_hero` | text | 4 | sans | 铁锚 / 霜刃 / 棱镜 /  /  |
| `pick_a_{i}_player` | text | 10 | num | Halbert / Ozu / kestrel_ / Mallow / Tin |
| `pick_a_{i}_role` | text | 4 | sans | 先锋 / 突击 / 狙击 / 控场 / 支援 |
| `pick_b_{i}_hero` | text | 4 | sans | 蜂巢 / 余烬 / 雷管 /  /  |
| `pick_b_{i}_player` | text | 10 | num | Quill / moth / Ferrite / Lune / Pebble |
| `pick_b_{i}_role` | text | 4 | sans | 先锋 / 突击 / 狙击 / 控场 / 支援 |
| `pick_a_{i}_icon` | image | - | - |  |
| `pick_b_{i}_icon` | image | - | - |  |
| `next_label` | text | 4 | sans | 下一手 |
| `wait_label` | text | 4 | sans | 待选 |
| `hero_{i}` | text | 4 | sans | 灯匠 / 渡鸦 / 磐石 / 回声 / 织网 / 霜刃 / 潮汐 / 引信 / 棱镜 / 守夜 / 游隼 / 余烬 / 铁锚 / 信鸽 / 雷管 / 蜂巢 / 罗盘 / 苔藓 / 烽火 / 镜湖 |
| `hero_{i}_icon` | image | - | - |  |
| `banned_tag` | text | 4 | sans | 已禁 |
| `hover_note_{i}` | text | 1 | sans | 夜 / 航 / 要 / 禁 |
| `ban_word` | text | 2 | sans | 禁 |
| `pick_word` | text | 2 | sans | 选 |
| `order_note` | text | 30 | sans | 禁选顺序 11 / 16 · 粉 = 铁砧，黑 = 夜航 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `bans_a` | decoration | 0-3 | 2 | bans done by team A |
| `bans_b` | decoration | 0-3 | 2 | bans done by team B |
| `picks_a` | decoration | 0-5 | 3 | picks done by team A |
| `picks_b` | decoration | 0-5 | 3 | picks done by team B |
| `step` | decoration | 0-15 | 10 | current step of the 16-step order (A B A B ban, then picks, a second ban round, picks) |
| `tile_0` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 0 (one tile at most should hover) |
| `tile_1` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 1 (one tile at most should hover) |
| `tile_2` | decoration | free / banned / picked_a / picked_b / hover | banned | state of hero tile 2 (one tile at most should hover) |
| `tile_3` | decoration | free / banned / picked_a / picked_b / hover | banned | state of hero tile 3 (one tile at most should hover) |
| `tile_4` | decoration | free / banned / picked_a / picked_b / hover | hover | state of hero tile 4 (one tile at most should hover) |
| `tile_5` | decoration | free / banned / picked_a / picked_b / hover | picked_a | state of hero tile 5 (one tile at most should hover) |
| `tile_6` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 6 (one tile at most should hover) |
| `tile_7` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 7 (one tile at most should hover) |
| `tile_8` | decoration | free / banned / picked_a / picked_b / hover | picked_a | state of hero tile 8 (one tile at most should hover) |
| `tile_9` | decoration | free / banned / picked_a / picked_b / hover | banned | state of hero tile 9 (one tile at most should hover) |
| `tile_10` | decoration | free / banned / picked_a / picked_b / hover | banned | state of hero tile 10 (one tile at most should hover) |
| `tile_11` | decoration | free / banned / picked_a / picked_b / hover | picked_b | state of hero tile 11 (one tile at most should hover) |
| `tile_12` | decoration | free / banned / picked_a / picked_b / hover | picked_a | state of hero tile 12 (one tile at most should hover) |
| `tile_13` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 13 (one tile at most should hover) |
| `tile_14` | decoration | free / banned / picked_a / picked_b / hover | picked_b | state of hero tile 14 (one tile at most should hover) |
| `tile_15` | decoration | free / banned / picked_a / picked_b / hover | picked_b | state of hero tile 15 (one tile at most should hover) |
| `tile_16` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 16 (one tile at most should hover) |
| `tile_17` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 17 (one tile at most should hover) |
| `tile_18` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 18 (one tile at most should hover) |
| `tile_19` | decoration | free / banned / picked_a / picked_b / hover | free | state of hero tile 19 (one tile at most should hover) |

## Decoration

- Stencil hero glyphs (twenty geometric marks with two bridges), crosses, dashed frames, order squares.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.

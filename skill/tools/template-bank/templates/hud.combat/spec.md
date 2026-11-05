# hud.combat

Combat HUD in one acid ink on black slabs: giant chamfered HP and ammo numerals (ammo over a misregistered red plate), a tilted vitals slab, a kill sticker.

Style: `acid-print-hud` (`styles/acid-print-hud/style.json`). The in-combat HUD of a first-person tactical shooter: minimap, score and clock, compass and objective, kill feed, crosshair, kill sticker, vitals, abilities and weapon, over a scene image.

## Where it comes from

Positions from the case's final HUD (hud2.css, render(state) in hud2.js) in 1920-unit coordinates; numerals with the case's lettering parameters (width 0.55, stroke 0.19, chamfer 0.12 diagonal, slant 0.1).

Samples: tactical-hud/hud-1080p.

- Default HP is 74, not the case's 68: the bank's chamfered 8 reads as B at HUD size (follow-up).
- Round 2: first pass 3 findings on the still, 5 on the state sheet, 1 on the motion; 4 more seen only by eye; final 0.
- Round 1 (mono direction) first pass had 14 findings, six of them text written straight on the scene (collage-cover): every readout now has a slab.
- The bank's chamfered 8 reads as B or H at HUD sizes; the case rebuilt it from two O loops (a lettering follow-up).

## Relations to keep

- One ink: acid for everything that matters, red only for damage, enemies and low states, white for names and values, mute for micro labels.
- Two giant numerals (HP 112 px, ammo 168 px cap) against 15 px micro labels: the Swiss-poster scale jump.
- Every readout sits on a black slab at 88%: nothing small floats on the scene.
- Vitals slab tilted -3 degrees from its bottom-left corner; kill sticker -5 degrees with a red offset plate; all else square.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `scene` | image | - | - |  |
| `location` | text | 12 | sans | 灰烬港 · 七号码头 |
| `location_sub` | text | 14 | sans | B 区东侧 · 集装箱巷 |
| `score_us` | lettering | 2 | - | 3 |
| `score_them` | lettering | 2 | - | 2 |
| `clock` | text | 5 | num | 1:24 |
| `round` | text | 14 | sans | 第 6 回合 · 先胜 7 |
| `compass_mark` | text | 2 | num | N |
| `bearing` | text | 3 | num | 012 |
| `objective_letter` | text | 1 | num | B |
| `objective` | text | 3 | sans | 占领中 |
| `objective_pct` | text | 4 | num | 62% |
| `marker_letter` | text | 1 | num | B |
| `marker_distance` | text | 5 | num | 64 m |
| `feed_{i}_killer` | text | 3 | sans | 灰隼 / 白鹭 / 石像 |
| `feed_{i}_victim` | text | 2 | sans | 夜枭 / 赤狐 / 苇 |
| `feed_tag` | text | 2 | sans | 爆头 |
| `kill_word` | text | 2 | sans | 击杀 |
| `kill_name` | text | 3 | sans | 夜枭 |
| `kill_points` | text | 5 | num | +100 |
| `medal` | text | 2 | sans | 双杀 |
| `shield_label` | text | 2 | sans | 护盾 |
| `shield_value` | text | 3 | num | 50 |
| `hp` | lettering | 3 | - | 74 |
| `hp_label` | text | 8 | sans | HP / 生命 |
| `operator` | text | 3 | sans | 灰隼 |
| `operator_sub` | text | 8 | sans | 突击 · 03 |
| `status` | text | 5 | sans | 灼烧 3s |
| `ability_key_{i}` | text | 1 | num | Q / E / C |
| `ability_cooldown` | text | 2 | num | 6 |
| `ult_charge` | text | 4 | num | 78% |
| `ult_key` | text | 1 | num | X |
| `grenades` | text | 3 | num | ×2 |
| `weapon_code` | text | 5 | num | KR-7 |
| `weapon_name` | text | 4 | sans | 渡鸦 |
| `weapon_mode` | text | 22 | sans | 7.62 · 全自动 · 720 RPM |
| `secondary_key` | text | 1 | num | 2 |
| `secondary` | text | 14 | sans | P-9 短吻 · 12/12 |
| `ammo` | lettering | 3 | - | 24 |
| `reserve_label` | text | 8 | num | RESERVE |
| `reserve` | text | 4 | num | /120 |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `bearing` | decoration | 0-359 | 12 | compass bearing in degrees |
| `capture` | decoration | 0-100 | 62 | objective capture progress, % |
| `hp_lag` | decoration | 0-100 | 68 | the red damage-lag segment of the HP bar (shows 0.4 s after a hit) |
| `vitals_tilt` | rhythm | -5--1 | -3 | vitals slab tilt, degrees (the broken-grid move) |
| `kill_tilt` | rhythm | -8--3 | -5 | kill sticker tilt, degrees |
| `kill_sticker` | decoration | true / false | true | the kill sticker and the crosshair's kill marks |
| `medal` | decoration | true / false | true | the multi-kill medal under the sticker |
| `damage` | decoration | true / false | true | the red damage-direction arc |
| `ability_q` | decoration | ready / cooldown / off | ready | Q ability state |
| `ability_e` | decoration | ready / cooldown / off | cooldown | E ability state |
| `ability_c` | decoration | ready / cooldown / off | off | C ability state |
| `ult_ready` | decoration | true / false | false | ultimate ready (acid diamond) |

## Decoration

- Minimap blocks and cone, compass ticks, magazine ticks, barcode, shield cells, ability icons, crosshair, damage arc.

Sizes: 1920x1080, 2560x1440, 3840x2160. A passing check is technical conformance only, not visual acceptance.

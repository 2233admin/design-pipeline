# banner.ink-terminal

Switchboard terminal: a cyan monitor with scanlines and timestamped lines, a four-step handshake (ending refused), a signal send button and a rail-script stream.

Style: `megastructure-ink` (`styles/megastructure-ink/style.json`). A terminal or network-access panel. state=idle|fail; lines 3-5.

## Where it comes from

The case's switchboard screen (terminal log and handshake). Borrow grammar, never assets: the reference images are private and nothing from them is shipped; all copy is the case's own original fiction (穹井). No figure, mecha or object is drawn; structure is an abstract line system.

Samples: megastructure-ink-kit/switchboard.

- Reference monitors: cyan face, thin labels, scanlines about 4 units at 1920 (3 in the pack).

## Relations to keep

- Monitor 1000 x 512 with 3-unit scanlines; lines 40 units apart; a refused last line carries a 2-unit alarm edge.
- Four steps of 172 x 96: done steps have a line top edge, the refused step alarm_dim with an alarm edge.

## Slots

| Slot | Kind | Budget | Font role | Default (original placeholder copy) |
| --- | --- | --- | --- | --- |
| `title` | text | 7 | body | 接线台 7 号 |
| `title_en` | text | 16 | wide | SWITCHBOARD 07 |
| `line_id` | text | 10 | data | LINE 0412 |
| `message` | text | 20 | body | 接入被拒绝：缺少回声钥。 |
| `send` | text | 5 | body | 发送握手 |
| `time_1` | text | 8 | data | 03:12:40 |
| `kind_1` | text | 3 | data | SYS |
| `line_1` | text | 24 | body | 接线台 7 号 唤醒 |
| `time_2` | text | 8 | data | 03:12:41 |
| `kind_2` | text | 3 | data | SYS |
| `line_2` | text | 24 | body | 线路 0412 · 0413 · 0419 在线 |
| `time_3` | text | 8 | data | 03:12:44 |
| `kind_3` | text | 3 | data | REQ |
| `line_3` | text | 24 | body | 发送握手 / 层号 4,112 |
| `time_4` | text | 8 | data | 03:12:47 |
| `kind_4` | text | 3 | data | ACK |
| `line_4` | text | 24 | body | 总台应答：识别码未登记 |
| `time_5` | text | 8 | data | 03:12:47 |
| `kind_5` | text | 3 | data | ERR |
| `line_5` | text | 24 | body | 接入被拒绝：缺少回声钥 |
| `step_1` | text | 4 | body | 唤醒 |
| `step_en_1` | text | 10 | wide | WAKE |
| `step_2` | text | 4 | body | 握手 |
| `step_en_2` | text | 10 | wide | HANDSHAKE |
| `step_3` | text | 4 | body | 鉴权 |
| `step_en_3` | text | 10 | wide | VERIFY |
| `step_4` | text | 4 | body | 接入 |
| `step_en_4` | text | 10 | wide | CONNECT |

## Parameters

| Parameter | Class | Range | Default | Note |
| --- | --- | --- | --- | --- |
| `guides` | decoration | true / false | false | draw layout guides |
| `state` | decoration | idle / fail | fail | handshake state |
| `lines` | decoration | 3-5 | 5 | terminal lines |

## Decoration

- Scanlines, cursor, step numbers, rail-script stream: drawn.

Sizes: 1920x640, 2880x960. A passing check is technical conformance only, not visual acceptance.

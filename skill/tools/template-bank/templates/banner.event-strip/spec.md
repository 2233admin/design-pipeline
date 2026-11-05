# banner.event-strip — 活动横幅（约 3.1:1）

> 测量依据，原样来自调研（`docs/research/arknights-endfield-template-study.md`）。槽位上限、参数范围和调色板以同目录 `manifest.json` 为准；`template check` 量出来后改过的地方列在其 `changesFromStudy`。

画布 1560×500。来源：明日方舟 BANNER 4 张（1560×500 ×3、1052×337 ×1）；全库这一比例 29+1 张。

## 什么时候用
活动入口横幅：一端人物，另一端“活动名 + 起止日期”。

## 槽位与上限
| 槽位 | 类型 | 上限 |
|---|---|---|
| figure | 图片 | 一端 0.50W（`side` 参数决定左右） |
| title_row_1 / title_row_2 | 文本放在实心色块里 | 6 / 9 字 |
| date_start / date_end | lettering 大号数字 `MM/DD` | 5 字符，字高 0.17H |
| date_start_time / date_end_time | lettering 小号 `hh:mm` | 5 字符 |
| caption | 文本 | ≤12 |

## 量出来的比例
- 标题区面积中位 29%（类别里最大，横幅文字占比高），文字区宽约 0.45W。
- 4 张里 2 张人物在一端、文字在另一端；AK031 是两端人物、中间文字（`side=both` 变体）。
- 色彩：C* 中位 12.7（全库最高的类别之一），中性像素只占 0.34；彩色簇 45% 落在 h 0–30°（红）。

## 关系 vs 装饰
- **关系**：日期数字是全图最大的拉丁字形；活动名用实心色块托底；人物与文字不重叠。
- **装饰**：右端竖色边、箭头。

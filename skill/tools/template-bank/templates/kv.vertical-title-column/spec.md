# kv.vertical-title-column — 右侧竖排大标题列，人物群在左

> 测量依据，原样来自调研（`docs/research/arknights-endfield-template-study.md`）。槽位上限、参数范围和调色板以同目录 `manifest.json` 为准；`template check` 量出来后改过的地方列在其 `changesFromStudy`。

画布 1920×1080。来源：EF053 细测；同型 AK017、EF058、AK010（63 张有版式标注的图里竖排标题 8 张）。

## 什么时候用
章节/版本主视觉，需要“书法/题字”气质；中文标题短（2–4 字）。

## 槽位与上限
| 槽位 | 类型 | 上限 |
|---|---|---|
| title_vertical | 文本竖排（writing-mode: vertical-rl，字保持正立），思源宋体 Heavy | 2–4 字，字高 0.125H |
| tag_plate + tag_vertical | 色块 + 竖排文本 | ≤6 字 |
| sub_vertical | 竖排文本 | ≤6 字 |
| line_vertical | 竖排文本 | ≤10 字 |
| latin_vertical | lettering 旋转 90° | ≤14 字符（拉丁字母可以整行旋转，汉字不可以） |
| figure_group | 图片 | x 0.02–0.62W |
| logo | 图片 | 左上 |

## 量出来的比例（EF053）
- 主标题列 x 0.80–0.90W，y 0.23–0.73H；红色竖标签 x 0.905–0.93W，y 0.21–0.38H；副题列 x 0.74–0.77W。
- 读序：从右到左各列，与竖排阅读习惯一致（主标题 → 副题 → 短句）。
- 人物群主体止于约 0.62W；右侧标题区是留白最多的区域。

## 关系 vs 装饰
- **关系**：竖排汉字不旋转；列与列之间从右往左读；标题区与人物区左右分开。
- **装饰**：右上四根黑色短竖条、菱形分隔点。

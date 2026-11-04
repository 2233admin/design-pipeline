# kv.ef-operator-plate — 白底 + 人物左侧大幅 + 右下名牌

> 测量依据，原样来自调研（`docs/research/arknights-endfield-template-study.md`）。槽位上限、参数范围和调色板以同目录 `manifest.json` 为准；`template check` 量出来后改过的地方列在其 `changesFromStudy`。

画布 1920×1080。来源：EF059 细测，EF052、XEF10 同型。

## 什么时候用
亮色、角色本身就是主视觉的发布图；文字只有一块名牌。

## 槽位与上限
| 槽位 | 类型 | 上限 |
|---|---|---|
| figure | 图片 | x 0.03–0.69W，全高；底部 22% 白色渐隐 |
| plate_label | lettering `// LABEL +` | ≤16 字符 |
| name_cjk | 文本，思源黑体 Bold | ≤6 字 |
| class_icon / element_icon | 方块 | 2 个，第二个用 accent2 |
| rarity_0..5 | 自绘三角刻 | 1–6 |
| accent_shard | 自绘多边形 | 总面积 ≤ `shard_share`（默认 10%） |
| logo | 图片 | 右上 0.06W×0.115H |

## 量出来的比例
- 名牌 x 0.63–0.98W，y 0.55–0.73H；等级行 y 0.76–0.82H（EF059）。
- logo x 0.88–0.94W，y 0.045–0.17H；版权右缘 0.96W。
- 终末地 KV 的最大色簇 L* 中位 94.8（16 张），即“白底”是常态；KV_OPERATOR 强彩像素中位 0.116、荧光黄像素中位 2.4%。
- 标题与人物横向重叠 >30%：终末地有人物的 KV 14 张中 8 张（版本/活动 KV 常把标题压在人物上），但 KV_OPERATOR 4 张中只有 1 张——名牌放在人物质量的另一侧。

## 关系 vs 装饰
- **关系**：名牌是一块白色实底（保证可读），与人物质量中心分居两侧；强调色只用一个荧光色 + 一个副色。
- **装饰**：碎片形状（自绘，非描摹）、白色渐隐。

# ui.ef-activity-panel — 终末地式活动面板（左导航 + 右对齐标题 + 任务行 + 荧光胶囊按钮）

> 测量依据，原样来自调研（`docs/research/arknights-endfield-template-study.md`）。槽位上限、参数范围和调色板以同目录 `manifest.json` 为准；`template check` 量出来后改过的地方列在其 `changesFromStudy`。

画布 1920×1200（16:10）。来源：终末地 UI_SCREEN 24 张（EF072 细测，2340×1080 换算）。

## 什么时候用
活动页、任务页、奖励页的界面原型或宣传截图版式。

## 槽位与上限
| 槽位 | 类型 | 上限 |
|---|---|---|
| header_slashes + header_cjk | lettering `//` + 文本 | ≤6 字 |
| nav_label_i / nav_thumb_i | 文本 + 缩略图 | 7 项，每项 ≤6 字；当前项色块延伸到画布左缘 |
| title_cjk / help_label / timer / tag_pill | 文本，右对齐到 0.94W | 6 / 6 / 10 / 4 |
| panel_intro | 文本 | ≤34 |
| task_k / progress_k / reward_k_j / claim_k | 文本 / lettering / 图 / 文本 | 3 行；任务 ≤32 字 |
| cta / cta_label | 荧光胶囊 | ≤4 字 |
| scene | 图片 | 全出血背景 |

## 量出来的比例
- 左导航 x 0.06–0.20W，首项 y 0.17H，项高 0.085H，间距 0.02H；当前项高亮并向左出血到 x=0。
- 标题块右对齐到 x 0.94W，y 0.14–0.29H；关闭按钮中心 (0.935W, 0.05H)。
- 内容面板 x 0.545–0.94W，从 0.475H 开始；每行高约 0.13H。
- 24 张里 14 张出现荧光黄（≥0.2% 像素），只在主按钮/标签/当前项；最大色簇 L* 中位 15（深色场景），中性像素中位 0.77。

## 关系 vs 装饰
- **关系**：左导航与右标题形成对角平衡；所有“可操作”元素才用荧光色；页面名一律 `//` 前缀。
- **装饰**：红点 NEW 角标、细竖线、状态行。

# 字体与中文排版

六个字体角色，全部开源（SIL OFL），可随 GPL 项目分发。拉丁和中文在同一个栈里按字符回退，一行混排自动各用各的。

## 1. 字体清单

| 角色 | family key | 拉丁 | 中文 | 来源 | 托管 |
|---|---|---|---|---|---|
| 压缩标题 | `display` | Barlow Condensed 600/700 | 得意黑 Smiley Sans | Google Fonts / GitHub atelier-anchor/smiley-sans | Google + 自托管 |
| 表格数据 | `mono` | Maple Mono | Maple Mono NF CN（同一字体含汉字） | GitHub subframe7536/maple-font | 自托管 |
| LCD 读数 | `lcd` | DM Mono 400/500 | —（LCD 不放汉字） | Google Fonts | Google |
| 七段数码管 | `seg` | DSEG7 Classic | — | GitHub keshikan/DSEG | 自托管 |
| 点阵标签 | `dot` | Doto | 缝合像素 Fusion Pixel 12px | Google Fonts / GitHub TakWolf/fusion-pixel-font | Google + 自托管 |
| 正文 | `sans` | Noto Sans SC 自带 | Noto Sans SC 400/700（备选 LXGW Neo XiHei） | Google Fonts / GitHub lxgw/LxgwNeoXiHei | Google 或自托管 |

备选池（不进第一版）：Sarasa Gothic 更纱黑体（替代 Maple Mono CN）、方舟像素 Ark Pixel（替代缝合像素）、Big Shoulders Display（更"工业"的拉丁标题）、JetBrains Mono（替代 DM Mono）。

**许可证**：以上均为 SIL OFL 1.1。OFL 字体作为独立作品随 GPL 软件分发没有冲突；保留每个字体的 OFL.txt 在 `fonts/` 下。

## 2. 中英混排规则

1. **一个栈，按字符回退。** `display` = Barlow Condensed → Smiley Sans：浏览器对每个字符取栈里第一个有该字形的字体，"策略舰队 FLEET"自动拉丁用 Barlow、汉字用得意黑。不要为中英文分别写两个 class。
2. **字号补偿。** Barlow Condensed 的 x-height 偏小，与得意黑同字号时拉丁显矮：`label` 拉丁用 14px 对 13px 汉字。补偿写进 token，不在组件里各自调。
3. **行高。** 拉丁 1.3；中文正文 1.6；混排取 1.5。`body` 12px → 19px 行高。
4. **字距。** 汉字永远不加 letter-spacing（会散）。拉丁只在全大写时加 0.04–0.12em。`display-xl` 的 0.04em 对汉字由 `font-feature-settings` 不生效即可，无需额外处理。
5. **字号底线。** 汉字 ≥ 11px；9px 的 `tag` 只允许大写拉丁或点阵字；点阵中文固定 12px（`tag-cn`），只用 12 的整数倍，不缩放。
6. **数字永远走 `mono`。** 中文正文里的数字也用 Maple Mono 的 tabular 数字，用 `unicode-range: U+0030-0039` 的 @font-face 把数字切出去，不用 Noto 的比例数字。
7. **中西文间距。** 开 `text-autospace: normal`（Chrome 2025+）；不支持的浏览器由渲染层在汉字与拉丁/数字之间插入 1/4 em（`0.25em` 的 `margin`），不插空格字符。
8. **标点。** 中文标点全角；`text-spacing-trim: trim-start` 收行首标点；LCD 与 tag 不出现中文标点。
9. **表格对齐。** 中英混排的表格列必须用 `mono`（Maple Mono CN 汉字宽 = 2 × 拉丁宽），这是列能对齐的唯一方式。`sans` 不进表格。

## 3. 加载与分片

- 中文字体全量 5–15 MB，必须切片：用 `cn-font-split` 按 unicode-range 切成约 100 个 woff2（每片 20–80 KB），`@font-face` 逐片声明；浏览器只下载页面用到的片。
- 首屏优先级：`display` 与 `mono` 的 GB2312 一级字（约 3,755 字）预加载；二级字与生僻字按需。
- `font-display: swap`，但 LCD 与 tag 用 `optional`——这两处换字会跳动，宁可首帧用回退。
- 子集化拉丁字体（Barlow Condensed 只留 600/700，DM Mono 留 400/500）。
- 全部自托管在 `fonts/`，不依赖 Google Fonts 的运行时可用性（国内访问）；Google Fonts 只作开发期方便。
- 字体文件就位后在 `tokens.json` 的 `type.fonts[]` 登记每个文件，`tokens.css` 自动生成 `@font-face`。

## 4. 每个组件用什么

| 组件 | 标题 / 标签 | 数值 | 正文 |
|---|---|---|---|
| PanelFrame | `label`（display） | `num` | — |
| WorkspaceTabs | `display-md` | — | — |
| LCDReadout | `tag`（dot） | `lcd-xl` / `lcd-md` / `seg-xl` | — |
| Meter | `caption`（sans）或 `tag` | `num-sm` | — |
| StatusLED | `tag` | — | — |
| CommandLine | — | `lcd-md` 输入 | `body` 建议说明 |
| 表格（盘口、持仓、自选） | `caption` 表头 | `num` / `num-sm` 全列 | — |
| 设置、参数、说明 | `label` | `num` | `body` |

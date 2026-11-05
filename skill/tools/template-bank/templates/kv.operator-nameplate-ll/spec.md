# kv.operator-nameplate-ll — 新角色 KV，名牌左下，稀有度与署名右下

> 测量依据，原样来自调研（`docs/research/arknights-endfield-template-study.md`）。槽位上限、参数范围和调色板以同目录 `manifest.json` 为准；`template check` 量出来后改过的地方列在其 `changesFromStudy`。

画布 1920×1080。来源：明日方舟 KV_OPERATOR 6 张 + AK003 细测。

## 什么时候用
发布一个新角色：人物居中、带特效，名字信息集中在左下角，右下放等级与署名，背后一条大字水印带。

## 槽位与上限
| 槽位 | 类型 | 上限 |
|---|---|---|
| logo、faction_mark | 图片 | 左上，0.065W×0.05H 与 0.05H 方块 |
| kicker / kicker2 | lettering | 各 ≤10 字符，y≈0.29H |
| name_cjk | 文本，思源宋体 Heavy | ≤6 字 |
| name_latin | lettering | ≤9 字符，宽度 ≤ 0.22W（`set_text` 返回值校验） |
| class_latin / class_cjk / class_icon_0..1 | lettering / 文本 / 方块 | 12 / 8 |
| rarity_0..5 | 自绘菱形 | 1–6 个 |
| credit_label/value_0..1 | 文本 | 各 ≤8 |
| watermark_word | lettering 轮廓大字 | ≤10 字符，带高 0.13H |
| figure | 图片 | 中心 0.53W，宽 0.56W，全高 |

## 量出来的比例
- 名字在左：6/6；在下半幅：5/6；标题中心 x 中位 0.126W、y 中位 0.735H；面积中位 4.2%（比时装 KV 小一半——名字小、人物大）。
- AK003 实测：名字块 x 0.03–0.225W、y 0.67–0.84H；水印字带 y 0.53–0.66H，横贯全宽；等级行 x 0.84–0.98W、y 0.67–0.72H；左右边距约 0.03W，底边距约 0.045H。
- 标题与人物重叠 >30%：0/6。人物中心 x 中位 0.50，宽 0.525W。
- 浅底为主（最大簇 L* 中位 89.3），彩色色相分散度中位 48°（比时装 KV 高：特效色 + 一个强调色）。

## 关系 vs 装饰
- **关系**：名字块与等级/署名块分居左右下角并在同一水平带（y 0.67–0.8H）；水印带紧贴名字块上方，被人物遮挡。
- **装饰**：kicker 下的短黑条、类别图标、免责小字。

## 调色板角色
bg 浅中性 / ink 近黑 / accent=water 一个高彩色（示例取红，可换）/ plate 图标底。

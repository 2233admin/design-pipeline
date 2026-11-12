# SeriesBrowser

序列浏览器：把任意数据集的任意字段（宏观 / 资金流 / 指数 / 因子 / 自算）拖进来叠线对比，提供指数化、对数、差分、滚动均值等变换，叠事件 / 衰退竖带。Fincept「Global Data」与 TradingView 宏观图的对应，站在 PriceChart 多线皮肤上。

## 结构

- 顶部 chip 列：每条序列一个 chip（色块 · 名 · 变换链 · ×）；「+ 拖入 / 搜索」走 cmdk 搜目录；右侧全局变换 Segmented。
- 图：`series-1..7` 固定色，2px；事件 / 衰退竖带 `bg-100`（Profile 日历或用户标注）；无填充。
- 底行：两两相关（滚动窗口）· 来源 · 一句规则提示。
- 量纲不同且未指数化的序列：chip 上 amber ✖ 并提示"→ 独立面板"，不提供双 Y 轴。

## 交互

- 拖字段进图 = 加序列（从 DatasetCatalog / FactorLibrary / Fundamentals）；拖出 = 删。
- 点击 chip → 变换菜单（指数化到 100 / 对数 / 一阶差分 / 同比 / 滚动均值 n / 标准化 z）；变换链可叠加 ≤ 3。
- 刷选 → LinkContext.range；双击复位。
- 「保存为对比集」→ 命名并可被 ReportBuilder / Notes 引用；「导出 CSV」。

## 规则

- ≤ 7 条序列；超出折进「其他」或拆面板。
- 不同频率自动对齐到最低频（标明方法：前值填充 / 均值）。
- 不做双 Y 轴（dataviz.md 硬规则）；不做"AI 解读"。
- 所有变换在 Worker；原始数据不改。

## 谁提供什么

- 组件：series[]（datasetId、field、transforms[]、points[]）、bands[]、range、globalTransform、onAdd、onRemove、onSave。
- 调用方：数据平台序列读取（Query）+ Profile 日历。

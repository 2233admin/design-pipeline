# EventStudy

事件研究：某类事件（业绩预告、解禁、指数调入、北向大幅流入……）前后 N 日的累计超额收益均值线 + 置信带（点阵纹理）+ 随机日对照（灰虚），右侧统计。回答"这类事件值不值得做成信号"，是 AlertCenter 规则和因子的孵化器。

## 结构

- 顶行：run 蓝标 · 事件定义与样本数 · 视图 Segmented（CAR / 逐日 AR / 换手）· 窗口。
- 图：T0 橙虚竖线；CAR 均值 `series-1` 2px；95% 带点阵纹理 `seq-300`（不是实色透明，dataviz §3 签名）；随机日对照 `ink-300` 虚线；多事件类型对比时各 `series-n`，带只给焦点事件。
- 右统计：CAR 关键窗与 t 值 · 事件前漂移（泄露检测）· 命中率 · 样本与剔重规则 · 对照 · 衰减结论（文字来自固定统计，不是 Alice）。

## 交互

- 悬停 → tooltip：相对日、CAR、带上下界、当日样本数。
- 拖选窗口 → 右侧统计重算该窗（Worker）。
- 「做成因子」→ RunLauncher（factor 类型，事件哑变量）；「做成警报」→ AlertCenter（事件源 L1）。
- 多事件对比 ≤ 4 条。

## 规则

- 置信带 bootstrap 或 t；方法标注。超额基准（市场 / 行业中性）标注。
- 事件前漂移 t > 2 时 amber 提示"可能泄露 / 前视"。
- 不用涨跌色；CAR 为负不变色。
- 样本 < 50 整图 `ink-300` 并标 `样本少`。

## 谁提供什么

- 组件：events[]（type、car[]、band[][]、n）、control[]、window、stats、view、onBrush、onMakeFactor、onMakeAlert。
- 调用方：事件研究 run（Query）。

# ParamScatter

参数敏感性：优化 run 的每一组参数一个点，纵轴目标值（样本外 Sharpe / 收益 / 卡玛）。重点不是最优点，是**平坦区**——目标值在最优附近下降 ≤ 15% 的参数范围，用橙暗底带标出。双参数时切成热力图（Heatmap 顺序色）。

## 结构

- 顶行：run 蓝标 · 组数与采样器 · 参数 Segmented（单参数 1…n，加 "A × B" 双参数）· 目标。
- 散点：`seq-200..600` 按目标值着色（顺序色，暗→亮），点 ≥ 6px；最优点橙圈 + glow + 标签；平坦区竖带 `signal-orange-dim` 35%；网格 `chart-grid`。
- 右框键值：最优 · 平坦区范围与格数 · 平坦度（区内均值 / σ）· 边缘值（amber 若悬崖）· 当前 run 落在哪 · 建议（指向 Alice 评估，`ink-300`）· 完成组数。
- 双参数：热力格 = 目标值，最优格橙描边，平坦区格 `seq-500+`；第三参数固定在最优并在顶行注明。

## 交互

- 悬停点 → tooltip：全部参数、目标、换手、回撤、run 子 id。
- 点击点 → EquityCurve 显示该组净值（研究账本），RunInspector 显示该子 run。
- 拖选一段参数范围 → 右框重算该范围的平坦度；「以此范围重跑」= RunLauncher 预填。
- 目标切换：点 `gentle` 移动，颜色重映射。

## 规则

- 不画拟合曲线（会让人觉得平滑）；只画点和平坦区。
- 最优点永远同时显示平坦区；禁止只报最优。
- 优化中：已完成的点逐个 `snappy` 出现，未完成灰点占位；完成后 `run-done`。
- 不做 3D 曲面；双参数用热力。

## 谁提供什么

- 组件：trials[]（params、objective、metrics、subRun）、param、param2?、objective、flatBand、onSelectTrial、onRerunRange。
- 调用方：optimize run 产物（Query / 运行中流）。

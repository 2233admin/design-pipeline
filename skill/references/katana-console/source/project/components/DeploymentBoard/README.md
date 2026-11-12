# DeploymentBoard

部署看板：每条策略在哪个阶段——research → paper → live → retired，四列是阶段（不是 tab），卡片在列间移动就是生命周期推进。每张卡：名称 + 当前 run · 五门 LED · 阶段相关的两个数（研究：OOS Sharpe / 容量；paper：天数进度 / 偏离；live：账户 / 天数 / 偏离 / YTD / 容量使用）。

## 结构

- 四列等宽；PAPER 列标题带蓝灯、卡片左 2px 蓝条；LIVE 列标题 amber、卡片左 2px amber 条——与 AccountRail 的账户种类标识一致，不可皮肤化。
- 每列 ≤ 5 张卡可见，其余折叠 `+n 更多`。
- 卡底一行 `next`（`ink-400`）：下一步是什么或卡在哪道门（"4/4 门 → 可推进 paper"、"偏离超 15% · 查 LiveDivergence"）。
- paper 卡有进度条（点阵纹理；偏离超限时 amber 纹理）。
- RETIRED 卡 55% 透明，只留名称、日期、原因。

## 交互

- 推进 / 回退 = 把卡拖到相邻列（弹簧让位），松手弹**核心确认框**（内含 ConsensusBlock：GATES · CAPACITY · ACCOUNT）（写命令 `strategy.promote` / `strategy.demote`），确认后卡落位 `settle`；拒绝则弹回。只能移到相邻列；跳列不允许。
- 门未齐的卡拖到下一列会被挡回（橡皮筋 + `cmd-err`），不弹确认。
- 点击卡 → 该策略的研究台面（run、对照、偏离）；点击门 → RunInspector 证据。
- live 卡右键：暂停发信号 / 降容量 / 退役，全部写命令。

## 规则

- 推进 live 必须：五门全过 + paper ≥ 配置天数 + 指定账户 + 容量上限；缺一项确认框禁用主按钮并写原因（≤ 12 字）。
- 退役的策略永不删除；retired 列可按年份折叠。
- 看板不显示盈亏排名；YTD 只在 live 卡上作为状态，不排序。
- 阶段变化写入 run 谱系（一个 `promote` 事件 run）。

## 谁提供什么

- 组件：strategies[]（id、name、stage、run、gates[5]、stageMeta）、policy（推进条件）、onPromote、onDemote、onAction。
- 调用方：策略注册表（Query）、门评估器、执行网关（live 相关动作）。

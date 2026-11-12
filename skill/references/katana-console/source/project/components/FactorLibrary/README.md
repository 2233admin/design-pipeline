# FactorLibrary

因子库：所有被评估过的因子，卡片或表两种视图。每张卡回答四件事——有效吗（IC / ICIR）、贵吗（换手）、活多久（衰减 / 半衰期）、新吗（相关最高因子）——以及五门 LED。每张卡挂最近一次 run 的 id；点卡进 FactorIC / QuantileLayers / FactorDecay 的 `1+3` 台面。

## 结构

- 顶行：视图 Segmented（卡片 / 表）· 家族 Segmented（全部 + ≤ 4 个家族，更多下拉）· 右侧排序字段 · 宇宙 · 频率。
- 卡（3 列网格，≥ 200px 宽）：名称 + 一行家族 · 描述 · run 蓝标；右上五门 LED；KPI 四格（IC / ICIR / 换手 / 半衰，LCD 13px，未过门的指标 amber）；衰减迷你柱 10 根（持有期 1…10 的 IC，半衰期以内 `series-1`，之后 `ink-400`）；底行相关最高两个因子（> 0.7 的 amber）。
- 退役因子整卡 60% 透明、五灯全灭、底行写退役时间与原因；默认折叠到末尾。
- 表视图 = DataGrid：同样的列 + 门矩阵列（五个 LED 横排）。

## 交互

- 点击卡 → 打开因子台面（FactorIC / QuantileLayers / FactorDecay 跟随该因子）；LinkContext 扩展 `factor`。
- 点击门 LED → RunInspector 定位到该门的证据。
- 多选卡 → 「相关矩阵」（Heatmap）与「合成」（RunLauncher 预填多因子合成 run）。
- 排序：ICIR / IC / 换手 / 半衰 / 最近 run；排序切换卡片 `snappy` 重排 ≤ 300ms。
- 搜索 `/`：名称 / 家族 / 描述。

## 规则

- 没有 run id 的因子不出现（研究层通则）。
- 卡片数字来自固定评估器的最近 run，不在前端重算；宇宙或频率切换 = 另一组 run。
- 不做"因子评分"、不做五星、不做排行榜名次。
- 衰减迷你柱只画 10 期，不标数值。

## 谁提供什么

- 组件：factors[]（id、name、family、desc、run、stats、decay[10]、gates[5]、corrTop[2]、retired?）、view、family、sort、onOpen、onSelect。
- 调用方：因子评估 run 列表（Query）。

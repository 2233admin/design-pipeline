# Screener

筛选器：条件胶囊栏 + 结果 DataGrid。一套筛选条件就是一条可保存的命令（`screen.run` + 参数），所以 CLI、MCP、OpenAlice 能跑同一个筛选，Watchlist 能订阅它的结果。TradingView 的六个 Screener 在这里是一个组件 × 不同 universe（股票 / ETF / 可转债 / 期货 / 加密）。

## 条件栏

- 每条条件一个胶囊：字段 · 运算 · 值（值 `signal-orange`）· ×；点击胶囊弹 Popover 编辑（字段下拉 cmdk 搜索、运算 Segmented、值用 Controls 的范围滑杆或输入）。
- 第一个胶囊永远是 universe（市场 + 排除规则）；右侧点阵 `UNIVERSE 5,120 → 37` 显示漏斗。
- 条件 ≤ 8 个（§7），超过提示"存为两步筛选"。
- 字段来自本地字段注册表（行情 / 财务 / 技术 / 订单流 / 自算因子），每个字段带单位与典型范围，滑杆用这个范围。
- 「+ 条件」= cmdk 搜字段。

## 结果表

- DataGrid 预设：选择框 · 代码·名称 · 排序字段 · 其它条件字段 · 右侧说明列（行业 · 已持有 账户短码 / 自选）。排序字段表头 `signal-orange`。
- **表头下迷你直方**：每个数值列表头带 7 根柱 = 全 universe 分布，命中区间 `signal-orange-dim`。看一眼就知道条件卡在哪。
- 极值（排序字段 Top 10%）数字 `signal-orange`。
- 页脚：命中数 · 选中数 · 数据时间（快照 vs 实时）· 动作：加入自选 / 存为命令 / 导出 CSV。

## 交互

- 改条件 → 结果 120ms 重算（本地 ≤ 1 万行 TanStack 客户端过滤；更大的走服务端 Query）；行进出用 opacity，留下的行不动。
- 选中多行拖到 Watchlist = 批量加入；⌘A 全选。
- 「存为命令」给名字后出现在 CommandLine 与 AlertCenter 的条件源里（规则：当筛选结果新增一只时触发）。
- 「实时」拨杆：开时结果随行情重算（≤ 1Hz，Pacer 节流），新进入的行左 2px 橙描边 10s。
- 点击行 → LinkContext；双击 → Desk。

## 规则

- 默认看收盘快照，标明数据时间；实时筛选是显式动作。
- 不显示评级、不显示"综合评分"；每个数字可追到字段定义。
- 财务字段必须带报告期；点击字段名显示定义与来源。
- 结果 > 500 行时表头直方仍用全 universe，不用结果集。

## 谁提供什么

- 组件：universe、conds[]、fields（注册表）、rows、sortField、live、onChange、onSave(cmd)、onAddToWatchlist。

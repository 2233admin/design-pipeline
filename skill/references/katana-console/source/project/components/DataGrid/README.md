# DataGrid

所有表格的基础：自选、持仓、订单、研究结果、参数表、因子库。TanStack Table 做 headless 模型（列、排序、筛选、分组、选择、列配置），TanStack Virtual 做行虚拟化，本系统只定皮肤与行为。DOMLadder 与 SmartTape 都站在它上面。

## 外观

- 表头 `bg-300`，`caption` 10px `ink-300` 字距 0.06em，sticky；排序列表头 `signal-orange` + ▲▼。
- 行高按密度：`row-tight` 24 / `row-base` 28 / `row-loose` 36；由面板声明，表格不自己选。
- 行分隔 1px `hairline`；无竖线；列间距 `col-gap` 8；**相邻数值列之间 `col-gap-num` 12，价格列两侧 16**（拥挤效应，readability §3）。
- 数值列右对齐、`num` / `num-sm`、tabular-nums；**数值 `ink-100`，文字（代码、名称）`ink-200`**；整数位与小数位同字重（左位效应）；千分位必有。
- 涨跌用 `pnl-up / pnl-down`，**只上在数值上，不上行底色**；未知显示 `— —` `ink-300`，不显示 0；异常行整行 `ink-300` + 状态文字 amber。
- 行内条形（敞口、进度）用点阵纹理，同 Meter。
- 首列可放 LinkGroup 色标 / 选择框 / 状态 LED。
- 页脚一行：总行数 · 虚拟化行数 · 密度 · 列配置 · 数据状态 LED。

## 状态

- hover `bg-400`；选中 `bg-000` + 左 2px `signal-orange`；焦点行 2px 焦点环内描边；多选用 Shift / ⌘。
- 单元格值变化：**只有跨阈值才闪**（价格穿整数位、敞口过线、状态切换）：120ms 橙 18% 底色一次；普通 tick 不闪；任何闪烁 ≤ 2Hz、≤ 3 次（readability §8 §23）。
- 空态 / 加载 / 错误 / 断线：见 states.md，表格区域内显示，表头保留。

## 交互

- 列头点击排序，拖动改宽，右键列配置（显示 / 隐藏 / 固定 / 重置）；列配置持久化到 Pane.state。
- 行点击 → 写 LinkContext（`symbol.set`），双击 → 打开 Desk；右键行菜单由面板提供。
- 键盘：↑↓ 移动焦点、Enter 等于点击、Space 选择、⌘A 全选、Esc 清选。
- 滚动：Virtual 只渲染可见 + 上下各 8 行；滚到底部回弹（橡皮筋）。
- 一行的关键信息（代码 · 价 · 涨跌）≤ 20 字符宽，放最左，一两次注视读完（§17）；同类表格列顺序固定（§9）。
- 更新：行情经 MarketAPI → **自建** `transactions.ts`（不是 AG Grid 的 `applyTransaction`，TanStack 没有这能力）：按稳定 `rowKey` 原地改格、seq 幂等与乱序丢弃、tick 不触发全表排序、用户交互中的行绝不换位；四种表四种策略（快照 / append-only / 状态机 / 固定矩阵），见 engineering.md §2.1。

## 规则

- 表格不自己连行情、不自己算颜色、不自己定行高。
- 中英混排的列必须用 `mono`（Maple Mono CN）才能对齐；`sans` 只用于纯中文列。
- 不做斑马纹、不做竖线、不做单元格边框。

## 谁提供什么

- 组件：columns（TanStack ColumnDef）、rows、density、rowKey、selection、onRowAction、state（列配置）、status（live / stale / error / empty）。
- 调用方提供列定义、数据源、`updateStrategy`（snapshot / append / statemachine / matrix）；排序筛选在 Worker，超过 5 万行时服务端分页。渲染多少行（Virtual）与后台算多少行分开测。

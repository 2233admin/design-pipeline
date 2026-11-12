# StatusBar

顶栏与底栏的分段模型，直接参考 oh-my-posh / Starship 的 prompt 引擎：一排 **segment**，每段有类型（数据源）、模板、配色、显隐规则；段与段之间用斜切连接符（`chamfer-8`）交替 `bg-400 / bg-200`；整条由一份 JSON 主题声明，用户可改。它取代了之前顶栏 / 底栏里硬写的 "QUOTE · EXEC · ALICE · 时钟"。

## 结构

- 高 28（底栏）/ 48（顶栏含工作区标签）；段 padding 14 / 10，斜切 8px 叠接 −6px。
- 段内：LED（可选）· 点阵键名 `ink-300` · 值 `ink-100`；实盘账户段用 amber 内描边（`frame: live-amber`，不可被主题关掉——这是 PAPER / LIVE 可见性规则的延伸）。
- 右端固定：Sixtyfour 时钟（`led-md`）；市场时钟按 Profile 日历，多市场显示最早开盘的。
- 默认段：QUOTE 延迟 · EXEC 延迟 · ALICE run / 等人 · ACCOUNTS 账户集合与种类 · LINK 当前 LinkGroup 与对象 · BREAK 未闭合对账 · QUIET / NIGHT 模式 · 时钟。

## 模板语法

`{{led}}` `{{latency}}` `{{runs}}` `{{#waiting}}…{{/waiting}}` 这类 mustache 式占位，数据来自各适配器的健康端点与 Workspace 状态；`hideWhen` 表达式决定"无事则隐藏"（Starship 的 contextual modules）——例如 BREAK 段 `open == 0` 时整段消失，不占位。

## 交互

- 点击段 → 对应面板（QUOTE → DataSources、ALICE → AliceSessions、BREAK → BreakWorkbench、ACCOUNTS → AccountRail、LINK → 联动组菜单）。
- 右键段 → 隐藏 / 移动 / 编辑模板；主题 JSON 存账户配置，可导出分享。
- 段值变化：LED 规则同 StatusLED；数字直接赋值（延迟不滚动）。

## 规则

- 段 ≤ 8 个；更多进运行中心。
- 实盘段的 amber 框、BREAK 段、ALICE 等人段不可被主题隐藏（安全语义保护，engineering.md §4.3）。
- 不引 Nerd Fonts；段图标用 Lucide 14px 或 LED。
- 发光体预算：整条栏 ≤ 2 盏亮灯（时钟不算）。
- 来源：段落模型参考 oh-my-posh（MIT），上下文显隐参考 Starship（ISC）；不引代码。

## 谁提供什么

- 组件：theme{segments[], joiner, alternate}、data（各段数据源快照）、onSegmentClick、onEditTheme。
- 调用方：适配器健康端点 + Workspace 状态；默认主题在 `themes/statusbar.default.json`。

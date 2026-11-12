# RunInspector

run 检查器：一次研究运行的全部证据。回答"这个数字是怎么来的"——输入快照 hash、数据集版本、代码 commit、参数、成本模型、宇宙、基准；门结果与实际值；父子 run 谱系；产物文件；OpenAlice 的评估文字。它是研究层"可追溯"的落点，所有图表的 run 蓝标点进来都是这里。

## 结构

- 顶行：run id（蓝，12px）· 类型 · 对象 · 区间 · 状态 LED + 时长 + 时间 · 右侧动作：重跑 / 对照 / 加入报告。
- **顶部第一块是 RobustnessGate（Candidate Quality）**，不是 Sharpe 与年化：OOS Sharpe · IS→OOS 衰减 · 尝试次数 · DSR · PBO · 最差滚动窗 · 换手 · 成本敏感 · 数据质量 · PIT 泄漏。样本内收益放页脚小字（product.md §7）。
- 左框 INPUTS：键值对（`ink-300` 键，`ink-100` 值），快照 hash 用 LCD 橙——它是这个 run 的身份证，和确认框里的参数 hash 同一套哈希。
- 左框 GATES：五行，LED + 门名与阈值 + 实际值；未过 amber，未评估灭。
- 右框 LINEAGE：父子 run 树（ASCII 树线，当前 run 橙），点击跳转。
- 右框 OUTPUTS：产物文件 chip，点击下载或在对应面板打开（nav → EquityCurve，trades → TradeStats）。
- 右框 **评估 · OPENALICE**：Alice 写的文字（`sans`），底部点阵小字写来源（agent · session · 时间）和"不是前端结论"。这是整个系统里唯一出现模型生成文字的地方之一，必须标来源。

## 交互

- 点击门 → 展开该门的证据（阈值定义、计算窗口、原始数据片段）。
- 点击任意输入值 → 复制；点击数据集版本 → DatasetCatalog 定位；点击 commit → 外链仓库。
- 「重跑」= RunLauncher 预填本 run 全部参数；「对照」= StrategyCompare 加入本 run。
- 运行中的 run：状态 LED on 呼吸关，进度 Meter 替代时长，产物逐个出现。

## 规则

- run 不可变；检查器没有任何编辑能力。
- 没有快照 hash 的 run 显示 `无快照` amber 并禁止推进 stage。
- 评估文字只显示，不折叠成"结论"进 KPI；不加表情、不加高亮。
- 失败的 run 顶行 LED red，INPUTS 保留，GATES 全灭，OUTPUTS 显示日志 chip。

## 谁提供什么

- 组件：run（research.md Run 模型）、gates[]、lineage、outputs[]、evaluation{text, by, session, at}、onRerun、onCompare、onOpenOutput。
- 调用方：run 存储（Query）；OpenAlice 评估通过 run.evidence 带入。

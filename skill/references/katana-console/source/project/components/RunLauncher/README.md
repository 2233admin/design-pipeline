# RunLauncher

run 启动器：研究层唯一的"开始"按钮。五步表单（TanStack Form）：类型 → 对象 → 参数 → 数据版本 → 成本模型；Enter 逐步下移，⌘⏎ 启动。它产生一条 `run.start` 命令（`sideEffect: none`，研究类不需要确认），由 OpenAlice 接走。各面板的"重跑 / 合成 / 优化"都是预填好的 RunLauncher，不各自造按钮。

## 结构

- 标题行：`RUN LAUNCHER` · 来源（从哪个 run / 因子 / 策略预填，蓝标）· 快捷键。
- 五步各一行 34px：点阵序号（当前橙、完成绿、未到 `ink-400`）· 标签 · 输入。
  1. 类型 Segmented（factor / backtest / walkforward / stress / optimize / train，≤ 6）
  2. 对象：cmdk 搜索（因子 / 策略 / 模型），右侧显示代码路径
  3. 参数：chip 列表，点击编辑（数值用 Controls 输入或滑杆）；与预填来源不同的 chip 橙描边，右侧"改了 n 项"
  4. 数据：数据集 @ 版本（默认最新 point-in-time；可选历史版本做复现）
  5. 成本：预设（标准 / 保守 / 零成本对照）或自定义；税费来自 Profile，不在这里填
- 页脚：预估时长与资源 · 队列位置 · "快照 hash 将在启动时生成" · 启动钮。

## 交互

- 任一步改动 → 后续步骤保持但标 `待确认`（`ink-300`）；类型改动清空参数。
- optimize 类型：参数步变成范围（min / max / step 或分布），右侧显示组合数与预估时长；> 1000 组提示用 Optuna。
- 启动 → `run-done` 不响（那是完成时）；表单折叠成一行进 RunQueue，LED on。
- 批量：按住 ⌥ 启动 = 对多选对象各起一个 run（FactorLibrary 多选时）。

## 规则

- 不能在这里写代码或表达式；对象必须是仓库里已有的因子 / 策略 / 模型。
- 没有数据版本不能启动；"最新"在启动时解析成具体版本写入快照。
- 研究 run 无确认框；但 `train` 类型占用 GPU 时显示资源提示（不是确认）。
- 预估时长来自历史同类 run，标 `~`。

## 谁提供什么

- 组件：prefill（run | factor | strategy）、catalog（对象列表、数据集版本、成本预设）、estimate、queue、onStart(cmd)。
- 调用方：OpenAlice 的 run 接口（命令表）、RunQueue 状态（Query）。

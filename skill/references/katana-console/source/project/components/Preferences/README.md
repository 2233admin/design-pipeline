# Preferences

偏好页：Codex / VS Code 式——左侧目录（侧边导航，不是 tab），右侧分组设置行。所有"用户怎么看、怎么听、怎么按"的设置集中在这里；RENDER 面板（rendering.md）作为其中一节。它是全屏 sheet（`gentle` 升起），`⌘,` 唤起，Esc 关。本卡以 **Paper 亮主题**渲染，证明同一套 token 名两套值。

## 目录

| 节 | 内容 |
|---|---|
| **外观** | 主题（Console / Paper / 跟随系统 / 按时段）· 强调色四选一 · 时段表（与夜间模式共用）· LCD 窗说明（深色岛，不可改）· 安全标识（锁定开，不可关） |
| **字体与可读性** | mono（Maple Mono CN / Iosevka）· 中文正文（Noto Sans SC / LXGW Neo XiHei）· 字号缩放（90 / 100 / 110%，整数倍规则下点阵不缩放）· 点阵字开关（关则 tag 退化为 mono 小写）· 色觉友好 · 数字字重 |
| **密度** | 每个 Workspace 的默认密度（tight / base / loose）· 表格列间距预设 |
| **涨跌与市场** | 涨跌约定（跟随 Profile / intl / cn / cvd）· 默认市场 Profile 覆盖 · 币种显示 · 时区 |
| **动效** | 完整 / 减弱 / 关 · 弹簧预设微调（滑杆，改的是 motion.tokens 候选值，导出后走管线，不直接改生产）· 橡皮筋开关 |
| **声音** | 总开关 · 主音量 · 分类音量（UI / 系统 / 市场 / 交易 / 研究）· 安静模式时段 · 测试播放 |
| **快捷键** | 全部命令的键位表（搜索、冲突检测、重置）；导出为 JSON |
| **渲染** | = rendering.md 的 RENDER 面板（GPU 只读、后端、抗锯齿、DPR、帧率、后台停绘、帧时） |
| **账户显示** | 账户短码与顺序 · 默认下单账户规则 · PAPER / LIVE 标识（**只读，常开**） |
| 数据与隐私 | 本地存储什么、遥测（默认关）、清除缓存 |
| 导入 / 导出 | 主题 JSON、快捷键 JSON、StatusBar 主题、工作区模板；导入前显示 diff |
| 关于 | 版本、许可证（GPL + 依赖许可清单）、attribution（lightweight-charts） |

## 结构

- 左目录 150px `bg-200`，当前项 `bg-300` + 左 2px 橙；两个分组标题（偏好 / 系统）点阵 `ink-400`。
- 右侧行：键（`sans` `ink-200` + token 名小字 `ink-300`）· 值控件（Segmented / 色块 / Toggle / 滑杆 / LCD 预览）。行高 ≥ 30，分隔 hairline。
- 主题行带两格实时预览（Console / Paper 各一格，显示对比度）。
- 锁定项用 Toggle 55% 透明 + amber 一句原因。

## 交互

- 改动即时生效（乐观），颜色 120ms 过渡；失败弹回 + 原因（Toggle 规则）。
- 每行右键「恢复默认」；顶部搜索 `/` 跨节查设置项。
- 导入主题 / 快捷键 JSON 前显示 diff 表，确认后应用。
- 动效滑杆改的是候选值，页脚提示"导出候选 → 样机验证 → 写入 motion.tokens"，不直接写生产。

## 规则

- 设置是账户配置（Query），跨设备同步；渲染相关（DPR / 后端）按设备存。
- 安全语义（实盘框、PAPER 条、hazard、确认结构、ConsensusBlock）在任何设置组合下常开，开关只读可见——让用户看到"这是故意不能关的"。
- 不提供任意颜色选择器；只开放 themes.md §6 列出的维度。
- 不做"主题商店"；主题 JSON 导入导出足够。

## 谁提供什么

- 组件：sections[]（id、title、rows[]{key、tokenRef、control、value、locked、reason}）、onChange、onImport、onExport、search。
- 调用方：账户配置（Query）、tokens.json 主题表、motion 候选管线、命令表（快捷键）。

## ATAS 对照补齐（2026-10-03，atas.md §2.10 / §五）

- 热键按命令命名空间分组显示：Global · Trading · DOM · Chart / Drawing · Heatmap · Replay · Snapshot；补 `dom.*` · `chart.footprintMode` · `chart.timeframe` · `heatmap.*` · `trade.volumePreset` · `position.flatten / setStop / breakeven / trail`。交易热键不预设默认值（ATAS 两篇文档默认键互相冲突），用户显式绑定并确认。
- 设置补齐：Time Zones（按市场）、Commission（PnL 口径）、滚轮模式三选一（按工作区）、Privacy mode 全局拨杆、模块设置即时保存同步。
- 交易设置（快速模式 / 点击下单 / ExitStrategy 默认）是单一来源，存账户配置。

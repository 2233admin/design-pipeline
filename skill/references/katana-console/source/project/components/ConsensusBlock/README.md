# ConsensusBlock

必要条件块（名字沿用"三方表决"，但**不是投票**）：一个写命令提交前，表达"当前意图是什么、哪些必要条件满足、哪个条件阻止、最终由谁裁决"。任一 blocked / unknown / timeout / stale 即不可执行；多方同意不等于授权，裁决永远在执行网关与账户服务（engineering.md §4.1）。三方按场景不同——下单：执行网关预检 · 账户服务限额 · 规则引擎；策略推进：门 · 容量 · 账户。它取代了 OrderTicket / OrderBasket 里的一行预检灯，是 signature.md 里唯一"有功能"的签名元素，也是**核心界面**的一部分（结构不可皮肤化）。

## 结构

- 斜切壳（`chamfer-8`）`bg-000` 底，三格 `bg-300`，2px 缝。
- 每格：点阵名 · 8px 灯，五态：pass（green）· blocked（red）· unknown 未返回（off）· timeout（amber 闪一次后 off + `超时`）· stale 已失效（amber 空心 + `需重检`）· 一句 `sans` 10px（≤ 10 字：可用 ✓ 整手 ✓ / 集中度 58 / 60 / 偏离门未过 19.4%）。
- 结论行：`n 通过 · n 接近 · n 未过 · n 未填` + 判定（可提交 `ink-100` / 不可提交 red）· 右侧参数 hash（LCD 橙，与确认框一致；未就绪为 —）。
- 任一 blocked / unknown / timeout / stale → 不可提交。结果带 `asOf` 与有效期（默认 30s）；订单参数、账户、风险状态任一变化 → 全部转 stale，hash 变，必须重检。

## 交互

- 点击某格 → 展开该方的详细（限额值、规则 id、预检原因）；点击 hash → 复制。
- 评估中：灯 on 呼吸关，句子"评估中"；评估随输入变化 Pacer 去抖 150ms。
- 三方全 ok 时无音效、无动效（这不是奖励）；出现 danger 一次 `cmd-err` 抖 2px。

## 规则

- 三方的判定来自各自权威（执行网关 / 账户服务 / 规则引擎 / 门评估器），前端不合成第四种判断。
- warn 不阻止提交，但确认框里会把 warn 句原文列出。
- 一个表单只有一个 ConsensusBlock；它算该面板的签名元素名额。
- 研究类命令不用它。

## 谁提供什么

- 组件：parties[3]（key、label、state、message、detail）、verdict（ok / warn / blocked）、hash、onExpand。
- 调用方：执行网关预检、账户服务、规则引擎、门评估器（Query / 流）。

# 版本记录与实验结果

开始：2026-10-05；本地汇总完成：2026-10-06。开发线 `improve-beta-motion@139dca4`；远端没有 `dev` / `DEV`。V2 起使用本地未提交的 `require-film-material-routing` 修复，不是已经发布的新版。

## 当前范围：只对照珐琅徽章

2026-10-06 用户指出测试过多、已有结果仍有问题，明确只测试珐琅徽章。前端和游戏 VFX 停止，不再追加模型调用；下面的跨任务记录保留为历史，不作为当前工作要求或视觉提升证据。

收窄时已有徽章尝试 8 次：MiniMax 2 次、Grok 首轮 2 次 / 等待修正轮 2 次、Codestral 2 次。随后用户明确授权加入刚配置的 Qwen，追加且仅追加 2 次徽章制作，累计 10 次徽章尝试 / 26 次历史与本次实际尝试。旧模型作品不修改或重测。当前展示三个模型的直接 / 工具配对，6 个位置、5 份可查看作品；MiniMax 直接组缺失、Codestral 徽章失败均保留。

当前只对照原片的几何、蓝色釉面、金属掐丝、虹彩嵌片和五层拆合。下一版先对齐正面静帧的几何与材质，再调整运动；已有运行检查不代表用户接受，分数仍为空。

## 最新视觉反馈与提示复盘

2026-10-06 用户明确反馈：“这几个效果我都挺不满意的”。当前作品的视觉状态为用户拒绝，数字评分仍未填写，已有模型、源码、视频和工程检查保持原记录。本次按用户要求核对六组提示和公开执行日志、五份成片正面及相关拆层样帧，整理为 [badge-prompt-review.md](badge-prompt-review.md)。

已确认共同 brief 与同条件提示一致；工具组被实验提示强制指定 `web / quick / freeform`，没有完整走完图形路由要求。复盘具体定位了 Grok 直接版合拢层深度重叠、MiniMax 额外圆环与重复颜色转换、Qwen 等作品的几何 / 色彩 / 嵌片参数偏差，以及工程检查没有拒绝这些视觉错误的缺口。原因推断与源码事实在复盘中分别记录；不披露模型内部思维链，不杜撰相似度或人工分数，没有追加模型调用、重测作品或改写原作。下一版建议先校正几何与两个角度的材质静帧，再接动画；尚未实施。

## V3q：仅新增 Qwen 徽章配对

配置目录与两组实际响应一致：`futureppo-qwen/qwen3.8-flash-next`（Qwen 3.8 Flash Next）。两组 high 推理、相同 4 张参考附件、相同 brief / 运行库 / 12 分钟预算和 V3 快照 `e082332c13613e1cf620503e4b9450b00be1095cb436c04fc2e6729f9fedf7da`，独立目录。未另做连接测试、重试、回退或其他任务。供应商内部权重未独立验证。

| 页面标记 | 条件 | 秒数 | 报告 Token 合计 | 执行状态 | 外部工程检查 |
| --- | --- | ---: | ---: | --- | --- |
| Q1 | 直接制作 | 484.13 | 1214073 | generated，退出 0 | passed |
| Q2 | 使用 design-pipeline | 720.52 | 2404557 | time-limit，退出 0；预算结束时最后回复仍为 toolUse | passed |

Q2 暴露实验驱动漏项：原驱动仅检查 API 错误，OMP 在预算末退出 0 但未给完成回复，曾被记成 generated。现有 summarize 共用入口补充预算时长 / 终止 stopReason 检查，最小自检区分仍处于 toolUse 的时限结束与正常 stop 回复；没有改原事件或旧实验记录。执行结束状态与可运行作品、工程检查各自保留，不据此推断画质。

两份新作品由外部运行既有公共检查及实际画布播放检查，均通过 shader 编译 / 反向定位 / 层距与视角 / 播放 / reduced motion。固定输入未变化，工具快照未变化，未记录越界警告；原有 benchmark 仍因公开检查与非盲评保持 blocked。源码、事件、用量、检查与导出保留于 `.design-pipeline/video-ab/model-eval/qwen-run/`。两份画面仍等待用户视觉评分。

两份新徽章均完成 1162×1162、30 fps、935 帧、无音轨的完整 MP4，ffprobe 与 5 个解码样帧核对通过。输出长度 31.166667 秒，在一个输出帧误差内；导出与模型制作时间分开记录。

| 新版输出 | SHA-256 |
| --- | --- |
| [Q1 直接版 MP4](http://127.0.0.1:47831/model-eval/qwen-run/runs/qwen-direct/component/out.mp4) | `e88b6813a41335e2a9fb786764e85ba8eb57d82c34a39f4e7392ba729076781c` |
| [Q2 工具版 MP4](http://127.0.0.1:47831/model-eval/qwen-run/runs/qwen-tool/component/out.mp4) | `11f0a7cbefa4d7eace988c5431e0e061540c3749b5c960bdad9138cb5f2cfb39` |

## 历史版本

| 版本 | 实际模型 / 推理 | 使用能力与过程 | 已有证据 | 用户意见与局限 |
| --- | --- | --- | --- | --- |
| V0 参考 | 原作者模型未知 | 用户提供的无声、31.158333 s、1162 方形视频 | 原文件与元数据保留 | 目标是蓝色珐琅、金属掐丝与五层拆合 |
| V1-D 直接制作 | `gpt-6.1-sol / max`，Codex App | Canvas 自绘 → CSS 3D 平面 → 原生时间插值 → Playwright / ffmpeg | 完整 935 帧 MP4、反向定位与浏览器检查 | 与工具版近似；没有真实实体材质 |
| V1-T 工具初版 | `gpt-6.1-sol / max`，Codex App | 共享 V1-D 素材 → film quick replicate → GSAP → HyperFrames → 五项门禁 | 完整 MP4、五项 passed、构图警告保留 | 用户明确指出没有明显提升，缺 GLSL / shader；技术通过不解决画面 |
| V2-T 材质修正版 | `gpt-6.1-sol / max`，Codex App | 参考补材质要求 → OpenSpec 路线修复 → Three.js 实体挤出 → PBR / clearcoat / GLSL → 角度检查 → 正式导出 | 935 帧 MP4、shader / 定位检查、五项门禁、仓库 QA | 程序纹理、嵌片微结构、圆角柔光、姿态仍有差距；用户尚未接受 |

历史实际模型来自本聊天的 `turn_context` 元数据，而非事后根据默认配置猜测。V1 两组共用资产 / 同作者上下文；V2 改了资产，均不能作独立模型的工具因果评测。

历史文件：`.design-pipeline/video-ab/REPORT.md`、`REVISION.md`、`direct/out.mp4`、`with-tool/out.mp4`、`with-tool-glsl/out.mp4`。旧文件不会覆盖。V2 输出 SHA-256：`22ca9aa264a67ca0813248004a1c87ea925945c54dcaab97bd7832084e0f7b4b`。

## OMP 连通性事实

OMP 版本 18.6.1。Codex selector `openai-codex/gpt-6.1-sol` 已得到实际 `openai-codex / gpt-6.1-sol` 响应。

Grok selector `xai-oauth/grok-4.6` 的实际响应为 402：`personal-team-blocked:spending-limit`。首次探测时 OMP 自动回退到 `openai-codex / gpt-6-luna` 并退出 0；这仅说明回退模型可响应，**没有 Grok 制作结果**。正式实验使用单次 overlay 关闭回退，不改变全局配置。

用户指定 MiniMax 与 futureppo 后，单独关闭回退的连通性请求确认 `minimax-code-cn / MiniMax-M3.1-Flash-Preview` 和 `futureppo / grok-4.7` 都实际响应。futureppo 的模型名按其 API 返回记录，未独立验证供应商内部权重；原 xai-oauth 接入的 402 与这次可用接入分别保留。

## 历史制作与失败结果

实际进行了 **24 次模型制作尝试**：首轮 12 次、Grok 延长流式等待重跑 6 次、Codestral 新模型轮 6 次。后两轮页面目录里复用的 6 个 MiniMax 记录不是新调用，不重复计算用量或成功数。

留下 11 份页面源码，其中 1 份 Codestral 组件不完整；10 份页面通过公共运行检查，加入实际播放、前端语义与键盘检查后 **7 份工程检查通过**。MiniMax 工具 VFX 的定位正常但触发播放冻结；Codestral 直接前端的搜索框没有可访问名称，工具前端把 Markdown 围栏写进 HTML，进入 BackCompat 模式。这三份原作的工程结果为 failed，公共检查的原始 passed 记录保留。另有单独的 Codex 播放修正版 V4-P，通过检查但不混入原模型结果。所有人工视觉分数仍为 unscored。

- **V3**：MiniMax `minimax-code-cn/MiniMax-M3.1-Flash-Preview`，high；futureppo `futureppo/grok-4.7`，high。每个任务各自直接 / 工具组，12 分钟上限。
- **V3b**：Grok 的直接 / 工具两组统一将 OMP 首事件和静默等待设置为 600 秒，制作仍为 12 分钟；保留 V3 失败。两份组件通过检查并完成 MP4，其他请求出现上游 524。
- **V3c**：另选已实际响应的 `futureppo/codestral-2508`，推理 off。OMP 目录声明仅文本输入，所以两组组件都依照共同文字 brief 和姿态表，不传图片附件；这与 MiniMax / Grok 的图片条件不同，不能将跨模型差异归因于工具。前端两组通过公共运行检查，但补测语义 / 标准模式失败；组件 / VFX 有 401 validation_error、524 或未执行制作。
- **时间与用量**：表中是实际墙钟时间与供应商逐请求报告的 Token 合计（含反复提交及缓存），不是独立上下文长度，也不是结算金额。futureppo 的价格未知，不能把 API 的 0 成本字段当免费。

| 版本 | 实际 provider/model（OMP 记录） | 条件 / 任务 | 推理 | 秒数 | 报告 Token 合计 | 执行结果 | 页面 / 工程 |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| V3 | minimax-code-cn/MiniMax-M3.1-Flash-Preview | minimax-direct/frontend | high | 720.46 | 1734785 | time-limit | 有源码 / passed |
| V3 | minimax-code-cn/MiniMax-M3.1-Flash-Preview | minimax-direct/component | high | 720.43 | 580019 | time-limit | 缺失 / failed |
| V3 | minimax-code-cn/MiniMax-M3.1-Flash-Preview | minimax-direct/vfx | high | 720.49 | 3230347 | time-limit | 有源码 / passed |
| V3 | minimax-code-cn/MiniMax-M3.1-Flash-Preview | minimax-tool/frontend | high | 720.49 | 2229441 | time-limit | 有源码 / passed |
| V3 | minimax-code-cn/MiniMax-M3.1-Flash-Preview | minimax-tool/component | high | 720.49 | 2290125 | time-limit | 有源码 / passed |
| V3 | minimax-code-cn/MiniMax-M3.1-Flash-Preview | minimax-tool/vfx | high | 720.51 | 8278059 | time-limit | 有源码 / failed |
| V3 | futureppo/grok-4.7 | futureppo-direct/frontend | high | 116.86 | 422887 | generated | 有源码 / passed |
| V3 | futureppo/grok-4.7 | futureppo-direct/component | high | 121.63 | 0 | provider-error | 缺失 / failed |
| V3 | futureppo/grok-4.7 | futureppo-direct/vfx | high | 121.31 | 0 | provider-error | 缺失 / failed |
| V3 | futureppo/grok-4.7 | futureppo-tool/frontend | high | 196.93 | 679045 | provider-error | 缺失 / failed |
| V3 | futureppo/grok-4.7 | futureppo-tool/component | high | 121.87 | 0 | provider-error | 缺失 / failed |
| V3 | futureppo/grok-4.7 | futureppo-tool/vfx | high | 193.18 | 773911 | provider-error | 缺失 / failed |
| V3b | futureppo/grok-4.7 | futureppo-direct/frontend | high | 253.37 | 0 | provider-error | 缺失 / failed |
| V3b | futureppo/grok-4.7 | futureppo-direct/component | high | 720.51 | 549702 | time-limit | 有源码 / passed |
| V3b | futureppo/grok-4.7 | futureppo-direct/vfx | high | 253.36 | 0 | provider-error | 缺失 / failed |
| V3b | futureppo/grok-4.7 | futureppo-tool/frontend | high | 643.59 | 881018 | provider-error | 缺失 / failed |
| V3b | futureppo/grok-4.7 | futureppo-tool/component | high | 720.39 | 1467241 | time-limit | 有源码 / passed |
| V3b | futureppo/grok-4.7 | futureppo-tool/vfx | high | 252.31 | 0 | provider-error | 缺失 / failed |
| V3c | futureppo/codestral-2508 | futureppo-direct/frontend | off | 39.51 | 76715 | generated | 有源码 / failed |
| V3c | futureppo/codestral-2508 | futureppo-direct/component | off | 91.08 | 355742 | provider-error | 有源码 / failed |
| V3c | futureppo/codestral-2508 | futureppo-direct/vfx | off | 11.4 | 111031 | responded | 缺失 / failed |
| V3c | futureppo/codestral-2508 | futureppo-tool/frontend | off | 72.12 | 242149 | generated | 有源码 / failed |
| V3c | futureppo/codestral-2508 | futureppo-tool/component | off | 276.67 | 293209 | provider-error | 缺失 / failed |
| V3c | futureppo/codestral-2508 | futureppo-tool/vfx | off | 5.47 | 26246 | provider-error | 缺失 / failed |

## 公平性和记录核查

共同依赖为 Three.js 0.180.0、GSAP 3.14.2、HyperFrames 0.8.133。V3 / V3b / V3c 的工具快照 SHA-256 为 `e082332c13613e1cf620503e4b9450b00be1095cb436c04fc2e6729f9fedf7da`。结束后重新计算摘要一致；所有固定输入未被模型修改。

MiniMax 直接组件的日志包含对父目录工具快照的目录查看，违反了直接组范围；没有确认其读取场景源码，但不能将该组当作严格独立对照。原事件保留并有 scope warning。公共检查对模型可见，expectedAnswersHidden=false；用户未评分，evaluatorBlind=false。复用现有 benchmark v2 的两系统配对记录因此保持 blocked，未伪造公平性或美术评分。

所有调用关闭自动模型回退。首轮 Grok OAuth 探测的 402 和自动回退已单独隔离；后续制作没有混用该探测的回退输出。futureppo 是接入名称，模型名按 OMP 事件记录；供应商内部权重并未独立验证。出现接口错误的行不是成功制作。

## 已复现并处理的问题

| 问题 | 证据与根因 | 修改与验证 | 状态 |
| --- | --- | --- | --- |
| 游戏 VFX / shader 走普通产品 UI | 同一查询原先返回 product-design；graphics job 只覆盖库名 / 粒子，缺 VFX、GLSL / WGSL 等词汇 | 在已有 job registry 补词；普通设置表单 / 明确产品影片回归保持正确 | 工具代码已修复，随后冻结 V3 快照 |
| Three.js native 路线恒被阻塞 | MiniMax 工具 VFX 保留了 `threejs has no probe/plan/invoke/verify lifecycle` | 补齐 threejs / threejs-fixed-camera 的既有 lifecycle；实际 CLI 导入目标 Three.js 0.180.0；缺 dev script 仍 blocked；精确 pin / 导入失败回归 | V4 工具代码已修复；没有声称 V3 创作使用了该新代码 |
| 公共检查漏掉播放冻结 | sampleTime 和 idle 终态检查 passed；原作 play 只调用 timeline.pause(0)，两个活跃时刻的画布都停住 | 独立行为检查新增真实播放帧变化、画布参数、重播和 reduced-motion；结果汇入原有 benchmark，不改原始公共检查记录；原生图形指南说明实际运行证据 | 评测已修正；原作品 failed |
| 前端公共检查漏掉语义与 HTML 模式 | Codestral 直接组搜索框没有可访问名称；工具组 index.html 含 Markdown 围栏，实际 document.compatMode 为 BackCompat，公共鼠标交互仍 passed | 独立行为检查补标准模式、搜索名称、控件语义及键盘选择；五份完整前端实测，MiniMax 两组与 V3 Grok 直接组通过，Codestral 两组失败 | 评测已修正；两份模型原作未改，问题不冒充工具核心缺陷 |
| 模型生成 VFX 不开始播放 | 同一 MiniMax 工具原作；场景源码和运行结果一致 | 独立 V4-P 副本由 Codex App gpt-6.1-sol / max 将 pause(0) 改为 restart()，复用原时钟；实际播放 / 定位 / 强度 / 重播检查通过 | 修正版可交互；原模型版本保持原样 |
| futureppo 部分请求不能完成 | Grok 首事件超时；延长等待后 524；Codestral 部分 401 validation_error / 524，或只列目录而没制作 | 保留实际错误、partial 源码和用量；已试同模型统一等待重跑和明确的新模型轮 | 接入 / 生成失败仍未解决，不算工具视觉改善 |

V4-P 只修播放，构图和 shader 未改；这不是新的独立工具组 / 直接组因果实验。

## 验证与输出

产品代码 QA：827 项测试，824 通过、3 跳过；打包、重现性、隔离安装和 11 项安装包 CLI 核查通过，退出 0。实验驱动检查会拒绝模型回退、402、超时冒充成功；评分页在一次性浏览器上下文验证保存、匿名 / 揭示状态及 12 个显式空评分导出，用户浏览器没有写入模拟评分。

三个有效组件完成 1162×1162、30 fps、935 帧、无音轨 MP4，ffprobe / 解码样帧通过：

| 版本 / 组件 | 输出 SHA-256 |
| --- | --- |
| V3 MiniMax 工具 | `8a6368a86fe160c3389278eda35aebf62cb07d859cdec1e800c0225661d21188` |
| V3b Grok 直接 | `a24f0d5ae9de48f595f392d8d9341cada7bb7e2f9942c834b63a4261b901365f` |
| V3b Grok 工具 | `e2ef933dcce96280f47385fd6cf6010c865929a82366654ffda27dba201f9e65` |

源码、提示、逐请求事件、检查、原片样帧及视频在被 Git 忽略的 `.design-pipeline/video-ab/model-eval/`；没有远端发布。每个矩阵保留完整失败。V3c 的不完整组件和未生成的页面不补成可运行作品。

## 人工评分入口与下一版

[打开徽章对照](http://127.0.0.1:47831/model-eval/review.html)：原片直接可见，按 MiniMax、Grok、Qwen 配对，每行左直接 / 右工具，共 6 个位置、5 份可查看原作。旧标签与评分不变，初始预览调用既有 sampleTime(0) 暂停；不改模型源码。全部失败和 24 次旧记录保留，前端与 VFX 不再显示或继续制作。

仅按徽章形态、珐琅材质、动作与控制填写 0–5 分和评论；实际模型与工具条件在预览标题直接显示，E–H 的对应关系见 [README](README.md)。运行详情仍可展开。JSON 只导出徽章，并包含实际模型与条件；空评分保持 null，已有评分元数据和产物摘要不改，新评分为非盲评。

用户已明确拒绝当前几个效果，尚未给出数值评分。工程缺口与可复现修复不能证明珐琅相似度提高；下一版只按徽章具体差距修改几何、釉面、掐丝、嵌片和动作，保留上一版与实际模型。具体提示、执行摘要和失败复盘见 [badge-prompt-review.md](badge-prompt-review.md)。

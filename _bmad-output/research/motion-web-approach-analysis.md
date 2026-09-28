# motion-web 机制与项目化改造研究报告

- **研究对象**：`feitangyuan/motion-web`
- **固定版本**：`5f4e40f1253e11e28850d08dce28b9b7e4320115`
- **研究时间**：2026-09-18
- **研究目的**：提炼可迁移的 motion-first 工程机制，辨明品牌/案例皮层与授权边界，并与本项目现有 DESIGN、MOTION、HyperFrames、GSAP、Playwright、FFmpeg 和 evidence 链路比较。
- **方法**：直接读取固定 commit 的 README、LICENSE、SKILL、references、7 个案例源码/README 和 `scripts/verify_case.py`；对照本仓库现有 skill、OpenSpec、实验 target 与 evidence；API 语义只引用 MDN/Playwright 官方文档。本文只新增研究报告，不复制上游源码、资源或运行时。

## 1. 先给结论

1. **motion-web 不是可安装的共享运行时包，而是一个 agent skill 加 7 个 standalone 单文件案例的“机制样本库”。** 固定版本的树中没有 `package.json`，README 也明确案例是无 build tool、无 external CDN 的 standalone single-file HTML。因此不能把它描述成一个 npm library、组件库或可直接接入的 runtime。
2. **它的真实工作模型是“案例自带状态、模拟/响应、渲染和输入循环；skill 负责选层、抽机制、写规范和验证”。** 7 个案例没有共同 runtime/state machine；可复用的是问题拆分和测量习惯，不是某个统一 API。
3. **确定性是分层且不完整的。** `string-clock` 有固定步长、可设表盘时间和 settle 探针，是最接近可复现样本的案例；`ink-crowd`、`press-stack` 只对部分初始化使用 seed；`wheel-rail`、`toy-flipbook`、`lyre-crows` 仍有 `Math.random`/墙钟；多数案例没有可寻址时间 setter。不能把“有 seed”或“headless 通过”泛化为离线可渲染确定性。
4. **可迁移的核心是合同和边界**：运动必须有明确 job；先选 DOM/SVG/Canvas2D/WebGL 层；输入/滚动是因果边界；减少运动要有 authored resting state；验证应针对具体 complaint 设 oracle，并用真实 pointer/wheel 路径测试 commit path。案例的奇观、文案、资产、配色、字体、精确参数和脚本都属于皮层/表达，不应复制。
5. **授权是硬边界。** 固定版本 LICENSE 是 CC BY-NC 4.0，明确禁止未经商业许可把 skill/prompts/cases/derived workflows 集成、打包、嵌入商业软件、SaaS、付费工具、AI agent 平台或商业客户交付。当前项目的 clean-room、`codeCopied:false` 边界是正确方向；本次研究收口已将项目参考 URL 固定到 `https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115`，并保留原 README/LICENSE 内容 hash。
6. **推荐项目自己的下一步模型**：采用“Authored Motion Graph（语义时间图）”作为现有 `MOTION.md → change motion.md → adapter → evidence` 的薄层补强，而不是引入 motion-web 运行时。把上游的 fixed-step、seed、time pin、state-exit oracle、real-input test 和 reduced-motion rest state 变成项目合同字段；保留一个 paused、seekable 的 GSAP/HyperFrames 时间 owner。交互因果图可作为第二阶段 preview/replay 能力，暂不做通用物理引擎。

## 2. 来源、版本和授权核对

| 项目 | 固定版本证据 | 对项目的含义 |
| --- | --- | --- |
| 仓库身份 | [`README.md`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/README.md)、GitHub 固定 commit 树 | owner/repository 是 `feitangyuan/motion-web`，不是 `2233admin/motion-web` |
| 内容形态 | [`README.md#L20-L34`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/README.md#L20-L34) | code-first skill；案例为 standalone single-file HTML，无构建工具/CDN |
| 案例栈 | [`README.md#L142-L156`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/README.md#L142-L156) | 原生 Canvas2D/WebGL2/DOM/SVG，案例分别自持循环 |
| 依赖 | 固定版本 commit tree；`package.json` 查询为 404 | 固定版本没有 npm manifest，不能推断 npm 版本、构建脚本或可安装 API |
| 许可证 | [`LICENSE`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/LICENSE) | CC BY-NC 4.0；商业使用/集成/衍生工作流需另行商业许可 |
| 案例目录 | [`SKILL.md#L216-L240`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/SKILL.md#L216-L240) | skill 明确把 mechanism engineering 与 skin identity 分开 |

LICENSE 的关键边界不是“保留署名即可商用”。它要求署名、链接许可证并标注修改，同时明确 NonCommercial 包括把 skill、prompts、cases 或 derived workflows 集成/打包/嵌入商业软件、SaaS、付费工具、AI agent 平台，以及无商业许可的商业客户交付。LICENSE 还注明第三方字体子集保留各自 OFL 条款；这不改变 motion-web 自身代码、案例和 workflow 的 CC BY-NC 条款。商业分发前应让法务判断具体来源和衍生程度。

## 3. motion-web 的实际工作模型

### 3.1 分层，不是一个运行时

上游 skill 的工作流是 reference → concept → spec → build → audit；motion 和 page design 被视为并列的设计/工程问题，而不是后期装饰（[`SKILL.md#L6-L20`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/SKILL.md#L6-L20)）。它要求先从案例/参考中抽取 motion job、material、trigger、duration、easing、stagger、reduced-motion、performance budget 等字段，未验证值必须标明而不能臆造（[`references/motion-spec.md#L7-L30`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/motion-spec.md#L7-L30)）。

落到案例源码后，结构大致如下：

```text
static data / constants / seeded setup
        ↓
local mutable state (progress, target, velocity, lifetime, flags)
        ↓
optional simulation or bounded response
        ↓
one requestAnimationFrame owner
        ↓
DOM/CSS/SVG | Canvas2D | WebGL2 draw passes
        ↑
real pointer / wheel / scroll / visibility / resize events
```

这是一个**观察到的共同形状**，不是上游导出的公共接口。每个案例重新声明自己的常量、状态和事件；可迁移的是这条边界本身，不能把它误写成 `motion-web` 的 engine contract。

### 3.2 数据与状态

- 数据通常是源码内的常量/数组：节点数量、轨道、文本、几何、颜色、字体、速度阈值和限制值。没有共享的数据模型或远端数据层。
- 状态由案例自己持有：如 `target/position/velocity`（轨道/翻页）、Verlet 节点位置与隐含速度（绳/帘）、粒子生命期/尾迹（lyre）、当前物理时间与固定步长累加器（时钟）。
- skill 的规范要求把“运动是什么”写成语义字段；registry 只存 intent/channels/parameters/drivers/reduced-motion，方程是数据而不是可执行 JS。这一条与本项目的 `motion-primitives.json` 很接近，可直接继承为 clean-room contract，而不能复制案例的代码。

### 3.3 时间与更新

上游同时存在几种时间语义：

1. **墙钟/帧钟**：多数案例用 `requestAnimationFrame` 加 `performance.now()` 或经过帧间隔换算的更新；MDN 说明 rAF 回调随浏览器 repaint 调度，后台 tab 可能暂停，因此它天然不等于可寻址的 authored time（[MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)）。
2. **输入时间**：press-stack 使用原生滚动几何，wheel-rail 使用虚拟轨道 target；交互响应由 wheel/pointer 事件推进，而不是一个可离线 seek 的时间轴。
3. **固定子步**：string-clock 的 `DT=1/120` 和 accumulator 把绳模拟从渲染帧率中隔离出来；它仍有正常模式的 Date 读取和 rAF，但 probe 能设置 `h/m/s` 并 settle。
4. **量化时间**：ink-crowd 的 shader `uStep=floor(t*BOIL_HZ)`，BOIL_HZ 为 11；这是“每秒若干稳定状态”的可读机制，不等于全场景能按任意时间恢复。
5. **自然衰减**：lyre 的单词生命期、尾迹和 crow steering 是响应/生态循环；它依赖运行过程中的事件与随机，不能只以时间轴描述。

上游 timeline 参考也提醒：timeline 线性推进，easing 只改变一段的感知速度；要检查死拍、台阶、stillness ratio，而不是凭“有缓动”宣称节奏正确（[`references/timeline-orchestration.md#L34-L43`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/timeline-orchestration.md#L34-L43)、[`#L231-L264`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/timeline-orchestration.md#L231-L264)）。

### 3.4 渲染层与语义层

`references/render-layer.md` 要求在选择 mechanic 之前先声明 layer：DOM+CSS 适合文本与状态，SVG 适合可读几何，Canvas2D 适合大量便宜 marks 但自身没有 a11y/hit-testing，WebGL/Three 适合深度、遮挡、实例化和逐像素效果；混合 world 应把可读/可 tab 的内容留在 DOM/SVG（[`references/render-layer.md#L11-L29`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/render-layer.md#L11-L29)）。

七个案例实际覆盖：

- `string-clock`：Canvas2D 绳/指针，加 DOM 控件和读数。
- `ink-crowd`：WebGL2 MRT/G-buffer、深度后处理、capsule shader，DOM 负责页壳/语义。
- `press-stack`：DOM/CSS 原生滚动和 sticky stack，Canvas2D 画唱片/插画。
- `wheel-rail`：DOM 文案和虚拟 rail，inline SVG 路径与节点，另有 ambient sweep。
- `toy-flipbook`：DOM 图片帧叠层，11Hz held jitter 和弹簧 scrub。
- `char-curtain`：实际运行时为 Canvas2D 的 24 条独立 vertical Verlet strings；源码中的 WebGL2 `SOURCE` 是字符串资料，不是运行 renderer，不能误报为 WebGL 案例。
- `lyre-crows`：Canvas2D lyre/words/crows，Steering + decay 形成输入因果循环。

这也解释了为什么“Canvas/WebGL 视觉相似”不是可验收标准：语义载体、命中区域、键盘路径和 reduced-motion fallback 必须独立于画布奇观设计。

### 3.5 输入边界与探针

案例优先让真实事件路径产生状态改变：Pointer Events（含 pointer capture）、wheel/scroll、pointer velocity、visibility 和 resize。MDN 的 Pointer Events 文档确认 pointer capture 是把后续 pointer 事件锁给目标的机制（[MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)）。

探针通常是 read-only `window.__probe`，公开位置/进度/节点/层类型等可观测状态；`string-clock` 特意提供 `setTime`、`settle`、`unpin`、`reset`，但没有用 probe 直接伪造拖拽，而是让验证脚本发真实 pointer drag。`verification-harness.md` 建议 `__seek`/`__clock`/`__probe` 等正交能力，但也警告 lifetime/particle 场景不能拿 seek 冒充真实滚动/输入（[`references/verification-harness.md#L50-L98`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/verification-harness.md#L50-L98)）。

## 4. 七个案例的机制矩阵

| 案例 | 运动机制/时间 | 确定性与可寻址性 | a11y / reduced motion | renderer 与清理观察 |
| --- | --- | --- | --- | --- |
| `string-clock` | 两端固定的 slack string；Verlet interior；hub spring；tip 强 spring 对齐目标角；Canvas2D + rAF，`DT=1/120` | 最强：`setTime(h,m,s)` + `settle(ms)` + `reset`/`unpin`；正常模式仍读 Date | `restShape()` 直接给解析静止形状；DOM 控件/读数、真实 pointer drag；RM 不靠事件继续跑 | Canvas2D；无通用 destroy，但可作为 fixed-step/settle 合同样本 |
| `ink-crowd` | 620 capsule instances；WebGL2 MRT/G-buffer/depth post；跟随用 `1-exp(-6dt)`；shader boil 11Hz | 初始化有 LCG seed `20260902`，shader step 量化；主时钟来自 `performance.now`，没有公开 clock setter，非完整 offline seek | RM 下固定姿态/停 boil；DOM 语义有限，主体多数在 canvas | WebGL2；resize 会删旧 texture/重建 attachments；未证明完整 unmount/late-load disposal |
| `press-stack` | 原生 scroll + sticky stack + Canvas2D sleeve/record；每帧读 `scrollY`，pointer parallax；preloader/timer | 画面 seed 固定，但 scroll 由真实几何推进；preloader/perf clock 仍存在，无统一 seek | hidden word spans/`aria-label`；RM 删除预载与 loop、保持内容；焦点/可读文字在 DOM | DOM+Canvas2D；没有案例级 destroy/取消所有 listener/timer 的公共出口 |
| `wheel-rail` | wheel hijack → virtual rail target；exponential follow；SVG `getPointAtLength` 放置曲线/marker；ambient sweep | probe `jump/setScroll` 可定位 rail 进度；ambient `performance.now` 且 grain 用 `Math.random`，所以非 bitwise deterministic | 文案 DOM/hidden labels；RM 固定 ease/取消持续 loop但仍保留 authored sweep/静态路径 | DOM+SVG+Canvas/粒子；动态 DOM churn 可测；缺少完整 teardown |
| `toy-flipbook` | 预渲染 yaw frame 硬切；held 11Hz jitter；spring scrub；toy hop/physics | `performance.now` + jitter/kick 使用 `Math.random`；probe 只读 scrub/box，无 time setter | main frame 有 alt，入口/turnaround 在 RM 下保留必要 entrance；画面主体为图片层 | DOM 图片叠层；没有可挂载生命周期清理 |
| `char-curtain` | 24 条独立竖绳；Verlet links；pointer x/y 各向异性力；speed 映射颜色/alpha | 无 clock setter；更新按 rAF/frame 调用，未证明 30/60/120 一致；无输入时可静止 | Canvas2D 主体，probe/readout 有限；RM 主要冻结/停止动态而非完整语义替代 | Canvas2D + ResizeObserver；需外层负责取消 rAF、listener、observer |
| `lyre-crows` | pointer velocity pluck → word spawn → crow steering/catch → word decay/tail；源速率限制、最多 4 words | 多处 `Math.random`（初始位置、spawn/steering 等）+ perf clock；无 seek/replay contract | RM 跳过 crow steering 但仍绘制/维持部分内容；Canvas 语义替代很弱 | Canvas2D + ResizeObserver；word/crow 清除是运行时寿命，不是卸载清理 |

案例 README 对机制和皮层分别列出 transferable / skin：例如 string 的 solver、tip exactness、real drag 可以迁移，但 clock 文案、颜色、姿势和品牌 copy 不应迁移（[`cases/string-clock/README.md#L213-L229`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/string-clock/README.md#L213-L229)）；同样的 mechanism/skin split 适用于其他案例，skill 总则明确“机制工程可学，皮层 identity 不得照搬”（[`SKILL.md#L218-L240`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/SKILL.md#L218-L240)）。

## 5. 确定性、时间寻址和验证：不能混为一谈

### 5.1 逐案判断

| 等级 | 案例 | 可复现条件 | 仍缺的条件 |
| --- | --- | --- | --- |
| A：可做时间寻址样本 | string-clock | fixed timestep；probe 设置时间、settle；状态可读；真实 drag 单独验证 | 正常自由运行仍依赖 Date/rAF；移植时需拆出 authored clock |
| B：部分稳定 | ink-crowd、press-stack | seed/LCG 固定部分数据；可读取 probe；部分响应公式与阈值明确 | `performance.now`、scroll/事件历史、timer 或 shader elapsed 仍在运行路径；没有统一 `sample(t)` |
| C：可定位但非确定 | wheel-rail | `jump`/`setScroll` 定位虚拟 rail；真实 wheel 也可测 churn/lag | ambient sweep 和随机 grain；输入/墙钟仍影响画面 |
| D：交互生态样本 | toy-flipbook、char-curtain、lyre-crows | 可从真实 pointer/wheel 看见状态变化；局部参数可观测 | 无统一 time pin；随机/逐帧物理/事件历史；不能做样本级 hash 或离线 seek |

`verify_case.py` 的角色是**针对 complaint 的多个小 oracle**，不是一个综合质量分数。它检查页面错误、结构/overflow/landmark，再按案例要求检查真实 wheel、mid-transition、sticky/churn、strings drag、layer 和 reduced-motion；`--beats` 还要求页面提供 `__probe.seek/tracks`。这些检查证明“某个观察路径成立”，不证明所有帧确定、可编码或能在 mounted component 卸载。

其重要实践值得移植：

- 先用已知答案验证 oracle 本身；每个 complaint 只配一个可证伪的 oracle。
- 对 same-clock A/B 做 diff，避免把不同运行时间当差异；禁止 render path 中未 seeded 的随机。
- 动态场景检测 state exit（例如 caught/removed/settled），不要用“画面每帧都不同”替代生命周期证明。
- 对 fixed-step/平滑度测试 30/60/120fps；对 wheel choreography 必须真实 wheel、真实中途状态，而不是 teleport 到最终值。
- 离线渲染只驱动 absolute authored state；不要 race wall clock/headless timing。

详见 [`references/verification-harness.md#L14-L31`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/verification-harness.md#L14-L31)、[`#L100-L143`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/verification-harness.md#L100-L143)、[`#L146-L220`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/verification-harness.md#L146-L220) 和 [`scripts/verify_case.py#L229-L274`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/scripts/verify_case.py#L229-L274)。

### 5.2 一个简单的确定性契约

对本项目而言，“可渲染”应定义为：

```text
frame = render(sample(authoredTime, stableInput, seed, viewport, reducedMotion))
```

而不是：

```text
frame = render(Date.now(), performance.now(), Math.random(), liveInput)
```

若机制必须依赖交互，则交互应先被录成有序 event log，再由确定性 reducer 还原状态；若只是实时 preview，可有独立 live adapter，但 offline/HyperFrames renderer 不能读 rAF、墙钟、未 seed 随机、网络或输入历史。该边界与本仓 `motion-foundation.md` 的 procedural 字段（stable generator ID、参数范围、deterministic seed、sampling、loop/phase、budget、reduced motion）以及当前 change spec 的 authored-time 约束一致。

### 5.3 清理与 mounted 生命周期

上游 `references/scene-streaming.md` 给出了比案例实际实现更严格的理想生命周期：active window、协作式扫描、DOM batch、GL geometry/material/texture dispose、URL cache、late-load disposed guard、音频 stop/disconnect（[`references/scene-streaming.md#L13-L150`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/scene-streaming.md#L13-L150)）。但固定版本的 7 个 standalone 案例没有通用 `destroy()`；源码普遍启动 rAF，且部分使用 event listener、ResizeObserver、interval/timeout。`ink-crowd` 的 resize texture deletion 是资源重建，不等于 unmount cleanup。移植到 React/SPA 时必须由项目 adapter 明确拥有并取消：

```text
requestAnimationFrame handle
window/document pointer, wheel, scroll, visibility listeners
ResizeObserver
setTimeout / setInterval
WebGL buffers, textures, framebuffers, programs
Audio nodes / media resources (if used)
```

清理应成为 evidence 的正向观察（reload/pagehide/route unmount 后无 loop、listener、GPU、timer 泄漏），不能以“页面看起来消失了”替代。

## 6. a11y 与 reduced-motion 的真实边界

上游把 baseline UI 作为独立层：静态内容应在无 motion 时成立；不能只用 hover 触发；Canvas/WebGL 需要预先设计 fallback（[`references/motion-spec.md#L124-L130`](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/motion-spec.md#L124-L130)）。实践上：

- `string-clock` 有可读 DOM 控件/状态读数，RM 走解析 rest shape；这是最完整的“动态视觉 + 语义控制”样本。
- `press-stack` 和 `wheel-rail` 把文案保留在 DOM，使用 `aria-label`/hidden word spans 让画布/轨道视觉不成为唯一信息载体。
- `toy-flipbook` 的主视觉帧有 alt；主体仍是图片叠层，交互语义需由移植层补足。
- `ink-crowd`、`char-curtain`、`lyre-crows` 的主要内容是 Canvas/WebGL，probe/readout 并不等于完整键盘语义、焦点模型或替代文本。不能因有 `prefers-reduced-motion` 分支就宣称 a11y 完成。

reduced-motion 不是统一“把 opacity 设成 1”：案例分别采用解析静止形状、固定姿态/停止 boil、删除预载和 rAF、抑制 CSS-only entrance、保留输入但不跑动态、停止 crow steering 等策略。项目应在 motion spec 中逐项写出“保留的状态、删除的运动、可用的控制”，而不是由通用 middleware 猜测。浏览器媒体查询语义参考：[MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)。

## 7. 与本项目现有能力的比较

### 7.1 DESIGN / MOTION

本项目的 DESIGN 记录 research object、single-desk continuity、source link、不可复制的 UI/品牌边界；它比 motion-web 案例更明确地绑定一个产品叙事，并明确“不做 UI replication”。本项目的 `MOTION.md` 已把 expressive posture、selected primitive、GSAP 3.15.0、HyperFrames 0.8.46、单一 paused timeline、reduced static final、manual controls 和 cleanup 写成 target contract；这比案例的 live rAF loop 更适合作为可复核的 product film source。

`motion-foundation.md` 进一步把项目级 motion source 与 change-level selection 分开，要求 procedural motion 具备稳定 generator ID、参数单位/范围/默认值、seed、sampling、loop/phase、surface、budget 和 reduced-motion。它可以吸收 motion-web 的“把机制说清楚”的优点，同时拒绝把源码复制进 foundation。

### 7.2 HyperFrames / GSAP / Playwright / FFmpeg

当前实验的分工是清楚的：

```text
MOTION.md + change motion.md
          ↓ selected primitives / semantic tracks
GSAP 3.15.0 paused timeline (one offline time owner)
          ↓ HyperFrames 0.8.46 lint/check/render
Playwright 1.62.0 verifier (seek, identity, lifecycle, RM, mobile)
          ↓
FFmpeg/ffprobe: H.264 1280×720 30fps 20s / 600 frames proof
          ↓
output receipts + hashes + verification.json + frames/contact sheets
```

`skill/references/hyperframes.md#L34-L89` 要求 HTML source、可寻址 timing、唯一 paused `gsap.timeline`、逐帧 seek，禁止 Date/performance/render clock、未 seed random、network、input history 和 layout properties；它还要求 lint/check/render、ffprobe、编码/解码/尺寸/fps/hash 证据。`run.cjs` 和实验 README/qa 已把这些 gate 写成 target-local 流程，且明确 HyperFrames motion detector disabled、动态 motion 由 verifier 单独 exercise；这比把 motion-web 的 `verify_case.py` 直接搬进来更符合本项目的 target/snapshot/policy/receipt lineage。

因此两者关系不是替代：

- motion-web 提供**交互机制和 complaint-specific oracle 的灵感**；
- GSAP/HyperFrames 提供**项目 film 的 authored-time 可寻址渲染**；
- Playwright 提供**页面状态/交互/生命周期/视觉证据**；
- FFmpeg/ffprobe 提供**编码产物可播放和元数据事实**；
- 既有 DESIGN/MOTION/OpenSpec/evidence 提供**需求、身份和来源边界**。

### 7.3 来源身份已修正

本仓现有 `skill/references/motion-first-capability.md` 与 `openspec/changes/extend-motion-first-capability/reference-boundary.md` 已经记录了正确的 `sourceMeta.url`/`Source`：`https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115`。固定 commit 的 GitHub source identity 是 `feitangyuan/motion-web`；`2233admin/motion-web` 是该仓库的 fork/alias，不是本项目研究并固定版本时引用的 canonical authored source。`skill/references/motion-primitives.json` 中两条新 primitive 的 `provenance.source` 此前仍写着 `2233admin`，与 `tests/animation-opportunity-reference.test.cjs` 的旧断言一起，已由独立 OpenSpec change `fix-motion-web-provenance` 修正为 `feitangyuan` root URL，revision、content hash、`codeCopied:false` 和 reject list 保持不变。

## 8. clean-room：可迁移与禁止复制

### 8.1 可迁移的机制思想

以下是抽象方法，不依赖上游品牌、代码或案例资产：

- 为每个 motion 写一个可观察的 job：引导、建立层级、承载语义、反馈、handoff，而不是“加动画”。
- 先声明 render layer 和 semantic carrier，再选择 solver/primitive；Canvas/WebGL 只承担视觉密度，不吞掉正文、焦点和可操作控件。
- 对弹簧/物理响应声明输入、边界、稳定条件、固定步长或 frame-rate independent 公式、阈值和预算。
- 把 authored time、live input、random seed、viewport、reduced-motion 分开；offline 只能由前四者的显式值算状态。
- 读写接口正交：read-only probe 用于观测；真实 pointer/wheel 用于验证 commit path；不要用 probe teleport 冒充交互。
- 以 state exit、settle、removed、caught、cleanup 等可证伪事实做 oracle；不要以“帧在变”当成质量证明。
- reduced-motion 输出 authored resting state；不要仅机械地把所有 duration 置零。
- 组件/场景拥有唯一 loop owner 和对称 destroy；GPU、timer、observer、listener、audio 全部列账。
- 将高频采样、capture、hash、ffprobe 作为证据，不把截图/动画 GIF 当成确定性或可播放性证明。

### 8.2 不应复制的内容

即使技术上很容易复制，也应列为 reject：

- 上游源码、内联 shader、具体 equations 的代码写法、probe/CLI/test fixtures、验证脚本和 repository workflow；
- `string-clock`、`ink-crowd`、`press-stack`、`wheel-rail`、`toy-flipbook`、`char-curtain`、`lyre-crows` 等 case name、角色/物件组合和叙事隐喻；
- copy、字体、图片、SVG/Canvas 图形、色板、构图、具体布局、数字、seed、精确 duration/easing/频率和“AI slop”文案；
- 把上述内容拼接成项目模板、prompt pack、商业 agent workflow 或直接把案例嵌入产品；
- 将 motion-web 当作 npm 依赖或宣称存在官方 runtime API（固定版本没有 `package.json`）。

可在 clean-room 下以项目自己的名称、数据、参数、结构和实现重新表达同一类物理/时间/验证思想；但“思想可迁移”不等于“衍生实现自动可商用”。本项目已记录 `codeCopied:false` 与 clean-room implementation policy，应继续把 upstream 只当 reference。

## 9. 两个项目自有重设计方案

### 方案 A（推荐）：Authored Motion Graph / 语义时间图

**目标**：在不引入上游 runtime 的情况下，把 motion-web 的强项压缩成本项目可 seek、可验收、可商用的语义层。

**核心形状**：

```text
subjects + stable anchors + semantic tracks
        ↓
pure sample(authoredTime, params, seed, viewport, reducedMotion)
        ↓
DOM/SVG/CSS first; Canvas/WebGL only behind scene contract
        ↓
one paused GSAP timeline → HyperFrames frame seek
        ↓
Playwright state-exit/identity/cleanup/RM evidence + FFmpeg/ffprobe
```

建议 schema（概念，不是本次实现）：

```text
MotionGraph {
  id, motionJob, subjects[], anchors[],
  tracks[{property, from, to, start, duration, ease, stagger}],
  response[{input, boundedRange, settle, interruption}],
  procedural[{generatorId, params, seed, sampleRate, loop}],
  rendererLayer, semanticCarrier, reducedMotion, cleanup, oracles[]
}
```

**优点**：直接对齐已有 MOTION/OpenSpec/GSAP/HyperFrames/evidence；可以把真实交互 preview 作为独立 adapter，而不污染 offline truth；不会复制上游；所有时间点、轨道、状态退出和 receipt 可以有稳定 lineage。

**代价**：不适合把任意实时生态/高自由度物理直接录成电影；需要把“看似自然”的响应转换成 bounded authored tracks 或 seed+sample 函数；语义 graph 的字段治理需要 checker。

### 方案 B：Causal Motion State Machine / 事件因果图

**目标**：为未来 interactive preview 或“一个操作如何改变后续场景”提供比时间轴更强的因果表达。

```text
event log (pointer/wheel/trigger)
        ↓
deterministic reducer(state, event)
        ↓
bounded states + transitions + decay + settle
        ↓
snapshot(state, authoredTime) → render adapters
```

每个事件应包含归一化坐标、速度/方向、时间戳（属于 authored replay，不读 wall clock）、目标 subject 和 seed；reducer 只接受显式输入。离线电影可以回放 event log 并在 transition 后 handoff 到 authored settle；实时 preview 可以把真实输入转成同一 event schema。oracle 应检查“事件后状态是否进入预期区间”“对象是否 removed/caught/settled”“重放 hash 是否相同”，而不是比较任意屏幕像素。

**优点**：最接近 motion-web 的 lyre/strings/rail 因果循环；可解释“为什么这个对象出现/消失”；实时与离线共用同一事件语义。

**代价**：比当前单片 timeline 更大的 schema 和 reducer surface；需要 event-log fixture、replay/seek 规则和更多 QA；若现在为 20 秒 product film 引入，会形成第二套 runtime/gate，违反“不要平行 gate system”。

### 9.1 选择

**现在选 A，吸收 B 的最小子集。** 具体是：在现有 Authored Motion Graph 中只加入 `response` 的 bounded input、interruption、settle 和 state-exit oracle 字段；不引入通用物理引擎、不复制案例、不新增独立验证 CLI。待项目确实需要可回放 interactive preview，再以 OpenSpec 变更把 event log/reducer 作为 B 的明确增量提出。

## 10. 迁移/验收建议（面向后续 OpenSpec，不是本次实施）

1. **来源**：更正 upstream owner URL；保留固定 revision、内容哈希、CC BY-NC 记录和 reject list；明确本项目不是把上游作为 dependency。
2. **MOTION 合同**：每个 motion 记录 job、subject/anchor、trigger、duration/ease、bounded response、seed/sample、renderer layer、semantic carrier、RM resting state、cleanup owner 和 oracle。
3. **离线时间**：所有 HyperFrames/FFmpeg 采样只使用一个 paused GSAP timeline；禁止 `Date.now`、`performance.now`、rAF、网络、未 seed random、live input history 作为 truth。实时 preview 必须与 offline adapter 分离。
4. **交互验证**：Playwright 既做 exact seek/state probe，也做真实 pointer/wheel；probe 不得替代 commit path。对粒子/寿命/滚动场景加入 event-log 或 real-input 说明，不能仅用 final jump。
5. **reduced-motion**：以静止/解析 fallback/不删除语义内容的最终状态为验收对象；同时检查 focus、keyboard、DOM text/ARIA 和 touch target。Canvas/WebGL 的 visual-only 区域必须有项目自己的语义载体。
6. **清理**：为每个 adapter 记录 rAF、listener、observer、timer、GPU、audio 的 acquire/release；在 reload、pagehide 和 route unmount 后采集无泄漏证据。上游案例的“能跑”不能作为 mounted component 的 cleanup 证明。
7. **产物**：沿用现有 target、snapshot、policy digest、receipt lineage；保留 HyperFrames lint/check/render、Playwright verification、FFmpeg/ffprobe metadata/hash 和 frames/contact sheets。Component Conformance 与 Visual Acceptance 继续分开。

## 11. 参考资料

### 上游固定版本

- [README](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/README.md)
- [LICENSE](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/LICENSE)
- [SKILL](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/SKILL.md)
- [motion-spec](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/motion-spec.md)
- [motion-tokens](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/motion-tokens.md)
- [timeline-orchestration](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/timeline-orchestration.md)
- [render-layer](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/render-layer.md)
- [verification-harness](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/verification-harness.md)
- [scene-streaming](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/references/scene-streaming.md)
- [verify_case.py](https://github.com/feitangyuan/motion-web/blob/5f4e40f1253e11e28850d08dce28b9b7e4320115/scripts/verify_case.py)
- [string-clock](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/string-clock)
- [ink-crowd](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/ink-crowd)
- [press-stack](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/press-stack)
- [wheel-rail](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/wheel-rail)
- [toy-flipbook](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/toy-flipbook)
- [char-curtain](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/char-curtain)
- [lyre-crows](https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115/cases/lyre-crows)

### 本项目

- [`skill/SKILL.md`](../../skill/SKILL.md)
- [`skill/references/motion-foundation.md`](../../skill/references/motion-foundation.md)
- [`skill/references/motion-first-capability.md`](../../skill/references/motion-first-capability.md)
- [`skill/references/hyperframes.md`](../../skill/references/hyperframes.md)
- [`experiments/openalice-product-animation/MOTION.md`](../../experiments/openalice-product-animation/MOTION.md)
- [`experiments/openalice-product-animation/README.md`](../../experiments/openalice-product-animation/README.md)
- [`openspec/changes/integrate-product-animation/motion.md`](../../openspec/changes/integrate-product-animation/motion.md)
- [`openspec/changes/integrate-product-animation/qa.md`](../../openspec/changes/integrate-product-animation/qa.md)

### 平台 API（官方）

- [MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [MDN Canvas 2D](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D)
- [MDN WebGL2](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext)
- [MDN ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [MDN `prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [MDN SVG path geometry](https://developer.mozilla.org/en-US/docs/Web/API/SVGGeometryElement/getPointAtLength)
- [Playwright Mouse API](https://playwright.dev/docs/api/class-mouse)

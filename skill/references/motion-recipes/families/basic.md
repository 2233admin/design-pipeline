# Basic motion recipes / 基础运动配方

Use this family to choose a **mechanism**, not a fashionable effect name. Every catalogue item has an explicit authored configuration in the original offline [full gallery](../../../tools/motion-recipes/full/index.html). The implementation is [basic.js](../../../tools/motion-recipes/full/basic.js); the catalogue remains the authoritative variant configuration. Source observations identify concepts and displayed parameters, not a visual-fidelity claim.

本组用于选择**运动机制**，不是按效果名字盲套。原则、时序、真实弹簧、几何路线、透视平面和 SVG 合成各有独立行为；示例是可检查、可反向拖动的原创研究，不是新的生产动效运行时。

This family covers 164 observed IDs: principles17, easing25, spring16, timing15, entrance11, move11, scale11, rotate11, reaction11, collection12, attention12 and svg-path12. They map to 93 original descriptors:22 curves/physics,34 principles/timing/collections,25 transforms/responses/emphasis and12 SVG geometry/compositing. Descriptor sharing preserves explicit supported parameters and real branches; a shared recipe is not a claim that the source items look identical.

| Find / 查找 | Mechanism section / 章节 | Typical question / 产品问题 |
| --- | --- | --- |
| 速度曲线、弹簧 / curves, springs | Curves and physical responses | 如何区别匀速、加速、阻尼与改目标？ |
| 原则、节奏、列表 / principles, timing, collections | Principles, temporal structure and collections | 如何让动作有预备、停顿、跟进或层次？ |
| 入场、路线、缩放、旋转 / arrival, paths, scale, rotation | Transforms, reactions and attention | 内容怎样出现、移动、形变或一次性强调？ |
| 描边、形状变化、裁切 / SVG draw, morph, clip | SVG geometry and compositing | 怎样改变真实路径或可见区域，而不拉伸文本？ |

## Authority and adoption / 权威与接入

Current user decisions, `DESIGN.md`, `MOTION.md`, semantic motion primitives and project tokens override every teaching value here. Read [animation thinking](../../animation-thinking.md), [opportunity/review](../../animation-opportunity-and-review.md), and [UI transition rules](../../ui-transition-rules.md). None of these studies establishes a new token scale, schema, workflow, gate or receipt.

当前项目规范与产品功能优先于示例参数。先决定它是否值得动，再决定怎样动。高频输入、必须即时操作、信息密集列表、阅读状态以及会引发不适的页面，不用摇动、呼吸、反复闪亮；可直接保留最终静态状态。

- **Logical owner / 逻辑权威:** A model owns value, target, selected state, availability, layout and focus immediately. Animation completion never commits a business value or grants availability. Study labels are explanatory state, not a production event handler.
- **Triggers / 触发:** Use committed state changes for arrival/feedback; use a single requested target for travel; use an intentional focus/status transition for emphasis. Do not trigger an error cue merely because a field mounted. Curve and principle charts are teaching comparisons, not ordinary UI ornament.
- **Frequency / 频率:** Arrival and feedback run once per meaningful transition. Orbit, pendulum, breathing, chase and repeated timing samples have bounded authored cycles; adopting them does not authorize ambient infinite loops. Interrupt or omit them when users are reading or acting repeatedly.
- **No-motion / 不动:** Static final content, focus outlines, error messages, badge counts, settled physical target and final paths remain meaningful. Dismissal removes content and explains dismissal; it does not freeze a shrinking unreadable intermediate frame.

## Timeline, interruption and resources / 时间轴、打断与释放

Each study mounts original geometry once. `seek(t)` is a complete reconstruction from finite normalized progress in `[0,1]`; cold seeks, backward inspection and repeated seeks do not depend on frame history. The gallery owns play/pause/reverse and its animation frame; descriptors do not start a private loop. `dispose()` removes only study-owned SVG/HTML descendants, filters and clips. Invalid/missing/unknown parameters throw instead of choosing a fallback. Per-mount SVG IDs keep filters and masks separate.

原始教学时长与来源展示的动作/循环时长分开记录。缩减动效总是静态呈现有意义的结束状态，无位移、摇动、闪烁或重复；真实业务状态仍由宿主决定。正常弹簧研究展示有限采样窗口，终点保留物理残差，不强行跳到平衡点；缩减动效单独呈现目标。新的目标到来时，生产宿主应取消旧展示，并从当前呈现状态和速度重新规划；研究页的反向 seek 不是生产反向事件。

### Renderer handoff / 渲染器接入

The teaching channel is original SVG geometry plus HTML inside SVG `foreignObject` for actual CSS perspective planes. Existing project primitives may express opacity/transform feedback; use the project's closest **existing** semantic primitive rather than inventing one. Named SVG `path`, `clipPath`, `mask`, stroke dash, filters and independent points are explicit platform channels when no semantic primitive fits.

For React/Vue, retain mounted node refs, cancel owned animation on unmount, and update logical state outside the presentation callback. For Canvas, reconstruct the same authored geometry with paths/transforms/clips at any timeline position; do not use frame accumulation. For film/edit, schedule these phases on the existing timeline and substitute project-approved assets/fonts; a DOM study is not final render evidence. Perspective uses actual `perspective`/`preserve-3d`/backface control, not a fake flattened card.

For real drag/pointer, capture a specific pointer, update the logical target from coordinates, handle `pointercancel`, release capture on disposal, and retain keyboard-equivalent actions. The resisted-drag study shows an input marker and a compressed display coordinate; it does not claim pointer ownership. For scroll, derive progress from the current scroll model and coalesce writes under the existing frame owner; do not create a second loop. For spring retargeting, preserve current physical position and velocity rather than restarting from zero. For a menu dismissal, the host restores focus immediately according to its accessibility model; the exit decoration is optional.

## Transforms, reactions and attention / 位移、形变与强调

All parameter fields below are required; numeric ranges and enum values are the accepted authored domain. Geometry values are SVG teaching units, not project layout pixels or universal timing tokens. Start/end and phase choices below apply to the original study; retune through project authority before adoption.

| Descriptor / 配方 (`basic.` prefix) | Explicit parameters / 显式参数 | Start → phases → end / 起点、分段、结果 |
| --- | --- | --- |
| `translation-profile` | `profile`: linear, smooth, anticipate, heavy-stop, momentum, magnetic; `distance`:100–360 | Left → constant/smooth velocity; negative pre-motion; braking overshoot; exponential drift; magnetic threshold → target. Heavy stop also tips the body. |
| `geometric-travel` | `path`:arc, bezier, waypoints, zigzag; `distance`:100–340; `height`:24–100 | Start point → actual quadratic/cubic/waypoint track with tangent orientation → final point. A path is not ordinary linear easing. |
| `delayed-followers` | `count`:integer3–7; `lag`:.04–.13; `distance`:100–320 | Leader begins → each follower delays → all reach destination. |
| `opacity-arrival` | `profile`:fade-slide, soft-rise, snap; `distance`:20–130 | Transparent offset → horizontal fade, fifth-power rise or fast snap → readable content. |
| `geometric-reveal` | `shape`:horizontal, diagonal, iris, split; `extent`:80–200 | Clipped content → real clip width/polygon/radius/two-side geometry → complete region. Glyphs stay unscaled. |
| `scale-dismissal` | `profile`:collapse, shrink-fade; `remainingScale`:0–.45 | Visible → nonuniform collapse or uniform shrink with opacity → dismissed; host owns focus. |
| `trail-dismissal` | `distance`:80–220; `count`:integer3–6 | Visible instances → delayed finite residual trails → no content/trail left. |
| `perspective-plane` | `mode`:fold, flip, coin, gyroscope, zoom, pullback; `depth`:60–180 | Fold angle/front/depth offset → real X/Y/Z or depth in CSS perspective → front/back or settled plane. `depth` also governs perspective strength for angular modes. |
| `scale-envelope` | `profile`:pop, elastic, punch, shrink; `amount`:.15–.65 | Reduced size/back-out; analytic elastic easing; bounded size impulse; or shrink → defined final size. Elastic easing is not the physical spring solver. |
| `bounded-scale-pulse` | `mode`:breathing, focus; `amount`:.04–.3; `cycles`:integer1–3 | Rest → finite sinusoidal size pulses → rest; focus retains a static outline. |
| `axis-deformation` | `mode`:stretch, impact, jelly, rubber; `amount`:.1–.5 | Rest/drop → reciprocal stretch, grounded impact squash, cross-axis jelly or reciprocal rubber oscillation → restored shape. |
| `width-geometry` | `width`:100–300 | Zero rectangle width → out curve and late text appearance → final width with unchanged glyph metrics. |
| `angular-profile` | `profile`:turn, spin-stop, pendulum, tilt, nod, reveal; `angle`:15–720 | Defined orientation → linear turn, angular deceleration, bounded pendulum, one tilt/nod or rotating arrival → final orientation. |
| `orbital-hierarchy` | `mode`:orbit, counter; `radius`:45–100; `turns`:integer1–3 | Parent orbit → child inherits rotation or explicitly counter-rotates → cycle endpoint. Compare world-space orientation. |
| `tumble-arrival` | `distance`:80–220; `turns`:integer1–3 | Offset, small, transparent → combined translation/rotation/scale → stable visible tile. |
| `decaying-displacement` | `mode`:after-shake, error, recoil, overshoot, snap-back; `amount`:12–70 | Updated state → distinct bounded shake/impulse/overshoot envelope → rest; error text remains readable throughout. |
| `contact-response` | `mode`:bounce, double, settle, attention; `height`:35–115 | Raised body → distinct contact/bounded bounce, second hop, impact settlement or attention jump → resting ground contact. |
| `resisted-drag` | `distance`:70–220; `resistance`:.2–.8 | Origin → input moves independently of compressed display → release to origin. Yellow marker exposes modeled input. |
| `appendage-followthrough` | `distance`:80–220; `lag`:.08–.3 | Body and appendage → body advances/stops, delayed appendage follows via connecting curve → both still. |
| `physical-target-follow` | `distance`:70–220; `stiffness`:30–240; `damping`:4–40; `mass`:.5–3 | Displaced object → analytical damped oscillator over 2.8 seconds → physical sample endpoint, possibly with residual; reduced motion independently presents the target. Source spring tuple is provenance, not required production tuning. |
| `outline-chase` | `laps`:integer1–3; `segment`:25–100 | Partial border segment → true perimeter dash traversal → static complete outline. |
| `static-emphasis-envelope` | `mode`:color, halo, nudge, press; `amount`:.08–.35 | Selected content → finite color/halo-thickness/nudge/press deformation → static selected state. |
| `badge-notification` | `count`:integer1–99; `amount`:.1–.5 | Logical count is visible immediately → independent badge size cue → same committed count. |
| `highlight-band` | `width`:20–90 | Band outside clip → one local highlight pass → no highlight residual. |
| `spotlight-mask` | `radius`:60–100 | Dimmed context → true luminance-mask hole → static focus region. |

Transform and emphasis timing is authored as normalized phases: anticipatory travel reserves the first18%; heavy braking reserves the last30%; magnetic attraction begins after55%; impact contact begins at32%; drag input rises through60%, then releases; dismissal trails use per-instance2.5% delay. These are inspection handles, not production budgets. Deformation and overshoot can be omitted when the event is repeated or the target is actionable immediately.

## 曲线与物理响应 / Curves and physical responses

本节覆盖 **25 个 easing + 16 个 spring = 41 个精确来源 ID**，映射到 **22 个实际 descriptor**。它服务于开发者查参数、查机制、查无动效结果，不是来源动画重建报告。配置权威是现有 catalogue；机制依据是 `basic.js` 的 `buildCurvesRecipes`、`cubicBezier`、`backCurve`、`reboundCurve`，以及其内部 `oscillator`、`strictParameters`、`descriptor`。事实来源只证明目录元数据，不证明来源逐项播放或视觉忠实度。

| 要查的问题 / Lookup | 本节入口 |
|---|---|
| 每个 descriptor 的全部参数、范围和枚举 | 参数全集 |
| ID 实际映射到哪种几何 / 信号 | 精确 ID 交叉表 |
| 来源值、教学时钟、物理时钟如何区分 | 时间与事实边界 |
| 欠阻尼、临界、过阻尼与重定向 | 物理机制 |
| 启动、取消、逆向、reduced motion | 呈现生命周期与适配 |

### 时间与事实边界 / Time and provenance

- `inspiration` 的 URL、短英文标题、`durationMs`、`motionDurationMs`、`loopDurationMs`、`easing`、`textItem` 来自库存 `items`。41 项均为非文本项。原值保留；来源长描述、代码、图像和资产均未复制。`redistributionLicense: unverified` 不是许可承诺，来源品牌名也不是兼容性或认可声明。
- `motionRecipe.parameters`、中文标题、解释、教学时长是原作者选择。源参数适用时明确保留，但不把来源动作时长直接当成运行时速度预算。实际项目的 `DESIGN.md`、`MOTION.md`、组件 token 与已有 primitive 优先于样例。可用中文和 English 关键词查找；精确定位使用 `#motion=<source-id>`。
- 图中的 `t` 是 `[0,1]` 教学进度。普通曲线、摆动、尺度直接使用 `t`，由画廊的 `studyDurationMs` 决定播放速度。带 `durationMs` 的物理 descriptor 使用 `s=t*durationMs/1000` 求解；本交接让这类记录的 `studyDurationMs` 与内部 `durationMs` 相等，避免额外时钟歧义。
- `tweenDurationMs` 仅控制比较中的补间完成时间，不是整段教学时长。惯性的 `timeConstantMs` 是速度衰减常数，不是总时长。抛射使用 `T=-2*launchVelocity/gravity` 作为物理飞行时长；它的教学时长可放慢检查，但不能据此宣称重力单位是教学毫秒。
- 不默认循环、不持续吸引注意、不用动效补偿不可读的内容。每次教学播放有限；生产触发只在真实状态切换或释放时发生。任何闪动、强摆动、粗糙抖动都不是默认 UI 强调方式。

### 参数全集 / Complete supported schemas

所有字段均为**必填**，不支持未列出的字段或隐含默认。数字为有限值，范围闭区间；除标注 integer 外不要求整数。参数对象需为普通对象。`travel` 为 `distancePx: [40,110]`，下表注明其他 descriptor 的较窄范围。不能新增 `effect`、`preset`、`direction` 等未声明字段。`seed`、`text`、`reducedMotion` 属于创建 options，而非参数对象。

| 实际 recipeId（均以 `basic.` 开头） | 完整必填参数 / Supported parameters | 机制、时间阶段与 reduced 结果 |
|---|---|---|
| `linear-curve` | `distancePx [40,110]` | `f(t)=t`；等时等距；静态目标。 |
| `power-curve` | `direction: out / in-out`; `power [2,6]`; `distancePx [40,110]` | out 为 `1-(1-t)^p`；in-out 在 `.5` 拼接两段幂函数；静态目标。power 不限整数。 |
| `sine-curve` | `distancePx [40,110]` | `(1-cos(πt))/2`；首尾速度归零；静态目标。 |
| `exponential-curve` | `direction: in / out`; `exponent [2,16]`; `distancePx [40,110]` | 归一化指数缓入，或其时间镜像；精确 0/1 端点；静态目标。 |
| `circular-curve` | `distancePx [40,110]` | `sqrt(1-(t-1)^2)`，初始陡、末端平；静态目标。 |
| `back-curve` | `direction: in / out / in-out`; `coefficient [0,3]`; `distancePx [40,110]` | 预备负偏移、末端越界或双端越界；静态目标。coefficient=0 没有越界。 |
| `bounce-curve` | `distancePx [40,110]` | 固定 restitution=.5、3 次有限回弹；落下及接触抛物线，不是弹簧；静态目标。 |
| `squash-bounce` | `strength [.2,.8]`; `rebounds [2,5] integer`; `squash [.05,.45]`; `heightPx [80,160]` | strength 在此是恢复系数；运动阶段结束于 `.86`，剩余 `.14` 静止；底缘接触、面积保持；reduced 静态落地、圆形恢复。 |
| `elastic-curve` | `amplitude [1,2]`; `period [.1,.8]`; `distancePx [40,110]` | 指数衰减正弦包络，显式 0/1 端点；不是质量弹簧；静态目标。 |
| `cubic-bezier-curve` | `x1 [0,1]`; `y1 [-.5,1.5]`; `x2 [0,1]`; `y2 [-.5,1.5]`; `distancePx [40,110]` | 36 次二分反解 `x(u)=t` 后取 `y(u)`；y 可越界，x 不能；静态目标。 |
| `stepped-curve` | `steps [2,24] integer`; `distancePx [40,110]` | `floor(t*steps)/steps`，在区间末端跳变；图使用真实阶梯结点；静态目标。 |
| `rough-curve` | `points [4,64] integer`; `strength [.05,1]`; `distancePx [40,110]` | 固定种子整型 hash 写入结点，线性插值；首尾噪声为零，内部可反向；静态目标。 |
| `slow-zone-curve` | `zone [.2,.8]`; `power [.1,.9]`; `distancePx [40,110]` | 先构建快/慢/快速度并积分归一化；中段 `[edge,1-edge]`，`edge=(1-zone)/2`；静态目标。 |
| `wiggle-displacement` | `cycles [1,12] integer`; `amplitudePx [6,50]`; `decay [1,5]` | `sin(2π*cycles*t)*(1-t)^decay` 是中心周围偏移，不是到达函数；reduced 静态中心、位移 0。 |
| `logarithmic-scale` | `fromScale [.25,1.75]`; `toScale [2,8]` | `s(t)=fromScale*exp(log(toScale/fromScale)*t)`，等时等比；reduced 最终尺度，不用透明度伪装缩放。 |
| `physical-spring` | `stiffness [20,500]`; `damping [2,150]`; `mass [.2,3]`; `initialVelocity [-3,3]`; `durationMs [800,6000]`; `distancePx [40,100]` | 按秒计算解析响应，覆盖欠/临界/过阻尼；initialVelocity 是归一化位置每秒的初速；reduced 精确目标，不显示残余振动。 |
| `back-overshoot-budget` | `overshootPercent [0,20]`; `distancePx [40,110]` | 从预算反求 back 系数而非裁切结果，与零越界基线同屏；reduced 两者同一目标。 |
| `split-edge-springs` | `leadingStiffness [240,420]`; `leadingDamping [22,48]`; `trailingStiffness [90,180]`; `trailingDamping [14,32]`; `mass [.8,1.3]`; `durationMs [800,4000]`; `travelPx [40,80]` | 同时求解两条独立边缘响应，宽度为右缘减左缘；不是链式延迟；reduced 完整原宽、两缘到达目标。 |
| `summed-spring-retarget` | `stiffness [120,320]`; `damping [18,45]`; `mass [.6,1.4]`; `initialVelocity [-2,2]`; `durationMs [1800,5000]`; `retargetAt [.12,.28]`; `returnAt [.32,.55]`; `targetA [.65,.95]`; `targetB [.1,.4]`; `targetFinal [.7,1]`; `distancePx [40,90]` | 两个目标变更事件，逻辑目标立即跳变，运动保持位移/速度连续；枚举以外无任意事件输入；reduced 静态最终请求值 targetFinal。 |
| `spring-tween-comparison` | `stiffness [80,400]`; `damping [12,50]`; `mass [.5,2]`; `initialVelocity [-2,2]`; `durationMs [1000,5000]`; `tweenDurationMs [200,800]`; `x1,y1,x2,y2` 各 `[0,1]`; `distancePx [40,100]` | 物理秒时钟对比固定时长反解 Bézier；补间在 `t=tweenDurationMs/durationMs` 完成并保持；reduced 两者静态目标。 |
| `inertial-decay` | `velocityPxPerSecond [80,220]`; `timeConstantMs [180,800]`; `durationMs [1000,4800]` | 无预设目标的速度指数衰减；预测停点 `v0*τ`；reduced 静态预测停点、速度为零。当前 schema 仅支持正向初速，不能悄加反向参数。 |
| `ballistic-projectile` | `gravity [200,800]`; `horizontalVelocity [90,180]`; `launchVelocity [-260,-100]` | SVG 向下为正；恒定水平速度加向下重力；起飞/最高点/落地；reduced 精确落地位置、无速度箭头。没有 durationMs 参数。 |

### 精确 ID 交叉表 / Exact mechanism crosswalk

下表为 41 个来源 ID 的唯一映射。裸名称均是上表 `basic.<name>` descriptor；完整参数与原始来源时长见 records JSON。括号中的数值是实际参数，不是从标题猜的机制。

| Source ID | Descriptor / authored distinction | 教学时长 ms |
|---|---|---:|
| `e-apple` | `cubic-bezier-curve`，CSS `ease` 的标准等价控制点 `(.25,.1,.25,1)`，90px；不声称是 Apple 专有曲线。 | 1800 |
| `e-bounce` | `bounce-curve`，固定 .5 恢复系数、三次回弹，100px。 | 2200 |
| `e-circ` | `circular-curve`，85px。 | 1700 |
| `e-custombounce` | `squash-bounce`，事实 strength=.7，原创 4 次回弹、.28 squash、130px 高度。 | 2800 |
| `e-elastic` | `elastic-curve`，事实 amplitude=1、period=.3，95px。 | 2400 |
| `e-expo-scale` | `logarithmic-scale`，事实尺度 1→8。 | 2600 |
| `e-glide` | `cubic-bezier-curve`，事实 `(.4,0,.2,1)`，95px。 | 1800 |
| `e-house` | `power-curve`，in-out、power=5，105px。 | 2100 |
| `e-inback` | `back-curve`，in、原创 coefficient=1.70158，90px。 | 1900 |
| `e-inexpo` | `exponential-curve`，in、原创 exponent=10，90px。 | 1800 |
| `e-inout` | `power-curve`，in-out、power=3，90px。 | 1800 |
| `e-inoutback` | `back-curve`，in-out、原创 coefficient=2.2，90px。 | 2200 |
| `e-linear` | `linear-curve`，100px。 | 2000 |
| `e-md3` | `cubic-bezier-curve`，事实 `(.2,0,0,1)`，90px。 | 1800 |
| `e-md3a` | `cubic-bezier-curve`，事实 `(.3,0,1,1)`，90px。 | 1700 |
| `e-md3e` | `cubic-bezier-curve`，事实 `(.05,.7,.1,1)`，100px。 | 2100 |
| `e-outback` | `back-curve`，out、原创 coefficient=1.70158，95px。 | 2100 |
| `e-outexpo` | `exponential-curve`，out、原创 exponent=10，100px。 | 1900 |
| `e-quint` | `power-curve`，out、power=5，100px。 | 2000 |
| `e-rough` | `rough-curve`，事实 20 points、strength=1，95px；seed 来自 options。 | 2400 |
| `e-sine` | `sine-curve`，100px。 | 2600 |
| `e-slowmo` | `slow-zone-curve`，.7 zone/.7 power，100px；原创积分而非复制厂商算法。 | 2800 |
| `e-steps` | `stepped-curve`，6 steps，96px 即每级 16px。 | 2400 |
| `e-whip` | `cubic-bezier-curve`，事实 `(.9,0,.1,1)`，105px。 | 2200 |
| `e-wiggle` | `wiggle-displacement`，事实 6 cycles，原创 30px amplitude、decay=2。 | 2800 |
| `s-bounce` | `physical-spring`，事实 `(150,9,.8)`，欠阻尼；v0=0、90px。 | 2200 |
| `s-budget` | `back-overshoot-budget`，事实范围 0–20%，原创选择 12%、100px。 | 2200 |
| `s-critical` | `physical-spring`，事实 `(300,34.64,1)` 保留；原创精确临界 c=34.64101615137755，v0=0、90px。 | 1800 |
| `s-framerbouncy` | `physical-spring`，事实 `(400,17,1)`，欠阻尼；v0=0、90px。 | 2000 |
| `s-heavy` | `physical-spring`，事实 `(80,16,1.6)`，欠阻尼；v0=0、90px。 | 3000 |
| `s-inertia` | `inertial-decay`，事实 τ=700ms；原创 v0=180px/s，六个时间常数。 | 4200 |
| `s-modal` | `physical-spring`，事实 `(280,28,1)`，欠阻尼；v0=0、80px。 | 1800 |
| `s-molasses` | `physical-spring`，事实 `(280,120,1)`，过阻尼；v0=0、90px。 | 5000 |
| `s-projectile` | `ballistic-projectile`，事实 g=500；原创 vx=150、vy=-225，物理 T=.9s。 | 2200 |
| `s-rsdefault` | `physical-spring`，事实 `(170,26,1)`，略欠阻尼；v0=0、90px。 | 2400 |
| `s-smooth` | `physical-spring`，事实 `(120,26,1)`，过阻尼；v0=0、90px。 | 2600 |
| `s-snap` | `physical-spring`，事实 `(180,13,.6)`，欠阻尼；v0=0、80px。 | 1800 |
| `s-split` | `split-edge-springs`，事实 `(320,30)/(140,22)`；原创公共 mass=1、travel=65px。 | 2200 |
| `s-track` | `summed-spring-retarget`，原创 k=200,c=24,m=1,v0=.6；目标 .85→.25→.95，事件 t=.2/.45，80px。 | 3600 |
| `s-vs` | `spring-tween-comparison`，原创 `(170,18,1)`、v0=1，对比 `(.4,0,.2,1)` 的 500ms tween，90px。 | 2400 |
| `s-wobbly` | `physical-spring`，事实 `(180,12,1)`，欠阻尼；v0=0、95px。 | 2600 |

枚举交叉表完整覆盖当前 fragment 的 **3 个枚举字段、7 个可选分支**：power.direction 的 out=`e-quint`、in-out=`e-inout/e-house`；exponential.direction 的 in=`e-inexpo`、out=`e-outexpo`；back.direction 的 in=`e-inback`、out=`e-outback`、in-out=`e-inoutback`。物理 solver 的三个阻尼区另行由真实参数到达：欠阻尼如 `s-bounce`；精确临界为 `s-critical`；过阻尼为 `s-smooth/s-molasses`。这些是静态映射依据，不是运行验收证据。

### 信号与形变机制 / Signals and deformation

**Inverse-x Bézier。** 控制点定义的是参数曲线 `B(u)`，不是直接把进度当 `u`。算法对 `[0,1]` 的 `u` 作 36 次二分，使 `Bx(u)` 等于时间，再返回 `By(u)`；`t=0/1` 显式直接返回端点。`x1>x2`（如 whip）仍在 CSS 允许的 x 域中，不能改成 y(t) 以省掉时间反解。阶梯不做平滑化；粗糙结点在创建时固定，同一 seed 的冷跳转与逆向路径相同。

**Finite restitution bounce。** 初次下落占一个归一化物理单位；第 i 次回弹高度为 `r^(2i)`、跨度为 `2*r^i`，总时间再归一化。每段使用抛物线，有限次数之后停住，不能当作无限弹簧。squash 额外把动作压进 `[0,.86]`；第 i 个接触脉冲宽度 `.018+.008*r^i`，强度递减。`sy=1-squash*impact`、`sx=1/sy` 使面积保持，球心按变形半径修正以维持接触底缘；`.86` 后短暂接触变形脉冲可能延续，最终 `.86..1` 的末段恢复静止原形。

**Slow zone。** `edge=(1-zone)/2`，外侧速度在 `1+power` 与 `1-power` 间 smoothstep 过渡，中段保持低速；先积分速度、再除以总面积，避免把慢动作误做成停顿。zone=.7,power=.7 的记录中快速度=1.7、慢速度=.3、中段 t=.15.. .85。**Log scale** 则在对数空间插值尺寸，归一化位移图仅用于解释，实际矩形确实改变几何尺度。**Wiggle** 的最终信号是 0，不能因通用到达样例而把目标改成 1。

### 物理机制 / Physical mechanisms

核心求解 `m*x″+c*x′+k*(x-1)=0`，初值 x(0)=0、x′(0)=initialVelocity。定义 `ω=√(k/m)`、`a=c/(2m)`、`delta=a²-ω²`：

- `delta<0`：衰减三角根；`x(s)=1+exp(-a*s)*[-cos(wd*s)+(v0-a)/wd*sin(wd*s)]`，`wd=√(-delta)`。
- `|delta|<1e-8`：重根响应；`x(s)=1+exp(-a*s)*[-1+(v0-a)*s]`。核心代码优先检查这一条件。
- 否则 delta 为正：`r1=-a+√delta,r2=-a-√delta`；`c1=(v0+r2)/(r1-r2),c2=-1-c1`；`x(s)=1+c1*exp(r1*s)+c2*exp(r2*s)`。

自然频率、质量与阻尼直接改变实际坐标，不用统一弹性 ease 替代。普通模式在教学终点仍显示有限时刻的解析响应，不人为钳到 1；足够长的窗口接近静止，但不能宣称数学上有限时刻完全收敛。reduced 则显示所请求的**精确最终目标**而不是有限时刻残差。

**临界值的事实与原创区别。** 来源记录 `s-critical` 是 `(300,34.64,1)`；其 `inspiration.easing` 保持原样，事实没有被修订。34.64 的平方除以 4 为 299.9824，delta=-.0176，所以它在实际核心中略欠阻尼而非重根。原创参数采用 `c=2√(k*m)` 的 binary64 表示 `34.64101615137755`，让同一 k=300,m=1 精确进入核心的临界阈值。不是把 source title 当作物理结论，也不把舍入显示当成精确参数。

**Split edges。** 前缘和后缘独立、同时接收目标，公共 mass=1 是原创假设，因为事实仅给两个 k/c 对。两个 oscillator 输出分别改变右、左边界；宽度变化是两条真实响应之差，不是整体 scale、串联 follower 或时间延迟替身。最终宽度恢复为 180px。

**Retarget superposition。** 令 S(s,v) 为核心阶跃响应。展示值为 `A*S(s,v0/A)+(B-A)*S(s-t1,0)+(F-B)*S(s-t2,0)`，延迟响应在非正时间为零。新增阶跃在事件时的位移和速度均为零，故逻辑目标可立即改为 B/F，而呈现状态保持连续；首项除以 A 是为了实际初速仍为 v0。记录的 t1=.72s、t2=1.62s；最后显示 F=.95，而非默认 1。真实系统事件数量与到来顺序属于状态控制器，固定三目标教学函数不自动承担生产交互。

**Inertia。** 无预设目标，`v(s)=v0*exp(-s/τ)`、`x(s)=v0*τ*(1-exp(-s/τ))`。记录 τ=.7s,v0=180px/s，停点预测=126px，普通 4.2s 终点仍有微小速度和位移残差；reduced 使用完整预测停点并置零速度。不能把它冒充弹簧或把 τ=700ms 解释成动画总长。

**Projectile。** 正 y 向下，`x=80+vx*s`、`y=230+vy0*s+g*s²/2`，初始竖速为负；飞行 T=-2vy0/g，最高点在 T/2，结束重回 y=230（球底接触 y=244 的地线）。记录 T=.9s、水平距离 135px，画廊 2200ms 仅放慢观察；落地后不再显示速度箭头。没有空气阻力、弹跳、碰撞检测或物理世界管理，不伪装成这些行为。

### 呈现生命周期与适配 / Ownership, interruption and reduced motion

这些研究是明确的 **SVG 呈现通道**：640×300 viewBox、创建一次的路径与节点、每帧只更新属性。位置、轮廓、宽度、尺度、目标边框和曲线都可检查；标签不是行为证明。`descriptor` 设置 `stage.dataset.recipe`；`seek(progress)` 拒绝非有限值或 `[0,1]` 外值；dispose 删除整个 SVG 和 owned 资源、清除匹配 dataset，重复 dispose 可接受，dispose 后 seek 抛错。研究没有自己的 RAF、事件监听器或隐藏循环；播放归画廊。

- **启动**：画廊选择、replay 或项目真实状态变更生成起始状态和参数。起点/终点、物理秒和教学时钟按本节定义。普通曲线在一次周期内完成；不要把循环时长元数据当生产循环要求。
- **冷跳转/逆向**：全部响应由进度、参数及固定 seed 解析，不能依赖先前帧。逆向拖拽是沿已有状态轨迹检查，并非负时间物理模拟或撤销逻辑事件。粗糙曲线只在创建时生成结点。
- **取消/替换**：结束画廊播放并 dispose 旧实例；本研究不自动捕获生产组件的当前位置/速度。生产弹簧若要连续重定向，控制器应保留当前位移/速度或合法叠加响应，而不能 reset 到样例起点。不要把解除资源和倒放混为一谈。
- **Reduced**：核心每次 seek 都以 t=1 渲染，信号图同时用各条 `finalValue` 代替有限时刻值。到达/越界/bounce 显示精确目标；wiggle 显示中心；log scale 显示终尺度；squash 显示落地原形；split 显示完整带宽；retarget 显示最终逻辑请求；comparison 两者到达；inertia 显示预测停点；projectile 显示落地且移除箭头。图和标签保留可读信息，无 travel/shake/flashing/repetition。若最终图形本身干扰阅读，生产应直接使用语义静态状态，而非保留研究图。
- **Web/UI 生产适配**：CSS/WAAPI 可用合法 Bézier、steps 或已有 primitive；需要 spring/retarget/inertia 的组件由现有应用控制器驱动。DOM/CSS transform 尽量用于呈现；split-edge 如果实装宽度影响布局需确认 reflow 与命中区，不能把 SVG 研究带当生产布局。模态 opening/closing、焦点、aria、禁用态、返回值立即由逻辑层改变，不等动效结束。
- **真实输入所有权**：指针捕获、释放速度采样、scroll progress、keyboard/focus、取消、范围边界与碰撞属于应用及其已有库。当前研究没有这些 listeners，也不验证它们。惯性要从真实释放速度取参数（当前示例 schema 仅正向），弹簧要保留当前状态；不得添加 schema 不支持的配置或用样例中的固定事件伪装生产输入。
- **Film/edit 适配**：将归一化时间或物理秒转换到项目已有 scene renderer 的时间轴/关键帧，并在目标帧率、视口、合成/剪辑上下文重验。SVG 抛射、尺度、压缩只是原创几何研究；不是 Blender/film 生产渲染或视觉验收。教程频率不能直接成为镜头切换频率。

### 静态审阅发现与验收边界 / Findings and evidence boundary

`physical-spring` 的诊断标签和核心 `oscillator` 现在均使用同一判据：`delta=(c/(2m))²-(sqrt(k/m))²`；`|delta|<1e-8` 为重根临界分支，否则负值为欠阻尼、正值为过阻尼。不能改用 `|ζ-1|<1e-8` 判断，因为 `delta=(k/m)*(ζ²-1)`，两者阈值不等价。参数标签与实际公式保持一致；`s-critical` 的 authored damping 为精确临界值，来源的舍入 `34.64` 仍原样保留作观察事实。

完整成员映射、参数表和枚举范围描述可供审查，但不是运行测试证据。采用时仍须按已有验收检查 exact-ID 集合、配置合法性、正常/reduced/reverse/cold seek、资源释放、双边形变和目标叠加连续性，以及实际画廊搜索与播放。此指南不声称 source-wide visual fidelity、浏览器运行通过或 owner Visual Acceptance。

## Basic structure：原则、时间与集合 / Principles, timing and collections

### 适用边界与事实来源

本节覆盖44个实测目录身份（principles 17、timing 15、collection 12），对应34个原创描述器。身份与英文短标题、URL、来源显示时长及缓动来自 inventory 元数据；描述、中文名、参数、教学时长与机制理由均为本项目原创。观察级别仅 catalogue-metadata，不代表来源逐项动画已验证，未复制代码、长描述或资产，来源再分发许可仍 unverified。

配置权威为现有 catalogue；公共入口是本指南与 [完整画廊](../../../tools/motion-recipes/full/index.html)。机制依据是 `basic.js` 的 `buildStructureRecipes` 及模块内部 helper。当前 DESIGN.md、MOTION.md、字体、颜色、间距、运动与无运动偏好始终高于示例值。

**发现方式 / Discovery：** 动作准备 anticipation、弧线 arc、接触 cause、配重 counter、尾部 follow-through、焦点 staging；拍点 beat、阅读预算 reading hold、重叠 overlap、采样 twos；网格 grid、列表 list、行高 reflow、确定性散位 seeded shuffle。下面的映射表保存每一个精确 source ID，不能依标题猜选描述器。

### 接口、单位与时间

每个ID加basic.前缀。所有schema字段都必填，不接受额外字段、未知枚举、非有限数值或超范围值；整数标记不允许小数。范围含两端。距离与尺寸是640×300教学SVG坐标中的像素，角度默认度（明确写rad的关节参数例外），Fraction是归一化进度而不是毫秒。

phase(t,start,duration)=clamp((t−start)/duration)。大多数轨道的实际播放秒数由每条记录的studyDurationMs决定，阶段毫秒=start或duration×studyDurationMs。beat-grid、reading-hold、frame-quantization另外定义内部秒/帧域：外部播放器不会自动采用内部预算，生产适配必须明确同一时钟。t=1是本文表列的静态结果。helper约定reducedMotion的每次seek都替换成t=1，不是把运动缩短后继续播放。

创建时构建SVG节点，seek以绝对t重新求姿态；图库拥有播放循环。这里没有实际pointer/scroll所有权，没有自行启用RAF、网络、随机源或生产输入监听。descriptor处理有限[0,1]的seek、包装节点和defs释放；dispose后不能继续seek。本文只说明源码支持的行为，不声称已运行集成。

### 每个实际描述器的完整参数、阶段与静态结果

#### basic.anticipatory-jump

- **参数 / schema：** travel 180–300 px; windupFraction .12–.30; windupDistance 12–45 px; lift 25–75 px。
- **阶段 / timing：** 0→windupFraction 反向准备；windupFraction→.80 释放，三次出缓冲推进、正弦拱高；.80→1 保持。
- **静态与减弱 / final + reduced：** 到达 x=150+travel、脚底214，纵横缩放1，阴影恢复；无需起跳也能读懂目的地。

#### basic.appeal-toggle

- **参数 / schema：** width 140–220 px; knobRadius 20–28 px; transitionFraction .15–.45。
- **阶段 / timing：** .08 起，持续transitionFraction；三次出缓冲同时更新位置、嘴形、瞳孔与标记。
- **静态与减弱 / final + reduced：** 开启端的旋钮、ON与勾号静态可见；逻辑开关由真实控件拥有，SVG没有输入语义。

#### basic.arc-trajectory

- **参数 / schema：** travel 220–360 px; lift 55–105 px; turnDegrees 15–65°。
- **阶段 / timing：** .05→.85 正弦慢入慢出；高度=lift·sin(πq)，切线角按turnDegrees/65缩放；后段保持。
- **静态与减弱 / final + reduced：** 到达同一基线上的弧线末端，保留最终切线方向；参考点可静态展示路径。

#### basic.causal-domino-chain

- **参数 / schema：** count 整数3–6; gap 30–44 px; fallDegrees 72–88°; fallFraction .12–.22。
- **阶段 / timing：** .02→.12 发起圆靠近；各片从 .12+i·delay 开始，持续fallFraction；delay=fallFraction·sqrt(contactAngle/fallDegrees)，contactAngle=asin((gap−10)/82)的角度。
- **静态与减弱 / final + reduced：** 所有片都已到终角，状态说明全链响应；静态倒伏是结果，不需要逐片重复播放。

#### basic.counterbalanced-motion

- **参数 / schema：** travel 90–180 px; counterRatio .25–.65; tiltDegrees 8–24°。
- **阶段 / timing：** .06→.80 主块三次出缓冲前进，配重反向走travel·counterRatio；倾角是正弦包络，连线每次求值。
- **静态与减弱 / final + reduced：** 主体x=205+travel，配重x=450−travel·counterRatio，倾角0；保留绳线与相对位置。

#### basic.exaggerated-reaction

- **参数 / schema：** amplitude 22–55 px; amplification 1.5–3; stretch .12–.30。
- **阶段 / timing：** .08→.78 同一 sin(πq)·exp(−1.6q)反应包络；右侧抬升放大、形变按增益比较；后段休止。
- **静态与减弱 / final + reduced：** 两者都在地面、圆形与角度恢复；静态终态表达共同结果，不能替代动态幅度对照。

#### basic.follow-through-chain

- **参数 / schema：** travel 140–260 px; lagFraction .04–.10; rebound 12–30 px。
- **阶段 / timing：** 第i节起点.05+i·lagFraction，主区间.46+.09i；续动从.51+i·lagFraction开始持续.28，尾节用三半波衰减。
- **静态与减弱 / final + reduced：** x=180+travel−42i，y=150+15i，连线保持，续动振幅0；静态关系可读。

#### basic.anti-twinning-variation

- **参数 / schema：** count 整数4–8; seed 整数1–65535; delaySpread .08–.24; tiltSpread 3–12°。
- **阶段 / timing：** 哈希h0,h1在创建时固定；每项起点.04+h0·delaySpread，活动区间.40+.12h1；倾角峰值由h1决定。
- **静态与减弱 / final + reduced：** 所有块在y150，倾角0、透明度1；保留编号布局，不在停留期继续抖动。

#### basic.primary-secondary-ambient

- **参数 / schema：** travel 110–230 px; secondaryLag .05–.18; ambientAmplitude 4–12 px。
- **阶段 / timing：** 主动作 .04→.52；次动作从.04+secondaryLag起持续.58；背景 sin(4πt)·sin(πt)全程包络。
- **静态与减弱 / final + reduced：** 主次块都到x=180+travel，背景偏移0；内容不依赖环境持续移动。

#### basic.keypose-forward-dynamics

- **参数 / schema：** travel 100–190 px; launchVelocity 150–230 px/s; gravity 360–520 px/s²; restitution .15–.40。
- **阶段 / timing：** .03→.91映射局部q；上轨键位q=0,.16,.42,.68,1分段三次插值；下轨创建时预算1.6秒、1/120秒步长，.12秒后重力和触地恢复；q .78→1平滑收敛到同一站姿。
- **静态与减弱 / final + reduced：** 两套关节人物站到x=200+travel，手臂1.05弧度、腿.22弧度、倾角0；固定样本支持逆序查看，不要求运行时物理继续积分。

#### basic.secondary-gesture

- **参数 / schema：** travel 120–250 px; gestureStart .20–.40; gestureAmplitude .55–1.15 rad。
- **阶段 / timing：** 主体 .04→.70；右臂从gestureStart起用.40区间正弦挥臂，其他关节保留行走层；徽点跟随手端。
- **静态与减弱 / final + reduced：** 人物站到x=170+travel，手势归零、腿静止；徽点以.30透明度保留，未把次要动作设成目的地条件。

#### basic.slow-spacing-comparison

- **参数 / schema：** travel 240–380 px; samples 整数7–13; activeFraction .55–.85。
- **阶段 / timing：** .04起持续activeFraction；两条轨道同一q，一条线性、一条三次慢入慢出；背景标记在创建时按等时采样。
- **静态与减弱 / final + reduced：** 两圆同达右端；线性与端部密集采样点仍可供静态比较，不需抖动强调。

#### basic.projected-solid

- **参数 / schema：** size 52–86 px; turnDegrees 45–120°; perspective 360–600 px。
- **阶段 / timing：** .05→.85 把角度从−25°转至turnDegrees−25°，固定俯仰−.28 rad；八顶点透视投影，六面按平均深度排序。
- **静态与减弱 / final + reduced：** 静态转后立方体及阴影可读；体积来自共享顶点和投影，不是CSS二维缩放。

#### basic.contact-squash

- **参数 / schema：** dropHeight 75–135 px; compression .18–.38; reboundHeight 20–50 px。
- **阶段 / timing：** 0→.36 二次下落并拉伸；.36→.47 地面接触压缩；.47→.80 抛物线回弹；.80→.94 次级压缩，之后静止。
- **静态与减弱 / final + reduced：** 地面y224上恢复圆形，阴影恢复；sy与1/sy互补，接触底部固定。

#### basic.staged-focus-hierarchy

- **参数 / schema：** focusScale 1.15–1.45; dimOpacity .16–.38; separation 16–38 px。
- **阶段 / timing：** .05→.50 三次出缓冲增大第5张卡与框，其他卡向外/上让位并减透明度。
- **静态与减弱 / final + reduced：** 选中卡和边框固定放大，副卡仍以dimOpacity存在；生产文本必须重新检查对比，不能把样例低透明度直接当合规文本。

#### basic.timing-mass-contact

- **参数 / schema：** dropHeight 85–130 px; heavyDuration .38–.55; durationRatio 1.4–2.1; heavyCompression .08–.20。
- **阶段 / timing：** .04起落下；重块持续heavyDuration、轻圆持续heavyDuration/durationRatio；各自触地后.25区间承托形变，轻圆反弹、重块不反弹。
- **静态与减弱 / final + reduced：** 轻圆和重块均接地、缩放与承托垫复原；重量由间隔、几何和接触后响应联合表达。

#### basic.ambient-breathing-hold

- **参数 / schema：** arrivalFraction .15–.35; amplitude 3–10 px; cycles 整数1–3。
- **阶段 / timing：** 0→arrivalFraction 主体到位；余段hold从0→1，环境用 sin(2π·cycles·hold)·sin(π·hold)呼吸，包络归零。
- **静态与减弱 / final + reduced：** 主体y148保持、椭圆恢复原尺寸；无运动也有完整内容与环境层级。

#### basic.beat-grid

- **参数 / schema：** beats 整数3–8; bpm 60–180; decaySeconds .12–.30 s。
- **阶段 / timing：** 内部秒= t·beats·60/bpm；第i拍在 i·60/bpm秒触发，响应在decaySeconds内exp(−7·elapsed/decaySeconds)，之后0。
- **静态与减弱 / final + reduced：** 所有拍点变为已触发绿色、半径16，外环透明；终态是拍点账本而非无限脉冲。

#### basic.distance-duration

- **参数 / schema：** shortDistance 70–130 px; longDistance 220–350 px; baseFraction .16–.28; distanceFraction .001–.0014 /px。
- **阶段 / timing：** 从.03开始；短、中均值、长距离分别用duration=baseFraction+distance·distanceFraction；三次慢入慢出。
- **静态与减弱 / final + reduced：** 三圆到各自目标；公式是原创线性距离教学适配，不是来源标题副文本提及的平方根算法。

#### basic.size-duration

- **参数 / schema：** smallSize 20–32 px; largeSize 54–72 px; baseFraction .14–.24; sizeFraction .003–.006 /px。
- **阶段 / timing：** .03起；小、中均值、大块持续baseFraction+size·sizeFraction，三次出缓冲；61像素垂直行程一致。
- **静态与减弱 / final + reduced：** 三块不同尺寸但都y125、透明度1；不同呈现预算不改变业务已完成状态。

#### basic.energy-arc

- **参数 / schema：** buildFraction .20–.40; burstFraction .10–.18; peakLift 55–100 px; settleCycles 整数1–3。
- **阶段 / timing：** 0→buildFraction 积蓄；接下来burstFraction释放到高点；剩余1−buildFraction−burstFraction衰减回落，含settleCycles次包络波形。
- **静态与减弱 / final + reduced：** 主体y174、角度0、缩放1，能量条仅1像素底线；回落结束无重复强调。

#### basic.enter-exit-asymmetry

- **参数 / schema：** enterFraction .22–.35; exitRatio .45–.70; holdFraction .18–.28; travel 60–120 px。
- **阶段 / timing：** .04起入口持续enterFraction（三次出）；保持holdFraction；退出持续enterFraction·exitRatio（三次入）；余段静态。
- **静态与减弱 / final + reduced：** 提示隐藏，DISMISSED关闭结果可见；无运动情形不能只留空白舞台。

#### basic.overlap-comparison

- **参数 / schema：** count 整数3–5; itemFraction .12–.18; travel 100–180 px。
- **阶段 / timing：** 第i项从 .02+i·itemFraction·level开始，持续itemFraction；三轨固定level=1,.5,0，表示串行、半重叠、同时；这些不是外部枚举参数。
- **静态与减弱 / final + reduced：** 所有方块到各自右移目标、透明度1，三轨标签保留；不可把三个固定对照偷换成可配置分支。

#### basic.speed-ramp-hit

- **参数 / schema：** approachFraction .50–.70; power 2.5–5; travel 240–360 px; recoil 8–24 px。
- **阶段 / timing：** .03起接近持续approachFraction，位置进度q^power；其后.22接触区间后坐，短.12形变，速度尾迹接触后归零。
- **静态与减弱 / final + reduced：** 圆右缘与障碍左缘相接，障碍原位、尾迹不可见；无持续震动。

#### basic.reading-hold

- **参数 / schema：** enterSeconds .30–.80 s; charactersPerSecond 5–12 code points/s; minimumHoldSeconds .80–2 s。
- **阶段 / timing：** 创建时固定text；count=Array.from(text).length（Unicode码点，不是字素）；hold=max(minimumHoldSeconds,count/charactersPerSecond)，内部秒=t·(enterSeconds+hold)。
- **静态与减弱 / final + reduced：** 卡片y145、透明度1、停留条完整，实际文本一直存在；内部预算须与生产时钟或studyDurationMs明确协调。

#### basic.snap-then-hold

- **参数 / schema：** snapFraction .025–.12; travel 110–260 px; holdMarkerSize 18–32 px。
- **阶段 / timing：** 0→snapFraction 指数到位，q=1时显式落在终点；余段主体不动，五个记录标记按停留区间逐个亮起。
- **静态与减弱 / final + reduced：** 主体x320、y150、五标记完成；短入口不是持续闪烁。

#### basic.ranked-stagger

- **参数 / schema：** order = sequential | center | edges | grid-diagonal; count 整数5–15; gap 32–38 px; staggerFraction .014–.030; itemFraction .16–.28; travel 24–64 px。
- **阶段 / timing：** 排名顺序分别i、abs(i−中心)、中心−abs(i−中心)、(i%5)+floor(i/5)；各项从.04+rank·staggerFraction起，持续itemFraction。grid-diagonal才用5列网格，其余横排。
- **静态与减弱 / final + reduced：** 原编号完整呈现、透明度1、位移0；成对中心/边缘排名可同时触发，非随机排序。

#### basic.seeded-stagger

- **参数 / schema：** seed 整数1–65535; count 整数5–12; gap 34–42 px; staggerFraction .014–.035; itemFraction .16–.28; travel 24–64 px。
- **阶段 / timing：** 创建时按hash(seed,i)排序，哈希相同时按原i破平；把排序转成每个身份的rank，从.04+rank·staggerFraction起持续itemFraction。
- **静态与减弱 / final + reduced：** 编号维持原横排位置；随机只影响入场顺序，逆序seek不重新抽签。

#### basic.frame-quantization

- **参数 / schema：** fps 整数12–30; durationSeconds 1–2 s; travel 230–360 px; lift 25–55 px。
- **阶段 / timing：** frames=floor(fps·durationSeconds)；固定三轨step=1,2,3，q=floor(t·frames/step)·step/frames，t=1显式q=1；同一正弦弧高和角度轨迹。
- **静态与减弱 / final + reduced：** 三轨都精确到右端与基线、角度0；1/2/3是同时展示的固定采样对照，不是schema枚举。

#### basic.ordered-grid-reveal

- **参数 / schema：** order = center | diagonal | row-sweep | spiral | wave; rows 整数3–5; columns 整数3–7; gap 40–48 px; staggerFraction .006–.013; itemFraction .18–.28; travel 24–52 px。
- **阶段 / timing：** center: rank=中心欧氏距离，起点.04+3rank·staggerFraction、back缩放和径向位移；diagonal: rank=row+col，起点.04+2rank·staggerFraction、quartOut垂直位移和缩放；row-sweep: rank=row，起点.04+5rank·staggerFraction、cubic横移；spiral:真实螺旋rank，起点.04+rank·staggerFraction、back缩放与90°残余旋转；wave:rank=col，起点.04+3rank·staggerFraction、正弦抬升与缩放；均持续itemFraction。
- **静态与减弱 / final + reduced：** 完整编号矩阵，目标格位置固定，角度0、缩放1、透明度1；不同分支不是只换文字。

#### basic.seeded-grid-shuffle

- **参数 / schema：** rows 整数3–5; columns 整数3–7; seed 整数1–65535; scatter 55–100 px; rotation 25–70°; itemFraction .45–.68。
- **阶段 / timing：** 创建时用seed、seed+71、seed+139哈希生成起点x/y/角度；起点限制在x36–604、y36–248；目标格距固定43 px；从.04+(i%3)·.03起，持续itemFraction，inOutBack归位。
- **静态与减弱 / final + reduced：** 每个编号都回到其原指定格，角度0、透明度1；中段可能有教学性的回弹越界，不视为生产布局测量。

#### basic.ordered-list-reveal

- **参数 / schema：** treatment = stagger | cascade | alternate | stack; count 整数4–6; rowWidth 210–320 px; gap 32–38 px; staggerFraction .035–.065; itemFraction .25–.38; travel 30–65 px。
- **阶段 / timing：** 行i起点.03+i·staggerFraction，持续itemFraction；stagger垂直out归位；cascade垂直quartOut并带行号相关正弦倾角；alternate奇偶反向横移；stack从205−5i高度及同侧横移展开。
- **静态与减弱 / final + reduced：** 原行号和文本保持顺序，y=145+(i−中心)·gap，角度0、透明度1；没有重排业务ID。

#### basic.row-height-expansion

- **参数 / schema：** count 整数4–6; collapsedHeight 18–26 px; expandedHeight 31–34 px; gap 5–8 px; staggerFraction .035–.065; itemFraction .28–.40。
- **阶段 / timing：** 从.03+i·staggerFraction起持续itemFraction；每行用back插值真实矩形height，每次按所有高度和gap求总高并累加top；文字只移动、不缩放。
- **静态与减弱 / final + reduced：** 每行是真实expandedHeight，整个组围绕y135居中，文字清晰；back中段可超出最终行高，生产需确认溢出策略。

#### basic.trim-collapse-reflow

- **参数 / schema：** count 整数5–7; trimCount 整数1–2（两端各裁这么多行）; rowHeight 23–27 px; gap 6–9 px; trimFraction .28–.42; collapseFraction .22–.36。
- **阶段 / timing：** .03起先用quartOut在trimFraction内把两端行宽和透明度裁零；之后用out在collapseFraction内移动幸存行，行高不变。
- **静态与减弱 / final + reduced：** count−2·trimCount个原ID可见并居中，裁掉行完全透明、宽0；教学SVG保留节点不等于生产DOM逻辑删除。

### 44条精确映射与作者教学参数

本表为身份/分支覆盖交接，不是执行证据。每条参数均显式写入记录；教学时长是原作者编排，不复制来源动作/循环时长。web/ui/film/edit仅为已有工作流用途，不能新增成game等CLI类型。

| Source ID（类别） | 实际描述器 | 显式参数 | 教学毫秒 |
|---|---|---|---|
| ambient-hold (principles) | basic.ambient-breathing-hold | `{"arrivalFraction":0.24,"amplitude":6,"cycles":2}` | 3200 |
| anticipation (principles) | basic.anticipatory-jump | `{"travel":230,"windupFraction":0.2,"windupDistance":28,"lift":55}` | 1800 |
| appeal (principles) | basic.appeal-toggle | `{"width":180,"knobRadius":25,"transitionFraction":0.3}` | 1200 |
| arcs (principles) | basic.arc-trajectory | `{"travel":300,"lift":85,"turnDegrees":52}` | 1800 |
| cause (principles) | basic.causal-domino-chain | `{"count":5,"gap":36,"fallDegrees":82,"fallFraction":0.18}` | 2400 |
| counter (principles) | basic.counterbalanced-motion | `{"travel":140,"counterRatio":0.45,"tiltDegrees":17}` | 1800 |
| exaggeration (principles) | basic.exaggerated-reaction | `{"amplitude":34,"amplification":2.2,"stretch":0.22}` | 1800 |
| follow (principles) | basic.follow-through-chain | `{"travel":200,"lagFraction":0.07,"rebound":23}` | 2100 |
| grid-center (collection) | basic.ordered-grid-reveal | `{"order":"center","rows":4,"columns":5,"gap":45,"staggerFraction":0.01,"itemFraction":0.24,"travel":38}` | 2300 |
| grid-diagonal (collection) | basic.ordered-grid-reveal | `{"order":"diagonal","rows":4,"columns":5,"gap":45,"staggerFraction":0.01,"itemFraction":0.24,"travel":38}` | 2300 |
| grid-row-sweep (collection) | basic.ordered-grid-reveal | `{"order":"row-sweep","rows":4,"columns":5,"gap":45,"staggerFraction":0.01,"itemFraction":0.24,"travel":38}` | 2300 |
| grid-shuffle (collection) | basic.seeded-grid-shuffle | `{"rows":4,"columns":5,"seed":1879,"scatter":78,"rotation":48,"itemFraction":0.58}` | 2600 |
| grid-spiral (collection) | basic.ordered-grid-reveal | `{"order":"spiral","rows":4,"columns":5,"gap":45,"staggerFraction":0.01,"itemFraction":0.24,"travel":38}` | 2300 |
| grid-wave (collection) | basic.ordered-grid-reveal | `{"order":"wave","rows":4,"columns":5,"gap":45,"staggerFraction":0.01,"itemFraction":0.24,"travel":38}` | 2300 |
| jitter (principles) | basic.anti-twinning-variation | `{"count":6,"seed":271,"delaySpread":0.18,"tiltSpread":8}` | 1900 |
| layers3 (principles) | basic.primary-secondary-ambient | `{"travel":170,"secondaryLag":0.12,"ambientAmplitude":7}` | 2400 |
| list-alternate (collection) | basic.ordered-list-reveal | `{"treatment":"alternate","count":5,"rowWidth":270,"gap":35,"staggerFraction":0.05,"itemFraction":0.32,"travel":48}` | 2200 |
| list-cascade (collection) | basic.ordered-list-reveal | `{"treatment":"cascade","count":5,"rowWidth":270,"gap":35,"staggerFraction":0.05,"itemFraction":0.32,"travel":48}` | 2200 |
| list-expand (collection) | basic.row-height-expansion | `{"count":5,"collapsedHeight":22,"expandedHeight":33,"gap":6,"staggerFraction":0.05,"itemFraction":0.34}` | 2200 |
| list-slide-stack (collection) | basic.ordered-list-reveal | `{"treatment":"stack","count":5,"rowWidth":270,"gap":35,"staggerFraction":0.05,"itemFraction":0.32,"travel":48}` | 2200 |
| list-stagger (collection) | basic.ordered-list-reveal | `{"treatment":"stagger","count":5,"rowWidth":270,"gap":35,"staggerFraction":0.05,"itemFraction":0.32,"travel":48}` | 2200 |
| list-trim-collapse (collection) | basic.trim-collapse-reflow | `{"count":7,"trimCount":2,"rowHeight":25,"gap":7,"trimFraction":0.35,"collapseFraction":0.29}` | 2500 |
| pose (principles) | basic.keypose-forward-dynamics | `{"travel":155,"launchVelocity":190,"gravity":440,"restitution":0.28}` | 2500 |
| secondary (principles) | basic.secondary-gesture | `{"travel":190,"gestureStart":0.3,"gestureAmplitude":0.85}` | 2100 |
| slowinout (principles) | basic.slow-spacing-comparison | `{"travel":310,"samples":11,"activeFraction":0.72}` | 1800 |
| solid (principles) | basic.projected-solid | `{"size":72,"turnDegrees":90,"perspective":460}` | 2200 |
| squash (principles) | basic.contact-squash | `{"dropHeight":105,"compression":0.3,"reboundHeight":35}` | 1600 |
| staging (principles) | basic.staged-focus-hierarchy | `{"focusScale":1.3,"dimOpacity":0.27,"separation":26}` | 1500 |
| t-beat (timing) | basic.beat-grid | `{"beats":4,"bpm":120,"decaySeconds":0.2}` | 2000 |
| t-distance (timing) | basic.distance-duration | `{"shortDistance":95,"longDistance":290,"baseFraction":0.21,"distanceFraction":0.0012}` | 2300 |
| t-energy (timing) | basic.energy-arc | `{"buildFraction":0.3,"burstFraction":0.14,"peakLift":78,"settleCycles":2}` | 3000 |
| t-exit (timing) | basic.enter-exit-asymmetry | `{"enterFraction":0.3,"exitRatio":0.55,"holdFraction":0.23,"travel":85}` | 2100 |
| t-overlap (timing) | basic.overlap-comparison | `{"count":4,"itemFraction":0.16,"travel":120}` | 2200 |
| t-ramp (timing) | basic.speed-ramp-hit | `{"approachFraction":0.61,"power":3.4,"travel":310,"recoil":17}` | 2100 |
| t-read (timing) | basic.reading-hold | `{"enterSeconds":0.5,"charactersPerSecond":8,"minimumHoldSeconds":1.5}` | 3500 |
| t-size (timing) | basic.size-duration | `{"smallSize":26,"largeSize":66,"baseFraction":0.19,"sizeFraction":0.0045}` | 2000 |
| t-snaphold (timing) | basic.snap-then-hold | `{"snapFraction":0.065,"travel":185,"holdMarkerSize":24}` | 2000 |
| t-stagger-center (timing) | basic.ranked-stagger | `{"order":"center","count":9,"gap":36,"staggerFraction":0.025,"itemFraction":0.23,"travel":45}` | 2400 |
| t-stagger-edges (timing) | basic.ranked-stagger | `{"order":"edges","count":9,"gap":36,"staggerFraction":0.025,"itemFraction":0.23,"travel":45}` | 2400 |
| t-stagger-grid (timing) | basic.ranked-stagger | `{"order":"grid-diagonal","count":15,"gap":36,"staggerFraction":0.025,"itemFraction":0.23,"travel":45}` | 2400 |
| t-stagger-random (timing) | basic.seeded-stagger | `{"seed":941,"count":10,"gap":38,"staggerFraction":0.025,"itemFraction":0.22,"travel":42}` | 2400 |
| t-stagger-seq (timing) | basic.ranked-stagger | `{"order":"sequential","count":9,"gap":36,"staggerFraction":0.025,"itemFraction":0.23,"travel":45}` | 2400 |
| t-twos (timing) | basic.frame-quantization | `{"fps":24,"durationSeconds":1.5,"travel":300,"lift":42}` | 1500 |
| timing-weight (principles) | basic.timing-mass-contact | `{"dropHeight":112,"heavyDuration":0.46,"durationRatio":1.75,"heavyCompression":0.14}` | 1900 |

### 实际枚举覆盖 / Real enum coverage

这里只存在三个外露枚举，共13个值；其他对照轨道是固定展示，不可伪造可选参数。

- ranked-stagger.order：sequential→t-stagger-seq；center→t-stagger-center；edges→t-stagger-edges；grid-diagonal→t-stagger-grid。
- ordered-grid-reveal.order：center→grid-center；diagonal→grid-diagonal；row-sweep→grid-row-sweep；spiral→grid-spiral；wave→grid-wave。
- ordered-list-reveal.treatment：stagger→list-stagger；cascade→list-cascade；alternate→list-alternate；stack→list-slide-stack。

### 固定种子、冷启动与倒序 / Seeded, cold and reverse inspection

anti-twinning-variation使用参数seed与seed+37固定延迟和倾角；seeded-stagger把hash(seed,原身份index)排序并以原index破平；seeded-grid-shuffle以seed、seed+71、seed+139固定散位及角度。hash是原片段的32位整数混合（Math.imul和无符号移位），不是每帧调用Math.random。显式seed是这些描述器的权威；options.seed在本结构片段中未参与这三种机制，不能宣称改全局seed就改变它们。更改参数必须重新创建，不在同次seek随机改动。

spiral从floor((rows−1)/2)、floor((columns−1)/2)出发，按右/下/左/上、两段后增长步长遍历，越界格跳过；偶数网格选定这个明确起点，不模糊称完美中心。键姿态/动力对照在创建时预算固定步长样本，逆向seek读取样本而非反向物理积分。其余所有轨迹也由t直接求值，所以可以从任意进度冷查、从1倒查到0；这属于检查能力，不自动代表生产取消逻辑。

### 触发、连续输入、反向与取消适配

**UI/web一次状态变化：** 真实控件或现有状态机拥有选中值、开闭、焦点、业务ID与ARIA。先提交逻辑状态，再让视觉层使用项目允许的时长；不可等示例拍点/位移结束才提交值。appeal-toggle没有原生开关事件，staged-focus没有焦点管理，collection没有业务数据增删。DOM实现优先使用现有布局/动画原语；arc、立体投影和关节细节可明确用SVG或Canvas；行高是真实几何重排，不能替换为scaleY并拉坏文字。

**连续输入：** 指针、拖拽或滚动的范围、capture、阈值、velocity与订阅由既有交互层管理；适配层把输入映射到有限[0,1]进度并合并更新，不把这个SVG视为生产监听器。需要实时响应时不强制走完整anticipation、逐拍或阅读等待。可读取静态路径、排名与末态作为呈现依据；更改文字或seed要由状态更新重新创建并释放旧视图。

**反向与连续换向：** 检查可以直接seek(1−t)。真实UI若目标改变，应从当前显示值向新的逻辑目标续接，避免突然复位到t=0；方向性入/退出的时间预算另选，尤其enter-exit-asymmetry不是机械倒放同一段。物理对照的恢复系数不是现有生产弹簧velocity接口，不能声称倒查就得到真实逆向动力。

**取消与释放：** 取消意图交给逻辑层，立刻完成或恢复正确可读状态。视觉上可以静态呈现新目标、或按项目预算从当前姿态收敛；不得让被取消提示重新出现或恢复已删除行。trim-collapse只隐藏教学节点，生产必须同时解决数据删除、焦点转移与可访问性。切换图库、页面销毁或参数重建时dispose，停止外部循环并移除适配层自加监听/订阅/capture；本片段自身没有这些生产资源。

### 频率、静止阅读与目标渲染器

仅在真实状态变化、结构教学或剪辑拍点上触发；不在每次鼠标移动重复入场，不用ambient或jitter维持永久装饰循环。reading-hold的count是Unicode码点；组合字符、emoji和CJK混排的实际阅读预算要结合语义字素/词组和人工阅读审查，不能以这里的码点数宣称无障碍阅读时长。实例默认文本长度会改变内部hold；表中3.5秒是教学播放时长，不随options.text自动变。

减弱运动展示上表静态最终状态，保留必要标签、编号、选中勾号、关闭结果、幸存身份和可读文字。终态对exaggeration、overlap、twos等对照不展示运动差异，可以添加静态采样轨迹或文字解释，但不能重新引入摇晃、闪光、重复脉冲。装饰运动在无需要时完全省略。

**film/edit：** 把归一化阶段换成镜头秒/帧域，用现有合成时间轴及渲染通道替换SVG形状；拍点可对齐音频/剪辑标记但不自动输出音频。真实投影、关节或物理效果需目标渲染器适配；帧采样对照不改变工程输出帧率。本文不证明成片渲染或源动画视觉忠实度。

## SVG paths, geometry and compositing / SVG 路径、几何与合成

Choose the rendering channel that actually owns the change: contour anchors for organic shapes, distance along a curve for travel, corresponding control points for morphing, normalized stroke intervals for drawing, SVG alpha masks for reveals, or filtered alpha for liquid merging. These are not interchangeable opacity/translation treatments. The authoritative schemas and phase functions are in `basic.js` → `buildPathsRecipes`; all values below are explicit, required and validated. Numeric ranges are inclusive; `integer` excludes fractional counts.

| Recipe (`basic.` prefix) / 配方 | Supported authored parameters / 支持参数 | Trigger, phases and static result / 触发、阶段与静态结果 |
|---|---|---|
| `noise-blob` / 噪声轮廓 | `radius`:50–92; `amplitude`:2–22; `points`:integer8–24; `cycles`:integer1–3 | Optional decorative activation → seeded periodic radial value noise changes anchors and cubic handles, while center stays fixed → held original contour. Reduced motion holds one meaningful silhouette. |
| `radial-burst` / 放射确认 | `rays`:integer6–24; `innerRadius`:12–28; `reach`:40–102; `strokeWidth`:1–6 | One acknowledged event → ray heads extend through70%, tails start18% and finish88% → full static acknowledgement mark. Do not replay on every focus move. |
| `marching-dashes` / 虚线选区 | `dashLength`:10–80; `gapLength`:6–45; `cycles`:integer1–4; `strokeWidth`:2–7 | Selection already exists → bounded dash-offset traversal around fixed boundary → same selection with stationary border. Native selection is authoritative; dashes do not grant selection. |
| `radial-repeater` / 径向复制 | `count`:integer6–18; `radius`:55–98; `twistDegrees`:-90–90; `stagger`:0–.45; `bladeLength`:14–38 | Diagram reveal → per-copy delayed radial deployment and local turn → complete readable radial arrangement. Frequency limited to actual diagram changes. |
| `gooey-merge` / 液滴合并 | `dropletRadius`:18–44; `separation`:90–180; `blurRadius`:3–12; `alphaThreshold`:.3–.65 | Two conceptual parts become one → approach with Gaussian blur and alpha threshold creating an actual neck → merged silhouette by82%, then hold. CSS/filter paint and exporter support require host inspection. |
| `gradient-flow` / 渐变流动 | `periodWidth`:65–210; `angleDegrees`:-40–40; `cycles`:integer1–4 | Optional material study → repeating gradient coordinates travel inside a fixed contour → stationary material and unchanged geometry. No private animation loop; omit in frequent UI. |
| `mask-reveal` / 蒙版揭示 | `originX`:100–540; `originY`:50–210; `edgeSoftness`:0–.3; `drawFraction`:.5–.95 | Ready content exists → true radial alpha-mask coverage expands → full content by `drawFraction`, then hold. Final radius accounts for farthest content corner and soft edge. Reduced motion exposes all content. |
| `cubic-path-follow` / 曲线跟随 | `bend`:-95–95; `markerSize`:8–22 | Authored route starts → marker follows approximately equal arc-length increments with tangent orientation → target arrival. Sampling is fixed at mount; production pointer position is not inferred from this teaching clock. |
| `control-point-morph` / 控制点形变 | `startRadius`:55–95; `outerRadius`:75–100; `innerRadius`:25–60; `roundness`:.1–1; `morphFraction`:.5–.95 | Circle-like contour → compatible eight-segment anchor and handle interpolation → four-point contour by `morphFraction`, then hold. Host shapes need matched topology/winding; unrelated paths cannot be assigned by name. |
| `signature-strokes` / 多笔装饰书写 | `strokeWidth`:2–7; `slantDegrees`:-12–12; `penLiftFraction`:.02–.12; `finishHold`:.05–.25 | Original ornamental mark introduction → three length-weighted strokes with separate pen-lift holds → completed mark held for `finishHold`. The mark is not a person's signature, identity or authorization action. |
| `contour-stroke-draw` / 单轮廓绘制 | `width`:150–350; `height`:100–180; `strokeWidth`:2–7; `drawFraction`:.5–.95 | Diagram border introduction → one continuous normalized stroke reveal → full contour by `drawFraction`, then hold. Meaning is carried by persistent contour, not simulated loading. |
| `path-segment-trim` / 路径区段裁切 | `segmentFraction`:.08–.4; `curveDepth`:45–115; `strokeWidth`:3–8 | Authored route interval → moving visible window with explicit start/end markers → final selected interval at route end. This is not the full-stroke drawing branch. Logical interval must stay distinct from presentation. |

### Host adaptation / 宿主接入

The studies use original SVG paths, gradients, masks, dash intervals and filters with per-mount IDs. Paths, lookup samples and nodes mount once; cold and reverse seeks reconstruct geometry from progress rather than accumulating offsets. Disposal releases the containing SVG and any owned definitions. Seeded noise does not depend on frame order. Clipping/masking controls visibility, not focus, accessibility availability, input hit-testing or committed state; production hosts own those separately.

For web/UI, connect a committed state change to the existing semantic primitive or named SVG/CSS channel. Keep the native control and its keyboard semantics; no decorative cue substitutes for an accessible label. For film/edit, convert normalized phases to the host clock and confirm SVG filter/mask support in the renderer; sampled curve lengths are an approximation, not exact physical arc-length integration. Current `DESIGN.md`, `MOTION.md` and tokens replace sample colors, geometry and budgets. No-motion is appropriate when decoration competes with reading, appears repeatedly, lacks a user question, or cannot survive the renderer. All reduced states are stationary final content/geometry, without shaking, travel or repeating emphasis.

## Provenance, license and evidence / 来源、许可与证据

[Motion Reference](https://motion-reference.takayustudio.jp/) supplies factual catalogue identity, source-displayed duration/easing, and metadata concept observations. Each exact item is linked through its catalogue record's `inspiration.url` and `#motion=<source-id>` in the local gallery. The source inventory was enumerated on2026-10-14; metadata enumeration does **not** mean every external animation was visually reviewed.

本组的文字、支持参数、方程接入、图形和渲染代码均为项目原创。未复制来源示例代码、长描述、字体、图像或其他资产；来源站点的再分发许可仍未确认。项目对原创交付物的许可，不是对外部站点内容的授权。

The `inspiration` fields retain factual source parameters separately from `motionRecipe.parameters` and original `studyDurationMs`. The authored parameter mapping explains conceptual coverage; it does not promise pixel matching, measured source timing, or production interaction semantics. Classic scripts work offline without fetch/eval or upstream dependencies. Existing four scenario recipes remain independent and unchanged.

### Adaptation checklist within existing work / 在已有流程内接入

1. Find the product question in either language, then inspect the exact source variant and actual mechanism. / 先按场景查找，再确认真实机制。
2. Keep the business state, focus, pointer/scroll ownership and current project tokens authoritative; omit animation if no useful feedback remains. / 业务逻辑与当前规范优先；没有用途就不动。
3. Substitute existing semantic primitives or the explicit SVG/CSS/Canvas channel in the host renderer. Define trigger, start/end, interruption, cancellation and cleanup there. / 接上宿主已有能力，明确起止、打断与释放。
4. Inspect the existing workflow's real playback, cold/backward seek where applicable, repeated input, reduced/static state, and resource cleanup. Record observed evidence in existing `qa.md`; no new gate. / 用已有验收观察真实播放、反向、连续输入、缩减动效和释放。
5. Record chosen source, adaptation limits and motion decisions in existing `reference.md`/`motion.md`. Visual Acceptance remains the owner's decision. / 记录来源与边界，创意认可仍由用户决定。

Concrete portability risks: SVG filters may be paint-sensitive; `foreignObject` CSS3D can differ across film exporters and browser engines; path morphs require compatible topology; mathematical springs need physical position/velocity ownership on production retarget; attention cues must not loop in high-frequency UI. Do not hide these differences by exporting a sampled curve and calling it the complete interaction.

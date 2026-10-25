# Motion Reference：仔细研究后的项目内化判断

日期：2026-10-14。读者：design-pipeline 的配方实现与集成人员。范围：先研究网站全貌、实际画面、实现边界，再判断如何复用当前项目。本文不是行为变更、执行任务清单或视觉验收记录。

## 结论

**应内化“产品意图 → 运动机制 → 分段状态 → 可调整参数 → 适用与禁用条件”，而不是复制 782 个名称，或只补四个游戏 UI 示例。** 网站完整目录与实际回放可以作为选型、拆解和比较的研究来源；产品的权威状态、交互语义、性能与可访问性仍由项目实现负责。

现有项目已有动效原则、机会筛选、预算、打断／减弱动效检查和四个原创配方。应继续现有 `expand-motion-recipes-to-full-reference`，不建立第二个动效工作流、catalog、gate、receipt 或 runtime。该变更当前只定义了完整扩展的接口与范围，不能称为完整库已经实现。

项目证据见 [当前树接入地图](motion-reference-project-map-2026-10-14.md)，特别是 §1、§4–§6；约束见 `openspec/changes/expand-motion-recipes-to-full-reference/design.md:5-75`。

## 1. 网站到底包含什么

主来源：[网站](https://motion-reference.takayustudio.jp/)。浏览器执行全部脚本后的 `window.MOTION_LIBRARY` 有 **782 条记录，782 个唯一 ID，64 个单一归属分类**；不是只依据首页宣传数字。新文字引擎 `TEXT_MOTION_ITEMS` 有 **228 个唯一 ID**；最终 `tx-*` 分类合计 **248 条**，其中 **20 条是保留的旧版文字条目**。十二篇文字方法 guide 不计入 motion 数。

以下使用项目已有的五组分区，不另创执行分类。分区定义与计数在现有扩展设计 `design.md:11-17`；独立浏览器核对的原始分类计数保存在 ignored `.design-pipeline/motion-reference-study/inventory.json`。

| 现有分组 | 条目数 | 分类数 | 实际覆盖 | 内化重点 |
| --- | ---: | ---: | --- | --- |
| basic | 164 | 12 | 原则、曲线、弹簧、时序、出入场、位移、缩放、旋转、反弹、列表、强调、SVG 路径 | 同一位移的节奏、间距、质量感与路径机制，不能统统替换成 ease-out |
| web | 157 | 12 | 滚动、指针反馈、布局、加载、表单、手势、按钮、控件、导航、进度、通知、数据叙事 | 用户输入／状态转换与呈现的关系，不只是自动播放效果 |
| game | 107 | 8 | HUD、战斗、奖励、成长、警告、空间 UI、材质变形、瞬间 FX | 信息即时性与装饰延迟分离；命中、奖励、警告的层级和克制 |
| text | 248 | 22 | 出入场、强调、替换、打字／解码、物理、路径、遮罩、光色、模糊、故障、深度、可变字体、滚动、指针、数字、字幕、换行、循环、日文、标题、播出字幕 | 字／词／行的分段单位、排版与阅读节奏；不是逐字淡入的单一模板 |
| scene | 106 | 10 | 光效、效果切换、转场、镜头、粒子、循环、角色、质感、3D、声音同步 | 交给既有 film／edit／scene renderer；网页不因参考场面效果而强制引入电影流程 |
| 合计 | **782** | **64** | 新文字引擎 228 是其中子集 | 条目数不是独立机制数，也不是已实现配方数 |

源站数据与拼接入口：[base](https://motion-reference.takayustudio.jp/data/motions.js?v=20260925-1)、[atlas](https://motion-reference.takayustudio.jp/data/atlas-items.js?v=20261011-1)、[atlas merge](https://motion-reference.takayustudio.jp/data/atlas-merge.js?v=20261012-1)、[text items](https://motion-reference.takayustudio.jp/data/text/items.js?v=20261012-1)、[text merge](https://motion-reference.takayustudio.jp/data/text-merge.js?v=20261012-1)。独立现场计数与既有盘点一致；不把多个数据源直接相加。

## 2. 看过什么，证据能说明什么

证据分四层，避免把“枚举完整目录”说成“逐个研究全部效果”：

- **全量身份与归属**：782 个唯一 ID、64 类；完整分类计数和代表 ID。
- **跨类别播放抽样**：64 类各选一个条目；在正常动效媒体设置下验证两次时间读数推进，64/64 推进。每次短播放不是完整周期视觉评审。
- **跨类别逐帧抽样**：64 个样本各取 10%、35%、70%、95% 帧，63 个呈现不同画面。RGB glitch 的四个固定取样点相同，改取 16%、22%、29%、86% 后得到三个不同画面；这说明短促效果需要按作用窗口观察，不能根据几张静帧判成无效。
- **代表性视觉检查**：12 个样本各取 15%、45%、80% 的实际 canvas 帧，组成两张视觉板并检查。完整周期录制另保存，属于样本回放，不是全站视觉保真声明。

初始浏览器继承了系统 `prefers-reduced-motion: reduce`，站点显示代表静帧而不自动推进。正常回放证据通过浏览器媒体仿真显式切到 `no-preference`；不能把初始静帧当成站点不会播放。单一代表静帧证明不了目标产品的状态／焦点正确性。

本地研究证据全部位于 ignored `.design-pipeline/motion-reference-study/`：`inventory.json`、`category-frames.json`、`live-playback.json`、`visual-web-game.png`、`visual-text-scene.png`；完整周期记录和视频见 `full-cycle-playback.json`、`representative-playback.webm`。这些是研究输出，不是新增 receipt，也不纳入 packaged skill。

## 3. 代表性效果拆解与可用结论

下列机制描述来自本轮画面／detail 阅读；适配建议是项目决策，不冒充源站已实现的产品行为。条目链接可直接打开源站详情。

| 实看条目 | 观察到的机制 | 应内化的内容与边界 | 项目落点 |
| --- | --- | --- | --- |
| [弹簧 snap](https://motion-reference.takayustudio.jp/#motion=s-snap) | 曲线轨迹、过冲与衰减后的停稳 | 选择硬度／阻尼／质量感；不要只给 cubic-bezier 起个 spring 名称 | basic family + 既有 motion foundation |
| [共享元素](https://motion-reference.takayustudio.jp/#motion=shared-element) | 元素与场景 A/B 的空间连续变化 | 保持对象身份、起终几何和层级；自动 canvas 研究不是 DOM／focus／路由实现 | web family + UI transition rules |
| [滑动退场](https://motion-reference.takayustudio.jp/#motion=swipe-dismiss) | 卡片跟随与退出；交互模式接受拖动 | 拖拽、阈值、回弹、提交状态是不同阶段；不要仅把时间线拖到结尾视作真实删除语义 | web gesture recipe |
| [HP 拖尾](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-hp-ghost-bar) | 当前 HP 阶跃下降，损失区间停留后追平；详情显示 0.4s 等待 + 0.5s 追随 | 立即状态与迟滞呈现分离。连续受击／治疗／取消必须由目标实现处理，不能从 source 时间函数推断 | 已有 hp-ghost-bar；game family 扩展 |
| [开箱](https://motion-reference.takayustudio.jp/#motion=catalog-game-reward-chest-open) | 箱体、开盖、光束、奖励物件分阶段出现 | 多对象揭示和视觉层级；奖励发放不能依赖动画完成 | game reward recipe |
| [命中停顿](https://motion-reference.takayustudio.jp/#motion=catalog-game-impact-fx-hit-stop) | 接触时的瞬间集中、爆发与短暂停顿 | hit-stop 是时间机制，不是给对象加抖动；逻辑时间、presentation 时间适配需明确 | game impact family |
| [Sankey 数据流](https://motion-reference.takayustudio.jp/#motion=catalog-data-story-sankey-flow) | 流量由 100 分支到 60／40，路径逐步显现 | 数据量与视觉通道／节点相符；不能用随机线条模拟真实数值 | web data-story recipe |
| [镜头推进](https://motion-reference.takayustudio.jp/#motion=cam-pushin) | 主体变大并伴随前后景空间关系变化 | 运动主体、背景、焦点与景深关系；不是整个画布统一 scale | scene guide → 既有 renderer |
| [行遮罩升起](https://motion-reference.takayustudio.jp/#motion=tx-line-mask-rise) | 各行在固定排版位置由遮罩揭示，行间错峰 | 排版先稳定、glyph／line 与裁切容器分离；不能重新排版每帧 | text mask/layout recipe |
| [文节揭示](https://motion-reference.takayustudio.jp/#motion=tx-bunsetsu-reveal) | 按日文短语单位揭示，保持语义组 | 可借鉴按语义组阅读；日文文节算法不能直接当成中文分词方案 | text segmentation guide |
| [可变字重波](https://motion-reference.takayustudio.jp/#motion=tx-weight-wave) | 字形粗细与波的进度关联，详情显示字重数值 | 字体必须真支持对应轴；真实轴变化与 scale／重复描边不是同机制 | text variable-font recipe |
| [lower third](https://motion-reference.takayustudio.jp/#motion=tx-lower-third) | 背板、姓名与附属条分层时序；持续阅读区间 | 阅读 hold 与入出场分开；产品语言、字幕长度与素材语义需重新预算 | text broadcast + scene/edit 使用说明 |

交互研究工具也实际操作：frame forward、onion-skin 开启状态、swipe 的操作模式与拖拽、A/B 的 B 时长从 2200ms 调到 1400ms 并读回显示。swipe 拖动令读数从 0ms 到 3000ms；只证明该研究页输入改变了呈现，不证明真实产品 dismiss 状态或可访问性。

源码进一步确认：当前全部条目使用 Canvas 绘制引擎，A/B 实际可调的是时长；振幅、stagger、easing 附加控件隐藏，不可声称已验证它们可调。逐帧按钮步长为 1/30 秒；onion-skin 叠加此前四个间隔 1/12 秒的采样时刻，并非设备最近渲染的四帧。我们的适配可以保留这种观察方法，但必须明确工具支持范围和采样单位。依据：源站研究 §5。

## 4. 导出与时长：需要修正旧结论

当前非文字示例的 detail 至少可见 `seek(t)`、HTML、CSS、WAAPI、GSAP、React；文字示例按机制可显示 `seek(t)`、CSS、Canvas、After Effects。因此不能把历史“三种框架模板”描述当成当前所有条目的统一能力。

HP detail 的统一提示写的是：seek(t) 是该 demo 本身，CSS／WAAPI／GSAP 是主曲线雏形，HTML 可保存再现实例。**但源码比这条提示更细，不能据此断言所有 GSAP 导出只含曲线。** 当前 554 个 ATLAS 条目与 228 个新文字条目走不同分发：ATLAS CSS／WAAPI 的目标元素段是模板，部分 GSAP 另驱动原 `f(g,t)`，React 是 Canvas 包装；文字按每项 `recipes` 提供具体技术实现，可能包括 GSAP、Motion、Remotion、SVG 与 AE 步骤。seek／原 `f` 仍依赖 renderer、绘图、插值、字体与 runtime helpers；再现画面不等于生产 DOM 组件或完整业务交互。详见源站研究 §4。

同样要区分三种时间：

1. **动作参数**：例如 source HP 的等待／追随；文字 RGB glitch detail 为 160ms burst。
2. **演示／循环时间**：HP 为 2800ms，RGB glitch 播放周期 3000ms；本轮的百分比取帧相对于这个周期。
3. **项目产品预算**：由当前 interaction frequency、用户任务和 tokens 决定，不由演示周期决定。

代码入口与说明来源：[首页 detail markup](https://motion-reference.takayustudio.jp/)、[export implementation](https://motion-reference.takayustudio.jp/assets/motion-export.js?v=20261012-1)、[HP detail](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-hp-ghost-bar)、[glitch detail](https://motion-reference.takayustudio.jp/#motion=tx-rgb-split-glitch)。更细的 exporter 分支分析见 [源站研究](motion-reference-source-study-2026-10-14.md)。

## 5. 内化顺序与完成标准

按既有扩展变更实施，不新开平行建设。顺序是交付依赖，不是把后面领域删掉：

1. **完整身份／场景入口**：沿用 canonical source 和 `component-source-catalog.json`；全部 782 source ID 可映射到真实 recipe／variant，中文产品问题可以找到 guide 和本地 study。检索命中不能替代机制实现。
2. **按机制实现、按变体调整**：基础的 curve／spring／path／stagger；网页的输入／状态／布局；游戏的分段反馈／spatial／material；文字的 glyph／line／mask／axes；场面的 camera／compositing／particles。可以共享真实支持的参数，不能用统一 fade/translate 假装覆盖不同机制。
3. **把边界写进 family guides**：什么时候不用、权威状态、触发和起終状态、分段时序、连续／反向输入、reduced motion、可访问性、当前 renderer 的适配。参考画面与完整交互语义分别记录。
4. **在既有研究工具中比较**：原速看感受，慢速／逐帧看间距与阶段，onion skin 看 spacing；只在参数不确定时 A/B。不要新增每项必须比较的流程负担。
5. **分别验证覆盖与质量**：全 ID membership／参数合法性；每个真实机制分支的冷／反向 seek、参数区别、释放／reduced motion；代表性视觉播放；目标交付原有 interaction／性能检查。Component Conformance 与 Visual Acceptance 分开，后者不能由自动 gate 授予。

完成意味着“有身份映射、有真实机制、有可读示例、有适配边界、有实际证据”，而不是“782 条 JSON、782 个标签或每类一张截图”。对应现有接口和验收：`openspec/changes/expand-motion-recipes-to-full-reference/design.md:23-75`。

## 6. 来源与未验证事项

- Publicly accessible 不等于允许复制／再分发。没有从网页 JS 可读取推断开源许可。保留事实 ID、链接、观察与原创指南／study；不复制源代码、描述或素材进入 skill。当前 canonical source 的 licensing unverified 边界保持不变，见项目地图 §2–§3。
- 本次未逐个视觉审阅 782 动效，未验证每种导出代码可独立运行，未测试源站的真实业务状态、全部触摸／键盘语义或移动端性能。
- 初始 reduced-motion 停帧与正常播放均有现场观察，但没有把所有类别的减弱帧逐一评成可用；这必须在我们原创实现中验证。
- 本次只新增研究资料与 ignored evidence，不修改 runtime、配方、catalog、OpenSpec 契约或用户已有改动，不提交／发布。完整扩展不是这轮已完成的实现交付。

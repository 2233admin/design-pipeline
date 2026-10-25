# Motion Reference 内化：项目现状与接入地图

研究日期：2026-10-14。对象：[Motion Reference](https://motion-reference.takayustudio.jp/) 与 design-pipeline **当前工作树**，不是仅看 HEAD。读者是负责后续内化、集成和验收的工程师；本文提供查阅地图，不授予实现或视觉验收权限。

**范围说明**：本文是本轮并行研究中的“项目侧映射”子报告；文中“本次未枚举／未播放”只指该子研究，不代表整轮研究没有源站实测。整轮独立目录核对、64 类播放抽样、12 项代表性视觉检查与证据边界见 [综合报告](motion-reference-internalization-study-2026-10-14.md) §1–§4；静态目录拼接与导出分支见 [源站研究](motion-reference-source-study-2026-10-14.md)。已有实现状态仍以本文检查时点为准。

## 1. 结论先行

**项目缺的主要是更广的场景／机制配方覆盖，不是另一套动效原则或检查流程。** 现有四个配方已接入中文／英文场景检索、离线 specimen、游戏／网页入口和打包资源；全站扩展已经有独立 OpenSpec 变更和完整盘点记录，但不能称为已实现全站配方库。[依据：`skill/references/motion-recipes/README.md:3-18,20-56`；`skill/references/package-resources.json:1105-1114`；`openspec/changes/expand-motion-recipes-to-full-reference/tasks.md:3-25`]

最重要的区分：

| 当前状态 | 可说的内容 | 不可越过的边界 |
| --- | --- | --- |
| **已实现并接入当前树** | 4 个原创场景配方、4 个 DOM/SVG HTML specimen、2 个索引；catalog 为 4 个 method + 1 个 canonical source | 不等于已发布、完整 QA 通过、全站覆盖或 owner Visual Acceptance |
| **已有历史技术证据记录** | 首批变更记录了四页的真实 Chromium 操作与状态观察 | 本次没有重放；历史记录也明确未覆盖设备性能、跨浏览器／移动矩阵、BFCache 或视觉接受 |
| **已研究／已设计** | 扩展变更记录 782 个唯一源 ID、64 类、五组归属和原创建模接口 | 源 ID 盘点不是 782 项播放研究，也不是 782 个独立实现 |
| **仍规划／尚未接入** | 全站 method 映射、family guides、gallery、覆盖 consumer tests、最终包装／证据 | 不能通过名称映射、泛用 translate/fade 或任务勾选推断完成 |

上述四行分别见：`skill/references/component-source-catalog.json:4548-4716`；`openspec/changes/add-game-web-motion-recipes/verification.md:5-16,23-24,34-45`；`openspec/changes/expand-motion-recipes-to-full-reference/design.md:3-21,23-75`；同变更 `tasks.md:8-25`。

本次 JSON 查询确认 canonical source 下是 **4 method + 1 source**，`motion-reference/` 前缀的 doc 为 **0**。本次文件枚举在 `skill/references/motion-recipes/` 和 `skill/tools/motion-recipes/` 找到的仍是首批十个资源；没有发现扩展设计要求的 `families/`／`full/` 产物。这是检查时点的文件／接入证据，不是以未勾选任务替代检查；对应应有产物明确写于 `openspec/changes/expand-motion-recipes-to-full-reference/design.md:19-21,25-44,63-75`，现有记录完整区间为 `skill/references/component-source-catalog.json:4548-4716`。

## 2. 当前配方库存：计数与领域

计数口径是**本网站相关、原创、本地可用的场景配方**。不把全项目的 film templates、Art Motion techniques、primitive registry 或其他来源的动效方法加进这个数。四个配方全部属于 catalog 的 `motion-recipe` 类；按产品用途，前两个是游戏 HUD，第三个是游戏／网页奖励反馈，第四个是游戏菜单／网页导航。[依据：`skill/references/motion-recipes/README.md:9-18`；`skill/references/component-source-catalog.json:4573-4716`]

| 配方／产品领域 | 已实现的关键机制（代码阅读，不是本次运行结果） | 当前源站证据边界 | 主要定位 |
| --- | --- | --- | --- |
| HP ghost bar／血条拖尾；游戏 HUD | 同步提交 HP；采样当前 ghost 后替换唯一视觉 owner；治疗／减弱动效直接对齐；80 ms hold + 180 ms settle 是原创默认 | 先前研究记录播放及源站显示 400/500/2800 ms；显示参数不是实测，也不是目标 UI 建议预算 | `skill/tools/motion-recipes/hp-ghost-bar.html:139-176`；`skill/references/motion-recipes/hp-ghost-bar.md:25-42,77-81` |
| Cooldown completion／冷却完成；游戏 HUD | deadline 决定 availability；替换 run 使旧 timer/RAF 失效；移除真正完成的 run 后增加一次 completion，再显示提示 | 仅源目录文字，未测源播放或时序；本地 countdown/cue/state 是原创 | `skill/tools/motion-recipes/cooldown-completion.html:165-225`；`skill/references/motion-recipes/cooldown-completion.md:85-87` |
| Reward arrival／奖励到账；游戏／网页反馈 | 先更新 total/grants，再启动视觉 flight；finish 只做 presentation cleanup，不发放奖励 | coin collect 目录文字；未确认源播放、曲线、帧时间或 exports | `skill/tools/motion-recipes/reward-arrival.html:130-169`；`skill/references/motion-recipes/reward-arrival.md:85-87` |
| Menu switch／菜单切换；菜单／导航 | 采样呈现后取消旧 animation；立即写 requestedOpen、aria-expanded、inert、disabled；旧 finish 按 revision/latest state 拒绝；选 view 保持焦点和单一可用内容 | 先前播放的是 Icon Morph；560/2400 ms 是显示值；实际可访问菜单、focus/cancel 是项目原创，不是源示例已验证能力 | `skill/tools/motion-recipes/menu-switch.html:174-226`；`skill/references/motion-recipes/menu-switch.md:96-98` |

### 已内化的不只是“链接”

- **选型入口**：用中文／英文产品问题找到 guide + implementation，且 guide 规定何时不要动效。首批每篇内容契约包括 intent/frequency、权威状态、触发／起止、分段时序、primitive、重复／反向／取消／清理、reduced motion 与 rendered cases。[`openspec/changes/add-game-web-motion-recipes/design.md:16-23`；`skill/references/motion-recipes/README.md:9-18`]
- **状态正确性**：装饰层不拥有 HP、deadline、奖励或菜单可用性；这已落实到上表代码，不仅是宣传语。[上表四个 HTML 区间；`skill/references/game-ui-and-narrative.md:15-18`]
- **离线 inspect/adapt**：file:// 打开；语义控制；检查中途状态、rapid input/cancel/reset、系统与 checkbox reduced motion、keyboard/focus；继续使用当前 renderer，不引入 film 项目。[`skill/tools/motion-recipes/README.md:3-30`]
- **来源与权属分离**：project-owned 只覆盖原创 guide/parameter/specimen；外站 licensing unverified、codeCopied/assetsCopied 为 false，不把引用当复制许可。[`skill/references/component-source-catalog.json:4548-4571,4591-4605,4627-4641,4663-4677,4699-4713`]

## 3. 动效选择、制作与 review：复用现有顺序

下面是**已有入口的阅读／决策链**，不是新工作流或新增强制门禁。

1. **先确认用户／项目 authority**：project `MOTION.md` 是目标产品的 reusable language，change `motion.md` 只选择和具体化；项目 foundation 与已有 runtime 优先。仓库自身静态，不能把源站动画做成 CLI／文档的默认动效。[`skill/references/motion-foundation.md:3-18`；`MOTION.md:12-24,31-46`]
2. **筛机会而不是找装饰**：先 frequency、一个 purpose、function、现有 budget，静态已清楚就记录 no motion；普通 UI 通常低于 300 ms，但这不是给 film 统一加上 300 ms 限制。[`skill/references/animation-opportunity-and-review.md:35-55`]
3. **按状态变化选方案**：内容／单位替换、layout、shared item、overlay、导航、list、数值／first mount 都已有 map；同一逻辑实体、真实几何、焦点、总预算和 retargeting 是选择条件。不要把普通 UI 强行转电影 timeline。[`skill/references/ui-transition-rules.md:8-57`]
4. **从现有 recipe 入口找具体场景**：游戏入口 `skill/references/game-ui-and-narrative.md:15-18`；网页 build 入口 `skill/references/workflow-web.md:517-524`；catalog 说明 `skill/references/pipeline-reference.md:127-132`；支持工具入口 `skill/tools/README.md:25-30`。
5. **选语义 primitive／平台 channel，不伪造 taxonomy**：foundation 的 CSS/WAAPI 优先及其他 renderer ownership/degradation 政策已存在；HP guide 已明确没有合适的 held remainder primitive，因此用 DOM scaleX，而不冒充 spring。[`skill/references/motion-foundation.md:54-66,84-96`；`skill/references/motion-recipes/hp-ghost-bar.md:38-42`]
6. **在实际 rendered surface review**：purpose/frequency、curve/duration/origin、rapid input/reverse/route/resize、compositor、reduced motion、keyboard/touch、enter/exit、清理；事实标为 measured/instrumented/inferred/authored。原速看感受、关键点逐帧；只有参数不确定时才比较 alternatives，不新设强制 A/B。[`skill/references/animation-opportunity-and-review.md:74-113`；`skill/references/motion-foundation.md:98-108`；`skill/references/animation-thinking.md:109-122`]
7. **留在现有 evidence lineage**：source/adaptation 在 `reference.md`，决策在 `motion.md`／phase task，播放／interrupt/reduced evidence 在 `qa.md`；检索成功和技术 conformance 不等于 Visual Acceptance。[`skill/references/motion-recipes/README.md:53-56`；`AGENTS.md:8-10`]

### 检索接缝的实质

现有 snapshot 是 `skill/references/component-source-catalog.json`，canonical `sourceId` 是 `design-pipeline/motion-recipes`。recipe methods 在 `docs` collection；localPaths 相对 installed skill root，当前示例检索显式指定 snapshot 和 `--kind doc`。[`skill/references/motion-recipes/README.md:20-43`；`skill/references/component-source-catalog.json:4548-4585`]

- 直接复用 `normalizeSnapshot` 的 namespace/kind/localId、重复 ID 拒绝、provenance 合并与 SHA-256 metadata hash：`skill/scripts/design-system-catalog-core.cjs:352-405`。
- 直接复用 `searchCatalog` 的 query/kind/category 过滤；`--platform` 要求 component + routing，故 `--platform web` **不能**作为 recipe 入口：`skill/scripts/design-system-catalog-core.cjs:435-457`。
- 别以“自动匹配更方便”为理由扩宽 component routing，让 doc/method 混入组件来源 manifest。现有 docs 检索不是默认 Astryx component index 自动接入；其 explicit-snapshot 边界已说明：`skill/references/motion-recipes/README.md:41-43`。

### 已有 motion 验证能承接什么、不能证明什么

`skill/scripts/motion-evidence-core.cjs:7-32,38-66` 已有 v1 receipt、timing tolerance、long-frame budget、deterministic 要求，以及 rapid-input/reverse/unmount/reduced-motion lifecycle 字段。lifecycle 缺席时普通 evaluation 能返回 `timing-only`，仅在 `requireLifecycle` 为 true 时才要求它；字段校验不是自己执行动画，也不能证明奖励不重复、菜单 focus 正确或 782 项机制真实实现。

因此接入应使用已有 capture/receipt，并以每项实际 state/geometry/pixel 和语义 observations 补齐证据；**不能**把 schema passed 当完整动态覆盖。现有 recipe inspector 已要求实际中途状态和 focus；扩展设计也要求 branches 与 labels 分开证明。[`skill/tools/motion-recipes/README.md:17-23,38-42`；`openspec/changes/expand-motion-recipes-to-full-reference/design.md:69-75`]

## 4. 精确网站工作：两项变更与研究来源

### A. `add-game-web-motion-recipes`：首批已写入，收尾仍有缺口

- 原范围明确是四项，非全站库、非 broadening component route、非 mandatory A/B、非新 checker。[`openspec/changes/add-game-web-motion-recipes/design.md:3-5`]
- authoring 1.1–1.4 与 existing-path 2.1–2.2 已勾选；四个实际 guide/HTML、catalog 和十项 required resources与之相符。[同变更 `tasks.md:3-11`；`skill/references/component-source-catalog.json:4548-4716`；`skill/references/package-resources.json:1105-1114`]
- verification 文档记录了四页真实播放及中断／减弱／语义操作，明确排除 measured FPS、target device、完整 cross-browser/mobile、BFCache、owner Visual Acceptance。[同变更 `verification.md:5-16`]
- task 3.3 仍未完成；历史 QA 失败包括 concurrent change 注册和工作树漂移。canonical recipe source 当时已修，focused invariants 和 strict validation有历史 pass 记录，但不能代表当前全树 QA。[同变更 `tasks.md:15-20`；`verification.md:34-41`]
- 历史成功 ZIP **已 superseded**，其构建先于 canonical source correction 和 concurrent registrations，不能作为最终交付包证据。[同变更 `verification.md:23-24`]

**本次未复核这些外部 blocker 现在是否仍存在**；以原文“当时阻塞”报告，不把历史 fail 升级成今天的已确认故障，也不重跑确认。

### B. `expand-motion-recipes-to-full-reference`：完整盘点／接口已有，交付未完成

这项变更已主动纠正首批过窄范围；要求全 category/item coverage、original mechanisms + explicit variants，区分 web/game UI/text/film，且保留原四页。[`openspec/changes/expand-motion-recipes-to-full-reference/proposal.md:5-18`]

现有设计记录的五组 scope：

| 组 | 源条目数（不是 recipe 数） | 归属范围 | 当前落地状态 |
| --- | ---: | --- | --- |
| basic | 164 | principles/easing/spring/timing、出入场／move/scale/rotate/reaction/collection/attention、SVG path | 设计已定义；对应 task 2.1 未勾选 |
| web | 157 | scroll/interaction/layout/feedback、form/gesture、button/control/navigation/loading、data story | 设计已定义；对应 task 2.2 未勾选 |
| game | 107 | HUD/combat/reward/progress/cinematic、spatial/material/impact | 设计已定义；首批是可复用子集，但全组 task 2.3 未勾选 |
| text | 248 | 所有 tx-*；228 text-engine + 20 retained legacy | 设计已定义；对应 task 2.4 未勾选 |
| scene | 106 | light/effect/transitions/camera/particles/loops/character/look/depth3d/sound | 设计已定义；对应 task 2.5 未勾选 |
| 合计 | **782** | 五组分区，不新增 deliverable kind | 配方数要看真实机制，不能称“782 个已实现配方” |

依据：`openspec/changes/expand-motion-recipes-to-full-reference/design.md:9-21,37-42`；`tasks.md:8-12`。

已有要求比“增加标签”强得多：每个 source ID 映射实际 recipe descriptor、exact variantId、支持的 parameters、原创 studyDuration、usage、rationale；不同 state/glyph/path/deformation/compositing 必须真分支，不能 fallback。[同变更 `design.md:23-61`；`specs/design-pipeline/spec.md:19-39`]

**检查时尚未接入的具体验收面**：782 条 `motion-reference/<id>` doc、family guides + 五组 module、inventory summary、deterministic derived data、offline exact-variant gallery、membership/parameters consumer validation、browser branch evidence和final package。依据是当前 catalog 查询／文件枚举，加上明确产物契约及未完成 integration/evidence tasks，不能仅凭未勾选断言“没人做过任何私下实现”。[同变更 `design.md:19-25,63-75`；`tasks.md:16-25`]

### C. 完整盘点在 ignored research，不是 packaged library

设计指向 `.design-pipeline/motion-reference-full-inventory.json`／`.md`；它们是已有、未发布的研究来源，不是新的 runtime schema。[`openspec/changes/expand-motion-recipes-to-full-reference/design.md:5-7`；`.design-pipeline/motion-reference-full-inventory.md:5-7`]

现有盘点记录：811 输入减 29 explicit aliases = 782 unique，64 category；228 text 是 782 子集，22 个 text categories 合计 248。十二篇 text guides、两项 research记录不计入 motions。[`.design-pipeline/motion-reference-full-inventory.md:13-29,188-192`；`openspec/changes/expand-motion-recipes-to-full-reference/design.md:5-7`]

本节数字来自**已有研究记录**，项目侧映射子研究没有独立再枚举网站；同轮独立核对结果与其一致，见综合报告 §1。源站 count 可变，完整 metadata 证明不含 visual fidelity、interaction semantics、playback quality或 downstream correctness。[`.design-pipeline/motion-reference-full-inventory.md:226-230`]

## 5. 已有能力、待完成工作与真正缺口

| 问题 | 分类 | 接入判断及依据 |
| --- | --- | --- |
| “不知道血条／奖励该用什么” | 已部分解决 | 四项双语场景入口和直接 specimen 已在树；扩到完整场景 map即可，不造新 dispatcher。`skill/references/motion-recipes/README.md:9-43` |
| “缺 purpose、budget、reduced、interrupt review” | 不是当前空白 | opportunity、TR、motion spec 已有；加强配方可操作性，不复制规则。`skill/references/animation-opportunity-and-review.md:35-113`；`skill/references/motion-spec.md:93-149` |
| “四个代表全站” | 明确不能 | 完整五组／64 类 scope已经定义；全站 executable mapping 仍未接入。`openspec/changes/expand-motion-recipes-to-full-reference/design.md:5-21,69-75` |
| “源参数就是产品 token” | 已有禁止边界 | 源 metadata／原创 study／target operational budget必须分开。`skill/references/motion-recipes/README.md:45-51`；扩展 `design.md:36-40,61` |
| “text 有 228，所以总数要加228” | 已有盘点解决 | subset + 20 legacy必须保留；未知 glyph机制不能通过 keyword map掩盖。`.design-pipeline/motion-reference-full-inventory.md:27-29`；扩展 `tasks.md:11` |
| “检索返回就说明能演示” | 待完成的 coverage proof | 当前 catalog core只负责 metadata；扩展需要真实 descriptor/param consumer checks与branch playback，不新 public gate。`skill/scripts/design-system-catalog-core.cjs:328-405`；扩展 `design.md:69-75` |
| “新增演示可直接证明目标 film/UI交付” | 不支持 | study仅是技术学习；目标 renderer、interaction semantics、性能与视觉验收还要在既有任务中验。扩展 `specs/design-pipeline/spec.md:41-61`；首批 `verification.md:16,43-45` |
| “首批已经最终打包／全部QA” | 未完成／未确认 | task 3.3、superseded ZIP以及当前dirty树必须显式保留，父代理集成后再统一验证。首批 `tasks.md:17-20`；`verification.md:23-24,34-41` |

## 6. 建议的 integration seams（建议，不是代码或新 contract）

1. **在已有 recipe index扩展场景／领域入口**：中文产品问题 → source ID → 实际 family/variant → 原创 offline study → project adaptation。保留四个单页，把完整源 inventory 与 mechanism count 分开展示。扩展的 full-reference方案已定义这条 seam，不再创建第三项平行“动效知识库”变更。[复用：`skill/references/motion-recipes/README.md:9-43`；扩展 `design.md:19-44,63-67`]
2. **复用 canonical source 与 existing catalog**：每 source item进入 `docs` method；local guide/gallery paths必须真实；原网页 doc/method search，不碰 component-only platform filter；derived gallery data仅projection，不建立第二 truth source。[复用：`skill/scripts/design-system-catalog-core.cjs:384-457`；扩展 `design.md:23-44,63-65`]
3. **按真实机制合并而非按标题合并**：能由direction/easing/spacing等支持参数表达的差异共用 recipe；需要不同state/segmentation/path/deformation/compositing的分开实现。支持参数和机制真实性是现有扩展验收要求，不是额外需求。[扩展 `specs/design-pipeline/spec.md:19-39`]
4. **领域适配说明放 family guide，不改 CLI kind**：game/text是 recipe groups，使用既有 web/ui/film/edit context；web/game仍保持产品权威状态、focus、interrupt；text检查真实CJK/Latin样例和grapheme边界；scene只把方法交给现有scene/film renderer。[扩展 `design.md:37-42,54-61`；`specs/design-pipeline/spec.md:41-55`]
5. **来源记录分三层**：源站 displayed values / 实际播放观测 / authored implementation parameters；沿用已有 reference/motion/qa，不创建 source-playback receipt。后续 live study只提高观察证据级别，不把 license unverified变成许可。[复用：`skill/references/motion-foundation.md:98-123`；`skill/references/motion-recipes/README.md:53-70`]
6. **接入现有验证／打包出口**：catalog identity/license/local pointer/normalization与package resources继续原机制；full coverage consumer测试进入既有test manifest；记录membership、configuration validity、实际branches与representative visual playback四种不同证据，最终目标技术验证与owner Visual Acceptance继续分离。[`AGENTS.md:8-10,24-25`；扩展 `design.md:69-75`；首批 `verification.md:43-45`]

## 7. 非行为研究 vs OpenSpec 行为变更

| 动作 | 所属范围 |
| --- | --- |
| 阅读网站、盘点／核对 source IDs/categories、记录 metadata和实际观察边界；写这份项目地图；提出seams | **本轮 research**：没有更改工具、选型强制规则、runtime或gate，留在研究artifact与既有引用 |
| 把full item index、mechanism/variant recipes、gallery、guides加入 packaged skill／catalog搜索；改变可发现内容／必需资源 | **已有 `expand-motion-recipes-to-full-reference` 的行为交付范围**，按该变更实施与验收，不只写“总结”宣称内化 |
| 修改检索过滤／路由、CLI、primitive语义、runtime ownership、receipt/schema或自动验证行为 | **行为变更**，须OpenSpec及明确scope；当前研究不授权这些变化，也没有理由提出平行版本 |
| 单纯源观察补记／澄清historical evidence、保留未知许可、日期化count | **非行为资料修订**；若修订改变强制authoring/review要求或发布行为，随对应OpenSpec治理 |

政策依据：`AGENTS.md:7-10`；`openspec/config.yaml:12-27,30-42`；扩展变更 `proposal.md:9-22`。本项目禁止第二gate、receipt schema、target resolver或policy digest；已有研究和扩展变更不是允许再叠一套流程的借口。

## 8. 研究范围、证据与剩余不确定性

- **检查的是dirty工作树**：本次 `git status --short` 显示首批recipe文件已staged，catalog/package/index有staged+unstaged内容，全站扩展为untracked；另有independent UI、film、安装与explanation work。只创建本文，没有stage/commit/reset，也没有覆盖这些改动。Git状态是本次命令观测，不是发布状态推断。
- **搜寻范围**：先对全项目descriptive find；judgment backend报account rejection，不能视为无命中。随后用exact domain、站名、两项change name和recipe引用查 `skill/`、`docs/`、`openspec/`、`experiments/project-motion/`，并读取两项OpenSpec的proposal/design/tasks/spec与首批verification；再看其已知catalog、authoring/review、tools和资源入口。Art Motion／Prompt Motion的同名片段来自别的来源，未算进本网站coverage。
- **项目侧检查方法**：专项文件枚举、catalog JSON计数、代码／文档range阅读；没有build/lint/test/formatter，没有由该子研究执行live site playback或specimen重播。不将历史verification文档的pass称为自己跑过。同轮源站实测另见综合报告 §2。
- **跨子研究结论与剩余边界**：源站当前live inventory与代表playback已由综合报告确认；导出分支区别已由源站研究确认。上游开放／再分发许可仍未确认；当前首批QA/package外部blocker是否已收敛、扩展private实现是否在检查后落地、最终真实branch、target renderer/device和owner视觉acceptance均不在本项目地图的验证范围。不得把代表性源站回放推成这些结果已通过。
- **落地范围**：只新增本研究文档；不操作PM、KB或Git提交，不变更任何OpenSpec／源代码／changelog。行为后续已由现有expand变更承接；本文不是另一份execution status truth。

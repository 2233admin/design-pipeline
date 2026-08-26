# Victor Design 项目研究

研究日期：2026-08-15

研究对象：[victorzhang016-code/victor-design](https://github.com/victorzhang016-code/victor-design)

固定版本：[`300fda1ef073c35a37701073b5ca1c9743919653`](https://github.com/victorzhang016-code/victor-design/tree/300fda1ef073c35a37701073b5ca1c9743919653)

## 结论

有，而且值得学。但最值得学习的不是一套可直接复制的“Victor 风格”，而是它把视觉判断变成了可执行、可复盘的生产系统：

> 先确认载体与主体，再用参考证据校准完成度；要求每个手法同时说明原因和观看效果；同时拒绝 AI 套路与过度克制；最后通过分阶段审批、对照视图和可编辑交付把质量闭环。

这套系统容易产出“风格效果很好”的结果，主要因为它抓住了六个通常被 AI 设计工作流忽略的变量：主体因果、载体正确性、关系密度、类型与图像的共同构成、材料处理，以及完成前的同尺度人工对照。视觉上的“高级感”不是来自某个滤镜，而是来自足够多、彼此咬合且有理由的设计动作。

但公开仓库能证明的是“方法设计得认真、工程护栏可运行”，不能独立证明 README 的全部效果宣传：

- 仓库没有公开 demo、gallery 或项目主页；README 也没有作品演示链接。
- README 的“四轨评测、胜过七个世界级 design skills、公开投票第一”只有一句声明，没有链接、评测协议、输入、输出或投票记录。
- 仓库中的四张大图是第三方海报截图拼贴形成的 benchmark boards，不是 Victor Design 的成品画廊。
- `style-evidence.md` 明确说截图的权利与作者身份未核验，并写着图片“不进入 Skill”；但固定版本实际上把四张图打包在 `assets/benchmarks/`，文档与发布状态存在矛盾。
- 仓库自己的“夜班之后”复盘承认：失败稿曾声明 14 个设计动作且两个 validator 都通过。这正说明数字门槛只能发现薄弱结构，不能证明审美。

因此最准确的判断是：**这是一个很强的设计过程参考和一个有潜力的工程样本，但公开视觉成效证据仍不完整。适合选择性吸收方法，不适合整包照搬风格、资产或硬指标。**

## 研究方法与验证范围

- 阅读固定版本的 `README.md`、`SKILL.md`、核心方法文档、四类 carrier adapter、review/gate/delivery 文档。
- 查看仓库固定版本完整文件树、提交历史、唯一已合并 PR、issues、releases、tags 与 GitHub repository metadata。
- 打开并检查仓库打包的四张 poster benchmark boards，区分外部参考与项目自身产出。
- 阅读“夜班之后”正反例复盘、对应 HTML fixtures、validator 和测试入口。
- 在隔离临时目录运行 Python fixtures 与 DOM Migrate 测试；没有修改上游仓库。
- 对照 design-pipeline 当前的 `DESIGN.md`、`MOTION.md`、direction preview、design synthesis、anti-slop review 和 component-first 边界。
- 未使用二手文章或他人评论来解释项目质量；下文把仓库事实与分析推断分开。

## 1. 它实际上是什么

Victor Design 不是一个组件库、主题包或纯提示词合集。README 将它定义为“面向 AI agents 的、以人为中心的视觉设计工作流”，范围包括海报、社交图文、产品 UI 和演示文稿；入口是一个技能文件，具体规则分散在 adapter、workflow、operations 和 evidence 文档中。[README](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/README.md#L3-L20) 与 [`SKILL.md`](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/SKILL.md#L8-L25) 给出了这一定位。

它有两层：

1. **设计判断系统**：主体理解、form sanity、task brief、style evidence、density/care、carrier adapter、三道 gate、review。
2. **交付工程**：HTML master、静态导出、Figma/PPTX 路由，以及面向受控产品 UI 的 DOM Migrate v3。

这种分层很重要。视觉方法负责决定“应该做什么、为什么”，工程工具负责验证“是否按约定做了、能否交付”。项目自己也明确承认 deterministic checks 不能认证 taste。[review 文档](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/operations/review.md#L191-L203)

## 2. 最值得学习的设计方法

### 2.1 先判载体，再谈风格

它要求先判断任务是单张海报、图文组、多状态产品 UI，还是演示文稿；用户语言、任务控制文件和正常读者的理解优先于模型自己写的概念说明。若一个载体单独交给读者无法完成预期动作，就必须重新分类。[README](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/README.md#L16-L20)；[`SKILL.md` form sanity](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/SKILL.md#L27-L42)

可学习点不是“四种分类”本身，而是**载体是一等决策**。海报靠远距离注意和单一主事件，图文靠序列，UI 靠状态与恢复，slides 靠叙事推进；不应该用同一套审美规则覆盖所有输出。

最新提交还主动把 flat carriers 从 DOM Migrate v3 的 Auto Layout 路线撤出，限定 v3 只处理受控产品 UI，海报、图文和 slides 回到 flat/legacy 路线。这是很好的工程校准：工具能力必须服从载体，而不是为了统一架构牺牲结果。[最新提交](https://github.com/victorzhang016-code/victor-design/commit/300fda1ef073c35a37701073b5ca1c9743919653)；[delivery routing](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/operations/delivery-implementations.md#L7-L25)

### 2.2 把“风格”改写成证据选择

它不让 agent 先挑一个风格标签或沿用固定 palette。`style-evidence.md` 的第一句话就是：这是 judgment source，不是 preset；项目只能继承适合当前主体、读者和媒介的原则，不能继承表面处理。[style evidence](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/style-evidence.md#L1-L6)

每个重大选择都要写出：

- subject cause；
- viewer effect；
- 为什么适合当前 carrier。

无法回答的动作被视为装饰；完全没有动作则被视为未设计。这个双向约束比单纯的“anti-slop 禁止清单”更强，因为它既压制无因炫技，也防止把空白误认成高级。[aesthetic core 的 form-cause 表](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/aesthetic-core.md#L26-L44)

### 2.3 同时拒绝 AI 套路和“怕做错所以不做”

它设置了两个相反方向的 veto：

- AI-formula veto：浮空细线、默认半透明卡片、假标签、无意义图标、廉价光效和可替换模板语法；
- over-restraint veto：一张未处理图片、一个标题、少量弱元素，被包装成“克制”。

两者同时存在，解释了为什么这套方法不会自然滑向常见的紫蓝渐变 SaaS，也不容易停在“干净但薄”的初稿。[aesthetic core](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/aesthetic-core.md#L119-L130)；[style evidence 对通用 AI 渐变的拒绝](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/style-evidence.md#L72-L79)

### 2.4 用“关系密度”而不是元素数量衡量完成度

它的关键概念不是简单地“多放东西”，而是三种密度：

- content density：承载足够内容与证据；
- relational density：字、图、图表、图标、材料和空间通过比例、接触、裁切、对齐、光、状态、节奏相互影响；
- design-act density：作者做出了可见决定，而非仅把内容摆进容器。

文档把 richness 和 justification 设为并列条件，并要求作品达到相邻优秀人工参考的完成度后才能给用户看。[density and care](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/workflow/density-and-care.md#L8-L19)；[三种 density](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/workflow/density-and-care.md#L95-L106)

这比“越少越高级”更接近实际设计：好的画面往往同时拥有一个明确主事件、数个有分工的文字层级、局部密集区、真正安静的区域，以及跨层共享的材料规则。

### 2.5 图像不是放进去，而是被设计动作改变

“夜班之后”案例是仓库里最具体的方法说明：通过同一张照片的裁切、分级、青红套版、高曝光、反射、网点、纸纤维与颗粒构建印刷系统；标题也继承套色误差。复盘认为，密度应优先来自对同一素材的第三次处理，而不是增加第一个新装饰。[worked case](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/optional/case-night-shift-poster.md#L20-L55)

这是非常值得迁移的原则：**先增加素材内部的关系，再增加素材外部的器件。** 它会让画面看起来是一个统一的物质世界，而不是卡片、标签和滤镜的堆叠。

### 2.6 强制看真实参考，并在同尺度下比较

项目内置四张 benchmark boards，约含四十张当代编辑、展览、音乐与文化类海报。使用规则要求 agent 真正打开四张图，记录字体层级、尺度比、图像内部操作、图像外部要素、材料系统、密区/静区和视觉重量，而不是只读文字总结。[benchmark 使用说明](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/optional/poster-benchmark-boards.md#L1-L27)

完成前还必须把 master 与用户参考或内置 benchmark 以同尺度放在一起，记录类型层级、文字锚点、阅读回路、图像处理和 craft family。[review benchmark gate](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/operations/review.md#L62-L80)

这很可能是效果被认为好的重要原因：模型不再把自己的上一稿当作质量上限，而是持续面对更强的人工作品。项目甚至在提交信息中把一次明显跃升归因于“真正查看了 benchmark boards”，然后把经验固化成方法、测试和正反 fixtures。[密度与 benchmark 提交](https://github.com/victorzhang016-code/victor-design/commit/105013750ba1b1f6dd573b6ffd5c3eedce39f362)

### 2.7 审查不同视图，而不是只看完整大图

review 要求检查 full size、thumbnail、copy-hidden、image-hidden、same-scale reference，并在必要时检查标题、材料、透视和底边裁切。不同视图回答不同问题：

- thumbnail：第一注意点和整体重心是否成立；
- copy-hidden：图像、材料与空间是否独立成立；
- image-hidden：类型系统和布局是否只是依赖强图；
- bottom strip：是否存在被 flex 压缩或视觉遗漏的溢出；
- same-scale reference：完成度差距是否真实可见。

这种 review 视图设计比“再看一遍截图”更有诊断力。[required views](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/operations/review.md#L166-L183)

### 2.8 动效只承担阅读和状态职责

交互 HTML 的 motion 只有两个合法职责：状态变化反馈和阅读顺序引导；时长限定为 150–400 ms、共用 easing、禁止自动播放的漂浮物/粒子/循环表演，并要求 `prefers-reduced-motion` 下内容仍完整。[execution motion discipline](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/operations/execution.md#L196-L205)

这会带来“利落”的感受：动效不和主体争夺注意，也不会用持续运动掩盖层级问题。

## 3. 为什么它容易被感知为“风格效果很好”

以下是基于源码与打包参考的分析推断，不是对公众评价的统计结论。

### 3.1 它把显示字体当作图像和空间骨架

benchmark 方法反复强调 display type 不是默认 header，而是主视觉事件；字可以裁切、叠压图像、构成方向或承担材料处理。视觉上会比“顶部大标题 + 中部图片 + 底部信息”的通用结构更有辨识度。[benchmark 可见机制](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/optional/poster-benchmark-boards.md#L28-L52)

### 3.2 它追求一个主事件与多层支持关系

好的画面常同时具备远、中、近三个阅读距离：远看先认出主事件，中距离进入标题/图像关系，近看发现事实、材料和微小证据。Victor Design 用 type levels、anchor regions、reading loop 和 layer model 明确塑造这种深度。因此它看起来“满”但不一定乱，“大胆”但不一定只有一个大字。

### 3.3 它用材料统一层，而不是让效果悬浮在层上

颗粒、套色、纸纹、扫描、反射、模糊等只有在改变 carrier 或与图像、类型共同遵循一套规则时才成立。统一材料会消除“图、字、滤镜来自三个模板”的割裂感，产生完整世界感。

### 3.4 色彩大胆，但必须承担语义

它接受高饱和色、强黑白对比和一个电性色彩事件，但要求颜色指向状态、声音、材料或注意事件。这种约束让强色显得果断，而不是随机“加亮”。

### 3.5 它把初稿暴露前的完成度门槛设得较高

规则要求先比较方向、先看 benchmark、先达到 density floor，再给用户看。用户感知到的不是模型的第一反应，而是已经经过多次筛除和补足的产物。公开观感因此容易好于“先生成三张再让用户挑”的普通 agent 流程。

### 3.6 可编辑和可复现的交付提高了“专业感”

HTML master、独立状态路由、golden captures、Figma 层级、Hug/Fill/Fixed、长文案替换测试和几何/SSIM 阈值，不直接创造审美，但能减少交付后的字体漂移、裁切错误、匿名图层和截图冒充可编辑文件。这类细节会显著影响最终的成品感。[product UI adapter](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/adapters/product-ui.md#L43-L63)；[Figma acceptance](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/adapters/product-ui.md#L122-L137)

## 4. 工程上值得学习的部分

### 4.1 规则模块按责任划分

入口只保留总原则、执行链和路由；具体规则放进唯一 owner：task brief、image role、density、adapter、execution、gates、review、delivery。这比在一个超长提示词里重复相同规则更容易维护，也更适合 agent 按需加载。

### 4.2 Gate 是状态机，不是完成后补写的表格

三道 gate 分别控制 proposition、master 和 delivery。Gate 1 必须有真实的图片角色、brief、方向 preview 和用户选择证据；Gate 2 需要用户批准 master 且没有 P0/P1；Gate 3 只转换已批准 master，并要求对应的可编辑格式。[three gates](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/operations/three-gates.md#L6-L25)

### 4.3 将主观 review 与确定性检查分开

HTML 使用 `data-vds-role`、`data-vds-layer`、`data-vds-action` 和 `data-vds-cause` 暴露结构，validator 检查缺失角色、可疑装饰、文字层级、文字锚点和浮动 polygon window。机器负责发现可确定问题，人工负责主体特异性、关系、材料和 taste。这个边界清楚且诚实。[audit source](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/scripts/audit_html_design.py#L12-L62)

### 4.4 用正反 fixtures 固化真实失败经验

仓库不是只写“应该好看”，而是同时保留 underdesigned/negative 和 crafted/positive fixtures，并断言薄稿失败、完整稿通过。`v32-night-shift-thin` 与 `crafted` 同时经过 execution gate 和 HTML audit，是目前最可信的可运行工程证据。[test entry](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/scripts/test_design_execution.py#L63-L80)

### 4.5 DOM Migrate 对可编辑交付的边界定义得具体

DOM Migrate v3 不声称任意网页无损转换，只针对受控 Victor UI HTML。它把浏览器 DOM/CSS 捕获为 typed IR，再在 Figma 中还原 Auto Layout/Grid、文字、图像、组件和 sizing；复杂效果只在最小层 rasterize。[DOM Migrate README](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/assets/figma-plugins/dom-migrate/README.md#L1-L12)

提交历史还显示它针对真实转换问题逐项修复：字体解析、基线、行内顺序、auto margins、object crop、负边距、组件嵌套、可见画布位置和几何报告。这种“从 fidelity drift 反推 invariant 和测试”的方式很值得工程团队学习。[DOM Migrate v3 rebuild](https://github.com/victorzhang016-code/victor-design/commit/06ef9fb54282b44a859e9662c2ff318a4b80d9ee)；[first-pass quality gate](https://github.com/victorzhang016-code/victor-design/commit/1dbd565f6abb94dc8c3ff3206fb66eefda28a424)

## 5. 必须保留的证据边界

### 5.1 没有公开 demo 或作品 gallery

固定版本的 README、repository tree 和 GitHub metadata 中没有项目主页或 demo URL；仓库主要以技能文档、fixtures、参考板和 Figma plugin 源码交付。[README](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/README.md)；[固定文件树](https://github.com/victorzhang016-code/victor-design/tree/300fda1ef073c35a37701073b5ca1c9743919653)；[GitHub metadata](https://api.github.com/repos/victorzhang016-code/victor-design)

因此不能通过项目自己的在线演示复核响应式、动效、状态完整性或最终 Figma 结果。HTML fixtures 是工程样本，不等于公开案例 gallery。

### 5.2 四轨评测和公开投票声明不可复核

README 声称在一次 recorded four-track evaluation 中胜过七个世界级 design skills，并获得公开投票第一，但没有链接或材料；固定树中也没有评测目录、输入 brief、竞品版本、盲评协议、评分表、原始输出或投票记录。[README 声明](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/README.md#L3-L5)

这项声明可以视为作者自述，不能作为本研究判断视觉质量的独立证据。

### 5.3 benchmark boards 不是作者作品，且许可边界不清

四张板是带有 Pinterest/小红书 UI、水印和下载浮层的外部海报截图拼贴。仓库文档明确要求只提取机制、不复制 motif、palette、font、mascot、layout 或 slogan，并明确说截图权利与作者身份未核验。[benchmark boundary](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/optional/poster-benchmark-boards.md#L53-L66)；[style-evidence 权利声明](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/style-evidence.md#L29-L35)

这里还有一个实际矛盾：`style-evidence.md` 写的是 “the images remain outside the Skill”，但固定版本已经把 `poster-board-1.png` 到 `poster-board-4.png` 放进仓库和 SkillHub source package。[打包的 benchmark assets](https://github.com/victorzhang016-code/victor-design/tree/300fda1ef073c35a37701073b5ca1c9743919653/assets/benchmarks)；[打包提交](https://github.com/victorzhang016-code/victor-design/commit/79ebc14d9e7d2d1b9f87024588b5880eb1560ef2)

MIT 许可证不能自动覆盖这些第三方图片。可学习其观察方法，不应复制、再发布或作为 design-pipeline 内置资产导入。

### 5.4 默认 style evidence 有不可复现的本地来源

`style-evidence.md` 的 source index 引用作者机器上的 `E:\...` 项目路径。外部采用者看不到这些原始设计和工程源，无法验证部分“durable visual grammar”是否准确，也无法复现来源权重。[source index](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/style-evidence.md#L7-L27)

仓库已经建议团队用自己的 approved work 替换默认 evidence，这是正确方向；对公共系统而言，默认层仍应尽量使用可访问、授权清晰、固定 revision 的证据。

### 5.5 数字密度和 action count 可以被 gaming

字体层级、文字锚点和 design actions 是有用的下限，但不是质量分数。项目自己的失败案例写得非常直白：薄稿有 14 个 `data-vds-action`、两个 validator 都 PASS，review 还自评没有 P0/P1，但视觉仍失败。[failed-case admission](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/references/optional/case-night-shift-poster.md#L56-L67)

后续规则通过至少五个 type levels、四个 anchors、benchmark comparison 和 floating polygon 检查让该 fixture 正确失败。这证明 validator 可以被真实失败推动得更好，但也证明新阈值仍然只是 proxy。换一个载体、语言或极简方向，固定数字可能误伤；agent 也可以堆够数量而不产生关系。

### 5.6 项目很新，公开稳定性证据有限

公开提交从 2026-08-10 开始，固定 HEAD 是 2026-08-13；短时间内经历了 light lane 新增后回退、密度方法重写、DOM Migrate v3 重建和 carrier routing 修正。[首个公开提交](https://github.com/victorzhang016-code/victor-design/commit/9246f9e746b8fe6ca8c6fea220205a89a668bb87)；[撤销 light lane](https://github.com/victorzhang016-code/victor-design/commit/8ff6b367dc5c31bcf8bca943a8b09375a30356a5)

快速迭代是优点，也意味着 API、规则和推荐路径仍可能变化。当前没有 release/tag 或 CI workflow 可作为长期兼容性信号。

## 6. 本地验证结果

在固定 revision 的隔离副本中运行：

```text
python scripts/test_design_execution.py
V3 FIXTURES: PASS

python scripts/test_render_artifact_views.py
V3.1 RENDER VIEW TESTS: PASS

cd assets/figma-plugins/dom-migrate
npm ci
npm test
Test Files  9 passed (9)
Tests       25 passed (25)
```

DOM Migrate 测试包含连续两次 Playwright capture 的 typed IR 完全一致、golden PNG SHA-256 一致，以及 grid、inline reading order、baseline、image crop、absolute placement、auto margin 和最小 raster layer 等断言。[capture test](https://github.com/victorzhang016-code/victor-design/blob/300fda1ef073c35a37701073b5ca1c9743919653/assets/figma-plugins/dom-migrate/tests/capture.test.ts#L23-L57)

这些结果证明固定版本的确定性 gate、正反 fixtures 和 DOM capture 工程测试可以运行；它们不证明 Figma 插件在真实 Figma 文档中的全部视觉保真，也不证明审美声明。

## 7. 与 design-pipeline 的对照

design-pipeline 已经拥有不少同类思想，不需要重复移植：

| Victor Design 方法 | design-pipeline 当前状态 | 判断 |
| --- | --- | --- |
| 先做 task/form grounding | `design-synthesis` 已从目标、用户、能力和仓库证据构建 foundation | 已有基础，可加强 carrier counterfactual |
| 2–3 个方向与选择证据 | `direction-preview.json`、preview/selection 两阶段检查 | 已实现，约束更结构化 |
| evidence 而非 preset | source evidence、reference-site、template-evidence、hybrid synthesis | 已实现，不应导入 Victor 私有 style base |
| AI-formula 与 over-restraint 双 veto | `anti-slop-review.md` 已有 over-restraint、cause/effect 和 pattern-density 条款 | 已吸收核心原则 |
| motion 功能与 reduced-motion | 项目 `MOTION.md` + change `motion.md` + primitive registry | 当前边界更系统，不需要改成固定 150–400 ms |
| carrier-specific production | synthesis、component-first 与 host/tool adapters 已分层 | 可继续补充 flat vs stateful delivery profile |
| benchmark 同尺度人工对照 | 有 benchmark/evidence infrastructure，但视觉对照视图仍可更具体 | 值得补充 review protocol |
| full/thumb/copy-hidden/image-hidden/bottom views | 当前有方向 preview、截图和 visual QA，但未形成同样简明的一组诊断视图 | 最值得吸收 |
| same-source image operations / craft family | 当前 anti-slop 能判断无因效果，但图像载体方法不够具体 | 适合作为 image-led profile，不作通用 gate |
| HTML → editable Figma | design-pipeline 有 host/toolchain/provider 边界，没有必要绑定一个 importer | 先作为外部参考；需要真实需求再评估 adapter |

## 8. 建议吸收什么

### 优先级 A：直接吸收方法，不复制资产

1. **在 visual acceptance 中增加多视图 review**：full、thumbnail、copy-hidden、image-hidden、bottom-edge、same-scale reference。每个视图记录 first attention、missing proof、collision、remaining risk。
2. **给重大视觉动作保留 cause/effect 证据**：动作必须同时指向当前主体或参考机制，并说明它让读者理解、感受或完成什么。
3. **为 image-led work 增加 same-source operation 复盘**：先问裁切、分级、遮罩、反射、材质、类型能否与同一素材建立关系，再考虑外部装饰。
4. **按 carrier 设置完成度 profile**：海报、图文、UI、slides 的 density 证据不同；不要让一个数字门槛跨载体通用。
5. **把 benchmark comparison 作为人工 gate 的证据输入**：对比 hierarchy、reading loop、image operation、material relation 和 completion gap，不输出“审美分数”。

这些内容更适合进入规划中的 Design Skill layer 或 visual-acceptance artifact，而不是混入 component-first gate。component-first 只证明 stack、组件、playground、page usage 和 evidence binding，不能声称视觉质量通过。

### 优先级 B：作为工程参考继续观察

- DOM capture → typed IR → host reconstruction → golden comparison 的分层。
- 通过正反 fixtures 把真实失败固化为回归测试。
- flat carriers 与 stateful UI 使用不同交付路线。
- 将 unsupported effects 限制在最小 raster layer，保留主体结构可编辑。

### 不建议吸收

- 四张 benchmark 图片本身，以及任何未核验第三方截图。
- 作者本地 `E:\...` style evidence 或具体 palette、font、motif、person-cover recipe。
- 统一的 5 type levels / 4 anchors / 4 actions 作为跨项目硬质量标准。
- 用 action count、schema completeness、SSIM 或 validator PASS 代替人工视觉判断。
- 在没有真实 Figma 需求、测试文档和许可评估前，把 DOM Migrate 直接变成核心依赖。
- README 中未附原始材料的评测排名作为选型依据。

## 9. 最终判断

Victor Design 的强项不是创造了某种新的视觉流派，而是把优秀设计师常做但很少写清楚的动作显式化：

- 先理解主体与观看任务；
- 先选对载体；
- 从强人工参考中提取机制；
- 让文字、图像、材料和空间形成关系；
- 同时防止模板化和过度克制；
- 在不同视图、不同阶段和可编辑交付中反复核对。

这套方法确实有充分理由比普通“给风格词 → 生成页面”的 agent workflow 产出更完整、更有作者感的结果。它最值得 design-pipeline 学习的是**关系密度、多视图 review、same-source craft 和 carrier-specific acceptance**。

同时，仓库还没有公开提供足以独立验证其宣传排名和整体视觉成效的 gallery/evaluation corpus；参考资产的许可与文档一致性也需要修正。将它定位为“高质量方法样本”，而不是“已经被公开评测完全证明的标准答案”，最符合现有证据。

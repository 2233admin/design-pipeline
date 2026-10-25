# Motion Reference 全站目录与实现导出研究

研究日期：2026-10-14。对象：[TakayuStudio Motion Reference][site]。本笔记只研究公开页面、数据、合并规则、绘制／导出／操作代码；不修改项目行为，不声称已播放全部或任何示例。项目现状另见同目录的 `motion-reference-project-map-2026-10-14.md`。

**范围说明**：本文是“源站静态分析”子报告；下文“未播放”描述该子研究的方法边界。同轮浏览器实测与代表性视觉检查由 [综合报告](motion-reference-internalization-study-2026-10-14.md) §2–§3 单独记录，不与本文静态推导混用。

## 1. 结论与证据边界

- **782 是当前最终可选目录的真实条目数，也是唯一 ID 数**，不是把页面宣传文案抄过来。按首页脚本顺序重放数据与 merge 后得到：`192 + 200 + 191 - 29 + 228 = 782`，64 个最终分类。[S1–S5]
- **228 是新文字引擎的条目数，不是文字导航全部分类的总数**。22 个 `tx-*` 分类合计 **248**，包含 228 个 `engine: "text"` 条目和 20 个保留并改分类的 ATLAS 条目。因此非文字分类为 534，非文字引擎条目为 554，两者不能混用。[S4–S6]
- 当前全部 782 个条目都匹配到绘制引擎：554 个 ATLAS、228 个 TEXTMOTION；页面内仍存在旧 DOM／WAAPI 导出分支，但本次最终目录中 **0 个条目走该分支**。不能用“旧 DOM exporter 会捕获所有动画层”来说明当前全站导出。[S6–S9]
- **不能统一说导出只有主曲线，也不能统一说所有技术标签都完整复现**。ATLAS 的 `seek(t)`／保存 HTML 保留示例绘制逻辑；CSS 和 WAAPI 的目标元素段是主曲线模板；GSAP 有曲线模板或驱动原 `f(g,t)` 的时钟分支；React 是运行原 `f` 的 Canvas 包装。文字引擎的其他技术标签来自逐条 `recipes`，不是 ATLAS 的统一 200px 位移模板。AE 有步骤说明，不是工程文件。[S6–S9]
- 最值得吸收的是“**按问题找例子 → 分析状态与时序 → 可重复 seek → 原速／慢速／逐帧 → 对照时长 → 选择合适技术实现**”。这不是要求把 782 个效果逐一移植，更不是把公开 JS 打包进本项目。[S1、S6、S7]

### 实际做了什么

1. 读取首页 HTML，确认带版本号的实际脚本加载顺序与页脚。
2. 获取相应静态 JS；在隔离的 JavaScript 对象上下文中按首页顺序执行数据声明、绘制注册和合并。Canvas 只提供注册阶段所需的空对象，**未调用绘制／播放进行视觉验证**。
3. 在每个目录变换节点记录数组长度、唯一 ID 数；对最终每个分类计数，区分 `engine`、旧链接 alias 和内部 demo registry。
4. 阅读 `app.js` 的取数、路由、导出选择、互动、对照、逐帧和 onion-skin 分支，以及两个引擎的 exporter。生成并阅读简单、分阶段、网页交互和文字的代表性导出字符串；**未运行导出页面或执行代码示例**。
5. 查阅文字技法指南、两篇站内文字研究及公开页脚／运营者页面。

### 没有证明的事

不证明 782 个演示在浏览器均无错误、不证明所有技术配方在任意版本依赖下可直接运行、不证明 Canvas 与生产 DOM 的视觉等价、不证明交互在键盘／触屏／辅助技术下完整可用，也不证明公开源代码已获再分发授权。内部条目数量不是观看数量。页面或脚本后续更新后，应重新计算，不能把本笔记的数字作为永久常量。

## 2. 数量如何得到

### 2.1 加载、合并与去重

首页相关顺序是：`motions → motion-expansion → atlas-items → atlas-bundle → motion-catalog-ui → motion-catalog-experimental → motion-catalog-experimental-en → motion-base-fixes → motion-runtime → atlas-merge → text/items → text/guides → text/research → text-bundle → text-merge → motion-export → app`。网络／分析脚本不参与目录生成。[S1]

|变换节点|目录长度|唯一 ID|说明|
|---|---:|---:|---|
|`data/motions.js`|192|192|17 个原始分类；注册基础与网页等条目|
|`motion-expansion.js` 后|392|392|新增 200 个按 family＋concept 生成的条目，分类变为 32|
|`atlas-items.js` 与演示注册后|392|392|191 条暂存于 `MOTION_ATLAS_ITEMS`；尚未追加目录；其他注册／修正脚本未改变目录长度|
|`atlas-merge.js` 后|583|583|追加 191；分类变为 44；给既有同类条目设置 `demoId`，不是再次新增条目|
|文字数据与引擎注册后|583|583|228 条暂存于 `TEXT_MOTION_ITEMS`；12 个指南和 2 篇研究不是演示条目|
|`text-merge.js` 后|782|782|删除 29 个重复条目，追加 228；移除旧 `text`／`kinetic-type` 两分类，追加 22 个文字分类：`44 - 2 + 22 = 64`|

上述数值来自脚本重放的观察；表中“解释”来自相应源码。[S2–S5]

核心口径可用以下 JavaScript 表达；这里是计算方法，不是项目测试：

```js
const items = window.MOTION_LIBRARY;
const total = items.length;
const unique = new Set(items.map(item => item.id)).size;
const counts = Object.fromEntries(window.MOTION_CATEGORIES.map(category => [
  category.id, items.filter(item => item.category === category.id).length
]));
const textEngine = items.filter(item => item.engine === "text").length;
const textNavigation = items.filter(item => item.category.startsWith("tx-")).length;
```

`app.js` 的 `motions` 直接取 `window.MOTION_LIBRARY`；`renderNavigation()` 用数组长度和 `category.id` 计数。实际选项没有把 alias 当成独立演示。首页宣传 782／228 与上述口径相符，但导航文字总数 248 是另一个同样正确的口径。[S1、S6]

### 2.2 重叠与变体边界

- `atlas-merge` 的 `SAME_AS_ATLAS` 把既有如 `hover-lift`、`typewriter`、`shared-element` 指到 ATLAS demo；**视觉实现映射不是额外计数**。[S3]
- `text-merge` 删除 29 条旧演示并建立旧 ID → 新 `tx-*` ID 的 alias。例如 `typewriter → tx-typewriter`、`word-swap → tx-vertical-word-roll`、`stagger-letters → tx-fade-up-chars`。这些旧链接保留解析能力，不再出现在 selectable inventory 中。[S5、S6]
- 20 条保留旧文字演示只改 `category`，不改为文字引擎。例：`line-by-line` 在 `tx-reveal`，`ty-slam` 在 `tx-emphasis`，`catalog-kinetic-type-variable-font-pulse` 在 `tx-variable`。**同一文字分类中可以有不同 exporter。**[S5、S6]
- ATLAS registry 有 583 个定义；29 个已从目录移除的文字重复定义仍在 registry。TEXTMOTION registry 为 228。因此 `583 + 228 = 811` 是内部 registry 数量，**不是站点可选演示数量**。[S5、S7]
- 扩展的 200 条不是“200 × 5 个配方”。`allFamilies` 有 15 个 family，每个 concept 生成一个 `catalog-${family.id}-${concept.key}`。`precise/spring/impact/luminous/kinetic` 五种 treatment 由规则为 concept 选择，不展开成五条；`catalogAction` 是 concept 索引，不是交互状态数。速率、语言、示例文字、对照参数、不同 exporter 也不增加 ID。[S2]
- 本次重放最终 `total === unique === 782`，说明没有重复 ID。**不等于 782 种互不相似的视觉原理**；相近效果可跨用途分类存在，不能宣称已做全站感知层面的语义去重。

## 3. 全分类目录与可复用设计问题

首页导航是以普通分类为主的列表，文字部分有显式 `group: "text"` 标题和技法指南入口；**下面的八个非文字“大组”是本笔记的查阅分组，不是网站已定义的八层级 taxonomy**。实际 ID、分类名、数量来自最终数据；“值得吸收的问题”是对元数据／源码的研究归纳，不是逐项播放评测。[S2–S6]

### 3.1 非文字导航：42 分类，534 条

每个代表链接使用网站真实分享格式 `#motion=ID`。[S6]

|查阅大组|实际分类 ID／分类|数量|代表条目|值得吸收的问题|
|---|---|---:|---|---|
|基础原理|`principles`／Principles|17|[squash](https://motion-reference.takayustudio.jp/#motion=squash)|把挤压、预备动作、跟随、弧线等拆成因果，不只选 easing 名|
|基础原理|`easing`／Easing|25|[e-linear](https://motion-reference.takayustudio.jp/#motion=e-linear)|同起止状态比较速度分布；区分曲线形状与位移轨迹|
|基础原理|`spring`／Springs|16|[s-snap](https://motion-reference.takayustudio.jp/#motion=s-snap)|刚度、阻尼、质量影响反弹与稳定时间；不是任意延长时长|
|基础原理|`timing`／Timing & Rhythm|15|[t-size](https://motion-reference.takayustudio.jp/#motion=t-size)|时长、停留、尺寸、错峰如何形成轻重与节奏|
|基本运动|`entrance`／Entrance & Exit|11|[fade-slide](https://motion-reference.takayustudio.jp/#motion=fade-slide)|信息进入／退出的方向、透明度和读得清的最终状态|
|基本运动|`move`／Movement|11|[linear-travel](https://motion-reference.takayustudio.jp/#motion=linear-travel)|运动路径、距离、端点和速度分别控制|
|基本运动|`scale`／Scale|11|[pop-scale](https://motion-reference.takayustudio.jp/#motion=pop-scale)|以尺度表达出现、按压、强调，保留清晰落点|
|基本运动|`rotate`／Rotation|11|[simple-turn](https://motion-reference.takayustudio.jp/#motion=simple-turn)|轴心与角度含义；避免无意义翻转文字|
|基本运动|`reaction`／Bounce & Reaction|11|[overshoot](https://motion-reference.takayustudio.jp/#motion=overshoot)|越过目标、回弹、衰减分阶段，不能当一次匀速插值|
|基本运动|`collection`／List & Grid|12|[list-stagger](https://motion-reference.takayustudio.jp/#motion=list-stagger)|错峰的阅读顺序和整组总时长；元素变多不能无界拖长|
|基本运动|`attention`／Attention & Emphasis|12|[nudge](https://motion-reference.takayustudio.jp/#motion=nudge)|提醒频次与强度；把注意力与持续干扰分开|
|基本运动|`light`／Light & Glow|12|[glow-pulse](https://motion-reference.takayustudio.jp/#motion=glow-pulse)|光扫、轮廓和余辉的时间层次；状态不能只依赖发光|
|基本运动|`effect`／Effects & Transitions|12|[blur-zoom](https://motion-reference.takayustudio.jp/#motion=blur-zoom)|复合特效先确定信息层次和恢复可读的时刻|
|镜头与转场|`transitions`／Transitions|25|[tr-cut](https://motion-reference.takayustudio.jp/#motion=tr-cut)|切、擦、遮罩、共享元素等不同连续性策略|
|镜头与转场|`camera`／Camera|18|[cam-pushin](https://motion-reference.takayustudio.jp/#motion=cam-pushin)|相机移动不同于对象移动；视线、深度与晕动风险|
|网页|`web-scroll`／Web Scroll|12|[scroll-reveal](https://motion-reference.takayustudio.jp/#motion=scroll-reveal)|滚动进度、触发播放与固定段落不是同一模型|
|网页|`web-interaction`／Web Interaction|15|[hover-lift](https://motion-reference.takayustudio.jp/#motion=hover-lift)|反馈紧邻输入；hover 演示不替代键盘和触屏状态|
|网页|`web-layout`／Layout & Navigation|19|[shared-element](https://motion-reference.takayustudio.jp/#motion=shared-element)|身份连续、重排与导航前进／返回方向|
|网页|`web-feedback`／Loading & Data|12|[skeleton-shimmer](https://motion-reference.takayustudio.jp/#motion=skeleton-shimmer)|不把未知进度画成确定值；等待与完成区分|
|网页|`form-state`／Forms & State|8|[floating-label](https://motion-reference.takayustudio.jp/#motion=floating-label)|标签、验证、成功／错误反馈不得牺牲可读性|
|网页|`gesture`／Gesture & Mobile|8|[swipe-dismiss](https://motion-reference.takayustudio.jp/#motion=swipe-dismiss)|跟手、阈值、释放／取消状态，需要真实输入逻辑|
|网页|`svg-path`／SVG & Path|12|[svg-stroke-draw](https://motion-reference.takayustudio.jp/#motion=svg-stroke-draw)|路径描边、形变、沿轨道移动是不同实现技术|
|控件|`ui-button`／UI Buttons|22|[catalog-ui-button-bounce-press](https://motion-reference.takayustudio.jp/#motion=catalog-ui-button-bounce-press)|按下与反应同帧开始；连续按压不被余韵阻挡|
|控件|`ui-control`／Selection & Controls|14|[catalog-ui-control-spring-switch](https://motion-reference.takayustudio.jp/#motion=catalog-ui-control-spring-switch)|选择前后位置关系、形状和键盘反馈|
|控件|`ui-navigation`／Navigation & Overlays|6|[catalog-ui-navigation-hero-expand](https://motion-reference.takayustudio.jp/#motion=catalog-ui-navigation-hero-expand)|前后层级、共同元素、焦点移交分开处理|
|控件|`ui-loading`／Loading & Progress|10|[catalog-ui-loading-bouncing-dots](https://motion-reference.takayustudio.jp/#motion=catalog-ui-loading-bouncing-dots)|有／无实际进度的区别；常驻循环面积和成本|
|控件|`ui-feedback`／Feedback & Reactions|8|[catalog-ui-feedback-heart-burst](https://motion-reference.takayustudio.jp/#motion=catalog-ui-feedback-heart-burst)|反馈起点接近原因，成功／失败不用颜色独占|
|游戏|`game-hud`／Game HUD|12|[catalog-game-hud-hp-ghost-bar](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-hp-ghost-bar)|即时真实值与延迟表现值分离；周边视野可读|
|游戏|`game-combat`／Combat & Hit FX|8|[catalog-game-combat-damage-numbers](https://motion-reference.takayustudio.jp/#motion=catalog-game-combat-damage-numbers)|命中帧、力度、衰减，以及连续伤害数字的遮挡|
|游戏|`game-reward`／Rewards & Loot|10|[catalog-game-reward-level-up](https://motion-reference.takayustudio.jp/#motion=catalog-game-reward-level-up)|稀有度对应预备／停留层次；跳过也保留结果|
|游戏|`game-progress`／Progression & Quests|9|[catalog-game-progress-quest-banner](https://motion-reference.takayustudio.jp/#motion=catalog-game-progress-quest-banner)|当前值、增量、目标的连续叙事；支持短版|
|游戏|`game-cinematic`／Game Cinematics|8|[catalog-game-cinematic-lucky-roulette](https://motion-reference.takayustudio.jp/#motion=catalog-game-cinematic-lucky-roulette)|失去操作控制的时间边界；警告／标题的清晰静止帧|
|游戏|`game-impact-fx`／Game Impact FX|20|[catalog-game-impact-fx-hit-stop](https://motion-reference.takayustudio.jp/#motion=catalog-game-impact-fx-hit-stop)|冲击原因、峰值、hit-stop、恢复时序；闪白不能无界叠加|
|高级表达|`ui-spatial`／Spatial UI & Depth|20|[catalog-ui-spatial-cursor-depth-pull](https://motion-reference.takayustudio.jp/#motion=catalog-ui-spatial-cursor-depth-pull)|深度与层级一致，透视过程中维持阅读|
|高级表达|`ui-material`／Material & Surface Motion|20|[catalog-ui-material-liquid-tab-bridge](https://motion-reference.takayustudio.jp/#motion=catalog-ui-material-liquid-tab-bridge)|形变和复原速度体现材质；绘制成本不等于交互价值|
|高级表达|`data-story`／Data Storytelling|23|[catalog-data-story-sankey-flow](https://motion-reference.takayustudio.jp/#motion=catalog-data-story-sankey-flow)|流量、增减、对比和不确定性要保留真实数据含义|
|环境／内容|`particles`／Particles|8|[pt-confetti](https://motion-reference.takayustudio.jp/#motion=pt-confetti)|发射、运动、寿命、消散独立；数量和遮挡控制|
|环境／内容|`loops`／Loops & Ambient|7|[lp-seamless](https://motion-reference.takayustudio.jp/#motion=lp-seamless)|循环接缝与环境节奏，不把持续运动用于正文|
|环境／内容|`character`／Character|7|[ch-walk](https://motion-reference.takayustudio.jp/#motion=ch-walk)|姿势、重心和跟随；生命感不是只加 bounce|
|环境／内容|`look`／Texture & Look|10|[lk-grain](https://motion-reference.takayustudio.jp/#motion=lk-grain)|纹理、色散、颗粒和主体运动分层理解|
|环境／内容|`depth3d`／3D|3|[3d-cube](https://motion-reference.takayustudio.jp/#motion=3d-cube)|用示例解释轴与深度，不能当完整三维场景库|
|环境／内容|`sound`／Sound Sync|4|[sd-cues](https://motion-reference.takayustudio.jp/#motion=sd-cues)|节拍／提示同步与视觉信息独立；分类不证明真实音频播放|

查阅大组合计：基础原理 73、基本运动 103、镜头与转场 43、网页 86、控件 60、游戏 67、高级表达 63、环境／内容 39；总计 534。

### 3.2 文字导航：22 分类，248 条；新文字引擎为 228 条

“最终”列对应网站导航分类数量；“新文字”列对应 `engine: "text"`／`TEXT_MOTION_ITEMS` 数量。两列差额合计 20。代表链接均选新文字条目，避免把旧 ATLAS 导出误当文字配方。[S4–S6]

|分类 ID／分类|最终|新文字|代表条目|有意义的子问题／可复用 lesson|
|---|---:|---:|---|---|
|`tx-reveal`／Reveal|19|16|[tx-fade-up-chars](https://motion-reference.takayustudio.jp/#motion=tx-fade-up-chars)|逐字、逐词、逐行入场：单位决定节奏，长文字限制总时间|
|`tx-exit`／Exit|9|9|[tx-char-exit-up](https://motion-reference.takayustudio.jp/#motion=tx-char-exit-up)|退场方向与完成状态；离开后不能仍是可操作内容|
|`tx-emphasis`／Emphasis|14|11|[tx-bump-wave](https://motion-reference.takayustudio.jp/#motion=tx-bump-wave)|关键词、下划线、标记、局部冲击：强调不能破坏正文阅读|
|`tx-swap`／Swap|12|10|[tx-split-flap](https://motion-reference.takayustudio.jp/#motion=tx-split-flap)|词替换、翻牌、滚动：旧／新内容和占位尺寸分开设计|
|`tx-typing`／Typing & Decoding|12|11|[tx-typewriter](https://motion-reference.takayustudio.jp/#motion=tx-typewriter)|顺序打字与随机解码不同；保留最终文本的可访问副本|
|`tx-physics`／Glyph Physics|12|9|[tx-drop-bounce-in](https://motion-reference.takayustudio.jp/#motion=tx-drop-bounce-in)|落下、碰撞、磁吸与惯性：字符身份和稳定终点|
|`tx-path`／Path & Shape|9|9|[tx-circular-text-spin](https://motion-reference.takayustudio.jp/#motion=tx-circular-text-spin)|圆周／路径文字、形状布局；沿路径位置与字形朝向分开|
|`tx-mask`／Mask & Clip|12|12|[tx-line-mask-rise](https://motion-reference.takayustudio.jp/#motion=tx-line-mask-rise)|逐行／逐字裁切，遮罩边缘与字形运动不是同一层|
|`tx-color-light`／Colour & Light|12|12|[tx-shiny-sweep](https://motion-reference.takayustudio.jp/#motion=tx-shiny-sweep)|扫光、渐变、描边：动效过程中仍需对比度|
|`tx-blur`／Blur & Focus|9|9|[tx-text-generate](https://motion-reference.takayustudio.jp/#motion=tx-text-generate)|模糊消解与焦点转移；什么时候可读比峰值特效重要|
|`tx-glitch`／Distortion & Glitch|8|8|[tx-rgb-split-glitch](https://motion-reference.takayustudio.jp/#motion=tx-rgb-split-glitch)|色偏、错位、断裂的短时窗口；避免闪烁持续循环|
|`tx-depth`／3D & Depth|10|9|[tx-flip-up-3d](https://motion-reference.takayustudio.jp/#motion=tx-flip-up-3d)|字形翻折、深度；透视不能成为读字障碍|
|`tx-variable`／Variable Fonts|9|8|[tx-weight-wave](https://motion-reference.takayustudio.jp/#motion=tx-weight-wave)|字重／宽度等轴变化；需匹配字体轴而非假定全字体支持|
|`tx-scroll`／Scroll|13|12|[tx-scroll-word-highlight](https://motion-reference.takayustudio.jp/#motion=tx-scroll-word-highlight)|逐词高亮、章节、滚动擦显；滚动位置不是自动计时|
|`tx-pointer`／Pointer|9|9|[tx-magnetic-letters](https://motion-reference.takayustudio.jp/#motion=tx-magnetic-letters)|磁吸、局部响应；指针演示需额外键盘／触摸策略|
|`tx-counter`／Numbers & Data|9|8|[tx-count-up](https://motion-reference.takayustudio.jp/#motion=tx-count-up)|计数、里程表、数字位变动；最终真实值与中间显示值分开|
|`tx-caption`／Captions & Subtitles|13|12|[tx-pop-on-subtitle](https://motion-reference.takayustudio.jp/#motion=tx-pop-on-subtitle)|字幕切换、逐词提示、阅读停留；受内容时码约束|
|`tx-layout`／Layout & Reflow|10|8|[tx-fit-text-title](https://motion-reference.takayustudio.jp/#motion=tx-fit-text-title)|拟合、断行、重排；动态内容长度不是固定画布尺寸|
|`tx-loop`／Loops & Decoration|8|8|[tx-wave-loop](https://motion-reference.takayustudio.jp/#motion=tx-wave-loop)|连续波动和装饰循环；有停止和静态替代|
|`tx-japanese`／Japanese|14|14|[tx-bunsetsu-reveal](https://motion-reference.takayustudio.jp/#motion=tx-bunsetsu-reveal)|文节、竖排、ruby、日文标点、日拉混排：不能硬套空格切词|
|`tx-title`／Titles & Film|13|12|[tx-tracking-in-contract](https://motion-reference.takayustudio.jp/#motion=tx-tracking-in-contract)|标题字距、片头、电影节奏；动后有足够读字静止段|
|`tx-broadcast`／Broadcast & Telop|12|12|[tx-lower-third](https://motion-reference.takayustudio.jp/#motion=tx-lower-third)|lower-third、电视字幕、信息条：区域、层级、入退场和停留|

文字的关键横向维度不止效果名：**拆分单位 → 阅读次序 → 字体与语言 → 开始／错峰／停留／退出 → 语义可访问文本 → 输入／时码／滚动约束**。这些维度可以成为以后原创适配的描述语言，不能仅收集英文 effect 标签。[S4、S10]

### 3.3 演示之外的文字学习内容

`TEXT_GUIDES` 有 **12** 个指南：`splitting`、`timing-readability`、`easing-for-text`、`accessibility`、`japanese`、`css-only`、`js-libraries`、`after-effects`、`remotion-video`、`canvas-webgl-svg`、`checklist`、`glossary`。覆盖拆字、可读时长、曲线、辅助技术／减弱动效、日文、CSS、JS、AE、视频、绘制技术、出货检查和术语。[S10]

`TEXT_RESEARCH` 有 **2** 篇站内研究：`web`（Web／代码实现栈、原生 CSS、工程和可访问性）及 `motion`（AE、影视／电视、日文、阅读时序）。它们是站方的研究汇总，不等于本文已重新核验其引用的每个第三方来源，亦不计入 782。不要忽略这部分只拿 228 个效果截图。[S11]

## 4. 当前导出语义：必须按引擎、条目和代码分支判断

### 4.1 分发链

`implementationSnippets(item)` 先用 `atlasDemo(item)` 找到对应绘制定义：文字条目走 `TEXTMOTION`，其他走 `ATLAS`。文字返回 `{ ...item.recipes, seek: TEXTMOTION.seekSource(demo), ae: 本地化步骤 }`；ATLAS 返回 `ATLAS.snippets(...)`；只有找不到绘制定义时才回落到 `MotionExport.snippets(item)`。[S6]

保存 HTML 则是另一条链：`MotionExport.download()` 优先调用文字 `documentFor`，其次 ATLAS `documentFor`，最后 DOM `documentFor`。**“HTML tab”与“保存 HTML 按钮”不等价**：文字条目当前没有 HTML／React tab，但仍可以保存再现 HTML。[S6、S9]

### 4.2 当前能力对照

|入口|554 个当前 ATLAS 条目|228 个新文字条目|适配时必须保留的边界|
|---|---|---|---|
|`seek(t)`|原 `f(g,t)` 和被依赖的示例 helpers，逻辑坐标 320×200|原 `f(g,t,o)` 和 helpers；`o.text` 等选项影响画面|原始绘制逻辑，不是生产 DOM 状态机；仍依赖核心绘制函数，单 tab 不等于完整独立页面|
|HTML／保存 HTML|包含核心库、helper、该 demo 函数、Canvas、rAF 时钟、重播、减弱动效静止帧|保存当前文本选项，等待字体 ready，Canvas、同一绘制函数、重播和静止帧；有外部 Google Fonts 链接|完整的是示例画面逻辑；字体／环境可影响像素，不是原产品交互或完全离线资源包|
|CSS|统一目标 `.target` 的 transition／animation 时长与曲线建议；不提供全示例层的 keyframes|仅存在对应 `recipes.css` 时显示；按具体效果写法|ATLAS 模板的 `animation: motion` 不随该 tab 生成全套 `@keyframes motion`；需自己实现目标状态|
|WAAPI|统一 0→200px 的目标段；非 spring 分支另给使用原 `f` 的 Canvas rAF 示例|按条目 `recipes.waapi`，有该字段才显示|目标段不是多层示例；不能把额外 f 时钟段解释为 WAAPI 编译了全部图层|
|GSAP|Bezier 分支含 CustomEase 的目标段及驱动 `f` 的时钟；无 bezier／spring 时直接给 `f` 时钟；spring 分支给采样 CustomEase／Motion spring 建议|按条目 `recipes.gsap`；可为文字错峰／字形／时间线实现|驱动同一 f 可保留示例时序，但依赖 f、绘制 helper 和 Canvas 环境；目标段／spring 建议不等价全场景|
|React|`useEffect/useRef` 的 Canvas 时钟包装，调用原 f；销毁取消 rAF，paused／reduce 使用静止时刻|当前文字 tab 没有 React；可有名为 Motion／Remotion 的专属配方|不是 React DOM 组件翻译；不要把 Motion／Remotion 写成 React tab 已覆盖|
|AE|非文字详情的 `item.recipe` 指南，界面根据用途可称 AE 或网页实现；不是统一 AE exporter|136 项有 `recipes.ae`，在 tab 中作为 After Effects 步骤显示|无 `.aep`、无项目／关键帧批量导出证明；软件步骤仍需实际制作|

以上来自当前源码，不是历史印象。[S6–S9]

#### ATLAS 曲线和时长的细节

- `snippets` 使用 `item.motionDuration || demo.dur * 1000` 作为目标元素模板时长；HTML／原 f 播放以 `demo.dur` 为循环周期。
- `atlas-merge` 在没有 `motionDuration` 时保存原 `duration`，再以 `demo.dur * 1000` 替换条目循环时长。原动作时长与循环／停留时长并非一回事。
- 可取得 cubic-bezier 时使用该曲线；spring 用 **41 点**采样的 CSS `linear()` 近似；无两者时模板给默认 `cubic-bezier(0.16,1,0.3,1)`，并备注不同区间使用不同曲线。
- 这说明主曲线模板确实存在，但主要适用于 **ATLAS 目标元素段**。页面非文字统一提示“CSS・WAAPI・GSAP 是主曲线模板”也不足以概括 GSAP 中驱动原 f 的时钟段，更不足以概括新文字配方。[S3、S6、S7]

#### 新文字配方的实际覆盖

静态统计 `TEXT_MOTION_ITEMS[].recipes` 的字段出现次数如下；**一项可以有多个字段，不能相加当条目数**。英语 AE 步骤 `aeEn` 是同 136 项的本地化，不增加覆盖数。[S4]

|配方字段|有该字段的条目数|
|---|---:|
|CSS|201|
|GSAP|132|
|WAAPI|47|
|Motion|46|
|Remotion|27|
|SVG|28|
|Canvas|39|
|AE／AE English|136／136|

文字 `renderImplementationCode()` 的提示把其他 tab 称为各工具的 working implementations，AE 称步骤；本文核对的是**字段与代码语义**，并没有据此宣布 201 个 CSS 配方都经过运行验证。[S6]

### 4.3 四种代表性源码对照，而不是四项代表全站

1. **简单出入场：[fade-slide](https://motion-reference.takayustudio.jp/#motion=fade-slide)**。其 ATLAS `seek` 导出对应示例函数；CSS tab 仍是统一 `.target` 曲线骨架，WAAPI 目标段仍是 200px 位移。即使简单示例也不能假定模板中的位移等于原绘制几何。[S7]
2. **分阶段：[catalog-game-hud-hp-ghost-bar](https://motion-reference.takayustudio.jp/#motion=catalog-game-hud-hp-ghost-bar)**。源码 `hit = .6`，真实 HP 在命中时由 1 跳到 .58；ghost 在 1.0→1.5 秒才从 1 到 .58；2.3→2.7 秒恢复。另有短时震动、差额标签和即时／拖尾的时间图。`f(g,t)`／HTML 保留这些段；单个 200px WAAPI 目标段不能表达它们。对产品的可复用 lesson 是真实值立即更新、显示拖尾延后追随；示例的固定命中／恢复时间不是游戏事件逻辑。[S7]
3. **互动用途：[hover-lift](https://motion-reference.takayustudio.jp/#motion=hover-lift)**。详情互动模式将拖拽／滚轮／指针位置转成进度，改变暂停动画的 `currentTime`。ATLAS HTML 保存的仍是定时循环和重播按钮，没有复制这套事件绑定，更没有自动生成真实 hover、drag、scroll 的完整组件。[S6、S7、S9]
4. **文字：[tx-fade-up-chars](https://motion-reference.takayustudio.jp/#motion=tx-fade-up-chars)**。seek 包含字符布局、随字符数调整的错峰、绘制基线和教学刻度。其 CSS 配方则用可访问文本副本、`aria-hidden` 的字形 spans、按 `--i` 延迟、入场位移／透明度；GSAP 用具体字符动画；AE 给 Position／Opacity 与 Range Selector 步骤。它们是针对这个效果的不同工具实现，不是 ATLAS 的统一目标段，也未承诺保留 Canvas 教学刻度、退场、所有长文本布局细节。[S4、S8]

因此正确区分是：**再现示例画面、实现某个文字效果、提供曲线／技术骨架、实现产品交互**。这四件事不是同义词。

### 4.4 页面内仍在的 DOM 捕获 exporter

`motion-export.js` 的旧分支会构造隐藏 stage，调用 `buildAnimations`，捕获每个 animation 的 target、keyframes 和 timing，而不是只抄一条曲线；WAAPI 重建所有 tracks，GSAP 用时钟推进这些 WAAPI tracks，React 重建固定 markup 和 tracks，并附取消逻辑。[S9]

该分支也明确写出限制：CSS segment easing 不能精确表达 WAAPI 的 outer timing easing，因此非 linear outer easing 的 track 提示使用 WAAPI／HTML 获得精确时间插值。**本次目录中它没有 selectable caller**，所以应记录为存在的旧／回落实现，而非将其当“782 个示例的当前导出能力”。未删除、未改写任何该代码。[S6、S9]

## 5. 调参、逐帧、onion-skin 的教学方法

### 5.1 先按用途选，再改变一个可控变量

页面同时按名称／关键词、感触、用途、时长等筛选；详情给触发、减弱动效、观察点、注意、曲线、制作建议。扩展条目的 `categoryTips` 尤其强调重复输入、读得清的停留、数值真实性和游戏命中因果。这比把所有问题转换为“哪个 easing 最好”更完整。[S1、S2、S6]

对照实验的 A 是当前示例，B 可选同分类另一个示例；B 的 duration 重置为当前条目时长，用户再调整。**比较不同动作且同时改时间不是严格的单变量实验**，教学使用应说明改了什么，不把视觉偏好当通用定律。[S6]

### 5.2 当前全站的调参范围比表面控件少

代码里有时长、振幅、stagger、easing 的 override，但 `atlasDemo(item)` 成立时隐藏 `.tuning-extra`；当前 782 条全都匹配绘制引擎，`buildAnimations` 的对应分支只通过 `timeScale` 使用 `overrides.duration`，忽略振幅／stagger／easing overrides。

因此本次目录的 A/B 学习重点是**换同类示例与拉伸整体周期**，不能宣称全站任意条目都可实时编辑振幅、错峰、easing。旧 DOM 分支才消费这些额外参数。[S6]

### 5.3 时间确定性提供可检查的画面

- ATLAS 以时间秒数 `t` 决定绘制；文字以 `t` 和文本选项 `o` 决定绘制。相同输入可以 seek 到相同示例状态。这里是示例绘制确定性，不意味着真实产品输入也天然确定。[S7、S8]
- 详情有 0.25×、0.5×、1× 播放速度，以及暂停／timeline seek；快捷键 `,`／`.` 的 `stepDialog` 每次推进／回退 **1000/30 ms**。这是工具的 30fps 步长，不证明示例或实际产品按 30fps 运行。[S1、S6]
- 两个 Canvas 引擎的 onion-skin 把当前时间之前 **4 个采样时刻**叠加，偏移分别为 `4/12, 3/12, 2/12, 1/12` 秒，使用模周期回绕和逐层透明度。**并非实际刚渲染的四帧，也不是按当前设备帧率取样**。跨循环接缝时会叠到上个周期末尾，需要注意解释。[S7、S8]
- 旧 DOM onion-skin 则复制多层 stage，在全周期各进度冻结，方法不同；本次最终目录使用 Canvas 方法。[S6]
- 多关键帧的 easing 图注明是整个速度变化的示意，不是每个图层／每个子阶段的准确曲线。观察原速、停留、事件点与时间图比只看单曲线更可靠。[S1]

### 5.4 静态研究能够支持的学习流程

适合吸收的过程是：选具体场景 → 记下触发和实际状态 → 先看原速的功能意义 → 慢速分出起点／峰值／稳定 → seek／逐帧定位因果与衔接 → 用 onion-skin看路径和间距 → 比较同类的时长 → 区分工具配方与产品实现。

这是一条**适配方法建议**，并非本次已实施的新项目流程或验收门禁。连续输入、打断、真实数据和焦点行为必须在我们的原创实现中单独设计与实测；示例播放、HTML 再现或“working implementation”标签不能替代它们。

## 6. 来源、许可和复制边界

### 6.1 观察到的来源声明

首页页脚写明运营者为“たかゆ / TakayuStudio”，日文目的为“映像・UI・アニメーション制作で動きを設計するための、オリジナルデモによる個人学習用リファレンス”，即使用原创演示帮助设计动作的个人学习参考。[S1]

但条目来源不全是一个来源标签：本次最终目录字段统计有 72 条 `HapticLab着想・Web再構成`、121 条 `オリジナルWebデモ`、179 条 `MOTION ATLAS`、228 条 `テキストモーション`，182 条该标签字段未定义。标签分布不是版权归属证明，也不是独立目录计数；不能仅凭页脚把所有素材／灵感归成我们可自由复制的原创作品。[S2–S4]

### 6.2 尚未获得的权利信息

本次查阅的 Motion Reference 首页 footer／实际链接与这些公开 JS 未提供可确认覆盖整个目录、源代码、文字内容、字体、演示素材的开放许可证。首页没有链接到明确的站点使用条款或再分发许可；运营者公开主页查阅也未得到一份覆盖本参考库的授权文本。**结论是授权范围未确认，不是“无版权”、不是“开源”，也不是断言网站禁止所有利用。**[S1、S12]

保存 HTML／复制代码按钮是站点功能，不自动证明将代码、演示、翻译、截图批量分发进我们项目或公开库的许可。文字保存 HTML 又包含 Google Fonts 资源链接；离线打包或更换字体还涉及各字体具体许可，本次没有逐字体许可审查。[S8、S9]

### 6.3 对本项目的实际边界建议

|用途|本次可以支持的做法|不能由本次证据推出|
|---|---|---|
|内部理解／场景索引|记录事实、分类、短描述、代表 ID 和原站链接；注明研究日期与来源|镜像全站文本／示例素材天然获得许可|
|原创适配|借鉴状态拆分、时序、选择方法；以本项目真实 DOM、事件和数据重新实现|原站 seek／HTML 等于可直接嵌入生产代码|
|复制代码／截图／演示再发布|先确认具体授权、来源链、依赖许可与署名要求|“网页可访问／按钮可复制”就是开源许可证|
|全站素材库|先有授权再谈导入范围|把 782 作为必须全部打包的实施范围|

本次笔记是事实研究与方法归纳，不导入上游 JS、不复制整个配方库、不建立批量下载资产。具体法务结论与授权沟通不在本次研究能力范围内。

## 7. 可给后续设计工作的稳定知识

1. 目录应以**产品问题／动作意义**查阅，不能只按 easing 名查找。
2. 每项参考要区分真实状态、显示状态、事件点、运动阶段、停留、循环与退出。HP 拖尾只是这一模型的一个例子，并非全站唯一值得借鉴的模式。
3. 多层／多阶段表达宜通过时间确定的最小可观察模型理解；再落到合适的 CSS／WAAPI／GSAP／Canvas／文字／视频工具，不要求同一实现技术覆盖所有 family。
4. 文字是一个有 22 个子类、语言／可访问性／工具指导的独立领域，不是“普通 transform 加 stagger”就能概括。
5. 对照学习必须说明可调范围、时长单位与采样步长；工具提供的暂停／onion-skin不等于已经证明生产交互正确。
6. 再现参考、原创改写与复制再分发必须分别处理。下一步若需要实现，应先结合项目既有架构和真实场景决定范围；本次不作行为 cutover。

## 8. 一手来源索引

以下链接为本次实际读取的公开一手资料；编号供上述章节定位。版本 query 来自首页，不是本项目依赖版本。

- **S1** [首页／实际脚本顺序／导航文案／footer][site]。
- **S2** [基础目录 `motions.js`](https://motion-reference.takayustudio.jp/data/motions.js?v=20260925-1)；[扩展目录与 treatment 生成 `motion-expansion.js`](https://motion-reference.takayustudio.jp/data/motion-expansion.js?v=20260815-3)。
- **S3** [ATLAS 新增目录 `atlas-items.js`](https://motion-reference.takayustudio.jp/data/atlas-items.js?v=20261011-1)；[ATLAS 合并与时长处理 `atlas-merge.js`](https://motion-reference.takayustudio.jp/data/atlas-merge.js?v=20261012-1)。
- **S4** [文字分类、228 条目、配方与合并映射 `text/items.js`](https://motion-reference.takayustudio.jp/data/text/items.js?v=20261012-1)。
- **S5** [文字去重、alias、保留分类和追加 `text-merge.js`](https://motion-reference.takayustudio.jp/data/text-merge.js?v=20261012-1)。
- **S6** [应用入口、计数、路由、导出分发、互动、对照和时间工具 `app.js`](https://motion-reference.takayustudio.jp/assets/app.js?v=20261012-1)。关键符号：`renderNavigation`、`atlasDemo`、`engineOf`、`implementationSnippets`、`renderImplementationCode`、`buildAnimations`、`toggleInteractiveMode`、`renderComparisonLab`、`playComparison`、`stepDialog`、`renderOnionSkin`。
- **S7** [ATLAS 注册、绘制和 exporter `atlas-bundle.js`](https://motion-reference.takayustudio.jp/assets/atlas-bundle.js?v=20261011-1)。关键符号：`draw`、`Clip`、`stillTime`、`snippets`、`standaloneScript`、`documentFor`；同时读取实际加载的 [UI demo 定义](https://motion-reference.takayustudio.jp/assets/motion-catalog-ui.js?v=20260925-1)、[实验 demo 定义](https://motion-reference.takayustudio.jp/assets/motion-catalog-experimental.js?v=20260925-1)、[实验英文元数据](https://motion-reference.takayustudio.jp/assets/motion-catalog-experimental-en.js?v=20260925-1)、[基础修正](https://motion-reference.takayustudio.jp/assets/motion-base-fixes.js?v=20260925-1)。
- **S8** [文字绘制与导出 `text-bundle.js`](https://motion-reference.takayustudio.jp/assets/text-bundle.js?v=20261012-2)。关键符号：`seekSource`、`helpersFor`、`optsFor`、`standaloneScript`、`documentFor`、`draw`。
- **S9** [HTML 下载分发和旧 DOM 导出 `motion-export.js`](https://motion-reference.takayustudio.jp/assets/motion-export.js?v=20261012-1)；[旧 timeline 编译 `motion-runtime.js`](https://motion-reference.takayustudio.jp/assets/motion-runtime.js?v=20260925-1)。
- **S10** [12 个文字技法指南 `text/guides.js`](https://motion-reference.takayustudio.jp/data/text/guides.js?v=20261012-1)。
- **S11** [2 篇站内文字研究 `text/research.js`](https://motion-reference.takayustudio.jp/data/text/research.js?v=20261012-1)。
- **S12** [运营者公开主页](https://takayustudio.jp/)。没有把运营者其他课程、产品、参考站或第三方教程算入本次 Motion Reference 目录。

[site]: https://motion-reference.takayustudio.jp/

# 珐琅徽章：提示词、执行轨迹与失败复盘

日期：2026-10-06。用户反馈：**“这几个效果我都挺不满意的”**。当前五份可查看作品均未获视觉接受；数字评分仍未填写。本次只复盘徽章，没有追加模型制作、重新导出或修改原模型作品。

结论：我设计的实验把可运行、交互接口和整段视频作为主要硬条件，缺少先对齐参考几何与材质的前置验收。工具组又被强制送进 `web / quick / freeform`，没有完整执行图形路由的要求。模型各自猜测圆环、嵌片、灯光和色彩参数，工程检查仍允许这些画面通过。当前结果说明这条实际执行的流程没有满足用户的复刻需求，不能据此宣布工具提高了画质。

以下是**依据提示、公开工具调用、源码和既有解码帧整理的决策摘要**，不是模型私有思维链。没有复制或转述日志中的 `thinking` 内容，也没有根据作品倒编模型的内心活动。观察、源码事实与原因推断分别说明。

## 1. 实际模型与两种提交提示

| 页面标记 | 实际响应模型 | 条件 | 原始提示 |
| --- | --- | --- | --- |
| G | `minimax-code-cn/MiniMax-M3.1-Flash-Preview` | 直接，缺作品 | [prompt.md](../../../.design-pipeline/video-ab/model-eval/runs/minimax-direct/component/prompt.md) |
| F | `minimax-code-cn/MiniMax-M3.1-Flash-Preview` | 工具，有作品 | [prompt.md](../../../.design-pipeline/video-ab/model-eval/runs/minimax-tool/component/prompt.md) |
| H | `futureppo/grok-4.7` | 直接，有作品 | [prompt.md](../../../.design-pipeline/video-ab/model-eval/retry-stream/runs/futureppo-direct/component/prompt.md) |
| E | `futureppo/grok-4.7` | 工具，有作品 | [prompt.md](../../../.design-pipeline/video-ab/model-eval/retry-stream/runs/futureppo-tool/component/prompt.md) |
| Q1 | `futureppo-qwen/qwen3.8-flash-next` | 直接，有作品 | [prompt.md](../../../.design-pipeline/video-ab/model-eval/qwen-run/runs/qwen-direct/component/prompt.md) |
| Q2 | `futureppo-qwen/qwen3.8-flash-next` | 工具，有作品 | [prompt.md](../../../.design-pipeline/video-ab/model-eval/qwen-run/runs/qwen-tool/component/prompt.md) |

这六次制作实际只有两份固定的 `prompt.md`：直接组一份、工具组一份。三种模型在同一条件内的文件逐字相同；共同 brief、依赖和四张参考附件也相同。初始用户消息中均确认包含提交提示和四张图片。OMP 的文件路径包装、内置系统提示和供应商行为不等于这里的任务提示，不能声称完整 API 上下文逐字相同。

| 输入 | SHA-256 |
| --- | --- |
| 共同 `brief.md` | `c19d169ce70ef0cb28359725e0fedee6047e870a510ebb8b6d837de82a32499f` |
| 直接组 `prompt.md` | `e3adef45a0143e6f9b9551987e851523e4c074e9c7651604473e165eaab108c0` |
| 工具组 `prompt.md` | `5db26c0e1d3c1b4ef1cafee22d831e984d188ed0e683151bd581dc577606327f` |

公共执行包装要求：独立目录、不读其他作品、不联网或装依赖；固定 Three.js 0.180.0、GSAP 3.14.2、HyperFrames 0.8.133；两组均 high、12 分钟上限；“优先生成可运行作品”“先写有效场景，再做检查”，最后运行公开的 `node check.cjs`。同时要求模型不得把工程通过自称为用户验收。

共同视觉和功能 brief 原文如下：

```text
# 组件：珐琅徽章复刻

复刻给定参考视频的珐琅徽章，作为可嵌入网页的小组件。reference/ 下有原片、正面/拆层/侧面样帧、contact-sheet 和 poses.json。姿态表每行 [秒, x度, y度, z度, 拆层0..1, 缩放] 是历史人工估计，不是精确解算。不要读取任何旧复刻源码。
画面必须：黑底轻网格，蓝色六边形釉面主体，细银色金属掐丝，六个交错圆环形成三叶镂空和三片青紫虹彩嵌片，五层有实体厚度和圆角倒角，层号01..05在拆开时可读。釉面是非金属，金属/珐琅/虹彩嵌片分别着色；使用真实 Three.js 几何、环境反射、clearcoat 和相关自定义 GLSL，颜色/细胞纹理固定在物体上，反射随观察角变化。不能用不断变彩虹的时钟来假装珐琅。参考视频/截图不可作为输出贴图或背景。
组件含 input#explode（0..1），input#yaw（-65..65），button#play（播放/暂停），button#reset（恢复初始）。滑块确实改变层距和视角。时间线 31.158333s，使用公共姿态表并可反向定位。window.sampleTime(t) 同步绘制指定时刻并暂停实时播放，window.getDiagnostics() 报告 layers / renderer / 已用材质；运行成功 window.__ready=true。提供 window.__timelines.main 的 paused GSAP 时间线，供统一导出定位；根 data-composition-id="main" data-start="0" data-duration="31.158333" data-width="1162" data-height="1162"。?render=1 时隐藏控制区并让画面1162×1162，无音轨；普通模式尺寸随父容器变化。不得设置两个竞争的渲染时钟；reduced motion 初始静止。先写有效场景，再做检查。
```

直接组追加条件原文：

```text
直接制作组：不使用design-pipeline或其他设计技能；按相同brief直接制作。不要读取工具组、其他作品或历史实现。
```

工具组追加条件原文：

```text
工具组：显式使用当前目录toolkit/SKILL.md和其返回的相关指南/public CLI。先 node toolkit/scripts/designer-pipeline.cjs route --query "开发可交互的五层珐琅徽章 Three.js GLSL 组件，保留原片釉面与掐丝" --write --output job-plan.json --json，保留结果。继续使用 next --deliverable web --tier quick --mode freeform 和该流程的实际检查；组件材质可复用 toolkit/references/film-materials/enamel.mjs。只读需要的相关指南，避免遍历所有catalog。发生工具错误记入failure.md并保留失败日志，不能偷偷称工具通过；仍尽力生成实际作品。不要改工具快照来绕过失败。
```

因此，直接组也已经被告知 Three.js、PBR/clearcoat、GLSL、物体空间纹理和确定性时间线。它不是没有技术指导的空白基线；实验主要比较额外的工作流与 helper 能否改善制作。

## 2. 日志中可见的执行轨迹

公开工具调用是执行行为，不是思维质量分数；不同模型的工具粒度也不同。`check.cjs` 次数只统计模型制作期间的调用，父进程随后做的统一检查另有记录。

| 组 | 可以核对的执行轨迹 | 工具调用 / 模型调用公共检查 | 结束状态 |
| --- | --- | ---: | --- |
| G MiniMax 直接 | 读 brief、姿态和公共检查，反复查依赖路径、服务和模块；没有写出场景。目录查看越过直接组边界，原 scope warning 保留 | 33 / 0 | 720.43 s，时限，缺作品 |
| F MiniMax 工具 | route、next，读 SKILL、材质 helper 和网页运动指南；写场景、运行自制 smoke、处理模块和语法问题、看样帧；没有完成路由要求的 foundation/toolchain，也没有完成 web probe | 64 / 0 | 720.49 s，时限；父进程工程检查 passed |
| H Grok 直接 | 读正面、拆层、侧面和姿态；写场景，公共检查两次，读取输出样帧并修改源码 | 32 / 2 | 720.51 s，时限；父进程工程检查 passed |
| E Grok 工具 | route、next，读 helper；foundation blocked，toolchain 先契约失败、修正请求后仍因 Three.js lifecycle 缺失 blocked；记录 failure，继续自己写场景，公共检查曾失败，随后改模块与源码 | 60 / 1 | 720.39 s，时限；父进程工程检查 passed |
| Q1 Qwen 直接 | 写单文件场景，公共检查两次，查看成品和参考、修改源码，写 implementation；记录圆盘和 Fresnel 近似的限制 | 43 / 2 | 484.13 s，正常结束；工程 passed |
| Q2 Qwen 工具 | route、next，读 SKILL 与 helper，将 helper 改写进页面；多次查看成品和参考、修改几何/材质，公共检查七次；没有 foundation/toolchain/web probe 完成证据 | 69 / 7 | 720.52 s，时限；工程 passed |

这里有实际看图和修改行为，不能说模型完全没看参考。问题在于修改之后仍没有以原片几何与材质吻合作为继续制作的条件。六个位置中五个达到时限，只有 Q1 正常结束；有作品和正常完成是两个不同事实。

所有工具组 `route` 都返回 `graphics-runtime`，要求 foundation 与 toolchain。随后相同的 `next --deliverable web --tier quick --mode freeform` 都直接返回 `stage: build`，指向网页运动和 design tokens。两套入口没有在这次实际执行中形成完成图形前置检查的闭环。F、Q2 没有走完整个要求；E 尝试后被冻结快照阻塞。这些作品只能称“获得工具并部分使用”，不能称“完整管线制作通过”。

## 3. 成品的具体错误及源码依据

原片正面可见饱和青蓝、细亮金属线、多个边框层次、三叶之间的明确遮挡，以及不规则青紫嵌片。亮边带颜色分离与柔光外观。原作者的实际 shader、灯光与后处理未知，这些是画面观察，不是对原工程的解算。

| 作品 | 已看见的问题 | 源码事实与解释 |
| --- | --- | --- |
| F MiniMax 工具 | 额外的大圆包住六边形，中央圈线堆叠；嵌片出现黑块、白色帽状形，蓝色过深 | 顶框额外生成半径 1.1、1.29 的完整 `ringTorus`；中央除六环又加圆环和曲线；嵌片用径向扇形，上面另加 SphereGeometry 帽。几何已经偏离原片，材质无法补救。颜色还存在下述重复转换错误 |
| H Grok 直接 | 合拢正面几乎只剩蓝色六边形，掐丝和嵌片被盖住；表面有明显大片拼接/分面 | `layer.position.z = (2-i) * SPREAD * explode`，没有闭合静置深度。explode=0 时五层组都回到 z=0，而这些层具有真实挤出厚度，厚板和装饰重叠；这与正面被遮挡的解码帧一致 |
| E Grok 工具 | 圆环和放射线布局不同；外框宽而暗，蓝色近似平涂，嵌片近似低对比色块 | BIG/SMALL 圆心和半径独立猜测；三根整段 Cylinder 形成六向放射线，三片完整圆盘代替原片交叠轮廓；helper 被改写为通用细胞和法线噪声，配自行生成环境，没有参考拟合参数 |
| Q1 Qwen 直接 | 银框粗且偏灰白，三片彩色圆盘占比过大，纹理呈粉紫圆点；出现偏离参考的斜金属条 | 顶框半径为 1.6/1.38，外轮廓与圈线参数未由参考测量；嵌片是半径 0.6 的完整 Cylinder 圆盘；Voronoi 按最近点距离混色，造出圆点外观；两根 BoxGeometry 斜条独立放置 |
| Q2 Qwen 工具 | 银框偏灰白、蓝色呈碎噪声；嵌片发白，有柔和色点，缺少原片的青紫对比和细线关系 | 釉面复制并修改通用 helper；嵌片底色硬编码为 `(0.88,0.92,0.97)`，只局部混三种浅色；角度项为 `col += fres*vec3(.45,.55,.7)` 增亮，没有据参考拟合色移。三片圆盘、六环参数仍是另一套猜测 |

MiniMax 的颜色错误可直接重现：`scene.js:43` 使用 `new THREE.Color(n).convertSRGBToLinear()`。安装的 Three.js r180 开启 ColorManagement，十六进制构造已经转为线性空间，再转一次会压暗。输入 `0x1f7ad2`，正常回读为 `1f7ad2`，多转一次回读为 `0332a4`。这是一个确定的色值错误；不能把所有黑块都归因于这一行，几何和遮挡也有问题。本次只确认，没有修改原作。

源码定位：

- [MiniMax 外框 / 中央几何](../../../.design-pipeline/video-ab/model-eval/runs/minimax-tool/component/scene.js)：`hex`、`petalInlayGeometry`、顶框两次 `ringTorus`、嵌片 SphereGeometry。
- [Grok 直接版](../../../.design-pipeline/video-ab/model-eval/retry-stream/runs/futureppo-direct/component/scene.js)：`applyPose`、`makeLayer`。
- [Grok 工具版](../../../.design-pipeline/video-ab/model-eval/retry-stream/runs/futureppo-tool/component/scene.mjs)：BIG/SMALL、`enamelMaterial`、五层及 spokes。
- [Qwen 直接版](../../../.design-pipeline/video-ab/model-eval/qwen-run/runs/qwen-direct/component/index.html)：`irisMat`、L1、L2。
- [Qwen 工具版](../../../.design-pipeline/video-ab/model-eval/qwen-run/runs/qwen-tool/component/index.html)：`createEnamelMaterial`、`irisMat`、PATCH、五层。

本次查看了参考正面/拆层/contact-sheet，五份成片 0.2 秒解码帧，并核对了 Grok 直接版、Qwen 工具版 6 秒解码帧。没有声称连续全片逐帧视觉审阅，也没有给出未经测量的相似度百分数。

## 4. 为什么共同失败

### 测试提示没有把参考变成可执行的几何要求

“六个交错圆环”“三叶镂空”没有规定归一化圆心、半径、裁剪区域、穿插顺序、银线宽度、闭合层距和构图占比。五份源码产生了不同的圆环/圆盘/扇形和层序。**原因推断：**文字描述让模型做了一个符合概念的徽章，而复刻需要同一个可核查的轮廓和遮挡关系。参考图片已经提供，提示仍未要求先提交几何解读并校正。

### 我的工具组指令选择了不匹配的模式

冻结 `toolkit/SKILL.md` 明确说有复刻参考时用 `replicate`，`freeform` 用于没有方向；web 是运动网页，ui 包含组件。实验却固定 web/freeform。实际 quick next 直接进入 build，没有参考阶段；我也没有单独设静帧验收。**已证实的流程问题：**任务入口把徽章复刻导向通用网页构建，而图形 route 的前置要求又未被完整执行。

### 技术名词和通用 helper 没有提供参考的材质方案

提示确实包含 PBR、clearcoat、环境反射和 GLSL；五份可查看作品也有实际 shader 编译记录。工具 helper 自己标注了“procedural glaze/foil approximation”，提供通用颜色/细胞/法线噪声，不包含原片几何、灯光方向、环境高光形状、纹理尺度或颜色目标。F 导入，E/Q2 复制修改；它们得到的是共同的近似方法，仍需各自猜参数。**原因推断：**补齐着色技术解决了可实现性，没有解决匹配参考的参数与美术决策。

### 检查目标与用户目标脱节

公开 `check.cjs` 核对 ready、反向 seek、图像变化、控件、布局和着色器错误。五层只核对 `getDiagnostics().layers === 5`；shader 只要求 compiled/linked 大于 0，没有证明编译的是哪种材质，更没有比较参考。背景 shader 也可满足这种最低数量条件。追加行为检查验证了画布播放与视角响应，仍没有验证合拢遮挡或青蓝釉面保真。

H 的正面装饰被盖住还能 passed，是现成的漏检证据。**已证实的评测缺口：**正常执行被测接口不能拒绝明显失真的画面。此前汇报突出运行与导出通过，给这些画面错误的返工优先级不够；这是我执行和汇报的不足。

### 预算同时承担建模、整段动画、交互和运行排障

同一 12 分钟要求五层实体、31 秒动作、shader、四个控件、响应式、可导出和检查。实际五个位置到了时限。工具组增加了文档、契约和路由工作；Q2 在预算内七次运行公共检查，仍未正常完成回复。包装提示说 PowerShell，但 OMP bash 记录里 `dir /b`、`cd /d`、Select-Object 等出现不兼容，另有模块导入和编辑协议错误。**原因推断：**这些工作挤占了几何和材质拟合的时间；工具调用数不能精确分摊耗时，也不能用它推断内部思考质量。

### 同样的近似运动输入限制了所有版本

25 行姿态是历史人工估计，没有恢复原片的相机、层距和拖动轨迹。F 用 Catmull-Rom，H/E/Q2 用 smoothstep，Q1 用线性插值；层距与相机又各自设定。因此相同关键表不等于相同屏幕运动，也不等于原片运动。**原因推断：**早期估计被沿用，会把共同偏差带到后续模型；本次没有精确运动拟合。

## 5. 归因边界

| 已能判断 | 对应责任与范围 |
| --- | --- |
| 图形 route 与 web/freeform 快速制作没有形成完整执行流程 | 我写的实验条件与实际工具入口衔接都有缺口，不能称完整工具组验收 |
| 闭合层距、额外圆环、色值和材质布局错误 | 模型具体实现错误；公共检查没有拒绝，属于评测缺口 |
| 通用材质 helper 不包含目标参数和几何 | 当前能力上限；增加 shader 名称无法自动解决视觉拟合 |
| 冻结工具快照没有 Three.js lifecycle | 旧 V3 缺陷；此前已在 V4 修复，本轮 Qwen 沿旧快照，不是 V4 创作评测 |
| 当前画面不符合用户要求 | 用户已明确拒绝；数字分数未填写，不能杜撰 |

每个模型/条件当前只有一个有效制作样本。MiniMax 直接组没有作品且存在范围警告；更早 Codex V1 两组共用资产，同作者上下文，V2 又换了实现。当前结果足以定位这轮失败，不足以给三个模型作普遍能力排名，也不证明所有工具能力都无效。

早期 Codex V1/V2 实际作者为 `gpt-6.1-sol / max`，使用本聊天连续需求；没有伪造与当前 OMP 一致的独立 prompt.md 或思维记录。V1 选 Canvas/CSS 3D，遗漏实体材质；V2 加实体/PBR/GLSL，仍沿用估计几何、噪声与姿态。[历史结果](results.md#历史版本)保留；本次不扩大到其他任务。

## 6. 下一版应改变的最小流程

只针对同一个珐琅徽章，先产出 **几何表 → 正面静帧 → 另一个视角的材质静帧**。原片轮廓、圆心、遮挡、线宽与闭合层距先校正；固定几何后，再校正青蓝色范围、釉面纹理尺度、金属高光和嵌片颜色。先让用户看得见这些差距被解决，之后再接已有 31 秒运动与控件。

工具侧沿现有 reference/reconstruction、foundation、toolchain 和材质样片能力接通，明确报告 blocked；不额外建门禁框架。选择符合实际交付的入口，有参考就用 replicate。现有运行检查继续服务运行质量，静帧比对服务视觉验收，两者分别记录。当前复盘没有实施上述工具行为修改或启动新模型。

下一版提示建议如下，**尚未执行，不覆盖上述原始提示**：

```text
只完成当前珐琅徽章的几何与材质静帧。
以参考正面为准，先记录归一化轮廓、圆心/半径、银线宽度、三片嵌片边界、穿插关系、闭合层距和主体占比；不以自行生成的六圆花纹替代。
先校正纯色几何，确认合拢时装饰没有被厚板遮住，再使用真实 Three.js 实体、物体空间 GLSL 和环境反射调材质。
蓝色范围、纹理大小、金属高光和嵌片对比必须逐项对照参考；提供正面和第二视角两张静帧及差距说明。
工具组执行实际 route 返回的相关步骤，有参考使用 replicate；缺能力如实记录，不以只调用 route/next 代替完成工具流程。
保持已有作品与参考原样，不用参考像素贴图。静帧接受后，再接动作、控件和整段导出。
```

这份建议改变的是制作顺序和校正依据。是否带来进步仍须下一版画面和用户评审证明。

## 7. 核查依据

- [公开执行摘要与输入核对](../../../.design-pipeline/video-ab/model-eval/badge-prompt-audit.json)：六份 prompt/brief 摘要、四附件计数、公开工具调用、路由响应和结果；不包含 thinking 内容。
- [当前选择矩阵](../../../.design-pipeline/video-ab/model-eval/comparison-matrix.json)：实际模型、时限、输入、源码/视频摘要及工程结果。
- [公共检查](../../../.design-pipeline/video-ab/model-eval/check.cjs)与[追加行为检查](../../../.design-pipeline/video-ab/model-eval/behavior-check.cjs)：已读源码，未在本次重复运行。
- [冻结技能入口](../../../.design-pipeline/video-ab/model-eval/toolkit-snapshot/SKILL.md)、[冻结网页工作流](../../../.design-pipeline/video-ab/model-eval/toolkit-snapshot/references/workflow-web.md)、[冻结材质 helper](../../../.design-pipeline/video-ab/model-eval/toolkit-snapshot/references/film-materials/enamel.mjs)。
- [Grok 工具失败记录](../../../.design-pipeline/video-ab/model-eval/retry-stream/runs/futureppo-tool/component/failure.md)、[Qwen 直接版实现说明](../../../.design-pipeline/video-ab/model-eval/qwen-run/runs/qwen-direct/component/implementation.md)。
- 每份作品目录保留 `decoded-0.2.png`、`decoded-6.png` 等既有解码帧，原模型源码和事件未修改。

输入核对断言通过：六组 prompt/brief 与选择矩阵的摘要一致，同条件 prompt 逐字相同、共同 brief 相同，时限位置为 5/6。另通过安装的 Three.js r180 直接计算确认 MiniMax 重复色彩转换；没有为此修改源码或重渲染。

# MotionHarness（帧驭）CLI 对照研究

研究日期：2026-11-12

研究对象：npm 包 `@motionharness/cli` 0.1.5（2026-11-11 发布；首个版本 2026-09-28，六周内 21 个版本）。许可证字段为 `UNLICENSED`，二进制闭源，`package.json` 的仓库地址 `github.com/VibeMG/vibe-motion-graphics` 用 `gh repo view` 查不到（私有或不存在）。

目的：弄清它和 design-pipeline 的差别，把我们缺的能力列进产品调研。本文只是研究记录；任何行为变更都要另开 OpenSpec change。

## 结论

- 两者不在同一层。MotionHarness 是**制作运行时 + 可编辑工程文档 + 人用的时间线界面（Studio）**：代理写出工程，人再到 Studio 里拖时间线、改参数，代理和人改的是同一份文档。design-pipeline 是**方法、参考、门禁和验收记录层**，落在 HyperFrames、Blender、ffmpeg 等运行时之上，交付物是代码和成片，没有“交给人继续改”的工程文档。
- 它的 skill 只讲怎么操作 CLI、怎么核对帧和音频；SDK 里有文字显现、计数器、交错、路径描边等动效函数，没有方向、参考、模板、审美、验收记录。它的指南原文也说读回工程契约“不是层数、风格或审美门禁”。这一层正是我们的强项。
- 我们缺的集中在三处：**可编辑工程层**、**带时间和画面区域的批注回路**、**自描述且可按小节读取的 CLI**。其余（导出格式、检查点、交付包）是体量较小的补充项。
- 闭源且 `UNLICENSED`：不能随包分发，不能拷贝文本。可借想法，需要它的产物时只能当用户自装的外部适配器路由，与 Blender、Strudel 的处理方式一致。

## 实测记录

环境：Windows Server 2025，Node 26.12.1，pnpm 12.18.0。所有工程建在临时目录，未改动本仓库。

| 步骤 | 命令 | 结果 |
| --- | --- | --- |
| 安装 | `npm install -g @motionharness/cli` | 退出码 0，22 秒，装入 2 个包（主包加 `cli-win32-x64` 原生二进制） |
| 体检 | `mh --version`；`mh doctor` | `0.1.5`；退出码 0，内嵌运行时解压到 `%LOCALAPPDATA%\mh\cache-v2`，自带 ffmpeg/ffprobe，导出能力含 mp4(h264_mf)、hevc、ProRes 422/422HQ/4444/4444XQ、straight alpha、gif/webp/apng/png-sequence/wav、motion blur |
| 读指南 | `mh skill`；`mh skill --reference pro\|conversion\|materials\|audio\|rendering`；Pro 工程内另读 `authoring`、`editing`、`davinci`、`time-remapping` | 全部读完。`--reference` 的可选值只列 `pro/materials/audio/rendering`；`authoring/editing/davinci/time-remapping` 是在 Pro 工程目录里读到的 |
| Standard 工程 | `mh new` → `mh preview --times '[0,1,2]' --contact-sheet` → `mh render x.mp4 --json '{"start":0,"duration":2}'` | 建工程 4.5 秒；预览 3 帧加拼图 5.4 秒；2 秒 1280×720 mp4 渲染 3.0 秒，均退出码 0 |
| Pro 工程 | `mh new --type pro` | **首次失败**：`Process guard: Cannot locate pnpm's JavaScript entry`（pnpm 是 npm 的 `pnpm.ps1` 垫片，CLI 找不到它的 JS 入口）。工程目录保留，按提示手动 `pnpm install --ignore-workspace --ignore-scripts` 后成功 |
| Pro 编辑 | `mh inspect --view instances\|parameters`；`mh keyframe list`；`mh param set <id> text --value '"帧驭 smoke"'` | 3 个实例（poster、主标题、副标题）；标题有 12 个参数，`y` 和 `opacity` 各带 2 个关键帧（ease-out）；`param set` 返回 `saved: true`，修订号 0→1，`document.json` 的 `text` 变为新值，源码里的默认值不变 |
| 账号 | `mh auth status` | 失败：`MotionHarness storage must be private and owned by this user`。原因未查；渲染、预览、编辑都不需要它 |

没有测的：Studio 界面（没开浏览器）、`mh marker` 全流程、Pro 工程的渲染、`mh bridge davinci`（指南写明完整桥只有 macOS 包）、`.vmg` 打包解包、检查点。这些结论来自指南原文。

## MotionHarness 的结构

**两种工程类型。**

- Standard：`mh.json`（宽、高、帧率、时长、音轨）加 `src/scene.js`，导出函数返回 `{ prepareFrame(time), dispose() }`，用 DOM、Canvas、SVG、Three.js 随意画。`time` 是绝对工程秒，重复、倒退、跳帧必须给出同一帧。不需要任何 MotionHarness 图层或参数声明。
- Pro：React + `@motionharness/sdk`。组件用 `defineComponent` 声明参数（`field.text/color/number`，带 `min/max/animatable`），用 `basicTransformParameters` 暴露位置、缩放、旋转、倾斜、锚点、不透明度。工程里“人能改的东西”和“只在源码里的东西”分得很清：只为用户点名要改的对象开参数，其余留在普通 React 代码里。

**可编辑文档。** Pro 工程的取值和关键帧存在 `document.json`（有修订号和每个关键帧的 id），和源码默认值、`defaultAnimation` 分开。默认值只负责初始化；日常修改是改已存的值、关键帧和实例时间窗。CLI 提供 `mh param set`、`mh keyframe set`、`mh instance timing`、`mh batch`，人在 Studio 里改同一份文档。

**批注回路。** 用户在 Studio 的某个工程时间点放标记：可带画布像素坐标或矩形区域、文字、附件，Studio 自动附一张带圈（或带色框）的当前帧截图 `marked-frame-<t>s.jpg`。代理 `mh marker list` 读，改完 `mh marker complete`，必须带读到的 `requestVersion`，过期的请求会失败；标记有 `onResolve: keep|delete`。点 Studio 的 PRO 按钮会产生 `pro-edit` 类标记，驱动 Standard 到 Pro 的转换：新建一个独立 Pro 工程，只开放用户点名的对象，完成时用 `handoff` 把 Studio 切到新工程。没有自动转换器，也没有双向同步。

**其他。**

- 渲染：mp4（H.264/H.265）、mov（ProRes，带 straight alpha）、gif、无损 webp、apng、png 序列 zip（带时间清单）、wav（48 kHz/24 bit 混音）。运动模糊用时间超采样（快门角 >0–360，采样 2–32）。`render plan` 不开任务就返回规范化参数、采样数、时长、目标码率。导出用开始时刻的源码快照，编辑不受影响；一个工程同时一个导出；不覆盖已有输出。
- 预览：`mh preview --times [...] --contact-sheet` 在后台出帧和拼图，失败的序列保留不完整的清单和底层错误；`--file` 不开工程就能读任意音视频的时长、格式、电平；`--check-playback` 在隔离的静音浏览器里完整播一遍，报错误和掉帧数。
- 检查点：`mh checkpoint create|list|restore|gc|recover-work`，历史独立于 git；`mh pack` 出 `.vmg`（不含历史），打包和解包都校验文件清单、大小和 SHA256。
- 自描述：`mh capabilities` 逐个动作给出 `available` 和 `reason`；`mh describe <命令>` 给出输入 JSON Schema 和示例；`--output-format json|text`；`mh skill --list/--reference/--section/--symbol` 按小节读指南、按符号读已装 SDK 的声明。
- 宿主：共享后台守护进程；指南反复规定，例行检查不开、不聚焦、不 seek 用户的 Studio 页面，也不用用户的喇叭。
- DaVinci Resolve：`mh bridge davinci send` 渲染、导入、插入并与媒体池条目建立关联，带 `idempotencyKey` 和 `bindingId`。

## 定位差别

| 维度 | MotionHarness | design-pipeline |
| --- | --- | --- |
| 所处层次 | 制作运行时和工程文档 | 方法、参考、门禁、验收记录 |
| 交付物 | 可编辑工程（`document.json` + 源码）、`.vmg`、成片 | 代码、设计文档、成片、回执链 |
| 人如何接手 | Studio 时间线直接改参数和关键帧 | 重新对代理说一遍；Playground 和 runtime-review 导出提示词或反馈文件 |
| 反馈载体 | 时间 + 画面区域 + 自动截图 + 版本号 | web：元素编号 + 评论叠层页，`decide --ref`；film/edit：文字（`decide`） |
| 时间模型 | 工程绝对时间的纯函数；指南只规定契约，未见机器检查 | HyperFrames 暂停的 GSAP 时间线或 `seek(t)`；换 worker 数各渲一次比帧哈希 |
| 画面来源 | 浏览器场景（DOM/Canvas/SVG/Three.js）和视频素材 | HTML/GSAP、Blender 3D、footage 剪辑（PV/MAD）、web/UI |
| 方向与审美 | 无；SDK 有文字显现、计数器、交错、路径描边等动效函数 | 参考优先、风格包 14 个、模板 68 个、动效词表、反 slop |
| 验收 | 检查点；代理自己判断“可交付” | 门禁只报技术结果，视觉验收只记 owner 原话，`--by owner/agent` 留痕 |
| 许可 | 闭源，`UNLICENSED` | 逐来源登记许可，不带非商用素材 |
| 平台 | npm 装平台二进制，Windows 已验证；Resolve 桥只有 macOS 包 | Node 22.12+，外部工具按需 |

## 我们缺的能力

按对产品的价值排序。每条列出它的做法、我们的现状和建议；建议都需要走 OpenSpec change，现有门禁、回执和 schema 只扩展，不另起一套。

### G1 可编辑工程层（高）

- 它：参数契约（类型、范围、可动画）在源码，取值和关键帧在文档；人和代理改同一份文档；转换时只开放用户点名的对象。已实测 `param set` 写入文档、源码默认值不动。
- 我们：film 是 HTML + 暂停的 GSAP 时间线（[hyperframes.md](../../skill/references/hyperframes.md)）。成片后改一句字幕、一个颜色、一个镜头时长都要回到源码，用户自己够不着。
- 建议：先做轻量版——film scaffold 生成一份“可调面”文件（名称、类型、范围、默认值、所在时间窗），构建读取它，`film check` 校验范围，改值不改代码。再评估把 MotionHarness 登记进 `adapter-registry.json`，当用户明说要“能在时间线上继续改的动画工程”时路由过去，产物由用户自装的 CLI 生成。

### G2 时间加区域的批注回路（高）

- 它：标记 = 工程时间 + 可选坐标或矩形 + 文字 + 附件 + 带圈截图；完成时带 `requestVersion`，过期则失败；`keep|delete` 决定完成后保留还是清掉。
- 我们：web 已有等价物——`evidence refs` 给可见元素编号，`evidence review-page` 生成带评论叠层的 `review.html`，owner 的结论用 `decide --page-review` / `--ref hero-2` 记录。film/edit 没有：只有 `film cut-sheet` 的镜头表和 `decide` 的文字。2026-10-26 的 PV 复刻复盘里“每一镜都不够细”因此没有可以落在“第几秒、画面哪里”的载体，门禁也无从对照。
- 建议：把 web 的编号引用思路延伸到 film/edit：定义时间 + 区域的 review mark，扩展现有的 [feedback-observation.schema.json](../../skill/references/feedback-observation.schema.json)，加 list/complete 命令和版本号；渲染一张带圈的帧随标记保存。完成仍由 owner 的话驱动，门禁不代为验收。

### G3 自描述、可按小节读取的 CLI（中）

- 它：`capabilities`、`describe`、`skill --section/--symbol`。
- 我们：`--help` 和 `next` 已经能逐步引路，但 [stages.md](../../skill/references/stages.md) 有 1249 行，只能整文件读；`skill/scripts/cli-core.cjs` 没有 `--section`、`describe` 之类的入口。
- 建议：`designer-pipeline skill --reference <名> --section <标题>` 按 Markdown 标题切片，加 `describe <命令>` 输出输入 schema。对任何模型都省上下文，也贴合“提高任意模型的美术与动效产出”这个目标。体量小，可以单独成一个 change。

### G4 导出能力（中，先核对再定）

- 它：ProRes 4444 带 alpha 的 mov、gif/webp/apng、png 序列加时间清单、wav 混音，一个 `render` 命令全包；`render plan` 先看码率和时长。
- 我们：mp4 和 png 序列已有；`art-motion render` 在 `alpha:true` 时出 ProRes 4444 mov；运动模糊有配方（[workflow-film.md](../../skill/references/workflow-film.md) 的 deliver 一节：N 倍帧率渲染后平均前半，等价 180° 快门），与它的 `motionBlur` 同效；`audio master` 出 wav 母带。`skill/` 里未见 gif/webp/apng 导出、整片音轨混音 wav 导出，以及渲染前的 `render plan` 式预估。
- 待核：film 路线的 HyperFrames 0.8.137 是否原生支持这些格式。支持就写进 `hyperframes.md` 和 `film check`；不支持再考虑 ffmpeg 后处理脚本。

### G5 预览与媒体检查契约（低到中）

- 它：`preview --file` 对任意媒体读时长、格式、电平；`--check-playback` 在隔离浏览器里真实播放一遍并报掉帧；序列失败时保留不完整清单。
- 我们：`film-core.cjs` 等已有拼图和清单，`verify film-render` 检查成片。没有查到“浏览器真实播放一遍并报掉帧”的等价物。
- 建议：评估给 `verify film-render` 加一项播放检查；其余已有。

### G6 可移交的完整包（低）

- 它：`.vmg` 带文件清单和 SHA256；检查点历史独立于 git，`recover-work` 导出还原前的未完成工作。
- 我们：git、OpenSpec 和回执链对开发者足够，回执链还更强。非 git 用户拿到的是散文件。
- 建议：暂不做；若 G1 落地，再考虑把可调面文件、素材、回执打成一个带哈希清单的包。

### G7 Resolve 链接交付（低）

- 它：`mh bridge davinci send` 建立导入、插入、关联三件事，防重复插入的幂等键。
- 我们：PV/MAD 终点是 mp4。完整桥只发 macOS 包，本机 Windows 用不上。暂时只记录。

## 我们已有而它没有的

- 参考优先的工作方式、风格包和模板库、动效词表、反 slop 审查、字体与素材许可台账。
- 门禁加 owner 验收的分离，回执链（target、snapshot、policy digest）和失效传播。
- PV/MAD 的 footage 分析与节拍剪辑、Blender 3D 模板、web/UI 交付物。
- 金标案例和消融评测（`evals/cases`）。

## 不照搬的部分

- 闭源 `UNLICENSED`：二进制和指南文本不进 `skill/`；`@motionharness/sdk` 的许可未核。
- Pro 工程绑 React 和它的 SDK；我们的 film 绑 HTML 和 GSAP。可调面文件要保持运行时无关。
- `.mh/telemetry-project-id` 在每个工程里生成；采用前要弄清遥测内容。
- 它把“代理自己判断可交付”当作终点，不留 owner 验收记录，与我们“最终验收永远是 owner 的”冲突。

## 待核实

1. `mh auth status` 报 `storage must be private and owned by this user` 的原因（猜测是 Windows 权限归属，未查）。
2. Pro 工程渲染、Studio 界面、`mh marker` 全流程、`.vmg`、检查点未实测。
3. 遥测内容。
4. HyperFrames 0.8.137 的导出格式（G4）。
5. 它的指南未明确写明 `prepareFrame` 的确定性有没有机器检查；本次没有找到。
6. 若走适配器路线：`mh new --type pro` 依赖 pnpm 10+，在 npm 垫片装的 pnpm 上会失败，需要在适配器说明里写明预先装好真正的 pnpm 可执行文件。

## 下一步（需用户决定）

- 是否把 G1–G3 各开一个 OpenSpec change，还是先只做 G3（最小、独立、立刻见效）。
- G1 走“可调面文件”还是“外部适配器”，或两者都做。
- 以上选定后，再按 [pin-film-reference-provenance](../../openspec/changes/archive/2026-10-15-pin-film-reference-provenance/proposal.md) 的做法给 MotionHarness 登记一条 ideas-only 来源记录（版本 0.1.5，许可 `UNLICENSED`，只取想法）。

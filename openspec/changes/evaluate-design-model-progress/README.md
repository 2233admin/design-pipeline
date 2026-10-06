# 珐琅徽章：版本与模型对照

2026-10-06 制作中主人校对与 RSI 已接进工具源码：既有 `visual.review` 技术完成后真实
返回 ask，接受只绑定对应 completion；已完成目标可带同版本证据及反馈退回，保留旧
产物并使相关下游失效。评测桥消费实际用户决定，接受／退回提交前后中断都可恢复，
不重复制作或记账。改进路径写入既有 feedback-loop：观察具体差异、主人校对、单属性
修正、同视角比较，可复用问题再进入 feedback/OpenSpec 修工具。它不训练模型或自动
改写安装技能；没有将工程检查当成视觉通过。

徽章[默认入口](http://127.0.0.1:47831/codex-enamel-20261006/index.html)只显示动画／拖动，
原控制与说明留在[检查入口](http://127.0.0.1:47831/codex-enamel-20261006/index.html?inspect=1)。
[工作台](http://127.0.0.1:55628/)重新排布作品与原片、当前动作／模型、主人反馈和可展开
的公开执行记录。工作台确实调用当前 route/next/project inspect，具体记录在忽略目录
`workbench-design-20261006/README.md`；route 低置信度、next 行动仍宽泛，宿主补了具体
布局拆解，不能据此声称工具自动设计能力已经提升。这个缺口已用现有反馈入口记录。

最终 `owner-calibration-20261006/qa-final.log` 退出0：912项中907 pass、0 fail、5 skipped，
安装包公开CLI smoke另11/11，可重复打包和仓状态一致性通过；记录 SHA-256
`0080dcd3bb5b0d720fafa67989539aafd62c590ac8baf04d2a0c22420af82e2f`。
新接口／中断恢复的工作台回归12/12、native workflow/state相关46/46；徽章真实浏览器
检查及11项产物摘要回执通过。OpenSpec严格验证通过。旧模型作品、评分和冻结版保留，
现有55628服务只热读取新前端，后端及冻结工具尚未切换；没有新模型运行、提交或推送。
本轮没有修改徽章材质，Visual Acceptance仍待用户判断。

2026-10-06 参考到制作的 skill 接线已补：逐窗行动提供真实 PNG 路径、尺寸、摘要和解码时间，
保留原交付类型的 study；影片分支调用已有导演／动画指南，在 `reference.md` 分开源镜头
事实与拟制图层、动作责任、关键姿态、实际素材和缺口，再映射原 storyboard 与 choreography。
复刻不能靠原样示例 beats 直接进入制作，源笔记变化重开原检查。无参考任务仍从 brief/concept
制作；源码素材引用与实际二进制文件核验分开。没有新增 gate、receipt 或自动角色替换能力。

公开入口相关 38 项通过；同一徽章原片首窗返回 9 张 1162×1162 PNG，摘要／时间核对且实际
打开首／中／末三张，16 个窗口仍 pending，语义接受仍为 not-assessed。最终
`node scripts/qa.cjs` 退出 0：896 项中 892 pass／0 fail／4 skipped，安装包公开 CLI smoke
11/11、打包可重复、仓状态一致性通过；严格 OpenSpec 与 diff 通过。QA 日志
`.design-pipeline/video-ab/skill-handoff-20261006/qa-current.log` 的 SHA-256 为
`2c7e7b117f56b7cb1161c8b699de66fe3dd7d45ac2f96b2c64e71426801798be`。
中间并发修改造成的包差异／仓状态一致性失败日志保留；稳定两包内容及摘要完全相同，
没有改 QA 放行规则。原片图片交接记录为同目录 `original-observation.json`。
本轮未运行模型、未代填视觉接受；评测台仍保留旧冻结输入，模型遵循和画质增益尚未验证。

2026-10-06 第二轮上游优化：按用户“现在工具得优化”继续修工具本体，未调用模型。
修正未知／推断被算成观察完成、全片远端帧冒充逐窗运动证据、候选上下文只有相邻源帧、
query 只回显文本四处缺陷。`next` 现在指向真实未观察窗口；预算和局部覆盖也有恢复操作。
项目报告写入要求新路径，修复窄 scope 输出覆盖未读取源文件的实际回归。

| 结论 | 验证方式 | 结果与局限 |
| --- | --- | --- |
| 更细的时序输入和具体观察缺口可用 | 原 MP4 公开 `reference analyze-video --max-frames 400`，实际源／帧摘要及解码时间检查；120 fps 短脉冲红绿回归 | 原片生成 154 帧／16 窗口，每窗至少 6 帧，未超预算；16 窗口仍 pending，并携带实际帧、报告路径和重采参数。短变化保留约 0.4 s 前后序列，预算舍弃明列。`analysis-refine-20261006/video-cli.json`、`video-check.json` 保留，抽帧不等于理解内容 |
| 关键词真正定位已有代码关系 | 原徽章项目公开 inspect 查询 `createEnamelMaterial` 与不存在符号 | 15 文件中实际 5 处源码行命中、4 条导入关系；无命中明确 QUERY_NO_MATCH，未解析关系仍保留。`badge-query-cli.json`、`badge-no-match-cli.json` 保留；仅为词法与静态 import 图，不是运行时语义 |
| 当前工具源码与包回归通过 | 相关有效红绿回归；最终 `node scripts/qa.cjs`，严格 OpenSpec 和 diff 检查 | 退出 0；879 项中 876 pass／0 fail／3 skipped；安装包公开 CLI smoke 11/11，QA 保持仓状态一致。日志 `analysis-refine-20261006/qa.log`，SHA-256 `f82794be0c8aad275b0a3071cabc281b0bc5a13ecadb974ca414b00f30ecf0f9`。本地评测台仍沿上一冻结版；模型理解／视觉增益未测试，未写人工接受 |

本轮原片记录摘要：`video-cli.json` 为 `c77e0d6e890378e90c58b297a636e96425e6126f376fa7f9c29193cf8b9a2bfc`，
`video-check.json` 为 `50686e59d1dbcfa33a8c9db7598994620c744507c298e1fa648b830f87093ebf`。
记录统一在本仓忽略目录 `.design-pipeline/video-ab/analysis-refine-20261006/`；旧报告、失败、模型作品和冻结版保留。
新序列查看入口：[原视频时序窗口](http://127.0.0.1:47831/analysis-refine-20261006/video/index.html)，实际 HTTP 200／16 窗口链接核验通过。

2026-10-06 最新范围纠正：用户明确“我要修的是我们分析视频内容、拆解视频内容以及仓库项目这块的能力”。此前派发修复不能回答该问题。本轮直接修打包工具的上游入口，没有新增实施计划、评测台功能或模型制作。新增 `reference analyze-video` 与 `project inspect`，复用既有 reference aggregate 和 artifact.v1；本地工作台仍保留上一轮冻结版本和旧输入，本轮不声称它已使用新的视频理解能力。

| 结论 | 验证方式 | 结果与局限 |
| --- | --- | --- |
| 原始视频可提供真实时序分析输入 | 公开 CLI 读取与 Downloads 原件摘要一致的 `reference/original.mp4`；实际再核对源／帧／PTS | 31.158333 s、1162×1162、nominal 240 fps；126 张原尺寸 PNG、16 个有序窗口，未超采样预算。`analysis-repair-20261006/video-retry-cli.json` 和 `video-check.json` 保留。16 窗口均未填写内容观察，状态正确为 pending；抽帧不是语义理解 |
| 抽帧大批次和真实项目读取根因已修 | 原片公开入口失败后隔离长／平衡选帧表达式对照，及旧徽章项目实际只读扫描 | FFmpeg 长加法条件链触及解析深度，平衡表达式后原片成功；旧 `video/` 和 `video-cli.json` 失败保留。Git 父仓忽略子项目导致 0 文件的误判修正后，实际读 15 文件，定位入口、渲染／材质／shader／动画，未知依赖保留；`badge-project-cli.json` 是普通源码证据索引 |
| 新能力、静态帧交接及兼容回归通过 | 新入口红绿、真实 VFR／非零 PTS、超过 100 帧、目录保留、局部观察不可替全片、真实 PNG 与原视频绑定；最终 `node scripts/qa.cjs` | 退出 0，877 项中 874 pass／0 fail／3 skipped；安装包公开 CLI smoke 另 11/11，仓状态字节一致。原记录 `analysis-repair-20261006/qa-final.log`；SHA-256 `e8e7a094f21bfea7b70f695cf5cd6c782b219047d96f2e7b55527cde01278958`。Component Conformance 与 Visual Acceptance 均未授予 |

实际产物位于被忽略的 `.design-pipeline/video-ab/analysis-repair-20261006/`；[查看原片的带时间样帧](http://127.0.0.1:47831/analysis-repair-20261006/video-retry/index.html)，HTTP 实际返回 200。窗口是采样证据，快速动作可用局部更密采样；逐对象几何／材质／照明／动作观察仍由实际模型或人填写，未知必须记录。项目检查是有界静态索引，不执行项目脚本，不把关键词候选或未解析别名当成完整代码理解。Grok／Qwen 新入口使用和审美增益未验证；旧作品、评分、批准文档、输入与运行历史未改。

2026-10-06 实际修复结果：本地代码与正在使用的评测入口已更新。native next/decide 按一个视觉属性返回当前任务，缺拆解不派发整块制作；输出／独立检查绑定计划、任务、参考、上游和当前输出摘要，失败停留返修、变化使下游失效。新工具组从模型参考拆解生成任务，消费冻结产品公开入口，显示参考、范围、使用能力与真实派发；旧七步运行、失败、作品及人工意见保留。运行检查和视觉接受仍分开，本轮未重跑 Grok/Qwen 或填写用户评分。

| 结论 | 验证方式 | 结果与局限 |
| --- | --- | --- |
| 本轮工程修复通过回归 | `node scripts/qa.cjs`；原记录 `.design-pipeline/video-ab/model-eval/visual-task-repair-20261006/qa.log` | 退出 0，860 项中 857 pass、0 fail、3 skipped；安装包公开 CLI smoke 另 11/11，仓状态字节一致。记录 SHA-256 `d256b799edfcad905e3b1b7d1dbd5265f5908e33a10511e94ae2b9622396271c` |
| 当前冻结工具实际入口返回拆解 | 原真实参考复制到隔离 smoke 目录，执行冻结 CLI next；记录 `visual-task-repair-20261006/entry-smoke.json` | 退出 0，只有 reference，返回 decompose；1803 文件快照 SHA-256 `048ea8246853926bf82381917f01c4b0755ab8545518f2c4901ac7d8894886b1`，共同输入摘要保持 `729509854db56fae41f0c6b4c58093f860892800f7dcfad2dce7d91ff87c4212`。这是入口检查，不是模型制作 |
| 本地使用入口已更新 | 验证原服务归属且无活跃制作后，重启同端口到新快照；GET 页面、bootstrap 和运行列表 | `http://127.0.0.1:55628` 可达，任务细节和产品派发事件代码已返回，canStart=true，旧 6 运行保持；PID 85256、stderr 0 字节。未进行新模型画质对照 |

修复还覆盖自定义动作任务的实际播放检查、按原路径提供全部上游输入、先封存证据再更新技术进度、恢复派发投影，以及 GLSL／WGSL shader 的快照和范围检查。独立只读审查的已复现问题均已修复。属性格式校验只拒绝已知整阶段／列表形状，不声称能自动判断所有拆解语义；材质审美、视频理解与模型供应商循环错误不由此变成已解决。

2026-10-06 当前执行：用户在本聊天明确“我需要的是先修工具 而不是写实时计划”，要求直接修复实际派发，覆盖上一轮实施计划待确认停点。沿已有问题定义直接实施细任务入口、版本证据与评测台接线，不继续要求计划批准。旧待审计划用于定位已查文件，不冒称逐份获审；当前无新模型制作、提交、推送、发布或安装。

2026-10-06 本轮接续：用户指出工具调用时切分仍不够细、工具／直接区别不明显。只读核对确认两组共用七个宏任务，产品 next 仍返回整体 work/build；上一轮补丁完成了交接和指导，但没有实现细任务调度，不能据此声称拆解或视觉效果已改善。[视觉细任务实际派发实施计划](visual-task-execution-plan.md)已准备供审阅，新增实际逐任务接线，超出上一轮明确的指导补丁范围；当前未实施、未运行新模型。旧批准文档、试跑与 QA 原记录保持不变。

本轮细任务计划待审版 SHA-256 `eef21a3d9f3ca282a9108e91be007c636de1c6ea18798535b02808f2e3a4f4ca`，尚未提交、只在本机；此摘要定位当前审阅正文，不代表批准。OpenSpec 严格校验通过，不表示执行能力或视觉效果已验证。

2026-10-06 最新接续：用户指定后续制作只用 Grok 4.7、Qwen 3.8 Flash Next，并要求先修工具、观察派发后的任务拆解问题。[工具派发与任务拆解修复计划](tool-dispatch-repair-plan.md)已获准，当前本地补丁和必要回归完成，[验证报告](tool-dispatch-repair-verification.md)待审。完整 QA 840 pass/0 fail/3 skipped，原始记录保留。未启动新模型，运行中评测台仍使用旧冻结快照，画质提升未验证。

本轮工具计划交审：尚未提交，待审版 SHA-256 `cde0ff957d92df19cdb4c143b0e74a05d78bc94911d283b4d5387f57f44ae494`；此摘要仅定位审阅内容，不代表实施批准。相关 OpenSpec 严格校验通过，旧 SRS、底座计划、基线及验证报告四份批准摘要保持一致。

工具补丁实施批准：2026-10-06 用户在本聊天回复“可以 另外拆解视频的时候 我们现在是怎么拆解序列帧的 agent是怎么理解动画内容的”，认可上述 SHA-256 的文件级修复计划，批准本地实现与必要回归；当前已实现并交审结果，批准开始不代表认可结果。视频拆帧与动画理解同步只读核对，发现时间映射和姿态说明缺口，不据此扩展视频工具改动。无可发布对话链接，尚未提交；不包含提交、推送、发布、安装或代替用户视觉验收。

工具结果交审记录：验证报告尚未提交、待用户审阅，SHA-256 `fcd083710d5bc1922156caf50a9e5142c27996a2957b73ab8f4304ecf829a4ee`。本轮 QA 原记录 SHA-256 `a79d9b3ba628ae2fb4b1e806670bf0cc59e638727ba2f9f7db0eb3f2f4e37b75`。工程检查不授予新徽章视觉接受，也不证明模型已按拆解指导执行。

2026-10-06 主线确认：用户明确“我们核心还是 改进我们的工具 而不是其他的”。本事项的目标是提升打包的 `design-pipeline` 对 agent 制作的实际帮助；评测台用于暴露缺陷和核验修复，珐琅徽章作为唯一固定案例。后续迭代以工具的可执行交接、任务颗粒度和纠错复验为重点，不以增加评测台功能、工具调用次数或 token 用量作为进步。

同日适用范围补充：用户强调工具并非只制作徽章，选择徽章是因为其制作难度高。徽章仅限定当前评测范围，不限定工具产品范围。参考理解、任务拆解、可执行交接、检查纠错和反馈规则应沉淀到通用工具能力；实体几何、珐琅和 shader 等要求进入相应图形／材质分支，其他制作任务按需使用。不得硬编码徽章名称、五层或三片镶片作为通用通过条件，也不因本条扩大当前模型试跑范围。该案例能检验高难度图形能力，不能单独证明工具对所有任务均有提升。

已有 `next`、reference-evidence、scene、反馈及 v1 门禁／收据能力先复用，区分“工具缺能力”与“派发没有接上已有能力”。每项修复应绑定真实失败、工具改动及回归证据，再由同一徽章的模型过程和用户评价核验效果；不得只修某份徽章作品就宣称工具改善。此处记录目标与优先方向，具体新增修复尚未实施，既有批准文档与历史试跑结果保持原记录。

当前接续：2026-10-06 用户明确要求让 Grok 与 Qwen 再跑以定位问题，授权通过已有组件评测台进行真实模型试跑。只做珐琅徽章，各模型工具／直接两组；固定当前工作区工具快照与共同参考，顺序执行，到几何人工验收节点停下。关键视觉节点人工验收，其余自动；按用户无限 token 条件记录用量与耗时，不沿用旧 12 分钟淘汰线。历史作品与失败继续保留。

[打开组件评测台](http://127.0.0.1:55628)。左侧选择模型与工具／直接条件，创建任务卡后显式开始；可查看实际模型、派发提示、工具调用与结果、文件前后版本。几何、材质合成和动作节点等待用户验收，退回保留原版并携带反馈重做。首次底座交审曾配置历史 V3 快照；本次试跑冻结当前 `skill/`，SHA-256 `f4871fe7212a6f57e93fe16d8ef65d88cfb6d168cd31c3145149150785bbe20c`，来源为 HEAD `139dca4` 加已记录的本地修改，不冒称远端 DEV 最新提交。旧 V3 快照保持原样。

本次执行批准：用户原话“那能不能让grok 还有qwen去在跑跑试试看 看看是哪儿的问题”。请求模型为 `futureppo/grok-4.7` 与 `futureppo-qwen/qwen3.8-flash-next`，实际模型必须以完整响应确认，不允许静默回退。不提交用户评分或代替视觉验收，不提交、推送或发布；此批准接续此前底座实施批准，覆盖本次真实模型调用。

试跑记录：[component-evaluation-pilot-20261006.md](component-evaluation-pilot-20261006.md)，四组执行结束，报告待用户审阅。Grok 工具组缺参考文件、直接组缺灰模页面，失败原样保留；Qwen 两组灰模独立运行检查通过，均停在几何人工验收。最终审计 86 条已封存 artifact 元数据与四组 native state/events 通过，实际模型均与请求吻合；未提交用户评分，材质与运动尚未派发。定位了评测台工具入口前置输入缺失、参考误识别未校对、落盘与编辑／环境问题；本轮未改工具或后端源码，完整工具工作流与最终珐琅画质提升仍未验证。运行原样记录留在忽略目录，报告只保留公开事实与必要参数元数据。

真实试跑交审记录：2026-10-06 四组完成到约定终点，报告待用户审阅版 SHA-256 `45133012ce70854c6e4f1ec769068c4b9c20f214afb527cee6ae90867dd0618e`；最终断言记录 `pilot-20261006/final-audit.json` SHA-256 `f4e4d11baa3a514a9c2db5162aeb1c82391a3d543afad87808c5a595684d25f5`。批准执行不表示用户已认可灰模、报告结论或工具修复方案。

实现入口为 `scripts/component-eval.cjs` 与 `scripts/component-eval.html`，唯一新检查文件为 `tests/component-eval.test.cjs`。底座交审的独立验证报告见 [component-evaluation-verification.md](component-evaluation-verification.md)，其当时只有受控子进程与隔离浏览器数据，没有新增真实模型作品或用户评分；后续真实试跑另记，不改写该验证结论。

实现交审记录：2026-10-06 本地底座与必要检查完成；验证报告待用户审阅版 SHA-256 `63424069cdbadedb4bc5b1288987f1319a4d1b6d671799494851cd5fdbd9ecdc`。原批准仅覆盖实施与验证，不表示用户已经认可本次实现结果。

2026-10-06 用户收敛范围：只测试原片的珐琅徽章。前端与游戏 VFX 停止；随后用户授权加入刚配置的 Qwen 3.8 Flash，只追加这一模型的徽章工具 / 直接两组。旧记录保留。

- [proposal.md](proposal.md)：需求、范围与交付标准。
- [component-evaluation-srs.md](component-evaluation-srs.md)：已认可的评测底座范围、任务粒度、真实过程、人工验收与 token 政策；原批准正文保留。
- SRS 批准记录：2026-10-06 用户在本聊天回复“好”，认可该规格和“不另出 SDD／独立测试计划”的轻量建议；版本 SHA-256 `17e0f964a899de3c492d56f05cc8e350d0242d836ad9427e46173f33ac4c7333`。原文内的待审标记是批准前状态；本记录明确本轮认可，不表示代码实施批准、提交或归档。
- [component-evaluation-implementation-plan.md](component-evaluation-implementation-plan.md)：已获准的最小端到端工作、具体文件改法、接口与检查；保留原批准正文。
- [component-evaluation-baseline.md](component-evaluation-baseline.md)：改前 QA 与工作区事实；检查完成，供本轮审阅。
- 实施批准记录：2026-10-06 用户再次回复“好”，认可实施计划、单事项端到端工作建议与改前基线，并批准本地实现及必要验证。实施计划 SHA-256 `d03b3db8483d8fb4f49411889567496a88836392c1b4dc5761abcbe7c1185c49`；基线报告 SHA-256 `ecb9d151d284a8b68dce3591464d9d46f23f175d27048902ce360ddc0e9ebcb4`。原批准正文保留；不包含新模型制作、提交或发布。
- [design.md](design.md)：可复用制作流程、实验控制和判断方法。
- [results.md](results.md)：历史各版、真实模型与本轮结果。
- [badge-prompt-review.md](badge-prompt-review.md)：两种实际提示、各模型公开执行轨迹、源码与画面错误、共同失败原因。
- [tasks.md](tasks.md)：完成状态和未完成项。
- [tool-dispatch-repair-plan.md](tool-dispatch-repair-plan.md)：本轮工具入口、参考模式和拆解指导的复现、文件级修法及回归安排；实施前读。
- [tool-dispatch-repair-verification.md](tool-dispatch-repair-verification.md)：工具补丁红绿／QA、边界及视频样帧／动画理解只读核对；结果交审时读。
- [visual-task-execution-plan.md](visual-task-execution-plan.md)：本轮从拆解指导转为实际细任务派发、证据推进和失败返修的文件级计划；待审，尚未实施。
- [specs/film-evaluation/spec.md](specs/film-evaluation/spec.md)：成功与拒绝场景。
- [specs/job-routing/spec.md](specs/job-routing/spec.md)：已完成的历史路由修复。
- [specs/toolchain-routing/spec.md](specs/toolchain-routing/spec.md)：Three.js 生命周期、显式图形选择和规范请求交接。
- [specs/workflow-guidance/spec.md](specs/workflow-guidance/spec.md)：轻量参考复刻和逐视觉目标任务指导。
- 前一项工具修复：[require-film-material-routing](../require-film-material-routing/proposal.md)。

私有视频、原始模型事件和运行文件保留在被 Git 忽略的 `.design-pipeline/video-ab/`。模型 ID 是实验溯源，不是项目默认配置。无远端发布。

新工作台的原始 OMP 事件与 stderr 单独写入 `.design-pipeline/component-eval-private/`，位于现有预览根目录之外，不通过工作台静态入口提供；公开接口只返回过滤后的事件。旧预览服务和已有历史文件保持原样，不据此承诺其历史原始文件不可通过旧服务访问。

执行归属：复用本聊天工作区与分支，同一 OpenSpec change。正式实现前尝试宿主规定的 Multica 项目登记，`multica --server-url http://100.80.110.105:3010 project list --output json` 返回退出码 1、服务暂不可用；未取得原生 issue。按已有本地实施授权继续，进度与证据留在本 change；未另开 GitHub issue，未提交、推送或归档。服务恢复后需查重承接登记。

唯一目标是徽章的形态、蓝色釉面、金属掐丝、虹彩嵌片和五层拆合。运行检查与视觉接受分别记录；没有视觉评分就不能声称工具提升了画质。

历史整组件实验此前共 8 次徽章尝试，3 份完整作品；其余包含未生成和不完整作品。历史阶段追加 Qwen 两组后累计 10 次徽章尝试；对照 MiniMax、Grok 和 Qwen，各模型直接 / 工具两份，MiniMax 直接组缺作品如实保留。这与本次分步评测台四组另行记录。Codestral 的徽章失败和其他 16 次已执行尝试只作历史记录。

[进入徽章对照](http://127.0.0.1:47831/model-eval/review.html)。每行一个模型，左直接、右工具，6 个配对位置、5 份可查看作品；默认显示模型，预览从 0 秒开始，JSON 包含同一归属。Qwen 两份原作已固定摘要，运行 / shader / 实际播放检查通过；工具组到达预算时限的执行状态保留。用户随后明确表示当前几个效果均不满意，视觉拒绝已记录，数字评分仍未填写；此 change 保持未归档。

| 页面标记 | OMP 实际响应模型 | 条件 / 状态 |
| --- | --- | --- |
| G | `minimax-code-cn/MiniMax-M3.1-Flash-Preview` | 直接组，V3，未生成作品 |
| F | `minimax-code-cn/MiniMax-M3.1-Flash-Preview` | 工具版，V3，有作品 |
| H | `futureppo/grok-4.7` | 直接版，V3b，有作品 |
| E | `futureppo/grok-4.7` | 工具版，V3b，有作品 |
| Q1 | `futureppo-qwen/qwen3.8-flash-next` | 直接版，V3q，有作品，检查通过 |
| Q2 | `futureppo-qwen/qwen3.8-flash-next` | 工具版，V3q，有作品，检查通过；执行到达时限 |

更早的 V1 直接版 / 工具版与 V2 GLSL 修正版由 Codex App `gpt-6.1-sol / max` 制作，不属于 E–H 的 OMP 作品。原始参考视频的作者模型未知。当前模型默认可见，新增评分为非盲评；既有评分元数据保留。

历史 V3q 的 Qwen 名称已由两组实际 OMP 响应确认；供应商内部权重未独立验证。那两组沿用相同 V3 冻结工具快照、图片和 high 推理 / 12 分钟预算，便于同模型配对；本次分步评测台四组的快照与不限累计 token／制作时限另见上方新报告，不改写历史预算。

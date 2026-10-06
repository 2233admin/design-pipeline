# 珐琅徽章：Grok / Qwen 真实分步试跑

状态与批准记录见本目录 [README](README.md)。本报告接续底座验证，不改写历史实验或底座交审报告。

本次只做用户原片的珐琅徽章。通过同一组件评测台与 OMP 18.6.1，顺序执行两模型的工具／直接配对，到几何人工节点或明确失败停止。没有累计 token 或制作总时限淘汰线；网络首事件／静默超时沿用两组共同的 600 秒配置，自动重试与模型回退关闭。使用量是供应商各请求报告的累加，包含缓存和重复提交，不是独立上下文长度或费用。

当前工作区 `skill/` 冻结摘要：`f4871fe7212a6f57e93fe16d8ef65d88cfb6d168cd31c3145149150785bbe20c`；来源 HEAD `139dca4daea470f0ca7529973421f55a403fc7eb` 加保留的本地修改，不冒称远端 DEV 最新提交。旧 V3 不变。两模型四组公共输入摘要均为 `729509854db56fae41f0c6b4c58093f860892800f7dcfad2dce7d91ff87c4212`，共同依赖 Three.js 0.180.0 与 GSAP 3.14.2，推理设置 high。实际模型以 OMP 完整响应身份记录；供应商内部权重未独立验证。

## 当前结果

| 请求模型／完整响应模型 | 条件 | 运行 ID | 结果 |
| --- | --- | --- | --- |
| `futureppo/grok-4.7` | 工具 | `badge-ae63f58a1d2188` | 参考阶段失败：三次 write 缺 content，最终正文只在回复里，缺 reference.md |
| `futureppo/grok-4.7` | 直接 | `badge-82c889e6722766` | 参考落盘完成；灰模失败：只回复 HTML，没有 index.html |
| `futureppo-qwen/qwen3.8-flash-next` | 工具 | `badge-78533faa597177` | 参考完成；灰模独立运行检查通过，停在几何人工验收 |
| `futureppo-qwen/qwen3.8-flash-next` | 直接 | `badge-96cb7a5d568ccf` | 参考完成；灰模独立运行检查通过，停在几何人工验收 |

| 组别 | 参考／灰模用时（秒） | 工具发起／错误 | 报告 token |
| --- | --- | --- | --- |
| Grok 工具 | 337.156／未进入 | 25／6 | 379,622 |
| Grok 直接 | 182.188／79.105 | 16／4 | 178,880 |
| Qwen 工具 | 238.846／1262.507 | 160／18 | 6,856,417 |
| Qwen 直接 | 172.695／1090.360 | 91／11 | 2,993,165 |

用时含本阶段执行与独立检查，不含人工等待。错误数按公开 tool-end 的 isError 统计，不包含被管道隐藏退出码的 CLI 错误或所有代码语义问题；用量不是视觉成绩。

两份 Qwen 灰模都取得独立的 `front.png`、`side.png`；各编译 6 个 shader、链接 3 个 program，页面与 shader 错误记录为空。编译检查针对灰模实际 WebGL 程序，不表示已实现或验收珐琅材质。几何产物摘要：

- 工具：`sha256:07caaca039d9520c06ed43e78346f0f3ee4b3497653d56f0019041adce93bfa7`。
- 直接：`sha256:257e846edd18269d18b266d149c6ba02f30d589ad9fd1e210aa7b560b5ba95bf`。

最终核验使用既有 artifact v1 校验器检查 86 条已封存元数据（Grok 直接参考 2、Qwen 工具 59、Qwen 直接 25），均 ready；四组 native state/events 均 consistent，plan 校验通过，前后输入与实际模型一致，未观察到回退。工具快照、后端与 UI 源码摘要不变，既有获准文档四份摘要不变。本轮仅更新报告、README 和任务状态，另留忽略目录内试跑记录；没有修改工具或后端源码。

以上证明记录与文件摘要可追溯，不等于完整 Component Conformance 门禁通过。工具组正式 toolchain 前置输入仍未接齐，完整 Component Conformance 未验证；所有阶段 Visual Acceptance 为 not-evaluated，人工 review 为 null。两份灰模可在[评测台](http://127.0.0.1:55628)选择对应模型与制作条件查看；独立正面截图：[工具](http://127.0.0.1:47831/model-eval/component-workbench/badge-78533faa597177/attempts/geometry-ba57c18078/work/front.png)、[直接](http://127.0.0.1:47831/model-eval/component-workbench/badge-96cb7a5d568ccf/attempts/geometry-b2bc15a895/work/front.png)。

## 已定位的事实

| 结论 | 验证方式 | 结果与局限 |
| --- | --- | --- |
| 工具组小任务与工具入口的前置输入未接好 | 核查两模型公开命令结果、路由、skill/SKILL.md Loop、派发与 CLI 源码；Grok seq 9/17/33/40，Qwen seq 31/153/163/167 | SKILL 的标准入口是 next，但评测台 guide 先指定 route，没有建立 next 的流程前置输入。route 能识别 graphics-runtime，却只给 command/action；toolchain resolve 要求 --artifact 指向 typed JSON，且请求需要 jobPlanPath／jobPlanSha256 等 Stage 0 绑定，派发未给文件或生成步骤。两模型均试错；Qwen 将 HTML、Markdown、路由 JSON 当请求。foundation 缺 DESIGN.md/MOTION.md，参考小任务还被全局基础门禁牵引。这首先暴露评测台自己的派发接线问题，以及工具 route 输出与小任务可执行输入间的缺口，不能只归因模型。 |
| 落盘失败来自已经解析的模型调用缺参数；未发现工作台删除正文 | 逐一对应私有 OMP 日志的 message_end 中 write toolCall 参数与 tool_execution_start；仅检查参数键和正文长度，不公开内部思维 | Grok 工具三次调用均为 i/path，没有 content；Grok 直接参考调用包含 1884 字符 content，进入执行器后仍保留；Qwen 首次遗漏后补传 3835 字符成功。证明本轮记录边界之前已有遗漏；尚不能区分供应商输出与 OMP 更早的解析层，也不能断言所有调用都会丢正文。 |
| 模型最终总结不能替代真实动作和文件 | 对照 Grok 直接的公共事件与落盘文件；参考 seq 4/6/8/10/33/36，灰模 seq 50 | 参考总结声称“真实错误：无”，此前四次 read 已因 i 超过 200 字符被拒绝。灰模回复有 HTML，实际零次 write、无 index.html；回复代码还引用 CDN Three.js r134，未提供 __ready/sampleTime/yaw/explode。评测台按 OUTPUT_MISSING 保留失败，未当作品通过。 |
| Shell 调用错误，模型自行猜测预装环境 | 核查 Qwen 公开事件 seq 41/42、206/208 | 派发已提醒不要混用 PowerShell/cmd 与 bash，模型仍混用了一次 cmd for，随后纠正；尝试 require puppeteer 失败，puppeteer-core 可找到。派发未提供具体解释器、预装模块版本／路径和检查器入口。本轮未改依赖或安装包。 |
| 部分 CLI 失败被 shell 管道隐藏退出码 | 核查 Qwen seq 163/164、185/186 的完整公开输入／输出 | command 用 head 截断后返回 shell 成功，但内部 JSON 包含 ok:false / JSON_PARSE / CONTRACT_INVALID。时间线保留原文，工具条目显示结束；不能把 shell 的成功当管线成功。Qwen 的 /tmp 请求被现有路径边界拒绝，bash 临时文件写入的完整作用域未验证，评测台没有 OS 沙箱。 |
| Qwen 编辑错误曾造成真实空画布，后续自行恢复 | 亲自打开实际生成页面，CUA 本轮 22:02 UTC 的截图与 dev.logs；核对 Qwen seq 370/378 的自修记录，再检查真实控件与最终独立截图 | 初次页面只有控件，报 buildL2 中 undefined.n，位置为 badge.js:229（P.ladder）。模型恢复参数后重新加载可见灰模，亲自用键盘将 yaw 改为 36°、explode 改为 1，实际五层拆开。结束后的独立运行检查通过，固定版本已封存；灰模与参考的几何差距仍待用户判断。 |
| 参考拆解的文件检查不校对观察，错误描述会自动成为上游 | 对照 Qwen 直接 reference-663eb32c1b 的 reference.md §2、共同 front.png、最终灰模及评测台 execute 的 external-file-check | 文档将第三片写成“下偏左”，固定正面图中它位于中心右下方；文档成功落盘就自动推进到灰模。最终直接版也与参考有可见结构差异：出现整圈大环、四瓣布局与伸出六边轮廓的斜杆。此处记录位置／结构事实，不填写用户视觉评价或评分。灰模任务还同时承担轮廓、五层厚度、全部圆环／镶片与叠层；缺少逐部件的明确输入，几何验收前没有中间校对点。 |
| 编辑与自检折返是两组共同问题 | Qwen 直接 seq 172/176/242/254 的公开自修与 edit/bash 结果，对照工具组已记录的误删及参数错误 | 直接版多次出现编辑范围数错、重复板件和变量顺序错误；自检曾因未给 Node 设置 THREE 全局而报错，后来恢复。这说明部分错误在共同 OMP 编辑／环境接口与模型使用方式上，不能全部记作工具路由缺陷。直接版 seq 325 删除自有测量脚本和自检截图，阶段前后快照无法直接展示这些中途文件；工具调用与结果仍在事件日志里，最终外部截图另行封存。 |

## 验收条件与证据

| 本轮条件 | 由什么验的 | 结果 |
| --- | --- | --- |
| 仅徽章、两个模型、各工具／直接，公共输入与版本可追溯 | runs.json、freeze.json、每尝试 input-record.json / prompt.md、final-audit.json | 四组顺序试跑结束，共 7 个阶段尝试；没有前端、游戏 VFX 或材质／运动派发 |
| 真实模型身份与过程可见，错误与失败不伪装为成功 | /api/detail、/api/events；实际评测台时间线与最终审计 | 四组请求／完整响应身份吻合，Grok 两组失败保留；Qwen 两组均取得可运行灰模 |
| 不沿用旧 12 分钟淘汰线，不静默回退 | 各尝试命令、共同配置与公开事件 | 命令不含 max-time；模型回退关闭，尚未观察到回退 |
| 几何人工节点停下，不由 agent 接受或评分 | 运行状态、review 字段 | Qwen 两组停在 awaiting-review；四组未提交 accept/reject 或数值评分 |
| 能定位问题，并区分工程检查与视觉进步 | 本报告事实表与源码／事件核对 | 已定位前置输入、参数／落盘、shell／环境问题；珐琅视觉效果未回答 |

## 证据位置与未回答项

运行摘要与公开事件位于 `.design-pipeline/video-ab/model-eval/pilot-20261006/`，对应 `<run-id>-detail.json` / `<run-id>-public-events.json`；`final-audit.json` 记录 2026-10-06 06:34:45 +08:00 的最终断言、各阶段提示／输入摘要、产物摘要与私有原始事件文件摘要。运行自身事件、每阶段输入、before/after、源码与产物在 `model-eval/component-workbench/<run-id>/`。私有原始 OMP 与 stderr 在 `.design-pipeline/component-eval-private/<run-id>/<attempt-id>/`，不经新评测台公开。当前后端源码 SHA-256 `6b063bade09748c13e8cd9a1511e96dc7caeee247a1bdb1d8a157bc27c0ac3b3`，UI 摘要 `32bf9f74a0f0877380642e96de55dbcaba3e8aeab635646c4f3849115e815911`。

本轮只推进到第一处人工几何节点；没有验收后的珐琅材质或运动效果。一次配对、失败或灰模均不能证明工具提高或降低了最终画质。当前工具组只实际走了路由／指南阅读与模型制作，没有完成标准工具工作流，因此“完整工具有没有提升”仍未回答。

优先修复评测台与工具的交接：沿用既有 next、reference-evidence、job／target 和 v1 receipt，接齐小任务可执行输入；把轮廓、叠层、圆环／嵌片的目标与参考证据交代到具体部件，明确本地依赖、编辑接口和文件交付。随后由用户审阅真实灰模，给出几何反馈并决定材质推进。本报告定位问题，不把待修项写成已修复；不新增并行门禁或另一套 receipt。

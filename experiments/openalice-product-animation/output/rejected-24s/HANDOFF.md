# 新 session 交接：当前效果被用户否定，需要重新做产品动画

## 最高优先级：用户最新纠正

用户原话（2026-09-17）：**“这个效果肯定是不对的，做的跟 PPT 一样”**。用户要求换新 session 交接。

随后用户补充原话：**“而且这个根本就不能满足通知较为第三的开关，然后我开发新 Session，我想通过 OMP 去开发咱们这个任务”**。
明确偏好：新 session 通过 **OMP** 推进本任务。OMP 的确切工具/流程，以及“通知较为第三的开关”所指的功能或要求，当前尚未明确，已经向用户提出澄清。新 session 必须优先接收后续澄清；不得擅自解释 OMP 的缩写、替换为其他工作流，或将无法识别的“开关”要求丢弃/标为满足。

**当前视觉效果未验收，原始产品动画目标未完成。** 上一 session 的“做完了”仅对代码集成与技术验证成立，不能作为产品效果完成的结论。此前 qa.md 的自评和“无视觉 blockers”被此次用户反馈取代。不要以已有测试、自动播放或已合入 osprey 为由维护旧方案。

## 原始目标与仍有效的边界

把缺失的产品动画能力接入 osprey，实际产出有自主时间线、场景和转场的短产品动画，观看实际成片后再优化 pipeline。不得停留在滚动网页、静态 mock，**也不得把自动翻页式 PPT 当作产品动画交付**。

保留 osprey 的所有无关 dirty/untracked 用户工作；不 reset、clean、discard、覆盖或顺手提交。遵守 CLAUDE.md、openspec/project.md、相关 change contracts；仓库变更后运行 `node scripts/qa.cjs`。任务状态只更新现有 Multica **CERE-482**，不要重复开票或标 done。

## 当前代码与身份

- 当前 worktree：`D:/projects/design-pipeline/product-animation-integration`，分支 `product-animation-integration`。
- 目标 worktree：`D:/projects/design-pipeline/osprey`，分支 `osprey`。
- 交接记录前两分支均为 `037d31e`。
- `472a4514dd9d1e7fb64c39e7972349f300b71ce7`：Stage 0 绑定与视频交付形态路由修复，已合入两分支。
- `5fe0b31ef9cf38b376e110c2609ed0b5a8a84c4e`：当前被否定样片与技术验证。
- `037d31e`：集成 QA 与文件保留证据。
- 旧 session/thread：`01a0af45-0f67-7392-b5f5-ae6f54242f36`；terminal `term_61f17fb1-11b9-4d46-9176-e8e166957529`。

## 先看什么

1. 本交接及 CERE-482 最新评论，以用户纠正为准。
2. `experiments/openalice-product-animation/watch.html` / `output/openalice.mp4`：**失败样片**，不要当风格标杆。
3. `experiments/openalice-product-animation/index.html`、STORYBOARD.md、DESIGN.md、MOTION.md：当前固定横版、大标题配面板、五段轮换的方案。需要允许重做，不是已批准设计。
4. `openspec/changes/integrate-product-animation/qa.md`：仅其中技术实测仍有效；视觉结论已经撤回。
5. `evidence/osprey-before.json`：原有 24 个用户文件及哈希；开始前重新核对 live 状态，不假定用户没有新增修改。

## 为什么偏了（本 session 的诊断，不是用户新给的设计规范）

把“有有限时间线、输出视频、场景能自动切换”误当成了“产品动画质量达标”。实际上采用大标题、卡片、分行信息，依靠淡出和滑入切页；主要内容在每页静态停留。虽然有少量连接线和条目动画，整体运动叙事仍像 PPT。源画面检查只修了标题重叠和进度跳变，没有挑战场景组织方式本身。

## 新 session 应推进的下一步

- 首先实际观看失败样片，简明指出哪些表现造成 PPT 感。不要再次只读源码/截图就宣布动画质量通过。
- 重新建立视觉方向和运动叙事：探索产品对象之间连续的关系、状态变化、空间/视角与构图变化；让运动解释产品机制，而不是依靠标题与卡片切换讲述。以上是待验证方向，**不是用户已批准某种 3D、镜头或特效风格**。
- 若缺少明确风格参照，提出最少但关键的方向问题或提供可观看的运动参考；不要让用户重述已经明确的“不像 PPT”。
- 可以先渲染一段能验证新方向的连贯运动片段；它只验证方向，不能取代最终完整短片交付。不要一次性再铺满五个类似页面后才发现方向不对。
- 更新当前 OpenSpec/目标设计与运动文档，再做完整成片。真实视频检查要覆盖整体节奏与连续运动，技术测试与视觉接受分别记录。未获得支持前不宣称用户满意。
- 在作品效果成立前，暂停继续优化共享 pipeline、准入体系、指标或流程文档。现有路由修复与可用渲染工具可以复用。

## 可复用的技术基础（不是视觉验收）

目标独立依赖：HyperFrames 0.8.46、GSAP 3.15.0、Playwright 1.62.0；FFmpeg/ffprobe 已可用。

在 `experiments/openalice-product-animation`：

```sh
npm ci --no-audit --no-fund
npm run lint
npm run check
npm run render
npm run verify
```

当前任务 worktree 已安装 node_modules；osprey 不保证已安装，watch.html/MP4 无需安装即可看。
`index.html` 是渲染器控制的 paused GSAP timeline；`preview.html` 单独驱动预览；`watch.html` 播放实际 MP4。
`run.cjs` 封装渲染与检查，`verify.cjs` 测量播放、解码、seek、控制、减弱动态效果并输出证据。重做画面后要相应更新场景、时长、选择器和断言，不能沿用陈旧 receipt。

上一版技术证据：24 秒、1280×720、30fps、720 帧，原生视频 0 丢帧；task QA 668/668、osprey QA 714/714；原有 24 文件字节保留。**这些结果不能证明产品动画效果正确。**

Stage 0 正确识别 motion-graphics / product-launch-video，但共享 HyperFrames 目录仍为 review，toolchain-plan 如实 blocked。之前按用户授权与已有 reference fallback 验证目标本地运行时，未做全局准入。不要偷偷修改状态为 ready。

## 用户文件与产品语义

`experiments/openalice-showcase/` 是用户原有滚动网页；`add-design-quality-baseline`、`openalice-showcase-timeline-runtime` 及其相关源文件也属原有工作。失败动画的新目录可以重新设计，但不能覆盖旧目录。

OpenAlice 内容来自之前样片记录的产品事实；未复制产品源码、截图或品牌素材。交易审批边界仍有效：表现研究到决策的过程，不把画面自动推进画成未经人工批准的真实自动交易。是否继续原有英语文案、无声、24 秒、五场景、横版等均是上个 agent 的实现选择，不是不可变的用户要求。

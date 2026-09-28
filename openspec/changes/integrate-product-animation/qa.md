# CERE-482 产品动画重设计验证

## 结论边界

旧 24 秒片被用户明确否定为“跟 PPT 一样”。旧自评分数和通过语句均不适用于新片；旧源码、视频、技术回执及 QA/HANDOFF/tasks 已保存在 `experiments/openalice-product-animation/output/rejected-24s/`。本轮的完整片为 **20 秒单研究对象连续变化**。技术完成、主控观看预检、用户视觉接受分别记录；**用户视觉接受仍待明确反馈，不能标 done**。

实施契约：`_bmad-output/implementation-artifacts/spec-cere-482-product-animation-redesign.md`。当前目标：`experiments/openalice-product-animation/`。播放入口 `watch.html`；authored timeline 入口 `preview.html`。

## 方向样片的真实观看门槛（历史：`output/sample-approved/` 已由下方 `## 2026-09-17 motion-web 研究与证据血缘重做` 段落的 `output/rework-sample-7.5s.mp4` 取代，不复用）

7.5 秒样片首先经历两次修订：`sample-v1-overlap.mp4` 有文字重叠，`sample-v2-panel-rejected.mp4` 仍偏面板/PPT。通过版本保存在 `output/sample-approved/`，包含源 HTML、视频和检查回执。

主控以正常速度实播通过样片后才放行20秒扩片。首次加载期间的 play 被 loadedmetadata pause 打断，time 0 / 8帧不计证据；readyState 4 后重新 play，实际时钟采样 **0.874 → 1.918 → 2.924 → 3.929 → 4.948 → 6.020 → 7.289 → 7.5，ended**。主控观察：

1. 同一 `$115.2B` / `[1]` 来源内容从近景落入正文；指标明确 `Data Center revenue / FY2025`。
2. v01 空研究/v02 带证据的真实内容缩略从原纸面抽出，原件留驻。
3. 4.95 秒附件缩略由原研究区域迁向 Inbox，6.02 秒引用关系成立，workspace 原件仍在。
4. 正常速度能区分上述因果事件，无关键叠字。

这是**主控扩片预检，不是用户视觉接受**。完整片另需正常速从问题建立看到20秒结束，不能只看关键帧。

## 上一版完整片主控观察（历史）

上一版完整20秒片主控正常速实播已通过预检：采样 **2.206 / 4.531 / 6.849 / 9.212 / 11.570 / 13.926 / 16.285 / 18.652 / 20 ended**，全程 droppedVideoFrames=0。主控看到问题建立→同证据落正文→v01/v02留存→附件移交Inbox→17–20秒人review边界；没有旧五章切页、关键叠字或交易误示。此为历史版本主控观察，仍不是用户视觉接受。

上一版 Review批修后的 MP4 另由主控通过file://正常速重播至20秒ended、0drop，确认收紧末态在原生ended controls显示时两句人审边界不重叠。此仍是历史版本主控预检，不替代用户视觉接受。

## 上一版 panel choreography 历史技术证据（已由下方 motion-web 重做取代）

以下记录属于被替代的 panel choreography 版本，不是当前片的技术或接受结论。该版本的目标目录 `npm run lint`、`npm run check`、`npm run render`、`npm run verify` 全部 exit 0。Review批修后历史 verification 记录于 **2026-09-17T14:56:30.688Z**：H.264 / 1280×720 / 30fps / 20秒 / 600帧，FFmpeg完整解码成功；自动预览经过全部六个时间区间；原生媒体播放 ended20，600 frames / 0 dropped。

该历史版本的601个帧时点DOM观测保持原件身份及归属；finding与citation从3.333秒、v01从7.467秒、v02从7.833秒、Inbox从10.8秒可见后持续留驻。倒seek像素hash一致；键盘replay/pause、逐段跳转、iframe reload/pagehide清理、reduced-motion末态与手动导航、390px无横溢均通过，浏览器错误/远端请求为零。

该历史版本 MP4 SHA256：`f258e4184ef372842ae34d6311af3eb3533cf6c92d068b415d0c19d7e0a09414`。验证器首轮因ready谓词返回paused GSAP thenable而超时；改为Boolean就绪值、seek不返回thenable后完整重跑。批修后另纠正透明footer截获hit-test的观测器问题：过滤实际不可见的命中层，不放宽来源时序断言；finding/citation仍同时3.333秒可见，截图佐证。未吞异常或修改影片来配合断言。

- `output/lint.json`：HyperFrames lint。
- `output/check.json` / `check.log`：运行时、布局和对比度原始结果。
- `output/render.log`：实际编码结果，生成 `output/openalice.mp4`。
- `output/verification.json`：该历史版本当时的源/文档/路由/锁文件/视频哈希，以及解码、真实媒体时钟、控制与连续性实测；当前 receipt 以文末 motion-web 重做段为准，不能复用24秒旧 receipt。
- `output/frame-*.png`、`contact-sheet.png`、`encoded-playing.png`：该历史版本 MP4 的解码帧/原生播放证据。
- `output/transition-source-contact-sheet.png`：该历史版本3–5.3秒来源运动；`transition-versions-contact-sheet.png`：7–8.25秒版本抽出；`transition-inbox-contact-sheet.png`：10.5–11.7秒附件生成。每段7个实际编码帧，具体时间写入当时 receipt 的 transitionFrames，未用DOM截图替代。

### 上一版布局检查记录（仅作历史保留）

上一版 HyperFrames check 为 `ok: true`，layout **0 errors / 2 warnings / 7 info**，contrast **104/104 passed**，runtime 无错误。Motion assertion detector 明确 disabled，不能把该行当成运动验证；另由 verifier 提供。当前 check 结果见文末 motion-web 重做段：0 warnings / 0 infos、contrast 119/119。

| 时间 / 对象 | 原始发现 | 判断与观察依据 |
| --- | --- | --- |
| 7–8秒，v02快照文件名 | 原先 text_occluded：副本从原件背后抽出时被原件遮住 | 这是样片已通过的背后抽出动作。只在 aria-hidden 的实际内容快照上声明 `data-layout-allow-occlusion`；原研究、原来源、Inbox可读文字无豁免。8秒浏览器画面可见v02正在露出且原件完整。 |
| 7–7.25秒，原研究问题与 v01 副本文件名 | 保留 content_overlap warning | 几何投影相交，但副本在不透明原研究下方；7.2秒浏览器画面只有前方正文可读，没有两份字混合。 |
| 7.125–7.25秒，原指标标签与 v01 副本问题 | 保留 content_overlap warning | 同一抽出动作的几何相交，副本仍在纸面背后；原指标/来源未被遮。未添加 allow-overlap，也未过滤报告。 |

检查期间曾因长行工具输出截断而在等价CSS清理中丢失版本定位后缀；检查失败，停止该轮并恢复完整声明、拆成短行，随后重新执行全套目标路径。该失败不被视为成功证据。

### Review修复：原生控件与交互边界（历史，属于被替代的 panel choreography 版本，已由下方 motion-web 重做取代）

17–20秒保持同一desk并收紧末态，为原生控件预留底部210作者像素。实现侧在Chromium实际file:// watch测试：390px首次reduced motion到time20/paused；正常暂停19.9；桌面从19.5播放到ended20。以上均让native controls显示后拍摄，末尾两句未被控件遮住，原研究/版本/Inbox可辨认。证据：`output/native-reduced-mobile.png`、`native-paused-mobile.png`、`native-ended-desktop.png`。这是所测Chromium表面，不声称所有移动浏览器均一致；横版小字缩放仍由框外transcript补充。

实际Python8767服务不支持Range：buffered为[0,20]而seekable为[0,0]，设置currentTime20仍回0。它只用于iframepreview/顺序播放，不作为seek/reduced末帧证据；file:// watch与verify既有Range server可验证末帧。播放器须依据实际时间描述paused状态，不能把无Range的time0称作ending。

哈希记录当前文件身份，不独立认证渲染输入输出来源；该pre-existing限制未新增receipt系统。实际render日志、完整解码及MP4正常速观看是本次证据。

播放器与缩略消费者断言的scoped负向验证已通过：分别在内存删除`#version-saved .evidence-copy`与`.attachment-preview .snapshot`，新断言各自拒绝，恢复后通过。断言要求settled v01保留问题但无后增证据，v02和Inbox缩略可见且含同研究的finding及来源，而非仅检查外框。

播放器内存路由验证覆盖：404/cross-origin/file:// iframe错误提示、控件禁用及恢复；t0 Tab不进入画面；真实source新标签点击（本地拦截外站）不改变父film；MP4404后切reduced仍显示错误，实际canplay才恢复；手动seek1不被强制重置；模拟ready4/seekable[0,0]/paused0时提示下载/本地打开且不重试；首次play拒绝后真实playing清除autoplay提示。

## 产品语义与出处

历史来源：[NVIDIA FY2025 earnings release，2025-02-26](https://nvidianews.nvidia.com/news/nvidia-announces-financial-results-for-fourth-quarter-and-fiscal-2025)：Data Center全年收入115.2B美元，同比增长142%。它不是总公司收入或预测。版本、文件名、Session ID和外观是示意。

原研究、source/citation、保存版本出现后保持原身份；Inbox 是引用原文件与原Session的报告附件，而非搬移原件。画内引用是不可聚焦、不可导航的影片文字，真正来源链接留在框外transcript。片尾严格 `Ready for your review` / `No trade placed`。不存在投资建议、审批流或自动交易动作。

## 契约、范围与集成（历史，属于被替代的 panel choreography 版本，已由下方 motion-web 重做取代）

DESIGN/MOTION foundation checkers 均 ready；单一 paused timeline，`window.film` API 保留。三个 JSON 使用现有 route/toolchain CLI 按20秒 brief 刷新；jobPlanSha256 为 `049f30bb12828c861924cbe2953538b29a0a05d60f7302605f33d7eeba13582b`。toolchain resolve 返回预期 exit 2 / `blocked`：HyperFrames 为 catalog review，未伪造准入。

共享 pipeline 与旧滚动 showcase 未编辑；无外部发布、真实交易或依赖升级。切片freeze后，主控于2026-09-17T14:59:16Z运行根`node scripts/qa.cjs`：668/668测试、82个文件、11/11 installed-package smoke、可重现包及status byte-identical全部通过；摘要和日志SHA在`evidence/qa-task.json`。`openspec validate integrate-product-animation --strict` exit 0。

实现提交`733c8e9`已ff-only同步osprey，2026-09-17T15:02:18Z目的树QA通过714/714测试（84文件）及11/11 installed smoke，见`evidence/qa-osprey.json`。本轮同步后的24个原用户文件hash和status byte-identical，见`evidence/osprey-before.json`与`osprey-preserved.json`。目的树MP4 SHA与上述最终成片一致；file:// watch实际加载duration20、seekable[0,20]，seek18后播放至20 ended且无媒体错误。

Multica CERE-482已追加本轮实施/验证证据并补记遗漏，保持in_progress等待用户视觉接受；不因本地提交或规格制作done关闭票。此后仅收口文档与回执，不改已验证影片源码、播放器或MP4。


## 2026-09-17 motion-web 研究与证据血缘重做

研究报告：_bmad-output/research/motion-web-approach-analysis.md。固定上游为 feitangyuan/motion-web commit 5f4e40f1253e11e28850d08dce28b9b7e4320115；README/LICENSE 有序 UTF-8 内容哈希为 68945441b0bbd6b79f2849206c019c2c7bc01a13a2bbd5c267c9c3d5c069c1b4，许可证为 CC BY-NC 4.0。结论仅采纳其 authored beats、real-gesture probes、complaint-specific oracles 的抽象方法；未复制上游代码、资源、案例、prompt、runtime 或 workflow，codeCopied: false。

本轮不再采用旧 panel-to-panel 走位，正式构图改为 project-owned Authored Motion Graph 的 evidence-lineage-map：原研究保持唯一语义载体，装饰性证据沿 SOURCE → RETAIN → REFERENCE 共享锚点移动，版本从原件分支，Inbox 作为终点；阶段起点为 [0, 2.5, 6.2, 9.5, 13.5, 16.5]。response.spring-settle 在离线编译阶段展开为有限 GSAP keyframes，不引入实时 rAF 物理循环。

代表样片预检重新生成，不复用 output/sample-approved/：output/rework-sample-7.5s.mp4 用临时 7.5 秒 retime 覆盖完整序列，显式避免 trace-to-retain 与 trace-to-reference 重叠；rework-sample-meta.json 记录 [0.9375,3.5625]、[3.5625,5.0625] 区间。HyperFrames 采用单 worker、强制 screenshot、关闭 static-frame dedup、关闭 fast capture；rework-sample-deterministic-frames.png 的 4.1/4.5/4.8 秒关键帧无 glyph splice。实际媒体正常速率 playbackRate=1 播放至 ended，duration/finalTime 均为 7.5，monotonic 与 playback 收据通过。

正式目标验证：npm run lint、npm run check、npm run render、npm run verify 均 exit 0。当前 check 为 layout 0 errors/0 warnings/0 infos、runtime 0 errors、contrast 119/119；MP4 为 H.264 1280×720 30fps 20 秒 600 帧，完整解码和原生播放通过，droppedVideoFrames=0，SHA256 为 b91d61a3d1fb4bff171a839ba420f47b7dd0c9ff7cda046852b2f4191f0cf3dc。verifier 另锁定 graph schema、composition、六个 beat、shared-anchor 两条 trace 轨道及 spring tracks。

以上是技术与主控预检证据，不等于用户视觉接受；CERE-482 的用户视觉接受仍保持未完成。
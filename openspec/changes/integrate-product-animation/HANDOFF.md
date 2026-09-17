# CERE-482 产品动画重设计交接

## 当前交付与接受边界

实施依据：`_bmad-output/implementation-artifacts/spec-cere-482-product-animation-redesign.md`。用户已选定单一研究对象连续变化方向；主控正常速观看 7.5 秒样片后放行扩为 **20 秒完整片**。主控预检、技术检查和用户视觉接受是三件事；**不得因技术通过把 CERE-482 标 done，也不得声称用户满意**。

当前成片入口：`experiments/openalice-product-animation/watch.html`，视频 `output/openalice.mp4`。`preview.html` 是可控的 authored timeline，不是成片替代物。最新技术证据和验收限制见 [qa.md](qa.md)。正常速完整观看必须覆盖问题建立、证据落入、保存抽版本、Inbox 附件关联和最终人审边界。

## 不可丢失的用户反馈

2026-09-17 用户否定旧片：**“这个效果肯定是不对的，做的跟 PPT 一样”**。旧 24 秒五面板片与源码、证据现存于 `experiments/openalice-product-animation/output/rejected-24s/`，不要将它当风格标杆或把旧 receipt 计入新片验证。`user-rejection-comment.md` 与旧 handoff 的归档保留原话和历史身份。

当前实现只服从已确认 SPEC；本轮运行宿主为 OMP。原始 OMP / “通知较为第三的开关”要求仍未完全澄清，未被擅自解释成新功能，也不声称相关功能验收已满足。未新增其他 PM 体系。

## 新片具体变化

- 始终一个原始 `research.md`；同一 `$115.2B` / `[1]` 内容从近景落正文，之后来源留驻。
- 指标明确是 NVIDIA **Data Center revenue / FY2025**，来源为 NVIDIA Newsroom 2025-02-26 历史公告，不是公司总收入、实时数据或预测。
- v01 保留问题、v02 保留新增证据：缩略复制真实正文，从原纸面背后抽出，不是标题卡替换。
- Inbox 接收报告附件引用并关联 `Session: research-01`；原文和版本仍在 workspace。
- 终点是 `Ready for your review` / `No trade placed`，没有审批、自动提单或交易。
- 文件名、版本标签、Session ID 和空间布局都是概念示意，非实拍产品 UI 声称。

7.5 秒通过样片的源、视频和检查在 `output/sample-approved/`；`watch.html?sample=1` 可复看。之前样片 `sample-v1-overlap.mp4` 和 `sample-v2-panel-rejected.mp4` 保留作为反例，不覆盖历史失败。

## 复现与来源约束

目标目录运行 `npm run lint`、`npm run check`、`npm run render`、`npm run verify`。依赖 HyperFrames 0.8.46、GSAP 3.15.0、Playwright 1.62.0；FFmpeg/ffprobe。源码注册唯一同步 paused timeline，并导出 `window.film` 的 duration/starts/timeline/sceneAt；预览独立驱动时钟。不得恢复旧五场景或固定 24 秒断言。

画内引用已改为noninteractive文字，不能Tab进入或导航iframe；真实来源链接只在框外transcript打开新标签。`watch.html`+MP4可离线file://打开；iframe preview必须HTTP。README的Python命令只推荐preview，因该server无Range不用于MP4末帧seek验收；末帧证据使用file://与verify既有Range server。

review批修还包括原生控件末态安全区、播放器真实失败/恢复提示、版本与Inbox内容mutation回归，以及真实运动区间的编码帧；详细当前结果见qa.md和verification.json。哈希仅证明当前文件身份，不是独立渲染来源认证。

三个路由 JSON 已按 20 秒 brief 重新绑定；toolchain 的 `blocked/review` 保持真实。目标本地 fallback 不构成 shared catalog 准入。共享 pipeline、原 `openalice-showcase`、其他 OpenSpec changes 和无关用户工作不在本轮重设计编辑范围。

## 集成与收尾归属

工作树`D:/projects/design-pipeline/product-animation-integration`，目的树`D:/projects/design-pipeline/osprey`。实现提交`733c8e9`已ff-only集成；源根QA668/668、目的树QA714/714，两树11/11安装CLI smoke通过，严格OpenSpec有效。新证据在本change的`evidence/qa-task.json`、`qa-osprey.json`、`osprey-before.json`、`osprey-preserved.json`。目的树24个用户文件hash与status均保持原样；其完整MP4哈希与最终receipt一致，离线watch已实测加载、seek18及播放到20 ended。

无reset、clean、discard、外部push或顺手提交用户修改。Multica CERE-482已补实施/验证记录，保持in_progress。规格done仅表示本次获批制作完成，不代表用户视觉接受或OMP/含混开关功能验收。下一步先看完整片并收用户反馈，不回到共享pipeline或第二参考项目。

服务器Range和GSAP thenable摩擦已在目标README/QA记录；本机rhizome无sources registry，crux降级无命中，因此未冒选KB落点或新建治理设施。

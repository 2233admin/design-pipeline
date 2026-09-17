---
title: CERE-482 产品动画返工
type: bugfix
created: 2026-09-17
status: in-review
baseline_commit: a96d588a4770e09902e9c7a0c28951d7ae83f15c
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

主控推进、用户拍板；本次仅提案。实施前须过checkpoint1，批准不等于视觉验收，最终用户接受pending。中性语域待确认。

**Problem:** 主控实播旧片24秒：3.9问题、7.9代理、11.9 workspace列表、15.95排期、19.96审批，逐段身份重置。

**Approach:** 推荐“研究留下痕迹”：对象叙事可读局部变化，代价是须证明连续性。3D有氛围却空泛；UI录屏直观却缺真实UI、易轮播，均不选。

## Boundaries & Constraints

**Always:** 单研究主题、具体来源；深墨背景、暖白正文、薄荷来源、琥珀仅人类边界。初拟24–28秒横版无声可调，非用户硬要求；完整MP4+watch/preview。

**Ask First:** OMP及含混开关未澄清，不擅解或声称满足；不阻设计评审，功能验收前须澄清。

**Never:** 不靠大标题/五面板/粒子；不自动变交易提案/批准，不加交易审批；保留用户工作，不改shared pipeline，不合并/提交未批准草案。

</frozen-after-approval>

## Code Map / 触达资产

未来仅改：

- `experiments/openalice-product-animation/`内`index.html,DESIGN.md,MOTION.md,STORYBOARD.md,preview.html,watch.html,run.cjs,verify.cjs,README.md,output/*,job-plan.json,toolchain-request.json,toolchain-plan.json`：影片/设计/播放器/验证/证据。
- `openspec/changes/integrate-product-animation/`受影响文档/证据：批准后先更新，再改代码。

只读依据agent://animation-map：`D:/projects/design-pipeline/osprey/experiments/openalice-showcase/index.html:337–338`保存对话/文件/Git，379–380 Issue用Workspace agent，398–401 Inbox报告/追问回Session；上游master README称reports/questions/updates、打开研究文件或回复原Session，不证明自动实体转换。

来源局部进入、版本缩略留驻、镜头移动为本片示意表达，不是产品现有UI交互声称。

## Tasks & Acceptance

**Execution（批准后，主控负责）:**

- [x] 更新OpenSpec/设计；首次重render前保留被否定旧MP4及证据，防同名覆盖；误读则停并返工，不删唯一反例。
- [x] brief/时长变则用既有CLI刷新三JSON及hash lineage，不手改hash，旧receipt失效不得沿用。
- [x] 7.5秒样片先给主控实际播放裁决；通过才扩整片，再更新播放器、验证和文档证据；沿用HyperFrames本地fallback，catalog/toolchain仍blocked，不改ready。

**Acceptance Criteria:**

- 给定单一研究，当摘录进入正文，则局部变化留下来源；保存后workspace原研究和版本缩略留驻；Inbox新增报告/附件引用关联原Session，而非搬走原文件。
- 给定7.5秒“摘录留来源→版本留驻→Inbox引用到达”，当遮章节标题正常速看一遍，则须说清新增内容/原研究位置/Inbox收到什么；任一不清或误认成交即返工，禁止铺整片。
- 给定全片，当播至尾，则显示“Ready for your review”与“No trade placed”，仅review和未交易边界；片段不得替代整片。
- 给定新实现，当验证，则保留`window.__timelines.openalice`唯一paused确定性GSAP及`window.film`的`duration,starts,timeline,sceneAt`；替换五独立`.scene`不可并存、固定24秒旧断言；保留seek确定性、replay/pause/reduced motion和解码播放验证。

## Spec Change Log

用户选A批准实施；首轮样片因卡片/PPT感被否决，连续内容版实播通过后才扩片。最终20秒避免拖时，保留原研究/来源/版本/Inbox关联。独立审阅修复原生controls遮挡、iframe来源导航、播放器错误与noRange提示，并用thumbnail mutants证明缺失内容会被拒绝；冻结意图不变。

## Verification

目标目录`npm run lint/check/render/verify`均exit 0：最终receipt为2026-09-17T14:56:30.688Z，H.264、20秒、600帧。主控原速完整观看0→20 ended、零掉帧；最终MP4 SHA256为`f258e4184ef372842ae34d6311af3eb3533cf6c92d068b415d0c19d7e0a09414`。技术通过不等于用户视觉接受，后者仍pending；OMP及含混开关未验收。最终根`node scripts/qa.cjs`通过668/668测试与11/11已安装CLI smoke；严格OpenSpec校验exit 0。osprey同步后证据待本地集成完成回填。

## Suggested Review Order

- 先看同一研究对象及来源。
  [`index.html:37`](../../experiments/openalice-product-animation/index.html#L37)

- 再看唯一确定性时间线。
  [`index.html:61`](../../experiments/openalice-product-animation/index.html#L61)

- 检查错误与无Range边界。
  [`watch.html:40`](../../experiments/openalice-product-animation/watch.html#L40)

- 检查画面与来源导航隔离。
  [`preview.html:14`](../../experiments/openalice-product-animation/preview.html#L14)

- 最后看缩略消费者负向验证。
  [`verify.cjs:84`](../../experiments/openalice-product-animation/verify.cjs#L84)

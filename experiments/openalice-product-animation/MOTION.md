---
schema: design-pipeline.motion-foundation.v0.1
name: OpenAlice persistent research motion
posture: expressive
primitiveRegistry: design-pipeline.motion-primitives.v1
primitives:
  - continuity.shared-anchor
  - response.spring-settle
  - reveal.trim-line
proceduralMotion:
  policy: disabled
runtimePolicy:
  runtime: gsap
  dependencies: GSAP 3.15.0 and HyperFrames 0.8.46
  owner: authored-time
  rationale: Authored Motion Graph compiles semantic beats and bounded spring responses into one paused seekable timeline.
  cleanup: Preview pauses on pagehide and removes callbacks and observers.
reducedMotion:
  substitute: Static final overview with explicit play and manual beat stepping.
sourceDecisions:
  - source: skill/references/hyperframes.md
    adopted: Single paused seekable GSAP timeline and separate preview clock.
    rejected: Independent scene replacement and remote assets.
    codeCopied: false
---

# Motion Foundation

## Motion Thesis

研究在原处增加证据，保存后留下版本，Inbox 只增加引用。镜头因保存而拉出，不搬走研究。
## Motion Principles

一次一个焦点：摘录局部入正文，保存缩略出现，报告引用到达。原研究不淡出、不重建。内容和来源留驻，不能只靠标题解释。无随机、无限循环、粒子、交易审批。

## Motion Vocabulary

primitive: continuity.shared-anchor for the evidence lineage; primitive: response.spring-settle for bounded authored responses; primitive: reveal.trim-line for the source citation. The source document remains the semantic carrier; the lineage map moves a decorative trace, not the research object.

## Procedural Motion

禁用。所有时点显式 authored，渲染不依赖网络或实时时钟。

## Runtime Policy

保留公共 `window.__timelines.openalice` 唯一同步 paused GSAP 和 `window.film` duration/starts/timeline/sceneAt。Authored Motion Graph 保持 lexical，仅由 target-local verifier-only seam 读取，不是公共集成 API，也不引入第二套 runtime。canonical 20 秒的六个 beat 为 orient → extract → retain → reference → inspect → review：0–2.5 建立原始来源，2.5–6.2 沿共享锚点传递一条带引用的证据，6.2–9.5 分支保留版本，9.5–13.5 把引用送到 Inbox，13.5–16.5 保持完整关系，16.5–20 留出人审边界。渲染不依赖实时时钟。

16.5秒收紧同一desk到末态，16.5–20秒保留原件/版本/Inbox。底部 210 authored pixels 留给原生视频控件；Ready for your review / No trade placed 两条末态文字须位于保留区上方，控件可见时仍无遮挡。画内没有交互或链接跳转。

## Derivative and Evidence

`npm run render` 生成 canonical 20 秒 `output/openalice.mp4`；`npm run render -- --sample` 从同一 `index.html` 确定性 retime 为 7.5 秒 `output/sample-7.5s.mp4`，保留全部六个 beat。临时 composition 在 `finally` 清理；`output/sample-retime.json` 绑定 source SHA256、源/衍生时长、output SHA256、临时文件创建/清理状态及 result。receipt 存在不等于成功，失败时 output hash 可为 null。`npm run verify` 需要两段视频及 sample receipt；复现步骤见 [README](README.md#reproduce)。

`--sample` 仅支持 render；lint/check 携带该 flag 会在修改文件前明确失败，不静默改查 canonical。普通 `npm run lint` / `npm run check` 检查 canonical composition；衍生样片由 `npm run verify` 验证。

按 [polish evidence contract](../../openspec/changes/polish-product-animation-evidence/specs/design-pipeline/spec.md)，`output/verification.json` 记录准确顺序 decode 的有序帧引用，覆盖 SOURCE、extract、RETAIN、REFERENCE、Inbox、inspect/review 和 ending，不以 keyframe seek 近似代替。播放证据另记 sample SHA256、真实 wall-clock samples、`playbackRate === 1`、原生 `ended` 事件及 verifier result。desktop、mobile、reduced motion、native controls visible 四个 review surface 各需独立 capture、viewport/state/path/hash，检查上述 210 authored-pixel 控件安全区。

`output/sample-approved/` 只作历史 archive，不读作衍生输入、不替代当前 receipt；`baseline/optimization-before-final/` 保持 frozen，二者不覆盖。Component Conformance 不等于 Visual Acceptance；人审视觉验收仍 pending，本文不声明检查已通过。

## Reduced Motion

Fallback / substitute：预览静止在末尾并保留 step/play/replay。MP4 是用户可控制的媒体，初始 reduced motion 不自动播放。

## Source Decisions

遵循本地 HyperFrames fallback 与项目自有 Authored Motion Graph；motion-web 只作为 reference-only 机制研究，不引入其 runtime、案例或 workflow。

- Adopted: shared semantic anchors, bounded authored spring response, real evidence oracles, and a distinct lineage-map composition.
- Rejected: upstream source/assets/prompts/cases, live rAF physics as offline source of truth, and a second animation runtime.

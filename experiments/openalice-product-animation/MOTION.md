---
schema: design-pipeline.motion-foundation.v0.1
name: OpenAlice persistent research motion
posture: expressive
primitiveRegistry: design-pipeline.motion-primitives.v1
primitives:
  - reveal.trim-line
proceduralMotion:
  policy: disabled
runtimePolicy:
  runtime: gsap
  dependencies: GSAP 3.15.0 and HyperFrames 0.8.46
  rationale: One deterministic paused timeline preserves the research object under frame seeking.
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

Use `primitive: reveal.trim-line` 表达保存和引用连线。其余仅 transform / opacity；近景到全景用同一 #desk 的 scale/translation。暂停与倒 seek 可重复。

## Procedural Motion

禁用。所有时点显式 authored，渲染不依赖网络或实时时钟。

## Runtime Policy

保留 window.__timelines.openalice 唯一同步 paused GSAP 和 window.film duration/starts/timeline/sceneAt。7.5 秒样片经主控正常速实播放行后扩为 20 秒；这不是用户视觉接受。同一 DOM、同一运动关系，非另起五场景。0–3 建立问题，3–7 补证，7–10.5 保存，10.5–15 Inbox 引用，15–17 阅读，17–20 人审边界。

16.3秒收紧同一desk到末态，17–20秒保留原件/版本/Inbox，同时给原生视频控件预留底部空间；画内没有交互或链接跳转。

## Reduced Motion

Fallback / substitute：预览静止在末尾并保留 step/play/replay。MP4 是用户可控制的媒体，初始 reduced motion 不自动播放。

## Source Decisions

遵循本地 HyperFrames fallback，不更改 shared catalog/toolchain blocked。保留旧 24 秒失败片供对照，不把旧 receipt 当新证据。

- Adopted: HyperFrames 单 paused timeline、确定性 seek 与产品对象局部补证。
- Rejected: 独立场景交替、外部时钟、自动审批和无限装饰运动。

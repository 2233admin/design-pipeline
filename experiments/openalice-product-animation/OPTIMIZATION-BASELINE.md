---
title: OpenAlice 动画优化前样式基线
status: baseline
visualAcceptance: pending
created: 2026-09-18
sourceFiles:
  - DESIGN.md
  - MOTION.md
  - STORYBOARD.md
  - job-plan.json
  - toolchain-request.json
---

# OpenAlice 动画优化前样式基线

## 基线定义

本文件保存当前这版相对于早期 Design Plan 动画的改进状态，作为下一轮视觉优化的比较基线。用户反馈为：**“现在比我们之前的 Design Plan 去做动画效果，比之前好多了。”**

这是一条比较性正反馈，不等于最终 Visual Acceptance。当前视觉验收仍为 `pending`；技术检查通过也不改变这个状态。

旧的 24 秒五面板版本只作为被否定的反例保留，不作为本基线的风格目标。

## 当前视觉与叙事基线

- 一个研究对象贯穿全片：NVIDIA FY2025 Data Center revenue 研究。
- 同一份研究纸面、同一份来源、同一 Session、版本缩略和 Inbox 引用保持身份连续。
- 证据不是通过切换到另一张全屏卡片表达，而是从原研究对象中局部补证。
- 保存动作通过镜头拉出和版本缩略出现表达；原件不消失、不搬走。
- Inbox 是引用关系的落点，不是把原文件移动到另一个面板。
- 片尾停在 `Ready for your review` / `No trade placed`，不演示自动批准、交易或执行。
- 视觉语言：深墨背景、纸面对象、暖白正文、薄荷来源/引用、琥珀人审边界。
- 叙事依赖具体数据口径和来源，不依赖大标题或抽象标签卡。

## 当前时间结构

- 0–3 秒：建立原研究和问题。
- 3–7 秒：同一证据进入正文并保留来源。
- 7–10.5 秒：保存、镜头拉出、v01/v02 留驻。
- 10.5–15 秒：沿引用关系生成 Inbox 报告附件。
- 15–17 秒：阅读完整引用关系。
- 17–20 秒：人审边界和片尾。

## 本次使用的 skill 与能力

### 1. `design-pipeline`

- 用 Stage 0 路由把需求归类为 `motion-graphics`。
- 生成并绑定 `job-plan.json` 和 `toolchain-request.json`。
- 保留 source、route、toolchain 和 receipt lineage，不把技术成功冒充视觉验收。

### 2. Motion Foundation / `MOTION.md`

- 用 motion thesis、motion principles、primitive registry 约束运动，而不是直接堆动画效果。
- 禁用 procedural motion、随机运动、无限循环和装饰粒子。
- 明确 reduced-motion 替代路径：静止在末态，并提供 play / step / replay。

### 3. IART motion route

- 通过 `iart` primary route 处理产品展示视频，而不是把任务当成普通网页 UI 或 PPT 页面切换。
- 使用 product-launch-video、html-video、video-production 能力边界。

### 4. HyperFrames + GSAP

- 使用一个唯一的 paused、可倒 seek、可重复的 GSAP timeline。
- HyperFrames 负责确定性时间控制和离线检查；预览使用独立实时驱动时钟。
- 通过 `window.film` 暴露 duration、starts、timeline、sceneAt，避免运行时逻辑和导出时间漂移。

### 5. 连续性动画设计能力

- 使用同一 DOM 对象的 transform / scale / translation 变化完成镜头语言。
- 将真实证据、来源、版本和引用关系作为运动对象，而不是复制成互不相关的卡片。
- 用“局部补证 → 保存 → 版本 → Inbox 引用”的动作链替代五个独立场景轮播。

### 6. Evidence-backed QA

- 检查正常速播放、暂停、重播、step、reduced motion、mobile 和 MP4 解码。
- 检查倒 seek 一致性、原对象和来源留驻、版本与 Session 关联、无关键叠字。
- 保持技术通过与用户视觉接受分离；本基线的 `visualAcceptance` 仍为 `pending`。

## 下一轮优化时允许改变的内容

- 节奏、镜头停留、局部运动曲线。
- 来源、版本和 Inbox 关系的视觉层级。
- 纸面、缩略和引用线的密度与可读性。
- 片尾人审边界的停留时长和视觉重量。

## 下一轮优化时不得丢失的内容

- 单一研究对象连续变化。
- 原件、来源、版本和引用关系的身份连续性。
- 同一 paused timeline、确定性 seek 和 reduced-motion 路径。
- `Ready for your review` / `No trade placed` 的人审边界。
- 技术证据与视觉验收分离。

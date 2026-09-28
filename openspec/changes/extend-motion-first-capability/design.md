# Motion-first capability 设计

## 复用现有 spine

保持 `MOTION.md` → change `motion.md` → selected primitive → runtime adapter → evidence receipt 的现有两级契约。新增 reference 只提供设计判断和证据字段；新增 primitive 只描述语义，不绑定库 API。

项目自身来源：`skill/references/motion-foundation.md`、`motion-spec.md`、`motion-evidence-core.cjs`、GSAP/HyperFrames route。外部仓库只提供 reference-only 的一般能力观察；`codeCopied:false`。

## 新 primitive

### `response.spring-settle`

有限时长的阻尼式趋近，用于把对象从当前状态落到目标状态。参数至少记录 `mass`、`stiffness`、`damping`、`initialVelocity`、`settleThreshold`、`duration` 和 `target`。运行时必须把它编译为 authored-time seekable 状态；reduced motion 直接渲染目标状态。

### `continuity.shared-anchor`

跨状态保留同一语义对象与空间锚点，用于 shared-element/route/版本连续性。参数至少记录稳定对象 id、起止锚点、origin、duration、interrupt policy 和 semantic fallback。它不授权复制内容或把布局身份交给视觉截图。

两者都允许 CSS/WAAPI/GSAP；Canvas/WebGL 只有在目标自身 scene contract 说明 renderer、坐标、DPR、性能、无障碍镜像和 cleanup 时才可选。

## 不做的事

不把 rAF physics 作为离线时间线真相，不引入新的并行 gate，不修改 root static posture，不把 motion-web 变成项目 runtime，不改变现有 target 视觉或内容合同。

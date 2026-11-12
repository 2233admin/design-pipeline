# Meter

> 新增 `sync` 形态：分段齿条 + amber 刻度（评估点）+ 右侧 `display-dense` 大百分比。只给 paper 进度、容量使用、偏离门距离、回放进度（signature.md）。

仪表。两种形态：**条**（Bar，进度/负载/敞口）和**刻度**（Gauge，一个 0–100 的读数带指针）。它是"血条"和"刻度盘"的统一实现。

## Bar

- 槽 10px 高，`bg-000` + `shadow.recess` + `hairline`。
- 填充用点阵纹理（2px 实 2px 空，60% 透明）而不是实色；长度编码量比颜色准 3 倍（§19 §22），所以量永远用条。
- tone：`accent`（orange，进行中）/ `ok`（green，健康）/ `warn`（amber，受限或越界）/ `off`（line-200，停用）。
- 标签行在上：左名称 `ink-300` 10px，右数值 `mono` 11px，颜色随 tone。

## Gauge

- 34px 高凹槽，中线 1px `line-100`，底部刻度 0/25/50/75/100 用 `ink-400` 8px。
- 指针 2px 宽 + `shadow.glow-orange`；弱势（< 30）指针转 `signal-red`，受锁转 `signal-amber`。

## 动效

- 数值变化：填充宽度 / 指针位置用 `gentle` 弹簧，不用 transition。
- 越过阈值（如敞口 > 上限）：tone 切 `warn` 同时条体 2px 脉冲**一次**，播 `alarm-low`（仅交易类）。这是跨阈值才动的典型。
- 高频更新（> 2Hz）时弹簧退化为直接赋值。

## 规则

- 条永远有标签和数值，不做"只有一根条"。
- 不做环形仪表（第一版）。

## 谁提供什么

- 组件：value（0–1 或 0–100）、tone、label、display（bar / gauge）、thresholds。
- 调用方不传颜色，只传 tone。

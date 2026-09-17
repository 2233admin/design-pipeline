# CERE-482 产品动画返工设计

实施依据：`_bmad-output/implementation-artifacts/spec-cere-482-product-animation-redesign.md`。Checkpoint1 已获用户批准制作，最终视觉接受 pending；不改变冻结意图。

## 决定

采用“研究留下痕迹”，取代被否定的五面板 24 秒轮播。单研究：NVIDIA FY2025 数据中心历史收入。官方 2025-02-26 earnings release 的 Data Center 段支持 $115.2B / +142% year over year；不据此推导买卖或前瞻结论。

先给正文近景，局部引入带来源摘录；保存触发同一 desk 拉出，原 research.md 与 v01/v02 留驻；随后 Inbox 增加 report/attachment reference，引用原 Session research-01，不搬走原文件。片尾仅 Ready for your review / No trade placed，不添加交易提案或审批。

## 实施与门禁

先独立输出7.5秒关键样片：同一来源进入 → 真实版本缩略留驻 → Inbox 引用。主控正常速实播复述通过后，已扩同一表达为20秒完整片；完整片也已由主控正常速看至ended通过预检。具体观看时钟见qa.md，用户最终视觉接受仍pending。

保留一个 paused、可倒 seek 的 GSAP timeline 及 window.film 公共接口。新 verifier 按实际 duration 验证，不沿用 24 秒/720 帧/五 scene/awaiting approval 断言。preview/watch 保留暂停、重播、reduced motion、解码播放证据。

## 证据与边界

首次新 render 之前，旧片及原实现/JSON/验证证据完整复制到 `experiments/openalice-product-animation/output/rejected-24s/`，preservation.json 记录 34 个文件 hash；旧 MP4 SHA256 为 6a8c7886207907ae63e627622e7932e3878ac5441c3febd98cb53e12697e8764。此目录只作被否定反例，不是当前验收证据。

brief 变化经既有 route/toolchain CLI 刷新 hash lineage，不自行计算替代CLI hash。沿用 HyperFrames 0.8.46 本地 fallback；shared catalog/toolchain 仍 blocked。无 remote publish、交易、共享 pipeline 修改、未批准 commit/merge。本轮使用OMP执行；含混开关未被擅自解释成新功能或声称满足。主控负责 Multica、根 QA 与最终集成；实现不触碰 osprey 工作区。

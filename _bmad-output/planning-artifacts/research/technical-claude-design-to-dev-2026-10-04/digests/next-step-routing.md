# 下游路由（非自动执行授权）

依据_bmad/_config/bmad-help.csv本轮读取：

- [RV] Review — bmad-review：Main在新context对完整research.md及source digests做逐句semantic审查；structure/prose标准只查表达，不改研究判断。
- [SPC] Spec — bmad-spec：已由兄弟worker起草spec-runtime-review-handoff.md与对应OpenSpec change；本轮只将该规格交用户Checkpoint1 Approve，禁止擅自进入build。
- [RS] Deep Recon — bmad-deep-recon Refresh/Deepen：只有需要消费过窗/未知日期claim时再刷新；最早脚本re-check2026-06-24已过，当前帮助页批准前重验建议单列，不把访问日期补为发布日期。

此路由不表示用户已经批准软件实现，不会自动invoke build、提交、发布或写目标项目。研究目录为source of truth，未render briefing（skill-invoked、auto）。

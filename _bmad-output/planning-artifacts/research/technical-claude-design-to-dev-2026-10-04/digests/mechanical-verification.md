# 实际执行证据与收尾边界

## 已执行

- `uv run .agents/skills/bmad-deep-recon/scripts/recon_kit.py citations _bmad-output/planning-artifacts/research/technical-claude-design-to-dev-2026-10-04/research.md`：exit 0；markers与appendix_rows均1–11；dangling_markers=[]；orphaned_rows=[]；ok=true。JSON见citation-result.json。
- `uv run .agents/skills/bmad-deep-recon/scripts/recon_kit.py tally _bmad-output/planning-artifacts/research/technical-claude-design-to-dev-2026-10-04/.memlog.md`：本次定向更正后exit 0；entries=22；by_type claim=8、decision=2、event=11、source=1；同ref=7的最新日期/状态覆盖旧项，claims_total=7、全部unverified，verified=0。frontmatter与正文按脚本有效claims口径一致，不手数；JSON见tally-result.json。
- `uv run .agents/skills/bmad-deep-recon/scripts/recon_kit.py staleness _bmad-output/planning-artifacts/research/technical-claude-design-to-dev-2026-10-04/digests/staleness-claims.json --windows '{"landscape_ai":3,"patterns":24}' --today 2026-10-04`：exit 1为两条stale findings，非脚本故障；earliest_recheck=2026-06-24；输入与输出均保存。未知发布日期不伪造计算。
- `uv run .agents/skills/bmad-review/scripts/word_metrics.py .../research.md`：exit 0，初稿total_words=5671（脚本中文计数口径，含preamble）。仅编辑辅助，不是产品性能或研究事实验证。
- 四个指定source URLs的原文read成功：两份Anthropic native，Design/Artifacts .md全文；correct Artifacts完整slug重定向17153992，额外最终URL .md成功。没有扩大新研究。
- memlog.py append真实执行source/decision/claim/event；既有unverified历史保留，脚本未改。

## 尚未宣称通过

机械citation只校验编号与行，不证明句子被来源支持；Main报告独立semantic仅发现Vercel元数据差异，本次已定向更正；Main另指出的change-local Record合同不一致也已对齐。本slice未跑源码tests、`node scripts/qa.cjs`、browser smoke或目标source修改；Main报告既有repository QA通过不等于新runtime-review已实现/验收。没有接受或批准产品能力、兼容性、性能或效率结果。当前仅research complete，规格待Checkpoint1人审。

## 收尾判定

- PM：执行SSOT为Multica；list项目14a68c87超时20s。已通知Main，按Main要求不再重试，统一由Main留痕及相关上次遗漏补记；本slice不重复开票。
- Doc：完整research.md、四更正digests、本地接点及机械时效证据已落本研究目录；brief/plan保持原样。Luna历史draft保留并加显著superseded提示。
- KB：本报告就是repo研究source of truth；尚未批准的建议不复制为个人KB或ADR。
- Git：未提交，待Main独立semantic审查和用户规格批准；保留所有既有dirty changes，未触及源码或其他目录。
- 执行摩擦：recon pack实际入口types/technical.md；edit使用anchored PUT行替换，全文digest改写可用write；一次性路径/工具问题不扩大本研究为skill或KB改造，超出归属写权限的记录由Main决定。

## 本次定向更正后的机械结果

- Vercel原preview-deployments read重定向environments#preview-environment-pre-production，并使用environments.md alternate；metadata last_updated=2026-09-17。旧获取2026-02-27保留在contrary S6获取差异和旧ledger claim，最新同ref=7仍unverified，不增加有效claim、不升high。last_updated不是publication。
- staleness输入/输出已重生成：Vercel patterns re-check=2028-09-17/stale=false；历史两项仍stale，stale_count=2，earliest_recheck=2026-06-24；exit 1为stale findings。
- citation在最终report改动后实际重跑：exit 0，markers与appendix_rows均1–11，dangling=[]、orphaned=[]、ok=true；citation-result.json已保存最新stdout。
- report/local-integration已明确显式CLI将对象Feedback持久化为change-local Record，不调用pipeline issue recorder/advance，不改state.json/events.jsonl、不生成receipt；进展/验收引用仍走既有ledger/state。声明source集合bytes/sourceSet身份与原captured acceptance lineage分离；具体Record形状由待批准OpenSpec design.md定义，不再当开放schema问题。
- 只研究目录改动；无新研究、无再次mentor、无软件实现、无新功能运行验证。

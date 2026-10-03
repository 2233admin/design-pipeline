# 本地实现接点摘要（非外部产品证据）

- 来源：agent://现有设计开发流程接点调查，本轮只读源码/合同调查与回传；访问2026-10-04。
- 范围：design-pipeline本地实现，不能推导Anthropic/Claude产品事实。具体引用均为worker文本阅读证据，不是LSP结果或运行测试。
- 本综合worker仅读该worker产物/回传，没有复测这些实现。

## 可复用能力与严格边界

| 接点 | 已读取的实现事实 | 边界与下游约束 |
| --- | --- | --- |
| public CLI / Playground | skill/scripts/designer-pipeline.cjs:4-14入口；cli-core.cjs:603-609、1765目前playground check；skill/SKILL.md:781-792要求agent按Blueprint生成HTML | 不是已有public object review generator；后续新增界面不能声称当前已存在 |
| self-contained review约束 | skill/references/playground.md:39-57、106-139；playground-core.cjs:130-166严格surface keys、208-315 live bindings/Copy及禁fetch/import/iframe/external assets、323/331 selection/surface hash、358-425 report hash、437-545阶段与四hash Markdown绑定 | 当前controls/presets表面无source/component/feedback字段；新投影不得假装现有schema已原生支持新增字段 |
| design/code mapping | interoperability-core.cjs:43-53 tokens验证；128-145 code-map shape、hash格式、relative source及坐标；cli-core.cjs:1279-1289读取JSON传validator | code-map不读实际source/token/evidence，不重算uiIr/token hash；只shape不证明源fresh |
| actual implementation source | component-first/adapters/component-capability-adapter.cjs:16-34 resolve/exists/isFile/realpath；gates/component-contract-gate.cjs:16-26 source/symbol/项目证据；refs:46 sha256:null | 源存在/contained不等于hash认证 |
| existing byte freshness | skill/scripts/artifact-core.cjs:43-46读实际bytes；89-119 contained metadata.path和artifact_hash比对，ARTIFACT_HASH_DRIFT | input_hashes:98-101仅格式。须对每个声明actual source文件自身metadata.path，用明确target project root；不能hash摘要替代源码、不能../越界；不是全仓扫描 |
| component/page/evidence | component-first/gates/page-usage-gate.cjs:12-54 routes/role/symbol/sourceIdentity/rendered/hidden/readiness；evidence-binding-gate.cjs:17-20 screenshot引用；adapters/evidence-loader.cjs:180-239真实PNG bytes/hash/decode/dimensions | production scope/page-ready/rendered:true不证明live data；PNG完整不证明正确route/state被执行 |
| receipts与两验收维度 | skill/scripts/evidence-core.cjs:18-69 target/viewport/evidence/hash与requireFiles；component-capability-core.cjs:202-221 checks完整和pass非空evidence；references/component-verification-receipt.schema.json:7-20；execution-receipt.schema.json:7-42 | component evidence字符串不解析真实性；execution mode是in-place/worktree/sequential，不是fixture/live；strict receipts无统一dataMode/maturity；不可另造权威AC receipt或混同Component Conformance/Visual Acceptance |
| snapshot lineage | component-first-v2-core.cjs:108-123、166-205 target/snapshot/policy/input/parents/expiry/hash；181-185仅显式options.current比较 | 不自动scan source；canonical hash非producer认证。visual独立 |
| feedback/state/ledger | record-feedback.cjs:217-227 fingerprint kind+skill+title，467、589-596记录；feedback-observation.schema.json:5-104 strict字段；pipeline-state-core.cjs:256、440-488 CAS advance；control-runtime-core.cjs:175-235 runTo、237 resume ledger、247 explainBlock | 当前feedback无typed对象级target/snapshot上下文；可经existing evidence/context引用关联，不假装已具typed字段。record不自动advance；package不自动消费external-source freshness，须显式接existing state evidence |

## 调查实测口径

worker仅执行git status、public help、既有archived Playground waiver check（ready/applicable:false，不是UI pass）、既有v2 status（consistent/control:null）。未跑tests/QA/browser/实际source修改闭环。LSP schema失败、codegraph unavailable，所以以上按只读text evidence记录。

## 本地建议，非已实现结果

[INFERENCE] 离线对象投影关联现有ui-ir/tokens/code-map、声明source集合的实际bytes、自外部取得captured observations/evidence及dataMode/route/state/viewport。后续明确规格采用change-local Feedback/Record，由显式CLI持久化对象反馈及contextAtRecord；不调用原pipeline issue recorder，不advance、不改state.json/events.jsonl，不生成receipt。执行进展和验收引用仍沿既有ledger/state。source/design变化stale，不由projection自动判resolved或认证producer；sourceSet identity与原captured acceptance lineage分離，不能把新sourceSet变成当前验收。真实smoke应覆盖浏览器观察→change-local Record→真实source edit→hash drift→refresh→conformance与独立visual→既有state/ledger/package；本轮未执行。

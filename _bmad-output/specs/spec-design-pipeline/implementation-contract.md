# Implementation Contract — Design Pipeline

本 companion 把 SPEC 的能力转成后续 `bmad-spec`、epic、story 和测试必须共同遵守的边界；它不替代 Architecture spine，也不宣称当前代码已经全部实现。

## 1. Resource snapshot contract

每次同步至少产生以下确定性信息：

| Field | Requirement |
| --- | --- |
| `sourceId` / `sourceUrl` | 稳定来源标识；持久化 URL 必须去除 userinfo 和敏感 query。 |
| `status` | 至少区分 `ready`、`partial`、`blocked`、`invalid`、`recovered`。 |
| `entries[]` | 每项包含稳定 id、kind、title、url、contentPath、`contentSha256`、license/status 和 provenance。 |
| `errors[]` | 绑定具体 URL、原因、重试结果和下一动作；不得包含凭据。 |
| `previousSnapshotHash` | 候选失败或恢复时指向上一份有效快照。 |
| `diff` | 包含 `added`、`changed`、`disappeared`、`failed`、`stale`，并绑定前后快照 hash。 |

同步边界：HTML、sitemap、llms/llms-full 可用于发现；robots 和公开目标策略先于队列；每次重定向重新校验；响应体受字节上限；内容只落盘，不执行。

发布边界：候选目录和内容先写临时目录、验证、再原子发布；任何失败保留 last-known-good。`contentPath` 相对 catalog root，其他 artifact/evidence 路径必须在 envelope 中声明 root。

## 2. Design-tool intake contract

receipt 最少包含：

```text
provider
operation
source.mode
source.artifact
source.sha256
source.root
producer.version
availability
mappings[]
editable
fidelity.losses[]
evidence[]
status
```

v1 的 `source.mode` 固定为 `local-file`；`controlled-plugin-export` 和 `safe-local-archive` 只作为后续契约扩展，不能在 v1 标记为 ready。import 校验必须确认 root containment、regular file、字节 hash 和 logical source location；不接受任意绝对路径或 traversal。Figma 与 Penpot 的原始格式和映射规则不能互相假设兼容。

## 3. Normalized Design Artifact

归一化工件必须保留：

- source entry/artifact identity、provider、source mode 和 admission 状态；
- semantic elements/roles、tokens/style values、logical mappings；
- editable 状态、fidelity/loss、缺失字段和证据；
- 对 DESIGN.md、MOTION.md、tokens、UI IR、组件能力或截图的明确输出类型。

provider-specific raw object 只能停留在 adapter 边界。`reference-only`、`adopt`、`substitute`、`custom` 是决策，不得被推断为事实。

## 4. Capability and route readiness

能力 probe 与 importer readiness 分开：probe 只读返回 provider、version、availability、capabilities、credential requirement、fallback 和 evidence；importer 还必须有实际输入格式、解析/归一化结果、生命周期和 fixture。只有两者都满足才可 `ready`。

route plan 至少绑定：

```text
primaryRouteId
primaryOwner
alternatives[]
routingContext
inputArtifacts[]
resourceEntryIds[]
sourceArtifactHashes[]
admissionStatuses[]
planSha256
```

toolchain 和 execution 必须复核这些字段；任何 route、owner、artifact hash、admission status 或 plan hash 漂移都拒绝交接。agent-owned/manual 只能生成显式 Skill action 和 evidence checkpoint，不能生成可执行 `ready`。

## 5. Context and adaptation boundary

上下文只记录有限协作偏好和验证信号，优先级固定为：

```text
task > project > user > defaults
```

可记录：确认过的沟通、决策、证据和交付偏好；不可记录：原始 transcript、secret、敏感推断、人格标签、完整 artifact 内容。Adaptation Candidate 必须 shadow-only、绑定 exact path/version/content hash，并只执行一个有限 inert add/replace/delete；不能修改 Kernel、准入、许可证或安全 gates。

## 6. Required verification slices

后续 stories 至少覆盖：

| Slice | Required proof |
| --- | --- |
| URL safety | userinfo/query redaction、private/loopback rejection、redirect re-check、robots deny/unavailable、response-byte limit。 |
| Snapshot recovery | partial 和 all-page failure 都返回稳定 envelope，并保留 previous snapshot。 |
| Path safety | traversal、absolute path、symlink/junction escape、missing/non-file target 都返回 `invalid`。 |
| Import | Figma 与 Penpot 各有明确 source mode 和 fixture；hash mismatch、unknown format、loss/editability 都可验证。 |
| Routing | explicit capability wins、single primary、blocked/review propagation、owner/hash drift rejection。 |
| Status | sync/verify JSON status 与 exit class 一致；agent-owned/manual 不冒充 executable ready。 |
| Context | precedence、data minimization、Kernel/gate non-override 和 shadow-only adaptation replay。 |

## 7. Operational baseline

当前已验证默认值：同步最多 500 页、并发 8、单请求超时 20 秒。v1 冻结：

- 内容 hash 字段名固定为 `contentSha256`；`contentHash` 不是合法别名。
- 资源 URL 字段名固定为 `url`；`provenance.sourceUrl` 记录抓取地址。
- 条目准入：`reference-only`、`review-required`、`blocked`、`invalid`。DesignMD 内容不得进入 executable `ready`。
- 同步 envelope：`ready`、`partial`、`blocked`、`invalid`、`recovered`。
- 退出码：`ready` → 0，`invalid` → 1，其余 envelope 状态 → 2。
- response-byte cap：2_000_000。5xx 最多 3 次，重试间隔 250ms × attempt。重定向最多 5 跳，每跳重做 URL/origin/userinfo 校验。
- robots.txt：`User-agent: *` 的 `Disallow` 生效；文件缺失当允许；抓取失败记入 errors，同步不得变成 `ready`。
- stale：上一份条目本轮未出现且其 URL 在本轮 errors 中。disappeared：上一份条目本轮未出现且 URL 未失败。
- 相同输入的 diff 必须为空变化集，且 snapshot hash 稳定。
- 离线模式禁止网络；fixture 模式允许测试本地 host；external-read 必须显式启用并 fail closed。

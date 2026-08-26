# Epic 1 Story 1.1–1.4 对抗性验收审查

- 审查对象：`D:/projects/design-pipeline/_bmad-output/planning-artifacts/epics.md` 的 Epic 1
- 核对范围：Story 1.1、1.2、1.3、1.4；`skill/scripts/designmd-core.cjs`、`skill/scripts/designmd-sync.cjs`、`skill/scripts/cli-core.cjs` 及 DesignMD 测试
- 执行方式：文档审查 + 当前实现/测试核对 + 两个独立审查视角交叉检查
- 业务代码与 `epics.md`：未修改

## Verdict

**REJECT HANDOFF**

Story 1.1–1.4 的验收条件目前不能作为“可直接开发派发”的完整契约。已有代码覆盖了基础抓取、五类 URL 分类、去重、内容 hash、原子目录写入和一次失败保留，但没有实现 1.4 的 diff/stale 语义，也没有满足 Epic 中已经写入的 robots、SSRF、响应大小、凭据、symlink/junction、状态一致性和可解释恢复要求。

## Findings

### 资源契约与故事依赖

1. **Story 1.1 的 Resource Entry 字段与实现不一致**

   - location: `epics.md:113-116`; `skill/scripts/designmd-core.cjs:103-123,216-242`
   - trigger_condition: 首次同步结果被下游按 Story 要求消费。
   - guard_snippet: 统一并冻结字段名，至少强制 `sourceUrl`、`contentPath`、`contentHash`、`provenance`；若采用 `url`/`contentSha256`，同步修改所有故事和后续 spec。
   - potential_consequence: 同步返回的内存条目没有 `contentPath`，实现使用 `contentSha256` 而故事写 `contentHash`，也没有 `provenance`；Story 1.2–1.4 无法稳定消费同一个输入契约。

2. **Story 1.1 没有定义“首次同步完成”与 Story 1.3/1.4 的持久化前置关系**

   - location: `epics.md:105-128,154-200`
   - trigger_condition: 首次同步无旧快照、首次同步部分失败、或第一次重复同步时执行 1.3/1.4。
   - guard_snippet: 明确候选快照、已发布快照、last-known-good、snapshot receipt 和 diff receipt 的生命周期，并定义首次失败时是否允许发布 partial candidate。
   - potential_consequence: 目前故事假定“上一份有效快照”存在，但 1.1 没有产出可供比较的 snapshot hash/receipt；开发者会对首次失败和首次 diff 采用互不兼容的行为。

3. **DesignMD sitemap/llms 解析能力被验收条件暗示为完整，但实现只支持有限文本 URL**

   - location: `epics.md:115`; `skill/scripts/designmd-core.cjs:82-89,181-209`
   - trigger_condition: sitemap 使用 XML `<loc>`、相对 URL，或 llms 文本使用相对链接。
   - guard_snippet: 为 sitemap XML 和 llms 文本分别解析绝对/相对链接，以 source 为 base 归一化；对解析失败记录 URL 级 discovery error。
   - potential_consequence: 合法资源不会被发现，目录不完整却可能被当作成功同步。

4. **同 slug 的资源会被静默丢弃，稳定 ID 不能证明资源唯一**

   - location: `skill/scripts/designmd-core.cjs:48-49,111-114,204-205`
   - trigger_condition: 同一 kind 下出现同 slug 的不同路径、query、revision 或不同来源 URL。
   - guard_snippet: 使用 canonical source URL 或站点声明的 stable resource id 生成 ID；发生 ID collision 时记录 collision，不要静默去重。
   - potential_consequence: 一个资源被静默丢弃，added/changed/disappeared diff 和来源追溯均不可靠。

5. **revision、许可证变化与正文 hash 没有统一进入比较契约**

   - location: `epics.md:21,27`; `skill/scripts/designmd-core.cjs:111-123`
   - trigger_condition: 来源 revision 或许可证状态变化，但页面正文没有变化。
   - guard_snippet: 持久化 source revision、license/status/provenance，并把它们纳入 entry comparison 和 snapshot hash。
   - potential_consequence: Story 1.4 要求的 changed 不会产生，旧资源继续保留原有准入语义。

### URL、网络与内容安全

6. **同步入口没有 SSRF 目标校验**

   - location: `epics.md:122-124`; `skill/scripts/designmd-core.cjs:22-36,181-186`; `skill/scripts/designmd-sync.cjs:13-17`
   - trigger_condition: 执行 `designmd sync --url http://127.0.0.1/...`、私网、link-local 或云 metadata 地址。
   - guard_snippet: 解析 hostname/IP，拒绝 loopback、link-local、private、metadata、IPv4-mapped IPv6 和解析后落入受限网段的目标；策略失败时返回 blocked。
   - potential_consequence: 本地服务、内网资源或云凭据端点会被抓取并写入快照。

7. **重定向不会重新执行 SSRF、协议和同源校验**

   - location: `skill/scripts/designmd-core.cjs:165-173`
   - trigger_condition: 公网 URL 返回 302，Location 指向内网、metadata、不同 origin 或带凭据的 URL。
   - guard_snippet: 禁用自动重定向或逐跳手动跟随；每一跳重新执行 URL、目标地址、userinfo、robots 和 origin policy 校验。
   - potential_consequence: Node fetch 的默认重定向行为可绕过初始 URL 校验。

8. **完全缺少 robots.txt 遵循逻辑**

   - location: `epics.md:122-124`; `skill/scripts/designmd-core.cjs:11-12,181-209`
   - trigger_condition: robots 禁止 `/skills/*`、发现入口或具体资源路径。
   - guard_snippet: 在抓取前获取并解析 robots.txt，按 user-agent 和最终 URL 判断；robots 不可用时按契约返回 blocked/partial，而不是继续抓取。
   - potential_consequence: 同步访问禁止路径，直接违反 Story 1.1/NFR3。

9. **响应体没有硬性字节上限**

   - location: `epics.md:122-124`; `skill/scripts/designmd-core.cjs:165-178`
   - trigger_condition: 无 Content-Length 的超大响应，或压缩后解压为超大内容。
   - guard_snippet: 流式读取并在超过 byte budget 时立即 abort，记录 `response-too-large`；不能先 `response.text()` 再截断。
   - potential_consequence: CLI 可能在截断前耗尽内存/CPU；截断后的内容还可能被当成完整资源计算 hash。

10. **URL userinfo 和敏感 query 会进入请求、目录和错误记录**

   - location: `epics.md:32-35`; `skill/scripts/designmd-core.cjs:22-27,165-172`
   - trigger_condition: source 或发现链接为 `https://user:pass@example.com/path?token=secret`。
   - guard_snippet: 拒绝 userinfo；对敏感 query 参数做 denylist/allowlist 过滤；错误、catalog 和 receipt 使用脱敏 URL。
   - potential_consequence: 凭据会随请求发送并写入 catalog.source、entry URL 或 errors，违反 NFR2。

11. **非法 `--url` 会静默回退到默认站点**

   - location: `skill/scripts/designmd-core.cjs:181-183`
   - trigger_condition: 使用 `file:`、无效 URL 或不支持协议的 `--url`。
   - guard_snippet: 用户显式提供的 source 解析失败时直接返回 `invalid`，不得替换为 `DEFAULT_SOURCE`。
   - potential_consequence: 用户请求的目标没有执行，但 CLI 可能报告默认 DesignMD 同步成功，形成“未实现能力被说成已完成”的假成功。

12. **重试实现没有记录每次尝试，且复用同一个 AbortController**

   - location: `skill/scripts/designmd-core.cjs:166-178`
   - trigger_condition: 首次超时/abort 后进入 5xx 重试，或需要审计重试结果。
   - guard_snippet: 每次 attempt 创建独立 AbortController，并记录 attempt、status、delay、最终原因和 retry result。
   - potential_consequence: 已 abort 的 signal 可能影响后续重试；Story 1.3 要求的重试结果无法解释或复现。

13. **达到页数上限时没有记录“未完成发现”**

   - location: `skill/scripts/designmd-core.cjs:184-213`
   - trigger_condition: `maxPages` 达到时 queue 仍有未处理 URL。
   - guard_snippet: 检测 `queue.size > 0`，追加 `page-limit` 错误并把候选状态设为 partial/blocked。
   - potential_consequence: 资源被截断但 catalog 可能被发布为完整，缺口悄悄进入后续路由。

### 快照、恢复与 diff

14. **Story 1.4 的 diff receipt、snapshot hash、stale 和 disappeared 完全未实现**

   - location: `epics.md:178-200`; `skill/scripts/designmd-core.cjs:181-260`; `skill/scripts/designmd-sync.cjs:17-21`
   - trigger_condition: 第二次同步发生新增、修改、消失、失败或许可证变化。
   - guard_snippet: 发布前读取上一份 catalog，计算五类 diff，输出 `previousSnapshotHash`、`snapshotHash`、分类 receipt 和稳定排序。
   - potential_consequence: Story 1.4 当前没有可验收的实现路径，旧资源也没有显式过时阻断。

15. **部分失败时直接保留旧快照，无法表达“当前候选”和新增结果**

   - location: `skill/scripts/designmd-core.cjs:223-229`
   - trigger_condition: 同步发现新增/变更资源，但另一个 URL 抓取失败。
   - guard_snippet: 保留 last-known-good 作为 active snapshot，同时发布独立的 partial attempt receipt；明确候选中的 added/changed 与旧快照的关系。
   - potential_consequence: 当前实现直接丢弃本轮成功发现的新资源，也没有 partial 结果供维护者解释或重试。

16. **首次全量失败时会在 preserve 前抛异常**

   - location: `skill/scripts/designmd-core.cjs:142,181-213`
   - trigger_condition: 所有发现 URL 失败，entries 为空，同时已经存在 last-known-good。
   - guard_snippet: 允许空 entries 的候选 envelope；在写入阶段返回 blocked/preserved，并携带完整 errors、previousSnapshotHash 和建议动作。
   - potential_consequence: `validateCatalog` 在 `writeCatalog` 前抛错，CLI 无法输出恢复字段，Story 1.3/FR10 无法验收全失败场景。

17. **首次部分失败仍可能发布半成品活动快照**

   - location: `skill/scripts/designmd-core.cjs:223-241`; `skill/scripts/designmd-sync.cjs:17-21`
   - trigger_condition: 没有已有 catalog，但本轮只有部分 URL 成功。
   - guard_snippet: 明确 candidate 与 active snapshot；部分失败不能返回 `published: true` 的 ready-equivalent 结果，或者必须持久化 partial 状态并阻断 ready 消费。
   - potential_consequence: 部分快照成为活动 catalog，而 search/inspect 仍可把不完整资源当作可用输入。

18. **原子发布不是“先验证后发布”，且崩溃窗口没有启动恢复**

   - location: `skill/scripts/designmd-core.cjs:231-259`
   - trigger_condition: 临时文件被截断/替换，或进程在旧目录改名到 backup 后、临时目录改名到 target 前崩溃。
   - guard_snippet: 发布前重新读取并验证磁盘上的 catalog、content 文件和 hash；使用可恢复 manifest/commit marker，启动时恢复唯一有效版本。
   - potential_consequence: 未验证文件成为活动快照，或 targetRoot 短暂/永久不存在，last-known-good 只留在 backup 目录。

19. **消失和重新验证失败的条目不会被标记 stale/disappeared**

   - location: `skill/scripts/designmd-core.cjs:223-229,263-278`
   - trigger_condition: 资源从新发现结果消失，或旧 content 文件无法读取/重新验证。
   - guard_snippet: diff receipt 保留旧 entry 的 id、原因和 previous snapshot，并把其 admission 状态设为 stale/disappeared/invalid；旧内容只能作为证据读取。
   - potential_consequence: last-known-good 中的旧条目没有过时标记，后续搜索或路由仍可能继续使用。

20. **当前没有 previousSnapshotHash、建议动作和完整 URL 级错误输出**

   - location: `epics.md:170-176`; `skill/scripts/designmd-core.cjs:203,212,216-260`; `skill/scripts/designmd-sync.cjs:17-21`
   - trigger_condition: 抓取失败或恢复发生，维护者需要定位和执行下一步动作。
   - guard_snippet: envelope 固定包含脱敏 URL、failure reason、attempt/retry result、preserved、previousSnapshotHash、snapshotHash 和 nextAction。
   - potential_consequence: 当前输出只有 errors 数量/数组的部分路径，无法满足 FR10 的可解释恢复要求。

### 状态、准入与路径边界

21. **`verify` 的 JSON 状态与退出码已经冲突**

   - location: `epics.md:174-176`; `skill/scripts/cli-core.cjs:680-703`
   - trigger_condition: catalog 包含 `errors`。
   - guard_snippet: 用同一个状态映射同时生成 JSON 和 exit code；有错误时 JSON 返回 partial/blocked，只有 ready 才返回 exit 0。
   - potential_consequence: JSON 显示 `status: ready`、`ok: true`，但进程 exit 2；忽略退出码的自动化会接受 blocked/partial 结果。

22. **search/inspect 无条件返回 ready，绕过资源准入状态**

   - location: `skill/scripts/cli-core.cjs:685-699`
   - trigger_condition: 对有抓取错误、reference-only、stale、篡改或未知许可证的 catalog 执行 search/inspect。
   - guard_snippet: 顶层状态继承 catalog availability；entry admission 独立返回，非 ready 条目不能被 route 消费为 ready。
   - potential_consequence: 不完整或仅 reference-only 的资源可被误当作可用路由输入。

23. **持久化路径只做词法 containment，没有 realpath/symlink/junction 防护**

   - location: `epics.md:146-148`; `skill/scripts/designmd-core.cjs:263-276`
   - trigger_condition: contentPath 位于 catalog root 词法范围内，但文件或中间目录是指向 root 外的 symlink/junction。
   - guard_snippet: 对 root、每个 existing parent 和目标执行 realpath/lstat；要求 regular file 且 realpath 仍在 root 内。
   - potential_consequence: `readFileSync` 会跟随链接读取 root 外文件；现有测试只覆盖 `../outside.txt`，未覆盖 symlink/junction。

24. **inline content 会跳过 contentPath 校验**

   - location: `skill/scripts/designmd-core.cjs:266-270`
   - trigger_condition: entry 同时包含 inline `content` 和绝对、traversal 或外链 `contentPath`。
   - guard_snippet: 无论是否有 inline content 都先验证 contentPath；若 schema 不允许二者并存则拒绝。
   - potential_consequence: 恶意路径元数据可绕过 Story 1.2 的路径安全门禁并进入 inspect/search/下游消费者。

25. **`--output-root` 的 junction 可绕过项目根限制**

   - location: `skill/scripts/designmd-sync.cjs:13-16`; `skill/scripts/designmd-core.cjs:216-239`
   - trigger_condition: 项目根内的 output-root 是指向项目外目录的 junction/symlink。
   - guard_snippet: 对 output root 的现有 parent/target 执行 realpath containment；拒绝非普通目录和外部解析目标。
   - potential_consequence: catalog/content 可被写入项目外，违反 NFR4 并可能覆盖外部文件。

26. **catalog 验证允许任意 status 和任意 HTTP(S) 来源元数据**

   - location: `skill/scripts/designmd-core.cjs:126-149,263-278`
   - trigger_condition: 修改 catalog 的 entry.status 为 `ready`，或将 entry.url 改为任意 HTTP(S) 地址，但 content hash 保持正确。
   - guard_snippet: 校验 status 枚举、catalog source 与 entry source 的关系、provenance、license evidence 和 snapshot hash；必要时绑定 catalog 签名/receipt。
   - potential_consequence: 来源和准入元数据可被伪造，verify 仍返回 ready，破坏 Story 1.2 的来源与安全保证。

27. **inert 约束只有生成时的默认值，没有验证时的强制准入**

   - location: `epics.md:126-128,150-152`; `skill/scripts/designmd-core.cjs:119-120,126-136`
   - trigger_condition: 远程内容包含 shell 命令、安装提示、prompt injection、脚本或远程 URL，或持久化 catalog 被改写为其他 status。
   - guard_snippet: 对内容和元数据做不可执行/远程引用检测，固定 reference-only/review/blocked 状态，并保留 reason/evidence；验证时拒绝非法升级。
   - potential_consequence: “inert、不可安装、不可执行、不是默认权威”没有由 catalog 契约强制执行。

28. **未知许可证与安全内容没有区分状态和证据**

   - location: `epics.md:150-152`; `skill/scripts/designmd-core.cjs:98-100,119-120`
   - trigger_condition: license unknown、来源不完整、内容含执行提示或普通 reference-only 资源进入同一 catalog。
   - guard_snippet: 将 license/source/content assessment 映射为 reference-only、review 或 blocked，分别记录 reason、evidence 和 next action。
   - potential_consequence: 下游无法区分普通参考资源和不安全资源，可能错误地给予相同可用性。

### 测试与可验证性

29. **现有测试没有覆盖 Story 1.4 的任何核心结果**

   - location: `tests/designmd-ingestion.test.cjs:31-104`
   - trigger_condition: 资源新增、变更、消失、失败、stale 或两次输入相同。
   - guard_snippet: 增加 hermetic fixtures，断言五类 diff、前后 snapshot hash、稳定排序和重复输入空变化集。
   - potential_consequence: Story 1.4 即使完全没有实现，也不会阻止测试通过。

30. **现有测试没有覆盖生产网络安全路径**

   - location: `tests/designmd-ingestion.test.cjs:31-73`
   - trigger_condition: 真实 fetch 路径遇到 robots、重定向、私网地址、超大响应、超时或 5xx。
   - guard_snippet: 使用受控 HTTP server/fetch adapter 覆盖每个安全边界，并断言不发出越界请求、不泄漏凭据和稳定错误 envelope。
   - potential_consequence: 当前测试全部注入简单 fetcher；生产网络安全守卫即使缺失仍可通过测试。

31. **缺少 missing-file、hash mismatch、symlink/junction 和 verify exit consistency 测试**

   - location: `tests/designmd-ingestion.test.cjs:40-104`
   - trigger_condition: 本地 content 删除、篡改、替换为链接，或 catalog.errors 非空后执行 verify。
   - guard_snippet: 分别断言 entry-level invalid/blocked、继续检查其他条目、路径 realpath containment，以及 JSON status 与退出码一致。
   - potential_consequence: Story 1.2/1.3 的关键验收仍停留在文档声明，不能证明实现满足契约。

## 建议

1. 先冻结一个统一的 DesignMD contract：`source`、`entry`、`candidate snapshot`、`active snapshot`、`attempt receipt`、`diff receipt`、status/exit mapping 和 admission 状态必须分开定义。
2. 将 Story 1.1–1.4 改成明确依赖：先实现 schema/URL policy，再实现首次 candidate + active snapshot，再实现 verify/admission，最后实现重复同步 diff/stale；不要让 1.4 依赖未定义的“上一份快照”。
3. 在进入开发派发前补齐 URL 安全：robots、SSRF/重定向逐跳校验、userinfo/query 脱敏、响应字节限制、独立重试 signal 和非法 source 拒绝。
4. 将 path safety 统一到 realpath containment，覆盖 contentPath、output-root 及所有中间目录的 symlink/junction；inline content 不得绕过路径校验。
5. 把 `ready` 定义为严格状态：任何 errors、partial、reference-only、stale、invalid、blocked 或未验证来源都不能被 search/inspect/route 隐式升级。
6. 增加 hermetic 网络、快照崩溃恢复、diff、状态/退出码、missing-file/hash mismatch 和 Windows junction 测试；没有这些测试不要宣称 Epic 1 已验收。
7. 当前不建议直接派发 Story 1.1–1.4；应先回到 spec/epics 修订契约，再拆成可独立开发和验证的 stories。

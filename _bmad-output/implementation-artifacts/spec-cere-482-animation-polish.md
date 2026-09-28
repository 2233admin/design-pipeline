---
title: CERE-482 产品动画收尾打磨（Polish）
type: refactor
created: 2026-09-18
status: in-review
baseline_commit: 8ed5dc7c5c5181ac156b10dbf0261269bbecb80b
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

CERE-482 原提案 spec（`spec-cere-482-product-animation-redesign.md`）已 `status: done`，本 spec 不重置、不覆盖该文档，也不重置/覆盖当前 dirty working tree 或已冻结的 `experiments/openalice-product-animation/baseline/optimization-before-final/` 基线。用户在 S/K checkpoint 选择 **K（继续一次完整 polish）**，用户视觉接受仍 pending；本 spec 只是该 polish 的实施契约，不代表用户已验收。

**Problem：** 当前 `index.html` 暴露了未声明的公开 API `window.__motionGraph` / schema `design-pipeline.motion-graph.v1`，且 `verify.cjs` 已把它断言进契约（`index.html:186`、`verify.cjs:208,214,217-220`），这超出 `MOTION.md:46` 与 `spec-cere-482-product-animation-redesign.md` 冻结块承诺的公共面（仅 `window.film` 与 `window.__timelines.openalice`）。同时 `verify.cjs` 的 ffmpeg 证据链（`verify.cjs:233-349`）与 7.5 秒样片来源（`run.cjs:11-12`、`README.md:5`）仍指向旧 `output/sample-approved/`，未覆盖当前 motion-web 重做的 evidence-lineage 构图（SOURCE→RETAIN→REFERENCE→Inbox→ending）。此外 provenance 修正（`2233admin`→`feitangyuan`）此前被错误地设想挂在已 done 的 `integrate-product-animation` 或未提交的 `extend-motion-first-capability` 下，需独立 OpenSpec change 承接。

**Approach：** 四项并列打磨，全部 target-local 或独立 OpenSpec change，不触碰 shared pipeline/catalog：(1) controls-safe review 边界回归验证；(2) 收紧 `index.html` 公共面并加 beat-boundary/settle 断言；(3) 重建 7.5 秒样片证据链为 target-local 可复现且覆盖完整 evidence-lineage；(4) provenance 修正落入新独立 OpenSpec change。

</frozen-after-approval>

## Code Map / 触达资产

- `experiments/openalice-product-animation/index.html:101-105,156-188`：`motionGraph`/`springProgress`/`window.__timelines.openalice`/`window.__motionGraph`/`window.film` 定义处；保留顶层 lexical `const motionGraph =`（`101`起，含 beats/tracks/schema/response 参数，不删除定义本身），只移除该对象经 `window.__motionGraph` 的公开挂载（`186`）；`window.film`（`187`）与 `window.__timelines.openalice`（`182`）保留不变。
- `experiments/openalice-product-animation/verify.cjs:208,214,217-220`：契约当前经 `window.__motionGraph` 读取 `graph` 变量；改为在同一页面执行上下文内直接读取 lexical `motionGraph` 绑定（例如页面内 `<script>` 末尾追加 `window.__test_motionGraph = motionGraph;` 之类 target-local、非公开、仅测试可达的 hook，或等效的模块级导出），继续对 schema/composition/starts/beatIds/trackIds/springTrackIds 做既有断言，不删除这些 graph-contract 断言；`window.__motionGraph` 本身作为公开 API 不再存在。
- `experiments/openalice-product-animation/verify.cjs:232-349`：ffmpeg/ffprobe 解码与逐帧证据链（`command('ffprobe'…)`、`command('ffmpeg'…)`、contact-sheet 生成）；改为 sequential/accurate decode 并扩展覆盖 SOURCE→RETAIN→REFERENCE/Inbox→ending 六个 beat。
- `experiments/openalice-product-animation/run.cjs:10-13`：`--sample` 分支强制 `duration===7.5` 并写 `output/sample-7.5s.mp4`；样片 source/generator 需 target-local 可复现，不依赖 `output/sample-approved/` 旧素材。
- `experiments/openalice-product-animation/README.md:5`、`MOTION.md:46-48`：样片/契约叙述需与新证据链一致。
- 新 OpenSpec change `openspec/changes/<TBD-provenance-change-id>/`（本 spec 不预先指定确切 change-id，由实施时依 openspec 惯例命名，例如 `fix-motion-web-provenance`）：承接 `skill/references/motion-primitives.json:198,222` 的 `provenance.source` 由 `https://github.com/2233admin/motion-web` 改为 `https://github.com/feitangyuan/motion-web`（不动 revision/hash）；`tests/animation-opportunity-reference.test.cjs:45` 同步；`skill/references/motion-first-capability.md`（当前 untracked、内容已是目标态）与 `openspec/changes/extend-motion-first-capability/reference-boundary.md` 正式纳入该 change 的 spec delta；`_bmad-output/research/motion-web-approach-analysis.md:5,210` 更新研究日期与过期断言；`openspec/changes/integrate-product-animation/qa.md:9-20,55-81` 补充历史/superseded 标注。
- `experiments/openalice-product-animation/verify.cjs:207-447`：Task 1–3 的唯一共享验证 seam；同一实现 owner 统一收口 public-surface、graph/beat/settle、native-controls 210px 安全区、顺序解码、sample receipt，不允许并行分段改写。
- `experiments/openalice-product-animation/watch.html` 与 `output/verification.json`：原生播放、桌面/移动/reduced-motion 四表面截图、viewport/状态/哈希/receipt lineage 的 target-local 证据载体；历史 `native-*.png` 只能保留，不能冒充当前生成证据。
- `experiments/openalice-product-animation/run.cjs`、`README.md`、`MOTION.md`：20 秒 canonical graph 保持唯一 authored source；`--sample` 只可从临时、确定性 retime 的 target-local composition 生成 7.5 秒派生 MP4，finally 清理临时文件，不读取或改写 `output/sample-approved/`。
- 不触达：`experiments/openalice-product-animation/output/*` 现有已验收产物（除本次 polish 重新生成的样片/证据外）、`experiments/openalice-product-animation/baseline/optimization-before-final/*` 冻结基线、任何 shared skill 运行时代码。

## Tasks & Acceptance

**Execution（实施顺序）:**

- [x] Task 1：在 `experiments/openalice-product-animation/` 内重跑 controls-safe review：桌面/移动/reduced-motion/native-controls 四种表面各录一份可复核证据（沿用既有 `native-*.png` 命名习惯），确认底部 210 作者像素边界与末态两句人审文案不被原生控件遮挡。
- [x] Task 2：从 `index.html:186` 移除 `window.__motionGraph` 的公开挂载；保留顶层 lexical `const motionGraph`（`101-105` 起，beats/tracks/schema/response 参数不变）。`verify.cjs` 改为通过同一页面执行上下文的 target-local、非公开测试 hook（而非 `window.__motionGraph`）读取该 lexical `motionGraph` 绑定，继续断言 `graph.schema`、`composition`、`starts`、`beatIds`（唯一 `orient/extract/retain/reference/inspect/review`）、`trackIds`、shared-anchor track 的存在、以及 `response.spring-settle` track 的 bounded 参数（`stiffness`/`damping` 等）范围（`208,214,217-220` 原断言逻辑保留，仅改读取路径）；新增对 `springProgress`（`156-159`）在每条 `response.spring-settle` track 的 endpoint（`progress===1`）的精确 settle 数值断言（与目标值误差 < 1e-6），以及对六个 beat 边界时刻的状态断言（某 beat 起点前旧状态仍在、起点后新状态已生效）。
- [x] Task 3：重写 `verify.cjs` 的 ffmpeg 证据段（`232-349`）为顺序、逐帧精确 decode（不跳帧、不用 `-ss` 近似跳转到关键帧而误判内容），并新增/调整覆盖 SOURCE→RETAIN→REFERENCE→Inbox→ending 全部六个 beat 的帧证据。`run.cjs` 的 `--sample` 分支（`10-13`）改为生成 target-local 可复现的 7.5 秒样片（同一 `index.html` 的确定性 retime，而非引用 `output/sample-approved/` 旧素材），样片证据须含 MP4 SHA256、verify receipt、真实 wall-clock 采样、`playbackRate===1` 且原生播放 `ended` 事件绑定。`README.md:5` 同步描述。
- [x] Task 4（独立 OpenSpec change，不与上述三项混在同一 change 下）：完成 `openspec/changes/fix-motion-web-provenance/` 的 proposal/design/spec/tasks 和具名 registry、测试、研究、历史 QA 文档闭环。`provenance.source` 使用 canonical 根身份 `https://github.com/feitangyuan/motion-web`；`sourceMeta.url` 与 reference-boundary 保留固定 reviewed revision 的 `/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115` citation；`reviewedRevision`、`reviewedContentHash`、license 与 `codeCopied=false` 不变。不得触及 target runtime。

**Acceptance Criteria:**

- 给定 `index.html` 与 `verify.cjs` 改动后，当运行 target 内 `npm run verify`，则 `window.__motionGraph` 不再作为公开挂载存在（`window` 上不可枚举到该属性），但顶层 lexical `const motionGraph`（含 `design-pipeline.motion-graph.v1` schema、beats、tracks、shared-anchor、bounded spring 参数）与既有 graph-contract 断言（schema/composition/starts/beatIds/trackIds/springTrackIds）经 target-local 测试 hook 继续通过；`window.film` 与 `window.__timelines.openalice` 契约测试全部通过；新增的 spring-settle endpoint 与 beat-boundary 断言全部通过。
- 给定重建后的样片与证据链，当以 `playbackRate=1` 原生播放 7.5 秒样片至 `ended`，则采样时钟单调递增、MP4 SHA256 记入 receipt，且逐帧证据可见 SOURCE→RETAIN→REFERENCE→Inbox→ending 全部六个 beat 的真实解码帧（非跳帧近似）。
- 给定新 provenance OpenSpec change 落地，当运行 `openspec validate <provenance-change-id> --strict`，则 exit 0；当运行 `tests/source-governance.test.cjs` 与 `tests/animation-opportunity-reference.test.cjs`，则全部断言通过，且 `skill/references/motion-primitives.json` 中两条新 primitive 的 `provenance.source` 均为 `https://github.com/feitangyuan/motion-web`。
- 给定 `qa.md` 的补充标注，当阅读该文件，则读者能明确区分"历史/superseded"段落与"当前 motion-web 重做"（`84` 行起）段落，任何历史 SHA（如 `f258e4184ef372842ae34d6311af3eb3533cf6c92d068b415d0c19d7e0a09414`）、历史 warnings、历史 visibility 截图均不会被误读为当前状态。

## Spec Change Log

- 2026-09-19：Task 1–3 由 `polish-product-animation-evidence` 承接，Task 4 由独立 `fix-motion-web-provenance` 承接；保留已批准 Intent、Code Map、archive 与 frozen baseline。
- 2026-09-19：Task 1–4 scoped implementation/proof 完成；review 修正已收口。`--sample` 明确为 render-only，不允许 lint/check 静默改查 canonical。状态保持 `in-review`：root QA 仍失败，用户 Visual Acceptance 仍 pending。

## Verification

本 spec 保持 **status: in-review**。以下是有边界的技术证据，不是 CERE-482 done 或用户视觉接受。Task 1–4 勾选仅表示批准范围内实施与 scoped proof 完成。

| 证据 / owner | 最终结果与边界 |
| --- | --- |
| 支持的 target 命令（实施 owner） | canonical `npm run lint` + `npm run check` exit 0 / 10.15s；canonical render 已有 exit 0 / 29.84s 的 20s 输出。最终 `npm run render -- --sample` exit 0 / 14.62s，生成 7.5s derivative；sample SHA256=`55fb4b9b3519cc3eb4b9ab67543e914a618c31375d66402adc059c0829c024f2`。 |
| 最终 docs-bound target verify（实施 owner） | `npm run verify` exit 0 / 55.16s；`output/verification.json` recordedAt=`2026-09-19T05:10:24.350Z`，SHA256=`ef528c8f466c5ff4973d89e96614ec4829ce69f8a006fbf0d1b3b11b3717748c`。public/private surface、六 beat、spring endpoint、顺序 decode、native playback 与四表面证据纳入 receipt；Component Conformance=true / Visual Acceptance=pending。 |
| 不支持的 flag 与临时文件 proof（实施 owner） | `npm run lint -- --sample`、`npm run check -- --sample` 各 exit 1，明确 render-only/no-composition-selector error；前后 SHA256 证明 sample render receipt 与 MP4 bytes 不变，未创建 sample lint/check receipts/logs 或临时文件。canonical checks 后 foreign legacy sentinel byte-identical；forced sample render 失败 exit 1，记录 null output hash 并清理本次 owned temp。 |
| 独立 native playback（协调 owner） | canonical 20s 原生 ended / wall 20.008s；sample 7.5s 原生 ended / wall 7.508s，均 playbackRate=1；这是独立播放观察，不是以末帧截图代替 ended。 |
| 四表面及帧内容人工复核 | 协调 owner 已查看 corrected desktop/mobile/reduced-motion/native-controls 四张 PNG：完整 SOURCE/versions/Inbox 末态及两条人审文案位于控件上方，desktop/mobile 不再停在 opening frame。实施 owner 复核当前 PNG。capture 等待 `seeked` 与 canonical presented terminal frame（mediaTime 19.966667 ≥ 19.965667 floor，UI 约 0:19/0:20），与 native-ended 20s/7.5s 播放证据分开。reviewer 人工查看 8 张顺序解码帧的内容对应；不是自动 semantic-pixel 断言。 |
| Provenance focused proof | `node --test tests/source-governance.test.cjs tests/animation-opportunity-reference.test.cjs`：5 pass / 0 fail；独立 change strict validation exit 0。 |
| 当前 worktree 已记录 root QA（协调 owner） | `node scripts/qa.cjs` exit 1 / 53.185s（`artifact://1503`）：711 tests，710 pass / 1 fail；`tests/animation-verification.test.cjs:222` 报 `ReferenceError: startFixtureServer is not defined`。11 installed-CLI checks pass，QA status 文件 byte-identical；既有 manifest audit 的 `mengto-skills.test.cjs` 未覆盖问题不变。两项均在批准的 polish scope 外，保留且不掩盖。 |
| 独立 baseline 对照（协调 owner） | Orca separate worktree，commit `8ed5dc7c5c5181ac156b10dbf0261269bbecb80b`：668 pass / 0 fail，11 installed-CLI checks pass。不是当前 dirty worktree 的通过证明。 |

receipt hashes 只绑定文件与观测，不是来源或画面语义的独立认证。Component Conformance 与用户 Visual Acceptance 分离；root QA gate 仍未通过，用户视觉接受仍 pending。

### Review triage

- 接受并验证：root-level unique retime 文件由 exclusive `wx` 获取，只清理本次 owned 文件；失败 render 也记录 lineage/cleanup。
- silent canonical fallback 被拒绝：HyperFrames lint/check 无 composition selector，`--sample` 现在仅支持 render；unsupported sample checks 在文件修改前明确非零退出，不宣称 derivative lint/check 成功。
- 接受并验证：四表面 capture 等待 seeking 完成及 presented terminal frame；状态到末尾不等于末帧已显示。8 帧的语义对应来自人工 review，不宣称自动像素 oracle。

## Suggested Review Order

1. **先判证据与验收边界**：[polish completion gates](../../openspec/changes/polish-product-animation-evidence/tasks.md#L20) 与 [当前 verification receipt](../../experiments/openalice-product-animation/output/verification.json#L3)；root QA、技术 conformance 与用户 Visual Acceptance 分开判断。
2. **检查控件安全与截图时机**：[210 authored-pixel safety](../../experiments/openalice-product-animation/verify.cjs#L399)、[presented-terminal-frame wait](../../experiments/openalice-product-animation/verify.cjs#L190)、[四表面 capture](../../experiments/openalice-product-animation/verify.cjs#L543)。
3. **检查 sample flag、lineage 与临时文件所有权**：[render-only guard](../../experiments/openalice-product-animation/run.cjs#L14)、[unique retime input](../../experiments/openalice-product-animation/run.cjs#L42)、[owned cleanup / render-only receipt](../../experiments/openalice-product-animation/run.cjs#L64)。archive 不是输入。
4. **检查解码与播放证据的不同边界**：[ordered decoded-frame plan](../../experiments/openalice-product-animation/verify.cjs#L438)、[sample native playback](../../experiments/openalice-product-animation/verify.cjs#L575)。hash 与 decode 本身不证明画面语义。
5. **检查公共面未扩张、graph 验证未削弱**：[lexical graph](../../experiments/openalice-product-animation/index.html#L102)、[public timeline / film](../../experiments/openalice-product-animation/index.html#L189)、[public-surface checks](../../experiments/openalice-product-animation/verify.cjs#L227)。
6. **检查独立 provenance 闭环**：[canonical primitive source](../../skill/references/motion-primitives.json#L198)、[独立 spec delta](../../openspec/changes/fix-motion-web-provenance/specs/design-pipeline/spec.md#L3)、[focused proof 与阻塞 global gate](../../openspec/changes/fix-motion-web-provenance/tasks.md#L31)。不重开 historical integration。

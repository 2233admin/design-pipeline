# Guided Multi-Surface Design Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an adaptive, surface-aware design intake that turns ordinary-language requests into confirmed design briefs, platform-specific template choices, reviewable adaptation plans, and approved development tasks.

**Architecture:** Keep Project facts shared and move platform-specific behavior into Surface-bound WebProfile and MobileProfile contracts. Add a deterministic Guided Design Intake before direction locking, then keep region-template retrieval, component-fit, selection receipts, and adaptation approval as separate hash-bound stages. Game is represented only as a future profile and cannot participate in the first implementation wave.

**Tech Stack:** Node.js 22+, CommonJS `.cjs` kernels, JSON contracts, `node:test`, existing `designer-pipeline` CLI, existing `contract-utils.cjs`, existing component-fit and direction-preview kernels.

**Spec:** `docs/superpowers/specs/2026-09-01-multi-surface-design-pipeline.md`

## Global Constraints

- Use one Project with many Surface records; do not create independent Web, Mobile, and Game pipelines.
- Web and Mobile are first-class profiles; Game is reserved and must not enter first-wave retrieval or implementation.
- The default user experience is Agent conversation plus a live structured design panel; the panel is the reviewable state.
- The guide asks one focused question at a time and adapts question depth to supplied evidence.
- Generate the first direction draft when target audience, primary task, target Surface, and success criteria are confirmed.
- Present two or three materially different direction drafts with benefits and tradeoffs before direction lock.
- Distinguish known facts, user decisions, Agent suggestions, and unresolved questions; never invent missing requirements.
- Region is the template retrieval unit; components are implementation candidates evaluated inside a selected region by existing `component-fit`.
- First-wave references are project-internal pages and local HTML; URL crawling, screenshots, visual embedding, and Game implementation remain later slices.
- `adopt` and `reference` are distinct selection modes; license, provenance, security, and mandatory accessibility gates cannot be overridden.
- `SelectionReceipt` is immutable and bound to a Surface, reference hash, candidate versions, direction-lock snapshot, constraints, and acceptance criteria.
- Only an approved `AdaptationPlan` can create development tasks.
- Missing, stale, invalid, blocked, or unavailable evidence must remain visible and must not become a successful empty result.
- All project paths must remain contained by `--root`; use existing hash-bound artifact and CLI exit-code conventions.
- Do not install dependencies, execute remote source, copy remote source, or publish remote artifacts.
- Preserve unrelated existing working-tree changes; any task commit may include only that task's files.

---

## File map

- Create `skill/scripts/surface-profile-core.cjs` for Surface validation, profile definitions, platform gates, and Surface binding.
- Create `skill/scripts/guided-design-intake-core.cjs` for deterministic DesignBrief lifecycle and next-question selection.
- Create `skill/scripts/region-template-core.cjs` for project/local-HTML reference normalization, region decomposition, template inventory, and metadata retrieval.
- Create `skill/scripts/surface-design-artifacts-core.cjs` for SelectionReceipt, AdaptationPlan, precedence checks, and task-creation approval.
- Create `skill/references/surface-design-contract.schema.json` for the shared Project, Surface, DesignBrief, RegionTemplate, SelectionReceipt, and AdaptationPlan JSON definitions.
- Create `skill/references/region-template-catalog.json` as inert, versioned first-wave candidate data.
- Modify `skill/scripts/cli-core.cjs` to expose `surface`, `intake`, and `template` command families and wire existing direction/component gates.
- Modify `skill/SKILL.md` and `skill/references/stages.md` to make Guided Design Intake the first stage and document the public commands.
- Modify `skill/references/package-resources.json` to package all new scripts, contracts, and inert catalog data.
- Modify `scripts/test-manifest.json` to include the new contract tests.
- Create `tests/surface-profile.test.cjs`.
- Create `tests/guided-design-intake.test.cjs`.
- Create `tests/region-template.test.cjs`.
- Create `tests/surface-design-artifacts.test.cjs`.
- Create `tests/guided-multi-surface-cli.test.cjs`.

## Task 1: Surface Profiles and Shared Contract

**Files:**
- Create: `skill/scripts/surface-profile-core.cjs`
- Create: `skill/references/surface-design-contract.schema.json`
- Create: `tests/surface-profile.test.cjs`
- Modify: `skill/references/package-resources.json`

**Interfaces:**
- Produces `validateSurfaceProfile(value) -> SurfaceProfile`.
- Produces `createSurface(value) -> Surface`.
- Produces `validateSurfaceBinding(value, profile) -> Surface`.
- Produces `resolveSurfaceProfile(surface) -> { profileId, version, platform, gates }`.
- Exports `PLATFORMS = ["web", "mobile", "game"]` and `FIRST_WAVE_PLATFORMS = ["web", "mobile"]`.

- [ ] **Step 1: Write the failing contract tests**

Add tests that assert:

```js
const profile = resolveSurfaceProfile({ platform: "web", framework: "react", profileVersion: "1" });
assert.equal(profile.platform, "web");
assert.ok(profile.gates.includes("dom-semantics"));

const surface = createSurface({
  projectId: "project-1",
  surfaceId: "web-admin",
  platform: "web",
  framework: "react",
  profileVersion: "1",
});
assert.equal(surface.projectId, "project-1");
assert.equal(surface.platform, "web");

assert.throws(
  () => validateSurfaceBinding({ platform: "mobile", framework: "react" }, profile),
  /platform|surface/i,
);
assert.throws(() => createSurface({ platform: "game", framework: "custom" }), /reserved|first.wave|game/i);
```

Also test that Web and Mobile expose different gate sets, unknown platforms fail, and a Surface cannot omit `projectId`, `surfaceId`, `framework`, or `profileVersion`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --test tests/surface-profile.test.cjs
```

Expected: FAIL because the new module and exports do not exist.

- [ ] **Step 3: Add the shared contract definitions**

Define `design-pipeline.surface-design-contract.v1` with `$defs` for `project`, `surface`, `platformProfile`, `designBrief`, `referenceSource`, `regionTemplate`, `selectionReceipt`, and `adaptationPlan`. Keep schemas descriptive and versioned; the CommonJS kernels remain the runtime authority for hash, enum, path, and cross-object checks.

Define Web gates for responsive layout, DOM semantics, keyboard/pointer input, accessibility, and browser runtime. Define Mobile gates for touch targets, safe areas, navigation/back stack, gesture behavior, weak-network states, and device variation. Define Game as `reserved` with no first-wave retrieval gate.

- [ ] **Step 4: Implement Surface validation and profile resolution**

Implement strict object and enum checks using `contract-utils.cjs`. `createSurface` must normalize stable field order and return a canonical object. `resolveSurfaceProfile` must return deterministic gates and reject Game for first-wave operations. `validateSurfaceBinding` must reject a candidate or artifact whose platform/profile does not match the Surface.

- [ ] **Step 5: Register package resources and rerun the focused tests**

Add the new kernel and contract schema to `skill/references/package-resources.json`, then run:

```powershell
node --test tests/surface-profile.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit the isolated task**

```powershell
git add skill/scripts/surface-profile-core.cjs skill/references/surface-design-contract.schema.json skill/references/package-resources.json tests/surface-profile.test.cjs
git commit -m "feat: add surface platform profiles"
```

## Task 2: Adaptive Guided Design Intake

**Files:**
- Create: `skill/scripts/guided-design-intake-core.cjs`
- Create: `tests/guided-design-intake.test.cjs`
- Modify: `skill/references/surface-design-contract.schema.json`
- Modify: `skill/references/package-resources.json`

**Interfaces:**
- Produces `createDesignBrief(input) -> DesignBrief`.
- Produces `nextIntakeQuestion(brief, evidence) -> IntakeQuestion | null`.
- Produces `applyIntakeAnswer(brief, answer) -> DesignBrief`.
- Produces `confirmDesignBrief(brief) -> DesignBrief`.
- Produces `validateDesignBrief(brief) -> DesignBrief`.
- `IntakeQuestion` contains `{ id, field, prompt, why, options, status }`.

- [ ] **Step 1: Write the failing lifecycle tests**

Cover the observable transitions:

```js
const brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "做一个团队知识库" });
assert.equal(brief.status, "inferred");
assert.equal(nextIntakeQuestion(brief, {}).field, "audience");

const answered = applyIntakeAnswer(brief, { field: "audience", value: "team-members", source: "user" });
assert.equal(answered.audience.value, "team-members");
assert.equal(answered.audience.source, "user");

assert.throws(() => confirmDesignBrief(answered), /primary task|surface|success/i);
```

Add cases for one question at a time, known facts not being asked again, Agent suggestions remaining marked as suggestions, skipped fields remaining unresolved, complete briefs taking the confirmation path, and invented audience/success criteria being rejected.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --test tests/guided-design-intake.test.cjs
```

Expected: FAIL because the intake kernel does not exist.

- [ ] **Step 3: Define the DesignBrief contract and question policy**

Use fields for audience, user problem, usage context, primary task/actions, content density, brand constraints, platform constraints, references, success criteria, assumptions, and uncertainties. Every populated field carries a source discriminator: `known`, `user`, or `agent`; unresolved fields carry an explicit uncertainty record.

Implement a fixed priority order for missing core facts:

```text
audience → primary task → Surface → success criteria
```

After the four core facts are confirmed, return `null` from `nextIntakeQuestion` for the first direction draft. Additional questions are optional detail questions and cannot block the first draft unless a platform gate requires them.

- [ ] **Step 4: Implement brief transitions and adaptive question output**

`createDesignBrief` extracts only supplied facts and sets `inferred` or `clarifying`. `nextIntakeQuestion` returns one question with options, a reason, and a skip path. `applyIntakeAnswer` records user answers without rewriting unrelated fields. `confirmDesignBrief` requires the four core facts and changes status to `user_confirmed`. `validateDesignBrief` rejects unknown states, fabricated source markers, and missing required identity fields.

- [ ] **Step 5: Register resources and rerun the focused tests**

Run:

```powershell
node --test tests/guided-design-intake.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit the isolated task**

```powershell
git add skill/scripts/guided-design-intake-core.cjs skill/references/surface-design-contract.schema.json skill/references/package-resources.json tests/guided-design-intake.test.cjs
git commit -m "feat: add adaptive design intake"
```

## Task 3: Project and Local-HTML Region Templates

**Files:**
- Create: `skill/scripts/region-template-core.cjs`
- Create: `skill/references/region-template-catalog.json`
- Create: `tests/region-template.test.cjs`
- Modify: `skill/scripts/reference-evidence-core.cjs`
- Modify: `skill/references/package-resources.json`

**Interfaces:**
- Produces `normalizeReferenceSource(input, root) -> ReferenceSource`.
- Produces `decomposeReferenceRegions(referenceSource) -> Region[]`.
- Produces `validateRegionTemplateCatalog(catalog) -> Catalog`.
- Produces `searchRegionTemplates(catalog, request) -> SearchResult`.
- `SearchResult` contains `{ status, matches, rejected, query, surfaceBinding }`.

- [ ] **Step 1: Write the failing reference and retrieval tests**

Cover a project page and local HTML reference with stable content hashes, explicit provenance, and region markers. Use a fixture such as:

```html
<main data-region="dashboard">
  <header data-region="header"></header>
  <section data-region="data-table" data-capabilities="search,filter,sort"></section>
</main>
```

Assert that metadata search ranks a matching `data-table` candidate, filters unsupported framework/platform candidates, returns rejection reasons, and returns `no-suitable-candidate` rather than an empty success. Assert that a missing license/provenance state cannot produce an adoptable result.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --test tests/region-template.test.cjs
```

Expected: FAIL because the region template kernel and catalog do not exist.

- [ ] **Step 3: Add the inert region template catalog**

Create `design-pipeline.region-template-catalog.v1` entries with stable IDs and versions. Each entry must include `regionKind`, capabilities, layout traits, components used, framework, platform, license, provenance, adaptation boundary, and catalog status. Include only project-owned or explicitly attributed fixture entries; do not embed executable source.

- [ ] **Step 4: Implement reference normalization and region decomposition**

Extend the existing reference evidence boundary without changing its reconstruction schemas. `normalizeReferenceSource` must accept only project-page and local-HTML first-wave inputs, resolve paths below `--root`, hash bytes, preserve provenance, and distinguish invalid source from unavailable source. `decomposeReferenceRegions` must consume explicit `data-region` markers and return stable ordered regions; malformed or unmarked HTML returns a visible blocked result instead of guessed regions.

- [ ] **Step 5: Implement explainable metadata retrieval**

`searchRegionTemplates` must filter in this order:

```text
region kind
→ capabilities
→ Surface platform/framework
→ accessibility
→ license/provenance
→ layout traits
→ component-fit binding
```

Return both matches and rejected candidates with reason codes. Do not add visual embedding, screenshot OCR, URL crawling, or remote fetch behavior.

- [ ] **Step 6: Register resources and rerun the focused tests**

Run:

```powershell
node --test tests/region-template.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit the isolated task**

```powershell
git add skill/scripts/region-template-core.cjs skill/references/region-template-catalog.json skill/scripts/reference-evidence-core.cjs skill/references/package-resources.json tests/region-template.test.cjs
git commit -m "feat: add surface region template retrieval"
```

## Task 4: Selection Receipts and Adaptation Approval

**Files:**
- Create: `skill/scripts/surface-design-artifacts-core.cjs`
- Create: `tests/surface-design-artifacts.test.cjs`
- Modify: `skill/references/surface-design-contract.schema.json`
- Modify: `skill/references/package-resources.json`

**Interfaces:**
- Produces `createSelectionReceipt(input) -> SelectionReceipt`.
- Produces `validateSelectionReceipt(receipt, context) -> SelectionReceipt`.
- Produces `createAdaptationPlan(receipt, context) -> AdaptationPlan`.
- Produces `reviewAdaptationPlan(plan, review) -> AdaptationPlan`.
- Produces `approveAdaptationPlan(plan, approval) -> AdaptationPlan`.
- Produces `canCreateTasks(plan) -> { allowed, reasons }`.

- [ ] **Step 1: Write the failing receipt and approval tests**

Test the required invariants:

```js
const receipt = createSelectionReceipt({
  projectId: "p1",
  surfaceId: "web-admin",
  referenceHash: "a".repeat(64),
  candidate: { id: "region:data-table:1", version: "1.0.0" },
  selectionMode: "adopt",
  directionLockSnapshot: { hash: "b".repeat(64) },
  hardGateResults: { license: "pass", provenance: "pass", accessibility: "pass" },
  acceptanceCriteria: ["keyboard navigation works"],
});
const plan = createAdaptationPlan(receipt, { preservedStructure: ["filter row"] });
assert.equal(canCreateTasks(plan).allowed, false);
const approved = approveAdaptationPlan(plan, { reviewer: "user", rationale: "approved" });
assert.equal(canCreateTasks(approved).allowed, true);
```

Also test that `reference` can pass without adoption authorization, blocked hard gates reject `adopt`, catalog version drift invalidates a receipt, a direction-lock change invalidates the binding, and revisions return to `awaiting_review`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
node --test tests/surface-design-artifacts.test.cjs
```

Expected: FAIL because the artifact kernel does not exist.

- [ ] **Step 3: Implement immutable SelectionReceipt creation**

Use `canonicalJson` and `sha256` from `contract-utils.cjs`. Bind every receipt to Project, Surface, source hash, candidate versions, selection mode, direction-lock snapshot, technical constraints, gate results, allowed/forbidden changes, expected differences, and acceptance criteria. Reject missing provenance/license evidence for `adopt`; preserve the result as `reference` when permitted.

- [ ] **Step 4: Implement AdaptationPlan review transitions**

Create plans as `draft`, move them to `awaiting_review`, and require a reviewer decision. A revision must create a new hash-bound plan version and return to `awaiting_review`. Only `approved` plans return `allowed: true` from `canCreateTasks`.

Apply precedence in this order: license/provenance/security/accessibility, Surface technical constraints, direction lock, user template selection, soft visual traits. The plan must list platform adaptations and forbidden copying explicitly.

- [ ] **Step 5: Rerun the focused tests**

Run:

```powershell
node --test tests/surface-design-artifacts.test.cjs
```

Expected: PASS.

- [ ] **Step 6: Commit the isolated task**

```powershell
git add skill/scripts/surface-design-artifacts-core.cjs skill/references/surface-design-contract.schema.json skill/references/package-resources.json tests/surface-design-artifacts.test.cjs
git commit -m "feat: add surface selection and adaptation receipts"
```

## Task 5: Public CLI and Documentation Integration

**Files:**
- Create: `tests/guided-multi-surface-cli.test.cjs`
- Modify: `skill/scripts/cli-core.cjs`
- Modify: `skill/SKILL.md`
- Modify: `skill/references/stages.md`
- Modify: `README.md`
- Modify: `scripts/test-manifest.json`

**Interfaces:**
- Adds `surface validate --artifact <file> --json`.
- Adds `intake start --artifact <file> --json`.
- Adds `intake answer --artifact <file> --answer <file> --json`.
- Adds `intake confirm --artifact <file> --json`.
- Adds `template inventory --catalog <file> --json`.
- Adds `template search --catalog <file> --surface <file> --request <file> --json`.
- Adds `template select --selection <file> --json`.
- Adds `template adapt --receipt <file> --context <file> --json`.
- Adds `template review --plan <file> --review <file> --json`.
- Adds `template approve --plan <file> --approval <file> --json`.

- [ ] **Step 1: Write the failing CLI contract tests**

Create temporary root-contained artifacts and assert the complete command path:

```js
const intake = execute(["intake", "start", "--root", root, "--artifact", "input.json", "--json"]);
assert.equal(intake.exitCode, 0);
assert.equal(intake.output.brief.status, "inferred");

const blocked = execute(["intake", "confirm", "--root", root, "--artifact", "brief.json", "--json"]);
assert.equal(blocked.exitCode, 2);

const search = execute(["template", "search", "--root", root, "--catalog", "catalog.json", "--surface", "surface.json", "--request", "request.json", "--json"]);
assert.equal(search.exitCode, 0);
assert.ok(Array.isArray(search.output.matches));
```

Assert that task-creation approval is blocked for an unconfirmed brief or unapproved plan, that output uses the existing CLI envelope, and that help lists all new commands.

- [ ] **Step 2: Run the focused CLI test to verify it fails**

Run:

```powershell
node --test tests/guided-multi-surface-cli.test.cjs
```

Expected: FAIL because the command families are not registered.

- [ ] **Step 3: Wire kernels into `cli-core.cjs`**

Import the four new kernels. Add command handlers that use existing `artifact`, `contained`, `readJson`, `writeResult`, and exit-code conventions. Keep parsing and path containment in `cli-core.cjs`; keep validation and state transitions in the kernels.

Register `surface`, `intake`, and `template` in `COMMANDS`. Update `publicHelp()` with exact flags and the distinction between `template select`, `template adapt`, `template review`, and `template approve`.

- [ ] **Step 4: Integrate existing direction and component gates**

`template select` must require a confirmed DesignBrief and Surface-bound direction lock when the Surface requires one. `template search` must pass the Surface platform/framework to region retrieval. The region implementation path must invoke existing `buildComponentFitMatrix` only after a region candidate is selected; do not duplicate component-fit logic.

- [ ] **Step 5: Update the agent-facing documentation**

In `skill/SKILL.md`, change the stage map so Stage 1 begins with Guided Design Intake and document the new public commands. In `skill/references/stages.md`, document:

```text
ordinary-language input → DesignBrief confirmation → directions → Surface templates → adaptation review → tasks
```

State that the live design panel is the reviewable projection, not the chat transcript. Update `README.md` with one concise ordinary-user example and one expert fast-path example. Do not claim screenshot, URL, visual embedding, or Game support in the first wave.

- [ ] **Step 6: Add the test to the manifest and rerun focused tests**

Add `guided-multi-surface-cli.test.cjs`, `surface-profile.test.cjs`, `guided-design-intake.test.cjs`, `region-template.test.cjs`, and `surface-design-artifacts.test.cjs` to `scripts/test-manifest.json` in the existing test list. Run:

```powershell
node --test tests/surface-profile.test.cjs tests/guided-design-intake.test.cjs tests/region-template.test.cjs tests/surface-design-artifacts.test.cjs tests/guided-multi-surface-cli.test.cjs
```

Expected: PASS.

- [ ] **Step 7: Commit the isolated task**

```powershell
git add skill/scripts/cli-core.cjs skill/SKILL.md skill/references/stages.md README.md scripts/test-manifest.json tests/guided-multi-surface-cli.test.cjs
git commit -m "feat: expose guided surface workflow through CLI"
```

## Task 6: End-to-End Verification and Regression Gate

**Files:**
- Modify: `tests/guided-multi-surface-cli.test.cjs`
- Modify: `scripts/test-manifest.json` only if a missing existing test entry is found

**Interfaces:**
- Verifies the public CLI path from ordinary-language input to approved task eligibility.
- Verifies existing Web direction/component behavior remains unchanged.

- [ ] **Step 1: Add the complete vertical fixture**

Build one temporary Project with `web-admin` and `mobile-user` Surfaces, a vague user request, one local HTML reference, two region templates, a direction lock, and component-fit inputs. Exercise:

```text
intake start
→ intake answer × required questions
→ intake confirm
→ template search per Surface
→ template select adopt
→ template adapt
→ template review
→ template approve
```

Assert that Web and Mobile produce different gate results for the same region, receipts are Surface-bound, and only the approved plan is task-eligible.

- [ ] **Step 2: Add negative-path coverage**

Cover these cases in the same vertical suite:

- missing provenance blocks `adopt` but permits `reference`;
- stale catalog version blocks receipt validation;
- unresolved core brief blocks direction/task transition;
- no candidate returns `no-suitable-candidate`;
- direction lock cannot be silently changed by adaptation;
- a Game candidate cannot enter Web or Mobile retrieval;
- a revised plan cannot create tasks before re-approval;
- local HTML outside `--root` is rejected.

- [ ] **Step 3: Run the focused vertical suite**

Run:

```powershell
node --test tests/guided-multi-surface-cli.test.cjs tests/direction-preview.test.cjs tests/component-fit-matrix.test.cjs
```

Expected: PASS, with existing direction-preview and component-fit behavior preserved.

- [ ] **Step 4: Run the repository test manifest**

Run the repository's established manifest command used by the current project. If no package script exists, run the manifest entries with Node's test runner from the repository root. Preserve the Windows temp-directory workaround already required by this workspace when the C: drive is constrained.

Expected: all manifest tests pass; no new dependency installation is required.

- [ ] **Step 5: Inspect the final diff for placeholders and scope drift**

Check changed files for `TODO`, `TBD`, `FIXME`, skipped tests, test-only branches, remote-source execution, and undocumented first-wave claims. Remove or implement every placeholder before completion.

- [ ] **Step 6: Commit the verified vertical slice**

```powershell
git add tests/guided-multi-surface-cli.test.cjs scripts/test-manifest.json
git commit -m "test: verify guided multi-surface workflow"
```

## Plan Self-Review Checklist

- Guided Design Intake is implemented before direction lock and task generation.
- The live panel contract is represented by reviewable DesignBrief state, not hidden conversation history.
- The four core facts gate the first direction draft without forcing a fixed question count.
- Direction preview produces two or three differentiated drafts before lock.
- Project and Surface ownership is explicit.
- Web and Mobile profiles are separate; Game is reserved.
- Region-template retrieval is separate from component-fit and uses component-fit only inside a selected region.
- Provenance, license, accessibility, direction, version, and path gates are explicit.
- SelectionReceipt and AdaptationPlan are immutable or versioned and task creation requires approval.
- No first-wave URL, screenshot, visual embedding, or remote installation work is hidden in the tasks.
- Every new public command has a focused contract test and a vertical negative-path test.
- Existing direction-preview and component-fit contracts remain regression-tested.

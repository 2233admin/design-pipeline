# Website Cloning Module

## Contents

1. Purpose and interface
2. Target roles
3. Port contracts
4. Capability negotiation
5. Fidelity contract
6. Artifact model
7. Execution protocol
8. Repair loop
9. Failure and resume behavior
10. Completion contract

## 1. Purpose And Interface

Use this module to reconstruct authorized live web surfaces from measured evidence. The simple interface is one or more URLs; the deep implementation coordinates capture, specification, building, and independent comparison.

Initialize from the target project root:

```bash
node <design-pipeline>/scripts/init-website-clone.cjs \
  --change-id clone-example \
  --url https://example.com \
  --reference-url https://reference.example \
  --fidelity exact
```

Options:

- `--url`: primary surface whose implementation is compared back to that same surface. Repeatable and required.
- `--reference-url`: supporting surface that supplies selected design or interaction constraints but is not automatically a pixel baseline. Repeatable.
- `--fidelity exact|adaptive`: `exact` converges on measured equivalence; `adaptive` permits documented target-project adaptations.
- `--change-id`: lowercase hyphen-case id for the active change.
- `--project-root`: target repository; defaults to the current directory.

The initializer creates or augments one OpenSpec/design change. Re-running the identical request resumes without rewriting state history. It never marks a run complete.

## 2. Target Roles

Every target has one role:

- `primary`: capture, implement, and compare the clone against this target.
- `reference`: extract only the mapped patterns needed by the primary implementation.

For every reference target, write an explicit mapping in `design.md` and the manifest's `referenceMappings` array:

```text
mapping id -> supporting|replacement -> reference target/source region -> primary target/component -> adopted properties -> rejected properties
```

Each manifest mapping names its `designRecord` (for example `design.md#linear-nav`). The source must be a reference target, the destination must be a primary target, and the design artifact must contain the mapping id. Do not pixel-match a primary implementation against a reference target unless the mapping explicitly makes that region a baseline.

## 3. Port Contracts

The user-facing interface stays URL-first. Internally, negotiate three real seams because multiple adapters are expected.

### BrowserPort

Purpose: turn a live page into a canonical observation bundle.

```ts
interface BrowserPort {
  id: string;
  capabilities: string[];
  capture(request: CaptureRequest): Promise<ObservationBundle>;
  exercise(request: InteractionRequest): Promise<InteractionTrace>;
}
```

Required exact-mode capabilities:

- navigate and report final URL/status;
- set deterministic viewport and device scale;
- wait for fonts and a declared readiness condition;
- capture screenshots;
- evaluate page scripts for DOM, computed style, assets, and metadata;
- scroll, click, hover, focus, type, and resize;
- record provenance for every observation.

The observation bundle must include:

- viewport, browser engine/version, device scale, locale, color scheme, and timestamp policy;
- full-page and section screenshots;
- DOM or accessibility-tree structure for relevant regions;
- exact computed styles with selector and state provenance;
- real text, accessible names, links, and form labels;
- font faces/weights, images, video, SVG, canvas, background images, and layered assets;
- interaction traces with trigger, before/after state, timing, easing, and interruption behavior;
- responsive observations at every declared viewport;
- capture warnings, inaccessible regions, and dynamic/non-deterministic regions.

Never synthesize a missing measurement. Return a structured gap.

### BuilderPort

Purpose: implement one bounded slice from a complete component contract.

```ts
interface BuilderPort {
  id: string;
  capabilities: string[];
  build(request: BuildSliceRequest): Promise<BuildSliceResult>;
  assemble(request: AssemblyRequest): Promise<AssemblyResult>;
}
```

Required capabilities:

- read the full component contract and its evidence paths;
- edit only the declared target files;
- preserve the target project's framework, tokens, components, and package manager;
- run the declared type, lint, test, and build checks;
- return changed files, check output, unresolved evidence gaps, and next actions.

A builder must return `SPEC_INCOMPLETE` when evidence needed for its slice is absent. It must not guess CSS values, assets, content, interaction triggers, or responsive behavior in exact mode.

### EvidencePort

Purpose: independently compare the reference capture with the implementation and decide whether the fidelity gate passes.

```ts
interface EvidencePort {
  id: string;
  capabilities: string[];
  compare(request: ComparisonRequest): Promise<ComparisonReport>;
  replay(request: ReplayRequest): Promise<InteractionComparison>;
}
```

Required exact-mode capabilities:

- render reference and implementation under matched conditions;
- pixel diff with narrowly documented dynamic masks;
- layout geometry diff;
- text and accessible-name diff;
- asset coverage and intrinsic-dimension diff;
- responsive diff for every declared viewport;
- interaction trace replay and before/after state comparison;
- evidence paths and classified repair findings.

The EvidencePort must be independent of the builder result. A passing build is not fidelity evidence.

## 4. Capability Negotiation

Before capture, write the selected adapter id, `availableCapabilities`, and a successful `lastProbe` into `website-cloning.json`. The required and observed capabilities are separate so the gate can detect partial adapters.

Exact mode requires all three ports and the exact capability set. Adaptive mode still requires reproducible capture, content/state comparison, responsive coverage, and mapped interaction replay, but pixel/layout comparison is optional unless its gate is configured. If a required capability is absent:

1. Try another available adapter.
2. If the missing capability is measurable by a safe manual procedure, record that procedure and evidence path.
3. Otherwise set the run or target to `blocked`.
4. Change to `adaptive` or `fidelity-limited` only when the user accepts the reduced claim.

Examples of BrowserPort adapters include Chrome/DevTools, Playwright, Browserbase, or another browser-control surface. BuilderPort adapters include a bounded local executor, Codex subagent/worktree dispatcher, or sequential fallback. EvidencePort adapters include Playwright screenshot comparison, browser-based overlay inspection, or another deterministic visual/interaction harness.

Do not hard-code an adapter into the module contract.

After EvidencePort writes a verification report, evaluate it through the bundled gate:

```bash
node <design-pipeline>/scripts/evaluate-website-clone.cjs \
  --change-root <project>/openspec/changes/clone-example \
  --evidence <project>/openspec/changes/clone-example/verification-input.json
```

The report uses `design-pipeline.website-cloning.verification.v1`. It contains aggregate content/interaction coverage, one measured result for every declared viewport, and one replay result for every reference mapping:

```json
{
  "schema": "design-pipeline.website-cloning.verification.v1",
  "targets": [
    {
      "targetId": "example-com",
      "textCoverage": 1,
      "assetCoverage": 1,
      "interactionCoverage": 1,
      "viewports": [
        {
          "width": 1440,
          "height": 900,
          "pixelDifferenceRatio": 0.0004,
          "maxLayoutDeltaPx": 1,
          "unresolvedDifferences": []
        }
      ],
      "unresolvedDifferences": []
    }
  ],
  "mappings": [
    {
      "mappingId": "linear-nav",
      "interactionCoverage": 1,
      "replayPassed": true,
      "verifiedAdoptedProperties": ["open-close interaction"],
      "verifiedRejectedProperties": ["brand and copy"],
      "states": [
        {
          "name": "keyboard-focus",
          "replayPassed": true,
          "evidencePaths": ["targets/example-com/evidence/interactions/linear-nav.json"],
          "unresolvedDifferences": []
        }
      ],
      "unresolvedDifferences": []
    }
  ]
}
```

The evaluator writes the fidelity verdict to the manifest, state, event log, and handoff. Its exit codes are `0` for pass, `2` for unavailable capability/measurement, and `3` for measured fidelity mismatch. A fidelity pass completes the website-cloning manifest but leaves the overall change at `needs-review` until the normal design-pipeline gates pass.

## 5. Fidelity Contract

`exact` means evidence-backed convergence against the primary target under recorded rendering conditions, not an unsupported promise that every GPU, font rasterizer, personalized response, or clock tick produces identical bytes. Do not use exact mode when a reference mapping intentionally replaces primary behavior.

`adaptive` means fidelity to an explicitly mixed contract. It permits named reference mappings or target-project adaptations and cannot be reported as global 1:1. Text, assets, interaction coverage, responsive states, and mapped replays still require evidence. Pixel/layout measurements may be omitted only while their gates are `null`; configure non-null thresholds when an adaptive run must prove unchanged regions outside approved mappings.

Default exact gates:

- text coverage: `1.0`;
- asset coverage: `1.0`;
- interaction coverage: `1.0` for discovered in-scope interactions;
- maximum pixel-difference ratio: `0.001` after approved masks;
- maximum layout delta: `1px` for matched boxes;
- zero unexplained missing or extra visible sections;
- type, lint, tests, and production build pass where the target project provides them.

Tighten the pixel threshold to zero only when repeated captures prove the baseline is deterministic. Loosen a threshold only with a recorded reason, before/after evidence, and an explicit `fidelity-limited` note.

Dynamic masks must be narrow and named: clocks, randomized content, video frames, cursor/caret, or known third-party embeds. Never mask an entire section to make the gate pass.

For static comparison, freeze animation after separately recording its real behavior. For interaction comparison, replay the real triggers and compare named states, timing, easing, focus, and interruption behavior.

## 6. Artifact Model

The active change is the only source of truth:

```text
<change-root>/
  proposal.md
  brief.md
  directions.md
  design.md
  motion.md
  tasks.md
  qa.md
  state.json
  events.jsonl
  handoff.md
  website-cloning.json
  targets/<target-id>/
    research/
      behaviors.md
      page-topology.md
      design-tokens.md
      component-inventory.md
      components/<component>.spec.md
    evidence/
      screenshots/
      visual-diff/
      interactions/
    assets/manifest.json
```

Keep primary and reference evidence isolated. Store copied assets in the target project only when their use is authorized; the change artifact may record source URL, checksum, license/permission note, and destination.

## 7. Execution Protocol

### Stage A: authorization and baseline

- Confirm ownership, permission, applicable terms, and in-scope pages.
- Record exact versus adaptive fidelity and primary/reference roles.
- Verify the target project can run before edits.
- Negotiate Browser, Builder, and Evidence ports.

### Stage B: deterministic reconnaissance

- Capture full-page reference screenshots at every viewport.
- Wait for fonts and the declared page-ready condition.
- Record rendering environment and dynamic regions.
- Inventory fonts, colors, spacing, radii, shadows, breakpoints, metadata, and all asset layers.

### Stage C: interaction and state discovery

- Scroll before clicking to distinguish scroll-driven from click-driven behavior.
- Exercise every relevant click, hover, focus, input, resize, time-driven, loading, empty, and error state.
- Capture before/after styles, content, assets, focus, timing, easing, and trigger.
- Record the interaction model for every section in `behaviors.md` and `page-topology.md`.

### Stage D: foundation barrier

Before parallel slice work:

- map tokens and fonts into the target project's existing system;
- establish global layout, metadata, shared types, icons, and authorized assets;
- record framework/library mapping decisions;
- run the target project's checks.

### Stage E: component contract and bounded build

- Create one component contract using `references/website-clone-component-spec.md` before a builder starts.
- Link exact evidence, not conversational memory.
- Split work by independently verifiable behavior and file ownership.
- Dispatch in parallel only when slices do not share files or prerequisites.
- Run the smallest relevant project check after each slice.

### Stage F: assembly

- Assemble sections in topology order.
- Implement page-level scroll, layering, sticky behavior, themes, and route behavior.
- Re-run target-project static checks and production build.

### Stage G: independent evidence and repair

- Render reference and implementation under matched conditions.
- Compare every viewport and discovered interaction.
- Classify failures as capture, spec, build, rendering, asset, content, layout, motion, accessibility, or environment issues.
- Repair the smallest owning artifact or implementation slice.
- Repeat until gates pass or a real blocker/fidelity limit is recorded.

### Stage H: design-pipeline gates

Run the normal visual, UX, accessibility, motion, responsive, engineering, manual QA, and headless-state gates. Website cloning adds gates; it never removes existing ones.

## 8. Repair Loop

Use this order for every mismatch:

1. Confirm the comparison environment matches.
2. Check whether capture evidence is complete and deterministic.
3. Check whether the component contract accurately reflects the evidence.
4. Repair the contract when capture was misinterpreted.
5. Repair the implementation when it violated a correct contract.
6. Re-run the narrow comparison, then the full page and interaction suite.

Every failed comparison must produce a repair task with owner file, evidence paths, measured delta, expected state, and verification command.

## 9. Failure And Resume Behavior

Use these statuses:

- `planned`: initialized, ports not yet negotiated;
- `in-progress`: capture/build/compare is active;
- `blocked`: a required capability, permission, input, or external surface is unavailable;
- `fidelity-limited`: work can continue but the exact claim is not supportable;
- `needs-review`: gates ran and require a decision;
- `complete`: all required gates pass.

On failure, update `state.json.blockers`, append an event, refresh `handoff.md`, and keep completed target phases unchanged. Resume by reading state, the last 20 events, handoff, the manifest, and only the artifacts named by current next actions.

## 10. Completion Contract

Report:

- primary and reference targets;
- components and component contracts created;
- captured and reused assets with permission notes;
- selected Browser/Builder/Evidence adapters;
- target-project static/build results;
- fidelity metrics for every viewport;
- interaction coverage and mismatches;
- approved dynamic masks;
- exact, adaptive, blocked, or fidelity-limited verdict;
- remaining discrepancies with evidence paths.

Never report “pixel-perfect” or “1:1” without a passing EvidencePort report and a zero-exit evaluator result under the recorded fidelity contract.

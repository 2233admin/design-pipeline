# Design: website-cloning module

## Module Interface

The parent `skill/SKILL.md` routes clone, replica, rebuild, and reverse-engineering requests to `references/website-cloning.md`. The module exposes one deterministic code seam:

```text
node <skill-root>/scripts/init-website-clone.cjs --change-id <id> --url <url> [--url <url> ...] [--project-root <path>]
```

The initializer validates all inputs before writing, detects the OpenSpec surface, rejects unsafe change ids and duplicate normalized URLs, and creates one target directory per URL.

Internally, the workflow uses three real ports:

- BrowserPort produces canonical observations and interaction traces.
- BuilderPort implements bounded slices from complete component contracts.
- EvidencePort independently compares reference and implementation renders and interactions.

Their required capabilities, selected adapters, target roles, viewports, and fidelity thresholds live in `website-cloning.json` and its JSON Schema. The simple facade therefore does not limit the project's superset capability.

## Artifact Placement

The active OpenSpec change remains the source of truth:

```text
openspec/changes/<change-id>/
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
      components/
    evidence/
      screenshots/
      visual-diff/
    assets/manifest.json
```

The initializer does not overwrite existing artifacts. Resume uses `state.json`, the last 20 events, `handoff.md`, and `website-cloning.json`.

## Execution Protocol

The module keeps the upstream workflow's useful ordering while integrating project-2 gates:

1. authorization and capability preflight;
2. desktop/mobile capture and interaction sweep;
3. topology, tokens, content, assets, and component inventory;
4. target-project foundation barrier;
5. one exact component spec before each bounded builder slice;
6. assembly with build checks;
7. visual and interaction diff with repair loop;
8. design-pipeline accessibility, motion, responsive, engineering, and headless QA.

## Seam And Dependencies

- File system: local-substitutable internal seam, exercised through the initializer CLI in temporary directories.
- Browser automation: true external dependency behind BrowserPort; no provider is hard-coded.
- Builder dispatch: BuilderPort runtime capability; parallel subagents/worktrees are optional, sequential execution is the fallback.
- Comparison harness: EvidencePort remains independent from BuilderPort so build success cannot be mistaken for fidelity.
- Target build: project-owned dependency discovered from repository conventions.

## Failure Model

Input errors exit non-zero without creating the change directory. Missing exact-mode port capabilities or incomplete evidence set the run to `blocked` or `fidelity-limited`; the workflow must not guess. Other execution failures update `state.json.blockers`, append an event, and leave actionable `nextActions`; completed target phases are not repeated on resume.

## Attribution

The extracted protocol is adapted from `UHolli/ai-website-cloner` at commit `021cd257536aae64037deeef7e70fc1b39fb55d6`, licensed MIT by JCodesMore. The project retains the notice in `THIRD_PARTY_NOTICES.md`.

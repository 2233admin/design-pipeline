# Feedback and contribution loop

Use this module when a pipeline run exposes a pipeline bug, stale companion, missing capability, quality gap, documentation gap, or reusable feature request.

## Principle

Capture immediately, publish deliberately.

“Real-time” means the observation is normalized and written during the command that detects it. The module does not install a watcher, poll a remote, or publish with ambient credentials.

## Local flow

```text
Observe -> Normalize -> Redact -> Deduplicate -> Draft -> Audit -> Review -> Authorize -> Publish -> Reconcile
```

Record a finding:

```powershell
node <design-pipeline>/scripts/record-feedback.cjs `
  --kind capability-gap `
  --source runtime `
  --skill animejs `
  --title "Anime.js companion lacks adapter guidance" `
  --summary "The requested Three.js target is supported upstream but missing from the installed companion." `
  --evidence "Self-check missing marker: adapters"
```

Record self-check warnings synchronously:

```powershell
node <design-pipeline>/scripts/check-deps.cjs --json --record-feedback
```

Artifacts are written under `.design-pipeline/feedback/` in the target repository unless `--feedback-root` selects another root.

Before writing, the recorder:

- replaces longer nested paths before parent paths so the feedback root remains identifiable;
- redacts common tokens, authorization headers, credential-bearing URLs, and machine paths;
- normalizes scalar programmatic inputs into the same arrays produced by the CLI;
- validates existing observation and index JSON before an update.

Corrupt feedback state fails closed with a contextual error and is not silently overwritten or
reset.

## Routing

- Use an Issue draft for an unconfirmed bug, stale companion, missing capability, or feature request.
- Use a PR draft only when a concrete patch exists and changed files plus validation evidence are available.
- `auto` routes to Issue because a finding alone is not proof that a patch is ready.

## Publish gate

The bundled scripts never create a remote Issue or PR. See
`references/upstream-capability-sync.md` for the host-adapter contract.

Before publication:

1. Confirm the intended upstream repository.
2. Re-read the draft for private paths, user data, screenshots, tokens, and proprietary source.
3. Link reproducible evidence and the relevant capability-registry source.
4. For a PR, verify the diff, tests, package output, and compatibility fallback.
5. Prepare a deterministic request with `scripts/prepare-publication.cjs`.
6. Obtain explicit authority for that action and repository.
7. Use an authorized GitHub, browser, or ship host adapter to create or reuse the remote artifact.
8. Capture a schema-valid receipt containing the same idempotency key, action, and repository.
9. Reconcile it with `scripts/reconcile-publication.cjs`; do not hand-edit published state.

## Learning

After a finding is resolved:

- update `companion-capabilities.json` when the durable fact is compatibility-related;
- update the reference or script when the pipeline behavior changed;
- preserve the regression test;
- mark the observation `resolved` or `superseded`;
- if gstack is installed, log only a durable reusable learning, never raw user evidence.

## Maintainer self-hosting loop

When changing `design-pipeline` itself:

1. Start or link an OpenSpec change.
2. Run self-check with feedback recording.
3. Treat new observations as input evidence, not automatic scope.
4. Implement the smallest design-outcome-focused change.
5. Run repository QA, tests, package checks, installed self-check, and structural analysis.
6. Prepare a PR draft from the resolved observation.
7. Publish only with explicit user authority.

This keeps the pipeline capable of improving itself without turning it into a general-purpose autonomous package manager.

# Skill structure and OpenSpec alignment

## Purpose and scope

Make the skill's task entry, maintained tools, upstream sources and workflow requirements agree.
Update the local OpenSpec CLI and this project's configuration to the current stable upstream.
Keep public CLI commands, receipt schemas, source hashes and existing user work intact.

## Status

Implementation and technical verification complete, 2026-10-06; pending owner review.
The change remains unarchived. No commit or publication has been requested.

## Authorization

The user accepted the preceding diagnosis and directory responsibilities, then requested the
OpenSpec update: “可以 而且我们的openspece 这个规范上游也更新了 我们也得更新下 我觉得你说的没问题”.
This authorizes the scoped update, not acceptance of future visual results. Documents are uncommitted.
The prior working tree and OpenSpec validation are recorded under ignored
`.design-pipeline/structure-upgrade/`.

## Progress

- Upstream stable version verified as 1.14.1; local CLI upgraded from 1.14.0.
- Before the update, strict validation already rejected 23 of 38 active changes; the main spec passed.
- Project context now comes from `config.yaml`; five ignored Codex skills replace the four legacy
  global `opsx-*` prompts. The global custom profile, delivery setting and workflow choices are unchanged.
- Repaired 23 active spec files: all 67 original requirement bodies under 500 characters remain
  verbatim; the one longer body retains its details in scenarios. Moved details from four long
  main-spec requirements into scenarios without changing their requirements.
- Separated nine source bundles, updated catalog/import/package consumers and unified the entry
  and stage guides. Supporting tools retain their caller's workflow; complete deliverables use
  the applicable `next` tier and route.
- Updated the canonical Codex installation after backing it up outside skill discovery roots.

## Updated documents

- [x] `openspec/config.yaml`, project-context pointers and `CONTRIBUTING.md`.
- [x] `skill/SKILL.md`, workflow guides and `README.md`.
- [x] Source bundle locations, consumers, package manifest and third-party notices.
- [x] `docs/README.md` and the package's source/tool navigation.

## Superseded assumptions

The old `openspec/project.md` is passive context. The official configuration now injects concise
context and artifact-specific rules. `pipeline-reference.md` is a route reference, not a second
skill entry. A supporting tool task does not initialize the complete deliverable workflow.

## Documents

- `proposal.md`: accepted problem and implementation scope.
- `design.md`: migration boundaries and verification.
- `specs/design-pipeline/spec.md`: observable requirements and rejection cases.
- `tasks.md`: implementation checklist.

## Findings and decisions

Keep existing machine-schema paths and public CLI names. Move complete attributed source bundles
together so their relative file lists, licenses and source digests remain valid. Do not archive old
changes merely because their checkboxes are checked.

## Verification

| Check | Result |
| --- | --- |
| `openspec validate --all --strict --json` | 40/40 valid: 39 changes and one main spec; two informational archive prerequisites remain below |
| Moved-file SHA-256 comparison | 1,508 files unchanged; the maintained Huashu README moved to `references/huashu-art-motion.md` and its links were updated |
| Source catalogs and Canvas checks | 34/34 pass, including a real browser study at two sizes and reordered frame sampling |
| Maintained Markdown links and anchors | 80 checked, no missing targets |
| `node scripts/qa.cjs` | Exit 0: 913 passed, 0 failed, 1 skipped across 105 test files; 914 test cases are not 914 features |
| Packaged installation | Reproducible TGZ/ZIP/checksums, isolated replacement and installed catalog checks pass; public CLI tests 12/12 |
| Canonical installed skill | All 1,845 files match the repository; doctor, catalog routing and a scaffold outside the skill pass |
| Preserved state | Prior staged diff unchanged; QA leaves Git status byte-identical; ignored local agent/BMAD files stay outside the index |

The skipped case is the real headless Blender turntable render in `tests/film-blender.test.cjs`.
At the time, the detector did not find the machine's installed Blender, so this historical run did
not establish native Blender rendering correctness; the other Blender tests exercised conversion
and the mocked adapter flow. The follow-up [runtime discovery change](../refresh-frontend-toolchain-and-runtime-discovery/README.md)
records the installed Blender and a successful real render. These checks verify implementation and
packaging, not aesthetic quality or owner acceptance.

OpenSpec's informational archive checks expose two pre-existing ordering/history conditions:

- `ground-films-in-references-and-sound` modifies `product-film`, whose main spec does not yet
  exist. Its prerequisite capability changes must be reconciled before archival.
- `harden-feedback-recorder-v0-3-1` adds `Feedback state corruption fails closed`, which already
  exists in the main spec. Its duplicate delta needs reconciliation before archival.

Neither change was archived, reclassified or marked accepted by this update. Strict validation
passing does not remove these archive prerequisites.

Local logs, original bytes, file-move hashes and install backup location are under ignored
`.design-pipeline/structure-upgrade/`. The existing shared `~/.agents/skills/design-pipeline`
installation was preserved; this update targets `~/.codex/skills/design-pipeline`.

## Corrections after closeout

None; this change remains open.

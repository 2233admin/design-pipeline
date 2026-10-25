## Why

Complex design explanations currently require hand-authored pages or plain text. The reviewed answer-me-with-html renderer can turn structured Markdown into a local explanation with diagrams and manual feedback. A bounded helper adds this communication capability without turning every answer into HTML or replacing the project's workflow.

## What Changes

- Preserve the reviewed `2233admin/answer-me-with-html` fork revision `4da5ae89ac435683110aa1b8707d9d4170184c55` and canonical QingYunA provenance, repository license and required dependency/font notices.
- Build a maintained library entry from the preserved upstream source using pinned upstream build inputs. Reuse its renderer, parser, diagrams and feedback runtime without invoking its CLI, config, home, update, serve or video commands.
- Add a Node-only supporting helper that accepts explicit Markdown and a fresh output directory, defaults to doc/paper, embeds permitted local raster images, and produces offline HTML plus redistribution notices.
- Reject executable raw markup, remote automatic resources and file inclusion outside the caller-authorized asset directory. Preserve literal code examples. Apply a restrictive output CSP while allowing ordinary user-clicked web links.
- Retain the source-copy feature intentionally: the generated artifact includes its input draft and included content; document the disclosure boundary before use.
- Add task-triggered tool guidance, existing capability-source metadata, package resources, focused behavioral checks and source integrity checks.

## Capabilities

### Modified Capabilities

- `design-pipeline`: bounded supporting explanation tools, immutable source provenance and manual feedback behavior.

## Impact

Maintained helper/runtime under `skill/tools/answer-me-with-html/`; preserved source under `skill/vendor/answer-me-with-html/`; maintenance import/build scripts; existing tools/capability/resource indexes; notices and tests. No new deliverable kind, gate, receipt, target resolver, policy digest, central CLI command or film workflow. `next`, `decide`, runtime-review identities and user acceptance remain unchanged. Existing unrelated edits are preserved.

## Why

The repository moved from `2233admin/design-pipeline` to `XartLab/design-pipeline`. GitHub redirects the old address, so nothing is broken yet, but the install commands, the plugin marketplace entry, the package metadata, `doctor`'s install link and the agent issue-tracker docs still name the old address. An agent that follows `AGENTS.md` opens issues against the old name; a session that has the old name attached cannot attach the new one (found 2026-11-12 while opening XartLab/design-pipeline#384).

## What Changes

- Install commands (`README.md`, `docs/install.md`), `.claude-plugin/marketplace.json`, the generated `plugin.json` metadata in `scripts/package.cjs`, the issue-form links, `doctor`'s install-doc link, the showcase link in `examples/enamel-badge/` and the agent docs (`AGENTS.md`, `docs/agents/issue-tracker.md`) name `XartLab/design-pipeline`.
- The `streamline-install` scenario names the new marketplace command.

Not changed, on purpose:

- Schema `$id` values (`https://github.com/2233admin/design-pipeline/schema/...`) are identifiers that are never fetched; changing them would change schema content that receipts and policy digests depend on.
- `sources.lock.json` `held.issue` links (never hand-edited; the redirect keeps them valid) and the archived changes, CHANGELOG version links and old proposals, which record history.
- The author name `2233admin` in the package metadata, which is a person.

## Capabilities

- `design-pipeline`: ADDED `Repository references name the current home`.

## Reuse

- Existing install docs, marketplace file and `scripts/package.cjs`; no new command, flag, gate or schema.

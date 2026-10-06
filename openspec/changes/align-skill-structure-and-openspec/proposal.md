## Why

The skill entry permits bounded tool use, while older reference text still claims to be the entry
and applies full workflow requirements universally. Method guides and upstream source trees share
one directory. OpenSpec has a current stable update, but project context remains in a legacy file
and 23 active changes fail the existing strict validator before the upgrade.

## What Changes

- Use OpenSpec 1.14.1 and its `config.yaml` context/rules; refresh local Codex guidance without
  publishing generated agent files or changing the user's global workflow profile.
- Normalize active change specs to upstream delta/scenario syntax, preserving their requirements.
- Keep `SKILL.md` as the task entry, make workflow scope explicit and remove duplicate stage prose.
- Collect the nine existing upstream source bundles under `skill/vendor/`; retain adapted drawing
  and diagnostic helpers under `skill/tools/` and update their real consumers.
- Clarify repository/package responsibilities and verify the installed package after migration.

## Capabilities

### Modified Capabilities

- `design-pipeline`: progressive guidance, source organization and contributor workflow.

## Impact

Touches documentation, OpenSpec configuration/active spec formatting, source paths, importers,
catalog consumers, resource declarations and their existing tests. Source snapshots move without
byte changes. Public commands and machine-schema paths remain stable. No new rendering engine,
acceptance gate, receipt schema, runtime resolver or automatic publication is introduced.

# Triage labels

## Categories

| Label | Use |
| --- | --- |
| `bug` | Existing behaviour is broken |
| `enhancement` | New capability or improvement |
| `documentation` | Documentation only |
| `chore` | Dependencies, build, CI, release or cleanup |

`documentation` and `chore` count as `enhancement` for the triage skill.

## Canonical roles

| Triage role | Tracker label | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate |
| `needs-info` | `needs-info` | Waiting for more information |
| `ready-for-agent` | `ready-for-agent` | Acceptance criteria complete; ready for an agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation or a decision |
| `wontfix` | `wontfix` | Rejected; applied when closing |

For open issues, use one category and one state role. These roles do not replace Multica task status. Use tracker-supported labels; if the primary tracker lacks that mechanism, record the role in the issue body or comment without inventing a second state machine. Do not create GitHub labels for Multica work.

`blocked` names an external blocker, `epic` marks a parent, and `duplicate` records closure in favour of another issue. On close, remove state roles; apply `wontfix` only to rejected requests. Existing tool-owned GitHub intake labels remain governed by the repository's issue forms.

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

For open GitHub issues, use one category label and one state-role label from the tables above. Do not invent a second state machine in issue bodies or comments.

`blocked` names an external blocker, `epic` marks a parent, and `duplicate` records closure in favour of another issue. On close, remove state roles; apply `wontfix` only to rejected requests. Existing tool-owned GitHub intake labels remain governed by the repository's issue forms.

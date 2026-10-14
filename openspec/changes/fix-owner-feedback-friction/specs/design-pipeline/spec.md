## ADDED Requirements

### Requirement: Owner feedback is taken as given

A recorded "no" (a correction, a rejection, a combine note or an anti-goal) SHALL need at least two words, each CJK character counting as one word. A stated decision (a skip line or a confirmed playback) SHALL keep needing six words, two CJK characters counting as one. A shorter record SHALL be refused and change nothing.

#### Scenario: Short Chinese feedback is a complete reason

- **WHEN** the owner rejects a playback with 首屏太暗了 or 太挤
- **THEN** the rejection SHALL be recorded as given and become a project rule

#### Scenario: A bare no is not a reason

- **WHEN** a rejection is recorded with "no" or "ok"
- **THEN** the command SHALL exit 1 and record nothing

#### Scenario: A go-ahead is still not a stated decision

- **WHEN** a skip is recorded with 直接开始吧
- **THEN** the command SHALL exit 1 and name the six-word minimum

### Requirement: A rejected page is repaired before it is shown again

After the owner rejects a web page at the final review, at every tier, the build stage SHALL stay open while `index.html` is the page that review judged. Its action SHALL quote the owner's reason. Once the page changes, probe SHALL run again before the owner is asked.

#### Scenario: Standard work after a rejection

- **WHEN** the owner rejects a standard web page and `index.html` has not changed
- **THEN** `next` SHALL return the build stage with the owner's reason

#### Scenario: The page is repaired

- **WHEN** `index.html` changes after the rejection
- **THEN** `next` SHALL return the probe stage

### Requirement: The diligence statement quotes the owner's no

The diligence statement SHALL list every project rule in the owner's words with where it came from, not only how many rules exist.

#### Scenario: A rejected draft became a rule

- **WHEN** the owner rejected a draft with "The header feels cramped on phones"
- **THEN** the statement SHALL list that sentence with its origin `draft 1`

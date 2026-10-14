# Proposal

## Why

A one-character typo in `brief.md` voids the description approval, and every accepted section is
reviewed again. The approval binds the brief's raw bytes, and each section verdict binds the
approval's id. A section kept by the owner therefore comes back to the owner for a change that
did not touch it. The final review, the probe and the delivery do not bind the brief, so all the
cost lands on section re-reviews. This is phase 2 of `design-owner-attention` (design C, change
tiers): re-review in proportion to what changed.

## What Changes

- **Section verdicts bind the section, not the whole brief.** A verdict stores the section's key:
  its id and one-line job from the `## Sections` list, the chosen direction (variant pick and
  combine notes) and the component decision. It stays accepted while that key is unchanged.
- **The description approval keeps binding the brief's bytes.** Any change still makes it stale,
  so the description is re-checked (an agent self-check by default). Evidence still binds bytes.
- **A re-approval after a change names its tier.** When an earlier approval exists and something
  changed, `decide --stage description --verdict accept` takes the new `--tier bytes|commitment`.
  - `bytes`: wording or formatting only; no section is reviewed again.
  - `commitment`: what the page commits to changed. `--affects <section ids>|all` names the
    sections to review again.
  - The pipeline checks the claim against what it can see, and refuses a `bytes` claim when it
    found a structural change:
    - a section whose job line changed, a section added, or a section removed;
    - a different variant pick, combine notes or component decision.
  - Sections whose key changed are reviewed again whatever the claim says.
- **A kept description is not re-asked for a typo.** When the owner kept the description, the
  agent may record a `bytes` re-approval itself if the pipeline finds no structural change. The
  diligence statement lists such records as agent decisions with their tier.
- **The stale description says what changed.** Each approval stores the inputs it was given
  (brief bytes, the section lines, playback, direction, components), so `next` names the changed
  inputs and the tier the pipeline found.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-workflow`: the description approval and section review requirements change. Section
  verdicts bind each section's key, re-approvals carry a change tier, and a byte-only change no
  longer reopens sections.

## Impact

- **Code:**
  - `skill/scripts/workflows/web.cjs`: the approval inputs, section keys, `sectionProgress`, the
    `--tier` and `--affects` checks, the stale `first` text, and `briefSections` keeping the
    job line.
  - `skill/scripts/workflow-core.cjs`: passing the options, and the `bytes` carry-forward on a
    kept description.
  - `skill/scripts/workflows/roles.cjs`: the statement line.
  - `skill/scripts/cli-core.cjs`: the `--tier` and `--affects` flags and their help.
- **Reused, not added:**
  - the description and section records in `decisions`;
  - the delegation map;
  - the existing staleness hook (`currentApproval`).
  - No new gate, schema or state file.
- **Not changed:** the probe, the final review and the delivery. They already bind page bytes and
  the component decision, not the brief.
- **Out of scope:** the page tier (element-level re-review of a changed page). It needs the
  per-element comparison of phase 3.
- **Migration:** section verdicts recorded before this change carry no section key. In-progress
  projects therefore review their sections once more, with no compatibility path, as the
  project's policy prefers.

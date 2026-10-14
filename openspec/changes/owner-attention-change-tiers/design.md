# Design

## Context

See proposal.md for the problem. Current code (checked against `skill/scripts/workflows/web.cjs`
and `shared.cjs`):

- **The description approval.**
  - `recordDescription` stores `{verdict, sha256: <brief bytes>, upstream, sections, at}`.
    `upstream` (`descriptionUpstream`) is one hash over the playback answer, the concept pick,
    the concept notes and `componentDecisionDigest`.
  - `approvalId` hashes `{brief, upstream, sections}`.
  - `currentApproval` reads only the last entry, and returns it only if it is an accept whose
    brief hash and `upstream` both match now.
- **Section verdicts** store `description: approval.id`. `sectionProgress` counts a verdict only
  when that id equals the current approval's, so any change to the brief bytes, the playback, the
  direction or the components reopens every section.
- **`briefSections`** returns ids only. The regex captures the id and ignores the rest of the
  line, so the one-line job is never read.
- **The stale `first` text** cannot say which input changed, because only the combined
  `upstream` hash is stored.
- **What does not bind the brief:** the probe gate (`index.html`, `interaction.json` and the
  loaded files), the final review (`reviewInputHashes` plus `componentDecisionDigest`) and the
  delivery (`deliveryInputHashes`). A brief change does not reopen them today, and this change
  keeps it that way.
- **A component decision change** also calls `invalidateCheckedEvidence`, which drops the probe
  pass and the delivery. This is unchanged.

## Goals / Non-Goals

**Goals:**
- A typo in the brief reopens no section; a playback reword is a commitment that can name none.
- A change reopens exactly the sections it touches, as the pipeline can see or as the agent
  declares.
- Evidence keeps binding bytes: the description approval still binds the brief's exact bytes.

**Non-Goals:**
- **The page tier** (re-review of the elements a page change touched). It needs the per-element
  comparison of phase 3. Until then a page change keeps today's behaviour: the probe and the
  final review re-run, and section verdicts are unaffected.
- **Telling a meaning change from a typo in prose.** The pipeline cannot; the agent declares the
  tier and the pipeline checks what it can.

## Decisions

### 1. A section verdict binds the section's key

The key is `sha256(canonicalJson({id, job, direction, components, epoch}))`.

- **job:** the rest of the section's item line after its id, with a leading `:`, `-`, `–`, `—`
  or whitespace stripped and whitespace collapsed. An id-only line has an empty job.
  Continuation lines are not part of it.
- **direction:** `{concept, conceptNotes}`. In replicate mode the concept is null, so this is
  constant.
- **components:** `componentDecisionDigest`.
- **epoch:** among the description accepts that carry `inputs`, the number of:
  - commitment re-approvals that named this section, or `all`;
  - accepts in which the section is present but was absent from the accept before.
  So a removed and re-added section is reviewed again.

`recordSection` stores `key` beside `description`. `sectionProgress` takes the latest verdict for
each section, whatever its key, and counts it only if it is an accept with the section's current
key. A key match never reaches past a later reject: a section rejected under one key and returned
to an older key stays rejected.

- **The playback is not in the key.** A playback change is structural (Decision 2), so it needs a
  commitment, and the agent names the sections it touches.
- **Position is not in the key.** A reorder keeps every verdict; the build follows the new order.
  A removed section's verdicts are simply not asked for. An added section has no verdict, so it is
  reviewed when built.
- **Alternatives:**
  - Keep binding the approval id. Rejected: that is the cascade this change removes.
  - Bind each verdict to the page bytes of its section. Rejected: that is the page tier (phase 3),
    and page bytes say nothing about a brief change.

### 2. Each approval stores its inputs

The approval record replaces `upstream` with
`inputs: {brief, sections: [{id, job}], playback, direction, components}`. The `brief` field is
the bytes hash; `playback`, `direction` and `components` are hashes.

- `approvalId` hashes `inputs`.
- `currentApproval` compares the last accept's `inputs` with the current ones.
- `diffInputs(previous, current)` lists what changed:
  - `brief` (bytes);
  - `sections` (ids added, removed or reordered);
  - `jobs` (the ids whose line changed);
  - `playback`, `direction` and `components`.
- **Structural** means any of sections, jobs, playback, direction or components changed. A
  change to the brief bytes alone is not structural. The playback is the confirmed creative intent,
  which stays with the owner, so its changes are never carried as wording only.
- **Alternative:** recompute the old values from history. Rejected: the bytes of an earlier brief
  are gone.

### 3. A re-approval of a changed description names its tier

`recordDescription` reads `--revision bytes|commitment` and `--affects`. The value of
`--affects` is comma-separated section ids, `all` or `none`, given once.
`--revision` and `--affects` on any other stage are refused.

- **First approval.** No earlier accept with `inputs` exists. `--revision` and `--affects` are
  refused.
- **Identical approval.** The inputs equal the last accept's. `--revision` and `--affects` are
  refused.
- **Changed approval.** The inputs differ:
  - `--revision` is required.
  - `bytes` is refused while the diff is structural, and the message names what changed.
  - `commitment` requires `--affects`. Every id must be in the new list, or the value is `all`
    or `none`.
  - `none` fits a change that reopens nothing beyond the sections whose key changed by itself: a
    reorder, a removal, an added section, or a playback reword that touches no section.
  - `--affects` without `commitment` is refused.
- The record stores `revision` and `affects`. The epoch of each named section, or of every section
  for `all`, is computed from the description history; nothing else is stored.
- **Alternatives:**
  - The pipeline classifies everything and the agent declares nothing. Rejected: prose changes
    can be typos or new goals, and only the agent knows which.
  - The agent declares and the pipeline trusts it. Rejected: the umbrella design requires
    checking the claim and escalating on disagreement. Refusing an under-claim is the escalation.

### 4. A kept description carries a byte-only change forward

`recordRole` refuses `--by agent` on an owner checkpoint. `decide` passes an exception for exactly
one case:

- the stage is `description`;
- the verdict is `accept`;
- `--revision bytes` is given;
- the latest description entry is an accept, with no owner reject after it.

`recordDescription` still refuses `bytes` on a structural diff, so the exception cannot carry a
commitment or a playback change. A rejected kept description goes back to the owner, revised.

- **Code:** `recordRole` takes an `allowAgent` option for this one case, and returns
  `{by: "agent", agent: assistedBy}`. `stampRecord` keeps `revision` on the role entry.
- **Statement:** the entry gets its own line under the agent's decisions, reading "carried forward
  a byte-only change to the owner's description". It does not use the "delegated by the owner"
  suffix, since the owner kept the checkpoint.
- **Alternative:** ask the owner again for every byte change. Rejected: the umbrella design (C)
  says a bytes change has no owner re-review.

### 5. The stale `first` text names what changed

A legacy accept without `inputs` cannot be diffed. Its `first` says that the earlier approval
predates change tiers and that this approval counts as a first one.

When the last accept is stale, the description step's `first` lists the changed inputs from
`diffInputs` and the tier they allow:

- "only wording changed: record with `--revision bytes`"; or
- "section proof's line changed, so this is a commitment for proof: record with
  `--revision commitment --affects proof` (add any other sections the change touches)".

### 6. Scope boundaries kept

- **Not touched:** the probe, the final review, the delivery and `invalidateCheckedEvidence`.
- **Component decision changes** keep dropping the probe pass. They also change every section's
  key, so every section is reviewed again, as today.

## Risks / Trade-offs

- **[The agent calls a meaning change in prose "bytes"]**
  - The pipeline catches every structural change.
  - For prose, the claim is the agent's. The statement lists each carry-forward with its tier, and
    the description approval still binds the new bytes for audit.
  - Phase 3's page review gives the owner the page itself.
- **[A typo in one section's job line reopens that section]**
  - Accepted: one section, not all.
  - Collapsing whitespace avoids formatting-only reopenings.
- **[Projects in progress review their sections once more]**
  - Their verdicts carry no `key`.
  - The project policy prefers removing old paths to keeping a compatibility layer.
- **[`all` reopens everything, like today]** Only when the agent declares it. The default for a
  structural change is the exact sections the diff names.

## Migration

- **Approval records:** gain `inputs`, `revision` and `affects`, and lose `upstream`.
- **Section verdicts:** gain `key`.
- **Older records:**
  - An accept without `inputs` never matches, so the description is re-approved once. It counts as
    a first approval, so no `--revision` is needed.
  - Verdicts without `key` never count, so each section is reviewed once more.
- **Rollback:** reverting the code restores the old binding. Records written meanwhile carry
  fields the old code ignores, but their `upstream` is missing, so the description is re-approved
  once after a rollback.

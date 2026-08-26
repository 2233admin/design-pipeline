# Proposal: Request Source Resolution Before Writing Artifacts

## Problem

The Static Reference Reconstruction Module opens at step 2 with "record the image as
`role: primary-target`". It assumes the image is already a file. Nothing in Stage 0 or in the module
tells the agent what to do when it is not, and nothing tells the agent to ask.

The result is a silent fork. An agent that notices the gap invents a workaround; an agent that does
not notice writes a fabricated hash. Neither path is specified, so neither is reviewable, and the
user is never told that one cheap action on their side would unlock every measured gate.

Observed in the `jst-hud-clock` run: the source was pasted into the conversation. The gap was found
only after `reference-evidence.schema.json` was read in detail, several artifacts into the run, and
the user learned about it in the final report rather than at the start when acting on it was cheap.

There is also a vocabulary failure. When the source is missing, what is actually unavailable is
*verification*. The user's *request* is still exact. The skill has no wording that separates the
two, so an agent under pressure to show progress will reach for a fidelity downgrade, which requires
user approval it does not have.

## Change

- Add an explicit source-resolution step at the head of the reconstruction module, before any
  artifact is written.
- Require the agent to ask the user for a file path when the reference is not resolvable, and to
  state what the path unlocks: rectification, camera solve, landmark error, and the diff receipt.
- When the user cannot or will not supply one, require recording `source.availability: pending`
  and continuing, rather than blocking the whole run.
- State the separation directly: a missing source downgrades the *verification claim*, never the
  *requested fidelity*. Only explicit user approval may downgrade requested fidelity.
- Require the final report to name the unlock action, so the user is told once, early, and again at
  the end.

## Non-goals

- Blocking all work until a file appears.
- Treating a user's refusal to supply a file as approval to downgrade fidelity.
- Any change to schema shape; this change is guidance and ordering only.

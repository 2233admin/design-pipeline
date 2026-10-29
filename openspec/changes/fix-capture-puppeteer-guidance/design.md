## Context

`film-capture-core.cjs` resolves `puppeteer-core` from the project path (or `--puppeteer-module`)
and fails with a fixed message. HyperFrames projects get it from their own install, so the message
was written for that case only. The direction instructions were written for a HyperFrames-backed
machine and never mention the flag.

## Decisions

1. Keep one resolver. Only the message and the instruction text change.
2. The message lists the two fixes in order: install in the project, or pass the flag. It no longer
   names `npm i hyperframes` unless the project has a HyperFrames marker.
3. `doctor` already prints the browser report; it adds one `puppeteer-core` line with the resolved
   path or `missing`. Instructions tell the agent to copy that path into `--puppeteer-module`.
4. No change to exit codes (`TOOL_MISSING` stays) or to receipts.

## Risks

- A path copied from `doctor` can go stale after a checkout moves. The instruction says to re-run
  `doctor` when a capture fails with `puppeteer-core not found`.

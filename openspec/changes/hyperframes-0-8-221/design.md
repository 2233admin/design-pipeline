## Decisions

1. One version constant (`HYPERFRAMES_VERSION`) is the source; evals and docs are checked against it by QA.
2. Upstream craft and audio findings are mapped, not copied: each upstream code becomes a pipeline finding with our
   `fix` text. An unknown future code in a craft-advice group is a warning with upstream's message; an unknown code in
   a broken-output group (audio, render, lint errors) is an error with upstream's message, so a broken render cannot pass.
3. `snapshot --review` is evidence for the owner's review, never an acceptance.
4. Seek, in one shared helper, keeping the layout probe's order and completion semantics: call `window.__player.seek`
   if present, else `window.__hf.seek`, else the timeline's own `seek(time, false)` on `t.__hfReal || t`; then await
   `window.__hfWaitForSeekCompletion()` when the runtime provides it, before sampling.
   `__hfReal` is the runtime's own contract: in 0.8.221 a registered timeline may be a proxy (`__hfIsProxy: true`) that
   queues `to`/`from`/`fromTo` calls and exposes the real GSAP timeline as `__hfReal`; the runtime itself resolves
   `t.__hfReal ?? t` (`dist/hyperframe.runtime.iife.js`). A test fixture registers such a proxy and asserts that the
   helper seeks the real timeline with `suppressEvents` false; without a proxy the supplied timeline is used.
5. Lineage: film evidence records the HyperFrames version that produced it; the version is part of the film gate's
   input hashes, so a version change makes earlier render evidence stale and `next` asks for a new check.

## Risks

- Re-baselining can hide a regression; each golden is re-accepted on frame pairs against its previous render, and
  any pair over the case's tolerance is reviewed by eye before the new baseline is committed.

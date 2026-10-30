## Decisions

1. One version constant (`HYPERFRAMES_VERSION`) is the source; evals and docs are checked against it by QA.
2. Upstream craft and audio findings are mapped, not copied: each upstream code becomes a pipeline finding with our
   `fix` text; unknown future codes are reported as warnings with upstream's message.
3. `snapshot --review` is evidence for the owner's review, never an acceptance.
4. Seek: `const tl = t.__hfReal || t; (window.__hf?.seek || tl.seek.bind(tl))(time)`, in one shared helper.

## Risks

- Re-baselining can hide a regression; each golden is re-accepted on frame pairs against its previous render, and
  any pair over the case's tolerance is reviewed by eye before the new baseline is committed.

## Decisions

1. Distillations are written in this repository's words with a source line naming repository, commit and licence;
   no upstream prose is copied into project-owned references.
2. The added anti-slop checks are implemented in our render capture (`capture-composition.cjs` elements and pixels),
   classed `hard` only where output is broken (column overflow, clipped containers) and `contextual` otherwise.
3. `worst-case-content.md` scenarios become optional named states in the component state matrix; projects choose which
   apply, and a chosen state needs a capture like any other state.
4. `html-demo` keeps its pure-function clock, which matches the seek contract used by films and frame pairs.

## Risks

- More references can dilute routing; each new file gets one row in the tool index and is linked from exactly the
  stage that uses it.

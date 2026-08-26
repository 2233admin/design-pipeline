# Proposal: Internalize CJK Typography and Direction Preview

## Problem

The pipeline selected design directions from prose and had no built-in CJK typography contract.
That allowed visually similar alternatives, direction decisions with no rendered comparison, full
CJK font downloads, weak line-height choices, and Latin-only QA for Chinese interfaces.

## Decision

Adapt only two MIT-licensed mechanisms from `joeseesun/qiaomu-design` at reviewed revision
`39dac8238a6ba44a4e39c1f0f6ca641224b01879`:

- a local CJK typography contract for system stacks, line height, punctuation, and bounded font
  subsetting;
- a resumable, hash-bound direction preview artifact and executable preview/selection gate.

Do not vendor the upstream skill, preview server, design-system library, visual theme, or fixed
four-direction workflow.

## Success Criteria

- Open whole-surface work cannot select a direction before comparable miniature mockups pass.
- Narrow or already-decided work records a deterministic waiver instead of fabricated options.
- CJK interfaces use a recorded system/project stack and verify real CJK content and fallbacks.
- Packaging and installed CLI tests include the new references and checker.

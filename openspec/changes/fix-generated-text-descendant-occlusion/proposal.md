# Proposal: Fix Generated Text Descendant Occlusion

## Problem

The `audit` probe checks host-descendant paint over generated text on its own fill only when the pseudo-element is absolutely positioned. A static, inline-block `::before` with white text on a dark fill can therefore retain a passing contrast ratio while a positioned, painted host child covers it. This contradicts the generated-text occlusion scenario in `fix-audit-coderabbit-limits`.

## Scope

- Include host-descendant paint in the existing overlapping-paint check for every generated `::before` or `::after` with its own resolved opaque fill, regardless of positioning.
- Keep in-flow generated text's host-box approximation conservative; do not reconstruct glyph or pseudo-element geometry.
- Extend the existing real-browser generated-text regression with a covered in-flow marker and unobscured, below-host and outside-host controls.
- Preserve ordinary-text handling, absolute pseudo-element placement, existing gates and finding schemas.
- Out of scope: vendor edits, new probe fields, new gates, new dependencies or Visual Acceptance changes.

## Reuse

Reuse `measureGenerated`, `overlappingPaint`, browser hit testing, `audit.text-contrast`, the existing `verify interaction` command and interaction v1 evidence contracts. No new policy or receipt schema is required.

## Affected Capabilities

`design-pipeline`: interaction verification audits rendered UI craft.

## Success Criteria

- The covered in-flow own-fill pseudo reports an `audit.text-contrast` error and `indeterminate` coverage instead of a ratio; the real CLI exits 2 and records no gate pass.
- The equivalent unobscured control remains measurable. Descendant paint shown below the host, or outside its conservative box, does not become an occlusion finding.
- Existing absolute own-fill occlusion and safe stacking controls retain their findings.
- Verification runs on the fixed integration tree; this proposal does not claim tests have run.

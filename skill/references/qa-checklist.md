# QA Checklist

Create or update `qa.md` for every design-pipeline change with this structure.

## Self-Check

- Command:
- Result:
- Missing required skills:
- Missing enhancement skills:
- Missing optional skills:
- Fallbacks used:

## Static Checks

- Lint:
- Typecheck:
- Tests:
- Build:

## Browser / Visual Checks

Record screenshots under `design/changes/<change-id>/qa/screenshots/` when possible.

- 375x812:
- 768x1024:
- 1440x900:
- 1920x1080:

Check:

- No overlapping text or controls.
- No clipped labels.
- Primary workflow is visible without explanation text.
- Empty, loading, error, disabled, hover, focus, and active states exist where relevant.
- Palette is not one-note.
- Typography fits the surface and density.

## Website-Cloning Fidelity Checks

Complete this section when live primary/reference targets are involved.

- Primary targets and captured final URLs:
- Reference targets and explicit mappings:
- BrowserPort adapter/capabilities:
- BuilderPort adapter/capabilities:
- EvidencePort adapter/capabilities:
- Rendering environment matched:
- Fonts/page readiness recorded:
- Text coverage:
- Asset coverage:
- Interaction coverage:
- Pixel-difference ratio by viewport:
- Maximum layout delta by viewport:
- Missing/extra sections:
- Approved dynamic masks and reasons:
- Repair loop iterations and evidence:
- Verdict: exact / adaptive / blocked / fidelity-limited

Never mark this gate exact when a required port is unresolved, comparison evidence is missing, or a builder guessed absent measurements.

## Contextual Anti-Slop Review

Complete this section when anti-template review is active.

- Evidence file:
- Command:
- Report:
- Status: pass / needs-review / blocked
- Hard blockers:
- Contextual warnings:
- Accepted contextual decisions:
- Preference information reviewed:
- `Anti-template Decisions` recorded in `design.md` or project `DESIGN.md`:
- Upstream rubric source/hash reviewed:

Hard rules cover content visibility, operable controls, legibility, responsive integrity,
reduced-motion behavior, and reference provenance. Named colors, fonts, punctuation, shapes,
effects, and common layout families are not hard failures.

## Motion Foundation Checks

- Project `MOTION.md` exists:
- `check-motion-foundation.cjs` status:
- Normalized foundation model matches `motion-foundation.schema.json`:
- Foundation schema:
- Foundation SHA-256:
- Foundation posture:
- Required headings use one language consistently:
- Primitive registry schema:
- Selected primitive IDs resolve:
- Missing or orphan primitive IDs:
- Change `motion.md` foundation hash matches:
- Runtime capability is supported / degraded / unsupported:
- Degradation is documented:
- Procedural equations are declarative:
- Procedural seeds and sampling are deterministic:
- Source provenance is measured / instrumented / inferred / authored:
- External adopted and rejected properties recorded:

## Website Clone Foundation Checks

- `check-website-clone-foundations.cjs` status:
- Project `DESIGN.md` ready:
- Project `MOTION.md` ready:
- All target palette foundations ready:
- `website-cloning.json` passed strict runtime contract validation:
- External code copied? expected `no`:
- Hypergryph or other benchmark treated as evidence only:

## Change Motion Checks

- `motion.md` required? yes/no:
- `motion.md` created? yes/no:
- Foundation link and hash recorded:
- Selected primitive IDs recorded:
- Scene, stage, camera, and layer ownership:
- Track and timeline IDs:
- State machine and interruption behavior:
- Procedural generators and parameter bounds:
- Runtime adapter bindings:
- Implementation matches `motion.md`:
- Library choice matches `motion.md`:
- `prefers-reduced-motion`:
- Fast repeated clicks:
- Route/page transition interruption:
- Scroll animation performance:
- Focus and hover motion:
- Animation purpose:
- Duration/easing:
- Timeline/stagger behavior:
- Cleanup on unmount:
- Evidence: screenshot / video / trace / manual notes:

## Accessibility Checks

- Keyboard tab order:
- Focus ring:
- ARIA labels / names:
- Contrast:
- Touch targets:
- Form errors:
- Screen reader announcements where relevant:

## Engineering Fit

- Uses existing components/tokens:
- Avoids unnecessary dependencies:
- Does not create parallel OpenSpec/GBrain source of truth:
- React/Next conventions checked when applicable:
- Animation library choice justified:

## Agent-Readable State

- `state.json` exists:
- `state.json.status`:
- `state.json.phase`:
- `state.json.nextActions` current:
- `events.jsonl` exists:
- Last event matches current phase:
- `handoff.md` exists:
- `handoff.md` agrees with `state.json`:
- Evidence paths in state/events exist:
- Another agent can resume from these files without conversation history:

## Scorecard

Use 0-5.

| Dimension | Score | Notes |
| --- | ---: | --- |
| Visual taste |  |  |
| UX clarity |  |  |
| Accessibility |  |  |
| Responsiveness |  |  |
| Motion quality |  |  |
| Engineering fit |  |  |
| Performance risk |  |  |

## Decision Audit

Log every auto-decision:

| Decision | Principle | Result | Risk |
| --- | --- | --- | --- |

## Final Verdict

- Pass / fail:
- Blocking issues:
- Non-blocking issues:
- Follow-up tasks:

## Open Source Readiness

Complete this section only when preparing to publish or update `design-pipeline` itself.

- Checked `references/open-source-readiness.md`:
- Release status: ready / ready-with-notes / not-ready
- Failed MUST gates:
- SHOULD gaps documented:

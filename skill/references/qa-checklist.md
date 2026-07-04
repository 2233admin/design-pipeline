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

## Motion Checks

- `motion.md` required? yes/no:
- `motion.md` created? yes/no:
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

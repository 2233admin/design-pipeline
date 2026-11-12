# Proposal: toast and notification judgment guide

## Why

"Should this be a toast or a notification?", "add an undo toast after archive", "upload progress
snackbar" and "未读角标和通知中心" are everyday requests about how a product tells a person that
something happened. The package had no place for the decision. Measured on 2026-11-12 with
`designer-pipeline route`:

```
route --query "should this be a toast or a notification"  -> product-design, score 0, confidence low
route --query "add an undo toast after archiving"          -> product-design, score 0, confidence low
route --query "撤销提示和未读角标"                          -> product-design, score 0, confidence low
route --query "给上传加进度提示"                            -> product-design, score 0, confidence low
```

What the package did have was scattered: `ui-craft-sources.md` UC-10 (toasts never take focus) and
UC-19 (a toast is never the only carrier of critical information or undo), one
`interface-defaults.md` line on `role="status"`, and a `toast-notification` capability in the
component catalog that answers "which library", not "which kind of message". Nothing told an agent
to read the product first, sort each message into status toast, action toast, progress toast,
notification or neither, and ask before changing code.

The owner supplied a prompt that does exactly that, attributed to kubai ("这个是 kubai 设计"), with
a second half that restyles toasts and notifications to concrete values. They asked for it to be
distilled into the package, both halves, with the numbers kept as kubai's default starting point
that lands on the project's own tokens, not as a mandate.

## What changes

- New guide `references/toast-notification.md`: read the product, what each message kind is
  for, seven questions that settle a case, the report table and the stop-and-ask step, the optional
  restyle (4A toast, 4B notification, 4C both) with kubai's values and motion, the build checks,
  and a table of where the package's existing rules override a kubai value.
- `references/job-registry.json` gains the scored job `toast-notification` (priority 44) with
  English and Chinese keywords. No dispatcher source change: the registry is the extension point.
- Routing rows in `SKILL.md`, `capability-routing.md` and `feature-routes.md`; `docs/features.md`
  entry; `package-resources.json` requires the guide; the guide joins the `ui-craft` ablation layer.
- Provenance: the guide's last section and a `THIRD_PARTY_NOTICES.md` entry name kubai as the
  source of the design and the owner as the supplier of the text.

## Reused, not added

- Routing: `route`, `job-registry.v1` and its schema, `job-route.v1`. The primary step is the
  kernel's `toolchain resolve`, so the route adds no step.
- Rules the guide defers to and links: `ui-craft-sources.md` (UC-03, UC-05, UC-06, UC-10, UC-14,
  UC-19, UC-22, UC-29, UC-39 and Precedence), `ui-transition-rules.md` (TR-05, TR-06, TR-08, TR-09,
  TR-10), `interface-defaults.md` (announce updates, ring first, swapped icons, flicks dismiss,
  waiting), `motion-spec.md`, `motion-vocabulary.md` (term ids), `mobile-web.md` (safe areas),
  `web-interface-guidelines.md`, `animation-opportunity-and-review.md`.
- Components: `design-system route --query "toast notification"` for a library; a toast or
  notification component the project already has wins.
- Record: results go to the review record in `qa.md`; decisions to `motion.md`.

## Boundaries

- No gate, receipt schema, finding code, CLI command or flag, and no change to
  `sources.lock.json`: the lock follows upstream git repositories and the kubai prompt has none.
- Not a global rule layer. Generic rule layers wait for the ablation result (#372); this is a
  reference with a judgment flow and a named source, and it sits in an ablation layer so it can be
  measured.
- `motion-vocabulary.json` is not edited: the guide names its term ids; linking terms to guide
  sections needs a regenerated catalog and can follow.
- Guidance and routing only. A routed job grants no visual acceptance; Component Conformance and
  Visual Acceptance stay separate.

## Capabilities

- `design-pipeline`: ADDED two requirements (toast and notification briefs route to their guide;
  the guide keeps the judgment flow, defers to the package's accessibility and motion rules, and
  names its source).

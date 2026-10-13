# Design: Fix Generated Text Descendant Occlusion

## Cause and Decision

`measureGenerated` previously set the resolved background's `generated` flag from `style.position === "absolute"`. `overlappingPaint` excludes the host's descendants when that flag is false, so non-absolute generated text on its own fill skipped potentially covering descendant paint entirely.

Set `generated: true` for every resolved own-fill generated-text background. This enables the existing descendant intersection and paint-order checks without changing the ordinary-text default. Keep the host as the background provider. Browser hit testing can ignore a painted descendant when it is demonstrably below the host; a descendant outside the measured boundary does not intersect at all.

## Geometry and Compatibility

No pseudo-element box is invented. Absolute pseudo-elements retain their existing resolved boxes. In-flow pseudo-elements retain the host-box approximation. A painted descendant intersecting that conservative boundary above the host makes the result indeterminate even when exact glyph overlap cannot be proved. The audit must not claim a passing ratio from unavailable geometry. A positioned descendant elsewhere inside a broad host can therefore cause conservative indeterminacy; proving its separation from in-flow pseudo glyphs is outside this change.

Existing rejection of transformed, offset, sticky or otherwise unplaced generated text remains intact. Existing handling of gradients, translucent fills, group effects and sibling pseudo paint also remains intact. Ordinary text continues to exclude its own descendants. No command, flag, schema, dependency, file path or evidence lineage changes; previously passing covered markers may now fail the interaction gate.

## Owned Files and Regression

- `skill/scripts/interaction-audit.cjs`: enable the existing generated paint path and correct its own-fill comment.
- `tests/interaction-audit.test.cjs`: extend the real `captureInteraction` / `evaluateProbeFile` generated-text fixture; no source-text checks, screenshots or mocked measurements.
- This change's proposal, design, tasks and spec delta. Integration owns the canonical spec and changelog; historical change records are untouched.

The static `display:inline-block` marker uses white text on `#18181b`; a positive-z painted positioned child covers its entire host and the marker. The controls are identical but have no child, a negative-z child beneath the host, or a child wholly outside the host box. These new hosts occupy the otherwise empty top padding, keeping hit testing inside the viewport without shifting existing absolute fixtures or overlapping their text boundaries.

## Minimal Real CLI Smoke

Create an ignored local project such as `.design-pipeline/descendant-occlusion-smoke` containing the following `index.html` and `interaction.json`. No workflow initialization or external resources are needed for this standalone audit.

```html
<!doctype html><html lang="en" style="background:#fff;color:#18181b;font:16px/1.5 sans-serif"><head><style>
#flow,#clear{position:relative;z-index:0;width:48px;height:24px}
#flow::before,#clear::before{content:"5";display:inline-block;padding:0 4px;background:#18181b;color:#fff}
#veil{position:absolute;inset:0;background:rgba(255,255,255,.8);z-index:1}
</style></head><body style="margin:0;padding:32px"><div id="flow"><span id="veil"></span></div><div id="clear"></div></body></html>
```

```json
{
  "schema": "design-pipeline.interaction-probe.v1",
  "id": "descendant-occlusion-smoke",
  "url": "index.html",
  "probes": [{
    "id": "page-audit",
    "kind": "audit",
    "viewports": [{"width":1280,"height":800},{"width":390,"height":844}],
    "thresholds": {"fonts":["sans-serif"]}
  }]
}
```

From the review worktree:

```text
node skill/scripts/designer-pipeline.cjs verify interaction --root .design-pipeline/descendant-occlusion-smoke --project-root . --probe interaction.json --json
```

Use the existing Chrome and Puppeteer resolvers, or append `--chrome <resolved-browser>` and `--puppeteer-module <resolved-module>` if needed. On pin `35f6141`, this page is expected to pass despite the cover. On the fixed tree, expect exit 2, `indeterminate` contrast coverage, and an error for `#flow::before` with `not measurable: #veil paints over or under the text` at both viewports; no contrast finding for `#clear::before`. Removing the covering `span` should produce exit 0. These are expected outcomes for parent verification, not executed results.

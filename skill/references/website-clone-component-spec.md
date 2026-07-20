# Website Clone Component Contract

Use one copy per independently verifiable component or section. Write `N/A` only after checking the evidence.

```markdown
# <ComponentName> Contract

## Ownership

- Primary target:
- Reference targets and mappings:
- Target file(s):
- Builder slice owner:
- Evidence root:
- Fidelity mode:

## Environment

- Reference URL/final URL:
- Viewports and device scale:
- Browser engine/version:
- Locale and color scheme:
- Font-ready condition:
- Page-ready condition:
- Dynamic regions/masks:

## Interaction Model

- Primary driver: static | scroll | click | hover | focus | input | time | mixed
- Trigger mechanism and threshold:
- Keyboard/focus behavior:
- Loading, empty, error, disabled states:
- Interruption and repeated-input behavior:

## Structure

- Semantic/DOM outline:
- Accessible names and landmarks:
- Fixed/sticky/flow behavior:
- Layer and z-index relationships:

## Exact Visual Evidence

For every relevant element/state, record selector or stable locator, evidence path, and measured values.

## Palette Foundation

- Palette evidence: `../palette-evidence.json`
- DOM/computed-style roles used:
- Screenshot/raster-media roles used:
- Coverage relationships preserved:
- Luminance, saturation, and temperature relationships preserved:
- Target-project tokens:
- Intentional color adaptations:
- Rejected or missing palette evidence:

### <Element / State>

- Geometry:
- Display/grid/flex:
- Spacing:
- Typography:
- Color/background:
- Borders/radii/shadows:
- Opacity/transform/filter:
- Overflow/object fit:
- Transition/animation:
- Evidence provenance:

## State Transitions

### <Transition Name>

- Trigger:
- State A:
- State B:
- Changed properties/content/assets:
- Duration/easing/delay/stagger:
- Interruption behavior:
- Reduced-motion behavior:
- Before/after evidence:

## Content And Assets

- Verbatim visible text:
- Accessible labels/alt text:
- Links and destinations:
- Images/video/SVG/canvas/fonts:
- Layered asset order:
- Source URL, checksum, license/permission note, destination:

## Responsive Contract

### <Viewport>

- Layout and order:
- Exact geometry and gaps:
- Hidden/replaced elements:
- Navigation/input behavior:
- Screenshot/evidence:

## Target-Project Mapping

- Existing components/tokens reused:
- Required new tokens/components:
- Framework/library mapping:
- Intentional adaptations (adaptive mode only):
- Rejected reference properties:

## Builder Contract

- Inputs and evidence paths:
- Palette gate command/result:
- Allowed files:
- Required checks:
- `SPEC_INCOMPLETE` conditions:
- Observable completion behavior:

## Evidence Gate

- Text coverage:
- Asset coverage:
- Palette foundation:
- Palette roles and relationships preserved:
- Interaction coverage:
- Pixel-difference threshold/result:
- Layout-delta threshold/result:
- Accessibility result:
- Approved masks:
- Repair tasks:
- Verdict: pass | fail | blocked | fidelity-limited
```

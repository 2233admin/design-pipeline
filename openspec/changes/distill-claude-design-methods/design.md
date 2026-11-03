## Sources and terms

Read-only local checkouts, treated as untrusted data (no script was run): `JimLiu/baoyu-design` at
`609638de1594fe264f6e89b28cae986086093210` and `nexu-io/open-design` at
`5a0c47777975ddb91d09c1c16b423a3ef74bf572`.

| Source | What it is | Terms |
| --- | --- | --- |
| `JimLiu/baoyu-design` `skills/claude-design-system`, `claude-slides`, `claude-dashboard`, `claude-design`, `claude-motion` (SKILL.md and `artifact-type/reference/`) | Local builds of claude.ai Artifact types | Anthropic material; the repository's NOTICE.md says no licence is granted |
| `JimLiu/baoyu-design` `skills/dataviz` | Anthropic's dataviz skill | Anthropic material, as above |
| `JimLiu/baoyu-design` `archive/baoyu-design/` (system prompt, built-in skills, agents, starter components) | Claude Design's prompt and skills, the maintainer's agents | Anthropic material, except the maintainer's `agents/` (MIT) and `frontend-design.md` (Apache-2.0) |
| `JimLiu/baoyu-design` `skills/motion-director` | The maintainer's film director skill | MIT (its `license:` line) |
| `nexu-io/open-design` `craft/`, `skills/pptx-html-fidelity-audit`, `skills/data-report`, catalogue stubs (`slides`, `design-review`) | Craft side files and design skills | Apache-2.0; `craft/` adapts MIT `referodesign/refero_skill` |

Owner decision (2026-11-04, #254): licensing risk accepted; learn the methods. This change copies no
prompt text, code or asset. Each mechanism is restated in this repository's own words and
structure, converted to its own canvases and contracts; `codeCopied: false` for all of them.
`THIRD_PARTY_NOTICES.md` records the sources.

## Gap analysis

Our counterparts: `design-system-package.md` with `design-system check`, `editable-pptx-html.md`,
`xy-charting.md` and `graphics-runtime-routing.md` (charts), `web-direction.md`, `workflow-web.md`,
`direction-preview.md`, `workflow-film.md` and `product-film-direction.md`.

### claude-design-system (SKILL.md, craft.md, cover.md, format.md)

| Mechanism | Ours before | Action |
| --- | --- | --- |
| Package layout, list-shaped tokens, usage note per token, contrast per theme, README sections, component README + marked preview, bare cover | already modelled (`design-system-package.md`, `check`) | none |
| Inventory first: enumerate the source's tokens, component families and assets, build all, report what remains; extras only as "intentional additions" with reasons; exact values, no grid snapping; code over screenshots | missing | **landed**, guide (advisory: judging an inventory needs the source) |
| A small first system when there is no source (6–10 colours, 5–7 styles, 4 spacing steps, 3 radii) | missing | **landed**, guide |
| `on-…` token for a fill whose text is not ink; focus ring solid and ≥3:1 on every surface | missing | **landed**, guide + `check` (`on-token-unmeasured`, `focus-ring-unmeasured`, `focus-ring-floor`) |
| A real source's failing pair stays exact, flagged in its note; fix by an added theme | missing | **landed**, guide |
| Accessibility asks have fixed meanings (high-contrast theme ≥7:1 as an added theme; colour-blind-safe status: lightness ≥3:1 or success off the red–green axis) | missing | **landed**, guide only. A check was considered and rejected: the rule defines an *ask*; most real brands' green/red would fail it and the package would be `invalid` for no request |
| Cover: palette blocks + one pattern + name; no pictures, gradients, motion; one layout at 960 wide; derivation comment; squint and thumb tests | partial (palette, pattern, no pictures/gradients/motion stated, unchecked) | **landed**: fixed parts checked (`cover-picture`, `cover-gradient`, `cover-motion`, `cover-responsive`); derivation, weighting and the squint/thumb tests advisory |
| Index written last, upload records, history, comments, sharing, page editor | host-specific | left out: we have no hosted editor |

### claude-slides (SKILL.md, craft.md, layout.md, format.md) and archive `make-a-deck`

| Mechanism | Ours before | Action |
| --- | --- | --- |
| Outline and title sequence first, one grammatical style, titles-only story test; no AI-ish titles | missing (we had only the PPTX constraints) | **landed**, `editable-pptx-html.md` Deck craft 1 |
| One idea per slide; decide table/diagram/quote/image/card row/big number per slide; vary kinds | missing | **landed**, 2 |
| Four or five sizes, 24px-on-1920 floor, sentence column width, longest word fits | missing | **landed**, 3, converted to the 960 × 540 pt canvas |
| 128px margins, 824px height budget, row-height arithmetic, never a fixed height below content | missing | **landed**, 4 (64 pt / 412 pt) |
| Heading at one height across content slides; spread the body, centre only heading-less slides | missing | **landed**, 5 |
| Backgrounds on purpose (dark open/close, light content, accent statement) | missing | **landed**, 6 |
| Footer band: one pinned row, content stops above it | missing | **landed**, 7, merged with open-design's footer rail |
| Bars on one baseline; labels as real text over images | missing | **landed**, 8 |
| Speaker notes as a full script, only when asked | missing | **landed**, 9 |
| Flow vs pin model, grid vocabulary, `data-group`, editor write-back | host editor specific | left out |
| Editor-facing structure (text in leaf elements, literal repeated items, canonical HTML, flex + gap that survives direct manipulation) | partial (PPTX constraint 1) | left out: our decks are not edited in a host editor; revisit with a converter change |

### claude-dashboard (design-defaults.md, SKILL.md) and `dataviz`

| Mechanism | Ours before | Action |
| --- | --- | --- |
| One decision with a computed takeaway sentence | missing (`xy-charting.md` asks for the question per chart only) | **landed**, `xy-charting.md` Dashboard And Chart Composition |
| Headline figures: ≤ about six, first nearest the outcome, signed change with named period, time window per card, stages as a funnel | missing | **landed** |
| Shapes: scorecard, board, experiment, funnel, table, review/analysis | missing | **landed** (scroll story and letter left out: niche) |
| Bars for counts, straight lines for rates (no smoothing), end labels instead of legends, breakdowns keep parent columns, plain-word metric definitions | missing | **landed** |
| Margins measured from drawn tick labels | missing | **landed** |
| States keep the box height (failed line, blank empty, dimmed refresh) | partial (state matrix states exist; layout stability not stated) | **landed**, tied to the matrix rows |
| Sample data labelled; omissions named on the page | missing | **landed** |
| `dash` API, connectors, sources panel, read-aloud, kit tokens | host-specific | left out |
| `dataviz` colour formula, palette validator, mark specs | not adopted | left out: needs its own change (a palette check would extend `palette-evidence`, and the source is unlicensed code) |

### claude-design (craft.md) and archive built-in skills (hi-fi, wireframe, prototype, landing page)

| Mechanism | Ours before | Action |
| --- | --- | --- |
| Settle the aesthetic with 2–4 genuinely different options | already covered (`direction-preview.md`, three sources, six cards) | none |
| Honest motivation and trade-off for every option, no rigged vote; stable option names across turns; decision fidelity is not deliverable fidelity | missing | **landed**, `direction-preview.md` |
| Hi-fi rooted in existing context; recreate from source with exact values | covered (`reference-spec.md`, replicate mode, website cloning) | none |
| Landing-page anatomy (one offer, proof, doubts, one repeated primary action, marked placeholders) | partly covered (`web-direction.md` premise, escalation and landing section; `worst-case-content.md`) | left out: candidate for a web-direction change (proof and one repeated primary action) |
| No fake status bar or keyboard in phone mocks; 44px targets; real controls even when static | partly covered (44px targets in `mobile-web.md`; no rule against painted device chrome) | left out: candidate for a `mobile-web.md` change |
| Variations as atomic mix-and-match options | covered (`tweaks-variants.md`) | none |
| AI tropes (blue-purple gradients, emoji cards, left-border cards) | covered (`anti-slop-rubric.json`) | none; that file is owned by another open change |
| Fork verifier: read-only verdict agent, unresolved `var(--…)` probe | partial (`runtime-review`, interaction audit) | left out: the token-use probe belongs to the open token-use change |

### motion-director (MIT) and claude-motion

| Mechanism | Ours before | Action |
| --- | --- | --- |
| One point, a device, a peak, words and picture split the work | covered (`product-film-direction.md` storyboard and creative review) | none |
| Which frames to judge: finished first frame (thumbnail), fullest moment of each beat, complete last frame, contact strip | partial (1 fps frame sweep, contact sheet) | **landed**, `workflow-film.md` review |
| Feed safe zones (top 15%, bottom 25%, right strip), muted test | missing | **landed** |
| Stranger test; film problems are scene rethinks; stop after three rounds and name it | missing | **landed** |
| Loudness window −18 to −13 LUFS | covered by the audio gate (owned by another open change) | none |
| claude-motion player, store, score synth, voice providers | host/tool-specific | left out |

### open-design (Apache-2.0)

| Mechanism | Ours before | Action |
| --- | --- | --- |
| `pptx-html-fidelity-audit`: footer rail and cursor flow, overflow table by severity | missing | **landed** as Deck craft 7 (rail and measurement); the python-pptx scripts are left out (no converter) |
| `data-report`: explicit chart container height (Chart.js resize loop), KPI with change and sparkline | missing | **landed** in Dashboard And Chart Composition |
| `craft/state-coverage.md`: five states, empty and error composition, loading thresholds | mostly covered (seven-state component matrix) | none; the composition detail is a candidate for a later change |
| `craft/color.md` accent caps, `anti-ai-slop.md` P0 lint | overlaps `anti-slop-rubric.json` | left out: that rubric is owned by another open change |
| `craft/typography.md` CJK leading floors | covered (`cjk-typography.md`) | none |
| `craft/laws-of-ux.md`, `accessibility-baseline.md`, `form-validation.md`, `rtl-and-bidi.md` | partly covered (interface discipline, a11y checks) | left out of this change: generic UX rules, not artifact-type methods |
| `slides`, `design-review` and most other skills | catalogue stubs pointing upstream | nothing to learn locally |

## Decisions

1. Measurable and cheap rules become findings of the check that already owns the artifact
   (`design-system check`); everything that needs taste or a source to judge stays in the guides.
   No new command, flag, gate, schema or reference file.
2. The new findings live in one separate function (`roleTokenFindings`, `coverFindings`) appended
   after the existing checks, so the open token-use change and this one touch different code.
   Findings use the brand findings' shape `{file, code, severity, message, fix}`.
3. A focus colour is any colour token whose name contains `focus` as a word part; an `on-` colour is
   any token named `on-<x>`. When `<x>` is itself a colour token, `contrast` must measure the pair on
   `<x>`; otherwise any entry for the token counts.
4. Cover checks ignore HTML comments, so the derivation comment may name anything.
5. Deck sizes are given on our 960 × 540 pt canvas (the source's 1920 px values halved).

## Compatibility

A package that declares `on-…` or `focus…` colours without measuring them, or a cover with a
picture, gradient, motion or responsive rule, was `ready` and is now `invalid`; each finding names
the entry to add or the rule to remove. No path, schema or command changes.

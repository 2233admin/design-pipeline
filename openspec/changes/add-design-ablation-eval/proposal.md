# Measure each design layer by ablation

## Why

The owner wants every layer of design-pipeline to prove that it improves output, or be cut or
redesigned (#260): the Taste suite, the design direction library, the anti-slop rubric, the UI craft
rules with the Impeccable contract, and the DESIGN.md foundation step. Today we have impressions,
not measurements. A creator's game-style cover skill also claims that hard if-else rule packs beat
adjective prompts, with no ablation behind the claim; our eval should be able to test claims like
that.

## What Changes

- New `evals/ablation/`, outside `skill/` so a model under test cannot read the answers. It follows the
  owner's pstack evals: fixed scenarios, variants run in turn, one plain request to an agent CLI
  (`claude`, `codex`, `omp`), deterministic scoring, `results.tsv`, decision rules written in the
  README before running.
- Scenarios: dark game-UI cover, light editorial cover, long-form explainer card (about 400 CJK
  characters), landing-page hero. Each has an original house style as a Google-format DESIGN.md with
  tokens, fixed content and an output contract (one self-contained HTML or SVG at a fixed size).
- Variants: `bare`, `adjectives`, `decision-tree` (prompt-only), `full` (this checkout installed as a
  skill) and `full-minus-<layer>`. A builder packages each variant tree from `skill/` with the layer's
  files removed and the Markdown and JSON routes to them pruned; the tree must still pass the package
  resource check.
- Scoring reuses the interaction audit, the composition gate, capture extraction, DESIGN.md token
  parsing and the PNG decoder: output contract, overflow and clipping, minimum font size, contrast,
  palette distance (CIEDE2000 within 5 of a token), type-scale adherence, the two anti-slop hard rules
  measurable on a still render, rhythm proxies, and sameness across runs. A blind pairwise judge from
  a different model family is optional and kept separate.
- `capture-composition.cjs` exports its in-page `extract` so the eval reuses it; its command-line
  behaviour is unchanged.

### Review round (2026-11-04)

An independent review found the per-layer conclusions would be unreliable. Changes:

- **Scoring.** A hierarchy floor (at least 3 type levels, title:body ≥ 2.5, or 2.0 for reading cards) now costs flat pages. Palette adherence uses the colours of text, borders and solid fills only, so gradients and glows are neutral. The ratio CV ignores the display size. Rhythm is 0 below 3 levels.
- **Power.** A variance pilot (`run.mjs --pilot`, `power.mjs`) sets the runs per cell. A layer is kept only when the measured delta (z test, Holm across the family) and the blind judge agree. The judge decides alone only with ≥ 48 pairs, also Holm-corrected. No detectable effect is UNDETERMINED, never a cut. A verdict needs ≥ 3 scenarios.
- **Removal.** Removal is now by enumerated reference, parenthetical or sentence, and layers declare pointer phrases. A test diffs every variant against `full`. The direction-library variant uses an empty manifest, so `doctor` stays ok.
- **Scenarios and variants.** Open scenarios have no preset DESIGN.md, and the ignoredone set (S1–S4) adds dual-crop safe zones and two-skin outputs. Two new rule packs, `principles` and `recipes`, test the owner's hypothesis. The research is in `docs/research/`.
- **Runs.** Per-run layer exposure and `next` detection; judge pair ids with dedupe; one failure rule (timeouts, errors and missing deliverables all score 0, and failure rates are reported); relative paths; a missing capture is an error; in-page anchors must resolve; sameness is structural and calibrated on fixtures.
- **Isolation.** Isolated roots outside /tmp, workdirs deleted after scoring, and cache state recorded.

## Capabilities

### Modified

- `design-pipeline`: adds the layer-ablation eval requirements.

## Impact

No packaged behaviour changes. Running the eval needs Chrome, `puppeteer-core` from `npm ci`, and an
authenticated agent CLI; the tests use a fake client.

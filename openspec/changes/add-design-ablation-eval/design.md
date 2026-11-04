# Design

## Decisions

- **Layers are removed as files, not prompt text.** `evals/ablation/layers.json` names each layer's
  files under `skill/`; `variants.mjs` builds trees from the tracked, packaged files (the same
  on-demand exclusions as `scripts/package.cjs`). Markdown blocks (paragraph, list item with its
  children, table row, whole section when its heading names the file) and JSON array items whose
  value is a removed path are pruned. A stale declaration, a removed script still required by kept
  code, or a failed package resource check stops the build. Scripts that kept code requires stay and
  are listed as `keptCode`.
- **Skill locations per client.** Claude Code: `.claude/skills/design-pipeline`; Codex and OMP:
  `.agents/skills/design-pipeline`. The runner refuses to start while a user-level install exists,
  because `bare` would read it.
- **One composite score, fixed before running.** 0.4 hygiene + 0.4 adherence + 0.2 rhythm; contract
  failure, timeouts, errors and missing deliverables score 0. Hygiene includes a hierarchy floor; adherence
  counts element colours (text, borders, solid fills), never pixels, so gradients and glows are neutral.
  Rhythm metrics are proxies; the blind judge, not the metrics, decides taste.
- **Decisions need power and agreement.** A variance pilot sets runs per cell for 80% power on 5 points
  (normal approximation, α split by Holm across the family). KEEP or CUT needs a significant measured delta
  and an agreeing judge (≥ 12 pairs), or the judge alone with ≥ 48 pairs after Holm. Everything else is
  UNDETERMINED. At least 3 scenarios must have data.
- **Removal is minimal and audited.** Enumerated reference, parenthetical or sentence first; whole list
  items or rows only when their lead sentence goes; sections only when their heading names the layer.
  Layers declare pointer phrases. Every variant is diffed against `full` in tests. The direction library
  is replaced by an empty manifest (stub) so the CLI degrades instead of breaking.
- **Sameness is a flag, not a reward.** A variant whose runs share a text layout (dilated mask Jaccard
  ≥ 0.8, calibrated on recolour/shift/different-layout fixtures) in at least two scenarios loses its
  measured wins; only the judge can still prefer it.
- **Presets can hide layers.** Open scenarios give no DESIGN.md; the ignoredone set adds dual-crop safe
  zones and two-skin outputs, and the `principles` and `recipes` packs test the owner's hypothesis.
- **The judge is separate.** It writes `judge.tsv`; names are hidden, sides randomised by seed, and a
  judge from the producing model's family needs an explicit flag.
- **No git in workdirs; isolated roots.** Results default to `~/agent-runs/ablation-<ts>`, workdirs to
  `~/agent-runs/work/` (a neutral name, since agents see their path), deleted after scoring. Paths in
  results are relative. The shared download cache state is recorded per invocation.
- **Rule pack is original.** The decision-tree pack follows the claimed style (length routing, fixed
  hex, text-width anchors, exact-pixel placement laws, pre-render QA) but is written for our house
  styles.

## File ownership

`evals/ablation/**` (eval), `tests/ablation-eval.test.cjs` and `tests/fixtures/ablation/**` (tests),
`docs/research/ignoredone-arknights-design.md` (research, provenance kept). `skill/scripts/capture-composition.cjs`
gains an export only.

## Known gaps

Recorded in `evals/ablation/README.md`: fonts vary by machine (score each scenario on one machine),
`next` instruction strings that still name removed files, the direction library's hard wiring into
`next`, and skill-use detection from transcripts.

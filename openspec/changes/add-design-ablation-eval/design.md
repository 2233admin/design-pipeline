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
  failure scores 0. Rhythm metrics are proxies; the blind judge, not the metrics, decides taste.
- **Sameness is a flag, not a reward.** A variant whose runs are near-identical (pixel ≥ 0.97 and text
  layout ≥ 0.9) in at least two scenarios loses its measured wins; only the judge can still prefer it.
- **The judge is separate.** It writes `judge.tsv`; names are hidden, sides randomised by seed, and a
  judge from the producing model's family needs an explicit flag.
- **No git in workdirs.** Scoring reads only the deliverable, so the workdir is a plain copy.
- **Rule pack is original.** The decision-tree pack follows the claimed style (length routing, fixed
  hex, text-width anchors, exact-pixel placement laws, pre-render QA) but is written for our house
  styles.

## File ownership

`evals/ablation/**` (eval), `tests/ablation-eval.test.cjs` and `tests/fixtures/ablation/**` (tests).
`skill/scripts/capture-composition.cjs` gains an export only.

## Known gaps

Recorded in `evals/ablation/README.md`: fonts vary by machine (score each scenario on one machine),
`next` instruction strings that still name removed files, the direction library's hard wiring into
`next`, and skill-use detection from transcripts.

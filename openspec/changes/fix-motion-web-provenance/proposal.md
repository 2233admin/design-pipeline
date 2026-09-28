# Fix motion-web provenance owner

修正 motion-web 参考的 `sourceMeta`/`provenance.source` owner 记录：固定 commit 的真实 GitHub 身份是
`feitangyuan/motion-web`，不是 `2233admin/motion-web`。`2233admin` 是该仓库的 fork/alias，不是本项目
研究并固定版本时引用的 canonical authored source。本变更只修正来源身份，不改变已固定的
revision、content hash、license 或 `codeCopied` 边界，也不复制上游代码/资产。

## Why now

`skill/references/motion-primitives.json` 中 `response.spring-settle` 与 `continuity.shared-anchor`
两条 primitive 的 `provenance.source` 仍写着 `https://github.com/2233admin/motion-web`，与
`skill/references/motion-first-capability.md`、`openspec/changes/extend-motion-first-capability/reference-boundary.md`
已经记录的 canonical `sourceMeta.url`（`https://github.com/feitangyuan/motion-web/tree/<revision>`）不一致。
`tests/animation-opportunity-reference.test.cjs` 仍断言旧 owner，掩盖了这个不一致。research report
(`_bmad-output/research/motion-web-approach-analysis.md`) 与
`openspec/changes/integrate-product-animation/qa.md` 中与来源身份相关的段落需要同步更正/去歧义。

## Explicit boundary

- 只改来源身份（owner）字段与相关文档/测试断言；不改 `reviewedRevision`、`reviewedContentHash`、
  `license`、`useBoundary`、`codeCopied`。
- 不改任何以 `/tree/<revision-sha>` 形式指向具体审计文件的引用链接（这些是 source citation，
  不是 owner root URL）。
- 不改 `experiments/openalice-product-animation/` 下任何 target runtime、index.html、verify.cjs、
  run.cjs 或已产出的 output。
- 不改 `openspec/changes/integrate-product-animation/` 的技术结论或历史证据数值（SHA、warnings、
  visibility 截图）；只在其 `qa.md` 补充历史/superseded 标注，不删除历史内容。
- 不把 `skill/references/motion-first-capability.md` 或
  `openspec/changes/extend-motion-first-capability/reference-boundary.md` 的既有正确内容改成别的
  值；只是把它们正式纳入本 change 的 spec delta 生命周期（它们此前是未挂任何 change 的孤立产物）。

## Evidence

`openspec validate fix-motion-web-provenance --strict`；`node --test tests/source-governance.test.cjs
tests/animation-opportunity-reference.test.cjs`；`node scripts/qa.cjs`。

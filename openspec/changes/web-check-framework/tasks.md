# Tasks

## 1. Change records

- [x] 1.1 proposal.md、design.md 与 `design-pipeline` spec delta。
- [x] 1.2 `npm exec -- openspec validate web-check-framework --strict` 与 `npm run specs:check`。

## 2. Behaviour (stacked on web-scaffold-preview)

- [x] 2.1 (模板：语料库与失败测试已写，实现后登记进 test-manifest) 先写失败测试与语料库 `tests/fixtures/web-check/`、`tests/web-check.test.cjs`。
- [ ] 2.2 `web-check-core.cjs`：登记表、`--list`、发现形状、缓存。
- [ ] 2.3 首批检查：`page-load`、`page-layout`、`manifest`、`architecture`；`react-doctor`、`vite-devtools` 仅披露。
- [ ] 2.4 `cli-core.cjs`：`web check`、帮助行、新 flag 登记。

## 3. Docs and registration

- [ ] 3.1 `workflow-web.md` 指向 `web check`；`scripts/test-manifest.json`、`package-resources.json`、CHANGELOG。
- [ ] 3.2 `npm test` 对基线的失败差异。

# Tasks

## 1. Change records

- [x] 1.1 proposal.md、design.md 与 `design-pipeline` spec delta。
- [x] 1.2 `npm exec -- openspec validate web-scaffold-preview --strict` 与 `npm run specs:check`。

## 2. Behaviour

- [x] 2.1 先写失败测试 `tests/web-project.test.cjs`（脚手架、覆盖语义、阻塞决策、预览）。
- [x] 2.2 `skill/scripts/web-project-core.cjs`：`scaffoldWeb`、`startPreview`。
- [x] 2.3 `cli-core.cjs`：`web` 命令项、帮助行、`--decision`/`--port` 登记。

## 3. Docs and registration

- [x] 3.1 `workflow-web.md#build` 指向 `web scaffold`/`web preview`。
- [x] 3.2 `scripts/test-manifest.json`、`skill/references/package-resources.json`、CHANGELOG。
- [ ] 3.3 `npm test` 对基线的失败差异、`npm run specs:check`。

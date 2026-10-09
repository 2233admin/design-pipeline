# 维护 Prompt Motion 模板库

模板库入口是 [库说明](../skill/references/prompt-motion/README.md)，供安装后的离线检索使用。
维护仓库保存来源索引和作者整理的配方；更新先产生候选差异，经过逐项复核才修改正式数据。
此阶段维护库，不生成品牌工程或增加渲染任务。

## 数据与责任

| 文件 | 维护内容 |
| --- | --- |
| `skill/references/prompt-motion/source-index.json` | 首页案例 ID、标题、作者、发布时间、类型、Prompt 是否公开、URL；首页 URL、复核日和 HTML SHA-256 |
| `skill/references/prompt-motion/templates.json` | 配方、可替换输入、结构、保留规则、来源、作者补充、使用限制及相关指南 |
| `scripts/refresh-prompt-motion-index.cjs` | 从本地 HTML 读取首页卡片，生成候选索引及 added/changed/removed 差异 |
| `skill/tools/prompt-motion/library.cjs` | 安装包内的离线只读检索和数据完整性检查 |

当前快照复核于 2026-10-09，包含 233 个唯一案例；12 条配方覆盖 7 类用途，关联 13 个来源。
数量是该次首页快照的结果，不表示完整站点永久只有这些案例。
原 HTML 与研究笔记放在已忽略的 `.design-pipeline/prompt-motion/`，不随包分发。
HTML 摘要用来识别采集内容；来源真实性由维护者核对域名及页面，它不是发布者签名。

## 更新来源索引

1. 在新日期或独立文件名下保存 [Prompt Motion 首页](https://www.prompt-motion.com/) 的 HTML。
   只获取页面文字，不下载链接的视频或音频。保留旧采集和研究记录。
2. 在仓库根目录运行，输出必须是尚不存在的候选文件：

   ```text
   npm run templates:discover -- --input .design-pipeline/prompt-motion/home-20261009.html --reviewed-at 2026-10-09 --output .design-pipeline/prompt-motion/candidate-20261009.json
   ```

   脚本只读取本地文件，不联网、不执行页面脚本，不覆盖正式索引、配方、输入或已有输出。
   无卡片、重复 ID、无效日期、异常字段、超过 4 MiB 的 HTML 或不认识的格式会拒绝。
3. 阅读候选的 `diff.added`、`diff.changed` 和 `diff.removed`；检查原页及作者、日期、公开状态。
   排序、复核日期和页面摘要变化本身不算案例内容变化。
   这份差异比较首页元数据，**不会检测 Prompt 正文或视频内容的变化**；正在使用的配方仍需
   单独复核其来源详情页。`promptShared: false` 提示重新检查配方依据。
4. 对确认的更新，普通编辑正式 `source-index.json`，采用候选的 `index` 对象，
   不把整个 `{index, diff}` 候选写进去。提交说明记录采集日、变化和处理决定。

解析器支持当前首页 Next.js Flight 的 JSON 传输格式；网站改变格式时先修复解析器和夹具，
再更新索引。不得以执行脚本、宽松正则猜卡片或忽略校验作为回退。

## 整理、合并与下架

- 新案例先保留为索引。阅读详情页，能说明用途、替换输入和保留规则后才整理为配方。
  标题和笼统风格要求不能证明镜头或运动；作者扩展须写在 `adaptation`，说明来自本库。
- 为配方选稳定且可读的 ID。填齐库说明中的字段，关联现存来源 ID 和包内真实指南；
  可选输入也要明确 `required: false`。不复制整段 Prompt 或无授权媒体、工程。
- 重复 Prompt 合并到同一配方的 `sources`，保留各作者和原页；有实质结构差异才另建配方。
  修改来源或规则时同步复核日期、限制和摘要，避免新增条目掩盖同一配方的变化。
- 来源移除时，先查看是否被配方引用。有引用则先复核原页，决定更换来源或退役配方，
  完成关联修改后再采用移除。期间保留上一份经过复核且可读的正式快照；Git 保存历史。
  CLI 拒绝悬空来源，不会默默删除配方或选择替代来源。
- 退役配方从当前 `templates` 移除，提交中记录原因；旧项目仍按其已绑定的输入和版本
  追溯。修改已采用的模板输入后，沿用既有 hash/receipt lineage 重算或失效下游证据。

每条当前配方的 `status` 是 `recipe`，`observation.basis` 是 `page-prompt`，
观看、听音和渲染标志都是 false。后续具体工程的验证走原有影片证据，不把库字段
改成新的验收门。Component Conformance 与 Visual Acceptance 分开报告。

## 验证和分发

```text
node --test tests/prompt-motion-index.test.cjs tests/prompt-motion-library.test.cjs
npm run specs:check
npm test
```

新测试登记在 `scripts/test-manifest.json`，新关键包文件登记在
`skill/references/package-resources.json`。配方检查涵盖来源关联、重复 ID、输入、观察限制、
指南路径、搬迁安装和只读 CLI；候选检查涵盖字段变化、拒绝异常输入和保护原文件。
冻结实现后跑仓库 QA、打包及隔离安装，再按既有安装流程更新 canonical skill。
维护脚本属于仓库工具；来源索引、配方、库说明和查询 helper 随 `skill/` 分发。

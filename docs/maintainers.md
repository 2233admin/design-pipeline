# 维护者指南

## OpenSpec 对齐

长期行为位于 `openspec/specs/`。进行中的更改位于 `openspec/changes/<change-id>/`：

```text
proposal.md      # 提案意图
design.md        # 技术/设计方法
motion.md        # 动效特定设计规范
tasks.md         # 实现清单
qa.md            # 验证证据
scene.json       # 机器场景合同
scene.md         # 可读投影
state.json       # CAS 保护状态
events.jsonl     # 仅追加历史
handoff.md       # 可读恢复说明
```

## 仓库布局

项目 [DESIGN.md](../DESIGN.md) 遵循 [Google DESIGN.md 格式](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md)；工程决策与验收记录归入 OpenSpec 变更。完整导航见[文档索引](README.md)。

```text
DESIGN.md              # 项目视觉语言
MOTION.md              # 项目动效语言
package.json           # 维护命令与 npm workspaces
package-lock.json      # 维护依赖的唯一锁文件
skill/
  SKILL.md
  references/          # 按需方法、工作流，以及保持兼容路径的 schema/目录数据
  scripts/             # 检查、初始化、评估脚本
  tools/               # 按需使用的绘图与诊断工具
  vendor/              # 带版本、许可和哈希的上游源码；不作为自动加载的指令
openspec/
  config.yaml          # OpenSpec 项目上下文与各产物规则
  specs/               # 长期行为规格
  changes/             # 进行中的更改
docs/                  # 指南、术语、研究；旧稿归入 archive/
scripts/               # 仓库 QA、安装与打包
tests/                 # 程序与合同回归；不代表审美验收
evals/                 # 比较实际作品的评测与案例
.design-pipeline/      # 本机生成证据与临时输出，不入库
```

### 仓库维护工具链

根目录 `package.json` 和 `package-lock.json` 是 Node.js 22.12+ 的 private npm workspace，统一管理
OpenSpec、`evals/cases` 与 `tools/browser-automation` 的维护依赖，不随 skill 打包，也不会给使用 skill
的目标项目加依赖。从仓库根目录统一安装和验证：

```bash
npm ci
npm run browser:install
npm test
npm run deps:check
npm run capabilities:check
npm run sources:check
npm run specs:check
npm run package:skill
```

`npm test` 包装仓库 QA 与浏览器工具 self-test。QA 从忽略的 `.env.local` 读取 `BLENDER_PATH`
（外部环境变量优先），并把共享浏览器解析器找到的 Chrome 传给隔离 QA；本机路径只写在该
文件，例如 `BLENDER_PATH=<path-to-blender.exe>`，不要提交真实机器路径。`browser:install` 准备
Playwright Chromium 与 HyperFrames browser。

`capabilities:check` 审核已有 source-evidence，没有证据会保留 `UNKNOWN`，不会联网刷新能力。
上游来源跟随最新：`sources.lock.json` 记录每个上游的 revision（npm 运行时为最新发布）；
`npm run sources:update` 拉取上游 HEAD、用导入脚本重新导入并重算哈希、派生引用和锁文件，升级 PR
的测试全绿即是审核。`sources:check` 离线校验快照与哈希，`-- --upstream` 列出落后的来源。不要手改
vendored 字节或哈希；需要重新设计的来源在锁文件里标 `held` 并附后续 issue。运行时固定版本
（GSAP、HyperFrames、Playwright）也是锁文件里 `npm` 类条目；
pixelmatch 已升级到 8.0.0，新比较报告记录版本、OKLab/HyAB 算法与实际选项；旧数值与新算法之间
需重新校准，旧黄金 HTML 和视频不因工具链刷新而重写或重新审批。命令清单以根
`package.json` 为准；OpenSpec CLI 也由 workspace 固定，通过 `npm exec -- openspec ...` 调用。
完整维护流程见 [贡献指南](../.github/CONTRIBUTING.md)。

## 反馈和贡献

记录管线或 companion 发现（`<skill-root>` 是已安装 skill 的目录）：

```bash
node "<skill-root>/scripts/record-feedback.cjs" \
  --kind capability-gap \
  --source runtime \
  --skill animejs \
  --title "Anime.js companion lacks adapter guidance" \
  --summary "The requested Three.js target is supported upstream but missing."
```

重复发现共享确定性观察并递增计数。敏感信息在写入前脱敏。

## 最小可行运行

即使没有安装可选 companion skill：

```bash
node skill/scripts/check-deps.cjs
```

命令应返回 `OK`。缺失可选 skill 报告 `WARN` 并带回退。

## 发布标准

发布前对照验证：

- `CHANGELOG.md`
- `skill/references/open-source-readiness.md`
- `skill/references/qa-checklist.md`
- `openspec/specs/design-pipeline/spec.md`

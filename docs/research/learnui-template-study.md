# LearnUI Dictionary 模板研究

研究日期：2026-07-20

研究对象：[LearnUI Dictionary](https://learnui.qiaomu.ai/#dictionary)

源码：[joeseesun/learnui](https://github.com/joeseesun/learnui)

固定版本：[`d4337f25224c9d0002b855d9aaa157e589dccc48`](https://github.com/joeseesun/learnui/tree/d4337f25224c9d0002b855d9aaa157e589dccc48)

## 结论

LearnUI 最值得设计管线吸收的不是它的页面视觉，而是它的知识模板：

> 一个 UI 术语被组织为：稳定 ID、平台、名称、别名、模糊搜索词、用途描述、结构拆解、实现 API 映射、生成提示、调试提示、关联模式和可运行标本。

design-pipeline 目前可以把 LearnUI 当作 `reference-site` 或 `template-evidence` 使用，也可以按页面和组件契约复刻授权界面；但尚未把 UI 模式作为类型化、可检索、可审计的一等资产。因此，“通用流程可处理”不等于“字典级原生支持”。

建议吸收 LearnUI 的目录架构和信息组织方式，使用 clean-room 内容与本项目现有证据契约重新实现。不要把 LearnUI 作为运行时依赖，也不要在主页面直接执行来源不受控的 demo 片段。

## 研究方法与验证范围

- 检查线上 Dictionary 页面及公开源码。
- 固定在 commit `d4337f25224c9d0002b855d9aaa157e589dccc48`，避免结论随主分支漂移。
- 解析 `data/entries.json`、`data/styles.json` 和 `demos/*.html`。
- 阅读静态构建器、站点脚本、测验脚本、PWA 配置和设计约束。
- 在本地分别使用 Python 3.10 与 3.12 运行构建器。
- 对照 design-pipeline 的 synthesis、website cloning、source evidence、provider 设计与 motion primitive 注册表。

## 1. 它实际上是什么

LearnUI 是一个纯静态、数据驱动的 UI 术语词典。当前固定版本包含：

- 62 个 UI 模式：31 个 Web、31 个 macOS。
- 44 个视觉风格条目。
- 106 个 HTML 标本片段：62 个 UI 标本、44 个风格标本。
- 首页检索与平台筛选。
- 每个条目的详情页、相关模式、复制提示和结构化数据。
- 正反向测验、双语模式、PWA 离线支持。

源码的公开说明见 [README](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/README.md)；数据入口见 [`entries.json`](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/data/entries.json) 与 [`styles.json`](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/data/styles.json)。

它不是“组件库”。它同时覆盖：

- 控件模式，例如 combobox、tabs、toast。
- 布局和呈现模式，例如 masonry、lightbox、sticky/fixed。
- 状态与反馈模式，例如 skeleton/spinner、progress indicator。
- 动效词汇，例如 spring、marquee、text scramble。
- macOS 原生控件与窗口模式。
- 视觉风格分类。

这解释了为什么简单地问“我们支持了多少组件”并不准确：其中相当一部分条目不是可安装组件，而是设计、交互或实现概念。

## 2. 核心数据模板

### 2.1 UI 模式条目

`entries.json` 的每个条目包含：

- `slug`
- `platform`
- `name`
- `tagline`
- `aka`
- `fuzzy`
- `api`
- `prompt`
- `debugPrompt`
- `description`
- `parts`
- `related`
- `demo`

在当前版本中，62 个条目合计有：

- 188 个结构部件描述。
- 258 个实现 API 映射。
- 220 条相关模式边。

API 映射横跨 AppKit、SwiftUI、ARIA、CSS、HTML、shadcn/ui、Radix、React、Motion、GSAP 等实现表面。它把“概念是什么”和“在某个技术栈里叫什么”分开，这是可迁移性最强的设计。

### 2.2 视觉风格条目

`styles.json` 的每个风格包含：

- `slug`
- `name`
- `order`
- `tagline`
- `scope`
- `aliases`
- `confusedWith`
- `signals`
- `code`
- `brief`
- `accessibility`
- `origin`
- `seeAlso`

44 个风格条目合计有 332 个视觉信号，并把信号区分为 defining、supporting、variable、avoid；同时按 surface、depth、imagery、geometry、color、typography、layout、motion 分面。

这个模型比“给风格起一个名字”更有用，因为它允许验证：

- 哪些视觉信号必须出现。
- 哪些只起辅助作用。
- 哪些可变化。
- 哪些元素会破坏该风格。
- 它容易与什么风格混淆。

## 3. 页面模板与交互链

LearnUI 的详情页并非手写 62 次，而是由 [`build.py`](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/build.py) 生成。主要链路是：

1. 读取 JSON 数据和翻译数据。
2. 生成首页卡片与紧凑搜索索引。
3. 为每个条目生成统一详情页。
4. 注入对应的 HTML specimen。
5. 生成 related links、复制块和 JSON-LD。
6. 生成测验使用的独立 specimen 页面。
7. 复制资源并生成 sitemap、RSS、service worker 等静态文件。

详情页的稳定结构是：

1. 术语、平台和一句话解释。
2. 别名与常见模糊说法。
3. 结构拆解。
4. 可交互 specimen。
5. 生成提示。
6. 调试提示。
7. 实现/API 对照。
8. 相关模式。

这套结构可以直接转化为 design-pipeline 的知识资产模板，但字段内容应该由我们独立编写或来自许可清晰的来源。

### 搜索

[`assets/site.js`](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/assets/site.js) 对名称、中文名、别名、模糊词、符号与 tagline 做加权匹配，并支持：

- `/` 或 `Cmd/Ctrl+K` 聚焦搜索。
- URL query 深链接。
- 平台筛选。
- 随机条目。
- 语言模式与本地持久化。

搜索体验的重点不是复杂算法，而是数据提前维护了 aliases 和 fuzzy terms。数据质量比搜索实现更重要。

### 测验

[`assets/quiz.js`](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/assets/quiz.js) 使用 localStorage 记录学习状态，支持“看名字识别界面”和“看界面说名字”两个方向。连续答对后才标记掌握。

这说明 catalog 不只可用于检索，也能成为设计评审、命名训练和 agent 自检的数据源。

## 4. Specimen 的实现与安全边界

106 个 `demos/*.html` 都是片段而不是完整应用。当前统计：

- 全部包含内联 `<style>`。
- 100/106 包含 `<script>`。
- 多数脚本通过 `document.currentScript.parentElement` 找到局部根节点，再从根节点查询元素。
- 大多数样例提供 reduced-motion 分支。

这种约定降低了选择器互相污染，但不是安全沙箱。详情页构建时，片段被直接注入页面 DOM，脚本拥有主文档权限；如果将来接入第三方 catalog，这个做法不能沿用。

design-pipeline 若支持 live specimen，至少需要：

- 外部内容默认作为 inert evidence，不直接执行。
- 可运行标本放入独立 iframe。
- 使用最小化 `sandbox` 权限。
- 默认 CSP 禁止网络、弹窗、顶层导航和存储访问。
- 静态截图或录屏作为安全降级。
- 对允许执行的本地标本记录来源、hash、审计状态与依赖。

LearnUI 自有 demo 的直接注入可以由其项目自己承担信任边界；它不能成为通用 provider 的默认安全模型。

## 5. 构建与维护性发现

README 将构建描述为“Python 标准库、无依赖”，这在依赖包层面成立，但没有声明最低 Python 版本。

本地验证：

- Python 3.10.20：`build.py` 在第 323 行因 f-string 表达式中的反斜杠触发 `SyntaxError`。
- Python 3.12：构建成功，输出 `Built 152 pages into site/`。
- 构建后的 `site/` 中有 259 个 HTML 文件；README 写“258 个静态页面”，可能是 404 页是否计入造成的口径差异。

因此不建议直接复用其构建器。若需要导入数据，使用独立 adapter 读取固定版本 JSON，输出本项目自己的规范化资产。

## 6. 版权与许可边界

仓库代码、重新实现的 specimen、视觉风格内容和翻译以 MIT 发布，见 [LICENSE](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/LICENSE)。

但 README 明确说明英文内容复制自 namethatui.com，版权仍属于原作者。由此得出：

- 可以研究其 schema、构建架构和公开代码。
- 复用 MIT 代码时必须保留许可与归属。
- 不应批量复制英文 description、prompt、debugPrompt 等内容进入本项目。
- 最稳妥的实现是 clean-room 编写自己的模式定义，仅保留通用事实、标准名称和官方 API 映射。
- 每个外部来源都应记录 source URL、固定 revision、license state、content hash 和采用/拒绝决策。

## 7. design-pipeline 当前能力映射

| 能力 | 当前状态 | 证据/说明 |
| --- | --- | --- |
| 将 LearnUI 当参考站点 | 已支持 | `reference-site` synthesis 与 website cloning |
| 将既有模板作为设计证据 | 已支持 | `template-evidence` / `hybrid` |
| 页面与组件交互拆解 | 已支持 | component spec 包含 click、hover、focus、input、time 等驱动及状态 |
| 来源 revision/hash 记录 | 部分支持 | `source-evidence.schema.json` 已有 revision、version、contentHash、markers |
| hosted catalog 作为可选 provider | 已规划 | README、OpenSpec 与 provider 文档已有方向 |
| UI pattern 类型化注册表 | 未支持 | 没有 pattern schema 或 registry |
| 62 个命名模式的一等支持 | 未支持 | 当前为通用处理能力，没有逐条覆盖声明 |
| aliases / fuzzy terms | 未支持 | 没有 UI 术语搜索索引 |
| anatomy / API mapping | 未支持 | 没有概念到 ARIA/CSS/React/SwiftUI/AppKit 的统一映射 |
| related-pattern 图谱 | 未支持 | 没有关系边模型 |
| pattern 覆盖率状态 | 未支持 | 无 native/generic/companion/unsupported/out-of-scope 状态 |
| specimen 安全执行契约 | 未支持 | 现有 clone 契约不等于第三方代码沙箱 |
| license/source URL/provider item 状态 | schema 不完整 | provider 文档要求的字段尚未完全进入 `source-evidence.schema.json` |
| 视觉风格信号模型 | 未支持 | 现有 DESIGN.md 有视觉章节，但无 defining/supporting/avoid 信号分类 |
| macOS 原生模式 | 不在默认 Web 范围 | 应作为独立可选 profile，而不是混入 Web 默认目录 |

相关本地文件：

- `skill/references/design-synthesis.md`
- `skill/references/design-synthesis.schema.json`
- `skill/references/website-cloning.md`
- `skill/references/website-clone-component-spec.md`
- `skill/references/source-evidence.schema.json`
- `skill/references/motion-primitives.json`
- `docs/cli-and-reference-providers.md`
- `openspec/specs/design-pipeline/spec.md`

## 8. 推荐目标架构

### 8.1 独立的 UI Pattern Catalog

建议新增一个 clean-room schema，最小字段包括：

```text
id
platform
category
name
aliases
searchTerms
intent
anatomy[]
states[]
interactions[]
accessibility[]
implementationMappings[]
acceptanceChecks[]
debugChecks[]
related[]
specimen
evidence[]
provenance
licenseState
supportStatus
```

`supportStatus` 建议区分：

- `native`：本项目有明确契约、模板或生成器。
- `generic-workflow`：现有流程能实现，但没有专用知识资产。
- `companion`：依赖已登记 companion skill/capability。
- `unsupported`：当前不能可靠生成或验证。
- `out-of-scope`：平台或能力边界之外。

### 8.2 Provider 只提供证据，不覆盖项目基础

LearnUI 或其他目录应作为可选 provider：

```text
provider fetch
  -> 固定 revision / hash / license
  -> 解析为 inert source items
  -> normalize 到内部 catalog schema
  -> 人工或规则审计
  -> synthesis 选择性采用
  -> QA 验证
```

provider 不应：

- 覆盖项目 DESIGN.md 基础。
- 在离线时阻止 requirements-only 工作流。
- 把来源 prompt 当作 agent 指令执行。
- 把 demo 脚本直接注入生产或预览页面。

### 8.3 Web 与 macOS 分开

第一阶段只覆盖 Web 模式。macOS 条目依赖 AppKit/SwiftUI、窗口系统和平台交互约定，应放在独立 `platformProfile: macos` 中，只有目标项目明确为 macOS 时才参与检索和 synthesis。

### 8.4 视觉风格采用“信号”而非复制内容

可吸收 defining/supporting/variable/avoid 和 facet 的思路，建立自己的视觉方向模型，并与 DESIGN.md 的颜色、字体、布局、组件、motion 和 do/don't 章节连接。

这会比维护一批风格截图更可验证，也能减少“只写一个风格名字、生成结果却不一致”的问题。

## 9. 建议分期

### P0：契约与安全

1. 补齐 source evidence：provider、item ID、source URL、category、license state、local/unavailable、hash。
2. 定义 `ui-pattern-catalog` schema 与 support status。
3. 明确外部文本为 inert evidence。
4. 定义 specimen sandbox 和静态降级契约。

### P1：Web clean-room catalog

1. 先覆盖高频 Web 模式，而不是机械追求 31/31。
2. 为每个条目维护 aliases、anatomy、states、a11y、implementation mappings 和 acceptance checks。
3. 建立 related-pattern 图谱和覆盖率报告。
4. 接入 synthesis 与 clone component spec。

### P2：检索与评审工具

1. 本地 catalog 搜索、平台/类别筛选。
2. pattern detail Markdown 或静态页面。
3. specimen 截图/沙箱预览。
4. source audit 与 coverage audit。

### P3：风格与平台扩展

1. 引入自有视觉风格信号模型。
2. 扩充 spring、scramble、marquee 等常见 UI motion primitives。
3. 视产品范围增加 macOS profile。

## 10. 最终判断

我们应该研究并借鉴 LearnUI，但目标不应是“把这个网站搬进来”。正确目标是：

- 将 UI 模式知识变成设计管线可消费、可检索、可验证的结构化资产。
- 用 provider 记录外部证据，用 clean-room catalog 承载内部长期能力。
- 将 live specimen 与知识内容解耦，并建立明确安全边界。
- 用 coverage status 诚实区分“能泛化实现”和“已经原生支持”。

按这个方向推进，LearnUI 会成为一个很好的参考样本，而不会变成新的内容、许可或运行时风险。

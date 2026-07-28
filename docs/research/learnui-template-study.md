# LearnUI Dictionary 模板研究

研究日期：2026-07-20

修订日期：2026-07-28

研究对象：[LearnUI Dictionary](https://learnui.qiaomu.ai/#dictionary)

源码：[joeseesun/learnui](https://github.com/joeseesun/learnui)

固定版本：[`d4337f25224c9d0002b855d9aaa157e589dccc48`](https://github.com/joeseesun/learnui/tree/d4337f25224c9d0002b855d9aaa157e589dccc48)

## 结论

LearnUI 最值得作为参考的不是它的页面视觉，而是它的知识模板：

> 一个 UI 术语被组织为：稳定 ID、平台、名称、别名、模糊搜索词、用途描述、结构拆解、实现 API 映射、生成提示、调试提示、关联模式和可运行标本。

design-pipeline 已经可以把 LearnUI 当作 reference-site 或 template-evidence 使用，也可以按页面和组件契约复刻授权界面。LearnUI 不需要成为 pipeline 的原生能力；是否存在类型化 UI 字典，不是当前 pipeline 的核心质量指标。

当前建议是只把 LearnUI 保留为可选、带来源的参考资料。除非未来出现反复且可量化的检索需求，否则不建设专用 catalog、provider、搜索页或 specimen 平台。

## 研究方法与验证范围

- 检查线上 Dictionary 页面及公开源码。
- 固定在 commit `d4337f25224c9d0002b855d9aaa157e589dccc48`，避免结论随主分支漂移。
- 解析 `data/entries.json`、`data/styles.json` 和 `demos/*.html`。
- 阅读静态构建器、站点脚本、测验脚本、PWA 配置和设计约束。
- 使用 Python 3.13 运行构建器。
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

README 将构建描述为 Python 标准库、无依赖，这在依赖包层面成立，但没有声明最低 Python 版本。

本地验证统一使用 Python 3.13：

- build.py 构建成功，输出 Built 152 pages into site/。
- 构建后的 site/ 中有 259 个 HTML 文件；README 写258 个静态页面，可能是 404 页是否计入造成的口径差异。

LearnUI 目前仅作为参考，design-pipeline 无需复用其构建器或增加数据 adapter。

## 6. 版权与许可边界

仓库代码、重新实现的 specimen、视觉风格内容和翻译以 MIT 发布，见 [LICENSE](https://github.com/joeseesun/learnui/blob/d4337f25224c9d0002b855d9aaa157e589dccc48/LICENSE)。

但 README 明确说明英文内容复制自 namethatui.com，版权仍属于原作者。由此得出：

- 可以研究其 schema、构建架构和公开代码。
- 复用 MIT 代码时必须保留许可与归属。
- 不应批量复制英文 description、prompt、debugPrompt 等内容进入本项目。
- 最稳妥的实现是 clean-room 编写自己的模式定义，仅保留通用事实、标准名称和官方 API 映射。
- 每个外部来源都应记录 source URL、固定 revision、license state、content hash 和采用/拒绝决策。

## 7. design-pipeline 当前能力对照

| 能力 | 当前状态 | 证据/说明 |
| --- | --- | --- |
| 将 LearnUI 当参考站点 | 已支持 | `reference-site` synthesis 与 website cloning |
| 将既有模板作为设计证据 | 已支持 | `template-evidence` / `hybrid` |
| 页面与组件交互拆解 | 已支持 | component spec 包含 click、hover、focus、input、time 等驱动及状态 |
| 来源 revision/hash 记录 | 部分支持 | `source-evidence.schema.json` 已有 revision、version、contentHash、markers |
| hosted catalog 作为可选 provider | 已规划 | README、OpenSpec 与 provider 文档已有方向 |
| UI pattern 类型化注册表 | 未提供，也非当前必需 | Pipeline 目标不是维护 UI 百科 |
| 62 个命名模式的一等支持 | 不适用 | LearnUI 是参考来源，不是支持矩阵 |
| aliases / fuzzy terms | 来源侧提供 | 需要时直接查阅，不在本地重复维护 |
| anatomy / API mapping | 来源侧提供 | 需要时直接查阅，不在本地重复维护 |
| related-pattern 图谱 | 来源侧提供 | 需要时直接查阅，不在本地重复维护 |
| pattern 覆盖率状态 | 不适用 | 参考资料不需要原生覆盖率 |
| specimen 安全执行契约 | 当前不需要 | 只查看参考，不导入或执行第三方 demo |
| license/source URL/provider item 状态 | schema 不完整 | provider 文档要求的字段尚未完全进入 `source-evidence.schema.json` |
| 视觉风格信号模型 | 可选参考 | 不是当前 pipeline 的建设要求 |
| macOS 原生模式 | 不适用 | 属于来源站点内容，不是 Web pipeline 缺口 |

相关本地文件：

- `skill/references/design-synthesis.md`
- `skill/references/design-synthesis.schema.json`
- `skill/references/website-cloning.md`
- `skill/references/website-clone-component-spec.md`
- `skill/references/source-evidence.schema.json`
- `skill/references/motion-primitives.json`
- `docs/cli-and-reference-providers.md`
- `openspec/specs/design-pipeline/spec.md`


说明：表中的 未支持只表示 pipeline 没有重复提供 LearnUI 的字典功能，不代表产品缺口或建设要求。参考资料不需要原生覆盖率。

## 8. 是否需要建设专用能力

当前不需要。

现有 reference-site、template-evidence 和通用浏览能力已经覆盖实际使用方式。专用 catalog 会引入重复内容、同步、许可和维护成本，却没有已知的高频需求证明这些成本值得承担。

只有在后续出现以下证据时才重新评估：

- 多个项目反复需要同一组 UI 术语与实现映射。
- 直接查阅来源明显拖慢 synthesis 或 QA。
- 来源不稳定，导致关键参考无法复现。
- 需要离线、批量或自动化分析这些条目。

在此之前，最小方案就是保存来源链接，需要时查阅。

## 9. 最终判断

LearnUI 是有价值的参考样本，但不是 design-pipeline 的功能缺口，也不是当前 roadmap 项目。

- 不建设原生 catalog。
- 不维护 62 项覆盖率。
- 不导入或执行其 demo。
- 不复制其英文内容。
- 需要时作为有来源的参考证据使用。

这已经符合 pipeline 对可选 reference catalog 的既有边界。

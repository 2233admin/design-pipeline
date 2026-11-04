# 设计流水线逐层消融

design-pipeline 的每一层（Taste 套件、设计方向库、反模板细则、UI 工艺规则与 Impeccable 契约、DESIGN.md 基础步骤）都得拿出证据，证明它让成品变好了，否则就砍掉或重做（#260）。这里不靠印象，而是照 pstack 的实测做法来：固定的场景，一次只拿掉一层，每格跑好几次，判定规则在跑之前写好。

另外两个对照只改提示、不装技能，回答“规则包到底比形容词强不强、比我们的流水线强不强”这个问题。起因是一位创作者的游戏风封面技能，它声称硬性的 if-else 决策树（按字数分版式、固定色值、装饰锚定在实测文字宽度上、精确到像素的摆放定律、出图前自检）比形容词提示好。那个说法没有做过消融。这里的规则包是照那种写法、为我们自己的场景从头写的，没有照抄原文。

runner 改自 pstack-omp 的 `evals/run.mjs` 和 `evals/lib.mjs`：变体交替跑，每次一行 `results.tsv`，追加时列必须对得上，超时不打分，提示词从标准输入传，超时连子进程一起杀，工作目录名只用场景名。

## 场景

每个场景给一份需求（`brief.md`）、一份声明好的风格（`DESIGN.md`，Google DESIGN.md 格式，前置元数据里有色值和字号阶梯，能通过 `foundation check`）、一份固定长度的文字（`content.md`），以及一份交付约定：一个自包含的 HTML 或 SVG 文件，固定尺寸。

| 场景 | 风格 | 文字 | 交付 |
| --- | --- | --- | --- |
| `cover-dark` | 铸台控制台：深色工业游戏界面风 | 短文字，6 行 | `cover.html` 或 `cover.svg`，1080×1440，字号 ≥ 20px |
| `cover-light` | 纸页：浅色报刊编辑风 | 短文字，5 行 | `cover.html` 或 `cover.svg`，1080×1440，字号 ≥ 22px |
| `explainer-light` | 纸页 | 长文约 400 字（385 个汉字） | `card.html` 或 `card.svg`，1080×1920，字号 ≥ 22px |
| `hero-dark` | 铸台控制台 | 官网首屏，导航、标题、说明、两个按钮 | `hero.html`，1440×900 一屏，字号 ≥ 16px，链接要真能点 |

两套风格都是为这个实测原创的，不用任何第三方素材。`styles/` 里放风格，`scenarios/<场景>/repo/` 会复制给代理，`case.json` 和 `prompt.md` 不会。提示词就是一句普通的请求（“帮我做一张……要求在 brief.md……”），不透露在测什么。

## 变体

| 变体 | 给代理的东西 |
| --- | --- |
| `bare` | 不装技能，只有两条共用的项目规则 |
| `adjectives` | 同 `bare`，多一句风格形容词（`rules/adjectives.json`，例如“高级感的工业风游戏界面质感”） |
| `decision-tree` | 同 `bare`，多一份 if-else 规则包（`rules/decision-tree.<风格>.md`）：先数字数，按 ≤40、≤180、>180 分版式（>180 时正文区占 75%，装饰缩到角上），只用固定色值，装饰按实测标题宽度算，五条精确到像素的摆放定律，出图前 8 项自检。铸台的那份是主版本，纸页的那份是同一写法的移植 |
| `full` | 装上这个检出的 design-pipeline，内容和发布包一致（不含按需下载的 MengTo、iart 原文） |
| `full-minus-<层>` | 装上去掉一层的 design-pipeline |

共用的两条项目规则（写进工作目录的 `AGENTS.md`，`CLAUDE.md` 指向它）：没人会回答问题，需要拍板时自己定，在回复里说一句；只交付 brief.md 写的那一个文件。

### 减层怎么做

减层不靠提示词，而是由 `variants.mjs` 从 `skill/` 打出一份少了这一层的技能目录，再装进工作目录。Claude Code 装在 `.claude/skills/design-pipeline`，Codex 和 OMP 装在 `.agents/skills/design-pipeline`。层的定义在 `layers.json`：

| 层 | 删掉的文件 | 因为别处还在用而留下的代码 |
| --- | --- | --- |
| `taste-skill` | `references/taste-skill.md`、`vendor/taste-skill/` | 无 |
| `design-direction-library` | `references/design-direction-library.md`、`vendor/design-direction-library/` | `design-direction-library-core.cjs`、`directions-core.cjs` |
| `anti-slop-rubric` | `anti-slop-rubric.json` 和它的 schema、`anti-slop-review.md` 和它的 schema、`anti-slop-evidence.schema.json`、`scripts/evaluate-anti-slop.cjs` | 无 |
| `ui-craft` | `ui-craft-sources.md`、`impeccable-contract.md`、`impeccable-product-design.md`/`.json`，以及它们指向的六个上游包（emil-design-eng、make-interfaces-feel-better、fixing-accessibility、12-principles-of-animation、shadcn、playwright-cli） | `interaction-audit.cjs`（`verify interaction` 的页面审计，这里的打分也用它） |
| `design-md-foundation` | `references/design-synthesis.md`、`scripts/check-design-foundation.cjs`、`scripts/advance-design-synthesis.cjs` | `design-synthesis-core.cjs`、`init-design-synthesis.cjs`（`foundation check` 和 replicate 流程要用） |

打法如下：

- 只删声明的文件。声明里有一条一个文件都对不上，就直接报错，免得过时的声明悄悄什么也没删。
- 其余 Markdown（上游原文 `*/upstream/**` 除外）里，提到被删路径的块一起删掉。块按段落、列表项（连同子项）、表格行、整节（标题提到时）算；一节删空了，标题也删。文件只会少行，不会改行。
- JSON 里以被删路径为值的数组项删掉，例如 `package-resources.json` 的 `required`、组件来源目录里的条目。
- 留下来的脚本还在 `require` 被删的文件时，直接报错，免得这个变体的命令行一跑就崩。
- 打出来的目录要过发布包的资源检查（和 `scripts/qa.cjs` 同一组规则）。
- 每个变体的报告写在 `<结果目录>/variants/<变体>.report.json`，不放在技能目录里，代理看不到。报告列出删了哪些文件、删了哪些块（每块的第一行），以及脚本和 JSON 说明文字里仍提到被删路径的地方。

单独打变体目录、看看删了什么：

```sh
node evals/ablation/variants.mjs --out /tmp/variants
```

## 怎么打分

打分不调模型，同一台机器上同一份文件每次结果一样。交付物先复制进 `captures/<标签>/page/`，在固定尺寸下用无头 Chrome 打开，等 2.5 秒让入场动画走完。SVG 会内联进一个只有它的 HTML 页面里量。浏览器、页面审计、构图门禁、文字提取都复用 `skill/scripts`：`interaction-audit.cjs`、`composition-core.cjs`、`capture-composition.cjs` 的 `extract`、`design-system-package-core.cjs` 的 `frontMatterGroups`、`png-core.cjs`。

**交付约定**（不满足时综合分记 0，其余分项照记）：要求的文件恰好一个；不引用任何外部资源或其他文件（`src`、`href`、`url()`、`@import` 只能是 `data:`、`blob:` 或页内锚点）；渲染时不发出任何请求；SVG 的 `width`/`height` 等于声明尺寸，或者 `viewBox` 比例一致。

**量出来的分项**（每次一行，写进 `results.tsv`）：

- 卫生
  - 文字覆盖 `contentCoverage`：content.md 的每一句有没有原样出现在可见文字里。
  - 溢出 `overflow`：页面审计的横向溢出、出画、裁切，加上构图门禁的文字出画，再加上页面比画面大，按处数累加。
  - 字太小 `belowMinFont`：渲染后的字号小于风格的下限（SVG 按缩放折算）。
  - 对比度不够 `contrastFails`：页面审计按 WCAG 2 算。
  - 构图门禁错误 `compositionErrors`：空画面、整体对比度太低。构图的提示类结果只记在 `compositionCodes` 里。
  - 反模板硬规则 `antiSlopHard`：反模板细则里这里能量的两条。一条是减弱动态、动画停在第一帧时看不见的文字（`hiddenWithoutMotion`，对应“内容不依赖入场动画”），另一条是首屏里的假控件（`fakeControls`：没有 href 或 href 是 `#` 的链接，或者鼠标是手型却不是控件的元素）。
- 贴合
  - 色值距离 `palettePixels`：截图里与 DESIGN.md 某个色值的 CIEDE2000 ≤ 5 的像素比例。
  - `paletteElements`：文字颜色、填充、描边落在色值上的比例。
  - 字阶 `typeScale`：文字的渲染字号落在 DESIGN.md 字号阶梯上（±0.5px）的比例。
  - `declaredFonts`：CSS 首选字体是声明字体的比例，只作对照，不进综合分，因为各台机器装的字体不同。
- 节律（代理量，见下）
  - `gapOnStep`、`distinctGaps`：纵向相邻文字块之间的空隙落在间距单位（DESIGN.md 的 `spacing.unit`，8px）整数倍 ±1px 上的比例，以及有几种不同的空隙。
  - `ratioCv`：相邻两级字号之比的变异系数，越小越像一套等比字阶。少于 3 级时不算。
  - `leftEdges`：文字块有几条不同的左边线（±1px 算一条），越少网格越强。
  - `decorations`、`decorationKinds`、`decorationRepeat`：装饰元素（没有自己文字、有填充或描边的元素和 SVG 图形）的个数、种类数，以及按尺寸加颜色属于重复组的比例。0 是全都不一样，1 是全都成组重复，种类数为 1 是全都一样。这一项只报告，不进综合分。
- 跨次相似度：同一变体、同一场景各次之间，截图缩略灰度图的像素相似度和文字布局掩码的 Jaccard 相似度，由 `report.mjs` 从各次的 `fingerprint.json` 算。

**综合分**（跑之前定好，`suite.mjs` 的 `composite`）：

```text
卫生 = 100 − 40×缺字比例 − 15×min(溢出,3) − 10×min(字太小,3) − 5×min(对比度不够,4)
           − 10×min(构图错误,2) − 10×min(反模板硬规则,3)，最低 0
贴合 = 100 × (0.6×色值内像素 + 0.2×色值内元素 + 0.2×字阶内)
节律 = 100 × 平均(间距落在单位上的比例, 1 − 字号比变异系数/0.5, 1 − (左边线数 − 1)/8)，只取能算的几项
综合 = 0.4×卫生 + 0.4×贴合 + 0.2×节律；不合交付约定为 0
```

节律几项都是代理量：它们量的是几何上有没有章法（空隙是不是同一把尺子量的，字阶是不是等比，左边线多不多，装饰是重复还是各不相同），不是好不好看。节律占综合分的 0.2，只是为了让“规则包会不会把间距卡在 8 的倍数上”这类说法能被量到。口味的结论由盲评定，不由这些数定。规则包本身就写着“间距只能是 8 的倍数”“左对齐到 64px”，在节律上天然占便宜，下结论时要把这一点写进去。

### 盲评（可选，和量出来的分数分开）

`judge.mjs` 从结果目录取同一场景、同一次的两张截图，复制成 `A.png`、`B.png` 放进一个只有它们的临时目录。路径和提示词里都没有变体名，左右按 `--seed` 随机。两张图交给另一家的模型，按下面的评分细则二选一。出图用 Claude 时，评审用 Codex，反过来也一样；同一家要显式加 `--allow-same-family`，并写进结论。评审结果只写 `judge.tsv`，不改 `results.tsv`。

评分细则（`judge.mjs` 的 `judgePrompt`，跑之前定好）：逐条比较风格贴合、文字（完整、清楚、层级、截断、出画、字太小）、节奏（留白、对齐、间距、装饰有变化而不杂乱、为内容服务）、专门设计（是不是换了字的通用模板）四项，综合给出 A、B 或 tie，最后一行只输出 `{"winner":"A"|"B"|"tie","reason":"一句话"}`。

默认对局：`full` 对其余每个变体；再加 `decision-tree` 对 `adjectives`、`adjectives` 对 `bare`、`decision-tree` 对 `bare`。

## 已知盲区

- 量出来的数只看画面上能量的东西，看不出构思好不好、是不是为内容专门设计，这些只能靠盲评，或者主人自己看 `captures/`。
- 字体：两套风格的字体多半没装，各台机器回退到的字体不同，溢出和字宽也会跟着变。比较都在同一个场景里做，所以一个场景的所有次要在同一台机器上量。要分机器跑，就按场景分。
- CSS `transform: scale()` 放大的文字，字号按 CSS 值算；SVG 的缩放已经折算。
- `palettePixels` 会被抗锯齿的文字边缘拉低一点。它只用于比较变体，不用于和 1 比。
- 反模板细则里只有两条硬规则能在一张静态成品上量出来；“组件真的能用”“响应式”“参考来源”这几条在这里量不到。
- 减层只删文件和路由。`next` 等命令自己吐出的说明文字里提到被删文件的地方还在，变体报告的 `residual` 照实列出（目前在 `cli-core.cjs`、`directions-core.cjs`、`workflows/directions.cjs`、`workflows/replicate.cjs`、`companion-capabilities.json`）。
- 设计方向库直接接在 `next` 的方向步骤上（风格轮盘从库里抽）。去掉它以后 `doctor` 报安装不完整（退出码 2），标准档的 ui、web 流程到方向步骤会被挡住。所以这一行量的是“没有这一步”，不只是“少了一份参考资料”。
- 运行前 `next` 可能要下载设计方向库的图片（`sources fetch --bundle design-direction-library`）。没下载时 `full` 和各减层变体在这一步一样受影响，跑之前先下载好。
- “用没用技能”从运行记录判断。Claude Code 用 `stream-json` 输出，只看工具调用（调 Skill、读技能目录里的文件、跑技能的命令行），不看开头列出的可用技能清单；Codex、OMP 只有文字输出，按文字里有没有 `design-pipeline` 判断，可能漏判或误判。
- 装了 pstack 等其他技能的客户端，`bare` 也不是一张白纸。要量净效果，就在只装了这里要测的东西的客户端上跑，或者把这一点写进结论。

## 判定规则（跑之前定好，`report.mjs` 的 `RULES`）

一格是“一个变体 × 一个场景”。下面的数都是综合分中位数，每格至少 3 次打了分才算。

**前提**

- 装了技能的变体，至少 80% 的运行要看得出用了技能。做不到时，这个变体的结论无效，先解决技能没触发的问题，不据此砍任何东西。
- `full` 对 `bare`：如果完整流水线没有胜过不装技能，逐层结论只作参考，先查流水线整体。

**一层（`full` 对 `full-minus-<层>`）**

- **保留**：满足下面任一条。
  - 量值：各场景差值（`full` 减去减层）的中位数 ≥ 5 分，并且至少 3/4 的场景差值为正。
  - 盲评：分出胜负的对局至少 12 局（4 个场景 × 3 次），`full` 赢 ≥ 60%。
- **砍掉**（去掉反而更好）：差值中位数 ≤ −5 且至少 3/4 的场景为负，或者盲评 `full` 赢 ≤ 40%（至少 12 局）。
- **矛盾**：量值和盲评方向相反时，每格补到 5 次、盲评补到 24 局再判。
- **噪声太大**：都不满足，并且相关各格里最大的四分位距大于差值绝对值的 2 倍时，每格补到 5 次再判。
- **看不出作用**：其余情况。标记砍掉或重做：要么删掉这层的文件和路由，要么重写它，再跑一遍。

**套模板**：同一变体在至少 2 个场景里，各次之间的像素相似度 ≥ 0.97 并且文字布局相似度 ≥ 0.9，判为套模板（同一个模子印出来）。套模板的变体，量值上的优势一律不算，只有盲评能让它胜出。原因是，规则包把每个数都钉死以后，节律和贴合分自然高，但那不是口味。

**提示写法**（`decision-tree` 对 `adjectives`，`adjectives` 对 `bare`，`decision-tree` 对 `bare`，`full` 对 `decision-tree`，`full` 对 `adjectives`）：用同样的门槛判前者胜、后者胜、分不出、补跑。结论分开写：

- 规则包胜过形容词，并且没被判为套模板：说明硬规则确实比形容词有用；再看它能不能胜过 `full`。
- 规则包只在量值上胜、盲评没胜，或者被判为套模板：说明它只是把可量的数卡住了，不能据此说它的成品更好。
- 形容词对 `bare` 分不出：形容词提示没用。

## 怎么跑

```sh
npm ci
node evals/ablation/run.mjs --client claude --runs 3 --out <结果目录>
node evals/ablation/judge.mjs --out <结果目录> --judge codex
node evals/ablation/report.mjs <结果目录>
```

- `--client` 可选 `claude`、`codex`、`omp`。`--variants`、`--scenarios` 可以只跑一部分，`--timeout` 是每次的秒数（默认 1800），`--keep-skill` 打完分后保留工作目录里装的技能（默认删掉省空间）。
- 用户级目录装着 design-pipeline 时（`~/.agents/skills`、`~/.claude/skills`、`~/.codex/skills`、`~/.claude/plugins/cache`、`~/.omp/agent/managed-skills`），runner 拒绝跑：`bare` 和减层变体也会读到完整技能，那就不是消融了。先停用插件或挪走；确定客户端读不到它时，可以加 `--allow-global-skill`。
- 每次的回复在 `<结果目录>/<客户端>-<变体>-<场景>-<次>.txt`，截图和全部量值在 `captures/<同名>/`，工作目录路径在 `results.tsv` 的 `workdir` 列。
- 分几次跑时，追加到同一个结果目录，列不一致会拒绝。要在几台机器上分着跑，就按场景分（`--scenarios`），一个场景的所有变体在同一台机器上跑完。
- 先试一轮小的，确认技能会触发：`--runs 1 --variants bare,full,decision-tree --scenarios cover-dark`，看 `skillUsed` 列和回复记录。

自测（不调模型）在 `tests/ablation-eval.test.cjs`。它用假代理写三份现成的封面（好的、字溢出的、色值不对的），确认打分分得开；还检查减层目录只删了声明的东西、`results.tsv` 的列钉住了、盲评的提示词里没有变体名。

## 成本

全量一轮是 9 个变体 × 4 个场景 × 3 次 = 108 次代理运行。下面是估计（按单次交付物的大小和技能文档的长度推算，还没有实测；第一轮跑完后用 `seconds` 列和客户端的用量记录替换掉）：

| 部分 | 次数 | 每次 | 合计 |
| --- | --- | --- | --- |
| `bare`、`adjectives`、`decision-tree` | 36 | 3 到 8 分钟，约 2 万到 6 万 token | 2 到 5 小时，约 150 万 token |
| `full` 和 5 个减层 | 72 | 10 到 30 分钟，约 20 万到 60 万 token（读技能文档、跑 `next` 和检查，大部分是可缓存的输入） | 12 到 36 小时，约 1500 万到 4000 万 token |
| 打分 | 108 | 约 6 秒 | 约 11 分钟，不用模型 |
| 盲评（默认对局） | 11 组 × 4 × 3 = 132 | 两张图加约 3000 字的提示，30 到 60 秒 | 1 到 2 小时，约 100 万 token |

全量单线程大约要一到两天，主要花在装了技能的那 72 次上。在订阅制的客户端上，这些是额度和时间；按 API 计费时，用上面的 token 数乘当时的单价。先用上面那轮小的试跑（3 次、约 1 小时）确认技能会触发，再跑全量。

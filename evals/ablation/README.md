# 设计流水线逐层消融

design-pipeline 的每一层（Taste 套件、设计方向库、反模板细则、UI 工艺规则与 Impeccable 契约、DESIGN.md 基础步骤）都要拿出证据，证明它让成品变好了，否则就砍掉或重做（#260）。这里不靠印象，照 pstack 的实测做法来：固定的场景，一次只拿掉一层，每格跑够次数，判定规则在跑之前写好。

另外几个对照只改提示、不装技能，回答两个问题：

- 规则包到底比形容词强不强，比我们的流水线强不强？起因是一位创作者的游戏风封面技能，它声称硬性的 if-else 决策树比形容词提示好，但没做过消融。
- 主人的假设：讲节奏和比例的关系型原则，胜过堆叠固定像素的装饰配方。来源是 [ignoredone 站点的调研](../../docs/research/ignoredone-arknights-design.md)。

这几个规则包都是照对应写法、为我们自己的场景从头写的，没有照抄原文。

runner 改自 pstack-omp 的 `evals/run.mjs` 和 `evals/lib.mjs`：变体交替跑，每次一行 `results.tsv`，追加时列必须对得上，提示词从标准输入传，超时连子进程一起杀，工作目录名只用场景名。

## 场景

每个场景给一份需求（`brief.md`）、一份固定长度的文字（`content.md`）和一份交付约定：一个或两个自包含的 HTML 或 SVG 文件，固定尺寸。带预设风格的场景另给一份 `DESIGN.md`（Google DESIGN.md 格式，前置元数据里有色值和字号阶梯，能通过 `foundation check`）。`case.json` 和 `prompt.md` 不会复制给代理。提示词是一句普通的请求，不透露在测什么。

| 组 | 场景 | 风格 | 文字 | 交付 |
| --- | --- | --- | --- | --- |
| core | `cover-dark` | 铸台控制台（深色工业游戏界面） | 短文字 6 行 | 1080×1440 封面，字号 ≥ 20px |
| core | `cover-light` | 纸页（浅色报刊编辑） | 短文字 5 行 | 1080×1440 封面，≥ 22px |
| core | `explainer-light` | 纸页 | 长文 385 个汉字 | 1080×1920 长图卡，≥ 22px |
| core | `hero-dark` | 铸台控制台 | 官网首屏 | 1440×900 一屏，≥ 16px，链接要真能点 |
| open | `cover-dark-open` | 不给，风格自定 | 同 `cover-dark` | 同 `cover-dark` |
| open | `hero-open` | 不给，风格自定 | 同 `hero-dark` | 同 `hero-dark` |
| ignoredone | `strategy-cover`（S1） | 铸台控制台 | 关卡代号、队伍条件、模式标签、英文微排版、署名 | 两版：1920×1080 和 2560×1600；关键信息必须落在双比例裁切的交集安全区里 |
| ignoredone | `qa-card`（S2） | 纸页 | 一题问答，正文约 70 字 | 1080×1440 |
| ignoredone | `tutorial-steps`（S3） | 铸台控制台 | 六步教程加一块截图位 | 1080×1920 |
| ignoredone | `stream-standby`（S4） | 两套皮肤：铸台控制台、纸页 | 直播待机页文字 | 两版 1920×1080，版式相同、只换皮肤 |

- **两套风格**：为这个实测原创，不用任何第三方素材。S1 的人物用简单几何剪影占位，不用游戏素材。
- **open 组**：不给 DESIGN.md。有预设风格时，基础步骤（写 DESIGN.md）、设计方向库和 Taste 套件几乎没事可做；open 组就是为了让这几层真的被用到。
- **双比例裁切**：S1 的两种尺寸取自调研，那份调研本身注明了 2560×1600 是 16:10，不是 4:3。安全区按平台的两种裁切算：16:9 那版左右各留 96px，16:10 那版上下各留 80px。
- **两套皮肤**：S4 的第二套皮肤用工作目录里的 `DESIGN-light.md`，打分时按纸页的色值量。
- **默认组**：默认跑 core、open 和 product-ui（`--sets` 可改）。ignoredone 组主要用来比较“原则对配方”。

### 产品界面组（product-ui）

前面三组都是封面、长图卡和官网首屏。这一组是产品里的真实页面，用来回答“通用设计规则对产品界面有没有用”。

| 场景 | 风格 | 内容 | 交付 |
| --- | --- | --- | --- |
| `workbench-list` | 铸台应用（`foundry-app`：铸台控制台的色值，产品字阶 13–32px） | 工作台：导航、三个筛选、四行构建（成功、失败、进行中）、一块空状态面板 | 1440×900 一屏，≥ 13px |
| `settings-page` | 纸页应用（`broadsheet-app`：纸页的色值加一个报错色，产品字阶 13–40px） | 设置页：分区列表、两个输入框（其中一个在出错状态）、一个开关、危险区、保存栏 | 1440×900 一屏，≥ 13px |

- 状态靠文字承载：`content.md` 里有每个状态的文字标签和出错提示，少了就扣文字覆盖。重复出现的词每处都算：筛选里的“进行中”不能顶替某一行的“进行中”。
- 控件要是真的：链接指向存在的锚点，筛选和操作用按钮，输入框用 `input`。假控件照常扣分。
- 点击区域：brief 要求每个不小于 32×32。页面审计量出的过小控件数（`targetSizeFails`）写在每次运行的 `measure.json` 里，不进综合分，也不是 `results.tsv` 的列（列是钉住的）。
- 层级下限是 2 倍（页面标题对正文），不是封面的 2.5 倍。

## 变体

| 变体 | 给代理的东西 |
| --- | --- |
| `bare` | 不装技能，只有两条共用的项目规则 |
| `adjectives` | 同 `bare`，多一句风格形容词（`rules/adjectives.json`） |
| `decision-tree` | 同 `bare`，多一份 if-else 规则包（`rules/decision-tree.<风格>.md`）。内容：<br>· 先数字数，按 ≤40、≤180、>180 分版式<br>· 只用固定色值<br>· 装饰按实测标题宽度算<br>· 五条精确到像素的摆放定律<br>· 出图前 8 项自检<br>开放场景用 `packStyle` 指定用哪一份 |
| `principles` | 同 `bare`，多一份关系型原则（`rules/principles.md`）。内容：<br>· 调研里的 R11–R19：主体先行、一静一闹、主动删信息、动线、醒目度与边距、比例递进、同源变化、用线代面、偏心侵入、三角补空<br>· R1–R10 里能检查的几条：字距按角色、行距与字距之比、读序、双比例安全区、阴影从零加、色相跨度、背景低饱和 |
| `recipes` | 同 `bare`，多一份固定像素的装饰与质感配方（`rules/recipes.md`）。内容：<br>· 四角钉、标题条、方括号标题、小节标记、胶囊标签、英文微排版、页脚条、刻度<br>· 点阵、扫描线、颗粒、硬投影、改色 |
| `full` | 装上这个检出的 design-pipeline，内容和发布包一致（不含按需下载的 MengTo、iart 原文） |
| `full-minus-<层>` | 装上去掉一层的 design-pipeline |
| `reference-system` | 同 `bare`，不装技能，另给两样：工作目录的 `references/` 里一到两张参考图，和一份项目的 `DESIGN.md`。规则里多两句：先看参考图、借版式和细节不照抄内容；颜色字号只从 `DESIGN.md` 取 |

共用的两条项目规则（写进工作目录的 `AGENTS.md`，`CLAUDE.md` 指向它）：没人会回答问题，需要拍板时自己定，在回复里说一句；只交付 brief.md 写的文件。

### 参考加设计系统（`reference-system`）

这个变体对应一条常见的主张：不要靠通用的设计规则，先找真实参考、把截图交给模型，再给项目建一套设计系统让模型照着做。

- **参考图从哪来**：默认用 `references/` 下为本实测原创的参考页，每种风格一张产品界面、一张封面，内容和场景不同（见 [references/README.md](references/README.md)）。HTML 参考页在开跑时截成 PNG，代理只看到图片。
- **用自己的参考**：`--references <目录>` 换成自己的截图目录，结构是 `<场景名或风格名>/*.png`，场景名的目录优先。原创参考页比不上真实的高水准参考，要认真验证这条主张，就用自己收集的截图跑；它们只留在本机，不提交。
- **设计系统**：带预设风格的场景用场景自己的 `DESIGN.md`。开放场景本来不给 `DESIGN.md`，这个变体给它同一风格的那份，因为“自带设计系统”正是这条主张的一部分。
- 找不到参考图时开跑前就报错，不会悄悄跑成 `bare`。

### 减层怎么做

减层不靠提示词，而是由 `variants.mjs` 从 `skill/` 打出一份少了这一层的技能目录，再装进工作目录。Claude Code 装在 `.claude/skills/design-pipeline`，Codex 和 OMP 装在 `.agents/skills/design-pipeline`。层的定义在 `layers.json`：

| 层 | 删掉的文件 | 指代短语（不分大小写） | 留下的代码 |
| --- | --- | --- | --- |
| `taste-skill` | `references/taste-skill.md`、`vendor/taste-skill/` | Taste suite、Taste method | 无 |
| `design-direction-library` | `references/design-direction-library.md`、`vendor/design-direction-library/`；清单换成空清单 | design direction library、direction library | `design-direction-library-core.cjs`、`directions-core.cjs` |
| `anti-slop-rubric` | 细则 JSON 和 schema、`anti-slop-review.md` 和 schema、`anti-slop-evidence.schema.json`、`scripts/evaluate-anti-slop.cjs` | anti-slop review、anti-slop rubric、anti-slop gate | 无 |
| `ui-craft` | `ui-craft-sources.md`、`impeccable-contract.md`、`impeccable-product-design.md`/`.json`，以及六个上游包 | Impeccable craft floor、Impeccable gate、Impeccable contract、UI craft rule/guide/precedence | `interaction-audit.cjs` |
| `design-md-foundation` | `references/design-synthesis.md`、`scripts/check-design-foundation.cjs`、`scripts/advance-design-synthesis.cjs` | requirements-driven (DESIGN.md) synthesis | `design-synthesis-core.cjs`、`init-design-synthesis.cjs` |

打法：

- 只删声明的文件。声明里有一条对不上任何文件，就报错。
- 其余维护中的 Markdown（`vendor/` 下除总索引 `vendor/README.md` 外都不碰，上游原文保持原字节）里，指向被删内容的地方（路径或指代短语）按下面的顺序删，越小越好：
  1. 两个引用并列时，只删这一个和它们之间的分隔。
  2. 只装着它的括号注，删括号注。
  3. 列举里差不多就是这个引用本身的一项（除引用外最多 3 个词，且不含“读、用、打开、照着”这类路由动词），删这一项和一个分隔。
  4. 否则删它所在的整句。
  5. 列表项和表格格子的第一句被删时，整项、整行删掉。
  6. 代码块只删提到它的行（连同续行）。
  7. 标题提到它时，整节删掉；一节删空了，标题也删。
- JSON 里以被删路径为值的数组项删掉，例如 `package-resources.json` 的 `required`、组件来源目录里的条目。
- 留下来的脚本还在 `require` 被删的文件时，报错。
- 设计方向库换成一份内容为空的清单（保留来源和许可，对象数为 0、修订号换掉，免得去校验缓存里的真库）。`doctor` 照常通过，`direction draw` 报“库没装”（`TOOL_MISSING`）。这样量的是“少了这份内容”，而不是“命令行坏了”。
- 打出来的目录要过发布包的资源检查（和 `scripts/qa.cjs` 同一组规则）。
- 每个变体的报告写在 `<结果目录>/variants/<变体>.report.json`，不放在技能目录里。报告里有：
  - 逐行的改动（原行号、原文、新文，删整行时新文为 null）；
  - 替身文件；
  - 脚本和 JSON 说明文字里仍提到被删路径的地方。
- 测试会把每个变体逐文件和 `full` 比对，确认只有声明的文件和报告里的行变了，而且每段改动都落在一处指向被删内容的地方上。

单独打变体目录、看看删了什么：

```sh
node evals/ablation/variants.mjs --out /tmp/variants
```

## 怎么打分

打分不调模型，同一台机器上同一份文件每次结果一样。交付物先复制进 `captures/<标签>/page/`，在固定尺寸下用无头 Chrome 打开，等 2.5 秒让入场动画走完。SVG 会内联进一个只有它的 HTML 页面里量。浏览器、页面审计、构图门禁、文字提取都复用 `skill/scripts`：`interaction-audit.cjs`、`composition-core.cjs`、`capture-composition.cjs` 的 `extract`、`design-system-package-core.cjs` 的 `frontMatterGroups`、`png-core.cjs`。

**交付约定**：要求的文件每个恰好一个；不引用外部资源或其他文件；渲染时不发请求；SVG 的尺寸或 viewBox 比例对。不满足的，综合分为 0。

**失败**：超时、出错、没交付物，一律按失败算。综合分记 0，留在格子里；报告列出每格的失败率。默认超时 3600 秒。

**量出来的分项**：

- 卫生
  - 文字覆盖、溢出与裁切、字太小、对比度（WCAG 2）、构图门禁错误（空画面、整体对比度太低）。
  - 反模板硬规则：减弱动态、动画停在第一帧时看不见的文字；假控件。假控件指没有 href、href 是 `#` 或 `javascript:`、页内锚点指向不存在的 id 的链接，以及鼠标是手型却不是控件的元素。
  - **层级下限** `hierarchyFails`：要有主标题的场景，要求至少 3 级字号，并且最大一级对正文（字数最多的那一级）至少 2.5 倍（长图卡和问答卡为 2 倍）。一样大的平铺页会被扣分。
  - **出安全区** `safeZoneViolations`：S1 的关键信息落在裁切区外的条数。
- 贴合
  - 有预设风格：文字、边框和纯色填充的颜色落在色值 ΔE00 ≤ 5 上的比例（`paletteElements`），以及字号落在字阶上的比例（`typeScale`）。渐变和发光不算颜色，也不算违规。截图像素的比例（`palettePixels`）只报告，不进分。
  - 开放场景：颜色收敛（`colourKinds`，按 ΔE00 ≤ 5 聚成几种）和字号收敛（`sizeKinds`）。
- 节律（代理量，见下）
  - `gapOnStep`、`distinctGaps`：纵向空隙落在间距单位整数倍 ±1px 上的比例，以及有几种不同的空隙。
  - `ratioCv`：最大字号以下各级相邻两级之比的变异系数。最大的展示字号是故意的大跳，不算。
  - `leftEdges`：文字块有几条不同的左边线。
  - 装饰的个数、种类和重复比例：只报告，不进分。
- 跨次相似度：同一变体、同一场景各次之间，文字布局掩码（截图缩成 48 列的格子，再向四周各扩一格）的 Jaccard 相似度。像素相似度只报告。

**综合分**（跑之前定好，`suite.mjs` 的 `composite`）：

```text
卫生 = 100 − 40×缺字比例 − 15×min(溢出,3) − 10×min(字太小,3) − 5×min(对比度不够,4)
           − 10×min(构图错误,2) − 10×min(反模板硬规则,3) − 25×min(层级不够,2) − 10×min(出安全区,3)，最低 0
贴合（有风格）= 100 × (0.7×颜色落在色值上的比例 + 0.3×字号落在字阶上的比例)
贴合（开放）  = 100 × (0.5×颜色收敛 + 0.5×字号收敛)；≤6 种颜色、≤5 级字号满分，≥10 种、≥8 级为 0
节律 = 字号不到 3 级时为 0；否则 100 × 平均(间距落在单位上的比例, 1 − 字号比变异系数/0.5, 1 − (左边线数 − 1)/8)
综合 = 0.4×卫生 + 0.4×贴合 + 0.2×节律；不合交付约定、失败为 0
```

几个交付物的场景，综合分取各版的平均，次数类分项相加。

**文字覆盖怎么数**（`measure.mjs` 的 `coveredPieces`）：`content.md` 的每一段要在页面文字里有自己的一处。重复出现的段要出现同样多次；一段是另一段的一部分时（“删除账户”和“删除账户…”），长的那处不顶替短的。

`measure.json` 里另有一项不进综合分的量：`targetSizeFails`，要求真控件的场景里点击区域过小的控件数（页面审计的 `audit.target-size`）。

**校准**（`tests/fixtures/ablation/`，测试里钉住）：

| 文件 | 内容 | 综合分 |
| --- | --- | --- |
| 好封面 `good.html` | — | 92.8 |
| `monotone.html` | 所有字一样大的平铺页 | 60 |
| `gradient.html` | 好封面加径向渐变底和发光 | 92.8（渐变和发光不加分也不扣分） |
| `overflow.html` | 字溢出 | 66.8 |
| `offpalette.html` | 色值不对 | 70.4 |

跨次相似度（文字布局）的校准：

| 对比 | 相似度 |
| --- | --- |
| 同一版式只换色 | 1.0 |
| 同一版式换色又挪 8–12px | 0.88 |
| 不同版式 | ≤ 0.06 |
| 平铺页对另一版式 | 0.55 |

阈值定在 0.8。

**节律几项都是代理量**：它们量的是几何上有没有章法，不是好不好看。节律只占综合分的 0.2，口味的结论由盲评定，不由这些数定。规则包本身就写着“间距只能是 8 的倍数”“左对齐到 64px”，在节律上天然占便宜；所以有“套模板”这条规则，下结论时也要把这一点写进去。

### 盲评（和量出来的分数分开）

`judge.mjs` 的做法：

- 从结果目录取同一场景、同一次的两张截图，复制成 `A.png`、`B.png`，放进一个只有它们的临时目录。路径和提示词里都没有变体名，左右按 `--seed` 随机。
- 交给另一家的模型，按评分细则二选一。评分细则见 `judge.mjs` 的 `judgePrompt`：风格贴合、文字、节奏、专门设计四项，给出 A、B 或 tie。
- 出图和评审是同一家时，要显式加 `--allow-same-family`。
- 每一局有对局编号（评审、场景、次、两个变体）。重跑时已评过的跳过；`--rejudge` 重评时只算最后一次，不会重复计数。打了分却没有截图，直接报错，不悄悄跳过。
- 结果只写 `judge.tsv`。

## 已知盲区

- 量出来的数只看画面上能量的东西，看不出构思好不好、是不是为内容专门设计。这些只能靠盲评，或者主人自己看 `captures/`。
- **预设风格会把层藏起来**：core 组给了 DESIGN.md，基础步骤、设计方向库、Taste 套件几乎无事可做，这几层在 core 组上量不出作用是意料之中的。open 组就是为它们加的，读结论时分组看。
- **设计方向库换成了空清单**：`doctor` 照常通过，`direction draw` 报库没装，标准档 ui、web 流程里的风格轮盘抽不出来。量的是“少了这份内容”的效果，但流程里依赖轮盘的那一步也会因此走不下去。
- 字体：两套风格的字体多半没装，各台机器回退到的字体不同，溢出和字宽也会跟着变。比较都在场景内做，所以一个场景的所有次要在同一台机器上量。分机器跑时按场景分。
- CSS `transform: scale()` 放大的文字，字号按 CSS 值算。
- 反模板细则里只有两条硬规则能在一张静态成品上量出来。
- 减层只删文件和路由；`next` 等命令吐出的说明文字里提到被删文件的地方还在，变体报告的 `residual` 照实列出。
- “用没用技能”和“读没读到某一层”都从运行记录判断。
  - Claude Code 用 `stream-json` 输出，只看工具调用（调 Skill、读技能目录里的文件、跑技能的命令行），不看开头列出的可用技能清单。
  - Codex、OMP 只有文字输出，按文字找，可能漏判或误判。
  - 每次记下读到了哪几层（`layersRead`，按这一层在完整技能里的文件路径找）和有没有跑 `next`（`nextRan`）。
- **网络**：代理在工作目录里照常能上网。brief 要求交付物不引用网络资源，渲染时发出的请求会被记下并判不合约定，但代理在做的过程中去网上查资料、下载东西，这里管不着，也不记录。要严格隔离，就在断网或只放行模型接口的环境里跑。
- **共用缓存**：下载缓存（`~/.cache/design-pipeline`，或 `DESIGN_PIPELINE_CACHE`）对所有变体都可见。runner 每次开跑时把它的状态写进 `environment.jsonl`。
- 装了 pstack 等其他技能的客户端，`bare` 也不是一张白纸。
- **参考的水准**：随仓库带的参考页是原创的，水准有限。`reference-system` 用它们输了，只说明“这几张参考加设计系统”不如技能，不说明真实参考不行；结论里要写明用的是哪套参考。
- **开放场景里输入不对等**：`reference-system` 在开放场景多拿到一份 `DESIGN.md`，`full` 要自己写。这一组比的是两种做法，不是同样输入下谁强。
- **提示写法的规则包是为封面写的**：`decision-tree`、`recipes` 在 product-ui 组上按所属风格照常套用，内容并不针对产品界面。回答下面三个问题时不用跑它们。

## 判定规则（跑之前定好，`report.mjs` 的 `RULES`）

一格是“一个变体 × 一个场景”。失败的运行按 0 分留在格子里。

**先跑方差试跑**：`run.mjs --pilot` 只跑 `bare`，每个场景 5 次，跑完打印每个场景的标准差，再按合并后的 σ 算出每格要跑几次（`power.mjs`）。算法：

```text
n = 2σ²(z₁₋α/₂ + z₀.₈)² / (S·δ²)，δ = 5 分，α = 0.05 / 5（五层做 Holm 校正时第一步的门槛），S 是场景数，至少 3
```

正式跑用它算出的 `--runs`。用的是正态近似，检验和下面的量值检验是同一个。

**前提**

- 装了技能的变体，只用看得出用了技能的运行；用了技能的不到 80% 时，这个变体的结论无效，先解决技能没触发的问题。
- 某一层只有在至少一半的 `full` 运行读到了它的文件时，这一层的比较才算数；否则判待定。
- 至少 3 个场景、并且至少 3/4 的已跑场景，每格凑够 3 次，才下任何结论。
- `full` 还没判定为胜过 `bare` 时，逐层结论只作参考，先查流水线整体。

**量值检验**：每个场景算两格均值之差，再在场景之间取平均 D；标准误合并各场景的方差；用双侧 z 检验。五层是一族，做 Holm 校正；提示写法的五组、原则对配方的四组各是一族。

**盲评**：分出胜负的对局做双侧精确二项检验（p = 0.5），同一族做 Holm 校正。

**结论**：

- **保留**（前者更好）：满足下面任一条。
  - 量值显著为正，并且盲评至少 12 局分出胜负、前者胜率过半。两边方向一致才算。
  - 盲评单独下结论：至少 48 局分出胜负，校正后显著，量值没有显著反向。
- **砍掉**（去掉反而更好）：同上，方向相反。
- **矛盾**：量值和盲评显著地方向相反。补数据再判。
- **待定**：其余一切，包括量值显著但盲评还不够 12 局、两边都不显著、场景不够。待定不是砍掉，只是继续收数据。报告会按当前 σ 算出要跑多少次。

**套模板**：同一变体在至少 2 个场景里，各次之间文字布局相似度的均值 ≥ 0.8，判为套模板（同一个模子印出来）。套模板的变体，量值上的优势一律不算，只有盲评能让它胜出。

**比较的组**

- 逐层：`full` 对 `full-minus-<层>`。
- 提示写法：`decision-tree` 对 `adjectives`、`adjectives` 对 `bare`、`decision-tree` 对 `bare`、`full` 对 `decision-tree`、`full` 对 `adjectives`。
- 原则对配方：`principles` 对 `recipes`、`principles` 对 `bare`、`recipes` 对 `bare`、`principles` 对 `decision-tree`。
  - 主人的假设成立，要求 `principles` 胜过 `recipes`，并且 `principles` 没被判为套模板。
  - `recipes` 只在量值上胜、盲评没胜，说明它只是把可量的数卡住了。
- 参考加设计系统：`full` 对 `reference-system`、`reference-system` 对 `bare`，两组一族做 Holm 校正。只有跑了这个变体，报告里才有这一段。

### 三个问题

报告最后固定回答三个问题，每个只有“是 / 否 / 样本不足”三种答案，按上面的规则判，不另立标准：

1. **装了技能是否胜过不装**：`full` 对 `bare`。
2. **技能与“参考加设计系统”谁好**：`full` 对 `reference-system`。
3. **单独拿掉 `ui-craft` 层是变好还是变差**：`full` 对 `full-minus-ui-craft`。这一层是 UI 工艺规则与 Impeccable 契约。完整技能的运行里不到一半读到这一层时，答“样本不足”。

### 输了怎么办

- 某一层判为“砍掉”（去掉它反而更好）：开工单把这一层从发布包里拿掉，或者重做后重新过一遍消融。不保留一个已被判定拖累成品的层。
- `full` 判为输给 `bare`：先停掉往技能里加规则的工作，查流水线整体，逐层结论这时不作数。
- `full` 判为输给 `reference-system`：把参考与设计系统这条路提到默认流程的前面，规则层只留下判为“保留”的。
- “样本不足”和“矛盾”不触发任何处置，只继续收数据。
- 结论和结果表提交到 `docs/research/`，写明客户端和模型、跑的日期、每格次数、盲评用的模型、参考图的来源。

## 怎么跑

```sh
npm ci
node evals/ablation/run.mjs --client claude --pilot                 # 方差试跑，打印每格要跑几次
node evals/ablation/run.mjs --client claude --runs <试跑算出的次数>
node evals/ablation/judge.mjs --out <结果目录> --judge codex
node evals/ablation/report.mjs <结果目录>
```

- **客户端**：`--client` 可选 `claude`、`codex`、`omp`。
- **参考图**：`--references <目录>` 换掉 `reference-system` 用的参考图，见上面“参考加设计系统”。用的目录记在 `environment.jsonl` 里。
- **选范围**：`--sets core,open,product-ui,ignoredone`、`--variants`、`--scenarios` 可以只跑一部分。只回答三个问题：`--variants bare,full,reference-system,full-minus-ui-craft`。比较原则对配方：`--sets ignoredone,core --variants bare,principles,recipes,decision-tree`。
- **目录**：
  - 结果默认放在 `~/agent-runs/ablation-<时间>`（`--out` 可改）。
  - 工作目录放在 `~/agent-runs/work/<场景>-xxxx`（`--work-root` 可改），上级目录不带“消融”字样，因为代理看得到自己的路径。
  - 都不在 `/tmp`。
- **工作目录**：打完分就删（`--keep-workdir` 保留）。交付物的副本在 `captures/<标签>/page/`，代理留下的文件清单在 `captures/<标签>/workdir-files.json`，回复在 `<结果目录>/<客户端>-<变体>-<场景>-<次>.txt`。`results.tsv` 里的路径都是相对结果目录或工作根目录的。
- **用户级安装**：用户级目录装着 design-pipeline 时，runner 拒绝跑，因为 `bare` 和减层变体也会读到完整技能。先停用插件或挪走；确定客户端读不到它时，可以加 `--allow-global-skill`。
- **分次跑**：追加到同一个结果目录，列不一致会拒绝。分机器跑时按场景分。

自测（不调模型）在 `tests/ablation-eval.test.cjs`。它用假代理写几份现成的封面，确认下面这些：

- 打分分得开好封面和坏封面；
- 减层目录逐文件对比只改了声明的东西；
- 判定规则、去重、失败和路径规则照 README 走；
- 盲评提示词里没有变体名。

## 成本

全量一轮的运行次数：

```text
（12 个变体 × 8 个 core、open 与 product-ui 场景 + 5 个不装技能的变体 × 4 个 ignoredone 场景）× n
```

n 是试跑算出的每格次数。n = 5 时是 580 次。只回答三个问题时是 4 个变体 × 8 个场景 × n，n = 5 时 160 次，其中装技能的 80 次。下面是估计（还没有实测；第一轮跑完后用 `seconds` 列和客户端的用量记录替换掉）：

| 部分 | 每次 | 说明 |
| --- | --- | --- |
| 方差试跑 | 3 到 8 分钟，约 2 万到 6 万 token | `bare` × 8 场景 × 5 次 = 40 次，约 2 到 5 小时 |
| 不装技能的变体 | 3 到 8 分钟，约 2 万到 6 万 token | 约占全量的一半 |
| `full` 和 5 个减层 | 10 到 30 分钟，约 20 万到 60 万 token | 读技能文档、跑 `next` 和检查，大部分是可缓存的输入 |
| 打分 | 每个交付物约 6 秒 | 不用模型 |
| 盲评 | 30 到 60 秒，约 1 万 token | 默认 17 组对局 × 场景数 × n |

n = 5 时，全量单线程要几天，主要花在装了技能的那几百次上。先跑方差试跑，再按它算出的次数决定跑全量，还是先只跑 core 和 open 里最关心的几层。

# Prompt Motion 模板库

按主题检索案例、挑选可复用配方，再读取需要替换的输入和必须保持的规则。
这是维护中的策划模板库；可运行工程和渲染证据由选中模板后的具体任务提供。

截至 2026-10-09，库内有首页快照的 **233 条案例索引**和 **12 条已整理配方**，
配方关联 13 个来源案例。索引记录标题、作者、日期、类型、Prompt 公开状态和原页链接；
被索引不等于已整理或已验证。

## 检索与读取

从 skill 安装目录运行，命令可离线使用，不写入目标项目：

```text
node scripts/designer-pipeline.cjs film templates --query "ui loop" --json
node scripts/designer-pipeline.cjs film templates --template ui-state-loop --json
node scripts/designer-pipeline.cjs film templates --all --query stephanlivera --json
```

默认只返回配方；`--all` 同时返回案例索引。查询按空白分词、忽略英文大小写，
所有词都须命中。配方可按 ID、标题、分类、简介、标签或来源作者检索；案例可按
ID、标题、作者或类型检索。详情选择 `--template` 不与 `--query` 或 `--all` 混用。
未知模板返回退出码 1。

## 配方目录

| ID | 模板 | 分类 |
| --- | --- | --- |
| `dot-carried-motion-system` | 点作为主对象的品牌动效 | brand-motion |
| `slow-logo-assembly` | 缓慢拼装 Logo | brand-motion |
| `historical-milestone-timeline` | 关键事件时间线 | data-story |
| `talking-head-meaning-led-edit` | 按语义组织口播剪辑 | editing |
| `business-five-scene-explainer` | 五幕业务介绍 | explainer |
| `derivative-example-explainer` | 从例子理解导数 | explainer |
| `token-bucket-state-explainer` | 令牌桶状态与请求结果 | explainer |
| `paper-product-explainer` | 纸面风格产品解释 | product-film |
| `photo-print-launch` | 从照片到实体打印的发布片 | product-film |
| `ugc-proof-promo` | 用 UGC 证明产品价值 | product-film |
| `lyrics-vocal-beat-typography` | 歌词、演唱与节拍联动 | typography |
| `ui-state-loop` | 产品 UI 状态循环 | ui-loop |

机器可读目录是 [templates.json](templates.json)，来源索引是
[source-index.json](source-index.json)。每条配方保存：

- 分类、标签、来源案例 ID、复核日期和摘要；详情返回作者和原页 URL。
- `inputs`：可替换输入、用途和是否必需，例如品牌、真实组件、素材、数据或音乐。
- `sequence`：结构顺序；`invariants`：替换输入后须保持的关系。
- `gotchas`、`limitations` 和 `relatedGuides`：适用限制、常见问题与现有方法入口。
- `observation` 与 `adaptation`：页面支持的内容和本库作者补充的编排分别标注。

## 使用边界

本批配方依据页面文字整理，未观看案例视频、未听音频、未实例化或渲染。
其中的运动建议和细化分镜属于作者适配，不能当作原视频的观察结论。
模板数据不包含原视频、整段 Prompt、品牌资产或第三方工程。

选中后，将原页、作者、复核日期、采用的规则和修改记录写入具体任务的 `reference.md`；
实际品牌和组件来自目标项目。使用现有 [参考证据流程](../reference-spec.md) 与
[影片方法](../film-methods.md)，沿用原有输入 hash 和下游证据失效规则。
模板入库不授予 Component Conformance 或 Visual Acceptance，也不改变任务的运行框架。

维护者更新来源、处理重复及下架案例的方法见仓库的
`docs/prompt-motion-template-maintenance.md`；安装后的用户通过这份库和只读 CLI 选用配方。

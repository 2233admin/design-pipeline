# 意图文档:design-pipeline 前端能力

来源:`.memlog.md`(唯一来源)。日期 2026-09-30。

## Intent

让 design-pipeline 产出的网页在视觉上更好、更有辨识度,而不是靠堆更多 gate。同时先想清楚一件事:怎样确认模型的前端能力真的增强了。用户要求先定这个确认方法,再做技能。技能要能直接使用,并建立在已有工作上:`add-web-treatment-and-section-briefs` 和 film 创作层。

## What to build

在仓库内新增四个打包的子技能,由顶层 `skill/SKILL.md` 路由:

- `web-treatment`
- `web-style-bible`
- `web-review`
- `web-capability-eval`

不另建 CLI、gate、receipt,也不做本机外置技能。

## Core mechanisms

主线是三件事的组合。前两件已在 film 里编码，但只通过 Conformance，尚未证明提升了视觉质量（Visual Acceptance 仍待定）；第三件 web 还没有。

1. **支配元素是产品对象**:每章一个支配元素,必须是产品自己的东西(大数字、产品片段、队列、时间线、地图)。film 首版被评"像 dashboard"的教训是:产品的真实结构必须可见。
2. **动效绑定 driver**:每个动效回答一个具名 driver(滚动、指针、状态、时间)。没有 driver 就不许有动效。
3. **密度曲线**:章节 density 的 sparse/dense 曲线,评审者一眼能看出节奏(递增、V 形、锯齿、平稳加一处爆发)。

两个约束:

- **强制 STYLE 表**:全站共享一张。中性 kit 会退化成通用 UI,中性只是地板。表里必须有:
  - 黑名单:不许出现的模板模式,如等宽标签、三列卡片、渐变文字。
  - 必须偏离清单：参考是输入，但不是模板；必须明确写出三点与参考不同的地方。
- **概念卡**:用 morphological 参数表(支配元素、driver、ground 策略、密度曲线、动效动词等)抽三个不相邻组合。三张卡至少 4 个参数不同。这条规则 direction-preview 已有,迁移到 concepts。

## How capability is confirmed

- **评审归属**:评审由用户负责,并记录最终 Visual Acceptance。模型只出盲评包,以及不计票的结构化副评。副评明确标注"非盲"。
- **评估协议**:
  - 同模型、同 brief、同工具链。baseline 对 changed 各至少 3 次独立生成。
  - 先用 1 个模型做小样本试点。再在留出 brief 上用弱、中、强三个模型确认,各报胜率。
  - 至少两位评审,或重复评审,用来估一致性。
  - 阈值预先写死:胜率、产品理解不下降、无响应式与可访问性回退。
  - 确定性指标只当护栏。
  - Conformance 与 Visual Acceptance 分开报。
- **每个 eval 要声明**哪些环节是合成的。

## Out of scope

- 开发流程类事项:Multica 留痕、worker 文件归属、先答后动、同一契约多处重复。memlog 已把这些判定为不入前端能力候选。
- film 引擎移植与音乐授权：不属于前端能力，不进本 intent。
- 远期想法,如声音或触觉反馈作为 driver、按来源渠道换首屏。

## Open items

- W1 到 W7(把 taste 拆成 7 个 yes/no 问题)的具体内容与校准。memlog 只给出名称。
- 捕获工具链本机缺失:没有 puppeteer(memlog 中的 puppeteer-core 条目)。需要把工具链自检放在最前,缺什么明说。
- 启发式阈值未校准。首次真实渲染后必须回填阈值,并留 pending 条目。
- 胜率等阈值的具体数值,须在第一次运行前写死。
- brief 的数量待定。
- 第二位评审是谁待定。

## Constraints from the repo

memlog 仅明确提到:基于已有 `add-web-treatment-and-section-briefs` 与 film 创作层。以下两条来自任务要求,memlog 未展开,视为待下游确认的约束:

- OpenSpec 优先,并扩展 v1 gates。
- Conformance 与 Visual Acceptance 分开报,Visual 默认 pending 并显示在首屏报告。这一条 memlog 有依据(gate 全绿但没人评美的教训)。

# 自主维护设计参考库：开工前调研

研究日期：2026-10-14。用户已确认自主维护、保留上游已有案例并以游戏为重点扩展的英文设计库定位。调研后已建立相邻的 `game-design-md` 本地库并完成三个原创游戏网页／工具案例；执行结果见第 9 节。没有创建远程库或改动 design-pipeline 运行逻辑。

目标：参考 awesome-design-md，维护一套范围更广、重点扩展游戏的设计参考与模板库。上游已有案例也收录，不再限定为只补上游没有的内容；以固定版本的上游集合为基础，保留来源与许可，再补充游戏内 UI、游戏官网、活动／版本专题和游戏工具界面。NASA 等其他优秀设计也可扩展，不限制国家。最新语言决定：整个库只维护一套英文内容，`DESIGN.md` 遵循原有英文与格式，`README.md` 也使用英文，不另建中文或双语版本；此决定取代此前的中文 README／双语入口建议。

## 结论

1. **确有补充空间，但理由不是上游停更。** 核验的上游快照有 84 个独立案例，2026-10-12 的提交新增 10 份 DESIGN.md。NASA、明日方舟、原神、星穹铁道、绝区零没有独立案例目录；上游已有 Nintendo 2001、PlayStation、SpaceX、新闻、汽车和中国背景品牌，不能以“游戏／航天／中国”这些大类断言空白。[U1]、[U2]
2. **复用上游内容与形式，不重新发明体系。** 上游实际 MD 已有结构化 token、组件、响应式、字体替代、迭代说明和已知缺口；这些案例作为我们的基础内容保留。我们的增量是游戏方向的扩展、来源证据与实际使用质量，不是翻译工程或第二种文档格式。[U3]、[U4]
3. **先保留上游基础，新增内容按游戏优先。** 已有较充分网页证据的新增建议对象为明日方舟国际官网、绝区零官网角色页、原神官方交互地图；游戏内 UI 的具体界面与状态证据应优先补采，不拿官网替代。NASA、馆藏与数据网站保留为扩展项。已有案例也收录，不因与上游重复而排除；新增排序不代表模板已完成。
4. **游戏内 UI 保留为重要方向，但本轮证据不足以写完整 HUD 规范。** 官方商店宣传图不等于完整游戏截图，更不等于交互状态已验证。明日方舟可确认的嵌图是宿舍管理界面，不能冒充部署 HUD；星穹铁道和绝区零 HUD 尚待具体界面、版本和状态证据。
5. **当前工具可以复用已有消费边界，但不能声称已经即插即用。** 默认库实际是 dimabraven/design-md 的 4 份示例，不是 VoltAgent 的 84 份；纯中文默认查询还会退化为空查询。本轮只记录，不改代码。

## 1. 研究口径与已做核验

- 上游固定于提交 `c7c1bada4eda972236d124e06ee58df129a9266b`，提交时间 2026-10-12 13:17:07 UTC。读取完整递归树，`truncated=false`；对全部案例目录去重，不以 README 徽章或零结果查询推导覆盖范围。[U1]
- 阅读上游贡献说明、许可及 Linear、Nintendo 2001 两个 MD 样本；样本结论不推广为全部 84 份的质量审计。[U3]、[U4]、[U5]、[U6]
- 候选研究使用官网、官方商店、官方规范和许可正文，结合已有浏览器 DOM、AX 和截图记录。整合时实际查看了 NASA、明日方舟、绝区零、原神地图、馆藏页、OWID 表格等截图；动态页面不以静态 reader 的空正文判定不可用。
- 再核对 NASA HDS 的 README／LICENSE.md、NASA 媒体与品牌规定、OWID 当前 FAQ、馆藏数据政策，并运行现有 designmd 只读命令。
- **事实**是实际文件、页面或观察结果；**建议／[INFERENCE]**是设计提炼价值与排序判断；**未知**不补造色值、断点、时序、交互或授权。
- “未覆盖”严格指此固定仓库快照没有对应独立案例，不证明上游历史、外部 getdesign.md 服务或其他集合从未收录。此检查用于判断新增工作与避免同库重复条目，不再作为排除上游已有案例的收录条件。

## 2. 上游实际做了什么

### 内容与维护

固定树有 **84 个案例目录、84 份 DESIGN.md、83 份案例 README**。最近的新增包括 DJI、Oura、SAP、Oracle、Al Jazeera 等 10 项；因此“上游不更新”不成立。[U1]、[U2]

它不只是 SaaS 极简风：已覆盖汽车、工业品牌、新闻、金融、历史网站和游戏品牌。我们应按**具体来源页面／界面／版本**判断差异，而不是换一个分类标签就当新增价值。

### MD 可以直接借鉴，制作流水线不能假设存在

- Linear 样本覆盖色彩角色、字体层级与替代、布局、层次、组件、响应式、Do/Don't、Iteration Guide 和 Known Gaps；明确区分营销网站与产品截图，并提示私有字体和未观察到的表单错误状态。[U3]
- Nintendo 2001 样本有完整复古面板 token 与组件分析。文档明确原站是固定桌面画布；现代移动端折叠是作者建议，不是 2001 年原站实际行为。[U4]
- 本轮没有重新测量上述样本的每个数字；它们是上游作者分析，不是本研究独立确认的品牌官方标准。
- **仓库实际没有 preview.html／preview-dark.html 或案例图片文件。** 案例 README 把预览、暗色示例与下载导向 getdesign.md。可借鉴“MD＋预览”的交付意图，不能声称 clone 上游就有完整本地可运行标本，也不能假设外部预览资源继承仓库许可。[U1]、[U7]
- CONTRIBUTING 有改进现有文件的说明，又明确写不接受 DESIGN.md 提交；预览更新要求与树内无预览文件也不一致。未发现可直接拿来使用的仓库级采集生成器或完整验证流水线。[U5]

## 3. 新增候选矩阵

以下 **12 项在固定 84-case 快照中均没有对应独立案例目录**。相近的上游案例不代表完全重复，例如 SpaceX 品牌网站不能替代 NASA 实时监测工具，PlayStation 营销站不能替代游戏内菜单。

表中“可提炼方向”均为研究建议，不等于已生成或验收的设计规则。

| 具体对象与一手入口 | 可提炼方向 | 实际证据与限制 | 建议次序 |
| --- | --- | --- | --- |
| [NASA 主站](https://www.nasa.gov/) | 科学编辑型网站：任务主视觉、新闻层次、机构导航与行动入口 | 桌面截图与 DOM 已观察；完整交互／移动端未验证；不等同绿色终端或科幻 HUD | 非游戏扩展 |
| [NASA DSN Now](https://eyes.nasa.gov/apps/dsn-now/) | 实时监测：站点—天线—航天器关系、选中状态、任务信息组织 | AX 观察有 selected／unselected dish 与天线条目；DOM 后续采集失败，实时刷新和离线状态未验证 | 第二批；先补视觉与状态证据 |
| [明日方舟国际官网](https://www.arknights.global/) | 窄体导航、影像主视觉、下载按钮组、边缘辅助导航与细线框架 | 桌面截图及 DOM 已观察；一帧不能证明滚动／视频／过场效果；不是游戏菜单 | 首批 |
| [明日方舟游戏界面：官方商店](https://play.google.com/store/apps/details?id=com.YoStarEN.Arknights&hl=en_US) | 宿舍管理侧栏、资源状态与场景工具 | 确认的是宣传合成图中的宿舍界面；无运行时证据、精确构建号或部署 HUD 证据 | 待游戏内证据 |
| [原神官方交互地图](https://act.hoyolab.com/ys/app/interactive-map/index.html) | 地图画布＋工具面板＋边缘工具栏，游戏风格的真实网页工具 | 截图、DOM、搜索输入有记录；输入发生不等于过滤成功；账号同步、图钉状态未验证 | 首批；只写已观察结构 |
| [星穹铁道游戏 HUD 候选：官方商店](https://play.google.com/store/apps/details?id=com.HoYoverse.hkrpgoversea&hl=en_US) | 回合制信息层级与行动反馈，具体对象待确认 | 官方图片读取记录存在，但本轮没有可判读的完整 HUD 与状态证据；不能确定按钮、弱点条或回合顺序规则 | 待游戏内证据 |
| [绝区零官网角色页](https://zenless.hoyoverse.com/en-us/main) | 角色主视觉、内容分区、阵营分类、缩略图选择与强识别排版 | 桌面首页和 Characters 截图已观察；不是游戏角色菜单；移动端、动画时序未验证 | 首批 |
| [绝区零游戏 HUD 候选：官方商店](https://play.google.com/store/apps/details?id=com.HoYoverse.Nap&hl=en_US) | 动作界面或 HDD 界面，具体对象待确认 | 图片读取记录不支持确认战斗 HUD 或 HDD；没有安装／实际操作证据 | 待游戏内证据 |
| [CERN 主站](https://home.cern/)／[网站规范](https://design-guidelines.web.cern.ch/guidelines-cern-websites) | 机构规范与现实页面的一致性／差异 | DOM 与桌面截图已观察；规范列的字体与当前页面观察不一致，应分别记录；媒体有复用限制 | 第二批 |
| [Rijksmuseum Collection](https://www.rijksmuseum.nl/en/collection) | 艺术内容浏览：大标题、图像层次、搜索与筛选入口 | 桌面截图／DOM 已观察；筛选全流程未验证；作品图片逐件区分权利状态，品牌字体授权未知 | 非游戏扩展 |
| [OWID Life expectancy](https://ourworldindata.org/grapher/life-expectancy)／[Table 状态](https://ourworldindata.org/grapher/life-expectancy?tab=table) | 数据界面：图表／表格状态、筛选与数据来源说明 | 图表和 Table 页面有观察记录；不是全流程测试；当前 Grapher 代码需要书面许可，不能直接复制 | 非游戏扩展，原创实现 |
| [Panic Nova 产品页](https://nova.app/) | 深色产品展示、大标题、软件演示与插件生态内容组织 | DOM 与桌面截图记录存在；视频播放、canvas 行为与移动端未验证；媒体／字体／源码授权未知 | 第二批 |

[teenage.engineering OP–1](https://teenage.engineering/products/op-1) 可作后续备选；固定上游库存也没有它，但本轮证据不足以把它排入首批。不是因其不属于游戏而排除。

### NASA 必须先限定“哪个 NASA 界面”

NASA 主站的科学编辑与任务影像、DSN 的监测界面、旧平面视觉规范是不同对象，不应合并成一份万能“NASA 科技风”。本轮实际主站截图是黑色任务影像首屏、白色新闻内容与红色行动入口，不能因为 NASA 是航天机构就补造绿色终端或扫描 HUD。

官方还有 [Horizon Design System](https://github.com/nasa/hds-core)，以 USWDS 为基础提供 NASA 字体、颜色、间距与组件主题。[H1] 它可作为资料来源，但 README 明确主要面向独立 NASA 平台及不受主站 CMS 主题覆盖的嵌入应用，**不是主站所有样式的同一份源码**。规范文档、源码许可和实测主站行为须分开；不得把旧 NASAWDS、当前 HDS 和主站观察无差别混用。

### 游戏内 UI 不被网页候选替代

游戏内 UI 是后续库的重要独立方向，本轮没有把它缩成官网设计。当前缺的是可核验材料：具体屏幕、平台／版本、默认／选中／锁定等状态，以及真实操作或官方清晰录屏。拿官网、角色立绘、宣传合成图推导完整战斗交互，会制造看似精确但无法复核的 MD。

## 4. 建设顺序：保留上游基础，再扩展游戏

### 建议的首批与扩展

**基础内容保留上游固定快照的全部已有案例；新增重点是游戏内 UI、游戏官网、活动／版本专题和游戏工具界面。** 已有网页证据的首批新增建议为明日方舟官网、绝区零官网角色页、原神交互地图，分别覆盖游戏营销、角色内容展示和工具型 UI。实际游戏内界面的材料补采同样优先，包括具体菜单／管理面板／HUD 与状态，不能因网页更容易采集而把主线缩成游戏官网。NASA、Rijksmuseum、OWID 等可作为新增扩展，不需要删除或重做上游已有的非游戏案例。

用户已确认参考并保留上游集合、由我们维护与扩展游戏、全库只用一套英文。执行阶段已在相邻的 `game-design-md` 本地库保留固定上游版本的 84 份设计文档，加入明日方舟官网、绝区零角色页、原神地图工具三个原创设计研究及可运行预览；不把外部预览、品牌资产或框架复制伪装成自己的模板。游戏内 UI 的来源、版本和状态仍按独立候选采集，不用这些网页替代。

### 最小内容形态

沿用现有 DESIGN.md 的英文与格式：有明确对象和来源的设计描述、token、布局、组件与状态、Do/Don't、适用边界与迭代建议，不发明第二套 schema。库介绍、案例 README、设计规范与原创预览说明统一使用英文，只维护一套内容，不另做中文或双语副本。规范仍可用英文描述特定案例的 CJK 字体和混排要求，文档语言不限制参考案例的国家或原始界面语言。

每个案例最终可配：

- `DESIGN.md`：唯一的英文设计规范，保持原有格式；事实提取与现代适配建议分开，精确值必须有测量依据；未观察到的状态写明缺口，不用“完整规范”掩盖未知。
- `README.md`：英文介绍、适用场景、使用方法与轻量来源说明，包括具体 URL／界面／版本、观察日期、素材与字体授权；不另建中文或第二套英文入口，不重复维护规范正文。
- 自包含预览：原创／获授权内容，展示这份规则用于真实布局的结果；不只是色卡，不下载打包原站源码／角色立绘。参考只有暗色时不强造“品牌官方亮色版”，需要变体则标为原创适配。

“不死板”不等于没有约束。写清哪些元素决定识别度、哪些可以随任务变化；示例只是参考，不把案例的品牌文案、区块顺序和像素尺寸当成所有产品必须照抄的模板。上游已经有 Iteration Guide／Known Gaps，可以直接沿用这种表达方式，而非声称这是新发明。

### 判断一个案例值不值得继续的标准

- 对新增原创案例，相对固定上游快照，是否确有不同的来源界面或设计机制，而不只是换配色？该标准不排除作为基础收录的上游已有案例。
- 把角色／摄影等主资产替换成合法自有内容后，布局、信息层级与视觉规则是否仍能成立？
- 文档是否让真实前端更容易实现，而不是产生长篇形容词？是否能解释移动端和该案例实际内容语言的处理边界？
- 预览是否表现文档所写的规则与已支持的状态？技术检查与人的视觉接受分开，不能用“能跑”宣称“好看”。

这是一轮内容试验的建议，不是新增工具 gate。

## 5. 维护与组织的取舍

| 路径 | 内容与维护成本 | 对我们的适配 | 当前建议 |
| --- | --- | --- | --- |
| 保留上游全部已有案例，再自主维护并扩展游戏 | 承担上游版本更新与自有案例维护；不增加翻译副本 | 满足“它有的我们也有”，同时扩展覆盖范围 | 用户已确认的方向 |
| 只向上游贡献新案例 | 不自养集合，但贡献规则文字有冲突，是否接受未知 | 不能形成由我们维护的完整集合 | 不作为默认路径 |
| 只维护上游未覆盖的案例 | 新增内容较少，但需另依赖上游已有集合 | 不满足用户最新的完整收录要求 | 已被最新决定取代 |

维护以来源版本和实际使用为驱动：**记录固定上游快照与原许可；更新时比较上游变更和本地维护差异；实际使用前复核来源；发现页面或授权变化时更新／注明失效。** 上游后来收录相同案例时比较版本并合并成一个条目，不自动删除本地案例或仅留下链接。已有上游案例保持在本库中；不同页面或历史版本可保留，但写明差异。

不要求天天抓站、每月凑数量或穷尽所有国家与行业。本轮不建立仓库、搜索站、自动采集器、发布流水线或新的工具公共接口。

## 6. 授权是内容边界，不是品牌素材包

- **上游 MIT** 覆盖其软件／分析文档，复制实质部分须保留版权与许可；不替第三方品牌授权商标、私有字体、图像或 getdesign.md 资源。[U6]
- **NASA HDS** 主要软件为 CC0，但字体／商标有例外；README 对字体的描述与 LICENSE.md 列表也不能代替逐个文件核对。NASA 标识、影像、人物与第三方媒体按各自条款处理，不暗示 NASA 背书。[H1]、[H2]、[H3]
- **游戏案例** 的素材和字体许可未完整核实。官网和商店公开可访问，不等于可再分发角色立绘、地图、截图、音频或品牌字体；先存链接与分析，预览用自有内容。[G1]、[G2]
- **馆藏图片** 按每件对象的 Public Domain／CC0、CC BY 4.0 或其他权利标识处理；这不使整个网站代码或 RijksText 字体自动成为开放素材。[W1]
- **OWID** 官方且标有 CC BY 的图表可以按要求署名复用，第三方数据另查条款；当前 Grapher 源码用于复制／修改／分发／项目使用须先取得书面许可。历史 MIT 授权只适用于当时版本，不能升级为当前授权。[W2]
- **CERN** 媒体条款中的教育／信息用途许可不等于可打包再分发，logo 与推广用途另有限制；Nova 的品牌字体、媒体和源码授权仍未知。[W3]

这些是查到的许可边界，不替代具体发布前的授权核验。

## 7. 现有工具接入：可复用契约，不是已经接好了

实际核验了以下只读命令，均 exit 0：

| 命令 | 实际观察 |
| --- | --- |
| `node skill/scripts/designer-pipeline.cjs designmd verify --json` | ready；4 examples、7 files、issues=[]；revision 为 `f74ca151f92af178f1e0b93f2191e5ec77b33203` |
| `node skill/scripts/designer-pipeline.cjs designmd search --json` | 来源 dimabraven/design-md；Linear、Minimal SaaS、Stripe、Vercel 共 4 项 |
| `node skill/scripts/designer-pipeline.cjs designmd search --query "明日方舟" --json` | 同样返回上述 4 项，不是中文命中成功 |
| `node skill/scripts/designer-pipeline.cjs designmd inspect --id design-md:example:linear --json` | admission=reference-only，executableReady=false |

源码核验：[CLI 分流](../../skill/scripts/cli-core.cjs#L1194)、[默认搜索](../../skill/scripts/design-md-source-core.cjs#L161)、[目录模型与校验](../../skill/scripts/designmd-core.cjs#L240)、[目录查询](../../skill/scripts/designmd-core.cjs#L343)、[现有消费文档](../../skill/references/pipeline-reference.md#L154)。

- 默认搜索剥除非 ASCII 字母数字，纯中文变成空查询；目录 catalog 分支不剥除中文。这是两条现有消费路径的差异，不是“整个工具不能搜中文”。目录分支本轮仅阅读源码，未构造新 catalog 做运行验证。
- `sync` 是 DesignMD Directory 路径族的爬取，不是已经证明能导入任意 GitHub DESIGN.md 集合；本轮没有运行会写快照的 sync。
- 先前 `game HUD inventory` 的零结果只来自另一个来源的四份示例，不能证明 VoltAgent 的内容缺失；本报告改用完整固定树判断。
- 后续若批准自动接入，应扩展现有 `design-pipeline.designmd-catalog.v1` 与 search／inspect／verify 消费入口，保留 source、revision、内容哈希和 reference-only；不新增平行 catalog、resolver 或 receipt。自有库导入与实际查询路径届时需要端到端验证，并按项目规定走 OpenSpec。本轮不修这些问题。

## 8. 未解决事项与本轮边界

- **已落实**：独立本地库、固定上游案例引入、来源／许可、三个新增游戏网页／工具案例及原创预览。173 个保留文件已逐个核对原 Git blob。
- **扩展时再补证据**：真实游戏内 UI 的具体屏幕、版本、状态与操作证据；各源站的移动端与动效行为，以及实际品牌素材／字体的可发布授权。这些不由原创预览运行成功推导。
- **本轮未实施**：远程库创建／发布和 design-pipeline 自动接入。独立英文库已可本地阅读与离线查看，不依赖这些动作。
- 本轮不是全量视觉审查，没有验收 84 份上游 MD、外部预览服务、完整游戏操作、完整无障碍或响应式；也没有把浏览器截屏、技术检查或数据查询当成视觉接受。
- 本报告记录研究与执行衔接；独立库自身的英文 `docs/verification.md` 是交付验证记录。中间证据整理位于忽略目录，既有电影／ff-tracking 和其他会话的工具改动未纳入本次提交。

## 9. 本地执行结果

交付目录是与本项目相邻的 `game-design-md`，总计 **87 份 DESIGN.md：84 份完整上游案例＋3 份新增英文案例**。上游固定于 `c7c1bada4eda972236d124e06ee58df129a9266b`，173 个文件逐个匹配原 Git blob；根 README、贡献指南和原 ignore 文件有明确归档路径，原 MIT 许可保留。

| 新增案例 | 实际交付与核验 |
| --- | --- |
| `arknights-web` | 英文 DESIGN.md／README／独立 HTML；原创工业场景、报告切换、键盘 tabs、简报弹窗与真实本地文本下载文件 |
| `zenless-characters` | 英文 DESIGN.md／README／独立 HTML；原创人物内容、阵营筛选、角色选择与键盘操作 |
| `genshin-map` | 英文 DESIGN.md／README／独立 HTML；原创地图、组合搜索筛选、空结果恢复、地点详情、访问标记、缩放及面板切换 |

实际打开并检查了桌面与手机视图；三个预览在禁用网络的本地 file 模式仍可操作，记录的请求仅为本地文件，未观察到页面错误。新案例不是游戏内 HUD，不使用官方角色、美术、地图、字体或账号服务；具体数值是明确标注的原创适配值。

全库不维护中文／双语副本。上游 Raycast 原文有一个 `属于` 元数据键，按原文完整性保留；它不是额外语言版本，不能为了字符检查而篡改上游文件。


## 来源

[U1]: https://api.github.com/repos/VoltAgent/awesome-design-md/git/trees/c7c1bada4eda972236d124e06ee58df129a9266b?recursive=1
[U2]: https://github.com/VoltAgent/awesome-design-md/commit/c7c1bada4eda972236d124e06ee58df129a9266b
[U3]: https://github.com/VoltAgent/awesome-design-md/blob/c7c1bada4eda972236d124e06ee58df129a9266b/design-md/linear.app/DESIGN.md
[U4]: https://github.com/VoltAgent/awesome-design-md/blob/c7c1bada4eda972236d124e06ee58df129a9266b/design-md/nintendo-2001/DESIGN.md
[U5]: https://github.com/VoltAgent/awesome-design-md/blob/c7c1bada4eda972236d124e06ee58df129a9266b/CONTRIBUTING.md
[U6]: https://github.com/VoltAgent/awesome-design-md/blob/c7c1bada4eda972236d124e06ee58df129a9266b/LICENSE
[U7]: https://github.com/VoltAgent/awesome-design-md/blob/c7c1bada4eda972236d124e06ee58df129a9266b/design-md/nintendo-2001/README.md
[H1]: https://github.com/nasa/hds-core/blob/main/README.md
[H2]: https://github.com/nasa/hds-core/blob/main/LICENSE.md
[H3]: https://www.nasa.gov/nasa-brand-center/images-and-media/
[G1]: https://www.arknights.global/fankit/guidelines
[G2]: https://zenless.hoyoverse.com/en-us/company/terms
[W1]: https://data.rijksmuseum.nl/policy/
[W2]: https://ourworldindata.org/faqs#what-software-do-you-use-for-your-visualizations-and-can-i-use-it
[W3]: https://copyright.web.cern.ch/

### 固定上游案例清单（84）

```text
1win, airbnb, airtable, aljazeera, apple, binance, bmw-m, bmw, bugatti, cal, claude, clay, clickhouse, cohere, coinbase, composio, cursor, dell-1996, dji, elevenlabs, expo, ferrari, figma, framer, hashicorp, hp, ibm, intercom, jobright, kraken, lamborghini, linear.app, lovable, mastercard, mercury, meta, minimax, mintlify, miro, mistral.ai, mongodb, mydealz, nerdwallet, nike, nintendo-2001, notion, nvidia, ollama, opencode.ai, oracle, oura, pinterest, playstation, posthog, raycast, renault, replicate, resend, revolut, runwayml, sanity, sap, sentry, shopify, slack, spacex, spotify, starbucks, stripe, supabase, superhuman, tesla, theverge, together.ai, uber, vercel, vodafone, voltagent, warp, webflow, wired, wise, x.ai, zapier
```

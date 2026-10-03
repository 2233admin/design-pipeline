- source_spec: `_bmad-output/implementation-artifacts/spec-cere-482-product-animation-redesign.md`
  summary: 既有目标验证器的源码与 MP4 并列哈希只证明当前文件身份，不独立证明生成关系；本轮不新增渲染回执系统。
  evidence: 旧版 verify.cjs 已在验证末尾分别散列源码与现存视频。本次独立审阅再次指出，相同媒体元数据的另一份 MP4 不会仅因并列哈希而被拒绝。本轮成片另有实际 render 日志、完整解码与主控正常速度观看证据；用户要求暂停共享 pipeline 改进。

## Runtime-review 三路审查：preexisting 未测量遗留项

来源为原始 B1–B12 blind report、E1–E28 边界审查、V1–V14 verification report；报告路径与计数见 source_spec 的审查增补。以下仅合并同 claim + 同 action，39 个 preexisting 来源 ID（B11 两 action）形成 31 条新记录；未读旧条目做去重。所有 path/range 是原审查快照出处（括号内 patch range 不是当前生产行号），全部 **[INFERENCE]**，不是已观察故障或已执行的验证。

- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B3/E13 · high · preexisting quality/benchmark：fidelity 硬失败不能经 score 0 与合法 threshold 0 变 passed；待真实零阈值消费者验证后，使硬失败独立决定 verdict。
  evidence: [INFERENCE] B3 `skill/scripts/benchmark-core.cjs:451-452,282-285`；E13 同文件 `:451-452`。触发：required fidelity threshold=0，候选超 maxPixelDifferenceRatio 或低 minSsim，其余授权/输入合法；待核 public verdict/exit 与 failedRequired，非本故事修复。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B4 · high · preexisting quality/benchmark：purpose-required 维度可 optional 且 unmeasured，由其他 hard-gate 代替目的 verdict；待确认强制必需覆盖并真实验证。
  evidence: [INFERENCE] B4 `skill/scripts/benchmark-core.cjs:72-74,158-166,289-295,479-487`。触发：design-quality 的 responsive required 得满分，visual-quality required=false 且 judgments={}；待核 quality aggregate null 时全局是否 passed，并按已有 purpose 合同处理。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B5/E19 · high · preexisting quality/judgment：public plan 可换名携带完整 armMap/labels；待验证 closed-field 完整结构与 judge 公共投影，不仅禁止 unblinding 字段。
  evidence: [INFERENCE] B5 `skill/scripts/judgment-core.cjs`（`additions/044.patch:61-70,215-240`）；E19 同文件 `:211-234`。触发：其他内容合法且封印正确的 plan 附加 armMap 或 labels 暴露臂身份；待真实入口拒绝与 judge 收到的公共 bytes 验证。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B6/E17 · medium · preexisting quality/judgment：basename 中性但父目录泄露身份；待验证整个公开 path 的中性约束。
  evidence: [INFERENCE] B6 `skill/scripts/judgment-core.cjs:146-152`（`additions/044.patch:127-129,152-173`）；E17 `:148-152`。触发：candidate/A-hero.png 与 baseline/B-hero.png 或 naked 目录，真实 hash/shape 对称；待核公开 staging 全路径而非只核 basename。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B7/E16 · high · preexisting quality/judgment：文本 .png 或真实 1×1 自报大尺度被接受；待验证真实媒体格式、尺度及 judged dimension 所需载体。
  evidence: [INFERENCE] B7 `skill/scripts/judgment-core.cjs`（`additions/044.patch:130-161`）、`tests/design-quality-judgment.test.cjs`（`additions/047.patch:64,98-105,220-234`）；E16 `skill/scripts/judgment-core.cjs:124-153`。触发：中性路径/hash 匹配但内容是文本或 1×1 自报 1440×900；待真实 projection 验证格式/尺度与 responsiveness/motion 载体，不把 hash 当 rendered 证明。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B8/E15 · medium · preexisting fidelity：PNG decoder 接受未知 critical chunk/违规关键块；待验证关键块 semantics、长度与结构并拒绝不支持 raster。
  evidence: [INFERENCE] B8 `skill/scripts/fidelity-metrics-core.cjs`（`additions/043.patch:71-73,81-112`）；E15 同文件 `:95-102`。触发：未知 critical chunk 或违规 PLTE/非空 IEND，CRC 正确且 IDAT 合法；待 decode→measure→消费者真实拒绝，不仅检查像素相等。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B9/E6/V4 · medium · preexisting OpenAlice：reduce 提前 return 漏几何 resize，fonts/load 普通 progress 覆盖 full 状态；待所有模式重测且 reduce 保持 full progress 的真实验证。
  evidence: [INFERENCE] B9 `experiments/openalice-showcase/index.html`（`additions/024.patch:284-293,503-514,564-577,593-594`）；E6 `:563-571`；V4 `:563-567,587-588,558,497-506`。触发：reduce 模式宽度变化导致重排，或字体/load 完成时锚线未达末点；待实际几何与 progress/current-step 验证，CSS 强制全绘制不等于 JS 状态正确。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B10/E8 · medium · preexisting OpenAlice：pagehide 清理无 BFCache pageshow 恢复；待真实缓存恢复证明并对称清理/恢复。
  evidence: [INFERENCE] B10 `experiments/openalice-showcase/index.html`（`additions/024.patch:134-140,557-562,590,618-621`）；E8 `:612-615`。触发：后续 scene 未 reached 时离开再 BFCache 返回；待核 scroll/resize/reduce listeners 与 reveal 恢复，不假定脚本重执行。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B11(a) · medium · preexisting OpenAlice：测量包含 reveal transform，最终布局与轨道基准错位；待真实时序验证后采用不参与 transform 的稳定布局锚点。
  evidence: [INFERENCE] B11 `experiments/openalice-showcase/index.html`（`additions/024.patch:134-140,484-493,566-587`）。触发：measure 在 reached 前或入场过渡中读取 eyebrow rect，之后无完成重测；待过渡完成后的布局/轨道对齐证明。保留 B11 原 ID，此 action 不与点中心 action 合并。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B11(b)/E4 · medium · preexisting OpenAlice：marker top 被当作 10px 点中心；待实际点几何验证并统一真实中心坐标。
  evidence: [INFERENCE] B11 `experiments/openalice-showcase/index.html`（`additions/024.patch:117-121,484-499`）；E4 `:482-486`。触发：计算 y 写为 --dot-y/top，而点有 10px 高度；待验证中心恒偏 5px 及 active/端点，统一定位中心，不把 B11(a) 的 transform 原因混入。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: B12 · medium · preexisting OpenAlice：DESIGN spine >=1180 与 actual <=860 才隐藏矛盾；待按批准断点同步规则。
  evidence: [INFERENCE] B12 `experiments/openalice-showcase/DESIGN.md`（`additions/022.patch:70-76`）、`experiments/openalice-showcase/index.html`（`additions/024.patch:74-80,128-132`）。触发：1024px 仍显示 rail/point 与 56px 占位；待确认批准 spine 断点并真实宽度验证，不用 grid 断点代替 spine 合同。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E1 · low · preexisting OpenAlice：约 302px 以下 orbit marker clipping；先确认 approved minimum viewport，再真实证明，不能自动扩 scope。
  evidence: [INFERENCE] E1 `experiments/openalice-showcase/index.html:171-187`。触发：有效视口 <~302px 且 agent marker 已显现；待确认最低视口合同后量测 Pi/OpenCode 左边界，而非认定所有超窄输入必须支持。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E2 · low · preexisting OpenAlice：窄日志固定列 clip；先确认 minimum viewport，再真实几何验证。
  evidence: [INFERENCE] E2 `experiments/openalice-showcase/index.html:203-205`。触发：固定列总宽超过日志面板内容宽；待授权最小视口内测正文列裁剪，不自动新增响应式范围。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E3 · medium · preexisting OpenAlice：未揭示 gate 获 keyboard focus 后 Enter 可能批准不可见方案；待实际 focus/visibility/state 证明后修 focus-within 策略。
  evidence: [INFERENCE] E3 `experiments/openalice-showcase/index.html:416-432`。触发：焦点进入尚未显现批准按钮并立即 Enter；待真实 DOM 可见性与批准状态验证，不能仅以按钮可聚焦证明方案可见。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E5 · medium · preexisting OpenAlice：末点低于 55% 锚线使页底 progress 不到 1；待实际末端证明，符合已有末端合同则修。
  evidence: [INFERENCE] E5 `experiments/openalice-showcase/index.html:500-506`。触发：已到页底但最后点仍低于 viewport 55% anchor；待真实 scrollHeight/点中心/progress/current-step 验证，与 V2 的验证缺口分开。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E7 · low · preexisting OpenAlice：reduce change 后 queued old IO callback 引用 null；先实际时序证明，再用 callback observer 捕获。
  evidence: [INFERENCE] E7 `experiments/openalice-showcase/index.html:572-577`。触发：切换 reduce 时旧 IntersectionObserver 通知已排队、共享 io 被清空；待实际时序异常证明，未复现前不称已抛错。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E9 · medium · preexisting quality/benchmark：scenarioId __proto__ 写 plain object 原型而丢 JSON 测量；待验证合法 ID 边界与 own/null-prototype map。
  evidence: [INFERENCE] E9 `skill/scripts/benchmark-core.cjs:387-454`。触发：场景 ID 为 __proto__ 且成功提交 judgment/fidelity；待真实结果序列化核测量/receipt 自有字段，不默认禁止现有合法 ID。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E10 · medium · preexisting quality/benchmark：constructor/__proto__ 缺测量时继承属性冒充 input；待真实合法输入验证与 own-only 读取。
  evidence: [INFERENCE] E10 `skill/scripts/benchmark-core.cjs:389-412`。触发：上述 ID 对应 measurement 未提交；待核 unknown/blocked 而非继承属性触发异常，与 E9 写入 action 独立。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E11 · high · preexisting quality/benchmark：授权 reference 可作为 implementation render，未绑定 arm delivery；按 existing submit receipt lineage 先核实际 document，不能发明 producer authentication。
  evidence: [INFERENCE] E11 `skill/scripts/benchmark-core.cjs:424-435`。触发：implementationPath 指向授权参考图而未绑定该臂交付收据；待区分 declared hash 与 actual submitted document，核已有 design lineage，再真实消费者验证。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E12 · high · preexisting fidelity：声明 maxExtraElementRate 而 metric unmeasured 仍 passed；待对齐 adapter 不测与 cap hard-failure 边界，不能用 unknown 满足 cap。
  evidence: [INFERENCE] E12 `skill/scripts/benchmark-core.cjs:444-452`；existing `openspec/changes/add-design-quality-baseline/design.md:34,154`。触发：声明元素上限、adapter 返回 extraElementRate unmeasured；待按现有合同核 required verdict，不虚构可测 metric。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E18 · high · preexisting quality/judgment：格式正确但不存在的 arm receiptHashes 被接受；待核 existing submit lineage 与缺失 authority document，hash 格式不等于来源真实性。
  evidence: [INFERENCE] E18 `skill/scripts/judgment-core.cjs:183-195`。触发：plan 提供合法、不同但无对应 document 的臂收据 hash；待实际 document 与 evidence/brief binding 消费验证，不另建认证系统。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E20 · high · preexisting quality/judgment：join(',') 维度比较与单个复合维度碰撞；待 structured array 比较与真实消费验证。
  evidence: [INFERENCE] E20 `skill/scripts/judgment-core.cjs:222-224`。触发：plan 合并逗号维度且授权 rubric 含复合锚点；rubric ID 仅 nonempty/coverage，无 enum 等价补救。待核多维被合成一次比较的拒绝；不与 V8 subset action 合并。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E21 · medium · preexisting quality/judgment：tie vs win 虽折叠 tie，orderDisagreements 漏计；待正确记录不同 order。
  evidence: [INFERENCE] E21 `skill/scripts/judgment-core.cjs:334-339`。触发：一个展示顺序 tie、另一顺序某臂 win；待真实 folded result 与 disagreement 指标验证，不能以最终 tie 掩盖 order 分歧。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: E22 · medium · preexisting quality/judgment：privateExpectations || expectedComponents 跳过第二组；两组都声明且合法时待合并全部要求。
  evidence: [INFERENCE] E22 `skill/scripts/judgment-core.cjs:417-419`。触发：同 scenario 同时声明两组不同组件要求；待真实投影核全部要求被消费，不把择一当完整覆盖。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V1 · medium · preexisting OpenAlice：实际批准/退回/keyboard 状态验证缺口；待真实页面 behavior smoke，不写 wiring/source 测试。
  evidence: [INFERENCE] V1 `experiments/openalice-showcase/index.html:596-610,431-435`。触发待测：原生 keyboard 激活退回与批准；待状态 DOM 变化、退回后可操作、批准后两按钮 disabled，现有合成 Playground 合同不证明本页行为。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V2 · medium · preexisting OpenAlice：实际 timeline scroll 进度/唯一当前 step 验证缺口；待真实几何与末端 smoke。
  evidence: [INFERENCE] V2 `experiments/openalice-showcase/index.html:497-532,569,93-103,518-531`。触发待测：初始化稳定后真实滚动至各段与末端；待点中心公式、--progress、恰一个 aria-current=step，不仅 console clean/截图生成。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V3 · medium · preexisting OpenAlice：resize 后实际点/轨道/进度新几何验证缺口；待两个产生重排的 viewport smoke，与 B9/B11 不同 action。
  evidence: [INFERENCE] V3 `experiments/openalice-showcase/index.html:478-494,558,570-571,80-85,109-114,500-504`。触发待测：fonts/load 完成后改变窗口宽度造成真实重排；待轨道端点/点中心及随后进度消费新几何，不能仅核 CSS 文本。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V5 · medium · preexisting quality/benchmark：两个 benchmark CLI v3 root/cwd 真实消费者验证缺口；待真实 v3 素材且 cwd 不同于 --root 运行。
  evidence: [INFERENCE] V5 `skill/scripts/cli-core.cjs:1354-1358,1864-1866,1920-1923`、`skill/scripts/evaluate-benchmark.cjs:3`、`skill/scripts/benchmark-core.cjs:502-509`。触发待测：public 与 standalone CLI 执行合法 v3 实际磁盘素材；待 verdict/result/exit，不做 options 转发、echo 或 source 字符串断言。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V6 · medium · preexisting quality/benchmark：combined 多维独立 aggregates/aggregate=null 消费者验证缺口。
  evidence: [INFERENCE] V6 `skill/scripts/benchmark-core.cjs:458-473,489-499,502-509`、`skill/scripts/cli-core.cjs:1354-1360`、`skill/scripts/evaluate-benchmark.cjs:3`。触发待测：同次真实 fidelity 与 judgment combined 多维且值不同；待顶层/每 system scalar null、各维 map 独立正确，不用单维 fixture 外推。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V7 · high · preexisting quality/judgment：多 comparison 合法但不足 ceil human spotcheck 时 block 分支未验证。
  evidence: [INFERENCE] V7 `skill/scripts/judgment-core.cjs:391-395,427-441,399-445`、`skill/scripts/benchmark-core.cjs:394-404,484-487`。触发待测：至少两个 comparisons、非空合法 sample 少于 ceil(fraction*count) 且 agreement=1；待 sampled/required、覆盖原因、judgment 与 benchmark blocked。
- source_spec: `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`
  summary: V8 · high · preexisting quality/judgment：policy 多 dimension、有效 sealed plan 为 subset 时消费拒绝未验证，与 E20 逗号碰撞不同触发/action。
  evidence: [INFERENCE] V8 `skill/scripts/judgment-core.cjs:219-224,410,423-440`、`skill/scripts/benchmark-core.cjs:394-404`。触发待测：policy visual-taste+ux-clarity、合法 sealed plan 仅 visual-taste；待真实 evaluateBenchmark 拒绝/JUDGMENT_DIMENSION_COVERAGE，不产生完整 quality score。


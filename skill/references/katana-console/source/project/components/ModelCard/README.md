# ModelCard

模型卡：一个训练好的模型的身份证——类型、目标、特征、样本、训练方式、超参、代码与数据版本（全部映射 MLflow run）；KPI（OOS IC / Rank IC / Top 分位收益 / 训练窗 / 当前使用状态）；特征重要性条（含跨窗稳定性 σ，不稳的 amber）；校准图（预测十档 vs 实际）。不解释"为什么"，只给可核对的事实。

## 结构

- KPI 5 格：OOS IC（含 IS 对照）· Rank IC（含 ICIR）· Top 分位年化 · 训练窗 · 状态（哪条策略在用，阶段色）。
- 左上键值：类型 · 特征 · 样本 · 训练 · 超参 · 代码 commit · 数据版本。
- 左下校准：十档柱 `ink-200`，零线 `line-200`；单调即校准好，不打分。
- 右：特征重要性 Top 6 + `其他 ×n`，水平条 `ink-200`；稳定性 σ 大于阈值的条 amber（重要但不稳定 = 风险）。

## 交互

- 点击特征 → FactorLibrary 定位 / FactorIC 打开。
- 点击 run → RunInspector（MLflow 产物、参数、谱系）。
- 「对比」→ 多模型 ModelCard 并排（≤ 3），差异字段高亮 `ink-100`。
- 「重训」→ RunLauncher（train 类型）预填。
- 校准图悬停 → 档位样本数与置信区间。

## 规则

- 重要性方法（增益 / 置换 / SHAP 均值）必须标注；不同方法不混在一张条图里。
- 不显示"模型评分"、不显示"准确率"这种对回归无意义的数。
- IS 与 OOS 永远并列，不许只显示一个。
- 状态色跟 DeploymentBoard（paper 蓝 / live amber）。

## 谁提供什么

- 组件：model（research.md Model）、run、metrics、importance[]（feature、value、sigma、method）、calibration[]、usedBy、onOpenFeature、onRetrain。
- 调用方：MLflow 适配器（Query）。

# VolSurface

波动率曲面：到期 × Δ（或行权）的 IV 热力图 + 选中到期的微笑曲线（与昨收 / 任一历史日对比）。Fincept「Surface Analytics」的二维版——不做 3D，热力 + 切片比旋转曲面好读十倍。

## 结构

- 顶行：标的 · 时间 · 横轴 Segmented（按 Δ / 按行权）· 右侧 ATM 期限结构一行。
- 左热力：行 = 到期（≤ 8），列 = Δ 档（10P…ATM…10C，7 列）或行权 ±N 档；`seq-200..600` 顺序色，低 IV 接近面板色；选中格橙描边；格内写 IV 数值（对比度不足不写）。
- 右微笑：选中到期的 IV 曲线 `signal-orange` + 点；对比日 `ink-300` 虚线；底注偏度（25Δ P−C）与来源（数据源原始 / 拟合 run）。
- 期限结构在顶行文字；需要图时点开 PriceChart 多线变体。

## 交互

- 点击热力行 → 右侧微笑切到该到期；点击格 → OptionsChain 定位该合约。
- 对比日选择（昨收 / 一周前 / 自定义 / 事件前）→ 虚线换，实线不动。
- 刷选热力一块 → GreeksBoard 情景范围。
- 拟合 run 切换（SVI / SABR / 原始）→ 热力 `gentle` 过渡。

## 规则

- 原始 IV 与拟合 IV 必须可切换且标明；拟合残差 > 1 vol 的格加 `ink-400` 小点。
- 顺序色不是发散色：IV 没有"正负"。
- 不做 3D、不做动画旋转。
- 利率、分红、交易日历来自 Profile。

## 谁提供什么

- 组件：surface[][]（expiry × moneyness → iv）、axis、selectedExpiry、compare{date, smile[]}、termStructure[]、source、onPick。
- 调用方：期权行情 + 定价 Worker 或拟合 run（Query）。

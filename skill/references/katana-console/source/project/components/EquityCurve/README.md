# EquityCurve

净值曲线 + 镜像回撤。回测、策略实盘、分层对比的主图。

## 结构

- 上区净值：策略线 2px `series-n`，基准 1px 虚线 `chart-bench` 灰。多策略时按 `series-1..7` 固定顺序。
- 下区回撤：0 线以下的面，**点阵纹理填充**（`seq-300` 4px 实 2px 空），不用实色。
- 末点 `signal-orange` + glow，旁标最终净值；其余不标数值。
- 网格 `chart-grid`；轴文字 `num-sm` `chart-axis`；无外边框。

## 交互

- 十字线 + LCD 式 tooltip（日期 / 各序列值 / 回撤）；十字线跨 LinkGroup 同步。
- 刷选一段 → 该段写入 LinkContext.range；对数/线性 y 轴切换在局部工具条。
- 悬停图例一项 → 其他线 40%。

## 动效

- 首次出现（回测结果，研究产出）：线从左到右 300ms `gentle` 画出，回撤面随后升起，末点 `bouncy` + `run-done`。
- **实盘净值不用这套**：实盘曲线新点只做 `snappy` 延伸，盈亏同样处理，无结算反馈（§25）。
- 新数据：末端 `snappy` 延伸。

## 规则

- 不做双 Y 轴；净值与回撤是两个区，不是两个轴。
- 超过 7 条策略折进「其他」或拆小多图。
- 已完成的回测结果不随当前观察上下文改变。

## 谁提供什么

- 组件：series[{id,name,points}]、benchmark、drawdown、range、logScale、onBrush。
- 调用方提供已对齐的时间序列；组件不做重采样。

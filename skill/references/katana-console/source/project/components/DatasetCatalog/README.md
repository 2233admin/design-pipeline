# DatasetCatalog

数据集目录：研究用到的每份数据——源、字段数、频率、覆盖区间（条，amber 段是洞）、当前版本、是否 point-in-time。版本来自数据平台 / DVC；自算数据集（因子表）挂 run id。RunLauncher 第 4 步选的"数据 @ 版本"就是这里的行。

## 结构

- 顶行：类别 Segmented（全部 / 行情 / 财务 / 另类 / 自算）· 平台 · 覆盖轴范围。
- 列：数据集名 + 频率点阵标 · 源 · 字段数 · 覆盖条（`series-1`，洞 amber，停更部分 `ink-400`）· 版本（自算带 run）· PIT 标（绿 `PIT` / amber `非 PIT` / —）。
- 过期（超过预期更新周期）整行 `ink-300` + 版本后 amber "n 天未更"。
- 页脚：计数与去向。

## 交互

- 点击行 → 展开字段列表（名、类型、单位、空值率）与最近 5 个版本；点击版本 → RunLauncher 预填该版本。
- 点击覆盖条的洞 → DataQuality 定位该区间。
- 「浏览」→ SeriesBrowser 打开该数据集任一字段。
- 搜索 `/`：数据集 / 字段名。

## 规则

- 非 PIT 的数据集在 RunLauncher 里选中时 amber 提示"前视偏差风险"，不禁止。
- 版本不可变；"最新"在 run 启动时解析成具体版本。
- 覆盖与洞由数据平台的质量作业算，前端不扫数据。

## 谁提供什么

- 组件：datasets[]（id、source、freq、fields、coverage{from,to,gaps[]}、version、pit、stale、run?）、filter、onOpen、onPickVersion。
- 调用方：数据平台目录（Query）。

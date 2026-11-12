# Workspaces

工作区与面板模板的管理面板（blueprint 待卡落地）。两层：**Workspace**（命名的 Page 集合 + 通道初始上下文 + 记住的解析选择）与 **PanelSpec 模板**（单个面板的设置快照：Chart / DOM / Tape / Heatmap / Footprint 的参数 JSON）。

## 结构

- 工作区列表：名称、面板数与布局模板、联动组、最近打开、状态灯；缺失面板（面板包未装 / 适配器未连）显示占位而不是报错。
- 面板模板页：Save / Set as Default / Export / Favorites / 推荐库；模板是迁移单元——从 ATAS、TradingView 导入的布局先落成模板。
- 导入 diff：导入 JSON 时逐面板显示新增 / 覆盖 / 缺失，确认后合并。

## 交互

- 启动恢复上次工作区（可在 Preferences 关）；`workspace.open / save / export / import`。
- 恢复顺序照 FDC3：先建面板、等监听注册、再回放通道上下文。
- 模板拖到面板标题栏 = 应用模板。

## 规则

- 只保存**对象引用**（`katana.id` + version）与视图配置，不保存持仓、订单、余额、run 结果的副本——那些是运行时事实。
- 交易设置（快速模式 / 点击下单 / ExitStrategy 默认）是单一来源，存账户配置，不随工作区。
- URL 只负责 deep link（`/ws/desk?g.instrument=…`），完整现场在 Workspace 文档里。

## 谁提供什么

- 组件：workspaces[]、templates[]、current、diff。
- 前端：账户配置 Query（同步到后端的用户设置）。

## ATAS 对照

承接 Workspace Add/Load/Rename/Delete/Copy/Edit/Import/Export、记住上次 workspace、Workspace Editor、模块 Templates（Save / Default / Export / Favorites / Gallery）。不做 Layouts / working layers / Universal 层（Classic 多窗口产物）。

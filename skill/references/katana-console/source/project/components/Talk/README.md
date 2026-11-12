# Talk

ATAS Traders Talk 的对应：交易聊天流。不是自建社交网络，是**频道聚合**——社区频道（Telegram / Discord / Matrix 适配器）、团队频道、与 Agent 会话（AliceSessions）进同一条流；消息里的品种 / run / 订单号 / 策略名自动成为对象链接（悬停卡、右键动作）。

## 结构

- 左：频道列表（来源标：TG / DC / Matrix / 内），未读计数；"+ 接入频道"走 Extensions 的连接向导（凭证进 vault）。
- 右：消息流（时间 · 发言者 · 内容 · 来源标），Agent 发言用 `signal-blue`；输入框支持 `@Alice` 直接下任务。
- 面板可钉住跟随所有工作区（layout.md），也可弹出到新窗口。

## 交互

- 点消息里的对象 → 广播 instrument 或打开 run / 订单（四层 context 规则）。
- 消息右键：引用到 Notes、转为告警、转为提案（进 DecisionQueue）。
- 跟随 LinkGroup 可选：开启后只显示提到当前 instrument 的消息。

## 规则

- 外部频道只读 / 可写由适配器声明；写入走命令并留审计（Actor + Action）。
- 情绪不上色、不做排行榜；消息不触发任何交易动作，只有人确认过的提案才进队列。
- 频道内容不进对象模型（不写事实），只能被引用。

## 谁提供什么

- 组件：channels[]、messages[]、unread、linkFollow。
- 后端：聊天适配器（Telegram Bot / Discord / Matrix）、OpenAlice 会话流。

## ATAS 对照

承接 Traders Talk（社区聊天）。原则：能力 1:1——聊天有；操作我们的——频道聚合 + 对象链接，不自建社区。

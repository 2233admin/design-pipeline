# 综合与原文更正执行计划

## 文档契约

读者：用户与后续规格评审者；动作：决定是否批准窄对象级runtime observation/handoff实现；阶段：决策前研究报告。体裁：decision型研究综合；语域：中性技术〔待用户确认语域〕。研究完成不等于软件完成或批准。

## 顺序与证据

1. 保留brief.md、plan.md及既有.memlog条目；只在本研究目录改report/digests，新增可重复引用的时效输入。
2. 将四份Claude/Anthropic摘要以本轮read原文更正，记录Luna搜索摘要/浏览器timeout与lead direct成功的差异；不升级high crossvalidation状态。
3. 以反证digest的六官方sources构成替代方案边界；本地接点独立digest，只作本地实现证据。原Luna草稿标已被原文更正取代，不作为当前事实。
4. 写decision-first研究报告：findings/cross-dimension/contrary/recommendation/open questions/source appendix/staleness map；bind既定OpenSpec与BMAD spec，不实施。
5. 用memlog.py append source/decision/event（关键更正保持unverified）；从ledger提取已知日期claims交recon_kit.py staleness计算；未知发布日期明确不能计算，不用访问日伪装pub_date。tally计算counts；citations机械检查，semantic审查交Main新context。

## 检查

四个指定URL已read取得native或md全文；最终执行指定citation命令，目标dangling/orphaned为空。运行staleness与tally并记录真实结果。代码/QA由Main统管，本slice为研究不运行源码tests。Multica先list已超时20s，协调Main统一留痕，禁止重复票。

## 范围外

不扩大外部研究、不改源码/OpenSpec/BMAD spec、不访问或暴露可识别private target、不造客户端/新gate/receipt、不宣称运行一致性、性能、采用或提效。

## 保守补缺

当前help发布日期未标注，因此current-plan/compatibility仍unverified且立即重验；历史公告不能代替当前产品总况。Help全文新增Version history不支持、new-vs-legacy storage边界，仅按第一方声明描述，非实测。staleness按pack class计算，modified元数据单列不冒充publication。

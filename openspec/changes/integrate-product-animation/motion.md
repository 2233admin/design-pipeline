# 研究对象连续性运动

基础：`experiments/openalice-product-animation/MOTION.md`；设计：同目录 DESIGN.md / STORYBOARD.md。

7.5 秒样片已由主控正常速实播放行：同一证据落正文，真实版本缩略抽出并留驻，Inbox 附件承接原研究引用且原件不移动。此为扩片预检，不是用户视觉接受。完整 20 秒改为证据血缘图：0–2.5 原始来源；2.5–6.2 证据 trace 沿共享锚点移动；6.2–9.5 版本分支留驻；9.5–13.5 引用线进入 Inbox；13.5–16.5 完整关系静止可读；16.5–20 Ready for your review / No trade placed。

只有一个 desk 与一个原始 research.md。不得退出一张满屏面板再进入下一张。原 research、来源、版本与 Inbox 语义节点保持身份；移动的是 aria-hidden trace、连接路径与缩略状态。唯一同步 paused GSAP timeline 由 HyperFrames seek，preview 控制实时播放，duration/starts 随当前构图实值导出。

技术检查包括 graph track 编译、倒 seek 像素一致性、原对象/来源/版本留驻、引用与 Session 关联、正常速无输入播放、replay/pause/step、reduced motion/mobile、MP4 完整解码。任何技术 pass 不等于视觉接受。旧五场景断言和固定 24 秒断言失效。

第一版连续样片被主控否决为仍偏PPT（非整片放行）。修订动作：同一证据元素落入既有纸面；版本从纸面背后抽出，复制实际正文与来源而非文字标签卡；Inbox 新附件缩略承接引用。保留 sample-v1-overlap.mp4 与 sample-v2-panel-rejected.mp4 作为反例。

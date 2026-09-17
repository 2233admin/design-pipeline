# Integrate the product-animation route into osprey

Trace: CERE-482. The existing OpenAlice sample is a scroll webpage. A captured scroll is not a product video. Integrate routing commit `472a4514dd9d1e7fb64c39e7972349f300b71ce7`, produce an independently timed product film, inspect its encoded output, then decide whether a pipeline improvement is justified.

Preserve every dirty and untracked osprey file. Build a separate `experiments/openalice-product-animation` target in the `product-animation-integration` worktree, then merge only committed task changes into osprey. The existing showcase and its contracts remain a separate page deliverable.

The user explicitly requests generation and actual rendered-video inspection; this authorizes local rendering. No remote publishing, trading action, or upstream dependency upgrade is involved.

## 2026-09-17 已批准返工

旧五面板片被用户否定为PPT。当前以实施 spec-cere-482-product-animation-redesign.md 为准：研究对象连续补证、保存版本、Inbox 关联报告，最终只有 review / No trade placed。7.5 秒样片须先经主控正常速实播放行，才扩完整片；主控确认可调为20秒，不用静态留白填满26秒。旧片与证据在 output/rejected-24s 留存。原路由接入已经完成，本轮不改 shared pipeline、catalog准入，不提交或合并未批准草案。

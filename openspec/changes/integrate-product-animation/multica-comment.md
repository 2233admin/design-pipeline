领域: design-pipeline / 产品动画能力集成

已完成专用集成任务：路由修复 472a4514dd9d1e7fb64c39e7972349f300b71ce7 与真实产品短片已合入 osprey，代码提交 5fe0b31ef9cf38b376e110c2609ed0b5a8a84c4e。保持 in_review，由 principal 判定 done。

原现象：OpenAlice 样片是滚动网页，录制滚动不能满足产品动画交付。现在新增独立 experiments/openalice-product-animation，提供 24 秒、1280×720、30fps、720 帧 H.264 MP4，五个自动推进场景及四次转场；末尾始终保持人工批准待定，不演示自动交易。

工作身份：D:/projects/design-pipeline/product-animation-integration；分支 product-animation-integration；Codex session/thread 01a0af45-0f67-7392-b5f5-ae6f54242f36；Orca terminal term_61f17fb1-11b9-4d46-9176-e8e166957529。

实测与判据：
- [x] 预览零输入完整推进五个场景，scrollY 始终为 0。
- [x] 实际 MP4 在 Chromium 自动播放到 24 秒结束，720 帧、0 丢帧；FFmpeg 完整解码通过。
- [x] 从 MP4 解码检查 11 个时刻（含四处转场），另检查完整研究场景与原生视频播放截图。首轮发现标题重叠、SVG 进度跳变，修复后重渲染并复看。
- [x] 键盘暂停/重播、场景前后切换、倒序 seek 像素确定性、减弱动态效果、390px 控件布局通过；无 console/page errors、无远程请求。
- [x] 合入前后原有 24 个 dirty/untracked 用户文件哈希及 Git 状态字节一致，旧滚动样片和质量基线工作未修改。
- [x] task worktree QA 668/668（82 文件）；osprey 集成 QA 714/714（84 文件）；两处 installed-package smoke 11/11、可复现打包、状态不变检查均通过。
- [x] 两份 OpenSpec change 严格校验通过。

观看：D:/projects/design-pipeline/osprey/experiments/openalice-product-animation/watch.html（无需安装，直接播放已渲染 MP4）。视频：同目录 output/openalice.mp4。

证据：openspec/changes/integrate-product-animation/qa.md；evidence/qa-task.json、qa-osprey.json、osprey-before.json、osprey-preserved.json；experiments/openalice-product-animation/output/verification.json、contact-sheet.png、frame-*.png、encoded-playing.png。

视频 SHA-256：6a8c7886207907ae63e627622e7932e3878ac5441c3febd98cb53e12697e8764。

复现：在 experiments/openalice-product-animation 执行 npm ci，然后 npm run lint、npm run check、npm run render、npm run verify；仓库执行 node scripts/qa.cjs。需要 Chromium 与 FFmpeg，依赖版本已固定。详见目标 README。

边界：目录里的 HyperFrames 全局准入仍是 review/blocked；已如实保留 toolchain-plan。这次根据用户明确授权与现有 reference fallback 验证目标本地运行时，并未把一次样片升级为全局准入。成片为无声横版原创示意，不是实际产品 UI 录屏；未发布外网。只有完成成片视觉检查后，才补充现有 HyperFrames reference 的成片验证与时钟分离说明。

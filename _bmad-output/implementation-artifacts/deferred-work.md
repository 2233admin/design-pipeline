- source_spec: `_bmad-output/implementation-artifacts/spec-cere-482-product-animation-redesign.md`
  summary: 既有目标验证器的源码与 MP4 并列哈希只证明当前文件身份，不独立证明生成关系；本轮不新增渲染回执系统。
  evidence: 旧版 verify.cjs 已在验证末尾分别散列源码与现存视频。本次独立审阅再次指出，相同媒体元数据的另一份 MP4 不会仅因并列哈希而被拒绝。本轮成片另有实际 render 日志、完整解码与主控正常速度观看证据；用户要求暂停共享 pipeline 改进。

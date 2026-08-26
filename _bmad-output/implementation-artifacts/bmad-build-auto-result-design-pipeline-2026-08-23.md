---
status: blocked
---

# BMad 自动构建结果

状态：blocked
阻塞条件：工作区存在未提交改动，未满足 bmad-build-auto 的 Git 干净树要求。

检测到的改动包含用户正在进行的 OpenSpec 归档/删除、PRD、DesignMD 同步实现及测试文件；本次运行未回滚、未覆盖、未提交这些改动。

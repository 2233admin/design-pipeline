---
status: in-review
---

# 对象级 captured runtime review 与开发交接

## Why

已有 Playground 能验证已选择的 state/prompt，code-map 能声明对象到源码/token 的映射，但没有 public producer 把这些输入与实际声明源码字节、外部运行观察连接成离线对象 review。映射 shape、receipt 存在或一次截图不能证明当前实现已通过验收。

## What Changes

新增 public namespace `runtime-review build/check/record`：从已选择的 Playground、显式 UI IR/tokens/code-map、声明源码集、外部 captured observation 生成离线页面；选择对象查看实际读取的 source/token 与 captured evidence，填写 actual/expected/acceptance，复制开发 prompt、导出 JSON，再由显式 CLI 写回 change-local feedback。`check` 只读重核字节与已有 lineage，变化显示 stale；开发 agent 使用同一上下文修改 target 后重新采集、build/check，并通过既有执行流程核验。

单一 acceptedDesign 入口为 `playground-selection`，只覆盖现行 checker 核验的 state/surface/report/blueprint/selectionPrompt，不把另行声明的 UI IR/tokens/code-map 升格为已接受。Component Conformance 与 Visual Acceptance 保持独立。

## Non-goals

不实现 live client、运行采集器、自动源码修复、发布、全局 feedback 系统、新 gate/receipt/ledger；不复用 pipeline issue recorder 存对象反馈，不改变 Playground CSP/preset contract。

## Impact / Approval

本 change 已经用户 CHECKPOINT 1 明确 Approve 后进入实施与审查。核心接口、输入形状和责任边界仍以 `design.md` 为唯一详细合同；行为 delta 见 `specs/runtime-review/spec.md`。实施 driver 为开发 agent，approver 为用户，经主控呈交；实际核验证据归 `_bmad-output/implementation-artifacts/spec-runtime-review-handoff.md`，人类 CHECKPOINT 2 尚待，无预设截止日期。

触达 core、public CLI/help、schema/reference、package resource/test manifest 与用户文档；用户已有 dirty 文件须重新读取并最小接线，不覆盖 quality work。没有 runtime capture 或当前字节核验时，不得显示 pass/verified。成功信号是一个对象反馈能保留三类输入身份交给开发 agent，且任一被检查输入变化不能继承旧的匹配/验收显示。

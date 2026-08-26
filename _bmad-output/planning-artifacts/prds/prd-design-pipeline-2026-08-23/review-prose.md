# Editorial Prose Review — Design Pipeline 多来源设计工具与资源站支持

Purpose read: this document exists to help pipeline owners and downstream architecture/story workflows decide what multi-source design inputs the product supports and what it refuses to do.

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| prose | “所有可用于实现的结果必须落成有来源和 hash 的本地工件。” | “所有可用于实现的结果必须落成带来源和 hash 的本地工件。” | “带来源”更自然，保留技术术语和边界强度。 |
| prose | “本地导出物、受控同步或明确授权的外部 Host” | “本地导出物、受控同步或明确授权的外部 Host 输入” | 补足“进入管线”的动作，避免 Host 被误读为资源类型。 |
| prose | “支持 DesignMD 的五种 Resource Entry 类型” | “支持 DesignMD 的五类 Resource Entry” | “类型”与 Glossary 的 kind 字段重复；“五类”更简洁。 |
| prose | “工具可以被支持，但支持意味着可验证的输入/输出契约” | “工具可以被支持，但支持必须对应可验证的输入/输出契约” | 去掉口语化重复，增强条件关系。 |

Minor fixes only; no prose issue changes the product meaning or requires a structural rewrite.

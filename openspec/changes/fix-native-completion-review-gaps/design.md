# Design

Completion and its snapshot rechecks require a changed Git path in the current task's literal source scope or exact outputs. Dispatch, rebinding and rejection still inspect only the frozen authorization so an untouched task can be dispatched or repaired. Paths use the existing contained-path resolver and map into the captured Git root.

Exact check reports, completion metadata, `state.json` and `events.jsonl` never count as task work, even inside a broad declared directory scope. Other source and output files in that same directory remain eligible. The task delta must exist before capture and writes and remain observable through the final snapshot recheck. Existing scope failures, baseline preservation, CAS, current-snapshot invalidation and receipt lineage remain authoritative.

The component-eval fixture does not resolve a browser. Genuine browser scenarios use one test helper with existing Chrome/Puppeteer resolution and tool-missing skips; contract rejection scenarios run independently and explicitly inject an unavailable resolver. Rework fixtures produce changed page bytes rather than resubmitting identical output.

Ownership is limited to the existing runtime/test files named in the proposal and this change. Public commands, schemas and paths are unchanged; no migration is needed. The existing Git coverage and same-permission trust limits still apply. Technical completion never grants Visual Acceptance.

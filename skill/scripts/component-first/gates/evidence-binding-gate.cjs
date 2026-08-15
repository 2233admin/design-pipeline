"use strict";

const { finding, result } = require("./gate-helpers.cjs");

const GATE_ID = "component-first.evidence-binding";

function evaluateEvidenceBindingGate(context, policy) {
  const evidence = context.evidence;
  if (evidence.status === "invalid") {
    const findings = (evidence.errors || []).map((error) => finding(error.code || "CF_EVIDENCE_INPUT_INVALID", error.message || "evidence input is invalid", { id: error.id || null }));
    return result(GATE_ID, "invalid", evidence, policy, findings.length ? findings : [finding("CF_EVIDENCE_INPUT_INVALID", "evidence input is invalid")]);
  }
  const screenshots = Array.isArray(evidence.screenshots) ? evidence.screenshots : [];
  const findings = [];
  if (!screenshots.length) findings.push(finding("CF_EVIDENCE_MISSING", "browser screenshot evidence is missing"));
  for (const screenshot of screenshots) if (screenshot.status === "missing") findings.push(finding("CF_EVIDENCE_FILE_MISSING", `screenshot ${screenshot.id} is missing`, { id: screenshot.id, path: screenshot.path }));
  const readyIds = new Set(screenshots.filter(({ status }) => status === "ready").map(({ id }) => id));
  const referencedIds = new Set((context.pageUsage.routes || []).flatMap(({ uses }) => (uses || []).flatMap(({ evidenceIds }) => evidenceIds || [])));
  for (const id of referencedIds) if (!readyIds.has(id)) findings.push(finding("CF_EVIDENCE_REFERENCE_MISSING", `page usage references unavailable screenshot ${id}`, { id }));
  const evidenceRefs = screenshots.filter(({ status }) => status === "ready").map(({ id, path, sha256 }) => ({ id, kind: "screenshot", path, sha256 }));
  return result(GATE_ID, findings.length ? "blocked" : "passed", { evidence, referencedIds: [...referencedIds].sort() }, policy, findings, evidenceRefs);
}

module.exports = { GATE_ID, evaluateEvidenceBindingGate };

"use strict";

const { isObject, sortValue } = require("./pure-utils.cjs");

function createEvidenceRef(input) {
  if (!isObject(input) || typeof input.id !== "string" || !input.id.trim()) throw new Error("evidence ref id is required");
  if (typeof input.kind !== "string" || !input.kind.trim()) throw new Error("evidence ref kind is required");
  const ref = {
    id: input.id.trim(),
    kind: input.kind.trim(),
    path: typeof input.path === "string" && input.path.trim() ? input.path.replaceAll("\\", "/") : null,
    sha256: typeof input.sha256 === "string" && input.sha256 ? input.sha256 : null,
  };
  if (input.metadata !== undefined) ref.metadata = input.metadata;
  return sortValue(ref);
}

module.exports = { createEvidenceRef };

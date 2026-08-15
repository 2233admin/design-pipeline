"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { isObject, resolveInside, sortValue } = require("../../contract-utils.cjs");

const TARGET_KINDS = new Set(["production", "prototype", "sandbox"]);
const ID = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

function strings(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) throw new Error(`${label} must be a string array`);
  return [...new Set(value.map((item) => item.trim().replaceAll("\\", "/")))].sort();
}

function resolveTarget(projectRoot, input) {
  if (!isObject(input)) throw new Error("target is required");
  const allowed = new Set(["id", "root", "kind", "entrypoints", "routes", "snapshotDigest"]);
  const extras = Object.keys(input).filter((key) => !allowed.has(key));
  if (extras.length) throw new Error(`target has unsupported properties: ${extras.join(", ")}`);
  if (typeof input.id !== "string" || !ID.test(input.id)) throw new Error("target.id is invalid");
  if (!TARGET_KINDS.has(input.kind)) throw new Error(`target.kind is invalid: ${String(input.kind)}`);
  if (input.snapshotDigest !== null && input.snapshotDigest !== undefined && !/^sha256:[a-f0-9]{64}$/.test(input.snapshotDigest)) throw new Error("target.snapshotDigest must be null or sha256:<64 lowercase hex>");
  const root = typeof input.root === "string" && input.root.trim() ? input.root : ".";
  const targetRoot = resolveInside(projectRoot, root, "target.root", { scope: "component-first target", mustExist: true });
  if (!fs.statSync(targetRoot).isDirectory()) throw new Error("target.root must be a directory");
  const normalizedRoot = path.relative(path.resolve(projectRoot), targetRoot).split(path.sep).join("/") || ".";
  return {
    target: sortValue({
      id: input.id,
      root: normalizedRoot,
      kind: input.kind,
      entrypoints: strings(input.entrypoints || [], "target.entrypoints"),
      routes: strings(input.routes || [], "target.routes"),
      snapshotDigest: input.snapshotDigest ?? null,
    }),
    targetRoot,
  };
}

module.exports = { TARGET_KINDS, resolveTarget };

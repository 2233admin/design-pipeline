"use strict";

const { canonicalJson, isObject, sha256, sortValue } = require("./pure-utils.cjs");

const SECTIONS = Object.freeze(["target", "policy", "stack", "runtime", "components", "playground", "pageUsage", "evidence"]);

function createEvaluationContext(input) {
  if (!isObject(input)) throw new Error("evaluation context must be an object");
  const context = Object.fromEntries(SECTIONS.map((key) => [key, isObject(input[key]) ? input[key] : {}]));
  return sortValue(context);
}

function digestInput(value) {
  return sha256(canonicalJson(value));
}

module.exports = { SECTIONS, createEvaluationContext, digestInput };

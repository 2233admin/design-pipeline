"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { isObject, resolveInside, sortValue } = require("../../contract-utils.cjs");
const playgroundCore = require("../../playground-core.cjs");
const { COMPONENT_PLAYGROUND_PROFILE } = require("../profiles/component-playground-profile.cjs");

function resolvePlaygroundContext(input = {}, options = {}) {
  if (!isObject(input) || !Object.keys(input).length) return { status: "missing", required: true };
  try {
    const required = input.required !== false;
    const changeRoot = resolveInside(options.projectRoot, input.changeRoot, "playground.changeRoot", { scope: "component-first playground" });
    if (!fs.existsSync(changeRoot) || !fs.statSync(changeRoot).isDirectory()) return { status: "missing", required, artifact: input.artifact || "playground.json" };
    const artifact = input.artifact || "playground.json";
    const checker = options.checkPlayground || playgroundCore.checkPlayground;
    const result = checker(changeRoot, { artifact, stage: COMPONENT_PLAYGROUND_PROFILE.stage });
    let kind = null;
    const receiptPath = path.join(changeRoot, artifact);
    if (fs.existsSync(receiptPath)) kind = JSON.parse(fs.readFileSync(receiptPath, "utf8"))?.surface?.kind || null;
    return sortValue({
      status: "ready",
      required,
      kind,
      profile: COMPONENT_PLAYGROUND_PROFILE,
      result: {
        status: result.status,
        reason: result.reason || null,
        reasons: result.reasons || [],
        blockers: result.blockers || [],
        applicable: result.applicable !== false,
        selectionStatus: result.selectionStatus || null,
        integrationStatus: result.integrationStatus || null,
      },
      artifact: path.relative(options.projectRoot, receiptPath).split(path.sep).join("/"),
    });
  } catch (error) {
    return { status: "invalid", error: error.message };
  }
}

module.exports = { resolvePlaygroundContext };

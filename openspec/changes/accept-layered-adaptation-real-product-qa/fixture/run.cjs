#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../../../..");
const argumentIndex = process.argv.indexOf("--root");
const root = path.resolve(argumentIndex >= 0 ? process.argv[argumentIndex + 1] : path.join(os.tmpdir(), "design-pipeline-acceptance-fixture"));
process.env.DESIGN_PIPELINE_NOW = "2026-08-15T00:00:00.000Z";
const commands = [];
const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
function writeJson(relative, value) { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n"); return relative; }
function cli(args, expected = 0) {
  const child = spawnSync(process.execPath, [path.join(repoRoot, "skill/scripts/designer-pipeline.cjs"), ...args, "--json"], { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  let raw = null; try { raw = JSON.parse(child.stdout); } catch {}
  const value = raw?.result || raw;
  commands.push({ command: `node skill/scripts/designer-pipeline.cjs ${args.join(" ")} --json`, exit: child.status, status: value?.status || null, output: raw });
  if (child.status !== expected) throw new Error(`${commands.at(-1).command} exited ${child.status}: ${child.stderr || child.stdout}`);
  return value;
}
function evaluation(candidateHash, fixtureId) {
  return { schema: "design-pipeline.adaptation-evaluation.v1", manifestHash: sha256(fs.readFileSync(path.join(root, "evaluation-manifest.json"))), candidateHash, primaryMetric: "preference-adherence-score", fixtureIds: [fixtureId], complete: true, baseline: { score: 0, invariants: { accessibility: true, determinism: true, security: true } }, candidate: { score: 1, invariants: { accessibility: true, determinism: true, security: true } } };
}
function validatePlaygroundFeedback() {
  const ids = ["architecture-visualization", "component-design-adjustment", "layout-brainstorming", "game-balance"];
  const transitions = [];
  ids.forEach((id, index) => {
    const html = fs.readFileSync(path.join(root, "change", "playgrounds", id, "playground", "index.html"), "utf8");
    for (const marker of ["data-playground-control", "data-playground-preset", "data-playground-preview", "data-playground-prompt", "data-playground-copy"]) {
      if (!html.includes(marker)) throw new Error(`playground ${id} is missing ${marker}`);
    }
    const selected = { radius: 8, density: "compact", outlined: true };
    const prompt = `Update this surface to ${selected.density} spacing with a ${selected.radius}px radius while preserving accessibility.`;
    const nextTask = ids[index + 1] || null;
    let feedbackArtifact = null;
    if (nextTask) {
      const relative = `change/playgrounds/${nextTask}/feedback-from-${id}.md`;
      feedbackArtifact = writeJson(relative, { sourceTask: id, selected, prompt, promptSha256: sha256(prompt) });
    }
    transitions.push({ sourceTask: id, selected, prompt, promptSha256: sha256(prompt), nextTask, feedbackArtifact, feedbackApplied: Boolean(nextTask) });
  });
  writeJson("playground-feedback.json", { schema: "design-pipeline.playground-feedback.v1", transitions, interpretation: "Each user-adjusted prompt is written as the next task's explicit input; the template is only the initial strategy." });
  return transitions;
}
function proposeAndPromote(dimension, value, targetVersion, timestamp, evidenceOne, evidenceTwo) {
  const rules = writeJson(`adaptation/${dimension}.json`, [{ op: "add", id: dimension, rule: { dimension, value } }]);
  const proposed = cli(["adaptation", "propose", "--root", root, "--experience", evidenceOne.hash, "--evidence-hash", evidenceTwo.hash, "--scope", "project", "--proposer", `proposer-${dimension}`, "--skill", "external/project-skill.json", "--target-version", targetVersion, "--evaluation-manifest-sha256", sha256(fs.readFileSync(path.join(root, "evaluation-manifest.json"))), "--primary-metric", "preference-adherence-score", "--metric-direction", "maximize", "--construction-fixture", "construction-architecture", "--rules", rules]);
  const candidate = proposed.candidate;
  const replay = writeJson(`adaptation/${dimension}-replay.json`, evaluation(candidate.hash, `replay-${dimension}`));
  const heldOut = writeJson(`adaptation/${dimension}-held-out.json`, evaluation(candidate.hash, `held-out-${dimension}`));
  const evaluated = cli(["adaptation", "evaluate", "--root", root, "--candidate", candidate.id, "--replay", replay, "--held-out", heldOut, "--evaluator", `evaluator-${dimension}`]);
  const promoted = cli(["adaptation", "promote", "--root", root, "--candidate", candidate.id, "--receipt", evaluated.receipt.id, "--skill", "external/project-skill.json", "--approve", "--approval", `approved-${dimension}`, "--timestamp", timestamp]);
  return { candidate, promotion: promoted.promotion };
}

cli(["foundation", "check", "--root", root, "--project-root", root]);
cli(["direction", "check", "--root", root, "--change-root", "change", "--stage", "preview"]);
cli(["direction", "check", "--root", root, "--change-root", "change", "--stage", "selection"]);
for (const id of ["architecture-visualization", "component-design-adjustment", "layout-brainstorming", "game-balance"]) cli(["playground", "check", "--root", root, "--change-root", `change/playgrounds/${id}`, "--stage", "integration"]);
const playgroundFeedback = validatePlaygroundFeedback();
cli(["component", "decompose", "--root", root, "--query", "accessible paginated data grid dialog keyboard navigation"]);
cli(["component", "resolve", "--root", root, "--artifact", "component-request.json", "--write", "--output", "component-resolution.json"]);
const resolution = readJson("component-resolution.json");
writeJson("component-receipt.json", { schema: "design-pipeline.component-verification-receipt.v1", resolutionHash: resolution.resolutionHash, checks: resolution.requiredChecks.map((id) => ({ id, status: "pass", evidence: [`fixture:${id}`] })) });
cli(["component", "verify", "--root", root, "--artifact", "component-resolution.json", "--receipt", "component-receipt.json"]);

const evidenceOne = cli(["adaptation", "record", "--root", root, "--experience", "adaptation/experience-one.json", "--scope", "project", "--recorder", "fixture-recorder"]);
const evidenceTwo = cli(["adaptation", "record", "--root", root, "--experience", "adaptation/experience-two.json", "--scope", "project", "--recorder", "fixture-recorder"]);
const promotions = [];
for (const [dimension, value, timestamp] of [["communication-density", "concise", "2026-08-15T00:00:00.000Z"], ["representation", "diagram-first", "2026-08-15T00:01:00.000Z"], ["evidence-order", "evidence-first", "2026-08-15T00:02:00.000Z"]]) {
  promotions.push(proposeAndPromote(dimension, value, readJson("external/project-skill.json").version, timestamp, evidenceOne.experience, evidenceTwo.experience));
}
const effective = cli(["adaptation", "check", "--root", root]);
cli(["adaptation", "forget", "--root", root, "--candidate", promotions[0].candidate.id], 2);
for (const item of [...promotions].reverse()) cli(["adaptation", "rollback", "--root", root, "--promotion", item.promotion.id, "--skill", "external/project-skill.json"]);
for (const item of promotions) cli(["adaptation", "forget", "--root", root, "--candidate", item.candidate.id]);
const finalCheck = cli(["adaptation", "check", "--root", root]);
const ledger = path.join(root, ".design-pipeline", "adaptation", "state.json");
const summary = { schema: "design-pipeline.acceptance-run.v1", root, playgroundFeedback, promotions, effective, finalCheck, ledgerBytes: fs.statSync(ledger).size, ledgerSha256: sha256(fs.readFileSync(ledger)), commands };
fs.writeFileSync(path.join(root, "acceptance-run.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));

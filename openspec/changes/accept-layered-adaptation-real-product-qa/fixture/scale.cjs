#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { spawnSync } = require("node:child_process");
const adaptation = require("../../../../skill/scripts/adaptation-core.cjs");

process.env.DESIGN_PIPELINE_NOW = "2026-08-15T00:00:00.000Z";
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : null;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-scale-"));
const write = (relative, value) => { const file = path.join(root, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value)); return relative; };
const latencies = []; const ledgerBytes = [];
for (let index = 0; index < 20; index += 1) {
  const experience = write(`experience-${index}.json`, { schema: "design-pipeline.adaptation-experience.v1", signal: "explicit", evidence: [`task ${index} explicit correction`] });
  adaptation.record(root, { experience, scope: "task", recorder: "scale" });
  const started = performance.now(); const check = spawnSync(process.execPath, [path.resolve(__dirname, "../../../../skill/scripts/designer-pipeline.cjs"), "adaptation", "check", "--root", root, "--json"], { cwd: path.resolve(__dirname, "../../../.."), encoding: "utf8", windowsHide: true });
  latencies.push(performance.now() - started); if (check.status !== 0) throw new Error(`20-task check failed at ${index}: ${check.stdout || check.stderr}`);
  ledgerBytes.push(fs.statSync(path.join(root, ".design-pipeline", "adaptation", "state.json")).size);
}
const sorted = [...latencies].sort((a, b) => a - b); const percentile = (value) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))];
const result = { schema: "design-pipeline.maintainability-acceptance.v1", root, taskCount: 20, latencyMs: { p50: percentile(0.5), p95: percentile(0.95), max: Math.max(...latencies) }, ledgerBytes: { first: ledgerBytes[0], final: ledgerBytes.at(-1), growth: ledgerBytes.at(-1) - ledgerBytes[0] }, interpretation: "Synthetic task-recording and check workload only; ledger growth is not adaptation benefit." };
const serialized = JSON.stringify(result, null, 2) + "\n";
if (outputPath) { fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, serialized); }
console.log(serialized);

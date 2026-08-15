#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const argumentIndex = process.argv.indexOf("--root");
const root = path.resolve(argumentIndex >= 0 ? process.argv[argumentIndex + 1] : path.join(__dirname, "project"));
const manifestPath = path.join(root, "evaluation-manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const hash = crypto.createHash("sha256").update(fs.readFileSync(manifestPath)).digest("hex");
const partitions = Object.values(manifest.partitions).flat();
const uniquePartitions = new Set(partitions);
const overlap = partitions.length !== uniquePartitions.size;
const required = ["communication-density", "representation", "evidence-order"];
const rows = manifest.effectRows.filter((row) => required.includes(row.dimension)).map((row) => ({ dimension: row.dimension, correctionDelta: row.adapted.corrections - row.baseline.corrections, scoreDelta: Number((row.adapted.score - row.baseline.score).toFixed(4)), baseline: row.baseline, adapted: row.adapted, invariantsPass: Object.values(row.baseline.invariants || {}).every(Boolean) && Object.values(row.adapted.invariants || {}).every(Boolean) }));
const invariantsPass = rows.length === required.length && rows.every((row) => row.invariantsPass);
const result = { schema: "design-pipeline.acceptance-evaluation-result.v1", status: !overlap && manifest.evaluator.role === "independent-evaluator" && invariantsPass ? "ready" : "blocked", manifestSha256: hash, taskCount: manifest.taskIds.length, evaluatorRole: manifest.evaluator.role, partitions: manifest.partitions, partitionOverlap: overlap, invariantsPass, rows, interpretation: "Effect sizes from a synthetic controlled fixture; no generalization claim." };
fs.writeFileSync(path.join(root, "evaluation-result.json"), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));

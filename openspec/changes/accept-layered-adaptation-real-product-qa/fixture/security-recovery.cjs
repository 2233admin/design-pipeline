#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const adaptation = require("../../../../skill/scripts/adaptation-core.cjs");

process.env.DESIGN_PIPELINE_NOW = "2026-08-15T00:00:00.000Z";
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? path.resolve(process.argv[outputIndex + 1]) : null;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-recovery-"));
const lockRelative = ".design-pipeline/adaptation/state.json.lock";
const lockPath = (base) => path.join(base, lockRelative);
const write = (base, relative, value) => { const file = path.join(base, relative); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value)); return relative; };
const experience = (label) => ({ schema: "design-pipeline.adaptation-experience.v1", signal: "explicit", evidence: [`explicit ${label}`] });
const childScript = `const fs=require('node:fs');const path=require('node:path');const a=require(${JSON.stringify(path.resolve(__dirname,"../../../../skill/scripts/adaptation-core.cjs"))});const root=process.env.ACCEPT_ROOT;const exp=process.env.ACCEPT_EXP;const signal=process.env.ACCEPT_SIGNAL;const release=process.env.ACCEPT_RELEASE;const original=fs.readFileSync;fs.readFileSync=(file,...args)=>{if(path.resolve(String(file))===path.resolve(exp)){fs.writeFileSync(signal,'locked');while(!fs.existsSync(release))Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50);}return original(file,...args)};try{a.record(root,{experience:exp,scope:'project',recorder:process.env.ACCEPT_ACTOR});process.exit(0)}catch(error){console.error(error.message);process.exit(1)}`;

function waitFor(file, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!fs.existsSync(file) && Date.now() < end) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
  return fs.existsSync(file);
}
function child(exp, actor) {
  const signal = path.join(root, `${actor}.signal`); const release = path.join(root, `${actor}.release`); fs.rmSync(signal, { force: true }); fs.rmSync(release, { force: true });
  const processHandle = spawn(process.execPath, ["-e", childScript], { env: { ...process.env, ACCEPT_ROOT: root, ACCEPT_EXP: path.join(root, exp), ACCEPT_SIGNAL: signal, ACCEPT_RELEASE: release, ACCEPT_ACTOR: actor }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  return { processHandle, signal, release, output: "" };
}
function waitExit(item) { return new Promise((resolve) => item.processHandle.on("close", (code) => resolve({ code, signal: item.processHandle.signalCode, output: item.output }))); }

async function main() {
  write(root, "one.json", experience("one")); write(root, "two.json", experience("two"));
  const first = child("one.json", "first"); const second = child("two.json", "second");
  const started = waitFor(first.signal) || waitFor(second.signal); if (started) { if (fs.existsSync(first.signal)) fs.writeFileSync(first.release, "release"); if (fs.existsSync(second.signal)) fs.writeFileSync(second.release, "release"); }
  const concurrent = await Promise.all([waitExit(first), waitExit(second)]);
  const concurrentState = JSON.parse(fs.readFileSync(path.join(root, ".design-pipeline", "adaptation", "state.json"), "utf8"));

  write(root, "abort.json", experience("abort")); const aborted = child("abort.json", "aborted");
  const abortStarted = waitFor(aborted.signal); if (abortStarted) aborted.processHandle.kill();
  await waitExit(aborted); const recoveredAfterAbort = adaptation.check(root, {});

  const lockRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-lock-")); fs.mkdirSync(path.dirname(lockPath(lockRoot)), { recursive: true });
  fs.writeFileSync(lockPath(lockRoot), JSON.stringify({ pid: process.pid, token: "live" })); const live = adaptation.check(lockRoot, {}); const liveLockExists = fs.existsSync(lockPath(lockRoot)); fs.unlinkSync(lockPath(lockRoot)); fs.writeFileSync(lockPath(lockRoot), JSON.stringify({ pid: 2147483647, token: "dead" })); const dead = adaptation.check(lockRoot, {}); const deadLockExists = fs.existsSync(lockPath(lockRoot));

  const escapeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-path-")); const escape = (() => { try { adaptation.record(escapeRoot, { experience: "../escape.json", scope: "project", recorder: "path" }); return "unexpected-success"; } catch (error) { return error.message; } })();
  const tamperRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-tamper-")); const tamperExperience = write(tamperRoot, "experience.json", experience("tamper")); const recorded = adaptation.record(tamperRoot, { experience: tamperExperience, scope: "project", recorder: "tamper" }).experience; const tamperState = path.join(tamperRoot, ".design-pipeline", "adaptation", "state.json"); const tampered = JSON.parse(fs.readFileSync(tamperState, "utf8")); tampered.experiences[recorded.hash].explicit = false; fs.writeFileSync(tamperState, JSON.stringify(tampered)); const tamperCheck = adaptation.check(tamperRoot, {});
  let symlink = "not-attempted"; try { const outside = path.join(os.tmpdir(), "design-pipeline-symlink-target.json"); fs.writeFileSync(outside, JSON.stringify(experience("symlink"))); const link = path.join(escapeRoot, "linked.json"); fs.symlinkSync(outside, link, "file"); try { adaptation.record(escapeRoot, { experience: "linked.json", scope: "project", recorder: "symlink" }); symlink = "unexpected-success"; } catch (error) { symlink = error.message; } } catch (error) { symlink = `creation-unavailable: ${error.message}`; }
  const result = { schema: "design-pipeline.recovery-acceptance.v1", concurrent, committedExperienceCount: Object.keys(concurrentState.experiences).length, recoveredAfterAbort: { status: recoveredAfterAbort.status, lockExists: fs.existsSync(lockPath(root)) }, liveLock: { status: live.status, lockExists: liveLockExists }, deadLock: { status: dead.status, lockExists: deadLockExists }, pathEscape: escape, tamper: { status: tamperCheck.status, issue: tamperCheck.issues[0] }, symlink, root };
  const serialized = JSON.stringify(result, null, 2) + "\n";
  if (outputPath) { fs.mkdirSync(path.dirname(outputPath), { recursive: true }); fs.writeFileSync(outputPath, serialized); }
  console.log(serialized);
}
main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });

"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  isObject,
  readJson,
  sha256,
  sortValue,
} = require("./contract-utils.cjs");

const STATE_V2 = "design-pipeline.state.v2";
const V1_SCHEMAS = new Set(["design-pipeline.state.v1", "design-pipeline-state.v1"]);
const REGISTRY_V2 = "design-pipeline.phases.v2";
const V2_STATUSES = ["initialized", "planning", "ready", "implementing", "verifying", "complete", "blocked"];
const PHASE_ALIASES = {
  "stage-0-repo-read": "repo-read",
  "stage-1-brief": "brief",
  "stage-2-directions": "directions",
  "stage-3-design-spec": "design-spec",
  "stage-3-motion-spec": "motion-spec",
  "stage-4-tasks": "tasks",
  "stage-5-implementation": "implementation",
  "stage-6-gate-review": "gate-review",
  "stage-7-archive": "archive",
  verified: "verification",
  "archive-ready": "archive",
  "merge-ready": "release-readiness",
  "release-ready": "release-readiness",
};
const KNOWN_V1_FIELDS = new Set([
  "schema", "changeId", "status", "phase", "stage", "updatedAt", "artifactRoot", "projectRoot",
  "surfaces", "capabilities", "openSpec", "gbrain", "motion", "qa", "designFoundation",
  "designSynthesis", "decisions", "blockers", "next", "nextAction", "nextActions", "verification",
]);

function loadRegistry(registryFile = path.join(__dirname, "../references/pipeline-phases.json")) {
  return readJson(registryFile, "phase registry");
}

function phaseSet(registry, version) {
  const selected = registry.registries?.[version];
  if (!selected || !Array.isArray(selected.phases)) fail("pipeline state", `unknown registry version ${version}`, { code: "UNKNOWN_REGISTRY" });
  return new Set(selected.phases);
}

function validateV1(state) {
  assertObject(state, "state", "pipeline state");
  if (!V1_SCHEMAS.has(state.schema)) fail("pipeline state", `unsupported schema ${String(state.schema)}`, { code: "UNKNOWN_SCHEMA" });
  assertString(state.changeId, "changeId", "pipeline state");
  assertString(state.status, "status", "pipeline state");
  assertString(state.updatedAt, "updatedAt", "pipeline state");
  const legacyPhase = state.phase ?? state.stage;
  assertString(legacyPhase, state.phase ? "phase" : "stage", "pipeline state");
  if (!Object.hasOwn(PHASE_ALIASES, legacyPhase) && !legacyPhase.startsWith("stage-")) {
    fail("pipeline state", `unknown legacy phase/stage ${legacyPhase}`);
  }
  return state;
}

function validateFoundation(value, label) {
  if (value === null) return;
  assertKeys(value, ["path", "status", "sha256", "validator"], ["path", "status", "sha256", "validator"], label, "pipeline state");
  if (value.path !== null) assertString(value.path, `${label}.path`, "pipeline state");
  assertEnum(value.status, ["ready", "synthesis-required", "invalid", "unknown"], `${label}.status`, "pipeline state");
  if (value.sha256 !== null && !/^[a-f0-9]{64}$/i.test(value.sha256)) {
    fail("pipeline state", `${label}.sha256 must be null or SHA-256`);
  }
  if (value.validator !== null) assertString(value.validator, `${label}.validator`, "pipeline state");
}

function validateV2(state, options = {}) {
  assertKeys(
    state,
    ["schema", "registryVersion", "changeId", "status", "phase", "revision", "lastEventSeq", "updatedAt", "blockers", "nextActions", "foundations", "sceneRuntime", "evidence", "migration", "extensions"],
    ["schema", "registryVersion", "changeId", "status", "phase", "revision", "lastEventSeq", "updatedAt", "blockers", "nextActions", "foundations", "sceneRuntime", "evidence", "migration", "extensions"],
    "state",
    "pipeline state",
  );
  if (state.schema !== STATE_V2) fail("pipeline state", `schema must be ${STATE_V2}`);
  const registry = options.registry || loadRegistry(options.registryFile);
  const phases = phaseSet(registry, state.registryVersion);
  assertString(state.changeId, "changeId", "pipeline state");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(state.changeId)) fail("pipeline state", "changeId is invalid");
  assertEnum(state.status, V2_STATUSES, "status", "pipeline state");
  if (!phases.has(state.phase)) fail("pipeline state", `phase ${state.phase} is not in ${state.registryVersion}`);
  for (const field of ["revision", "lastEventSeq"]) {
    if (!Number.isInteger(state[field]) || state[field] < 0) fail("pipeline state", `${field} must be a non-negative integer`);
  }
  assertString(state.updatedAt, "updatedAt", "pipeline state");
  assertStringArray(state.blockers, "blockers", "pipeline state");
  assertStringArray(state.nextActions, "nextActions", "pipeline state");
  assertKeys(state.foundations, ["design", "motion"], ["design", "motion"], "foundations", "pipeline state");
  validateFoundation(state.foundations.design, "foundations.design");
  validateFoundation(state.foundations.motion, "foundations.motion");
  if (state.sceneRuntime !== null) assertObject(state.sceneRuntime, "sceneRuntime", "pipeline state");
  if (!Array.isArray(state.evidence)) fail("pipeline state", "evidence must be an array");
  if (state.migration !== null) assertObject(state.migration, "migration", "pipeline state");
  assertObject(state.extensions, "extensions", "pipeline state");
  return state;
}

function mapStatus(state, phase) {
  if (state.status === "complete") return "complete";
  if (state.status === "blocked") return "blocked";
  if (["ready-for-release", "needs-review"].includes(state.status)) return "verifying";
  if (state.status === "planned") return "planning";
  if (state.status === "archived") return "complete";
  if (["release-readiness", "verification", "gate-review"].includes(phase)) return "verifying";
  return "implementing";
}

function migrateV1(state) {
  validateV1(state);
  const legacyPhase = state.phase ?? state.stage;
  const phase = PHASE_ALIASES[legacyPhase] || legacyPhase.replace(/^stage-\d+-/, "");
  const nextActions = Array.isArray(state.nextActions)
    ? state.nextActions
    : Array.isArray(state.next)
      ? state.next
      : typeof state.nextAction === "string" && state.nextAction.trim()
        ? [state.nextAction]
        : [];
  const legacy = {};
  for (const key of ["artifactRoot", "projectRoot", "surfaces", "capabilities", "openSpec", "gbrain", "motion", "qa", "designSynthesis", "decisions", "verification"]) {
    if (Object.hasOwn(state, key)) legacy[key] = state[key];
  }
  const unknown = {};
  for (const [key, value] of Object.entries(state)) {
    if (!KNOWN_V1_FIELDS.has(key)) unknown[key] = value;
  }
  const design = isObject(state.designFoundation)
    ? {
        path: state.designFoundation.path ?? null,
        status: state.designFoundation.status ?? "unknown",
        sha256: state.designFoundation.sha256 ?? null,
        validator: null,
      }
    : null;
  const migrated = {
    schema: STATE_V2,
    registryVersion: REGISTRY_V2,
    changeId: state.changeId,
    status: mapStatus(state, phase),
    phase,
    revision: 0,
    lastEventSeq: 0,
    updatedAt: state.updatedAt,
    blockers: Array.isArray(state.blockers) ? state.blockers : [],
    nextActions,
    foundations: { design, motion: null },
    sceneRuntime: null,
    evidence: [],
    migration: {
      sourceSchema: state.schema,
      sourcePhaseField: typeof state.phase === "string" ? "phase" : "stage",
      sourceNextField: Array.isArray(state.nextActions) ? "nextActions" : Array.isArray(state.next) ? "next" : typeof state.nextAction === "string" ? "nextAction" : null,
      sourceStatus: state.status,
      sourceSha256: sha256(canonicalJson(state)),
    },
    extensions: { legacy, legacyStatus: state.status, unknown },
  };
  validateV2(migrated);
  return migrated;
}

function validateState(state, options = {}) {
  if (state?.schema === STATE_V2) return validateV2(state, options);
  if (V1_SCHEMAS.has(state?.schema)) return validateV1(state);
  fail("pipeline state", `unsupported schema ${String(state?.schema)}`, { code: "UNKNOWN_SCHEMA" });
}

function parseEvents(text, options = {}) {
  const lines = text.split(/\r?\n/);
  const events = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    let event;
    try { event = JSON.parse(lines[index]); } catch (error) {
      fail("pipeline events", `line ${index + 1}: ${error.message}`, { code: "EVENT_PARSE", line: index + 1 });
    }
    if (options.v2 !== false) {
      assertKeys(event, ["schema", "id", "seq", "ts", "phase", "type", "summary", "files", "evidence", "nextActions"], ["schema", "id", "seq", "ts", "phase", "type", "summary", "files", "evidence", "nextActions"], `line ${index + 1}`, "pipeline events");
      if (event.schema !== "design-pipeline.event.v2") fail("pipeline events", `line ${index + 1}: unsupported schema`);
      if (!Number.isInteger(event.seq) || event.seq !== events.length + 1) fail("pipeline events", `line ${index + 1}: seq must be ${events.length + 1}`);
      for (const key of ["id", "ts", "phase", "type", "summary"]) assertString(event[key], `line ${index + 1}.${key}`, "pipeline events");
      for (const key of ["files", "evidence", "nextActions"]) assertStringArray(event[key], `line ${index + 1}.${key}`, "pipeline events");
    }
    events.push(event);
  }
  return events;
}

function inspectConsistency(state, eventsText, options = {}) {
  validateV2(state, options);
  const events = parseEvents(eventsText);
  const maxSeq = events.at(-1)?.seq || 0;
  let status = "consistent";
  if (state.lastEventSeq > maxSeq) status = "state-ahead";
  if (state.lastEventSeq < maxSeq) status = "event-ahead";
  return { status, stateSeq: state.lastEventSeq, eventSeq: maxSeq, events };
}

function inferStatus(phase, requested) {
  if (requested) return requested;
  if (phase === "archive") return "complete";
  if (["gate-review", "verification", "release-readiness"].includes(phase)) return "verifying";
  if (phase === "implementation") return "implementing";
  if (phase === "tasks") return "ready";
  return "planning";
}

function eventLine(event) {
  return `${JSON.stringify(sortValue(event))}\n`;
}

function createEvent(state, input) {
  const seq = input.seq ?? state.lastEventSeq + 1;
  const event = {
    schema: "design-pipeline.event.v2",
    id: input.id || `dpe-${sha256(`${state.changeId}\0${seq}\0${input.timestamp}\0${input.type}\0${input.summary}`).slice(0, 20)}`,
    seq,
    ts: input.timestamp,
    phase: input.phase ?? state.phase,
    type: input.type,
    summary: input.summary,
    files: input.files || [],
    evidence: input.evidence || [],
    nextActions: input.nextActions || [],
  };
  parseEvents(eventLine({ ...event, seq: 1 }));
  return event;
}

function createInitialState(input) {
  const state = {
    schema: STATE_V2,
    registryVersion: REGISTRY_V2,
    changeId: input.changeId,
    status: input.status || "initialized",
    phase: input.phase || "repo-read",
    revision: 0,
    lastEventSeq: 0,
    updatedAt: input.timestamp,
    blockers: input.blockers || [],
    nextActions: input.nextActions || [],
    foundations: input.foundations || { design: null, motion: null },
    sceneRuntime: null,
    evidence: [],
    migration: null,
    extensions: {},
  };
  validateV2(state);
  return state;
}

function removeIfPresent(file) {
  try {
    if (fs.existsSync(file)) fs.rmSync(file);
  } catch {
    // Transaction cleanup must never hide the original failure or roll back a committed pair.
  }
}

function writeNewChange(stateFile, eventsFile, state, options = {}) {
  validateV2(state);
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  return withWriterLock(stateFile, () => {
    if (fs.existsSync(stateFile) || fs.existsSync(eventsFile)) {
      fail("pipeline state", "change state or event history already exists", { code: "ALREADY_EXISTS" });
    }
    const stateTemp = `${stateFile}.tmp-${process.pid}`;
    const eventsTemp = `${eventsFile}.tmp-${process.pid}`;
    let stateInstalled = false;
    let eventsInstalled = false;
    const trip = (name) => {
      if (options.failpoint === name) fail("pipeline state", `simulated initialization interruption at ${name}`, { code: "SIMULATED_INTERRUPTION" });
    };
    try {
      for (const [file, bytes] of [[stateTemp, canonicalJson(state)], [eventsTemp, ""]]) {
        const fd = fs.openSync(file, "wx");
        try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
      }
      trip("after-stage");
      fs.renameSync(eventsTemp, eventsFile);
      eventsInstalled = true;
      trip("after-events");
      fs.renameSync(stateTemp, stateFile);
      stateInstalled = true;
      trip("after-state");
      inspectConsistency(readJson(stateFile, "pipeline state"), fs.readFileSync(eventsFile, "utf8"));
    } catch (error) {
      if (stateInstalled && fs.existsSync(stateFile)) fs.rmSync(stateFile);
      if (eventsInstalled && fs.existsSync(eventsFile)) fs.rmSync(eventsFile);
      throw error;
    } finally {
      removeIfPresent(stateTemp);
      removeIfPresent(eventsTemp);
    }
    return { state, stateSha256: sha256(fs.readFileSync(stateFile)) };
  }, options);
}

function withWriterLock(stateFile, callback, options = {}) {
  const lock = `${stateFile}.lock`;
  let lockFd;
  let lockCreated = false;
  try {
    lockFd = fs.openSync(lock, "wx");
    lockCreated = true;
    fs.writeFileSync(lockFd, `${JSON.stringify({ pid: process.pid, createdAt: options.timestamp || null })}\n`);
    fs.fsyncSync(lockFd);
  } catch (error) {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    if (lockCreated) removeIfPresent(lock);
    fail("pipeline state", `writer lock exists: ${lock}`, { code: "LOCKED", cause: error.message });
  }
  try {
    return callback();
  } finally {
    fs.closeSync(lockFd);
    removeIfPresent(lock);
  }
}

function commitStateAndEvents(stateFile, eventsFile, state, eventsText, options = {}) {
  validateV2(state);
  const consistency = inspectConsistency(state, eventsText);
  if (consistency.status !== "consistent") {
    fail("pipeline state", `transaction output is ${consistency.status}`, { code: "INCONSISTENT_OUTPUT" });
  }
  const stateTemp = `${stateFile}.tmp-${process.pid}`;
  const eventsTemp = `${eventsFile}.tmp-${process.pid}`;
  const stateBackup = `${stateFile}.backup-${process.pid}`;
  const eventsBackup = `${eventsFile}.backup-${process.pid}`;
  const failpoint = options.failpoint;
  let stateBackedUp = false;
  let eventsBackedUp = false;
  let stateInstalled = false;
  let eventsInstalled = false;
  let committed = false;
  const trip = (name) => {
    if (failpoint === name) fail("pipeline state", `simulated interruption at ${name}`, { code: "SIMULATED_INTERRUPTION" });
  };
  try {
    for (const candidate of [stateTemp, eventsTemp, stateBackup, eventsBackup]) {
      if (fs.existsSync(candidate)) fail("pipeline state", `stale transaction artifact exists: ${candidate}`, { code: "STALE_TRANSACTION" });
    }
    for (const [file, bytes] of [[stateTemp, canonicalJson(state)], [eventsTemp, eventsText]]) {
      const fd = fs.openSync(file, "wx");
      try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    }
    const stagedState = JSON.parse(fs.readFileSync(stateTemp, "utf8"));
    inspectConsistency(stagedState, fs.readFileSync(eventsTemp, "utf8"));
    trip("after-stage");
    fs.renameSync(stateFile, stateBackup);
    stateBackedUp = true;
    fs.renameSync(eventsFile, eventsBackup);
    eventsBackedUp = true;
    trip("after-backup");
    fs.renameSync(eventsTemp, eventsFile);
    eventsInstalled = true;
    trip("after-events");
    fs.renameSync(stateTemp, stateFile);
    stateInstalled = true;
    trip("after-state");
    inspectConsistency(readJson(stateFile, "pipeline state"), fs.readFileSync(eventsFile, "utf8"));
    committed = true;
  } catch (error) {
    if (stateInstalled && fs.existsSync(stateFile)) fs.rmSync(stateFile);
    if (eventsInstalled && fs.existsSync(eventsFile)) fs.rmSync(eventsFile);
    if (stateBackedUp && fs.existsSync(stateBackup)) fs.renameSync(stateBackup, stateFile);
    if (eventsBackedUp && fs.existsSync(eventsBackup)) fs.renameSync(eventsBackup, eventsFile);
    throw error;
  } finally {
    if (committed) {
      stateBackedUp = false;
      eventsBackedUp = false;
    }
    for (const candidate of [stateTemp, eventsTemp, stateBackup, eventsBackup]) removeIfPresent(candidate);
  }
}

function requireExpectedState(stateFile, expectedSha256) {
  if (!/^[a-f0-9]{64}$/i.test(expectedSha256 || "")) {
    fail("pipeline state", "mutation requires expected state SHA-256", { code: "EXPECTED_HASH_REQUIRED" });
  }
  const current = fs.readFileSync(stateFile);
  const actual = sha256(current);
  if (actual !== expectedSha256.toLowerCase()) {
    fail("pipeline state", "expected input SHA-256 does not match", { code: "HASH_MISMATCH", expected: expectedSha256.toLowerCase(), actual });
  }
  return { bytes: current, state: JSON.parse(current.toString("utf8")), actual };
}

function advanceChange(stateFile, eventsFile, input) {
  return withWriterLock(stateFile, () => {
    const current = requireExpectedState(stateFile, input.expectedSha256);
    validateV2(current.state);
    const existingEvents = fs.readFileSync(eventsFile, "utf8");
    const consistency = inspectConsistency(current.state, existingEvents);
    if (consistency.status !== "consistent") {
      fail("pipeline state", `cannot advance ${consistency.status} history; run change repair`, { code: "REPAIR_REQUIRED", consistency: consistency.status });
    }
    const registry = loadRegistry();
    const targetPhase = input.phase || current.state.phase;
    if (targetPhase !== current.state.phase) {
      const allowed = registry.registries[current.state.registryVersion].transitions[current.state.phase] || [];
      if (!allowed.includes(targetPhase)) {
        fail("pipeline state", `transition ${current.state.phase} -> ${targetPhase} is not allowed`, { code: "INVALID_TRANSITION" });
      }
    }
    const status = inferStatus(targetPhase, input.status);
    const event = createEvent(current.state, {
      timestamp: input.timestamp,
      phase: targetPhase,
      type: input.type || "state-advance",
      summary: input.summary,
      files: input.files,
      evidence: input.evidence,
      nextActions: input.nextActions,
    });
    const state = {
      ...current.state,
      phase: targetPhase,
      status,
      revision: current.state.revision + 1,
      lastEventSeq: event.seq,
      updatedAt: input.timestamp,
      blockers: input.blockers || [],
      nextActions: input.nextActions || [],
      foundations: input.foundations ? { ...current.state.foundations, ...input.foundations } : current.state.foundations,
      evidence: input.evidence?.length ? [...new Set([...current.state.evidence, ...input.evidence])] : current.state.evidence,
    };
    validateV2(state);
    const history = existingEvents.trimEnd();
    const eventsText = `${history ? `${history}\n` : ""}${eventLine(event)}`;
    commitStateAndEvents(stateFile, eventsFile, state, eventsText, input);
    return { state, event, stateSha256: sha256(fs.readFileSync(stateFile)) };
  }, input);
}

function repairChange(stateFile, eventsFile, input) {
  return withWriterLock(stateFile, () => {
    const current = requireExpectedState(stateFile, input.expectedSha256);
    validateV2(current.state);
    const existingEvents = fs.readFileSync(eventsFile, "utf8");
    const consistency = inspectConsistency(current.state, existingEvents);
    if (consistency.status === "consistent") {
      fail("pipeline state", "state and events are already consistent", { code: "REPAIR_NOT_NEEDED" });
    }
    const baseSeq = consistency.eventSeq;
    const lastEvent = consistency.events.at(-1);
    const repairedPhase = lastEvent?.phase || current.state.phase;
    const repairEvent = createEvent(current.state, {
      seq: baseSeq + 1,
      timestamp: input.timestamp,
      phase: repairedPhase,
      type: "state-repair",
      summary: input.summary || `Explicitly repaired ${consistency.status} state/event history`,
      files: input.files?.length ? input.files : [path.basename(stateFile), path.basename(eventsFile)],
      evidence: input.evidence?.length ? input.evidence : [`previous-state-seq:${consistency.stateSeq}`, `previous-event-seq:${consistency.eventSeq}`],
      nextActions: input.nextActions?.length ? input.nextActions : lastEvent?.nextActions || [],
    });
    const state = {
      ...current.state,
      phase: repairedPhase,
      status: inferStatus(repairedPhase, input.status),
      revision: current.state.revision + 1,
      lastEventSeq: repairEvent.seq,
      updatedAt: input.timestamp,
      nextActions: repairEvent.nextActions,
      extensions: {
        ...current.state.extensions,
        lastRepair: { previousConsistency: consistency.status, previousStateSeq: consistency.stateSeq, previousEventSeq: consistency.eventSeq },
      },
    };
    const history = existingEvents.trimEnd();
    const eventsText = `${history ? `${history}\n` : ""}${eventLine(repairEvent)}`;
    commitStateAndEvents(stateFile, eventsFile, state, eventsText, input);
    return { previousConsistency: consistency.status, state, event: repairEvent, stateSha256: sha256(fs.readFileSync(stateFile)) };
  }, input);
}

function repairLegacyEvents(stateFile, eventsFile, input) {
  return withWriterLock(stateFile, () => {
    const current = requireExpectedState(stateFile, input.expectedSha256);
    validateV2(current.state);
    if (current.state.lastEventSeq !== 0) fail("pipeline state", "legacy event repair requires lastEventSeq 0", { code: "LEGACY_REPAIR_REJECTED" });
    const legacyBytes = fs.readFileSync(eventsFile);
    let legacyEvents;
    try { legacyEvents = parseEvents(legacyBytes.toString("utf8"), { v2: false }); }
    catch (error) { fail("pipeline state", `legacy events are not valid JSONL: ${error.message}`, { code: "LEGACY_EVENT_INVALID" }); }
    if (!legacyEvents.length) fail("pipeline state", "no legacy events require repair", { code: "REPAIR_NOT_NEEDED" });
    const repairEvent = createEvent(current.state, {
      seq: 1,
      timestamp: input.timestamp,
      phase: current.state.phase,
      type: "state-repair",
      summary: input.summary || "Migrated legacy event history to the v2 event contract",
      files: input.files?.length ? input.files : [path.basename(stateFile), path.basename(eventsFile)],
      evidence: input.evidence?.length ? input.evidence : [`legacy-events:${legacyEvents.length}`, `legacy-events-sha256:${sha256(legacyBytes)}`],
      nextActions: input.nextActions?.length ? input.nextActions : current.state.nextActions,
    });
    const state = {
      ...current.state,
      revision: current.state.revision + 1,
      lastEventSeq: 1,
      updatedAt: input.timestamp,
      nextActions: repairEvent.nextActions,
      extensions: {
        ...current.state.extensions,
        legacyEvents: { count: legacyEvents.length, sha256: sha256(legacyBytes) },
      },
    };
    commitStateAndEvents(stateFile, eventsFile, state, eventLine(repairEvent), input);
    return { previousConsistency: "legacy-events", state, event: repairEvent, stateSha256: sha256(fs.readFileSync(stateFile)) };
  }, input);
}

function clearStaleLock(stateFile, input) {
  requireExpectedState(stateFile, input.expectedSha256);
  const lock = `${stateFile}.lock`;
  if (!fs.existsSync(lock)) fail("pipeline state", "writer lock does not exist", { code: "LOCK_NOT_FOUND" });
  const ageMs = Date.now() - fs.statSync(lock).mtimeMs;
  const minimumAgeMs = input.minimumAgeMs ?? 300000;
  if (ageMs < minimumAgeMs) fail("pipeline state", `writer lock is not stale (${Math.floor(ageMs)}ms)`, { code: "LOCK_NOT_STALE", ageMs, minimumAgeMs });
  fs.rmSync(lock);
  return { status: "unlocked", lock, ageMs };
}

function writeCrashSafe(file, bytes, expectedSha256) {
  const current = fs.readFileSync(file);
  if (sha256(current) !== expectedSha256) fail("pipeline state", "expected input SHA-256 does not match", { code: "HASH_MISMATCH" });
  const lock = `${file}.lock`;
  let lockFd;
  try { lockFd = fs.openSync(lock, "wx"); } catch { fail("pipeline state", `writer lock exists: ${lock}`, { code: "LOCKED" }); }
  const temp = `${file}.tmp-${process.pid}`;
  const backup = `${file}.backup-${process.pid}`;
  try {
    const fd = fs.openSync(temp, "wx");
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    JSON.parse(fs.readFileSync(temp, "utf8"));
    fs.renameSync(file, backup);
    try { fs.renameSync(temp, file); } catch (error) { fs.renameSync(backup, file); throw error; }
    if (!fs.readFileSync(file).equals(Buffer.from(bytes))) {
      fs.renameSync(file, temp);
      fs.renameSync(backup, file);
      fail("pipeline state", "post-write verification failed", { code: "WRITE_VERIFY" });
    }
    fs.rmSync(backup);
  } finally {
    if (fs.existsSync(temp)) fs.rmSync(temp);
    if (lockFd !== undefined) fs.closeSync(lockFd);
    if (fs.existsSync(lock)) fs.rmSync(lock);
  }
}

function migrateFile(file, options = {}) {
  const source = fs.readFileSync(file);
  const state = JSON.parse(source.toString("utf8"));
  const migrated = migrateV1(state);
  const bytes = canonicalJson(migrated);
  if (options.write) {
    if (!/^[a-f0-9]{64}$/i.test(options.expectedSha256 || "")) fail("pipeline state", "--write requires --expected-sha256", { code: "EXPECTED_HASH_REQUIRED" });
    writeCrashSafe(file, bytes, options.expectedSha256.toLowerCase());
  }
  return { state: migrated, bytes, sourceSha256: sha256(source) };
}

module.exports = {
  PHASE_ALIASES,
  REGISTRY_V2,
  STATE_V2,
  V1_SCHEMAS,
  advanceChange,
  canonicalJson,
  clearStaleLock,
  commitStateAndEvents,
  createEvent,
  createInitialState,
  eventLine,
  inferStatus,
  inspectConsistency,
  loadRegistry,
  migrateFile,
  migrateV1,
  parseEvents,
  repairChange,
  repairLegacyEvents,
  requireExpectedState,
  validateState,
  validateV1,
  validateV2,
  writeCrashSafe,
  writeNewChange,
};

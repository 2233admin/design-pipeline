"use strict";

// Local, review-gated adaptation ledger.  This deliberately stores evidence and proposed rules
// only; it neither trains a model nor fetches/executes content from a candidate.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, isObject, rejectExecutable, resolveInside, sha256 } = require("./contract-utils.cjs");

const SCOPES = new Set(["task", "project", "user"]);
const RULE_OPS = new Set(["add", "replace", "delete"]);
const MAX_RULES = 1;
const MAX_RULE_BYTES = 64 * 1024;
const STATE_SCHEMA = "design-pipeline.adaptation-state.v1";
const EXPERIENCE_SCHEMA = "design-pipeline.adaptation-experience.v1";
const EVALUATION_SCHEMA = "design-pipeline.adaptation-evaluation.v1";
const POLICY_SCHEMA = "design-pipeline.adaptation-policy-input.v1";
const SKILL_SCHEMA = "design-pipeline.adaptation-skill.v1";
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SENSITIVE_KEYS = /^(?:address|demographics?|diagnosis|email|identity|personality|phone|rawTranscript|secrets?|tokens?|traits?)$/i;
const UNSAFE_GUIDANCE = /(?:(?:ignore|skip|bypass|disable|suppress|weaken|override|evade).{0,80}(?:gate|constraint|kernel|methodology|quality|safety|accessibility|security)|(?:gate|constraint|kernel|methodology|quality|safety|accessibility|security).{0,80}(?:ignore|skip|bypass|disable|suppress|weaken|override|evade)|(?:跳过|忽略|绕过|禁用|关闭|削弱).{0,40}(?:门禁|约束|内核|方法论|质量|安全|可访问性))/i;
const DIMENSION_VALUES = new Map([
  ["communication-density", new Set(["concise", "balanced", "detailed"])],
  ["question-sequencing", new Set(["one-at-a-time", "frontier-batch", "autonomous-defaults"])],
  ["representation", new Set(["prose-first", "table-first", "diagram-first", "playground-first"])],
  ["evidence-order", new Set(["conclusion-first", "evidence-first", "chronological"])],
  ["tool-presentation", new Set(["quiet", "summarized", "verbose"])],
  ["delivery-format", new Set(["summary", "patch-summary", "artifact-links", "full-report"])],
  ["workflow-sequence", new Set(["plan-first", "prototype-first", "test-first"])],
]);
const HELD_LEDGER_LOCKS = new Map();

function now(value) {
  const date = new Date(value || process.env.DESIGN_PIPELINE_NOW || Date.now());
  if (Number.isNaN(date.getTime())) fail("adaptation", "timestamp must be a valid date-time");
  return date.toISOString();
}

function text(value, label) {
  if (typeof value !== "string" || !value.trim()) fail("adaptation", `${label} is required`);
  return value.trim();
}

function actorDigest(value, label) { return hash({ kind: "adaptation-actor", value: text(value, label) }); }

function scope(value) {
  const selected = text(value, "scope");
  if (!SCOPES.has(selected)) fail("adaptation", "scope must be task, project, or user");
  return selected;
}

function statePath(root, raw) {
  return resolveInside(root, raw || ".design-pipeline/adaptation/state.json", "adaptation state", { scope: "adaptation" });
}

function emptyState() {
  return { schema: STATE_SCHEMA, experiences: {}, candidates: {}, receipts: {}, promotions: {}, tombstones: {}, history: [] };
}

function lockOwner(lockFile) {
  try {
    const owner = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    if (!isObject(owner) || !Number.isInteger(owner.pid) || owner.pid < 1 || typeof owner.token !== "string") fail("adaptation", "adaptation ledger lock is malformed", { code: "STATE_LOCKED" });
    return owner;
  } catch (error) {
    if (error?.code === "STATE_LOCKED") throw error;
    fail("adaptation", `cannot inspect adaptation ledger lock: ${error.message}`, { code: "STATE_LOCKED" });
  }
}

function processAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error?.code === "EPERM"; }
}

function acquireLedgerLock(root, raw) {
  const file = statePath(root, raw);
  const lockFile = `${file}.lock`;
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = crypto.randomBytes(16).toString("hex");
    const temporary = `${lockFile}.claim-${process.pid}-${token}`;
    fs.writeFileSync(temporary, canonicalJson({ pid: process.pid, token, acquiredAt: now() }), { encoding: "utf8", mode: 0o600, flag: "wx" });
    try {
      fs.linkSync(temporary, lockFile);
      HELD_LEDGER_LOCKS.set(lockFile, token);
      return { lockFile, token };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    } finally {
      try { fs.unlinkSync(temporary); } catch {}
    }
    const owner = lockOwner(lockFile);
    if (processAlive(owner.pid)) fail("adaptation", `adaptation ledger is busy in process ${owner.pid}`, { code: "STATE_LOCKED" });
    try { fs.unlinkSync(lockFile); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  fail("adaptation", "could not acquire adaptation ledger lock", { code: "STATE_LOCKED" });
}

function releaseLedgerLock(lock) {
  try {
    if (fs.existsSync(lock.lockFile) && lockOwner(lock.lockFile).token === lock.token) fs.unlinkSync(lock.lockFile);
  } finally { HELD_LEDGER_LOCKS.delete(lock.lockFile); }
}

function withLedgerLock(root, raw, operation) {
  const lock = acquireLedgerLock(root, raw);
  try { return operation(); }
  finally { releaseLedgerLock(lock); }
}

function loadState(root, raw) {
  const file = statePath(root, raw);
  if (!fs.existsSync(file)) return { file, state: emptyState() };
  let state;
  try { state = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { fail("adaptation", `cannot parse state: ${error.message}`, { code: "JSON_PARSE" }); }
  if (!isObject(state) || state.schema !== STATE_SCHEMA) fail("adaptation", "state has unsupported schema");
  for (const key of ["experiences", "candidates", "receipts", "promotions", "tombstones"]) {
    if (!isObject(state[key])) fail("adaptation", `state.${key} must be an object`);
  }
  if (!Array.isArray(state.history)) fail("adaptation", "state.history must be an array");
  const issues = integrityIssues(state);
  if (issues.length) fail("adaptation", issues.join("; "), { code: "STATE_INTEGRITY" });
  return recoverPrepared(root, { file, state });
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(6).toString("hex")}`;
  fs.writeFileSync(temporary, canonicalJson(value), { encoding: "utf8", mode: 0o600, flag: "wx" });
  fs.renameSync(temporary, file);
}

function save(loaded) { atomicWrite(loaded.file, loaded.state); }
function append(state, type, detail, timestamp) { state.history.push({ type, at: timestamp, ...detail }); }
function hash(value) { return sha256(canonicalJson(value)); }

function triggerFailpoint(options, point) {
  if (options.failpoint === point) fail("adaptation", `simulated failure at ${point}`, { code: "FAILPOINT" });
}

function candidatePayload(candidate) {
  return {
    experienceHash: candidate.experienceHash,
    evidenceHashes: candidate.evidenceHashes,
    incumbentVersion: candidate.incumbentVersion,
    targetSkill: candidate.targetSkill,
    incumbentHash: candidate.incumbentHash,
    evaluationManifestHash: candidate.evaluationManifestHash,
    primaryMetric: candidate.primaryMetric,
    metricDirection: candidate.metricDirection,
    constructionFixtureIds: candidate.constructionFixtureIds,
    scope: candidate.scope,
    proposerHash: candidate.proposerHash,
    rules: candidate.rules,
  };
}

function candidateDigest(candidate) { return hash(candidatePayload(candidate)); }
function receiptDigest(receipt) { const copy = { ...receipt }; delete copy.hash; delete copy.id; return hash(copy); }
function promotionPayload(promotion) {
  return {
    candidateId: promotion.candidateId,
    candidateHash: promotion.candidateHash,
    receiptId: promotion.receiptId,
    receiptHash: promotion.receiptHash,
    scope: promotion.scope,
    skill: promotion.skill,
    before: promotion.before,
    beforeHash: promotion.beforeHash,
    after: promotion.after,
    afterHash: promotion.afterHash,
    approvalHash: promotion.approvalHash,
    promotedAt: promotion.promotedAt,
    supersedes: promotion.supersedes || null,
  };
}
function promotionDigest(promotion) { return hash(promotionPayload(promotion)); }

function integrityIssues(state) {
  const issues = [];
  for (const [experienceHash, experience] of Object.entries(state.experiences)) {
    if (!HASH_PATTERN.test(experienceHash) || !isObject(experience) || experience.hash !== experienceHash || experience.sourceHash !== experienceHash || !SCOPES.has(experience.scope) || !HASH_PATTERN.test(experience.recorderHash || "") || experience.recordHash !== experienceDigest(experience)) issues.push(`experience ${experienceHash} is invalid`);
  }
  for (const [candidateId, candidate] of Object.entries(state.candidates)) {
    if (!isObject(candidate) || candidate.id !== candidateId || !HASH_PATTERN.test(candidate.hash || "") || !SCOPES.has(candidate.scope) || !["task-shadow", "proposed", "evaluated", "rejected", "promoted", "superseded", "rolled-back"].includes(candidate.status) || !Array.isArray(candidate.rules) || candidate.rules.length !== 1) { issues.push(`candidate ${candidateId} is invalid`); continue; }
    try { ruleList(candidate.rules); } catch (error) { issues.push(`candidate ${candidateId}: ${error.message}`); }
    if (candidate.hash !== candidateDigest(candidate)) issues.push(`candidate ${candidateId} hash drift`);
    if (!Array.isArray(candidate.evidenceHashes) || candidate.evidenceHashes.some((item) => !state.experiences[item])) issues.push(`candidate ${candidateId} has missing evidence`);
    if (!HASH_PATTERN.test(candidate.proposerHash || "") || !HASH_PATTERN.test(candidate.evaluationManifestHash || "") || !["maximize", "minimize"].includes(candidate.metricDirection) || !Array.isArray(candidate.constructionFixtureIds) || !candidate.constructionFixtureIds.length) issues.push(`candidate ${candidateId} has incomplete evaluation declaration`);
    if (candidate.scope !== "task" && (typeof candidate.targetSkill !== "string" || !HASH_PATTERN.test(candidate.incumbentHash || ""))) issues.push(`candidate ${candidateId} has no hash-bound incumbent skill`);
  }
  for (const [receiptId, receipt] of Object.entries(state.receipts)) {
    if (!isObject(receipt) || receipt.id !== receiptId || !HASH_PATTERN.test(receipt.hash || "") || !HASH_PATTERN.test(receipt.candidateHash || "") || !HASH_PATTERN.test(receipt.evaluatorHash || "")) { issues.push(`receipt ${receiptId} is invalid`); continue; }
    if (receipt.hash !== receiptDigest(receipt)) issues.push(`receipt ${receiptId} hash drift`);
    const candidate = state.candidates[receipt.candidateId]; const tombstone = state.tombstones[receipt.candidateId];
    if ((!candidate || candidate.hash !== receipt.candidateHash) && (!tombstone || tombstone.hash !== receipt.candidateHash)) issues.push(`receipt ${receiptId} has no hash-bound candidate`);
  }
  for (const [promotionId, promotion] of Object.entries(state.promotions)) {
    if (!isObject(promotion) || promotion.id !== promotionId || !HASH_PATTERN.test(promotion.hash || "") || !["prepared", "promoted", "superseded", "rollback-prepared", "rolled-back"].includes(promotion.status) || !["project", "user"].includes(promotion.scope)) { issues.push(`promotion ${promotionId} is invalid`); continue; }
    const receipt = state.receipts[promotion.receiptId];
    if (!receipt || receipt.hash !== promotion.receiptHash || receipt.candidateHash !== promotion.candidateHash || receipt.passed !== true) issues.push(`promotion ${promotionId} has no passing hash-bound receipt`);
    const candidate = state.candidates[promotion.candidateId]; const tombstone = state.tombstones[promotion.candidateId];
    if ((!candidate || candidate.hash !== promotion.candidateHash) && (!tombstone || tombstone.hash !== promotion.candidateHash)) issues.push(`promotion ${promotionId} has no hash-bound candidate`);
    if (promotion.contentForgottenAt) {
      if (promotion.status !== "rolled-back" || promotion.before || promotion.after) issues.push(`promotion ${promotionId} has an invalid forgetting disposition`);
    } else {
      if (!isObject(promotion.before) || !isObject(promotion.after) || promotion.beforeHash !== hash(promotion.before) || promotion.afterHash !== hash(promotion.after) || promotion.hash !== promotionDigest(promotion)) issues.push(`promotion ${promotionId} hash drift`);
    }
    if (promotion.status === "prepared" && (!candidate || candidate.status !== "evaluated")) issues.push(`promotion ${promotionId} has an inconsistent prepared disposition`);
    if (["promoted", "rollback-prepared"].includes(promotion.status) && (!candidate || candidate.status !== "promoted")) issues.push(`promotion ${promotionId} has an inconsistent active disposition`);
    if (promotion.status === "superseded" && (!candidate || candidate.status !== "superseded")) issues.push(`promotion ${promotionId} has an inconsistent superseded disposition`);
    if (promotion.status === "rolled-back" && candidate && candidate.status !== "rolled-back") issues.push(`promotion ${promotionId} has an inconsistent rollback disposition`);
    const normalizedSkill = String(promotion.skill || "").replaceAll("\\", "/").toLowerCase();
    if (!normalizedSkill || normalizedSkill === "skill" || normalizedSkill.startsWith("skill/")) issues.push(`promotion ${promotionId} targets the Methodology Kernel`);
    if (promotion.supersedes && (!state.promotions[promotion.supersedes] || state.promotions[promotion.supersedes].skill !== promotion.skill)) issues.push(`promotion ${promotionId} has an invalid predecessor`);
    const predecessor = promotion.supersedes ? state.promotions[promotion.supersedes] : null;
    if (predecessor && promotion.status === "prepared" && predecessor.status !== "promoted") issues.push(`promotion ${promotionId} prepared against a non-active predecessor`);
    if (predecessor && ["promoted", "rollback-prepared"].includes(promotion.status) && predecessor.status !== "superseded") issues.push(`promotion ${promotionId} did not supersede its predecessor`);
  }
  for (const [candidateId, candidate] of Object.entries(state.candidates)) {
    const dispositions = Object.values(state.promotions).filter((item) => item.candidateId === candidateId).map((item) => item.status);
    if (candidate.status === "promoted" && !dispositions.some((item) => ["promoted", "rollback-prepared"].includes(item))) issues.push(`candidate ${candidateId} has no active promotion disposition`);
    if (candidate.status === "superseded" && !dispositions.includes("superseded")) issues.push(`candidate ${candidateId} has no superseded promotion disposition`);
    if (candidate.status === "rolled-back" && !dispositions.includes("rolled-back")) issues.push(`candidate ${candidateId} has no rollback disposition`);
  }
  return issues;
}

function experienceDigest(experience) {
  return hash({ sourceHash: experience.sourceHash, scope: experience.scope, explicit: experience.explicit, repeated: experience.repeated, recordedAt: experience.recordedAt, recorderHash: experience.recorderHash });
}

function recoverPrepared(root, loaded) {
  let changed = false;
  for (const [promotionId, promotion] of Object.entries(loaded.state.promotions)) {
    if (!["prepared", "rollback-prepared"].includes(promotion.status)) continue;
    const target = targetSkill(root, promotion.skill);
    const currentHash = hash(target.skill);
    const candidate = loaded.state.candidates[promotion.candidateId];
    const recoveredAt = now();
    if (promotion.status === "prepared") {
      if (currentHash === promotion.beforeHash) {
        delete loaded.state.promotions[promotionId];
        append(loaded.state, "promotion-recovery-abort", { promotionId, candidateId: promotion.candidateId }, recoveredAt);
      } else if (currentHash === promotion.afterHash) {
        promotion.status = "promoted";
        candidate.status = "promoted";
        if (promotion.supersedes) {
          const predecessor = loaded.state.promotions[promotion.supersedes];
          predecessor.status = "superseded";
          loaded.state.candidates[predecessor.candidateId].status = "superseded";
        }
        append(loaded.state, "promotion-recovery-commit", { promotionId, candidateId: promotion.candidateId }, recoveredAt);
      } else {
        fail("adaptation", `prepared promotion ${promotionId} cannot be recovered because the external skill drifted`, { code: "STATE_INTEGRITY" });
      }
      changed = true;
      continue;
    }
    if (currentHash === promotion.afterHash) {
      promotion.status = "promoted";
      candidate.status = "promoted";
      if (promotion.supersedes) {
        const predecessor = loaded.state.promotions[promotion.supersedes];
        predecessor.status = "superseded";
        loaded.state.candidates[predecessor.candidateId].status = "superseded";
      }
      delete promotion.rollbackPreparedAt;
      append(loaded.state, "rollback-recovery-abort", { promotionId, candidateId: promotion.candidateId }, recoveredAt);
    } else if (currentHash === promotion.beforeHash) {
      promotion.status = "rolled-back";
      promotion.rolledBackAt ||= recoveredAt;
      candidate.status = "rolled-back";
      if (promotion.supersedes) {
        const predecessor = loaded.state.promotions[promotion.supersedes];
        predecessor.status = "promoted";
        loaded.state.candidates[predecessor.candidateId].status = "promoted";
      }
      delete promotion.rollbackPreparedAt;
      append(loaded.state, "rollback-recovery-commit", { promotionId, candidateId: promotion.candidateId }, recoveredAt);
    } else {
      fail("adaptation", `prepared rollback ${promotionId} cannot be recovered because the external skill drifted`, { code: "STATE_INTEGRITY" });
    }
    changed = true;
  }
  if (changed) save(loaded);
  return loaded;
}

function activePromotionIssues(root, state) {
  const issues = [];
  for (const promotion of Object.values(state.promotions).filter((item) => item.status === "promoted")) {
    try {
      const target = targetSkill(root, promotion.skill);
      if (hash(target.skill) !== promotion.afterHash) issues.push(`promotion ${promotion.id} external skill hash drift`);
    } catch (error) { issues.push(`promotion ${promotion.id}: ${error.message}`); }
  }
  return issues;
}

function rejectSensitiveKeys(value, label, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEYS.test(key)) fail("adaptation", `${label} contains sensitive profiling or secret field ${key}`);
    rejectSensitiveKeys(child, label, seen);
  }
}

function containsUnsafeGuidance(value, seen = new Set()) {
  if (typeof value === "string") return UNSAFE_GUIDANCE.test(value);
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  return Object.values(value).some((child) => containsUnsafeGuidance(child, seen));
}

function validateRuleContent(value, label) {
  if (!isObject(value)) fail("adaptation", `${label} must be an object`);
  rejectExecutable(value, label, "adaptation");
  rejectSensitiveKeys(value, label);
  if (containsUnsafeGuidance(value)) fail("adaptation", `${label} attempts to bypass an immutable boundary`);
  const allowed = new Set(["id", "dimension", "value", "appliesTo", "excludes", "expiresAt"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) fail("adaptation", `${label} has unsupported fields: ${unknown.join(", ")}`);
  if (Object.hasOwn(value, "id") && (typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.id))) fail("adaptation", `${label}.id is invalid`);
  if (typeof value.dimension !== "string" || !DIMENSION_VALUES.has(value.dimension)) fail("adaptation", `${label}.dimension is not an adaptive orchestration dimension`);
  if (!DIMENSION_VALUES.get(value.dimension).has(value.value)) fail("adaptation", `${label}.value is invalid for ${value.dimension}`);
  for (const key of ["appliesTo", "excludes"]) if (Object.hasOwn(value, key) && (!Array.isArray(value[key]) || !value[key].every((item) => typeof item === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(item)) || new Set(value[key]).size !== value[key].length)) fail("adaptation", `${label}.${key} must contain unique bounded ids`);
  if (Object.hasOwn(value, "expiresAt") && (typeof value.expiresAt !== "string" || Number.isNaN(new Date(value.expiresAt).getTime()))) fail("adaptation", `${label}.expiresAt must be a date-time`);
}

function validateBoundary(value, label) {
  if (!isObject(value)) fail("adaptation", `${label} must be an object`);
  const unknown = Object.keys(value).filter((key) => !["id", "description"].includes(key));
  if (unknown.length) fail("adaptation", `${label} has unsupported fields: ${unknown.join(", ")}`);
  if (typeof value.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.id)) fail("adaptation", `${label}.id is invalid`);
  if (Object.hasOwn(value, "description") && (typeof value.description !== "string" || !value.description.trim())) fail("adaptation", `${label}.description must be non-empty text`);
}

function validateExperienceArtifact(value) {
  if (!isObject(value) || value.schema !== EXPERIENCE_SCHEMA) fail("adaptation", `experience must use ${EXPERIENCE_SCHEMA}`);
  const allowed = new Set(["schema", "signal", "explicit", "repeated", "occurrences", "evidence"]);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) fail("adaptation", `experience has unsupported fields: ${unknown.join(", ")}`);
  if (!["explicit", "implicit"].includes(value.signal)) fail("adaptation", "experience.signal must be explicit or implicit");
  for (const key of ["explicit", "repeated"]) if (Object.hasOwn(value, key) && typeof value[key] !== "boolean") fail("adaptation", `experience.${key} must be boolean`);
  if (Object.hasOwn(value, "explicit") && value.explicit !== (value.signal === "explicit")) fail("adaptation", "experience.explicit contradicts experience.signal");
  if (Object.hasOwn(value, "occurrences") && (!Number.isInteger(value.occurrences) || value.occurrences < 1)) fail("adaptation", "experience.occurrences must be a positive integer");
  if (Object.hasOwn(value, "evidence") && (!Array.isArray(value.evidence) || value.evidence.length > 32 || !value.evidence.every((item) => typeof item === "string" && item.trim()) || new Set(value.evidence).size !== value.evidence.length)) fail("adaptation", "experience.evidence must contain unique non-empty strings");
  rejectSensitiveKeys(value, "experience");
}

function readArtifact(root, raw, label) {
  if (isObject(raw) || Array.isArray(raw)) {
    rejectExecutable(raw, label, "adaptation");
    return { file: null, value: raw, hash: hash(raw) };
  }
  const file = resolveInside(root, text(raw, label), label, { scope: "adaptation", mustExist: true });
  let value;
  try { value = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { fail("adaptation", `${label} must be JSON: ${error.message}`, { code: "JSON_PARSE" }); }
  rejectExecutable(value, label, "adaptation");
  return { file, value, hash: hash(value) };
}

function ruleList(value) {
  const rules = Array.isArray(value) ? value : value?.rules;
  if (!Array.isArray(rules) || rules.length !== MAX_RULES) fail("adaptation", "candidate must contain exactly one bounded rule entry");
  if (Buffer.byteLength(JSON.stringify(rules), "utf8") > MAX_RULE_BYTES) fail("adaptation", "rules exceed bounded size");
  rejectExecutable(rules, "rules", "adaptation");
  const ids = new Set();
  return rules.map((rule, index) => {
    if (!isObject(rule) || !RULE_OPS.has(rule.op)) fail("adaptation", `rule ${index} must have op add, replace, or delete`);
    const id = text(rule.id, `rule ${index}.id`);
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id) || ids.has(`${rule.op}:${id}`)) fail("adaptation", `rule ${index}.id is invalid or repeated`);
    ids.add(`${rule.op}:${id}`);
    if (rule.op === "delete") {
      if (Object.keys(rule).some((key) => !["op", "id"].includes(key))) fail("adaptation", `delete rule ${id} may not carry content`);
      return { op: rule.op, id };
    }
    if (!Object.hasOwn(rule, "rule") || !isObject(rule.rule)) fail("adaptation", `${rule.op} rule ${id} requires a rule object`);
    if (Object.hasOwn(rule.rule, "id")) fail("adaptation", `${rule.op} rule ${id} content may not redefine its id`);
    validateRuleContent(rule.rule, `rule ${id}`);
    if (Object.hasOwn(rule.rule, "id") && rule.rule.id !== id) fail("adaptation", `rule ${id} content id must match`);
    return { op: rule.op, id, rule: rule.rule };
  });
}

function id(prefix, payload) { return `${prefix}-${hash(payload).slice(0, 20)}`; }
function need(map, key, label) { const value = map[text(key, label)]; if (!value) fail("adaptation", `${label} not found: ${key}`, { code: "NOT_FOUND" }); return value; }

function record(root, options) {
  const artifact = readArtifact(root, options.experience || options.artifact, "--experience");
  validateExperienceArtifact(artifact.value);
  const loaded = loadState(root, options.state);
  const selectedScope = scope(options.scope || "task");
  const experience = {
    hash: artifact.hash, scope: selectedScope, sourceHash: artifact.hash,
    explicit: artifact.value.explicit === true || artifact.value.signal === "explicit",
    repeated: artifact.value?.repeated === true || Number.isInteger(artifact.value?.occurrences) && artifact.value.occurrences >= 2 || Array.isArray(artifact.value?.evidence) && artifact.value.evidence.length >= 2,
    recordedAt: now(options.timestamp), recorderHash: actorDigest(options.recorder || options.actor || "local", "recorder"),
  };
  experience.recordHash = experienceDigest(experience);
  const existing = loaded.state.experiences[experience.hash];
  if (existing && existing.scope !== experience.scope) fail("adaptation", "the same experience artifact cannot cross project, user, and task scopes", { code: "SCOPE_MISMATCH" });
  loaded.state.experiences[experience.hash] ||= experience;
  append(loaded.state, "record", { experienceHash: experience.hash, scope: selectedScope }, experience.recordedAt);
  save(loaded);
  return { status: "recorded", experience: loaded.state.experiences[experience.hash] };
}

function propose(root, options) {
  const rules = ruleList(readArtifact(root, options.rules || options.rule, "--rules").value);
  const loaded = loadState(root, options.state);
  const experience = need(loaded.state.experiences, options.experience, "experience");
  const incumbentVersion = text(options.targetVersion || options.incumbentVersion, "--target-version");
  const evaluationManifestHash = text(options.evaluationManifestHash, "--evaluation-manifest-sha256");
  if (!HASH_PATTERN.test(evaluationManifestHash)) fail("adaptation", "--evaluation-manifest-sha256 must be SHA-256");
  const primaryMetric = text(options.primaryMetric, "--primary-metric");
  const metricDirection = text(options.metricDirection, "--metric-direction");
  if (!new Set(["maximize", "minimize"]).has(metricDirection)) fail("adaptation", "--metric-direction must be maximize or minimize");
  const constructionFixtureIds = [...new Set(Array.isArray(options.constructionFixtureIds) ? options.constructionFixtureIds.map((item) => text(item, "--construction-fixture")) : [])];
  if (!constructionFixtureIds.length) fail("adaptation", "at least one --construction-fixture is required");
  const evidenceHashes = [...new Set([experience.hash, ...(Array.isArray(options.evidenceHashes) ? options.evidenceHashes : [])])];
  const evidence = evidenceHashes.map((evidenceHash) => need(loaded.state.experiences, evidenceHash, "evidence experience"));
  const candidateScope = scope(options.scope || experience.scope);
  if (candidateScope !== "task" && evidence.some((item) => item.scope !== candidateScope)) fail("adaptation", "durable candidate evidence must match its project or user scope", { code: "SCOPE_MISMATCH" });
  if (!experience.explicit && !experience.repeated) fail("adaptation", "single implicit/silent experience cannot produce a candidate", { code: "EVIDENCE_INSUFFICIENT" });
  let targetReference = null; let incumbentHash = null;
  if (candidateScope !== "task") {
    const target = targetSkill(root, options.skill);
    if (target.skill.scope !== candidateScope) fail("adaptation", "candidate scope must match external skill scope", { code: "SCOPE_MISMATCH" });
    if (target.skill.version !== incumbentVersion) fail("adaptation", "external skill version does not match candidate incumbent version", { code: "VERSION_MISMATCH" });
    targetReference = path.relative(path.resolve(root), target.file).replaceAll("\\", "/");
    incumbentHash = hash(target.skill);
    applyRules(target.skill, rules);
  }
  const candidate = { experienceHash: experience.hash, evidenceHashes, incumbentVersion, targetSkill: targetReference, incumbentHash, evaluationManifestHash, primaryMetric, metricDirection, constructionFixtureIds, scope: candidateScope, proposerHash: actorDigest(options.proposer || options.actor, "proposer"), rules, proposedAt: now(options.timestamp), status: candidateScope === "task" ? "task-shadow" : "proposed" };
  candidate.hash = candidateDigest(candidate);
  candidate.id = id("candidate", candidate);
  if (loaded.state.tombstones[candidate.id] || Object.values(loaded.state.tombstones).some((item) => item.hash === candidate.hash)) fail("adaptation", "a forgotten candidate cannot be reinstated", { code: "FORGOTTEN" });
  if (loaded.state.candidates[candidate.id]) fail("adaptation", `candidate already exists with status ${loaded.state.candidates[candidate.id].status}`, { code: "ALREADY_EXISTS" });
  loaded.state.candidates[candidate.id] = candidate;
  append(loaded.state, "propose", { candidateId: candidate.id, candidateHash: candidate.hash, experienceHash: candidate.experienceHash, scope: candidate.scope }, candidate.proposedAt);
  save(loaded);
  return { status: "proposed", candidate: { id: candidate.id, hash: candidate.hash, experienceHash: candidate.experienceHash, targetSkill: targetReference, incumbentHash, evaluationManifestHash, primaryMetric, metricDirection, scope: candidate.scope, proposerHash: candidate.proposerHash, ruleCount: rules.length, rules: candidate.rules } };
}

function evaluation(value) {
  if (!isObject(value)) fail("adaptation", "evaluation must be an object");
  if (value.schema !== EVALUATION_SCHEMA) fail("adaptation", `evaluation must use ${EVALUATION_SCHEMA}`);
  const allowed = new Set(["schema", "manifestHash", "candidateHash", "primaryMetric", "fixtureIds", "complete", "unknown", "baseline", "candidate"]);
  const unknownFields = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknownFields.length) fail("adaptation", `evaluation has unsupported fields: ${unknownFields.join(", ")}`);
  const baseline = value.baseline; const candidate = value.candidate;
  for (const [label, arm] of [["baseline", baseline], ["candidate", candidate]]) {
    if (!isObject(arm) || Object.keys(arm).some((key) => !["score", "invariants"].includes(key))) fail("adaptation", `evaluation.${label} must contain only score and invariants`);
  }
  if (!Number.isFinite(baseline.score) || !Number.isFinite(candidate.score)) fail("adaptation", "evaluation requires finite baseline and candidate scores");
  if (!isObject(baseline.invariants) || !isObject(candidate.invariants)) fail("adaptation", "evaluation requires baseline and candidate invariants objects");
  const baselineInvariantIds = Object.keys(baseline.invariants).sort();
  const candidateInvariantIds = Object.keys(candidate.invariants).sort();
  if (!baselineInvariantIds.length || JSON.stringify(baselineInvariantIds) !== JSON.stringify(candidateInvariantIds)) fail("adaptation", "evaluation invariant sets must be non-empty and identical");
  if (Object.values(baseline.invariants).some((item) => typeof item !== "boolean") || Object.values(candidate.invariants).some((item) => typeof item !== "boolean")) fail("adaptation", "evaluation invariants must be boolean");
  const regressions = Object.keys(baseline.invariants).filter((key) => baseline.invariants[key] === true && candidate.invariants[key] !== true);
  const manifestHash = text(value.manifestHash, "evaluation.manifestHash");
  const candidateHash = text(value.candidateHash, "evaluation.candidateHash");
  const primaryMetric = text(value.primaryMetric, "evaluation.primaryMetric");
  if (!HASH_PATTERN.test(manifestHash) || !HASH_PATTERN.test(candidateHash)) fail("adaptation", "evaluation manifestHash and candidateHash must be SHA-256");
  const fixtures = value.fixtureIds;
  if (!Array.isArray(fixtures) || !fixtures.length || !fixtures.every((item) => typeof item === "string" && item) || new Set(fixtures).size !== fixtures.length) fail("adaptation", "evaluation.fixtureIds must be a unique non-empty string array");
  if (typeof value.complete !== "boolean") fail("adaptation", "evaluation.complete must be boolean");
  if (Object.hasOwn(value, "unknown") && typeof value.unknown !== "boolean") fail("adaptation", "evaluation.unknown must be boolean");
  const unknown = value.complete !== true || value.unknown === true || Object.values(candidate.invariants).some((item) => item !== true);
  return { baselineScore: baseline.score, candidateScore: candidate.score, rawDifference: candidate.score - baseline.score, invariantRegressions: regressions, manifestHash, candidateHash, primaryMetric, fixtureIds: [...new Set(fixtures)], complete: !unknown };
}

function evaluate(root, options) {
  const loaded = loadState(root, options.state);
  const candidate = need(loaded.state.candidates, options.candidate, "candidate");
  if (!["proposed", "task-shadow"].includes(candidate.status)) fail("adaptation", "candidate is not available for evaluation", { code: "BLOCKED" });
  const evaluatorHash = actorDigest(options.evaluator || options.actor, "evaluator");
  if (evaluatorHash === candidate.proposerHash) fail("adaptation", "evaluator must differ from proposer", { code: "SEPARATION_REQUIRED" });
  const replay = readArtifact(root, options.replay, "--replay");
  const heldOut = readArtifact(root, options.heldOut || options["held-out"], "--held-out");
  const replayResult = evaluation(replay.value);
  const heldOutResult = evaluation(heldOut.value);
  replayResult.improvement = candidate.metricDirection === "maximize" ? replayResult.rawDifference : -replayResult.rawDifference;
  heldOutResult.improvement = candidate.metricDirection === "maximize" ? heldOutResult.rawDifference : -heldOutResult.rawDifference;
  const overlap = replayResult.fixtureIds.filter((item) => heldOutResult.fixtureIds.includes(item));
  const constructionOverlap = [...new Set([...replayResult.fixtureIds, ...heldOutResult.fixtureIds].filter((item) => candidate.constructionFixtureIds.includes(item)))];
  const passed = replayResult.candidateHash === candidate.hash && heldOutResult.candidateHash === candidate.hash && replayResult.manifestHash === candidate.evaluationManifestHash && heldOutResult.manifestHash === candidate.evaluationManifestHash && replayResult.primaryMetric === candidate.primaryMetric && heldOutResult.primaryMetric === candidate.primaryMetric && !overlap.length && !constructionOverlap.length && replayResult.complete && heldOutResult.complete && replayResult.improvement > 0 && heldOutResult.improvement > 0 && !replayResult.invariantRegressions.length && !heldOutResult.invariantRegressions.length;
  const receipt = { candidateId: candidate.id, candidateHash: candidate.hash, experienceHash: candidate.experienceHash, evaluatorHash, replayHash: replay.hash, heldOutHash: heldOut.hash, replay: replayResult, heldOut: heldOutResult, fixtureOverlap: overlap, constructionFixtureOverlap: constructionOverlap, passed, evaluatedAt: now(options.timestamp) };
  receipt.hash = receiptDigest(receipt);
  receipt.id = id("receipt", receipt);
  loaded.state.receipts[receipt.id] = receipt;
  candidate.status = passed ? "evaluated" : "rejected";
  append(loaded.state, "evaluate", { candidateId: candidate.id, candidateHash: candidate.hash, receiptId: receipt.id, receiptHash: receipt.hash, passed }, receipt.evaluatedAt);
  save(loaded);
  return { status: passed ? "passed" : "blocked", receipt: { ...receipt } };
}

function targetSkill(root, raw) {
  const requestedFile = resolveInside(root, text(raw, "--skill"), "--skill", { scope: "adaptation", mustExist: true });
  const file = fs.realpathSync(requestedFile);
  const realRoot = fs.realpathSync(path.resolve(root));
  const relative = path.relative(realRoot, file).replaceAll("\\", "/");
  const compared = ["win32", "darwin"].includes(process.platform) ? relative.toLowerCase() : relative;
  if (compared === "skill" || compared.startsWith("skill/")) fail("adaptation", "Methodology Kernel and packaged skill resources are immutable", { code: "KERNEL_IMMUTABLE" });
  let skill;
  try { skill = JSON.parse(fs.readFileSync(file, "utf8")); } catch (error) { fail("adaptation", `skill must be JSON: ${error.message}`, { code: "JSON_PARSE" }); }
  rejectExecutable(skill, "skill", "adaptation");
  if (!isObject(skill) || skill.schema !== SKILL_SCHEMA || !SCOPES.has(skill.scope) || skill.scope === "task" || typeof skill.version !== "string" || !skill.version.trim() || !Array.isArray(skill.rules) || skill.rules.length > 256) fail("adaptation", "skill must be an external versioned adaptation skill with schema, scope, version, and bounded rules");
  const unknown = Object.keys(skill).filter((key) => !["schema", "scope", "version", "rules"].includes(key));
  if (unknown.length) fail("adaptation", `skill has unsupported fields: ${unknown.join(", ")}`);
  const ids = new Set(); const dimensions = new Set();
  for (const rule of skill.rules) {
    if (!isObject(rule) || typeof rule.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(rule.id) || ids.has(rule.id)) fail("adaptation", "skill rules must have unique valid ids");
    ids.add(rule.id);
    validateRuleContent(rule, `skill rule ${rule.id}`);
    if (dimensions.has(rule.dimension)) fail("adaptation", "skill rules must have unique collaboration dimensions");
    dimensions.add(rule.dimension);
  }
  return { file, skill };
}

function applyRules(skill, rules) {
  const next = JSON.parse(JSON.stringify(skill));
  const byId = new Map(next.rules.map((rule) => [rule?.id, rule]));
  if (byId.size !== next.rules.length || [...byId.keys()].some((key) => typeof key !== "string")) fail("adaptation", "skill.rules must have unique string ids");
  for (const change of rules) {
    if (change.op === "add") { if (byId.has(change.id)) fail("adaptation", `rule already exists: ${change.id}`); const rule = { ...change.rule, id: change.id }; next.rules.push(rule); byId.set(change.id, rule); }
    if (change.op === "replace") { if (!byId.has(change.id)) fail("adaptation", `rule does not exist: ${change.id}`); const rule = { ...change.rule, id: change.id }; next.rules[next.rules.findIndex((item) => item.id === change.id)] = rule; byId.set(change.id, rule); }
    if (change.op === "delete") { if (!byId.has(change.id)) fail("adaptation", `rule does not exist: ${change.id}`); next.rules = next.rules.filter((item) => item.id !== change.id); byId.delete(change.id); }
  }
  const dimensions = new Set();
  for (const rule of next.rules) {
    if (dimensions.has(rule.dimension)) fail("adaptation", `skill cannot contain conflicting ${rule.dimension} rules`);
    dimensions.add(rule.dimension);
  }
  next.version = `${skill.version.split("+")[0]}+adapt-${hash(next.rules).slice(0, 12)}`;
  return next;
}

function promote(root, options) {
  const loaded = loadState(root, options.state);
  const candidate = need(loaded.state.candidates, options.candidate, "candidate");
  if (candidate.scope === "task") fail("adaptation", "task-scoped candidates cannot be promoted", { code: "BLOCKED" });
  if (candidate.status !== "evaluated") fail("adaptation", "candidate must have a passing evaluation before promotion", { code: "BLOCKED" });
  const receipt = need(loaded.state.receipts, options.receipt, "receipt");
  if (!receipt.passed || receipt.candidateHash !== candidate.hash || receipt.experienceHash !== candidate.experienceHash) fail("adaptation", "receipt is not a passing hash-bound receipt for this candidate", { code: "BLOCKED" });
  if (options.approve !== true || !text(options.approval, "--approval")) fail("adaptation", "promotion requires --approve and explicit --approval", { code: "APPROVAL_REQUIRED" });
  const supportingEvidence = candidate.evidenceHashes.map((item) => need(loaded.state.experiences, item, "evidence experience"));
  if (!(supportingEvidence.length >= 2 && supportingEvidence.every((item) => item.explicit === true)) && !supportingEvidence.some((item) => item.explicit === true && item.repeated === true)) {
    fail("adaptation", "promotion requires at least two distinct explicit evidence records", { code: "EVIDENCE_INSUFFICIENT" });
  }
  const target = targetSkill(root, options.skill);
  const targetReference = path.relative(path.resolve(root), target.file).replaceAll("\\", "/");
  if (targetReference !== candidate.targetSkill) fail("adaptation", "promotion target must match the candidate-bound external skill", { code: "SCOPE_MISMATCH" });
  if (target.skill.scope !== candidate.scope) fail("adaptation", "candidate scope must match external skill scope", { code: "SCOPE_MISMATCH" });
  if (target.skill.version !== candidate.incumbentVersion) fail("adaptation", "external skill version does not match candidate incumbent version", { code: "VERSION_MISMATCH" });
  const beforeHash = hash(target.skill);
  if (beforeHash !== candidate.incumbentHash) fail("adaptation", "external skill content has drifted since candidate construction", { code: "HASH_DRIFT" });
  const after = applyRules(target.skill, candidate.rules);
  const afterHash = hash(after);
  const activePredecessors = Object.values(loaded.state.promotions).filter((item) => item.status === "promoted" && item.skill === targetReference);
  if (activePredecessors.length > 1) fail("adaptation", "external skill has multiple active promotions", { code: "STATE_INTEGRITY" });
  const promotion = { candidateId: candidate.id, candidateHash: candidate.hash, receiptId: receipt.id, receiptHash: receipt.hash, scope: candidate.scope, skill: targetReference, before: target.skill, beforeHash, after, afterHash, approvalHash: hash({ kind: "adaptation-approval", value: text(options.approval, "--approval") }), promotedAt: now(options.timestamp), status: "prepared", supersedes: activePredecessors[0]?.id || null };
  promotion.hash = promotionDigest(promotion);
  promotion.id = id("promotion", promotion);
  loaded.state.promotions[promotion.id] = promotion;
  append(loaded.state, "promote-prepare", { promotionId: promotion.id, candidateId: candidate.id, receiptHash: receipt.hash, skill: promotion.skill, scope: candidate.scope }, promotion.promotedAt);
  save(loaded);
  triggerFailpoint(options, "promotion-after-prepare");
  atomicWrite(target.file, after);
  triggerFailpoint(options, "promotion-after-skill-write");
  promotion.status = "promoted";
  candidate.status = "promoted";
  if (promotion.supersedes) {
    const predecessor = loaded.state.promotions[promotion.supersedes];
    predecessor.status = "superseded";
    loaded.state.candidates[predecessor.candidateId].status = "superseded";
  }
  append(loaded.state, "promote", { promotionId: promotion.id, candidateId: candidate.id, receiptHash: receipt.hash, skill: promotion.skill, scope: candidate.scope }, promotion.promotedAt);
  try { save(loaded); }
  catch (error) {
    atomicWrite(target.file, target.skill);
    throw error;
  }
  return { status: "promoted", promotion: { id: promotion.id, candidateId: candidate.id, receiptId: receipt.id, skill: promotion.skill, beforeHash, afterHash } };
}

function reject(root, options) {
  const loaded = loadState(root, options.state); const candidate = need(loaded.state.candidates, options.candidate, "candidate");
  if (options.scope && scope(options.scope) !== candidate.scope) fail("adaptation", "scope does not match candidate");
  if (["promoted", "superseded"].includes(candidate.status)) fail("adaptation", "promoted or superseded candidate must be rolled back before rejection", { code: "BLOCKED" });
  candidate.status = "rejected"; candidate.rejection = { reasonHash: hash({ kind: "adaptation-rejection", value: text(options.reason, "--reason") }), rejectedAt: now(options.timestamp) };
  append(loaded.state, "reject", { candidateId: candidate.id, scope: candidate.scope, reasonHash: candidate.rejection.reasonHash }, candidate.rejection.rejectedAt); save(loaded);
  return { status: "rejected", candidateId: candidate.id };
}

function rollback(root, options) {
  const loaded = loadState(root, options.state); const promotion = need(loaded.state.promotions, options.promotion, "promotion");
  if (options.scope && scope(options.scope) !== promotion.scope) fail("adaptation", "scope does not match promotion");
  if (promotion.status !== "promoted") fail("adaptation", "promotion is not active", { code: "BLOCKED" });
  const target = targetSkill(root, options.skill || promotion.skill);
  if (options.skill && path.relative(root, target.file).replaceAll("\\", "/") !== promotion.skill) fail("adaptation", "rollback skill must match the promoted skill", { code: "SCOPE_MISMATCH" });
  if (hash(target.skill) !== promotion.afterHash) fail("adaptation", "skill has changed since promotion; refusing unsafe rollback", { code: "BLOCKED" });
  const promotedSkill = target.skill;
  const candidate = loaded.state.candidates[promotion.candidateId];
  promotion.status = "rollback-prepared";
  promotion.rollbackPreparedAt = now(options.timestamp);
  append(loaded.state, "rollback-prepare", { promotionId: promotion.id, candidateId: promotion.candidateId, scope: promotion.scope }, promotion.rollbackPreparedAt);
  save(loaded);
  triggerFailpoint(options, "rollback-after-prepare");
  atomicWrite(target.file, promotion.before);
  triggerFailpoint(options, "rollback-after-skill-write");
  promotion.status = "rolled-back";
  promotion.rolledBackAt = promotion.rollbackPreparedAt;
  delete promotion.rollbackPreparedAt;
  if (candidate) candidate.status = "rolled-back";
  if (promotion.supersedes) {
    const predecessor = loaded.state.promotions[promotion.supersedes];
    predecessor.status = "promoted";
    loaded.state.candidates[predecessor.candidateId].status = "promoted";
  }
  append(loaded.state, "rollback", { promotionId: promotion.id, candidateId: promotion.candidateId, scope: promotion.scope }, promotion.rolledBackAt);
  try { save(loaded); }
  catch (error) {
    atomicWrite(target.file, promotedSkill);
    throw error;
  }
  return { status: "rolled-back", promotionId: promotion.id };
}

function descendsFrom(state, promotion, ancestorIds) {
  const seen = new Set(); let current = promotion;
  while (current && !seen.has(current.id)) {
    if (ancestorIds.has(current.id)) return true;
    seen.add(current.id);
    current = current.supersedes ? state.promotions[current.supersedes] : null;
  }
  return false;
}

function forget(root, options) {
  const loaded = loadState(root, options.state); const candidate = need(loaded.state.candidates, options.candidate, "candidate");
  if (options.scope && scope(options.scope) !== candidate.scope) fail("adaptation", "scope does not match candidate");
  const candidatePromotionIds = new Set(Object.values(loaded.state.promotions).filter((item) => item.candidateId === candidate.id).map((item) => item.id));
  const dependentPromotions = candidatePromotionIds.size ? Object.values(loaded.state.promotions).filter((item) => descendsFrom(loaded.state, item, candidatePromotionIds)) : [];
  const liveDependencies = dependentPromotions.filter((item) => item.status !== "rolled-back");
  if (liveDependencies.length) fail("adaptation", `candidate is retained by live promotion chain ${liveDependencies.map((item) => item.id).join(", ")}; roll back the newest successor through this candidate before forgetting`, { code: "BLOCKED" });
  const forgottenAt = now(options.timestamp); const tombstone = { kind: "candidate", hash: candidate.hash, experienceHash: candidate.experienceHash, scope: candidate.scope, forgottenAt };
  loaded.state.tombstones[candidate.id] = tombstone; delete loaded.state.candidates[candidate.id];
  for (const promotion of dependentPromotions) { delete promotion.before; delete promotion.after; promotion.contentForgottenAt = forgottenAt; }
  append(loaded.state, "forget", { candidateId: candidate.id, hash: candidate.hash, scope: candidate.scope }, forgottenAt); save(loaded);
  return { status: "forgotten", tombstone };
}

function check(root, options) {
  let loaded;
  try { loaded = loadState(root, options.state); } catch (error) { return { status: "blocked", state: options.state || ".design-pipeline/adaptation/state.json", candidates: [], promotions: [], effectiveRules: [], tombstones: [], issues: [error.message] }; }
  const requestedScope = options.scope ? scope(options.scope) : null;
  const candidates = Object.values(loaded.state.candidates).filter((item) => !requestedScope || item.scope === requestedScope);
  const issues = activePromotionIssues(root, loaded.state);
  // Only active, promoted external versions contribute here. Shadow candidates are intentionally
  // excluded. User rules are overlaid first, then project rules take precedence by dimension.
  const effective = new Map(); const expiredRules = [];
  const checkedAt = new Date(now(options.timestamp)).getTime();
  for (const selectedScope of ["user", "project"]) {
    for (const promotion of Object.values(loaded.state.promotions).filter((item) => item.status === "promoted" && item.scope === selectedScope).sort((a, b) => `${a.promotedAt}:${a.id}`.localeCompare(`${b.promotedAt}:${b.id}`))) {
      for (const rule of promotion.before?.rules || []) effective.delete(rule.dimension);
      for (const rule of promotion.after?.rules || []) {
        if (rule.expiresAt && new Date(rule.expiresAt).getTime() <= checkedAt) { expiredRules.push({ id: rule.id, scope: selectedScope, promotionId: promotion.id }); continue; }
        effective.set(rule.dimension, { ...rule, scope: selectedScope, promotionId: promotion.id });
      }
    }
  }
  return { status: issues.length ? "blocked" : "ready", state: path.relative(root, loaded.file).replaceAll("\\", "/"), scope: requestedScope, candidates: candidates.map((item) => ({ id: item.id, hash: item.hash, scope: item.scope, status: item.status, experienceHash: item.experienceHash, evidenceHashes: item.evidenceHashes || [item.experienceHash], targetSkill: item.targetSkill, incumbentHash: item.incumbentHash, primaryMetric: item.primaryMetric, metricDirection: item.metricDirection, rules: item.rules })), receipts: Object.keys(loaded.state.receipts).length, promotions: Object.values(loaded.state.promotions).filter((item) => !requestedScope || item.scope === requestedScope).map((item) => ({ id: item.id, status: item.status, scope: item.scope, skill: item.skill, beforeHash: item.beforeHash, afterHash: item.afterHash, supersedes: item.supersedes || null })), effectiveRules: [...effective.values()], expiredRules, tombstones: Object.values(loaded.state.tombstones).filter((item) => !requestedScope || item.scope === requestedScope), issues };
}

// Deterministic, side-effect-free resolver. Rules are plain data selected in precedence order;
// immutable constraints and gates are carried separately and cannot be replaced by a layer.
function resolvePolicy(rootOrInput = {}, maybeInput) {
  let input = rootOrInput;
  if (typeof rootOrInput === "string") {
    const loaded = loadState(rootOrInput, maybeInput?.state);
    const activeIssues = activePromotionIssues(rootOrInput, loaded.state);
    if (activeIssues.length) fail("adaptation", activeIssues.join("; "), { code: "STATE_INTEGRITY" });
    input = { ...maybeInput };
    for (const promotion of Object.values(loaded.state.promotions).sort((a, b) => `${a.promotedAt}:${a.id}`.localeCompare(`${b.promotedAt}:${b.id}`))) {
      if (promotion.status !== "promoted") continue;
      input[promotion.scope] = [...(input[promotion.scope] || []), promotion.after?.rules || []];
    }
  }
  if (!isObject(input) || input.schema !== POLICY_SCHEMA) fail("adaptation", `policy input must use ${POLICY_SCHEMA}`);
  const allowed = new Set(["schema", "state", "timestamp", "defaults", "user", "project", "task", "constraints", "gates"]);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) fail("adaptation", `policy input has unsupported fields: ${unknown.join(", ")}`);
  for (const key of ["defaults", "user", "project", "task", "constraints", "gates"]) if (Object.hasOwn(input, key) && !Array.isArray(input[key])) fail("adaptation", `policy input.${key} must be an array`);
  rejectExecutable(input, "policy input", "adaptation");
  rejectSensitiveKeys(input, "policy input");
  for (const key of ["constraints", "gates"]) for (const [index, boundary] of (input[key] || []).entries()) validateBoundary(boundary, `policy input.${key}[${index}]`);
  const resolvedAt = now(input.timestamp);
  const resolvedAtMs = new Date(resolvedAt).getTime();
  const immutable = new Set([...(input.constraints || []).map((item) => item.id || item), ...(input.gates || []).map((item) => item.id || item)]);
  const selected = new Map(); const dropped = [];
  for (const [layer, source] of [["defaults", input.defaults], ["user", input.user], ["project", input.project], ["task", input.task]]) {
    const rules = (Array.isArray(source) ? source : source?.rules || []).flatMap((item) => Array.isArray(item) ? item : item?.rules || item);
    for (const rule of rules) {
      if (!isObject(rule) || typeof rule.id !== "string") { dropped.push({ layer, reason: "invalid-rule" }); continue; }
      try { validateRuleContent(rule, `${layer} rule ${rule.id}`); }
      catch (error) { dropped.push({ layer, id: rule.id, reason: containsUnsafeGuidance(rule) ? "unsafe-guidance" : "invalid-rule" }); continue; }
      if (rule.expiresAt && new Date(rule.expiresAt).getTime() <= resolvedAtMs) { dropped.push({ layer, id: rule.id, reason: "expired" }); continue; }
      if (immutable.has(rule.id)) { dropped.push({ layer, id: rule.id, reason: "immutable-boundary" }); continue; }
      const previous = selected.get(rule.dimension);
      if (previous) dropped.push({ layer: previous.layer, id: previous.id, reason: "overridden", overriddenBy: rule.id, dimension: rule.dimension });
      selected.set(rule.dimension, { ...rule, layer });
    }
  }
  return { status: "ready", resolvedAt, rules: [...selected.values()], constraints: input.constraints || [], gates: input.gates || [], receipt: { dropped } };
}

function locked(action) {
  return (root, options = {}) => withLedgerLock(root, options.state, () => action(root, options));
}

const publicActions = {
  record: locked(record), propose: locked(propose), evaluate: locked(evaluate), promote: locked(promote),
  reject: locked(reject), rollback: locked(rollback), forget: locked(forget),
};

function publicCheck(root, options = {}) {
  try { return withLedgerLock(root, options.state, () => check(root, options)); }
  catch (error) { return { status: "blocked", state: options.state || ".design-pipeline/adaptation/state.json", candidates: [], promotions: [], effectiveRules: [], tombstones: [], issues: [error.message] }; }
}

function publicResolvePolicy(rootOrInput = {}, maybeInput) {
  if (typeof rootOrInput !== "string") return resolvePolicy(rootOrInput, maybeInput);
  return withLedgerLock(rootOrInput, maybeInput?.state, () => resolvePolicy(rootOrInput, maybeInput));
}

function run(root, action, options) {
  if (action === "resolve") return publicResolvePolicy(root, { ...(options.input || {}), state: options.state });
  const actions = { check: publicCheck, ...publicActions };
  if (!actions[action]) fail("adaptation", `unknown action ${String(action)}`, { code: "UNKNOWN_COMMAND" });
  return actions[action](root, options);
}

module.exports = { applyRules, check: publicCheck, evaluate: publicActions.evaluate, forget: publicActions.forget, promote: publicActions.promote, propose: publicActions.propose, record: publicActions.record, reject: publicActions.reject, rollback: publicActions.rollback, resolvePolicy: publicResolvePolicy, run, STATE_SCHEMA };

"use strict";

// Decision roles (OpenSpec change adopt-ai-fluency-decision-roles): who may decide each checkpoint,
// who did decide each record, and the diligence statement rendered from those records.
//
// A checkpoint is a public `decide --stage` name, plus creative-intent. The delegation map says who
// may decide it: the owner always may; the agent only where the map hands it the checkpoint. Final
// acceptance (review) and creative intent are locked to the owner. `--by` is the recorder's claim,
// not proof of a human; the statement shows it so a mislabelled record is visible to the owner.

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, sha256 } = require("../contract-utils.cjs");
const { statementLine } = require("./rules.cjs");

const ROLES = ["owner", "agent"];
const LOCKED = new Set(["review", "creative-intent"]);
// Visual picks an art director may make under --director; final acceptance is never one of them.
const DIRECTED = new Set(["concept", "section", "sample"]);
// The stage ids each deliverable's stages use, mapped to the decide checkpoint that finishes them.
const CHECKPOINT_OF_STAGE = { intake: "intake", reference: "reference", concepts: "concept", style: "concept", components: "components", description: "description", sample: "sample", review: "review", deliver: "deliver", work: "deliver" };
const LABELS = { intake: "Intake", "creative-intent": "Creative intent", reference: "Reference", concept: "Direction", components: "Component sources", description: "Description", section: "Section review", sample: "Sample", review: "Final acceptance", deliver: "Delivery" };
// History arrays whose entries carry `by`; a record in one of them without `by` predates decision roles.
const HISTORIES = ["playbacks", "variants", "rounds", "descriptions", "sections", "samples", "drafts"];
const STATEMENT = path.join(".design-pipeline", "diligence.md");

// Web review checkpoints the agent self-checks by default (OpenSpec change owner-attention-asks): the
// owner meets the playback, the direction and the result, and keeps any of these with --keep.
const SELF_CHECKED = new Set(["components", "description", "section"]);

function defaultEntry(state, checkpoint) {
  const agent = ["reference", "deliver"].includes(checkpoint)
    || (checkpoint === "intake" && state.deliverable === "web" && state.tier === "quick")
    || (SELF_CHECKED.has(checkpoint) && state.deliverable === "web")
    || (DIRECTED.has(checkpoint) && Boolean(state.director));
  return { to: agent && !LOCKED.has(checkpoint) ? "agent" : "owner", ...(LOCKED.has(checkpoint) ? { locked: true } : {}), set: "default" };
}

// The checkpoint a stage finishes: a sectioned web build is reviewed section by section.
const checkpointOf = (state, stageId) => stageId === "build" && state.deliverable === "web" && state.tier !== "quick" ? "section" : CHECKPOINT_OF_STAGE[stageId];

// The checkpoints a project's stages reach, each with its default entry.
function defaultDelegation(state, stageIds) {
  const map = {};
  for (const id of stageIds) {
    const checkpoint = checkpointOf(state, id);
    if (checkpoint && !map[checkpoint]) map[checkpoint] = defaultEntry(state, checkpoint);
  }
  if (map.intake && state.tier !== "quick") map["creative-intent"] = defaultEntry(state, "creative-intent");
  // Every deliverable may record where its result went, even a tier without a deliver stage.
  if (!map.deliver) map.deliver = defaultEntry(state, "deliver");
  return map;
}

// Fills the map for a project that predates it, keeping every entry the owner already set.
function ensureDelegation(state, stageIds) {
  const defaults = defaultDelegation(state, stageIds);
  const current = state.delegation && typeof state.delegation === "object" ? state.delegation : {};
  const merged = { ...defaults, ...Object.fromEntries(Object.entries(current).filter(([key]) => defaults[key])) };
  const changed = canonicalJson(merged) !== canonicalJson(current);
  state.delegation = merged;
  return changed;
}

// --delegate hands checkpoints to the agent and --keep keeps them with the owner, on the intake record.
function applyDelegation(state, delegate = [], keep = []) {
  const known = Object.keys(state.delegation);
  for (const [list, to] of [[delegate, "agent"], [keep, "owner"]]) {
    for (const raw of list) {
      const checkpoint = String(raw).trim();
      if (!state.delegation[checkpoint]) fail("workflow", `unknown checkpoint "${checkpoint}". Fix: use one of ${known.join(", ")}`);
      if (to === "agent" && state.delegation[checkpoint].locked) fail("workflow", `${LABELS[checkpoint]} stays with the owner and cannot be delegated. Fix: drop --delegate ${checkpoint}`);
      state.delegation[checkpoint] = { ...state.delegation[checkpoint], to, set: "owner" };
    }
  }
}

// Who recorded this decision, checked against the delegation map; returns the role fields to store.
// `carryForward` is the one exception to an owner checkpoint (OpenSpec change
// owner-attention-change-tiers): a byte-only re-approval of a description the owner kept.
function recordRole(state, checkpoint, by, { carryForward = false } = {}) {
  if (!ROLES.includes(by)) fail("workflow", "--by is required: owner when these are the owner's words in this conversation, agent when you decided under delegation. Fix: add --by owner or --by agent");
  if (by === "owner") return { by };
  const entry = state.delegation?.[checkpoint];
  if (entry?.locked) fail("workflow", `${LABELS[checkpoint] || checkpoint} stays with the owner; only --by owner can record it`);
  if (carryForward && entry?.to === "owner") return { by, agent: state.assistedBy || "unspecified", carriedForward: true };
  if (entry?.to !== "agent") fail("workflow", `${LABELS[checkpoint] || checkpoint} is the owner's to decide. Fix: ask the owner and record with --by owner, or record the owner's delegation on the intake with --delegate ${checkpoint}`);
  return { by, agent: DIRECTED.has(checkpoint) && state.director ? state.director : state.assistedBy || "unspecified" };
}

// The page version a web review judged: the probe lineage its draft bound, shortened for reading.
const reviewedVersion = draft => draft?.inputHashes ? sha256(canonicalJson(draft.inputHashes)).slice(0, 12) : null;

// Stamps the role on what this decide call appended: the last entry of each history that grew, the
// intake object it wrote, and one entry in state.decisions.roles that the statement reads.
function stampRecord(state, before, checkpoint, role, options) {
  for (const key of HISTORIES) {
    const list = state.decisions[key];
    if (Array.isArray(list) && list.length > (before[key] ?? 0)) Object.assign(list.at(-1), role);
  }
  if (checkpoint === "intake" && state.decisions.intake && typeof state.decisions.intake === "object") Object.assign(state.decisions.intake, role);
  const answer = typeof options.answer === "string" && options.answer.trim() ? options.answer.trim().slice(0, 400) : null;
  state.decisions.roles = [...(Array.isArray(state.decisions.roles) ? state.decisions.roles : []), {
    stage: checkpoint, ...role,
    ...(options.verdict ? { verdict: options.verdict } : {}),
    ...(options.choice !== undefined && options.choice !== null ? { choice: String(options.choice) } : {}),
    ...(answer ? { answer } : {}),
    ...(options.tradeoff ? { tradeoff: options.tradeoff } : {}),
    ...(options.revision ? { revision: options.revision } : {}),
    ...(checkpoint === "review" && state.deliverable === "web" ? { version: reviewedVersion(state.decisions.drafts?.at(-1)) } : {}),
    at: new Date().toISOString(),
  }];
}

// The confirmed web playback card is the creative intent, recorded whole by the owner who confirmed it.
function recordCreativeIntent(state, card) {
  state.decisions.roles = [...state.decisions.roles, { stage: "creative-intent", by: "owner", verdict: "accept", answer: String(card).trim(), at: new Date().toISOString() }];
}

const historySizes = state => Object.fromEntries(HISTORIES.map(key => [key, Array.isArray(state.decisions?.[key]) ? state.decisions[key].length : 0]));

// --- the diligence statement --------------------------------------------------------------------

const stateHash = state => {
  const { updatedAt: _updated, ...rest } = state;
  return "sha256:" + sha256(canonicalJson(rest));
};

function describe(entry) {
  const what = [entry.verdict, entry.choice && entry.choice !== "skip" ? entry.choice : null, entry.choice === "skip" ? "skipped the questions" : null].filter(Boolean).join(" ");
  return `${LABELS[entry.stage] || entry.stage}${what ? `: ${what}` : ""}${entry.revision ? ` (${entry.revision} revision)` : ""}${entry.answer ? ` — "${entry.answer.replace(/\s*\r?\n\s*/g, " / ")}"` : ""}${entry.tradeoff ? ` (asked about: "${entry.tradeoff}")` : ""}`;
}

// Decisions stored as a single value rather than a history: each counts as unauthored when no role
// entry records its checkpoint, which is how every project recorded before decision roles looks.
const SCALARS = { intake: "intake", reference: "reference", concept: "concept", components: "components", delivered: "deliver" };
function unauthoredScalars(state, roles) {
  const recorded = new Set(roles.map(entry => entry.stage));
  return Object.entries(SCALARS).filter(([key, checkpoint]) => state.decisions?.[key] !== undefined && state.decisions[key] !== null && !recorded.has(checkpoint)).length;
}

function renderStatement(state, { delivered = null, deliveryCurrent = false, gates = {} } = {}) {
  const roles = Array.isArray(state.decisions?.roles) ? state.decisions.roles : [];
  const assisted = state.assistedBy || "unspecified";
  const owner = roles.filter(entry => entry.by === "owner");
  const agent = roles.filter(entry => entry.by === "agent");
  const unknown = HISTORIES.reduce((count, key) => count + (Array.isArray(state.decisions?.[key]) ? state.decisions[key].filter(item => !item.by).length : 0), 0)
    + unauthoredScalars(state, roles);
  // The owner's latest word on the result: a later "no" means the earlier acceptance no longer stands.
  const reviewed = owner.filter(entry => entry.stage === "review").at(-1);
  const accepted = reviewed?.verdict === "accept" ? reviewed : null;
  const delivery = !delivered ? "not delivered yet"
    : state.decisions?.deliveredSha256 ? `${delivered} (${state.decisions.deliveredSha256})`
    : /^[a-z][a-z0-9+.-]*:\/\//i.test(String(delivered)) ? `${delivered} (remote destination; bound to the reviewed inputs, not the page itself)`
    : String(delivered);
  const notStated = [];
  if (state.decisions?.intake?.skipped) notStated.push("Intake: the owner skipped the questions; the agent stated its decisions instead");
  if (state.delegation?.["creative-intent"] && !roles.some(entry => entry.stage === "creative-intent" && entry.by === "owner")) notStated.push("Creative intent: not stated by the owner");
  const list = (items, empty) => items.length ? items.map(item => `- ${item}`).join("\n") : `- ${empty}`;
  const delegation = Object.entries(state.delegation || {}).map(([checkpoint, entry]) => `${LABELS[checkpoint] || checkpoint}: ${entry.to}${entry.locked ? " (locked)" : ""}${entry.set === "owner" ? " (set by the owner)" : ""}`);
  const checks = Object.entries(gates).map(([gate, record]) => `${gate}: ${record?.status ?? "unknown"}`);
  return [
    "# AI diligence statement",
    "",
    `Project: ${state.deliverable}/${state.tier} · State: ${stateHash(state)} · Assisted by: ${assisted}`,
    `Delivered: ${delivery}${delivered && !deliveryCurrent ? " (delivery no longer matches the reviewed inputs)" : ""}`,
    "",
    "## Decided by the owner",
    list(owner.map(describe), "none recorded"),
    "",
    "## Decided by the agent under delegation",
    list(agent.map(entry => `${describe(entry)} (agent: ${entry.agent}; ${entry.carriedForward ? "carried forward a byte-only change to the owner's description" : state.delegation?.[entry.stage]?.set === "owner" ? "delegated by the owner" : "delegated by default"})`), "none"),
    "",
    "## Not stated by the owner",
    list(notStated, "nothing"),
    "",
    "## Records without an author",
    `- ${unknown} decision record(s) predate decision roles`,
    "",
    "## Delegation",
    list(delegation, "no checkpoints"),
    "",
    "## The owner's \"no\", in their words",
    list((state.rules || []).map(rule => statementLine(rule, roles)), "none"),
    "",
    "## Technical checks (not creative acceptance)",
    list(checks, "none recorded"),
    "",
    "## Owner acceptance",
    `- ${accepted ? `Final acceptance recorded by the owner at ${accepted.at}${accepted.version ? ` on page version ${accepted.version}` : ""}${accepted.answer ? `: "${accepted.answer}"` : ""}` : reviewed ? `No owner acceptance stands: their latest review (${reviewed.at}) was a rejection` : "No owner acceptance recorded yet"}`,
    "",
    `Suggested trailer: Assisted-by: ${assisted}`,
    "",
  ].join("\n");
}

function writeStatement(root, state, context) {
  const file = path.join(root, STATEMENT);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderStatement(state, context));
  return STATEMENT.split(path.sep).join("/");
}

// The statement on disk is current when it was rendered from this exact state and any recorded
// delivery still matches what was reviewed.
function statementStatus(root, state, deliveryCurrent) {
  const file = path.join(root, STATEMENT);
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const current = Boolean(text && text.includes(`State: ${stateHash(state)} `) && (!state.decisions?.delivered || deliveryCurrent));
  return { path: STATEMENT.split(path.sep).join("/"), current };
}

module.exports = { DIRECTED, LOCKED, ROLES, SELF_CHECKED, STATEMENT, applyDelegation, checkpointOf, defaultDelegation, ensureDelegation, historySizes, recordCreativeIntent, recordRole, renderStatement, stampRecord, stateHash, statementStatus, writeStatement };

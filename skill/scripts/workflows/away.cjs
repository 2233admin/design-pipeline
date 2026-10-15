"use strict";

// The owner's absence (OpenSpec change owner-attention-away, phase 4a of design-owner-attention): an owner
// ask deferred with `decide --later`, and the catch-up an owner ask carries on what happened since the
// owner's last recorded answer. Both only read state; `decide --later` writes the one `pending` field.

const { canonicalJson, sha256 } = require("../contract-utils.cjs");
const { describe } = require("./roles.cjs");

// What an owner ask is and says: its stage, its section at a web section review, and a hash of its own
// question and first step (before the numbered page and pictures are added), with the page it is about.
function askKey(stageId, action, page = null) {
  return {
    stage: stageId,
    section: typeof action.section === "string" ? action.section : null,
    basis: "sha256:" + sha256(canonicalJson({ question: action.question ?? null, first: action.first ?? null, page })),
  };
}

// The deferral still holds for this ask: same ask and basis, its time not passed, and no owner answer
// recorded since. The agent's own records do not end it.
function holds(state, key, now = Date.now()) {
  const pending = state.pending;
  if (!pending || !pending.ask || pending.ask.stage !== key.stage || (pending.ask.section ?? null) !== key.section || pending.basis !== key.basis) return false;
  if (pending.until && !(Date.parse(pending.until) > now)) return false;
  const list = Array.isArray(state.decisions?.roles) ? state.decisions.roles : [];
  return !list.slice(Number(pending.roles) || 0).some(entry => entry?.by === "owner");
}

// The result `next` returns while the owner's answer is deferred: blocked on the owner, with what waits.
function deferredAction(state, action) {
  const until = state.pending.until;
  return {
    type: "blocked",
    blocker: {
      kind: "owner",
      reason: `the owner chose to answer this later${until ? `, until ${until}` : ""}.`,
      needs: "the owner's answer.",
    },
    deferred: {
      question: action.question,
      ...(action.record ? { record: action.record } : {}),
      ...(action.correction ? { correction: action.correction } : {}),
      since: state.pending.at,
      ...(until ? { until } : {}),
    },
    instruction: `The owner chose to answer this later. Do not ask it again${until ? ` before ${until}` : ""} unless the owner writes, and do not build on a guess about their answer. When the owner writes, ask the deferred question and record their answer with its record command; run next again after ${until ? "that time or " : ""}any change to what it is about.`,
    why: "No answer is never consent: work that depends on the owner's answer waits for it.",
  };
}

// What happened since the owner's last recorded answer: the agent's decisions after it and the checks
// run since, with the one decision now needed. Null before any owner answer or when nothing happened.
function catchUp(state, question) {
  const list = Array.isArray(state.decisions?.roles) ? state.decisions.roles : [];
  const last = list.findLastIndex(entry => entry?.by === "owner");
  if (last < 0) return null;
  const since = list[last].at;
  const after = Date.parse(since);
  const decided = list.slice(last + 1).filter(entry => entry?.by === "agent").map(describe);
  const checks = Object.entries(state.gates || {})
    .filter(([, gate]) => typeof gate?.at === "number" && gate.at > after)
    .map(([gate, record]) => `${gate}: ${record.status ?? "unknown"}`);
  if (!decided.length && !checks.length) return null;
  return { since, decided, checks, needed: question };
}

const catchUpLine = away => `Since the owner's last recorded answer (${away.since}):${away.decided.length ? ` the agent decided ${away.decided.join("; ")}.` : ""}${away.checks.length ? ` Checks: ${away.checks.join("; ")}.` : ""} Tell the owner this in a line or two before asking.`;

module.exports = { askKey, catchUp, catchUpLine, deferredAction, holds };

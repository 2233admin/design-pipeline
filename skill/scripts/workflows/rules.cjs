"use strict";

// The owner's "no"s as rules (OpenSpec change owner-attention-asks, Decisions 6 and 7).
//
// A rule binds by default to what it was about: a section "no" to that section, a sample "no" to
// the sample, and every other "no" (playback, variants, a decision round, the description, a draft)
// to the result under review, because it shapes the whole build. It is returned until a later role
// entry accepts that object; `--scope project` on the recording call, an anti-goal, or the owner
// promoting it at the final review makes it a project rule. Rules recorded before scopes carry no
// `object` and read as project rules, which they were.

const { fail } = require("../contract-utils.cjs");

const RESULT = Object.freeze({ stage: "review" });
const SCOPES = ["object", "project"];

const isProject = rule => rule.scope !== "object" || !rule.object;

// Appends a rule. `since` is the index the recording call's own role entry takes in
// decisions.roles, so only a later entry can retire it.
function addRule(state, text, from, object = RESULT) {
  const rule = object
    ? { text, from, scope: "object", object: { ...object }, since: Array.isArray(state.decisions?.roles) ? state.decisions.roles.length : 0 }
    : { text, from, scope: "project" };
  state.rules = [...(state.rules || []), rule];
}

// A role entry after the rule's own that accepts its object: the same stage (and section), with an
// accept or no verdict (concept picks and component decisions carry none). A reject never retires it.
function retired(rule, roles) {
  if (isProject(rule)) return false;
  const { stage, choice } = rule.object;
  return roles.slice((rule.since ?? -1) + 1).some(entry => entry.stage === stage
    && (choice === undefined || entry.choice === choice)
    && (entry.verdict === undefined || entry.verdict === "accept"));
}

// The page elements a "no" was about (OpenSpec change owner-attention-page-refs): each reference
// with its tag and text, so the meaning survives a later renumbering.
const onRefs = rule => Array.isArray(rule.object?.refs) && rule.object.refs.length
  ? `on ${rule.object.refs.map(item => `${item.ref} ${item.tag}${item.text ? ` "${item.text}"` : ""}`).join(", ")}`
  : null;

const label = rule => isProject(rule) ? null : rule.object.stage === "section" ? `section ${rule.object.choice}` : rule.object.stage === "sample" ? "sample" : null;

// The rules an action returns: project rules and object rules still open, a section or sample rule
// prefixed with what it binds to. Rules on the result under review read like project rules, since
// they hold for everything built until the owner accepts it.
function activeRules(state) {
  const roles = Array.isArray(state.decisions?.roles) ? state.decisions.roles : [];
  return (state.rules || []).filter(rule => !retired(rule, roles)).map(rule => `${label(rule) ? `${label(rule)}: ` : ""}${rule.text}${onRefs(rule) ? ` (${onRefs(rule)})` : ""}`);
}

// Object rules the final review offers to keep for the rest of the project, active or retired.
function candidates(state) {
  const roles = Array.isArray(state.decisions?.roles) ? state.decisions.roles : [];
  return (state.rules || []).filter(rule => !isProject(rule)).map(rule => ({ from: rule.from, object: label(rule) || "the result", text: rule.text, active: !retired(rule, roles) }));
}

function checkScope(scope, verdict, taste = false) {
  if (scope === undefined || scope === null) return null;
  if (!SCOPES.includes(scope)) fail("workflow", `--scope must be ${SCOPES.join(" or ")}: object (the default) binds a "no" to what it was about, project keeps it for the rest of the project`);
  if (verdict !== "reject" && !taste) fail("workflow", "--scope goes with a record that holds the owner's \"no\" (--verdict reject). Fix: drop --scope, or add it to the owner's rejection");
  return scope;
}

// --promote names object rules by `from`; every rule sharing a named origin is promoted.
function checkPromote(state, froms, stage, by) {
  const named = [].concat(froms ?? []).map(value => String(value).trim()).filter(Boolean);
  if (!named.length) return [];
  if (stage !== "review" || by !== "owner") fail("workflow", "--promote keeps rules for the rest of the project on the owner's final review. Fix: ask the owner at the final review, then record their answer there with --by owner");
  const open = new Set((state.rules || []).filter(rule => !isProject(rule)).map(rule => rule.from));
  const unknown = named.filter(from => !open.has(from));
  if (unknown.length) fail("workflow", `--promote ${unknown.map(value => `"${value}"`).join(", ")} names no rule bound to one object. Fix: use a from listed in the review's ruleCandidates`);
  return named;
}

function promote(state, froms) {
  if (!froms.length) return;
  const at = new Date().toISOString();
  state.rules = state.rules.map(rule => !isProject(rule) && froms.includes(rule.from) ? { ...rule, scope: "project", givenScope: "object", promotedAt: at } : rule);
}

// Makes the rules this call added project rules, for an owner who said "from now on".
function widen(state, firstNew) {
  state.rules = (state.rules || []).map((rule, index) => index >= firstNew && rule.scope === "object" ? { ...rule, scope: "project" } : rule);
}

// One line per rule for the diligence statement: its words, where it came from, and its scope.
function statementLine(rule, roles) {
  const scope = rule.givenScope === "object" ? "promoted to a project rule"
    : isProject(rule) ? "project rule"
    : `for ${label(rule) || "the result under review"}${retired(rule, roles) ? ", since accepted" : ""}`;
  return `"${rule.text}" (${rule.from}; ${scope}${onRefs(rule) ? `; ${onRefs(rule)}` : ""})`;
}

module.exports = { RESULT, activeRules, addRule, candidates, checkPromote, checkScope, isProject, promote, retired, statementLine, widen };

"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).
//
// Standard and full work talks before it builds: an opening with a skip line and one open question,
// a playback the owner confirms, three real first-screen directions drawn from three sources (a
// designer, a real work, a catalog style; workflows/directions.cjs), one round of concrete
// decisions with recommended answers, and a one-page description the owner approves. Only then is
// the page built, one section at a time, each reviewed by the owner, before the final review. Every
// "no" the owner gives on the way, and every anti-goal of the confirmed playback, becomes a project
// rule (state.rules, as for rejected drafts). Quick work states what was decided for the owner
// instead of asking. Film, edit and ui keep the shared stages.

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, resolveInside, sha256 } = require("../contract-utils.cjs");
const { COMPONENT_SOURCES, PERMISSIVE_LIST, validateComponentManifest } = require("../design-system-catalog-core.cjs");
const { cliCommand, shellPath, REVIEW, componentDecisionDigest, deliveryRecorded, exists, extractionDigest, gateStatus, invalidateCheckedEvidence, reason, reference, statement } = require("./shared.cjs");
const { projectBrandFindings } = require("../design-system-package-core.cjs");
const replicate = require("./replicate.cjs");
const { CLOSING_LINE, RECEIPT, directionAction, pickedIds, pickedMix } = require("./directions.cjs");

const REFERENCE = reference("Watch the supplied reference at full speed and inspect timed frames, or study 1-3 moving web references; write reference.md with observed structure, motion, timing, easing, invariants and uncertainties using references/reference-spec.md. For replication, follow references/reconstruction-spec.md and applicable references/3d-spec.md; the next build starts a bounded graybox. reference.md marks document delivery, not verified observation; do not require aggregate reference readiness before the graybox exists.");

const decideCommand = (root, stage) => `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage ${stage}`;
// Repeatable and optional: the intake commands that take anti-goals carry the flag, so running the
// returned command cannot drop them.
const ANTI_GOALS = ' [--anti-goal "<anti-goal>" ...]';
const history = (state, key) => (Array.isArray(state.decisions?.[key]) ? state.decisions[key] : []);
const rejections = (records, matches = () => true) => records.filter(item => item.verdict === "reject" && matches(item)).length;

// Every "no" the owner gives becomes a rule (workflows/rules.cjs): bound to the result under review
// unless it is about one section; anti-goals are project rules.
const { addRule, isProject } = require("./rules.cjs");
const { compareCaptures, describeChanges } = require("./page-compare.cjs");

// A contained project file's bytes, or null when it is missing, outside the project or not a file.
function projectFile(root, rel) {
  try {
    const file = resolveInside(root, rel, rel, { scope: "workflow", mustExist: true });
    return fs.statSync(file).isFile() ? fs.readFileSync(file) : null;
  } catch { return null; }
}
const fileSha = (root, rel) => {
  const bytes = projectFile(root, rel);
  return bytes ? "sha256:" + sha256(bytes) : null;
};
const fileText = (root, rel) => projectFile(root, rel)?.toString("utf8") ?? null;


// --- intake: a conversation that ends in a confirmed playback, or a stated skip ----------------------

const SKIP_LINE = "If you'd rather skip these questions, say so: I'll tell you what I assumed, then show you options.";
const OPENING = {
  page: "What site have you seen recently that felt the way this page should, and what about it?",
  replicate: "What must stay exactly as it is in the page you want reproduced?",
};
const RESTATE = ` The card also restates the scene the page is used in, its tone and the expectations the owner left unsaid (marked as your guesses), and its last line is: "${CLOSING_LINE}" Do not ask the owner to name or pick a style in words: they choose among rendered directions next.`;
const CONVERSATION = "Facts are your job: before asking, take what you can from the conversation and the project's files (README, existing pages, DESIGN.md, brand assets; in an existing project run project inspect), and never ask the owner for something you can look up. Send the opening question as its own message, as it is: the skip line, then one open question. Then ask one open question per message, with no list of example answers unless they are stuck: anchor on real specifics (a site they saw, the moment a visitor arrives), ask what would make them wince and what they have seen elsewhere and loved or hated. When you can describe the page, play it back as a short card, one line each: three intent lines (what the page expresses, who it connects with and how, what makes it unlike other pages), then the uncertainties still open, then one line on what you will decide and what stays theirs; mark what they said as theirs and what you guessed as your guess, and end by asking what is wrong or missing. The confirmed card, recorded with its line breaks, is the project's creative intent. Record each correction with the correction command (it becomes a rule) and play back again until they confirm; then record the confirmed playback, adding each anti-goal they named (what the page must never be or do) to the record command as its own --anti-goal \"<text>\", which becomes a project rule too. If they say to just start, tell them in one line what you decided on their behalf and record that line with the skip command, with any anti-goal they named added the same way.";

// Intake ends with a confirmed playback or a stated skip, and a later correction reopens it.
function intakeFinished(state) {
  const latest = history(state, "playbacks").at(-1);
  return Boolean(state.decisions?.intake) && Boolean(latest) && latest.verdict !== "reject";
}

const INTAKE = {
  id: "intake",
  finished: intakeFinished,
  action: (state, root) => {
    const latest = history(state, "playbacks").at(-1);
    const corrected = latest?.verdict === "reject";
    return {
      type: "ask",
      // `first` is always a step for the agent before it asks; the opening question carries the skip line.
      ...(corrected ? { first: `The owner corrected the playback ("${latest.reason}"); each correction is now a rule. Play it back again with the corrections applied, then ask:` } : {}),
      question: corrected ? "What is wrong or missing in this?" : `${SKIP_LINE} ${OPENING[state.mode === "replicate" ? "replicate" : "page"]}`,
      instruction: state.mode === "replicate" ? CONVERSATION : CONVERSATION + RESTATE,
      record: `${decideCommand(root, "intake")} --verdict accept --answer "<the playback the owner confirmed>"${ANTI_GOALS}`,
      correction: `${decideCommand(root, "intake")} --verdict reject --answer "<what the owner said is wrong or missing>"`,
      skip: `${decideCommand(root, "intake")} --choice skip --answer "<the line telling the owner what you decided on their behalf>"${ANTI_GOALS}`,
      default: `${decideCommand(root, "intake")} --answer default`,
      why: "Intent and taste come from the owner's own words and facts from looking; a skip still states every decision made for them. If the owner answers \"default\", they accept every recommendation: record it with the default command.",
    };
  },
};

// Quick work skips the questions, but no default stays silent.
const QUICK_INTAKE = {
  id: "intake",
  finished: intakeFinished,
  action: (_state, root) => ({
    type: "run",
    instruction: "Do not interview the owner: a quick piece is settled by the request, the conversation and the project's files. Tell the owner in one plain line what you decided on their behalf (what you will build, for whom, the look or reference you follow), then record that line; add each thing the request rules out as its own --anti-goal \"<text>\", which becomes a project rule. Ask first only about something essential that you can neither look up nor reasonably decide.",
    command: `${decideCommand(root, "intake")} --choice skip --answer "<the line you told the owner>"${ANTI_GOALS}`,
    why: "Quick work stays short, and the owner hears every decision made for them instead of a silent default.",
  }),
};

function recordIntake(state, _root, options) {
  const playbacks = history(state, "playbacks");
  const at = new Date().toISOString();
  // "default" accepts every recommendation, as it does for ui and film; a quick piece still states its decisions.
  const bare = value => value === undefined || value === null;
  if (typeof options.answer === "string" && options.answer.trim().toLowerCase() === "default" && bare(options.choice) && bare(options.verdict) && state.tier !== "quick") {
    state.decisions.intake = { answer: "default", defaulted: true };
    state.decisions.playbacks = [...playbacks, { verdict: "default", at }];
    return;
  }
  const antiGoals = [].concat(options.antiGoals ?? []).map(goal => reason(goal, "say in one sentence what the owner ruled out; it becomes a project rule", "--anti-goal"));
  if (options.choice !== undefined && options.choice !== null) {
    if (options.choice !== "skip") fail("workflow", "web intake --choice accepts only skip: the owner asked you to start without questions");
    if (options.verdict) fail("workflow", "web intake takes --choice skip or --verdict, not both");
    state.decisions.intake = { answer: statement(options.answer, "state in one sentence what you decided on the owner's behalf; a bare go-ahead is a silent default"), skipped: true };
    state.decisions.playbacks = [...playbacks, { verdict: "skip", at }];
  } else if (options.verdict === "accept") {
    state.decisions.intake = { answer: statement(options.answer, "be the playback the owner confirmed, not their reply to it"), playback: "confirmed" };
    state.decisions.playbacks = [...playbacks, { verdict: "accept", at }];
  } else if (options.verdict === "reject") {
    if (antiGoals.length) fail("workflow", "--anti-goal goes with the confirmed playback or a skip; a correction is already a rule");
    const text = reason(options.answer, "say in one sentence what the owner corrected in the playback; it becomes a rule");
    state.decisions.playbacks = [...playbacks, { verdict: "reject", reason: text, at }];
    addRule(state, text, `playback ${rejections(state.decisions.playbacks)}`);
  } else {
    fail("workflow", "web intake records the confirmed playback (--verdict accept --answer \"<playback>\"), a correction (--verdict reject --answer \"<what is wrong>\") or a stated skip (--choice skip --answer \"<what you decided for the owner>\"). Fix: follow the intake action from next");
  }
  // Each anti-goal is a "no" given in the conversation; one already among the rules is not repeated.
  for (const text of antiGoals) {
    if ((state.rules || []).some(rule => rule.text === text && isProject(rule))) continue;
    addRule(state, text, `anti-goal ${(state.rules || []).filter(rule => /^anti-goal \d+$/.test(rule.from)).length + 1}`, null);
  }
}

// --- concepts: directions from three sources, three full first screens ---------------------------------

const VERSION_IDS = ["a", "b", "c"];

// Markup the checks read: a marker inside an HTML comment is not on the page.
const markup = html => html.replace(/<!--[\s\S]*?-->/g, "");

// A pick closes the stage and a later rejection reopens it; so does a receipt edited or deleted after
// the pick, since what the owner reviewed is no longer what later stages read.
function conceptChosen(state, root) {
  const latest = history(state, "variants").at(-1);
  if (latest?.verdict !== "pick" || !state.decisions?.concept) return false;
  return !root || latest.sha256 === fileSha(root, RECEIPT);
}

const CONCEPTS = {
  id: "concepts",
  finished: conceptChosen,
  action: (state, root) => {
    const record = `${decideCommand(root, "concept")} --choice <a|b|c, or several comma-separated to combine> --answer "<the owner's exact words>" [--mix <part>=<id> ...] [--taste "<an explicit taste statement, in their words>" ...] [--scope project]`;
    const action = directionAction(state, root, { stage0: false, waiver: false, decide: decideCommand(root, "concept"), record, correction: `${decideCommand(root, "concept")} --verdict reject --answer "<what is wrong, in the owner's words>"` });
    if (action.type !== "ask") return action;
    const ids = action.directions.map(direction => direction.id).sort().join(",");
    if (ids !== VERSION_IDS.join(",")) {
      return { type: "run", instruction: `Name the three full versions in ${RECEIPT} a, b and c (their direction ids), so the owner can pick by letter, then run next again.`, findings: [{ code: "web-version-ids", severity: "error", message: `The full versions are named ${ids}, not a, b and c.`, fix: "Rename the direction ids to a, b and c in direction-preview.json." }], why: "The owner picks a web first screen by letter." };
    }
    const latest = history(state, "variants").at(-1);
    const rejected = latest?.verdict === "reject" && latest.sha256 === fileSha(root, RECEIPT);
    return rejected ? { ...action, first: `The owner rejected these directions ("${latest.reason}"); the reason is now a rule. Redo what it rules out (another card for a version, or a new draw) and run the check again, then ask:` } : action;
  },
};

function recordConcept(state, root, options, next) {
  if (!stages(state).some(stage => stage.id === "concepts")) fail("workflow", `${state.tier === "quick" ? "the quick tier" : "replicate mode, which keeps its reference,"} has no directions to pick or reject. Fix: follow next`);
  if (options.verdict && !["accept", "reject"].includes(options.verdict)) fail("workflow", "--verdict must be reject, or omitted when --choice records the pick");
  const variants = history(state, "variants");
  const page = fileSha(root, RECEIPT);
  const at = new Date().toISOString();
  // Directions are picked or rejected only once the owner has been shown them (or later, to reopen).
  const action = next();
  if (before(state, action.stage, "concepts") || action.stage === "concepts" && action.type !== "ask") fail("workflow", `Cannot record a variant ${options.verdict === "reject" ? "rejection" : "pick"} while ${action.stage === "concepts" ? `${RECEIPT} does not pass its check` : `${action.stage} is unfinished`}. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
  if (options.verdict === "reject") {
    if (!page) fail("workflow", `there is no ${RECEIPT} to reject. Fix: follow next`, { code: "WORKFLOW_NOT_READY" });
    const text = reason(options.answer, "say in one sentence what the owner rejected in the variants and why; it becomes a rule");
    state.decisions.variants = [...variants, { verdict: "reject", reason: text, sha256: page, at }];
    addRule(state, text, `variants ${rejections(state.decisions.variants)}`);
    return;
  }
  const choices = pickedIds(String(options.choice ?? "").toLowerCase());
  if (choices.some(value => !VERSION_IDS.includes(value))) fail("workflow", `--choice must be a, b or c, or several of them comma-separated to combine (the three full versions in ${RECEIPT})`);
  const mix = pickedMix(options.mix);
  if (Object.keys(mix).length && choices.length < 2) fail("workflow", "--mix combines parts of several versions, so --choice names each version it takes from. Fix: for example --choice a,c --mix layout=a --mix colour=c");
  if (Object.values(mix).some(id => !choices.includes(id))) fail("workflow", "--mix may take parts only from the versions --choice names");
  const notes = reason(options.answer, choices.length > 1 ? "say what to take from each combined variant, in the owner's words" : "record the exact words behind the pick (the owner's, or the art director's reason when delegated)");
  state.decisions.concept = choices.join(",");
  state.decisions.conceptNotes = notes;
  if (Object.keys(mix).length) state.decisions.conceptMix = mix;
  else delete state.decisions.conceptMix;
  state.decisions.variants = [...variants, { verdict: "pick", choice: state.decisions.concept, ...(page ? { sha256: page } : {}), ...(Object.keys(mix).length ? { mix } : {}), at }];
}

// --- components: rounds of concrete decisions, each with a recommended answer ----------------------

// The component sources in the owner's words; `choice` is the id the record command takes.
const SOURCE_LABELS = {
  project: "Components this project already has",
  github: "A GitHub library you name",
  index: "This skill's component index",
  discover: "Let me find open-source libraries",
  scratch: "Write from scratch",
};
const COMPONENT_OPTIONS = COMPONENT_SOURCES.map(choice => ({ choice, label: SOURCE_LABELS[choice] }));
const RECOMMENDED_SOURCES = `${SOURCE_LABELS.project} first, then ${SOURCE_LABELS.index.toLowerCase()}, then ${SOURCE_LABELS.discover.toLowerCase()}.`;

const COMPONENTS = {
  id: "components",
  finished: (state) => typeof state.decisions?.components === "string" && Boolean(state.decisions.components.trim())
    && Array.isArray(state.decisions.componentSources) && state.decisions.componentSources.length > 0,
  action: (state, root) => {
    const sectioned = state.tier !== "quick";
    const sources = { id: "components", ask: "Where should the components come from?", options: COMPONENT_OPTIONS, recommended: RECOMMENDED_SOURCES };
    const questions = [
      ...(sectioned ? [{ id: "sections", ask: "Which sections should the page have, in build order, starting with the first screen?", recommended: state.mode === "replicate" ? "The reference's sections, in its order." : "The chosen variant's section arc from concepts.md, first screen first." }] : []),
      sources,
    ];
    return {
      type: "ask",
      question: sectioned ? "These decisions are ready now, each with my recommendation. Which would you change?" : sources.ask,
      questions,
      recommended: RECOMMENDED_SOURCES,
      instruction: `Ask this as one numbered round: one ❓ Qn per question with its body and options, each option by its label, then ➡️ your recommended answer, and wait for the reply. Settle facts yourself first: find the project's existing components and their paths, and the assets and their licenses, and name what you found instead of asking for it. Add a question only for a concrete decision you can neither look up nor settle from the conversation, such as whether supplied material is licensed for this use. A question whose answer depends on one still open waits for a further numbered round, asked the same way. Record each "no" the owner gives in a round (a recommendation turned down, something ruled out) with the correction command; it becomes a rule. After the last round, record the components decision once, with the choice ids of the options the owner picked.${sectioned ? " The sections the owner settles go into the description." : ""}`,
      selfCheck: `Settle the component sources yourself: find the project's existing components and their paths, and the assets and their licenses; take the project's components first, then this skill's component index, then let discovery find maintained open-source libraries (discovery is not permission to copy).${sectioned ? " Settle the sections, in build order, from the chosen variant's section arc (the reference's sections in replicate mode); they go into the description." : ""} Record the decision with the command, the choice ids and one line on what you chose and why.`,
      record: `${decideCommand(root, "components")} --choice <${COMPONENT_SOURCES.join("|")}, comma-separated> --answer "<the user's reply>"`,
      accept: `${decideCommand(root, "components")} --choice <${COMPONENT_SOURCES.join("|")}, comma-separated> --answer "<what you chose and why, in one line>"`,
      correction: `${decideCommand(root, "components")} --verdict reject --answer "<what the owner turned down or ruled out, in their words>"`,
      why: `Record the owner's component source choice before ${sectioned ? "the description and the build" : "building"}; scratch cannot be combined with another choice, github requires a https://github.com/<owner>/<repo> URL in --answer, and discover lets the agent find maintained open-source component libraries and icon sets on GitHub beyond the index itself and record each with its pinned license. Discovery is not permission to copy.`,
    };
  },
};

// The decision round's record: the component sources the owner chose, or a "no" given in a round,
// which becomes a rule and leaves the stage as it is.
function recordComponents(state, _root, options, next) {
  if (options.verdict !== undefined && options.verdict !== null) {
    if (options.verdict !== "reject" || options.choice) fail("workflow", "a decision-round correction takes --verdict reject and --answer only; the components decision takes --choice and --answer");
    const action = next();
    if (before(state, action.stage, "components")) fail("workflow", `Cannot record a decision-round correction while ${action.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    const text = reason(options.answer, "say in one sentence what the owner turned down or ruled out; it becomes a rule");
    state.decisions.rounds = [...history(state, "rounds"), { verdict: "reject", reason: text, at: new Date().toISOString() }];
    addRule(state, text, `decisions ${rejections(state.decisions.rounds)}`);
    return;
  }
  if (typeof options.answer !== "string" || !options.answer.trim()) fail("workflow", "--answer is required: the user's component source choice");
  if (typeof options.choice !== "string" || !options.choice.trim()) fail("workflow", `--choice is required: ${COMPONENT_SOURCES.join("|")}, comma-separated`);
  const choices = options.choice.split(",").map(value => value.trim());
  if (choices.some(value => !COMPONENT_SOURCES.includes(value))) fail("workflow", `--choice must be a comma-separated subset of ${COMPONENT_SOURCES.join(",")}`);
  if (choices.includes("scratch") && choices.some(value => value !== "scratch")) fail("workflow", "--choice scratch cannot be combined with any other value");
  if (choices.includes("github") && !/https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+/i.test(options.answer)) fail("workflow", "--choice github requires at least one https://github.com/<owner>/<repo> URL in --answer");
  // Canonical stored order; discover lets the agent find and record open-source sources itself.
  const sources = COMPONENT_SOURCES.filter(value => choices.includes(value));
  if (state.decisions.components !== options.answer || canonicalJson(state.decisions.componentSources ?? null) !== canonicalJson(sources)) {
    // A first or different source decision changes what the checked page must prove: recheck and redeliver it.
    // A fresh project has no checked evidence yet; a legacy one must not keep a pass made without a decision.
    // Recorded review verdicts stay as they were; they bind the old decision, so review is asked again.
    invalidateCheckedEvidence(state);
  }
  state.decisions.componentSources = sources;
  state.decisions.components = options.answer;
}

// --- description: the one-page brief the owner approves before anything is built -------------------

const SECTION_ID = /^[a-z0-9][a-z0-9-]*$/;
// --affects reads these as every section and no section, so no section may carry them as its id.
const RESERVED_IDS = new Set(["all", "none"]);
// Ids that may appear in a returned command: valid ones only, so brief text never reaches a shell.
const commandIds = ids => ids.filter(id => SECTION_ID.test(id) && !RESERVED_IDS.has(id));
// The project's brief file; a differently cased BRIEF.md the owner supplied is extended in place.
function briefName(root) {
  try {
    const names = fs.readdirSync(root);
    return names.includes("brief.md") ? "brief.md" : names.find(name => name.toLowerCase() === "brief.md") || "brief.md";
  } catch { return "brief.md"; }
}
// Change tiers (OpenSpec change owner-attention-change-tiers). An approval stores the inputs it was
// given; a section verdict binds that section's key, so a change reopens only what it touches.
const digest = value => "sha256:" + sha256(canonicalJson(value));
const sameInputs = (a, b) => canonicalJson(a ?? null) === canonicalJson(b ?? null);

// What an approval is given under: the brief's bytes, its section lines, the confirmed playback, the
// direction (variant pick and combine notes) and the component decision.
function approvalInputs(state, root) {
  const file = briefName(root);
  return {
    brief: fileSha(root, file),
    sections: briefSections(fileText(root, file) ?? "") ?? [],
    playback: digest(state.decisions?.intake?.answer ?? null),
    direction: digest({ concept: state.decisions?.concept ?? null, conceptNotes: state.decisions?.conceptNotes ?? null, conceptMix: state.decisions?.conceptMix ?? null }),
    components: componentDecisionDigest(state) ?? null,
    // A replicate approval also binds the confirmed extraction (DESIGN.md, MOTION.md, reference.md, reference evidence).
    ...(state.mode === "replicate" ? { extraction: extractionDigest(state) } : {}),
  };
}
const approvalId = record => digest(record.inputs);
const acceptsWithInputs = state => history(state, "descriptions").filter(item => item.verdict === "accept" && item.inputs);

// The approval the build follows, or null: the latest description verdict accepted the current inputs.
function currentApproval(state, root) {
  const latest = history(state, "descriptions").at(-1);
  if (latest?.verdict !== "accept" || !latest.inputs || !Array.isArray(latest.sections) || !latest.sections.length) return null;
  if (!sameInputs(latest.inputs, approvalInputs(state, root))) return null;
  return { id: approvalId(latest), sections: latest.sections, inputs: latest.inputs };
}

// What changed between two approvals' inputs. Structural changes are the ones the pipeline can see
// reach a section or the owner's intent; the brief's wording alone is not one.
function diffInputs(before, after) {
  const ids = list => list.map(item => item.id);
  const was = new Map(before.sections.map(item => [item.id, item.job]));
  const diff = {
    brief: before.brief !== after.brief,
    added: ids(after.sections).filter(id => !was.has(id)),
    removed: ids(before.sections).filter(id => !after.sections.some(item => item.id === id)),
    reordered: false,
    jobs: after.sections.filter(item => was.has(item.id) && was.get(item.id) !== item.job).map(item => item.id),
    playback: before.playback !== after.playback,
    direction: before.direction !== after.direction,
    components: before.components !== after.components,
    extraction: (before.extraction ?? null) !== (after.extraction ?? null),
  };
  const kept = ids(after.sections).filter(id => was.has(id));
  diff.reordered = kept.join(",") !== ids(before.sections).filter(id => kept.includes(id)).join(",");
  diff.structural = Boolean(diff.added.length || diff.removed.length || diff.reordered || diff.jobs.length || diff.playback || diff.direction || diff.components || diff.extraction);
  return diff;
}

// The changes in words, for the stale description step and for refusals.
function describeDiff(diff) {
  return [
    diff.jobs.length ? `the line of section ${diff.jobs.join(", ")}` : null,
    diff.added.length ? `section ${diff.added.join(", ")} added` : null,
    diff.removed.length ? `section ${diff.removed.join(", ")} removed` : null,
    diff.reordered ? "the section order" : null,
    diff.playback ? "the confirmed playback" : null,
    diff.direction ? "the variant pick or its combine notes" : null,
    diff.components ? "the component decision" : null,
    diff.extraction ? "the confirmed extraction (DESIGN.md, MOTION.md or the reference)" : null,
    diff.brief && !diff.structural ? "only the wording of the brief" : null,
  ].filter(Boolean).join("; ");
}

// How often a section was reopened: named by a commitment re-approval (or all), or added back after an
// approval that did not list it. Part of its key, so verdicts given before a reopening stop counting.
function sectionEpoch(state, id) {
  let epoch = 0, previous = null;
  for (const record of acceptsWithInputs(state)) {
    if (record.revision === "commitment" && (record.affects === "all" || (Array.isArray(record.affects) && record.affects.includes(id)))) epoch += 1;
    if (previous && record.sections.includes(id) && !previous.sections.includes(id)) epoch += 1;
    previous = record;
  }
  return epoch;
}

// A section's key under an approval: its own line, the direction, the components and its epoch.
function sectionKey(state, approval, id) {
  const job = approval.inputs.sections.find(item => item.id === id)?.job ?? "";
  return digest({ id, job, direction: approval.inputs.direction, components: approval.inputs.components, epoch: sectionEpoch(state, id) });
}

// The sections brief.md lists under its `## Sections` heading, in order: one top-level list item per
// section, starting with its id (backticks allowed); the rest of the item line, after a separator, is
// the section's job. Null when the brief has no such heading.
function briefSections(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => /^##\s+sections\b/i.test(line));
  if (start < 0) return null;
  const sections = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}(?:\s|$)/.test(line)) break;
    if (!/^(?:[-*+]|\d+[.)])(?:\s|$)/.test(line)) continue;
    const item = /^(?:[-*+]|\d+[.)])\s+`?([^\s`:,;.]+)`?(.*)$/.exec(line);
    // A top-level item with no id is kept as its raw text, so the approval names it instead of
    // silently dropping a section from the build order.
    if (item) sections.push({ id: item[1], job: item[2].replace(/^[\s:,;.\-–—]+/, "").replace(/\s+/g, " ").trim() });
    else sections.push({ id: line.trim(), job: "" });
  }
  return sections;
}

function descriptionContent(state) {
  const direction = state.mode === "replicate" ? "what is reproduced, its invariants and what changes" : "the chosen first screen (the direction and anything combined from the others)";
  return `one page in plain words that a builder could work from without asking again: what the page is and why; who it is for and the one thing a visitor should do; how it should feel, in the owner's words; goals, non-goals and anti-goals (what would make the owner wince); ${direction}; a \`## Sections\` list of the sections in build order, first screen first, one top-level list item per section that starts with its id (lowercase letters, digits and hyphens; not all or none) and gives one line on its job, such as \`- hero: today's bakes and the reserve button\`; where the components come from; constraints such as devices, assets and their licenses; and which choices are the owner's and which are your calls, marked as yours. Do not copy the rules into it: they stay in state.rules and come back with every action, so a rule recorded later needs no edit here. Keep any brief the owner supplied and extend it rather than replacing their words.`;
}

const DESCRIPTION = {
  id: "description",
  finished: (state, root) => Boolean(currentApproval(state, root)),
  action: (state, root) => {
    const file = briefName(root);
    const current = fileSha(root, file);
    if (!current) return { type: "run", instruction: `Write ${file}: ${descriptionContent(state)} Then run next again.`, why: "Nothing is built until the owner approves a written description of it." };
    const latest = history(state, "descriptions").at(-1);
    // The tier is measured against the last accept, as decide measures it, even after a later "no".
    const accepted = acceptsWithInputs(state).at(-1), now = approvalInputs(state, root);
    const stale = accepted && !sameInputs(accepted.inputs, now) ? diffInputs(accepted.inputs, now) : null;
    const listed = stale ? briefSections(fileText(root, file) ?? "")?.map(item => item.id) : null;
    // Only a valid list fills --choice: valid ids are shell-safe, and anything else stays a placeholder.
    const valid = listed?.length && commandIds(listed).length === listed.length ? listed : null;
    const choice = valid ? valid.join(",") : "<section-ids-in-order,comma-separated>";
    // A re-approval's commands carry the tier it needs, so the returned command runs as given.
    const tier = !stale ? "" : stale.structural
      ? ` --revision commitment --affects <the section ids the change touches${commandIds(stale.jobs).length ? `, at least ${commandIds(stale.jobs).join(",")}` : ""}; or all; or none>`
      : " --revision bytes";
    // A byte-only change to a description the owner kept is carried forward by the agent, not asked again.
    if (stale && !stale.structural && latest?.verdict === "accept" && state.delegation?.description?.to === "owner") {
      return {
        type: "run",
        carryForward: true,
        instruction: `Since the owner approved ${file}, only its wording changed: no section line, playback, direction or component decision did. Re-read the change. When it is wording only (a typo, formatting, a clearer sentence), carry the owner's approval forward with the command; no section is reviewed again. When it changes what the page promises or aims at, it is a commitment: show ${file} to the owner and record their answer with --by owner --revision commitment --affects <ids|all|none>.`,
        command: `${decideCommand(root, "description").replace(/ --stage /, " --by agent --stage ")} --verdict accept --choice ${choice}${tier}`,
        why: "A byte-only change keeps the owner's decision; the approval still binds the new bytes, and the statement lists the carry-forward.",
      };
    }
    const first = latest?.verdict === "reject" && latest.sha256 === current
      ? `The owner rejected this description ("${latest.reason}"); it is now a rule. Revise ${file}, then ask:`
      : stale
        ? staleText(state, root, accepted, file)
      : latest?.verdict === "accept"
        ? staleText(state, root, latest, file)
        : `Before asking, make sure ${file} is the one-page description, then ask:`;
    return {
      type: "ask",
      first,
      question: `Here is the one-page description of what I will build (${file}). Approve it, or tell me what is wrong?`,
      show: [path.join(path.resolve(root), file)],
      instruction: `${file} is ${descriptionContent(state)} Show it to the owner as it is; record each correction (it becomes a rule), revise and ask again.`,
      recommended: "Approve only when it says what you want; nothing is built before you do.",
      selfCheck: `The command's --choice is the ids of the ## Sections list in ${file}, in its order. Check ${file} yourself against the confirmed playback (or the stated skip), the chosen variant and the component decision: it is ${descriptionContent(state)} When it matches, record the approval with the command.`,
      record: `${decideCommand(root, "description")} --verdict accept --choice ${valid ? choice : `<the ids of the ## Sections list in ${file}, in its order, comma-separated>`}${tier} [--answer "<the owner's words>"]`,
      accept: `${decideCommand(root, "description")} --verdict accept --choice ${choice}${tier}`,
      correction: `${decideCommand(root, "description")} --verdict reject --answer "<what is wrong, in the owner's words>"`,
      why: "The stage that blocks building (not a state.gates gate): the approval binds this description, the confirmed playback, the chosen variant and the component decision, and fixes the sections the page is built in. Each correction becomes a rule.",
    };
  },
};

// Why an accepted description is stale, and the --revision its re-approval takes.
function staleText(state, root, latest, file) {
  if (!latest.inputs) return `The description was approved before change tiers were recorded, so this approval counts as a first one (no --revision). Bring ${file} up to date, then ask:`;
  const diff = diffInputs(latest.inputs, approvalInputs(state, root));
  const tier = !diff.structural
    ? "Only the brief's wording changed: re-record the approval with --revision bytes, and no section is reviewed again."
    : `This is a commitment change: re-record the approval with --revision commitment --affects <the section ids it touches, all or none>${commandIds(diff.jobs).length ? ` (at least ${commandIds(diff.jobs).join(",")}, whose line changed)` : ""}; sections whose line, direction or component decision changed are reviewed again either way.`;
  return `Since the approval, ${describeDiff(diff)} changed. ${tier} Bring ${file} up to date, then ask:`;
}

// The --revision and --affects of a re-approval, checked against what changed since the last accept.
function revisionOf(state, inputs, options, listed) {
  const previous = acceptsWithInputs(state).at(-1);
  const revision = options.revision ?? null, affects = options.affects ?? null;
  if (!previous || sameInputs(previous.inputs, inputs)) {
    if (revision !== null || affects !== null) fail("workflow", `--revision and --affects go with a re-approval of a changed description; this approval is ${previous ? "identical to the last" : "the first"}. Fix: drop them`);
    return {};
  }
  const diff = diffInputs(previous.inputs, inputs);
  if (!["bytes", "commitment"].includes(revision)) fail("workflow", `the description changed since its approval (${describeDiff(diff)}). Fix: add --revision bytes when only the wording changed, or --revision commitment --affects <ids|all|none>`);
  if (revision === "bytes") {
    if (diff.structural) fail("workflow", `--revision bytes is for wording only, and ${describeDiff(diff)} changed. Fix: use --revision commitment --affects <ids|all|none>`);
    if (affects !== null) fail("workflow", "--affects goes with --revision commitment. Fix: drop --affects");
    return { revision };
  }
  if (affects === null) fail("workflow", "--revision commitment needs --affects: the section ids it touches, comma-separated, or all, or none");
  const value = String(affects).trim();
  if (value === "all" || value === "none") return { revision, affects: value };
  const ids = value.split(",").map(id => id.trim()).filter(Boolean);
  const unknown = ids.filter(id => !listed.includes(id));
  if (!ids.length || unknown.length) fail("workflow", `--affects ${unknown.length ? `names ${unknown.join(", ")}, which the ## Sections list does not` : "is empty"}. Fix: name sections of the list, or all, or none`);
  return { revision, affects: [...new Set(ids)] };
}

function recordDescription(state, root, options, next) {
  if (!sectioned(state)) fail("workflow", "the quick tier has no description to approve. Fix: follow next");
  const file = briefName(root);
  const current = fileSha(root, file);
  const action = next();
  const at = new Date().toISOString();
  if (options.verdict === "accept") {
    // An approval is recorded once next has asked for it, and may be recorded again later to correct
    // it; section verdicts bind the approval, so only a changed one asks the sections again.
    if (before(state, action.stage, "description") || !current) fail("workflow", `Cannot record the description approval while ${before(state, action.stage, "description") ? `${action.stage} is unfinished` : `${file} is unwritten`}. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    const latest = history(state, "descriptions").at(-1);
    if (options.by === "agent" && latest?.verdict === "reject" && latest.sha256 === current) fail("workflow", `the owner rejected this description and ${file} is unchanged since. Fix: revise it for their correction, then record the approval`, { code: "WORKFLOW_NOT_READY" });
    // An agent carries a kept description forward only from the owner's accept, never past their "no".
    if (options.carriedForward && latest?.verdict !== "accept") fail("workflow", `the owner rejected the description they kept, so its approval is theirs again. Fix: show them the revised ${file} and record their answer with --by owner`);
    const sections = String(options.choice ?? "").split(",").map(value => value.trim()).filter(Boolean);
    if (!sections.length) fail("workflow", `--choice is required: the ids of the ## Sections list in ${file}, in its order, comma-separated`);
    const listed = briefSections(fileText(root, file) ?? "")?.map(item => item.id);
    if (!listed?.length) fail("workflow", `${file} has no ## Sections list. Fix: add a ## Sections heading with one top-level list item per section, in build order, each starting with its id; show the owner the description again and ask for approval`);
    const invalid = listed.find(id => !SECTION_ID.test(id) || RESERVED_IDS.has(id));
    if (invalid) fail("workflow", `${file} lists "${invalid}" under ## Sections; each item must start with its section id (lowercase letters, digits and hyphens; not all or none, which --affects reserves). Fix: correct the list, show the owner the description again and ask for approval`);
    if (new Set(listed).size !== listed.length) fail("workflow", `${file} lists a section twice under ## Sections. Fix: list each section once, in build order`);
    if (listed.join(",") !== sections.join(",")) fail("workflow", `--choice ${sections.join(",")} does not match the ## Sections list in ${file} (${listed.join(", ")}). Fix: --choice lists exactly those ids, in that order`);
    const note = typeof options.answer === "string" && options.answer.trim() ? options.answer.trim() : null;
    const inputs = approvalInputs(state, root);
    const tier = revisionOf(state, inputs, options, listed);
    state.decisions.descriptions = [...history(state, "descriptions"), { verdict: "accept", sha256: current, inputs, sections, ...tier, ...(note ? { note } : {}), at }];
  } else if (options.verdict === "reject") {
    if (before(state, action.stage, "description") || !current) fail("workflow", `Cannot reject the description before ${file} is written for approval. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    const text = reason(options.answer, "say in one sentence what is wrong with the description; it becomes a rule");
    state.decisions.descriptions = [...history(state, "descriptions"), { verdict: "reject", reason: text, sha256: current, at }];
    addRule(state, text, `description ${rejections(state.decisions.descriptions)}`);
  } else {
    fail("workflow", "--verdict must be accept or reject");
  }
}

// Real brands declared in DESIGN.md owe sourced brand colour tokens and a logo in the design-system
// package; the build step shows the package check's brand findings first.
function brandFindings(root) {
  return projectBrandFindings(path.resolve(root)).map(({ code, severity, message, fix }) => ({ code, severity, message, fix }));
}

function buildStatus(state, root) {
  if (!COMPONENTS.finished(state)) return { finished: false };
  const brand = brandFindings(root);
  if (brand.length) return { finished: false, findings: brand };
  try {
    if (!fs.statSync(path.join(root, "index.html")).isFile()) return { finished: false };
    validateComponentManifest(JSON.parse(fs.readFileSync(path.join(root, "component-manifest.json"), "utf8")), {
      root, decision: state.decisions.components, componentSources: state.decisions.componentSources,
    });
    return { finished: true };
  } catch (error) {
    if (error.code === "CONTRACT_INVALID" || error instanceof SyntaxError) {
      return { finished: false, findings: [{
        code: "CONTRACT_INVALID", severity: "error", message: error.message,
        fix: "Correct component-manifest.json to match the recorded componentSources and valid source/usage evidence, then run next again.",
      }] };
    }
    if (["ENOENT", "ENOTDIR", "EISDIR"].includes(error.code)) return { finished: false };
    throw error;
  }
}

// --- build: the first screen, then one section at a time, each reviewed by the owner -----------------

// Standard and full pages are built in the sections of the approved description; quick builds whole.
const sectioned = state => state.tier !== "quick";
const sectionMarker = id => new RegExp(`data-section\\s*=\\s*["']${id}["']`, "i");
const builtSections = root => markup(fileText(root, "index.html") ?? "");

// Where the section loop stands under the current approval: the first section, in build order, that
// is unbuilt or not accepted, and the sections accepted before it. A section counts as accepted when
// its latest verdict, under whatever key, is an accept under its current key.
function sectionProgress(state, root) {
  const approval = currentApproval(state, root);
  if (!approval) return null;
  const html = builtSections(root);
  const records = history(state, "sections");
  const accepted = [];
  for (const id of approval.sections) {
    const latest = records.filter(item => item.section === id).at(-1);
    const built = sectionMarker(id).test(html);
    if (!built || latest?.verdict !== "accept" || latest.key !== sectionKey(state, approval, id)) return { approval, accepted, current: id, built, latest };
    accepted.push(id);
  }
  // The page tier, once every section is built and accepted: a section a person accepted stays accepted
  // only while it is unchanged. Checked at the end of the build rather than after each edit, so building
  // a later section does not keep reopening earlier ones.
  let captures;
  const current = () => (captures ??= currentCaptures(root));
  for (const id of approval.sections) {
    const latest = records.filter(item => item.section === id).at(-1);
    const tier = pageTier(root, latest, current);
    // Only the sections before it count as accepted: later ones are checked after it.
    if (tier) return { approval, accepted: approval.sections.slice(0, approval.sections.indexOf(id)), current: id, built: true, latest, tier };
  }
  return { approval, accepted, current: null };
}

// The page tier (owner-attention-page-compare): a section a person accepted with kept captures stays
// accepted while the page is unchanged since, or while comparing each kept capture with a current one
// shows the section unchanged. Returns null when it stands, else {status: "changed", changes} or
// {status: "unknown"} when a comparison cannot be made (no current capture, no kept reference list, or
// a capture without fingerprints). A section accepted without captures keeps the key rule alone.
function pageTier(root, record, current = () => currentCaptures(root)) {
  if (!record?.captures || typeof record.captures !== "object") return null;
  // Unchanged since the verdict: the page digest, and every file the kept captures loaded (a font or
  // image named only in CSS is outside the digest), still have the bytes they had.
  const kept = Object.values(record.captures).map(entry => keptCapture(root, entry).doc);
  // A kept capture whose reference list is gone (or a 3b record that kept none) cannot show its files
  // are unchanged, so it goes to the comparison, which then cannot be made either.
  const loadedSame = kept.every(doc => doc?.lineage && typeof doc.lineage === "object" && Object.entries(doc.lineage).every(([rel, hash]) => fileSha(root, rel) === hash));
  if (record.pageSha256 === pageDigest(root) && loadedSame) return null;
  const now = Object.fromEntries(current().map(({ viewport, doc }) => [viewport, doc]));
  const changes = [];
  const unknown = new Set();
  for (const [viewport, kept] of Object.entries(record.captures)) {
    const { doc } = keptCapture(root, kept);
    if (!doc) { unknown.add("unrecorded"); continue; }
    if (!now[viewport]) { unknown.add("uncaptured"); continue; }
    const result = compareCaptures(doc, now[viewport], record.section);
    if (!result.comparable) { unknown.add("uncomparable"); continue; }
    if (result.sectionChanged) changes.push(...result.changes);
  }
  // A change found at one viewport is shown even when another cannot be compared yet.
  if (changes.length) return { status: "changed", changes };
  if (!unknown.size) return null;
  // A capture lifts only the missing current capture; a missing kept list or an uncomparable capture stays.
  return { status: "unknown", reason: unknown.has("unrecorded") ? "unrecorded" : unknown.has("uncomparable") ? "uncomparable" : "uncaptured" };
}

// What the owner looked at: index.html, its manifest and the local files the page names.
function pageDigest(root) {
  const html = fileText(root, "index.html");
  if (html === null) return null;
  const named = [...html.matchAll(/\b(?:src|href)\s*=\s*["']([^"'#?]+)/gi)].map(match => match[1].trim())
    .filter(ref => ref && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref));
  const files = [...new Set(["index.html", "component-manifest.json", ...named])].sort();
  return "sha256:" + sha256(canonicalJson(Object.fromEntries(files.map(rel => [rel, fileSha(root, rel)]).filter(([, hash]) => hash))));
}

// A page the owner rejected at the final review needs repair before it is checked and shown again:
// build stays open while index.html is the page that review judged, at every tier.
function rejectedUnchanged(state, root) {
  const latest = history(state, "drafts").at(-1);
  return latest?.verdict === "reject" && Boolean(latest.inputHashes?.["index.html"]) && latest.inputHashes["index.html"] === fileSha(root, "index.html");
}

function buildFinished(state, root) {
  if (rejectedUnchanged(state, root)) return false;
  return buildStatus(state, root).finished && (!sectioned(state) || sectionProgress(state, root)?.current === null);
}

function componentInstruction(state, root) {
  const skillRoot = path.resolve(__dirname, "../..");
  const index = path.join(skillRoot, "references/component-source-catalog.json");
  // Only a decision that selects discover lets the agent look for components beyond the index.
  const discover = Array.isArray(state.decisions.componentSources) && state.decisions.componentSources.includes("discover")
    ? " When nothing indexed fits, find maintained open-source component libraries or icon sets on GitHub yourself (method in tools/open-source-design.md): check each license at a pinned revision and record its entry before using it, and prefer genuinely reusing a fitting source over hand-writing it."
    : "";
  // Quick and replicate builds have no treatment to call for the system stack.
  const direction = state.tier !== "quick" && state.mode !== "replicate" ? "the treatment" : "the page's direction";
  return `Follow the recorded component decision exactly: ${JSON.stringify(state.decisions.components)}; componentSources: ${JSON.stringify(state.decisions.componentSources)}. Reuse the specified project paths, inspect the named GitHub library, search the index, find open-source sources, or write from scratch as requested; do not silently substitute another source. When searching, search the index first: the single discovery index is references/component-source-catalog.json; run \`${cliCommand()} design-system route --root ${shellPath(path.resolve(root))} --query "<page brief>" --platform web\`, then \`${cliCommand()} design-system search --root ${shellPath(skillRoot)} --snapshot ${shellPath(index)} --query "<page brief>" --platform web\`. Read only the returned source entries and their pointed guides/manifests/implementations.${discover} Choose fonts through tools/fonts.md rather than silently defaulting to the system stack, and record the chosen family under Typography in DESIGN.md, where the audit probe's thresholds.fonts reads the approved families; use the system stack only when ${direction} deliberately calls for it. Bundle or self-host discovered code and fonts inside the project with their license notices: no CDN scripts or remote fonts at runtime (references/web-motion.md#self-contained-pages). Before building index.html, write component-manifest.json with an entries array: each entry needs name, sourceId or url, availability (bundled-implementation|reference-link|metadata-only|project-owned), license: {state: verified|unverified|commercial|project-owned|platform}, and usedIn: [{file, marker, how}]. sourceId must resolve in the index or name an existing contained project-owned file; a GitHub repository url must appear in the components decision, and an indexed source is cited by sourceId, not by one of its URLs. Any other url must be a GitHub repository https://github.com/<owner>/<repo>: a discovered source, which needs discover in componentSources, availability bundled-implementation, reference-link or metadata-only, revision (commit SHA or tag, not HEAD, main or master) and license.evidence (https URLs, at least one on that repository whose blob, tree, raw, commit, releases/tag or archive ref is the revision, such as https://github.com/<owner>/<repo>/blob/<revision>/LICENSE), with license.state verified, unverified or commercial, plus license.id (SPDX expression) when known. Indexed license.state must match the index. Every usedIn.file must exist inside the project, and marker (import path/class/custom element/component identifier) must actually appear in it. For verified imports/copies, how records attribution/license-notice handling; a how that bundles, vendors, self-hosts or downloads the source counts as copying. Copy or import a discovered source only when its license.state is verified, its license.id is ${PERMISSIVE_LIST}, and license.file names the non-empty project file that holds its license text; otherwise only study and reimplement it. The scratch source set requires fromScratch: true and permits empty or project-owned-only entries; every other source set forbids fromScratch: true and requires non-empty entries. Components with unverified or commercial licenses may only be studied and reimplemented, never copied. Build is unfinished until both index.html and a valid component-manifest.json exist.`;
}

const BUILD_CRAFT = "Motion follows references/web-motion.md, design tokens and components from references/pipeline-reference.md. In tasks.md isolate one visual goal per task: source/reference region or applicable scene node, goal and invariants, inputs, literal modification scope, outputs, runtime/comparison checks and failure return step. For references, start a bounded graybox for structure and occlusion; once it exists, read the complete results of reference check, reconstruction check and applicable scene check. If required prerequisite stages are not ready, repair their findings before material, polish or motion that depends on them; follow the stage-specific permissions in references/reconstruction-spec.md, including optical work when graybox is ready but geometry is blocked. File delivery and engineering checks do not grant visual acceptance.";

// What the build step writes, in whole sentences: the whole page at quick; otherwise the first screen
// first (after the treatment and section briefs, outside replicate), then the section the loop stands
// at. Quick and replicate have no concepts stage, so no chosen card to extend.
function buildScope(state, progress) {
  const replicate = state.mode === "replicate";
  const openSpec = state.tier === "full" ? "Open an OpenSpec change under openspec/changes/<id>/. " : "";
  if (!sectioned(state)) return `${openSpec}Build index.html from ${replicate ? "the reference and its invariants" : "the decisions you told the owner"}.`;
  const { accepted = [], current = null } = progress || {};
  if (!current) return `Repair index.html and component-manifest.json without changing what the owner accepted (sections ${accepted.join(", ")}).`;
  const place = `into index.html inside an element marked data-section="${current}"`;
  if (accepted.length) return `Build the next section, \`${current}\`, from its section brief ${place} (accepted so far: ${accepted.join(", ")}). Keep the accepted sections as the owner accepted them unless a rule requires a change, and add every component it uses to component-manifest.json.`;
  const treatment = replicate ? "" : "Write concepts.md from the chosen version's card in direction-preview.json (for a combination, the first version named, saying what it takes from the others, as the owner mixed them) and extend it with `## Treatment`; its section arc lists exactly the sections of the approved description's ## Sections list, in that order, and a different arc goes back to the owner as a description correction before anything is built. Write the section briefs (references/web-direction.md). ";
  return `${openSpec}${treatment}Build only the first screen, section \`${current}\`, from ${replicate ? "the reference and its invariants" : "the chosen direction and the approved description"} ${place}; the other sections follow one at a time after the owner reviews it.`;
}

// --- element references (OpenSpec change owner-attention-page-refs) ----------------------------------
// `evidence refs` numbers the built page's elements on a screenshot; the owner answers by reference
// (hero-2), and decide checks each cited reference against the capture of the current page.

const REFS_FILE = "evidence/refs.json";
const refsCommand = root => `${cliCommand()} evidence refs --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))}`;
// desktop and mobile (owner-attention-mobile-compare): the same capture at two viewports, each with
// its own files; phone references carry `m:`.
const profiles = () => require("../page-refs-core.cjs").PROFILES;
const VIEWPORTS = ["desktop", "mobile"];

function refsCapture(root, viewport = "desktop") {
  const text = fileText(root, profiles()[viewport].json);
  if (!text) return null;
  try {
    const doc = JSON.parse(text);
    return doc?.schema === "design-pipeline.page-refs.v1" && Array.isArray(doc.refs) ? doc : null;
  } catch { return null; }
}

// A capture is current when the page digest, every local file the browser loaded (CSS-imported fonts
// and images included) and the numbered screenshot itself still have the hashes it recorded.
function refsCurrent(root, doc = refsCapture(root), viewport = "desktop") {
  if (!doc || doc.page !== pageDigest(root) || !doc.lineage || typeof doc.lineage !== "object" || !Object.keys(doc.lineage).length) return false;
  const profile = profiles()[viewport];
  if (typeof doc.png !== "string" || fileSha(root, profile.png) !== doc.png) return false;
  // A capture of the other viewport copied under these names is not this viewport's.
  if (doc.viewport?.width !== profile.viewport.width || doc.viewport?.height !== profile.viewport.height) return false;
  if (!doc.refs.every(item => typeof item?.ref === "string" && (profile.prefix ? item.ref.startsWith(profile.prefix) : !item.ref.includes(":")))) return false;
  // The reference list is bound too, so a hand-edited mapping is not trusted as the screenshot's
  // (an integrity check against accidental edits; refs.json is the agent's own evidence, not proof).
  // The section fingerprints are bound with them (a capture from before them binds its references alone).
  if (doc.refsDigest !== digest(Array.isArray(doc.sections) ? { refs: doc.refs, sections: doc.sections } : doc.refs)) return false;
  return Object.entries(doc.lineage).every(([rel, hash]) => fileSha(root, rel) === hash);
}

// The viewports whose capture is current, with their capture.
const currentCaptures = root => VIEWPORTS.map(viewport => ({ viewport, doc: refsCapture(root, viewport) })).filter(({ viewport, doc }) => refsCurrent(root, doc, viewport));

// What a review that faces a person says about the numbered page: show the current captures,
// otherwise take them first. Refs are optional, so a failed capture falls back to words.
function refsStep(root, who = "the owner") {
  const current = currentCaptures(root).map(item => item.viewport);
  const show = current.map(viewport => path.join(path.resolve(root), ...profiles()[viewport].png.split("/")));
  const ask = `ask them to name each element they comment on by its reference (such as hero-2, or 3 outside the sections${current.includes("mobile") ? "; m:hero-2 on the phone" : ""}) or in words`;
  // The owner can also comment on the page itself (owner-attention-page-review); an art director has no page review.
  const onPage = who === "the owner" && current.includes("desktop")
    ? ` Or run ${cliCommand()} evidence review-page --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} and let the owner open evidence/review.html where they open index.html, click elements to comment and submit; save the block they send back to a file inside the project and record it with decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --page-review <file> instead of the record below.`
    : "";
  if (current.length === VIEWPORTS.length) {
    return { first: `Show ${who} evidence/refs.png and evidence/refs-mobile.png, the page at desktop width and as an emulated phone shows it, with a number on each element, and ${ask}.${onPage}`, show };
  }
  const run = `Run ${refsCommand(root)} and then next again, to show ${who} the page at desktop width and on a phone with a number on each element`;
  if (current.length) return { first: `${run}. If a capture fails, show ${profiles()[current[0]].png} and ${ask}.${onPage}`, show };
  return { first: `${run}; if the capture fails, ask them to name each element by its text, label or place.`, show };
}

// The references a "no" cites, each checked against the current capture of its viewport (`m:` is the
// phone) and, at a section, against that section. Returns [{ref, tag, selector, text}] for the rule.
function citedRefs(root, refs, section = null) {
  // Section ids and the phone prefix are lowercase, so a reference is read case-insensitively.
  const given = [].concat(refs ?? []).map(value => String(value ?? "").trim().toLowerCase());
  if (given.some(value => !value)) fail("workflow", "--ref is empty. Fix: give the reference the owner cited, such as hero-2, or drop the flag");
  const list = [...new Set(given)];
  if (!list.length) return [];
  const docs = {};
  const capture = viewport => {
    if (docs[viewport]) return docs[viewport];
    const { json, png } = profiles()[viewport];
    const doc = refsCapture(root, viewport);
    if (!doc) fail("workflow", `--ref needs ${json} from a numbered capture of the page. Fix: run ${refsCommand(root)}, show the owner ${png} and record the references they cite`, { code: "WORKFLOW_NOT_READY" });
    if (!refsCurrent(root, doc, viewport)) fail("workflow", `${json} was taken from an earlier version of the page or its files, so its numbers may point at other elements now. Fix: run ${refsCommand(root)} again and show the owner the new numbers`, { code: "WORKFLOW_NOT_READY" });
    return (docs[viewport] = doc);
  };
  return list.map(ref => {
    const viewport = ref.startsWith(profiles().mobile.prefix) ? "mobile" : "desktop";
    const hit = capture(viewport).refs.find(item => item.ref === ref);
    if (!hit) fail("workflow", `--ref ${ref} is not on the numbered page (${profiles()[viewport].json}). Fix: use a reference shown on ${profiles()[viewport].png}`);
    if (section && hit.section !== section) fail("workflow", `--ref ${ref} is ${hit.section ? `in section ${hit.section}` : "outside the sections"}, not in section ${section}. Fix: cite it at the review of its own section or at the final review`);
    return { ref, tag: String(hit.tag ?? ""), selector: String(hit.selector ?? ""), text: String(hit.text ?? "") };
  });
}

// --- before and after (owner-attention-mobile-compare) -------------------------------------------------
// A verdict a person records keeps the numbered screenshots they judged, content-addressed under
// evidence/reviewed/, and names their hashes on the record; the next ask at the same scope shows them
// beside the new screenshots when the page changed since.

const REVIEWED_DIR = "evidence/reviewed";
const reviewedFile = (hash, ext = "png") => `${REVIEWED_DIR}/${String(hash).replace(/^sha256:/, "")}.${ext}`;

// What a verdict keeps of each screenshot current at that moment: {viewport: {png, refs}}, the hashes of
// the numbered screenshot and of its reference list (owner-attention-page-compare), or null with none.
// Only named here; decide copies them with storeReviewed after every check, just before it writes state.
function reviewedCaptures(root) {
  const kept = Object.fromEntries(currentCaptures(root).map(({ viewport, doc }) => [viewport, { png: doc.png, refs: fileSha(root, profiles()[viewport].json) }]));
  return Object.keys(kept).length ? kept : null;
}

// Copies each named screenshot and reference list to evidence/reviewed/<hex>.png|.json
// (content-addressed, so a file is stored once and its name proves its bytes). All or nothing: every
// copy is staged from the bytes that were hashed before any is published, and a failure puts back what
// this call overwrote and removes what it added, so a refused verdict leaves evidence/reviewed/ as it was.
function storeReviewed(root, captures) {
  const staged = [];
  try {
    for (const [viewport, kept] of Object.entries(captures || {})) {
      const profile = profiles()[viewport];
      for (const [hash, source, ext] of [[kept?.png, profile.png, "png"], [kept?.refs, profile.json, "json"]]) {
        const rel = reviewedFile(hash, ext);
        // Content-addressed: two viewports with the same bytes share one copy.
        if (fileSha(root, rel) === hash || staged.some(item => item.rel === rel)) continue;
        const bytes = projectFile(root, source);
        if (!bytes || "sha256:" + sha256(bytes) !== hash) fail("workflow", `${source} changed while the verdict was recorded. Fix: run next again`, { code: "WORKFLOW_NOT_READY" });
        const target = resolveInside(root, rel, "reviewed capture", { scope: "workflow" });
        fs.mkdirSync(path.dirname(target), { recursive: true });
        const temp = `${target}.${process.pid}.tmp`;
        // A copy already there with other bytes (edited by hand) is put back if this call fails.
        const previous = fs.existsSync(target) && fs.statSync(target).isFile() ? fs.readFileSync(target) : null;
        staged.push({ rel, temp, target, previous });
        fs.writeFileSync(temp, bytes);
      }
    }
    const published = [];
    try {
      for (const item of staged) {
        fs.renameSync(item.temp, item.target);
        published.push(item);
      }
    } catch (error) {
      for (const item of published) {
        if (item.previous) fs.writeFileSync(item.target, item.previous);
        else fs.rmSync(item.target, { force: true });
      }
      throw error;
    }
  } finally {
    for (const item of staged) fs.rmSync(item.temp, { force: true });
  }
}

// A verdict's kept capture of one viewport: the screenshot's path when its copy still has its bytes, and
// the reference list when its copy still has its bytes and names that screenshot; null parts otherwise.
function keptCapture(root, entry) {
  // A phase 3b record names the screenshot alone, as a plain hash, and kept no reference list.
  const kept = typeof entry === "string" ? { png: entry } : entry;
  const png = kept && typeof kept.png === "string" && fileSha(root, reviewedFile(kept.png)) === kept.png ? reviewedFile(kept.png) : null;
  let doc = null;
  if (png && typeof kept.refs === "string" && fileSha(root, reviewedFile(kept.refs, "json")) === kept.refs) {
    try {
      const parsed = JSON.parse(fileText(root, reviewedFile(kept.refs, "json")));
      if (parsed?.png === kept.png && Array.isArray(parsed.refs)) doc = parsed;
    } catch { doc = null; }
  }
  return { png, doc };
}

// The before pictures for a repeated ask at `scope` (a section id, or "review" for the final review).
function compareStep(state, root, scope) {
  const records = scope === "review" ? history(state, "drafts") : history(state, "sections").filter(item => item.section === scope);
  const latest = records.filter(item => item.captures && typeof item.captures === "object").at(-1);
  if (!latest) return { show: [] };
  const changes = [];
  const pairs = currentCaptures(root).flatMap(({ viewport, doc }) => {
    const { png, doc: before } = keptCapture(root, latest.captures[viewport]);
    if (!png || png === reviewedFile(doc.png)) return [];
    // At the final review, the comparison names what changed on the whole page since that verdict.
    if (scope === "review" && before) {
      const result = compareCaptures(before, doc, null);
      if (result.comparable) changes.push(...result.changes);
    }
    return [{ before: png, now: profiles()[viewport].png }];
  });
  if (!pairs.length) return { show: [] };
  const who = latest.by === "agent" ? "the art director" : "the owner";
  const how = latest.verdict === "accept" ? "accepted it" : "asked for changes";
  const list = pairs.map(pair => `${pair.before} (then) beside ${pair.now} (now)`).join(", and ");
  const part = scope === "review" ? "" : ` Both show the whole page; look at the ${scope} section.`;
  return {
    first: `Show ${list}: the earlier picture is the numbered page when ${who} ${how} at ${latest.at}.${part}${changes.length ? ` Comparing the captures found these changed since: ${describeChanges(changes)}.` : ""} Let them compare the two before they answer.`,
    ...(changes.length ? { pageChanges: changes } : {}),
    show: pairs.map(pair => path.join(path.resolve(root), ...pair.before.split("/"))),
  };
}

function sectionReview(root, { approval, accepted, current, latest, tier }) {
  const unrevised = latest?.verdict === "reject" && latest.pageSha256 === pageDigest(root);
  const who = latest?.by === "agent" ? "the art director" : "the owner";
  const reopened = tier?.status === "changed"
    ? `Section ${current} was accepted by ${who} at ${latest.at}; the page changed since, and comparing the captures found these changed in it: ${describeChanges(tier.changes)}. Show them before and after, then ask:`
    : tier?.reason === "uncaptured" ? `Section ${current} was accepted by ${who} at ${latest.at} on an earlier page, and it cannot be compared with this one until the page is captured: once it is, a section the comparison finds unchanged keeps its acceptance and next moves on. If the capture cannot be taken, ask:`
    : tier ? `Section ${current} was accepted by ${who} at ${latest.at} on an earlier page, and what was kept of that verdict cannot be compared with this page (${tier.reason === "unrecorded" ? "its kept reference list is missing, or it was recorded before comparisons" : "a capture has no fingerprints, or too many elements to pair"}), so it needs a fresh look. Ask:` : null;
  return {
    type: "ask",
    section: current,
    ...(unrevised ? { first: `The owner asked for changes to section ${current} ("${latest.reason || "see the cited runtime-review Feedback"}"); each comment is now a rule. Revise the section, then ask:` } : {}),
    ...(reopened ? { first: reopened } : {}),
    ...(tier?.status === "changed" ? { pageChanges: tier.changes } : {}),
    question: `The ${current} section is built (${accepted.length + 1} of ${approval.sections.length}). Look at it in the page: accept it as it is, or tell me what to change, naming each element by its number on the numbered page or by its text, label or where it sits?`,
    show: [path.join(path.resolve(root), "index.html")],
    instruction: `Open index.html at the ${current} section (data-section="${current}") in a real browser and let the owner look and interact. Comments are text: ask them to name each element they comment on by its reference on evidence/refs.png (such as ${current}-2) or by its text, label or place, or let them click elements on the review page when it is offered. Record each reference they cite with --ref <reference> beside --answer. If the project already carries runtime-review inputs (references/runtime-review.md), Feedback the owner leaves on its runtime-review page can be recorded with runtime-review record and cited with --evidence. Any change they ask for is a reject: record it, revise the section and ask again; accept only a section they are happy with as it is.`,
    recommended: "Accept only when nothing in this section needs to change; earlier sections stay accepted unless a new rule changes them.",
    record: `${decideCommand(root, "section")} --choice ${current} --verdict accept|reject [--answer "<the owner's comments>"] [--ref <reference>] [--evidence <runtime-review/feedback/<hash>.json>]`,
    accept: `${decideCommand(root, "section")} --choice ${current} --verdict accept`,
    correction: `${decideCommand(root, "section")} --choice ${current} --verdict reject --answer "<what the owner wants changed, in their words>" [--evidence <runtime-review/feedback/<hash>.json>]`,
    selfCheck: `Open index.html at the ${current} section (data-section="${current}") in a real browser and check it yourself against the confirmed playback (or the stated skip), the chosen direction, its section brief and the rules; fix what does not match, then record the acceptance with the command.`,
    why: "The page is built one section at a time, first screen first; the next section starts only after the owner reviews this one. Each comment becomes a rule. A section verdict is not Visual Acceptance of the page; the final review is.",
  };
}

const BUILD = {
  id: "build",
  finished: buildFinished,
  action: (state, root) => {
    const { finished, findings } = buildStatus(state, root);
    const progress = sectioned(state) ? sectionProgress(state, root) : null;
    if (finished && progress?.current && progress.built) return sectionReview(root, progress);
    if (rejectedUnchanged(state, root)) {
      const latest = history(state, "drafts").at(-1);
      return { type: "run", instruction: `The owner rejected this page at the final review ("${latest.reason}"); the reason is now a rule. Repair index.html for it, then run next again: the repaired page is probed and shown to the owner again. ${BUILD_CRAFT}`, why: "A rejected page is repaired before it is checked and shown again." };
    }
    // Once a section is accepted and the page and manifest are valid, the step builds the next
    // section; the first screen, even on an existing page, gets the full instruction with the
    // recorded component decision first, keeping source selection ahead of implementation.
    const growing = finished && Boolean(progress?.current) && progress.accepted.length > 0;
    const action = {
      type: "run",
      ...(progress?.current ? { section: progress.current } : {}),
      instruction: `${growing ? "" : `${componentInstruction(state, root)} `}${buildScope(state, progress)} ${BUILD_CRAFT}`,
      why: growing ? "The page grows one reviewed section at a time, in the order of the approved description." : state.tier === "full" ? "Full tier keeps OpenSpec lineage." : "Lighter tiers skip specification ceremony but keep the motion and token conventions.",
      ...(findings ? { findings } : {}),
    };
    if (findings) action.instruction = `${findings.map(finding => `${finding.message} Fix: ${finding.fix}`).join(" ")} ${action.instruction}`;
    return action;
  },
};

const nonEmpty = value => typeof value === "string" && Boolean(value.trim());
// Runtime-review Feedback the owner recorded for a section (runtime-review record output), checked
// against the Record definition of references/runtime-review.schema.json with runtime-review's own
// validator; `runtime-review check` remains the authority on its bundle lineage.
function reviewFeedback(root, paths) {
  const cited = [].concat(paths ?? []);
  if (!cited.length) return [];
  const { validateShape } = require("../runtime-review-core.cjs");
  const { $defs } = require("../../references/runtime-review.schema.json");
  return cited.map(rel => {
    const bytes = projectFile(root, rel);
    let record;
    try {
      record = JSON.parse(bytes ? bytes.toString("utf8") : "null");
      validateShape(record, $defs.Record, "Record", $defs);
    } catch (error) {
      fail("workflow", `--evidence ${rel} is not a recorded runtime-review Feedback inside the project (${bytes ? error.message : "no such contained file"}). Fix: export the Feedback from the runtime-review page, record it with runtime-review record and cite the recorded runtime-review/feedback/<hash>.json`);
    }
    const { feedback } = record;
    return { path: String(rel).split(path.sep).join("/"), sha256: "sha256:" + sha256(bytes), objectId: feedback.objectId, category: feedback.category, actual: feedback.actual.trim(), expected: feedback.expected.trim() };
  });
}

function recordSection(state, root, options, next) {
  if (!sectioned(state)) fail("workflow", "the quick tier builds the page whole and has no section reviews. Fix: follow next");
  if (!["accept", "reject"].includes(options.verdict)) fail("workflow", "--verdict must be accept or reject");
  const id = typeof options.choice === "string" ? options.choice.trim() : "";
  if (!SECTION_ID.test(id)) fail("workflow", "--choice is required: the id of the section the owner reviewed");
  const approval = currentApproval(state, root);
  if (!approval) fail("workflow", "no section can be reviewed until the owner approves the current description. Fix: follow next", { code: "WORKFLOW_NOT_READY" });
  if (!approval.sections.includes(id)) fail("workflow", `section ${id} is not in the approved description (${approval.sections.join(", ")}). Fix: follow next`);
  if (!sectionMarker(id).test(builtSections(root))) fail("workflow", `section ${id} is not built: index.html has no data-section="${id}". Fix: follow next`, { code: "WORKFLOW_NOT_READY" });
  const action = next();
  // Sections are accepted in build order, each when next asks about it; a built section can be
  // rejected again later, which reopens it.
  // The step for this section is the owner's ask or, when the agent reviews sections, its self-check;
  // the build run also names the section while it shows findings, so section alone is not enough.
  if (options.verdict === "accept" && (action.stage !== "build" || !(action.type === "ask" || action.selfCheck) || action.section !== id)) {
    fail("workflow", `Cannot accept section ${id} while next ${action.section ? `is at section ${action.section}` : `is at ${action.stage}`}. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
  }
  if (options.verdict === "reject" && before(state, action.stage, "build")) fail("workflow", `Cannot record a section review while ${action.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
  // The agent cannot undo the owner's "no" by accepting the page they rejected unchanged.
  const latestHere = history(state, "sections").filter(item => item.section === id).at(-1);
  if (options.verdict === "accept" && options.by === "agent" && latestHere?.verdict === "reject" && latestHere.pageSha256 === pageDigest(root)) {
    fail("workflow", `the owner rejected section ${id} and index.html is unchanged since. Fix: revise the section for their comments, then record the acceptance`, { code: "WORKFLOW_NOT_READY" });
  }
  const evidence = reviewFeedback(root, options.evidence);
  const cited = options.verdict === "reject" ? citedRefs(root, options.ref, id) : [];
  const answer = nonEmpty(options.answer) ? options.answer.trim() : null;
  if (options.verdict === "reject" && !answer && !evidence.length) fail("workflow", "a section rejection needs --answer with the owner's comments, or --evidence with their recorded runtime-review Feedback; each becomes a rule");
  if (options.verdict === "reject" && answer) reason(answer, "say in one sentence what the owner wants changed in the section; it becomes a rule");
  const records = [...history(state, "sections"), {
    section: id, verdict: options.verdict, reason: answer,
    ...(evidence.length ? { evidence: evidence.map(({ path: rel, sha256: hash, objectId, category }) => ({ path: rel, sha256: hash, objectId, category })) } : {}),
    description: approval.id, key: sectionKey(state, approval, id), pageSha256: pageDigest(root), at: new Date().toISOString(),
  }];
  // A person's verdict keeps the screenshots they judged; the agent's own self-check keeps nothing.
  // A section --by agent with an art director is the director's verdict (sections are directed).
  const captures = options.by === "owner" || options.by === "agent" && state.director ? reviewedCaptures(root) : null;
  if (captures) records.at(-1).captures = captures;
  state.decisions.sections = records;
  if (options.verdict === "reject") {
    const from = `section ${id} ${rejections(records, item => item.section === id)}`;
    const section = { stage: "section", choice: id };
    if (answer) addRule(state, answer, from, cited.length ? { ...section, refs: cited } : section);
    for (const item of evidence) addRule(state, `${item.objectId}: ${item.actual} Expected: ${item.expected}`, from, section);
  }
}

// Whether interaction.json declares a page audit (`"kind": "audit"`); null when it is not readable
// JSON, which the verify command reports with its own fix.
function declaresAudit(root) {
  try {
    const doc = JSON.parse(fs.readFileSync(path.join(root, "interaction.json"), "utf8"));
    return Array.isArray(doc?.probes) && doc.probes.some((probe) => probe?.kind === "audit");
  } catch {
    return null;
  }
}

// Probe finishes only with a passed gate over a probe file that audits the page, at every tier.
// A replicate probe also binds the reference files and, with a website-clone manifest, needs its fidelity verdict.
const PROBE = {
  id: "probe",
  finished: (state, root) => declaresAudit(root) === true && replicate.cloneComplete(state, root),
  gate: { name: "interaction", inputs: (state, root) => ["interaction.json", "index.html", ...replicate.boundReferenceFiles(state, root)] },
  action: (state, root) => {
    if (!exists(root, "interaction.json")) return { type: "run", instruction: "Write interaction.json: one probe per key interaction plus one audit probe (\"kind\": \"audit\") that measures the local index.html at a desktop and a mobile viewport, with thresholds copied from DESIGN.md, the font families required (schema in references/workflow-web.md#probe)", why: "Every key interaction and the page's measurable craft are verified against the real page, not eyeballed." };
    if (declaresAudit(root) === false) return { type: "run", instruction: "Add an audit probe to interaction.json: one probes entry with \"kind\": \"audit\", a desktop and a mobile viewport, thresholds copied from DESIGN.md with the required font families, and the selectors to declare (references/workflow-web.md#probe); then run next again", why: "The probe stage passes only with a page audit at every tier; without one the verify command cannot finish this stage." };
    if (!replicate.cloneComplete(state, root) && gateStatus(state, root, "interaction", PROBE.gate.inputs(state, root)).status === "passed") return replicate.cloneAction(state, root);
    return { type: "run", command: `${cliCommand()} verify interaction --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --probe interaction.json`, why: "Apply each finding's fix, then run next again." };
  },
};

const DELIVER = {
  id: "deliver",
  finished: (state, root) => deliveryRecorded(state, root) && replicate.cloneComplete(state, root),
  action: (state, root) => !replicate.cloneComplete(state, root) ? replicate.cloneAction(state, root) : ({ type: "run", command: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage deliver --answer <url or path>`, why: "Record where the page is delivered." }),
};

// Quick: a stated decision, components, build, probe and the owner's final review. Standard and full: the conversation, the
// variants (not in replicate, which keeps its reference), the decision round, the approved
// description, the section-by-section build, probe, final review and delivery.
function stages(state) {
  if (state.mode === "replicate") return state.tier === "quick"
    ? [QUICK_INTAKE, replicate.REFERENCE, replicate.EXTRACT, COMPONENTS, BUILD, PROBE, REVIEW]
    : [INTAKE, replicate.REFERENCE, replicate.EXTRACT, COMPONENTS, DESCRIPTION, BUILD, PROBE, REVIEW, DELIVER];
  if (state.tier === "quick") return [QUICK_INTAKE, COMPONENTS, BUILD, PROBE, REVIEW];
  return [INTAKE, REFERENCE, CONCEPTS, COMPONENTS, DESCRIPTION, BUILD, PROBE, REVIEW, DELIVER];
}

// Whether next, standing at `current`, has not yet reached the stage `id` (done is past every stage).
function before(state, current, id) {
  const ids = stages(state).map(stage => stage.id);
  return current !== "done" && ids.indexOf(current) < ids.indexOf(id);
}

// decide for the stages whose web records differ from the shared ones; each receives the action next
// returned before the record.
const decisions = { intake: recordIntake, concept: recordConcept, components: recordComponents, description: recordDescription, section: recordSection };

module.exports = { briefSections, citedRefs, compareStep, decisions, keptCapture, pageDigest, refsCapture, refsCurrent, refsStep, reviewedCaptures, stages, storeReviewed };

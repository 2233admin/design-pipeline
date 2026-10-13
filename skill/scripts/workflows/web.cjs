"use strict";

// Web sub-workflow: motion-first websites and pages.
// Guide: references/workflow-web.md (one section per stage id).
//
// Standard and full work talks before it builds: an opening with a skip line and one open question,
// a playback the owner confirms, three switchable first-screen variants, one round of concrete
// decisions with recommended answers, and a one-page description the owner approves. Only then is
// the page built, one section at a time, each reviewed by the owner, before the final review. Every
// "no" the owner gives on the way, and every anti-goal of the confirmed playback, becomes a project
// rule (state.rules, as for rejected drafts). Quick work states what was decided for the owner
// instead of asking. Film, edit and ui keep the shared stages.

const fs = require("node:fs");
const path = require("node:path");
const { canonicalJson, fail, resolveInside, sha256 } = require("../contract-utils.cjs");
const { COMPONENT_SOURCES, PERMISSIVE_LIST, validateComponentManifest } = require("../design-system-catalog-core.cjs");
const { cliCommand, shellPath, REVIEW, componentDecisionDigest, deliveryRecorded, exists, invalidateCheckedEvidence, reference } = require("./shared.cjs");

const REFERENCE = reference("Watch the supplied reference at full speed and inspect timed frames, or study 1-3 moving web references; write reference.md with observed structure, motion, timing, easing, invariants and uncertainties using references/reference-spec.md. For replication, follow references/reconstruction-spec.md and applicable references/3d-spec.md; the next build starts a bounded graybox. reference.md marks document delivery, not verified observation; do not require aggregate reference readiness before the graybox exists.");

const decideCommand = (root, stage) => `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage ${stage}`;
// Repeatable and optional: the intake commands that take anti-goals carry the flag, so running the
// returned command cannot drop them.
const ANTI_GOALS = ' [--anti-goal "<anti-goal>" ...]';
const history = (state, key) => (Array.isArray(state.decisions?.[key]) ? state.decisions[key] : []);
const rejections = (records, matches = () => true) => records.filter(item => item.verdict === "reject" && matches(item)).length;

// Every "no" the owner gives becomes a project rule, the same record a rejected draft makes.
function addRule(state, text, from) {
  state.rules = [...(state.rules || []), { text, from, scope: "project" }];
}

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

// A recorded decision or "no" must carry content: a go-ahead such as "ok, start" is the silent default
// these records replace. Words are runs of letters or digits, and two CJK characters count as one. A
// decision stated for the owner names what was decided in a sentence; a reason says what is wrong.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const wordCount = text => (text.replace(CJK, " ").match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu) || []).length + (text.match(CJK) || []).length / 2;
function meaningful(answer, minimum, what, flag = "--answer") {
  const text = typeof answer === "string" ? answer.trim() : "";
  if (wordCount(text) < minimum) fail("workflow", `${flag} must ${what} (at least ${minimum} words; two CJK characters count as one)`);
  return text;
}
const statement = (answer, what) => meaningful(answer, 6, what);
const reason = (answer, what, flag) => meaningful(answer, 3, what, flag);

// --- intake: a conversation that ends in a confirmed playback, or a stated skip ----------------------

const SKIP_LINE = "If you'd rather skip these questions, say so: I'll tell you what I assumed, then show you options.";
const OPENING = {
  page: "What site have you seen recently that felt the way this page should, and what about it?",
  replicate: "What must stay exactly as it is in the page you want reproduced?",
};
const CONVERSATION = "Facts are your job: before asking, take what you can from the conversation and the project's files (README, existing pages, DESIGN.md, brand assets; in an existing project run project inspect), and never ask the owner for something you can look up. Send the opening question as its own message, as it is: the skip line, then one open question. Then ask one open question per message, with no list of example answers unless they are stuck: anchor on real specifics (a site they saw, the moment a visitor arrives), ask what would make them wince and what they have seen elsewhere and loved or hated. When you can describe the page, play it back in about 200-300 words: who it is for, what a visitor should do, what it should feel like; mark what they said as theirs and what you guessed as your guess, and end by asking what is wrong or missing. Record each correction with the correction command (it becomes a project rule) and play back again until they confirm; then record the confirmed playback, adding each anti-goal they named (what the page must never be or do) to the record command as its own --anti-goal \"<text>\", which becomes a project rule too. If they say to just start, tell them in one line what you decided on their behalf and record that line with the skip command, with any anti-goal they named added the same way.";

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
      ...(corrected ? { first: `The owner corrected the playback ("${latest.reason}"); each correction is now a project rule. Play it back again with the corrections applied, then ask:` } : {}),
      question: corrected ? "What is wrong or missing in this?" : `${SKIP_LINE} ${OPENING[state.mode === "replicate" ? "replicate" : "page"]}`,
      instruction: CONVERSATION,
      record: `${decideCommand(root, "intake")} --verdict accept --answer "<the playback the owner confirmed>"${ANTI_GOALS}`,
      correction: `${decideCommand(root, "intake")} --verdict reject --answer "<what the owner said is wrong or missing>"`,
      skip: `${decideCommand(root, "intake")} --choice skip --answer "<the line telling the owner what you decided on their behalf>"${ANTI_GOALS}`,
      why: "Intent and taste come from the owner's own words and facts from looking; a skip still states every decision made for them.",
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
    if (antiGoals.length) fail("workflow", "--anti-goal goes with the confirmed playback or a skip; a correction is already a project rule");
    const text = reason(options.answer, "say in one sentence what the owner corrected in the playback; it becomes a project rule");
    state.decisions.playbacks = [...playbacks, { verdict: "reject", reason: text, at }];
    addRule(state, text, `playback ${rejections(state.decisions.playbacks)}`);
  } else {
    fail("workflow", "web intake records the confirmed playback (--verdict accept --answer \"<playback>\"), a correction (--verdict reject --answer \"<what is wrong>\") or a stated skip (--choice skip --answer \"<what you decided for the owner>\"). Fix: follow the intake action from next");
  }
  // Each anti-goal is a "no" given in the conversation; one already among the rules is not repeated.
  for (const text of antiGoals) {
    if ((state.rules || []).some(rule => rule.text === text)) continue;
    addRule(state, text, `anti-goal ${(state.rules || []).filter(rule => /^anti-goal \d+$/.test(rule.from)).length + 1}`);
  }
}

// --- concepts: three structurally different first screens on one switchable page -----------------

const VARIANT_KEYS = ["A", "B", "C"];
const VARIANTS_PAGE = "concepts.html";
const SWITCHER = "data-variant-switcher";
const SWITCHER_SCRIPT = path.resolve(__dirname, "../../tools/variant-switcher/variant-switcher.js").split(path.sep).join("/");
const PRESCREEN = "Before asking the user, agent-pre-screen the three variants: render each first viewport at the same size and combine them into one contact sheet. Require genuinely different layout skeletons, focal elements, type positions and image roles, each declared in a one-line skeleton. Redo any variant with the same skeleton, a common template or hierarchy that collapses, rerender and compare without showing failed variants to the user. A pre-screen is not Visual Acceptance; the user selects the direction.";

// Markup the checks read: a marker or switcher inside an HTML comment is not on the page.
const markup = html => html.replace(/<!--[\s\S]*?-->/g, "");

function variantFindings(root) {
  const html = markup(fileText(root, VARIANTS_PAGE) ?? "");
  const missing = VARIANT_KEYS.filter(key => !new RegExp(`data-variant\\s*=\\s*["']${key}["']`, "i").test(html));
  return [
    ...(missing.length ? [{ code: "variants-incomplete", severity: "error", message: `${VARIANTS_PAGE} marks no first screen data-variant="${missing.join("\", \"")}".`, fix: `Put each of the three first screens in an element marked data-variant="A", "B" or "C" in ${VARIANTS_PAGE}.` }] : []),
    ...(html.includes(SWITCHER) ? [] : [{ code: "variant-switcher-missing", severity: "error", message: `${VARIANTS_PAGE} has no variant switcher (${SWITCHER}).`, fix: `Inline ${SWITCHER_SCRIPT} in ${VARIANTS_PAGE}; it adds the switcher.` }]),
  ];
}

// A pick closes the stage and a later rejection reopens it.
function conceptChosen(state) {
  return history(state, "variants").at(-1)?.verdict === "pick" && Boolean(state.decisions?.concept);
}

const CONCEPTS = {
  id: "concepts",
  finished: conceptChosen,
  action: (state, root) => {
    if (!exists(root, "concepts.md") || !exists(root, VARIANTS_PAGE)) return { type: "run", instruction: `Write concepts.md: three cards, A, B and C, with genuinely different first-screen structures (layout skeleton, focal element, type position and image role, including no image), not just copy or colour. Each card starts with its central idea in one sentence and a one-line skeleton declaring those choices, then the section arc in one line per section (what it is for and its dominant element), what carries the eye down the page, look, tools (one line), and any missing license. Then build ${VARIANTS_PAGE}: one self-contained page with the three first screens as real markup, each in an element marked data-variant="A", "B" or "C" (with data-variant-name), one shown at a time by ?variant=A|B|C, and the floating switcher: inline ${SWITCHER_SCRIPT} (left and right arrows around a label, the ← → keys, visibly not part of the design). The variants are throwaway prototypes: neither the switcher nor the data-variant panels ever go into index.html. ${PRESCREEN} After the pick, extend the chosen card with \`## Treatment\` (references/web-direction.md).`, why: "Structural divergence the owner can flip through before convergence; only the owner picks a direction." };
    const findings = variantFindings(root);
    if (findings.length) return { type: "run", instruction: `${findings.map(item => `${item.message} Fix: ${item.fix}`).join(" ")} Then run next again.`, findings, why: "The owner flips between real first screens on one page, so every variant and the switcher must be there." };
    const latest = history(state, "variants").at(-1);
    const rejected = latest?.verdict === "reject" && latest.sha256 === fileSha(root, VARIANTS_PAGE);
    return {
      type: "ask",
      ...(rejected ? { first: `The owner rejected these variants ("${latest.reason}"); the reason is now a project rule. Redo what it rules out in ${VARIANTS_PAGE} and pre-screen again, then ask:` } : {}),
      question: `Open ${VARIANTS_PAGE} and flip through A, B and C with the arrows or the ← → keys. Which first screen should I build, or what should I combine from them (for example B's header with C's layout)?`,
      show: [VARIANTS_PAGE, "concepts.md"].map(rel => path.join(path.resolve(root), rel)),
      recommended: "Recommend the variant whose structure best serves what the visitor should do first, and say why.",
      record: `${decideCommand(root, "concept")} --choice <A|B|C, or several comma-separated to combine> [--answer "<what to take from each, in the owner's words>"]`,
      correction: `${decideCommand(root, "concept")} --verdict reject --answer "<what is wrong, in the owner's words>"`,
      why: `${PRESCREEN} Each rejection becomes a project rule.`,
    };
  },
};

function recordConcept(state, root, options, next) {
  if (!stages(state).some(stage => stage.id === "concepts")) fail("workflow", `${state.tier === "quick" ? "the quick tier" : "replicate mode, which keeps its reference,"} has no variants to pick or reject. Fix: follow next`);
  if (options.verdict && !["accept", "reject"].includes(options.verdict)) fail("workflow", "--verdict must be reject, or omitted when --choice records the pick");
  const variants = history(state, "variants");
  const page = fileSha(root, VARIANTS_PAGE);
  const at = new Date().toISOString();
  // Variants are picked or rejected only once the owner has been shown them (or later, to reopen).
  const action = next();
  if (before(state, action.stage, "concepts") || action.stage === "concepts" && action.type !== "ask") fail("workflow", `Cannot record a variant ${options.verdict === "reject" ? "rejection" : "pick"} while ${action.stage === "concepts" ? `${VARIANTS_PAGE} is not ready` : `${action.stage} is unfinished`}. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
  if (options.verdict === "reject") {
    if (!page) fail("workflow", `there is no ${VARIANTS_PAGE} to reject. Fix: follow next`, { code: "WORKFLOW_NOT_READY" });
    const text = reason(options.answer, "say in one sentence what the owner rejected in the variants and why; it becomes a project rule");
    state.decisions.variants = [...variants, { verdict: "reject", reason: text, sha256: page, at }];
    addRule(state, text, `variants ${rejections(state.decisions.variants)}`);
    return;
  }
  const choices = String(options.choice ?? "").split(",").map(value => value.trim().toUpperCase()).filter(Boolean);
  if (!choices.length || choices.some(value => !VARIANT_KEYS.includes(value)) || new Set(choices).size !== choices.length) fail("workflow", `--choice must be A, B or C, or several of them comma-separated to combine (the variant keys in ${VARIANTS_PAGE})`);
  const notes = choices.length > 1
    ? reason(options.answer, "say what to take from each combined variant, in the owner's words")
    : typeof options.answer === "string" && options.answer.trim() ? options.answer.trim() : null;
  state.decisions.concept = choices.join(",");
  if (notes) state.decisions.conceptNotes = notes;
  else delete state.decisions.conceptNotes;
  state.decisions.variants = [...variants, { verdict: "pick", choice: state.decisions.concept, ...(page ? { sha256: page } : {}), at }];
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
      instruction: `Ask this as one numbered round: one ❓ Qn per question with its body and options, each option by its label, then ➡️ your recommended answer, and wait for the reply. Settle facts yourself first: find the project's existing components and their paths, and the assets and their licenses, and name what you found instead of asking for it. Add a question only for a concrete decision you can neither look up nor settle from the conversation, such as whether supplied material is licensed for this use. A question whose answer depends on one still open waits for a further numbered round, asked the same way. Record each "no" the owner gives in a round (a recommendation turned down, something ruled out) with the correction command; it becomes a project rule. After the last round, record the components decision once, with the choice ids of the options the owner picked.${sectioned ? " The sections the owner settles go into the description." : ""}`,
      record: `${decideCommand(root, "components")} --choice <${COMPONENT_SOURCES.join("|")}, comma-separated> --answer "<the user's reply>"`,
      correction: `${decideCommand(root, "components")} --verdict reject --answer "<what the owner turned down or ruled out, in their words>"`,
      why: `Record the owner's component source choice before ${sectioned ? "the description and the build" : "building"}; scratch cannot be combined with another choice, github requires a https://github.com/<owner>/<repo> URL in --answer, and discover lets the agent find maintained open-source component libraries and icon sets on GitHub beyond the index itself and record each with its pinned license. Discovery is not permission to copy.`,
    };
  },
};

// The decision round's record: the component sources the owner chose, or a "no" given in a round,
// which becomes a project rule and leaves the stage as it is.
function recordComponents(state, _root, options, next) {
  if (options.verdict !== undefined && options.verdict !== null) {
    if (options.verdict !== "reject" || options.choice) fail("workflow", "a decision-round correction takes --verdict reject and --answer only; the components decision takes --choice and --answer");
    const action = next();
    if (before(state, action.stage, "components")) fail("workflow", `Cannot record a decision-round correction while ${action.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    const text = reason(options.answer, "say in one sentence what the owner turned down or ruled out; it becomes a project rule");
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
// The project's brief file; a differently cased BRIEF.md the owner supplied is extended in place.
function briefName(root) {
  try {
    const names = fs.readdirSync(root);
    return names.includes("brief.md") ? "brief.md" : names.find(name => name.toLowerCase() === "brief.md") || "brief.md";
  } catch { return "brief.md"; }
}
// What an approval was given under: the confirmed playback, the variant pick and the component
// decision. Changing any of them, or the brief's bytes, asks for approval again.
function descriptionUpstream(state) {
  return "sha256:" + sha256(canonicalJson({ playback: state.decisions?.intake?.answer ?? null, concept: state.decisions?.concept ?? null, conceptNotes: state.decisions?.conceptNotes ?? null, components: componentDecisionDigest(state) }));
}
const approvalId = record => "sha256:" + sha256(canonicalJson({ brief: record.sha256, upstream: record.upstream, sections: record.sections }));
// The approval the build follows, or null: the latest description verdict accepted the current
// brief bytes under the current upstream decisions.
function currentApproval(state, root) {
  const latest = history(state, "descriptions").at(-1);
  if (latest?.verdict !== "accept" || !Array.isArray(latest.sections) || !latest.sections.length) return null;
  if (latest.sha256 !== fileSha(root, briefName(root)) || latest.upstream !== descriptionUpstream(state)) return null;
  return { id: approvalId(latest), sections: latest.sections };
}

// The section ids brief.md lists under its `## Sections` heading, in order: one top-level list item
// per section, starting with its id (backticks allowed). Null when the brief has no such heading.
function briefSections(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(line => /^##\s+sections\b/i.test(line));
  if (start < 0) return null;
  const ids = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}(?:\s|$)/.test(line)) break;
    const item = /^(?:[-*+]|\d+[.)])\s+`?([^\s`:,;.]+)/.exec(line);
    if (item) ids.push(item[1]);
  }
  return ids;
}

function descriptionContent(state) {
  const direction = state.mode === "replicate" ? "what is reproduced, its invariants and what changes" : "the chosen first screen (the variant and anything combined from the others)";
  return `one page in plain words that a builder could work from without asking again: what the page is and why; who it is for and the one thing a visitor should do; how it should feel, in the owner's words; goals, non-goals and anti-goals (what would make the owner wince); ${direction}; a \`## Sections\` list of the sections in build order, first screen first, one top-level list item per section that starts with its id (lowercase letters, digits and hyphens) and gives one line on its job, such as \`- hero: today's bakes and the reserve button\`; where the components come from; constraints such as devices, assets and their licenses; and which choices are the owner's and which are your calls, marked as yours. Do not copy the project rules into it: they stay in state.rules and come back with every action, so a rule recorded later needs no edit here. Keep any brief the owner supplied and extend it rather than replacing their words.`;
}

const DESCRIPTION = {
  id: "description",
  finished: (state, root) => Boolean(currentApproval(state, root)),
  action: (state, root) => {
    const file = briefName(root);
    const current = fileSha(root, file);
    if (!current) return { type: "run", instruction: `Write ${file}: ${descriptionContent(state)} Then run next again.`, why: "Nothing is built until the owner approves a written description of it." };
    const latest = history(state, "descriptions").at(-1);
    const first = latest?.verdict === "reject" && latest.sha256 === current
      ? `The owner rejected this description ("${latest.reason}"); it is now a project rule. Revise ${file}, then ask:`
      : latest?.verdict === "accept"
        ? `${file}, the confirmed playback, the chosen variant or the component decision changed after the owner approved the description. Bring ${file} up to date, then ask:`
        : `Before asking, make sure ${file} is the one-page description, then ask:`;
    return {
      type: "ask",
      first,
      question: `Here is the one-page description of what I will build (${file}). Approve it, or tell me what is wrong?`,
      show: [path.join(path.resolve(root), file)],
      instruction: `${file} is ${descriptionContent(state)} Show it to the owner as it is; record each correction (it becomes a project rule), revise and ask again.`,
      recommended: "Approve only when it says what you want; nothing is built before you do.",
      record: `${decideCommand(root, "description")} --verdict accept --choice <the ids of the ## Sections list in ${file}, in its order, comma-separated> [--answer "<the owner's words>"]`,
      correction: `${decideCommand(root, "description")} --verdict reject --answer "<what is wrong, in the owner's words>"`,
      why: "The stage that blocks building (not a state.gates gate): the approval binds this description, the confirmed playback, the chosen variant and the component decision, and fixes the sections the page is built in. Each correction becomes a project rule.",
    };
  },
};

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
    const sections = String(options.choice ?? "").split(",").map(value => value.trim()).filter(Boolean);
    if (!sections.length) fail("workflow", `--choice is required: the ids of the ## Sections list in ${file}, in its order, comma-separated`);
    const listed = briefSections(fileText(root, file) ?? "");
    if (!listed?.length) fail("workflow", `${file} has no ## Sections list. Fix: add a ## Sections heading with one top-level list item per section, in build order, each starting with its id; show the owner the description again and ask for approval`);
    const invalid = listed.find(id => !SECTION_ID.test(id));
    if (invalid) fail("workflow", `${file} lists "${invalid}" under ## Sections; each item must start with its section id (lowercase letters, digits and hyphens). Fix: correct the list, show the owner the description again and ask for approval`);
    if (new Set(listed).size !== listed.length) fail("workflow", `${file} lists a section twice under ## Sections. Fix: list each section once, in build order`);
    if (listed.join(",") !== sections.join(",")) fail("workflow", `--choice ${sections.join(",")} does not match the ## Sections list in ${file} (${listed.join(", ")}). Fix: --choice lists exactly those ids, in that order`);
    const note = typeof options.answer === "string" && options.answer.trim() ? options.answer.trim() : null;
    state.decisions.descriptions = [...history(state, "descriptions"), { verdict: "accept", sha256: current, upstream: descriptionUpstream(state), sections, ...(note ? { note } : {}), at }];
  } else if (options.verdict === "reject") {
    if (before(state, action.stage, "description") || !current) fail("workflow", `Cannot reject the description before ${file} is written for approval. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
    const text = reason(options.answer, "say in one sentence what is wrong with the description; it becomes a project rule");
    state.decisions.descriptions = [...history(state, "descriptions"), { verdict: "reject", reason: text, sha256: current, at }];
    addRule(state, text, `description ${rejections(state.decisions.descriptions)}`);
  } else {
    fail("workflow", "--verdict must be accept or reject");
  }
}

// The variant switcher and its panels are prototype tools, so the built page may carry none of them:
// no data-variant panels, no switcher markup or script inline, and no loaded local script that
// carries the switcher under another name. Returns what was found, or null.
function shippedSwitcher(root, html) {
  const page = markup(html);
  if (/\sdata-variant(?:-name)?(?=\s*=|[\s/>])/i.test(page)) return "data-variant panels";
  if (/variant-switcher/i.test(page)) return "the switcher's markup or script";
  const loaded = [...page.matchAll(/<script\b[^>]*?\ssrc\s*=\s*["']([^"'#?]+)/gi)].map(match => match[1].trim())
    .find(ref => ref && !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(ref) && /variant-switcher/i.test(fileText(root, ref) ?? ""));
  return loaded ? `the script ${loaded}, which carries the switcher` : null;
}

function buildStatus(state, root) {
  if (!COMPONENTS.finished(state)) return { finished: false };
  try {
    if (!fs.statSync(path.join(root, "index.html")).isFile()) return { finished: false };
    validateComponentManifest(JSON.parse(fs.readFileSync(path.join(root, "component-manifest.json"), "utf8")), {
      root, decision: state.decisions.components, componentSources: state.decisions.componentSources,
    });
    const shipped = shippedSwitcher(root, fs.readFileSync(path.join(root, "index.html"), "utf8"));
    if (shipped) return { finished: false, findings: [{
      code: "variant-switcher-shipped", severity: "error", message: `index.html ships part of the prototype variant switcher: ${shipped}.`,
      fix: `Remove it from index.html: the variant switcher, its script and the data-variant panels never ship${stages(state).some(stage => stage.id === "concepts") ? `; they stay in ${VARIANTS_PAGE}` : ""}.`,
    }] };
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
// is unbuilt or not accepted, and the sections accepted before it. Verdicts given under an earlier
// approval do not count.
function sectionProgress(state, root) {
  const approval = currentApproval(state, root);
  if (!approval) return null;
  const html = builtSections(root);
  const records = history(state, "sections").filter(item => item.description === approval.id);
  const accepted = [];
  for (const id of approval.sections) {
    const latest = records.filter(item => item.section === id).at(-1);
    const built = sectionMarker(id).test(html);
    if (!built || latest?.verdict !== "accept") return { approval, accepted, current: id, built, latest };
    accepted.push(id);
  }
  return { approval, accepted, current: null };
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

function buildFinished(state, root) {
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
  if (accepted.length) return `Build the next section, \`${current}\`, from its section brief ${place} (accepted so far: ${accepted.join(", ")}). Keep the accepted sections as the owner accepted them unless a project rule requires a change, and add every component it uses to component-manifest.json.`;
  const treatment = replicate ? "" : "Extend the chosen card in concepts.md (for a combination, the first card named, saying what it takes from the others) with `## Treatment`; its section arc lists exactly the sections of the approved description's ## Sections list, in that order, and a different arc goes back to the owner as a description correction before anything is built. Write the section briefs (references/web-direction.md). ";
  return `${openSpec}${treatment}Build only the first screen, section \`${current}\`, from ${replicate ? "the reference and its invariants" : "the chosen variant and the approved description"} ${place}; the other sections follow one at a time after the owner reviews it.`;
}

function sectionReview(root, { approval, accepted, current, latest }) {
  const unrevised = latest?.verdict === "reject" && latest.pageSha256 === pageDigest(root);
  return {
    type: "ask",
    section: current,
    ...(unrevised ? { first: `The owner asked for changes to section ${current} ("${latest.reason || "see the cited runtime-review Feedback"}"); each comment is now a project rule. Revise the section, then ask:` } : {}),
    question: `The ${current} section is built (${accepted.length + 1} of ${approval.sections.length}). Look at it in the page: accept it as it is, or tell me what to change, naming each element by its text, label or where it sits?`,
    show: [path.join(path.resolve(root), "index.html")],
    instruction: `Open index.html at the ${current} section (data-section="${current}") in a real browser and let the owner look and interact. Comments are text: ask them to name each element they comment on by its text, label or place, and do not offer to let them click or pick elements on the page. If the project already carries runtime-review inputs (references/runtime-review.md), Feedback the owner leaves on its runtime-review page can be recorded with runtime-review record and cited with --evidence. Any change they ask for is a reject: record it, revise the section and ask again; accept only a section they are happy with as it is.`,
    recommended: "Accept only when nothing in this section needs to change; earlier sections stay accepted unless a new rule changes them.",
    record: `${decideCommand(root, "section")} --choice ${current} --verdict accept|reject [--answer "<the owner's comments>"] [--evidence <runtime-review/feedback/<hash>.json>]`,
    why: "The page is built one section at a time, first screen first; the next section starts only after the owner reviews this one. Each comment becomes a project rule. A section verdict is not Visual Acceptance of the page; the final review is.",
  };
}

const BUILD = {
  id: "build",
  finished: buildFinished,
  action: (state, root) => {
    const { finished, findings } = buildStatus(state, root);
    const progress = sectioned(state) ? sectionProgress(state, root) : null;
    if (finished && progress?.current && progress.built) return sectionReview(root, progress);
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
  if (options.verdict === "accept" && (action.stage !== "build" || action.type !== "ask" || action.section !== id)) {
    fail("workflow", `Cannot accept section ${id} while next ${action.section ? `is at section ${action.section}` : `is at ${action.stage}`}. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
  }
  if (options.verdict === "reject" && before(state, action.stage, "build")) fail("workflow", `Cannot record a section review while ${action.stage} is unfinished. Fix: follow next.`, { code: "WORKFLOW_NOT_READY" });
  const evidence = reviewFeedback(root, options.evidence);
  const answer = nonEmpty(options.answer) ? options.answer.trim() : null;
  if (options.verdict === "reject" && !answer && !evidence.length) fail("workflow", "a section rejection needs --answer with the owner's comments, or --evidence with their recorded runtime-review Feedback; each becomes a project rule");
  if (options.verdict === "reject" && answer) reason(answer, "say in one sentence what the owner wants changed in the section; it becomes a project rule");
  const records = [...history(state, "sections"), {
    section: id, verdict: options.verdict, reason: answer,
    ...(evidence.length ? { evidence: evidence.map(({ path: rel, sha256: hash, objectId, category }) => ({ path: rel, sha256: hash, objectId, category })) } : {}),
    description: approval.id, pageSha256: pageDigest(root), at: new Date().toISOString(),
  }];
  state.decisions.sections = records;
  if (options.verdict === "reject") {
    const from = `section ${id} ${rejections(records, item => item.section === id)}`;
    if (answer) addRule(state, answer, from);
    for (const item of evidence) addRule(state, `${item.objectId}: ${item.actual} Expected: ${item.expected}`, from);
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
const PROBE = {
  id: "probe",
  finished: (_state, root) => declaresAudit(root) === true,
  gate: { name: "interaction", inputs: () => ["interaction.json", "index.html"] },
  action: (_state, root) => {
    if (!exists(root, "interaction.json")) return { type: "run", instruction: "Write interaction.json: one probe per key interaction plus one audit probe (\"kind\": \"audit\") that measures the local index.html at a desktop and a mobile viewport, with thresholds copied from DESIGN.md, the font families required (schema in references/workflow-web.md#probe)", why: "Every key interaction and the page's measurable craft are verified against the real page, not eyeballed." };
    if (declaresAudit(root) === false) return { type: "run", instruction: "Add an audit probe to interaction.json: one probes entry with \"kind\": \"audit\", a desktop and a mobile viewport, thresholds copied from DESIGN.md with the required font families, and the selectors to declare (references/workflow-web.md#probe); then run next again", why: "The probe stage passes only with a page audit at every tier; without one the verify command cannot finish this stage." };
    return { type: "run", command: `${cliCommand()} verify interaction --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --probe interaction.json`, why: "Apply each finding's fix, then run next again." };
  },
};

const DELIVER = {
  id: "deliver",
  finished: deliveryRecorded,
  action: (_state, root) => ({ type: "run", command: `${cliCommand()} decide --root ${shellPath(path.resolve(root))} --project-root ${shellPath(path.resolve(root))} --stage deliver --answer <url or path>`, why: "Record where the page is delivered." }),
};

// Quick: a stated decision, components, build, probe. Standard and full: the conversation, the
// variants (not in replicate, which keeps its reference), the decision round, the approved
// description, the section-by-section build, probe, final review and delivery.
function stages(state) {
  if (state.mode === "replicate") return state.tier === "quick"
    ? [QUICK_INTAKE, REFERENCE, COMPONENTS, BUILD, PROBE]
    : [INTAKE, REFERENCE, COMPONENTS, DESCRIPTION, BUILD, PROBE, REVIEW, DELIVER];
  if (state.tier === "quick") return [QUICK_INTAKE, COMPONENTS, BUILD, PROBE];
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

module.exports = { decisions, stages };

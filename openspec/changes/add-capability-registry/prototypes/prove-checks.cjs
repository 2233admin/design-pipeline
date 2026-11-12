// Throwaway prototype (Task 5 deletes this folder). A working model of the checks of design.md section 6.
// It reads the tool list that convert-appendix.cjs builds from the appendix, and only what the shipped
// modules already export: cli-core (publicHelp, execute), workflow-core (DELIVERABLES, TIERS, initState,
// nextAction, decide) and workflows/{film,edit,web}.cjs (stages). `ui` has no stage module, so it is read
// by walking `next`. It also reads files as text: the two SKILL.md files, the guides and the scripts.
// It writes nothing except temp files. Exit code 1 when a problem is found.
// Run from anywhere:  node openspec/changes/add-capability-registry/prototypes/prove-checks.cjs [mutation]
// Each mutation breaks one input; the run must then print the code in brackets.
//   rename-film-check [HELP_ENTRY, NEXT_NAMES]   drop-decide-work [NEXT_NAMES]   expert-film-check [NEXT_NAMES]
//   help-extra-line [HELP_ENTRY]   help-missing-line [HELP_ENTRY]   drop-render-score [SCRIPT_UNACCOUNTED]
//   skill-unlisted [SKILL_NAMES]   repo-skill-alias [SKILL_NAMES]   repo-skill-old-bullets [SKILL_NAMES]
//   repo-skill-evals-path [SKILL_NAMES]   guide-bad-heading [GUIDE_MISSING]
//   (the command table itself is checked by prove-table.cjs)
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const repo = path.resolve(__dirname, "../../../..");
const skillRoot = path.join(repo, "skill");
const mutate = process.argv[2];
const problems = [];
const bad = (m) => problems.push(m);

// ---- the tool list, built from the appendix ----
const listFile = path.join(os.tmpdir(), "tool-list-from-appendix.json");
const conv = cp.spawnSync(process.execPath, [path.join(__dirname, "convert-appendix.cjs"), listFile], { encoding: "utf8" });
if (conv.status !== 0) { console.error(conv.stdout + conv.stderr); process.exit(1); }
let list;
try {
  list = JSON.parse(fs.readFileSync(listFile, "utf8"));
} catch (error) {
  console.error(`cannot read ${listFile}: ${error.message}`);
  process.exit(1);
}
const entries = list.entries.map((e) => ({ ...e, command: e.official.command, doc: e.official.doc, script: e.official.script }));
const one = (cmd) => entries.find((e) => e.command === cmd);
if (mutate === "rename-film-check") one("film check").command = "film verify";
if (mutate === "drop-decide-work") one("decide").stages = one("decide").stages.filter((s) => s !== "ui:work");
if (mutate === "expert-film-check") one("film check").exposure = "expert";
if (mutate === "guide-bad-heading") one("film check").guide = "references/workflow-film.md#nosuch";
const cmdEntries = entries.filter((e) => e.command);
const byCmd = new Map(cmdEntries.map((e) => [e.command, e]));
const cmdWords = new Set(cmdEntries.map((e) => e.command.split(" ")[0]));
const hasActions = (c) => cmdEntries.some((e) => e.command.startsWith(c + " ") && !e.command.startsWith(c + " --"));

// ---- shipped exports only ----
const { publicHelp, execute } = require(path.join(skillRoot, "scripts/cli-core.cjs"));
const wc = require(path.join(skillRoot, "scripts/workflow-core.cjs"));

// ---- help reader (uses the export publicHelp) ----
function helpPaths(text) {
  const paths = new Set();
  for (const line of text.split("\n").filter((l) => /^ {2}\S/.test(l))) {
    let last = null;
    for (let seg of line.trim().split(/ \| /)) {
      seg = seg.replace(/\(.*?\)/g, " ").trim();
      const tokens = seg.split(/\s+/);
      const head = tokens[0];
      if (last && head === "--gate") { for (const g of tokens[1].split("|")) paths.add(`${last} --gate ${g}`); continue; }
      if (/^--|^\[|^</.test(head)) continue;
      const second = tokens[1];
      if (!second || /^--|^\[|^</.test(second)) { paths.add(head); last = head; continue; }
      if (/^[a-z][a-z-]*(\|[a-z][a-z-]*)*$/.test(second)) { for (const a of second.split("|")) paths.add(`${head} ${a}`); last = head; continue; }
      paths.add(head); last = head;
    }
  }
  return paths;
}

// ---- B: help <-> entries, and the deferred proof through execute ----
let helpText = publicHelp();
if (mutate === "help-extra-line") helpText += "\n  film verify --project-root <dir>";
if (mutate === "help-missing-line") helpText = helpText.replace("  source audit\n", "");
const fromHelp = helpPaths(helpText);
const expected = new Set(cmdEntries.filter((e) => e.status !== "deferred").map((e) => e.command));
for (const p of fromHelp) if (!expected.has(p)) bad(`HELP_ENTRY help names \`${p}\` but no non-deferred entry has it`);
for (const p of expected) if (!fromHelp.has(p)) bad(`HELP_ENTRY entry \`${p}\` is not named by --help`);
for (const e of cmdEntries.filter((x) => x.status === "deferred")) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "def-"));
  const out = execute([...e.command.split(" "), "--root", tmp, "--json"]).output;
  if (out?.error?.code !== "COMMAND_DEFERRED") bad(`deferred entry ${e.command} answered ${out?.error?.code}`);
}
console.log(`B  help paths: ${fromHelp.size}, non-deferred entries: ${expected.size}, first words: ${cmdWords.size}`);

// ---- T: what the command table lists today (a measurement; after T6 the checks use commandPaths(), see prove-table.cjs) ----
const cliSrc = fs.readFileSync(path.join(skillRoot, "scripts/cli-core.cjs"), "utf8");
function tableBlock(src) {
  const start = src.indexOf("const COMMANDS = {");
  const end = src.indexOf("\n};\n", start);
  return start < 0 || end < 0 ? "" : src.slice(start, end);
}
const NAME = /^ {2}(?:"([a-z0-9-]+)"|([a-z][a-z0-9]*)):/gm;
{ // what the table can and cannot show (numbers used in design.md section 11); measured on the unmutated source
  // a command "lists its actions" when the word `actions:` is in the first three lines of its own entry
  const block = tableBlock(cliSrc);
  const found = [...block.matchAll(NAME)];
  const all = found.map((m) => m[1] || m[2]);
  const declared = all.filter((_name, i) => {
    const entry = block.slice(found[i].index, i + 1 < found.length ? found[i + 1].index : block.length);
    return /\bactions:/.test(entry.split("\n").slice(0, 3).join("\n"));
  });
  const rowsOf = (k) => cmdEntries.filter((e) => e.command.split(" ")[0] === k);
  const declaredRows = declared.flatMap(rowsOf).length;
  const routed = all.filter((k) => !declared.includes(k));
  const routedRows = routed.flatMap(rowsOf);
  const alone = routedRows.filter((e) => !e.command.includes(" ")).length;
  const withActions = new Set(routedRows.filter((e) => e.command.includes(" ")).map((e) => e.command.split(" ")[0])).size;
  console.log(`T  table names: ${all.length}; list their actions: ${declared.length} (${declaredRows} rows); route inside the handler: ${routed.length} (${routedRows.length} rows: ${alone} are a command alone, ${routedRows.length - alone} are actions of ${withActions} commands)`);
}

// ---- stage lists and next actions, existing exports only ----
const rich = fs.mkdtempSync(path.join(os.tmpdir(), "rich-")), empty = fs.mkdtempSync(path.join(os.tmpdir(), "empty-"));
const touch = (rel) => { fs.mkdirSync(path.dirname(path.join(rich, rel)), { recursive: true }); fs.writeFileSync(path.join(rich, rel), "x"); };
for (const f of ["brief.md", "reference.md", "concepts.md", "storyboard.json", "out.mp4", "edit.json", "index.html", "interaction.json", "edit/analysis.json", "renders/edit.mp4"]) touch(f);
fs.mkdirSync(path.join(rich, "sources"), { recursive: true });
const workflowsDir = path.join(skillRoot, "scripts/workflows");
const moduleFor = (d) => (fs.existsSync(path.join(workflowsDir, `${d}.cjs`)) && d !== "shared" ? require(path.join(workflowsDir, `${d}.cjs`)) : null);
const FINISH = { intake: { stage: "intake", answer: "x" }, work: { stage: "deliver", answer: "x" } };
// A deliverable with no module is walked through `next`: record each stage and its text, finish it, repeat.
function walk(d, tier, mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "walk-"));
  wc.initState(dir, { deliverable: d, tier, mode });
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const a = wc.nextAction(dir);
    if (a.type === "done") return seen;
    seen.push({ id: a.stage, texts: [JSON.stringify(a)] });
    if (!FINISH[a.stage]) throw new Error(`walk cannot finish stage ${d}:${a.stage}`);
    const before = a.stage;
    wc.decide(dir, FINISH[a.stage]);
    if (wc.nextAction(dir).stage === before) throw new Error(`walk stalled at ${d}:${before}`);
  }
  throw new Error("walk did not end");
}
function stagesOf(d, tier, mode) {
  const mod = moduleFor(d);
  if (!mod) return walk(d, tier, mode);
  const state = { deliverable: d, tier, mode, decisions: {}, gates: {}, rules: [], director: null };
  return mod.stages(state).map((s) => ({ id: s.id, texts: [empty, rich].map((r) => JSON.stringify(s.action(state, r))) }));
}
const stageIds = {};
const lists = {};
for (const d of wc.DELIVERABLES) {
  lists[d] = {};
  for (const tier of wc.TIERS) for (const mode of ["brief", "replicate", "freeform"]) lists[d][`${tier}/${mode}`] = stagesOf(d, tier, mode);
  const ref = lists[d]["standard/replicate"].map((s) => s.id);
  for (const [k, v] of Object.entries(lists[d])) {
    const ids = v.map((s) => s.id);
    let at = -1;
    for (const id of ids) { const i = ref.indexOf(id); if (i <= at) bad(`C0 ${d} ${k}: ${ids} is not an ordered part of ${ref}`); at = i; }
    if (k.endsWith("/freeform") && JSON.stringify(ids) !== JSON.stringify(lists[d][k.replace("/freeform", "/brief")].map((s) => s.id))) bad(`C0 ${d} ${k}: freeform differs from brief`);
  }
  stageIds[d] = ref;
}
console.log("C0 stage lists:", Object.entries(stageIds).map(([d, v]) => `${d} ${v.length}`).join(", "), "| ui walks:", ["quick", "standard", "full"].map((t) => lists.ui[`${t}/brief`].map((s) => s.id).join(">")).join(" ; "));

// ---- literals rule: first word must be the first word of a command entry ----
const LITERAL = /designer-pipeline(?:\.cjs)?[ \t]+([a-z][a-z0-9-]*)(?:[ \t]+(--gate[ \t]+[a-z-]+|[a-z][a-z0-9-]*))?/g;
function literals(text) {
  const found = [];
  for (const m of text.matchAll(LITERAL)) {
    const [, c, a] = m;
    if (!cmdWords.has(c)) continue;
    found.push(a && hasActions(c) ? `${c} ${a}` : c);
  }
  return found;
}
const resolves = (lit) => byCmd.has(lit) || (cmdWords.has(lit) && cmdEntries.some((e) => e.command.startsWith(lit + " ")));

// ---- C1: what next names, per stage ----
const named = new Map(), docNamed = new Map();
const docPaths = new Set(entries.filter((e) => e.doc).map((e) => e.doc));
for (const d of wc.DELIVERABLES) for (const tier of wc.TIERS) for (const mode of ["brief", "replicate"]) for (const st of lists[d][`${tier}/${mode}`]) for (const text of st.texts) {
  for (const lit of literals(text)) { if (!named.has(lit)) named.set(lit, new Set()); named.get(lit).add(`${d}:${st.id}`); }
  for (const p of docPaths) if (text.includes(p)) { if (!docNamed.has(p)) docNamed.set(p, new Set()); docNamed.get(p).add(`${d}:${st.id}`); }
}
const start = JSON.stringify(wc.nextAction(empty));
for (const lit of literals(start)) { if (!named.has(lit)) named.set(lit, new Set()); named.get(lit).add("start"); }
for (const [lit, where] of named) {
  const e = byCmd.get(lit);
  if (!e) { bad(`NEXT_NAMES next names a command that is not in the tool list: ${lit}`); continue; }
  if (e.status !== "active" || e.exposure !== "public") bad(`NEXT_NAMES next names ${lit} but it is ${e.status}/${e.exposure}`);
  for (const w of where) if (w !== "start" && !e.stages.includes(w)) bad(`NEXT_NAMES ${lit} is named at ${w} but the tool list stages are [${e.stages}]`);
}
console.log("C1 commands named by next:", [...named.keys()].sort().join(" | "));

// ---- C2/C3: every public entry is named by next or its guide section ----
const sections = {};
for (const d of ["film", "edit", "web"]) { const t = fs.readFileSync(path.join(skillRoot, `references/workflow-${d}.md`), "utf8"); sections[d] = Object.fromEntries(t.split(/^## /m).slice(1).map((p) => [p.split("\n")[0].trim(), p])); }
for (const e of cmdEntries.filter((x) => x.exposure === "public")) {
  if (e.command === "next") { if (!named.has("next")) bad("STAGE_UNPROVEN next is not named by the start action"); continue; }
  if (!e.stages.length) bad(`STAGE_UNPROVEN public command ${e.command} has no stages`);
  for (const pair of e.stages) {
    const [d, s] = pair.split(":");
    if (!(named.get(e.command)?.has(pair)) && !(sections[d]?.[s] || "").includes(e.command)) bad(`STAGE_UNPROVEN ${e.command} claims ${pair} but neither a next action nor the guide section names it`);
  }
}
for (const e of entries.filter((x) => x.doc)) {
  if (/workflow-(film|edit|web)\.md$/.test(e.doc)) continue;
  for (const pair of e.stages) {
    const [d, s] = pair.split(":");
    const base = e.doc.replace(/^references\//, "");
    if (!docNamed.get(e.doc)?.has(pair) && !(sections[d]?.[s] || "").includes(base)) bad(`STAGE_UNPROVEN ${e.doc} claims ${pair} but nothing names it there`);
  }
  for (const w of docNamed.get(e.doc) || []) if (!e.stages.includes(w)) bad(`NEXT_NAMES next names ${e.doc} at ${w} but the tool list stages are [${e.stages}]`);
}

// ---- D: guide anchors (path#heading) ----
const anchorOf = (heading) => heading.trim().toLowerCase().replace(/[^a-z0-9 -]/g, "").replace(/ /g, "-");
function anchorsOf(markdown) {
  const anchors = new Set();
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; continue; }
    const m = !fenced && line.match(/^#{1,6}[ \t]+(.+?)[ \t]*$/);
    if (m) anchors.add(anchorOf(m[1]));
  }
  return anchors;
}
function guideProblem(guide) {
  const [file, anchor] = guide.split("#");
  const p = path.join(skillRoot, file);
  if (!fs.existsSync(p)) return `file ${file} does not exist`;
  if (anchor !== undefined && !anchorsOf(fs.readFileSync(p, "utf8")).has(anchor)) return `no heading gives #${anchor} in ${file}`;
  return null;
}
for (const e of entries.filter((x) => x.guide)) { const m = guideProblem(e.guide); if (m) bad(`GUIDE_MISSING ${e.id}: ${m}`); }
const controls = ["references/workflow-film.md#check", "references/workflow-edit.md#analyze", "references/workflow-web.md#probe", "SKILL.md#loop"];
console.log(`D  guide values with #: ${entries.filter((e) => (e.guide || "").includes("#")).length}; controls found: ${controls.filter((c) => !guideProblem(c)).length}/${controls.length}; a wrong heading is caught: ${guideProblem("references/workflow-film.md#nosuch") ? "yes" : "NO"}`);

// ---- C4: SKILL.md and the repo skill ----
const docEntry = new Map(entries.filter((e) => e.doc).map((e) => [e.doc, e]));
const WORKFLOW = ["film", "edit", "web"].map((d) => `references/workflow-${d}.md`);
function guidePathsOf(text) {
  const out = [];
  for (const m of text.matchAll(/(?:skill\/)?(?:references|evals)\/[A-Za-z0-9._/-]+/g)) {
    const p = m[0].replace(/^skill\//, "").replace(/[.,;)]+$/, "");
    if (p.endsWith(".md") || p.endsWith("/")) out.push(p);
  }
  return out;
}
function checkSkillText(label, text, docs = docEntry) {
  for (const p of guidePathsOf(text)) {
    const e = docs.get(p);
    if (!e) bad(`SKILL_NAMES ${label} names a guide that has no entry: ${p}`);
    else if (e.status !== "active") bad(`SKILL_NAMES ${label} names ${p} (${e.status})`);
  }
  for (const lit of literals(text)) { const e = byCmd.get(lit); if (e && e.status !== "active") bad(`SKILL_NAMES ${label} names ${lit} (${e.status})`); if (!resolves(lit)) bad(`SKILL_NAMES ${label} names an unresolved command ${lit}`); }
  for (const w of WORKFLOW) if (!text.includes(w)) bad(`SKILL_NAMES ${label} does not name ${w}`);
}
const swap = (t, from, to) => { if (t.split(from).length !== 2) throw new Error(`T4 text not found exactly once (has T4 already landed? then run node scripts/tool-list.cjs --check instead): ${from}`); return t.replace(from, to); };
const skillText = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
const repoText = fs.readFileSync(path.join(repo, ".claude/skills/design-pipeline/SKILL.md"), "utf8");
// what Task T4 does to the two files
const skillAfterT4 = swap(skillText, "- Every command: `designer-pipeline --help`", "- Which tool or guide at which stage: `references/tool-map.md`\n- Every command: `designer-pipeline --help`");
let repoAfterT4 = swap(repoText, "`next` with `--deliverable film` (`skill/references/product-film-direction.md`)", "`next` with `--deliverable film` (`skill/references/workflow-film.md`)");
repoAfterT4 = swap(repoAfterT4, "`next` with `--deliverable edit` (`skill/references/film-edit.md`)", "`next` with `--deliverable edit` (`skill/references/workflow-edit.md`)");
repoAfterT4 = swap(repoAfterT4, "`next` with `--deliverable web` or `ui` (`skill/references/pipeline-reference.md`)", "`next` with `--deliverable web` (`skill/references/workflow-web.md`) or `ui` (`skill/references/pipeline-reference.md`)");
repoAfterT4 = swap(repoAfterT4, "- Test manifest: `scripts/test-manifest.json`", "- Test manifest: `scripts/test-manifest.json`\n- Which tool or guide at which stage: `skill/references/tool-map.md` (generated; edit `scripts/tool-list.json`, then run `node scripts/tool-list.cjs --write`)");
const mapEntry = { status: "active", exposure: "public" };
const withMap = new Map(docEntry); withMap.set("references/tool-map.md", mapEntry); // the map is listed but does not exist yet
const repoBefore = swap(repoText, "- Test manifest: `scripts/test-manifest.json`", "- Test manifest: `scripts/test-manifest.json`\n- Which tool or guide at which stage: `skill/references/tool-map.md`");
checkSkillText("SKILL.md", mutate === "skill-unlisted" ? skillAfterT4 + " `references/web-treatment.md`" : skillAfterT4, withMap);
checkSkillText("repo skill", mutate === "repo-skill-alias" ? repoAfterT4 + " `designer-pipeline high-fidelity check`" : mutate === "repo-skill-evals-path" ? repoAfterT4 + " `skill/evals/web/README.md`" : mutate === "repo-skill-old-bullets" ? repoBefore : repoAfterT4, withMap);
{ // controls: an evals path with an entry passes; the file as it is today (before T4) fails only on the three workflow guides
  const before = problems.length;
  const withEval = new Map(withMap); withEval.set("evals/web/README.md", { status: "active", exposure: "internal" });
  checkSkillText("control: repo skill naming evals/web/README.md with an entry", repoAfterT4 + " `skill/evals/web/README.md`", withEval);
  const evalsControl = problems.length - before; problems.length = before;
  checkSkillText("control: repo skill as it is today", repoBefore, withMap);
  const todayProblems = problems.slice(before).map((p) => p.replace(/^.*does not name /, "")); problems.length = before;
  console.log(`C4 controls: evals path with an entry -> ${evalsControl} problems (expected 0); repo skill before T4 -> ${todayProblems.length} problems: ${todayProblems.join(", ")}`);
}
for (const e of entries.filter((x) => x.doc)) {
  if (/workflow-(film|edit|web)\.md$/.test(e.doc)) continue;
  if (!skillAfterT4.includes(e.doc) && !repoAfterT4.includes(e.doc) && !docNamed.has(e.doc)) bad(`GUIDE_UNNAMED public guide ${e.doc} is named by no text`);
}
for (const w of WORKFLOW) if (!skillText.includes(w)) bad(`GUIDE_UNNAMED ${w} is not named by SKILL.md`);

// ---- C6: every #! script accounted for ----
const officialScripts = new Set(entries.filter((e) => e.script).map((e) => e.script));
const aliasScripts = new Set(entries.flatMap((e) => (e.aliases || []).map((a) => a.replace(/^node skill\/scripts\//, ""))));
const internal = new Set(list.internalScripts.map((s) => s.script));
if (mutate === "drop-render-score") internal.delete("render-score.cjs");
for (const f of fs.readdirSync(path.join(skillRoot, "scripts")).filter((n) => n.endsWith(".cjs"))) {
  if (!fs.readFileSync(path.join(skillRoot, "scripts", f), "utf8").startsWith("#!")) continue;
  if (!officialScripts.has(f) && !aliasScripts.has(f) && !internal.has(f)) bad(`SCRIPT_UNACCOUNTED ${f}`);
}

// ---- C5: command examples ----
function walkFiles(dir, out = []) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walkFiles(p, out); else out.push(p); } return out; }
const scan = [
  ...walkFiles(path.join(skillRoot, "scripts")).filter((f) => f.endsWith(".cjs")),
  path.join(skillRoot, "SKILL.md"),
  path.join(repo, ".claude/skills/design-pipeline/SKILL.md"),
  ...entries.filter((e) => e.doc && e.doc.endsWith(".md")).map((e) => path.join(skillRoot, e.doc)).filter((f) => fs.existsSync(f)),
];
let total = 0;
for (const f of scan) {
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(LITERAL)) {
    const [, c, a] = m; if (!cmdWords.has(c)) continue; total++;
    if (a && hasActions(c) && !byCmd.has(`${c} ${a}`)) bad(`LITERAL_UNKNOWN ${path.relative(repo, f)}: unknown command \`${c} ${a}\``);
  }
}
console.log(`C5 scanned ${scan.length} files, ${total} command literals`);
console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + problems.map((p) => " - " + p).join("\n") : "ALL CHECKS PASS");
process.exitCode = problems.length ? 1 : 0;

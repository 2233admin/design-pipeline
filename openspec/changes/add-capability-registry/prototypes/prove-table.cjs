// Throwaway prototype (Task 5 deletes this folder). A working model of task T6: the command table lists every
// action (and says `actions: []` for the ten commands that take none), the dispatcher refuses the rest, including a
// stray word after `next` or `decide`, and `commandPaths()` reports the rows. Nothing in the repository changes:
// it copies skill/scripts to the OS temp folder (the other skill folders are linked, not copied), patches the copy
// of cli-core.cjs in memory, and then checks the patched copy against the unpatched original.
// Run from anywhere:  node openspec/changes/add-capability-registry/prototypes/prove-table.cjs [mutation]
// Mutations (each must make the run print the code in brackets):
//   dead-action [TABLE_ENTRY, DEAD_ACTION]   a name is declared that the handler does not have
//   dead-change-action [DEAD_ACTION]         the same for `change`, which reads an option before its action
//   lost-action [TABLE_ENTRY, BEHAVIOUR]     a real action is left out of the declared names
//   next-stray-not-refused [STRAY_WORD]      `next` is left without `actions: []`, so a stray word is not refused as the others are
//   refusal-too-broad [BEHAVIOUR]            the refusal fires even when there is no stray word, so a plain `next` breaks
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const repo = path.resolve(__dirname, "../../../..");
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
const rows = list.entries.filter((e) => e.official.command).map((e) => e.official.command);
const HANDLER_ROUTED = ["change", "evidence", "verify", "patterns", "design-system", "component", "component-first", "component-first-v2", "design-skill", "high-fidelity", "mengto", "shadcnio", "prism", "holosticker", "designmd", "iart", "toolchain", "execution", "adapter", "adaptation"];
const rowNames = {}, gates = [];
for (const r of rows) {
  const [cmd, ...rest] = r.split(" ");
  if (!HANDLER_ROUTED.includes(cmd) || !rest.length) continue;
  if (rest[0] === "--gate") { gates.push(rest[1]); continue; }
  (rowNames[cmd] ||= []).push(rest.join(" "));
}
const names = Object.fromEntries(Object.entries(rowNames).map(([k, v]) => [k, [...v]])); // what the patch declares
if (mutate === "dead-action") names.component.push("frobnicate");
if (mutate === "dead-change-action") names.change.push("frobnicate");
if (mutate === "lost-action") names.component = names.component.filter((n) => n !== "decompose");

// ---- a copy of skill/scripts, patched in memory ----
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "table-proto-"));
fs.cpSync(path.join(repo, "skill/scripts"), path.join(tmp, "scripts"), { recursive: true });
for (const d of ["references", "adapters", "evals"]) fs.symlinkSync(path.join(repo, "skill", d), path.join(tmp, d), "junction");
fs.copyFileSync(path.join(repo, "skill/SKILL.md"), path.join(tmp, "SKILL.md"));
const cliPath = path.join(tmp, "scripts/cli-core.cjs");
const original = fs.readFileSync(cliPath, "utf8");
let patched = original;
const swap = (from, to) => {
  if (patched.split(from).length !== 2) throw new Error(`text not found exactly once: ${from.slice(0, 70)}`);
  patched = patched.replace(from, to);
};
const q = (n) => JSON.stringify(n);
for (const cmd of HANDLER_ROUTED) {
  const key = /^[a-z][a-z0-9]*$/.test(cmd) ? cmd : q(cmd);
  const extra = cmd === "verify" ? `, gates: [${gates.map(q).join(", ")}]` : "";
  swap(`  ${key}: { run:`, `  ${key}: { actions: [${names[cmd].map(q).join(", ")}]${extra}, run:`);
}
// the ten commands that take no action say so: `actions: []`
const NO_ACTION = ["doctor", "status", "plan", "run", "resume", "explain-block", "package", "route", "next", "decide"];
for (const cmd of NO_ACTION) {
  const key = /^[a-z][a-z0-9]*$/.test(cmd) ? cmd : q(cmd);
  if (cmd === "next" || cmd === "decide") {
    if (mutate === "next-stray-not-refused" && cmd === "next") continue; // forget one declaration
    swap(`  ${key}: {\n    run:`, `  ${key}: {\n    actions: [],\n    run:`);
  } else swap(`  ${key}: { run:`, `  ${key}: { actions: [], run:`);
}
// an entry with its own `run` accepts an action only if it lists it
swap("  if (entry.run) return entry;\n", "  if (entry.run) return action && !(Array.isArray(entry.actions) && entry.actions.includes(action)) ? null : entry;\n");
swap("  if (!entry) fail(\"cli\", `unknown command: ${[command, action].filter(Boolean).join(\" \")}`, { code: \"UNKNOWN_COMMAND\" });\n",
  "  if (!entry) fail(\"cli\", `unknown command: ${[command, action].filter(Boolean).join(\" \")}`, { code: \"UNKNOWN_COMMAND\" });\n" +
  "  const gate = entry.gates && option(parsed, \"--gate\");\n" +
  "  if (gate && !entry.gates.includes(gate)) fail(\"cli\", `unknown verify gate ${gate}`, { code: \"UNKNOWN_GATE\" });\n");
// the hard-coded list of eight names in `dispatch` is replaced by the table: a command that lists no action refuses a stray word, with the same words as before
swap("  if (action && [\"doctor\", \"status\", \"route\", \"plan\", \"run\", \"resume\", \"explain-block\", \"package\"].includes(command)) {\n    fail(\"cli\", `${command} does not accept an action`, { code: \"UNKNOWN_ARGUMENT\" });\n  }\n",
  "  const listed = Object.hasOwn(COMMANDS, command) ? COMMANDS[command].actions : undefined;\n" +
  `  if (${mutate === "refusal-too-broad" ? "" : "action && "}Array.isArray(listed) && listed.length === 0) {\n` +
  "    fail(\"cli\", `${command} does not accept an action`, { code: \"UNKNOWN_ARGUMENT\" });\n  }\n");
swap("module.exports = { dispatch, execute, inspectDoctor, parseArgs, publicHelp };",
  "function commandPaths() {\n" +
  "  return Object.entries(COMMANDS).map(([command, entry]) => {\n" +
  "    const actions = entry.actions === undefined ? [] : Array.isArray(entry.actions) ? [...entry.actions] : Object.keys(entry.actions);\n" +
  "    return entry.gates ? { command, actions, gates: [...entry.gates] } : { command, actions };\n" +
  "  });\n" +
  "}\n\n" +
  "module.exports = { commandPaths, dispatch, execute, inspectDoctor, parseArgs, publicHelp };");
fs.writeFileSync(cliPath, patched);
{
  const inOriginal = new Set(original.split("\n"));
  const grows = patched.split("\n").length - original.split("\n").length;
  console.log(`P  patch of the copy: ${patched.split("\n").filter((l) => !inOriginal.has(l)).length} lines are new or changed; the file grows by ${grows} lines (30 table lines changed or added, 1 line of resolveCommand, 2 lines for the gate, the refusal of a stray word rewritten, commandPaths and its export)`);
}
const oldCore = require(path.join(repo, "skill/scripts/cli-core.cjs"));
const newCore = require(cliPath);

// ---- 1. commandPaths() against the tool list ----
const paths = newCore.commandPaths();
const fromTable = new Set();
for (const p of paths) {
  if (!Array.isArray(p.actions)) bad(`TABLE_ENTRY commandPaths() gives no list of actions for \`${p.command}\` (${p.actions})`);
  else if (p.actions.length === 0) fromTable.add(p.command);
  else for (const a of p.actions) fromTable.add(`${p.command} ${a}`);
  for (const g of p.gates || []) fromTable.add(`${p.command} --gate ${g}`);
}
const fromList = new Set(rows);
for (const r of fromTable) if (!fromList.has(r)) bad(`TABLE_ENTRY the table gives \`${r}\` but no entry has it`);
for (const r of fromList) if (!fromTable.has(r)) bad(`TABLE_ENTRY entry \`${r}\` is not a row of the command table`);
console.log(`T  commandPaths(): ${paths.length} commands, ${fromTable.size} rows, ${paths.filter((p) => Array.isArray(p.actions) && p.actions.length === 0).length} with an empty list (no action), ${paths.filter((p) => p.actions === null).length} null; the list has ${fromList.size} command rows`);

// ---- 2. does a made-up action reach the handler's own "unknown action" answer? (is the drive test able to see a dead name?) ----
const BOGUS = "zzz-not-an-action";
const mk = () => fs.mkdtempSync(path.join(os.tmpdir(), "drive-"));
const jsonFile = (root) => { const f = path.join(root, "in.json"); fs.writeFileSync(f, "{}"); return f; };
// these handlers read one option before they look at the action, so they need it to reach the action check
const EXTRA = {
  change: (root) => { const cr = path.join(root, "openspec/changes/x"); fs.mkdirSync(cr, { recursive: true }); return ["--change-root", cr, "--expected-sha256", "00"]; },
  "component-first": (root) => ["--artifact", jsonFile(root)],
  "component-first-v2": (root) => ["--artifact", jsonFile(root)],
};
const GATE_EXTRA = (root) => ["--artifact", jsonFile(root)];
const NOT_DRIVEN = new Set(["designmd sync"]); // may start a network crawl or npx: read, not run
function run(core, argv, root) {
  const r = core.execute([...argv, "--root", root, "--json"]);
  return { code: r.output?.error?.code || null, exit: r.exitCode, message: String(r.output?.error?.message || "") };
}
const UNKNOWN = new Set(["UNKNOWN_COMMAND", "UNKNOWN_GATE"]);
const argvOf = (cmd, action, root, withExtra) => (action && action.startsWith("--gate")
  ? ["verify", "--gate", action.split(" ")[1], ...(withExtra ? GATE_EXTRA(root) : [])]
  : [cmd, ...(action ? [action] : []), ...(withExtra && EXTRA[cmd] ? EXTRA[cmd](root) : [])]);
{ // measured on the ORIGINAL code: the handler answers a made-up action with UNKNOWN_*, if it can reach that check
  let withExtra = 0, without = 0;
  const targets = [...HANDLER_ROUTED.map((c) => [c, BOGUS]), ["verify", `--gate ${BOGUS}`]];
  for (const [c, a] of targets) {
    const r1 = mk(), r2 = mk();
    if (UNKNOWN.has(run(oldCore, argvOf(c, a, r1, true), r1).code)) withExtra++;
    if (UNKNOWN.has(run(oldCore, argvOf(c, a, r2, false), r2).code)) without++;
  }
  console.log(`C  a made-up action answers UNKNOWN_COMMAND or UNKNOWN_GATE on ${withExtra} of ${targets.length} targets when the handler gets the input it reads first, and on ${without} when it does not (component-first answers COMMAND_FAILED, and is checked by import instead)`);
}

// ---- 3. every declared action is recognised by its handler: none may answer UNKNOWN_COMMAND or UNKNOWN_GATE ----
let driven = 0;
for (const cmd of HANDLER_ROUTED) {
  if (cmd === "component-first") continue;
  for (const a of names[cmd]) {
    if (NOT_DRIVEN.has(`${cmd} ${a}`)) continue;
    const root = mk();
    const got = run(newCore, argvOf(cmd, a, root, true), root);
    driven++;
    if (UNKNOWN.has(got.code)) bad(`DEAD_ACTION \`${cmd} ${a}\` is declared but its handler answers ${got.code}: ${got.message.slice(0, 60)}`);
  }
}
for (const g of gates) {
  const root = mk();
  const got = run(newCore, argvOf("verify", `--gate ${g}`, root, true), root);
  driven++;
  if (UNKNOWN.has(got.code)) bad(`DEAD_ACTION \`verify --gate ${g}\` is declared but the handler answers ${got.code}`);
}
{ // component-first names its stages itself: the declared names must be its check and its own list of stages
  const { PUBLIC_STAGES } = require(path.join(repo, "skill/scripts/component-first/orchestration/component-first-orchestrator.cjs"));
  const own = new Set(["check", ...PUBLIC_STAGES]);
  for (const a of names["component-first"]) if (!own.has(a)) bad(`DEAD_ACTION \`component-first ${a}\` is not \`check\` or one of PUBLIC_STAGES`);
  for (const a of own) if (!names["component-first"].includes(a)) bad(`TABLE_ENTRY \`component-first ${a}\` is a stage of the module but is not declared`);
}
console.log(`D  drive test: ${driven} rows driven in empty temp folders; none may answer UNKNOWN_*; not driven: ${[...NOT_DRIVEN].join(", ")}; component-first compared with PUBLIC_STAGES (an import that already exists)`);

// ---- 4. old against new: nothing that worked is lost ----
// the names each handler compares with `action`, found in its own text (evidence only; the patch does not depend on it)
const lines = original.split("\n");
const handlerOf = { change: "changeCommand", evidence: "evidenceCommand", verify: "verifyCommand", patterns: "patternCommand", "design-system": "designSystemCommand", component: "componentCommand", "component-first-v2": "componentFirstV2Command", "design-skill": "designSkillCommand", "high-fidelity": "highFidelityCommand", mengto: "mengToCommand", shadcnio: "shadcnioCommand", prism: "prismCommand", holosticker: "holostickerCommand", designmd: "designMdCommand", iart: "iartCommand", toolchain: "toolchainCommand", execution: "executionCommand", adapter: "adapterCommand" };
const scanned = {};
for (const [cmd, fn] of Object.entries(handlerOf)) {
  const i = lines.findIndex((l) => l.startsWith(`function ${fn}(`));
  let j = i + 1;
  while (j < lines.length && lines[j] !== "}") j++;
  scanned[cmd] = new Set([...lines.slice(i, j + 1).join("\n").matchAll(/\baction\s*===\s*"([a-z0-9-]+)"/g)].map((m) => m[1]));
}
const universe = {};
for (const cmd of HANDLER_ROUTED) universe[cmd] = new Set([...(rowNames[cmd] || []), ...(scanned[cmd] || [])]);
const cases = [];
for (const cmd of HANDLER_ROUTED) {
  for (const a of universe[cmd]) if (!NOT_DRIVEN.has(`${cmd} ${a}`)) cases.push([cmd, a, "known name", true]);
  cases.push([cmd, BOGUS, "made-up action", true], [cmd, BOGUS, "made-up action, no other input", false], [cmd, null, "no action", true]);
}
for (const g of [...gates, BOGUS]) cases.push(["verify", `--gate ${g}`, g === BOGUS ? "made-up action" : "known name", true]);
cases.push(["verify", `--gate ${BOGUS}`, "made-up action, no other input", false]);
let same = 0;
const differ = [];
for (const [cmd, a, kind, withExtra] of cases) {
  const ro = mk(), rn = mk();
  const o = run(oldCore, argvOf(cmd, a, ro, withExtra), ro), n = run(newCore, argvOf(cmd, a, rn, withExtra), rn);
  if (o.code === n.code && o.exit === n.exit) same++;
  else differ.push({ cmd, a, kind, old: `${o.code || "ok"}/${o.exit}`, now: `${n.code || "ok"}/${n.exit}` });
}
for (const d of differ.filter((x) => !x.kind.startsWith("made-up"))) bad(`BEHAVIOUR \`${d.cmd} ${d.a || ""}\` (${d.kind}) answered ${d.old} before and ${d.now} now`);
const kinds = {};
for (const d of differ) { const k = `${d.old} -> ${d.now}`; kinds[k] = (kinds[k] || 0) + 1; }
console.log(`E  old against new: ${cases.length} cases (every name in the rows or in a handler's own text, a made-up action, no action, the gates); ${same} answer the same; ${differ.length} differ, all of them a made-up action; ${differ.filter((x) => !x.kind.startsWith("made-up")).length} known names or no-action cases differ`);
console.log("   how a made-up action answered before -> now:", JSON.stringify(kinds));

// ---- 5. the ten commands that take no action: legitimate calls answer as before, a stray word is refused ----
const normalise = (value, dir) => JSON.stringify(value)
  .replaceAll(JSON.stringify(dir).slice(1, -1), "<dir>")
  .replaceAll(JSON.stringify(path.join(repo, "skill")).slice(1, -1), "<skill>")
  .replaceAll(JSON.stringify(tmp).slice(1, -1), "<skill>")
  .replace(/\d{4}-\d\d-\d\dT[\d:.]+Z/g, "<time>");
function answer(core, argv, dir) {
  const r = core.execute([...argv, "--root", dir, "--json"]);
  return { exit: r.exitCode, code: r.output?.error?.code || null, message: String(r.output?.error?.message || ""), text: normalise(r.output, dir) };
}
const STRAY = "zzz";
const ALREADY_REFUSED = NO_ACTION.filter((c) => c !== "next" && c !== "decide");
{ // 5a. a legitimate walk with every flag that the help documents for next and decide (and --replace, which the handler reads)
  const walk = (core) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nd-"));
    const step = (argv) => answer(core, argv, dir);
    return [
      step(["next", "--project-root", dir]),
      step(["next", "--project-root", dir, "--deliverable", "film", "--tier", "standard", "--mode", "replicate", "--director", "some-model", "--replace"]),
      step(["next", "--project-root", dir]),
      step(["decide", "--project-root", dir, "--stage", "intake", "--answer", "one quoted argument with spaces"]),
      step(["next", "--project-root", dir]),
      step(["decide", "--project-root", dir, "--stage", "reference", "--answer", "none"]),
      step(["decide", "--project-root", dir, "--stage", "concept", "--choice", "2", "--verdict", "accept"]),
      step(["next", "--project-root", dir, "--deliverable", "edit", "--tier", "quick", "--mode", "freeform", "--replace"]),
      step(["decide", "--project-root", dir, "--stage", "deliver", "--answer", "x"]),
      step(["next", "--project-root", dir]),
    ];
  };
  const before = walk(oldCore), after = walk(newCore);
  const unequal = before.map((b, i) => (b.exit === after[i].exit && b.text === after[i].text ? null : i)).filter((i) => i !== null);
  for (const i of unequal) bad(`BEHAVIOUR step ${i + 1} of the next and decide walk answers differently: before ${before[i].text.slice(0, 80)} now ${after[i].text.slice(0, 80)}`);
  console.log(`L  legitimate calls: ${before.length} calls of next and decide with --project-root, --deliverable, --tier, --mode, --director, --replace, --stage, --choice, --verdict, --answer; ${before.length - unequal.length} answer identically before and after (exit code and whole output); ${before.filter((b) => b.code).length} of the ${before.length} answer with an error, the same error before and after`);
}
{ // 5b. no action for the eight that had none, a stray word for all ten
  let alone = 0, aloneSame = 0;
  for (const cmd of NO_ACTION) {
    const r1 = mk(), r2 = mk();
    const o = answer(oldCore, [cmd], r1), n = answer(newCore, [cmd], r2);
    alone++;
    if (o.exit === n.exit && o.text === n.text) aloneSame++; else bad(`BEHAVIOUR \`${cmd}\` with no stray word answers differently: before ${o.text.slice(0, 80)} now ${n.text.slice(0, 80)}`);
  }
  const shifts = {};
  for (const cmd of NO_ACTION) {
    const r1 = mk(), r2 = mk();
    const o = answer(oldCore, [cmd, STRAY], r1), n = answer(newCore, [cmd, STRAY], r2);
    if (n.code !== "UNKNOWN_ARGUMENT" || n.message !== `cli: ${cmd} does not accept an action` || n.exit !== 1) bad(`STRAY_WORD \`${cmd} ${STRAY}\` is not refused with UNKNOWN_ARGUMENT: ${n.code} ${n.message}`);
    if (ALREADY_REFUSED.includes(cmd) && (o.exit !== n.exit || o.text !== n.text)) bad(`BEHAVIOUR \`${cmd} ${STRAY}\` was refused with other words before: ${o.text.slice(0, 80)} now ${n.text.slice(0, 80)}`);
    if (!ALREADY_REFUSED.includes(cmd)) shifts[`${cmd}: ${o.code || "ok"}/${o.exit} -> ${n.code}/${n.exit}`] = 1;
  }
  // a boolean flag followed by a word, and an unquoted two-word answer (the second word used to be dropped without a message)
  const cases2 = [
    { label: "next --deliverable film --tier quick --replace zzz", setup: false, argv: (d) => ["next", "--project-root", d, "--deliverable", "film", "--tier", "quick", "--replace", STRAY] },
    { label: "decide --stage intake --answer looks good", setup: true, argv: (d) => ["decide", "--project-root", d, "--stage", "intake", "--answer", "looks", "good"] },
  ];
  const words = cases2.map(({ label, setup, argv }) => {
    const r1 = mk(), r2 = mk();
    if (setup) for (const [core, d] of [[oldCore, r1], [newCore, r2]]) answer(core, ["next", "--project-root", d, "--deliverable", "film", "--tier", "standard"], d);
    const o = answer(oldCore, argv(r1), r1), n = answer(newCore, argv(r2), r2);
    if (n.code !== "UNKNOWN_ARGUMENT") bad(`STRAY_WORD \`${label}\` is not refused: ${n.code}`);
    return `${label}: ${o.code || "ok"}/${o.exit} -> ${n.code}/${n.exit}`;
  });
  console.log(`N  no stray word: the ten commands answer as before (${aloneSame} of ${alone}). A stray word: all ten now answer UNKNOWN_ARGUMENT, and the eight that refused before answer with exactly the same words; changed answers ${JSON.stringify(Object.keys(shifts))}; a boolean flag or an unquoted second word: ${JSON.stringify(words)}`);
}

console.log(problems.length ? `PROBLEMS (${problems.length}):\n` + problems.map((p) => " - " + p).join("\n") : "ALL CHECKS PASS");
process.exitCode = problems.length ? 1 : 0;

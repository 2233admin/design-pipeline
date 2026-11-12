// Throwaway prototype (Task 5 deletes this folder). It converts appendix-command-rows.md into the entries of the
// tool list exactly as the last section of that file says, then checks the entries with the structure rules of
// design.md section 4.4 that need no other input. It reads files of this repository and writes only the JSON
// file it is given (default: the OS temp folder). Exit code 1 when a problem is found.
// Run from anywhere:  node openspec/changes/add-capability-registry/prototypes/convert-appendix.cjs [out.json]
const fs = require("fs");
const os = require("os");
const path = require("path");
const repo = path.resolve(__dirname, "../../../..");
const skillRoot = path.join(repo, "skill");
const text = fs.readFileSync(path.join(repo, "openspec/changes/add-capability-registry/appendix-command-rows.md"), "utf8");

function section(title) {
  const start = text.indexOf(`## ${title}`);
  if (start < 0) throw new Error("missing section " + title);
  const rest = text.slice(start);
  const next = rest.indexOf("\n## ", 5);
  return next < 0 ? rest : rest.slice(0, next);
}
function table(sec, firstCol) {
  const lines = sec.split("\n");
  const at = lines.findIndex((l) => l.startsWith("| " + firstCol));
  if (at < 0) throw new Error("no table starting " + firstCol);
  const cols = lines[at].replace(/^\|\s*/, "").replace(/\s*\|$/, "").split(" | ");
  const out = [];
  for (let i = at + 2; i < lines.length && lines[i].startsWith("|"); i++) {
    const cells = lines[i].replace(/^\|\s*/, "").replace(/\s*\|$/, "").split(" | ").map((c) => c.trim());
    if (cells.length !== cols.length) throw new Error(`column mismatch in ${firstCol}: ${lines[i]}`);
    out.push(Object.fromEntries(cols.map((c, j) => [c, cells[j].replace(/^`|`$/g, "")])));
  }
  return out;
}
const A1 = table(section("Table A1"), "#");
const A2 = table(section("Table A2"), "row");
const A3 = table(section("Table A3"), "#");
const B = table(section("Table B"), "script");
const C = table(section("Table C"), "document");
const Dt = table(section("Table D"), "script");

const PAIR = { public: ["active", "public"], expert: ["active", "expert"], internal: ["active", "internal"], alias: ["alias", "internal"], deferred: ["deferred", "internal"], removal: ["removal-candidate", "internal"] };
const list = (s) => (s === "-" || s === "" ? [] : s.split(","));
const dls = (s) => (s === "all" ? ["film", "edit", "web", "ui"] : list(s));
const docId = (p) => "doc-" + p.replace(/^references\//, "").replace(/(\.md|\/)$/, "").replace(/\//g, "-");
// heading anchor: the heading words in lower case, letters, digits, spaces and "-" kept, each space turned into "-"
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
const idOfCommand = (row) => row.replace(/^verify --gate /, "verify-gate-").replace(/ /g, "-");
const a2 = Object.fromEntries(A2.map((r) => [r.row, r]));
const entries = [];
for (const r of A1) {
  const words = A3.find((w) => w.row === r.row);
  const rel = a2[r.row];
  const [status, exposure] = PAIR[r.class];
  const e = { id: idOfCommand(r.row), official: { command: r.row }, group: words.group, kind: r.kind, audience: list(r.audience), deliverables: dls(r.deliverables), stages: list(r.stages), exposure, status };
  if (exposure === "public" || exposure === "expert") e.summary = words.text; else e.reason = words.text;
  if (r.guide !== "-") e.guide = r.guide; else if (r.class === "expert") e.noGuide = true;
  if (rel) {
    if (rel.aliasOf !== "-") e.aliasOf = rel.aliasOf;
    if (rel["included in"] !== "-") e.includedIn = Object.fromEntries(list(rel["included in"]).map((p) => { const i = p.indexOf(":"); return [p.slice(0, i), p.slice(i + 1)]; }));
    if (rel["other spellings"] !== "-") e.aliases = list(rel["other spellings"]);
  }
  entries.push(e);
}
for (const s of B) {
  const [status, exposure] = PAIR[s.class];
  const e = { id: "script-" + s.script.replace(/\.cjs$/, ""), official: { script: s.script }, group: s.group, kind: s.kind, audience: list(s.audience), deliverables: dls(s.deliverables), stages: [], exposure, status };
  if (exposure === "public" || exposure === "expert") e.summary = s.text; else e.reason = s.text;
  if (s.guide !== "-") e.guide = s.guide; else if (s.class === "expert") e.noGuide = true;
  entries.push(e);
}
for (const d of C) {
  const e = { id: docId(d.document), official: { doc: d.document }, group: d.group, kind: d.kind, audience: list(d.audience), deliverables: dls(d.deliverables), stages: list(d.stages), exposure: "public", status: "active", summary: d.text };
  entries.push(e);
}
const internalScripts = Dt.map((d) => ({ script: d.script, reason: d.reason }));

// ---- validation (structure rules of design.md 4.4, subset that needs no repo inputs) ----
const STAGES = { film: ["intake", "reference", "concepts", "plan", "build", "check", "review", "deliver"], edit: ["intake", "analyze", "reference", "style", "cut", "render", "check", "review", "deliver"], web: ["intake", "reference", "concepts", "build", "probe", "review", "deliver"], ui: ["intake", "work"] };
const KINDS = new Set(["creative-guide", "generator", "checker", "evidence-capture", "evaluation", "maintainer-release", "vendored-upstream"]);
const problems = [];
const bad = (code, e, m) => problems.push(`${code} ${e.id}: ${m}`);
const byId = new Map(entries.map((e) => [e.id, e]));
const seenOfficial = new Map();
const GROUPS = ["Start and decide", "Film", "Edit", "Web pages", "Shared checks", "Review", "UI and web", "Guided brief and templates", "Design synthesis", "Design systems", "Components", "Reference, reconstruction and scenes", "Website cloning", "Knowledge catalogs", "Tools and routing", "Change lifecycle", "Interchange checks", "Maintainers"];
const usedGroups = new Set();
if (byId.size !== entries.length) bad("ID_DUPLICATE", { id: "*" }, "ids repeat");
for (const e of entries) {
  usedGroups.add(e.group);
  if (!GROUPS.includes(e.group)) bad("ENUM", e, "group " + e.group);
  if (!KINDS.has(e.kind)) bad("ENUM", e, "kind " + e.kind);
  const ok = (e.status === "active") || e.exposure === "internal";
  if (!ok) bad("PAIR", e, `${e.status}/${e.exposure}`);
  if ((e.status !== "active" || e.exposure === "internal") && !e.reason) bad("REASON_REQUIRED", e, "no reason");
  if ((e.exposure === "public" || e.exposure === "expert") && (!e.summary || e.summary.length > 160)) bad("SUMMARY_REQUIRED", e, "summary missing or too long");
  if ((e.exposure === "public" || e.exposure === "expert") && (e.official.command || e.official.script) && !e.guide && !e.noGuide) bad("GUIDE_REQUIRED", e, "no guide");
  if (e.noGuide && (e.exposure !== "expert" || e.guide)) bad("NOGUIDE_MISUSE", e, "noGuide misuse");
  if (e.deliverables.length === 0 && e.exposure !== "internal") bad("DELIVERABLES_EMPTY", e, "empty");
  if (e.stages.length && e.exposure !== "public") bad("STAGES_NOT_PUBLIC", e, e.stages.join());
  for (const s of e.stages) { const [d, st] = s.split(":"); if (!e.deliverables.includes(d) || !(STAGES[d] || []).includes(st)) bad("STAGE_UNKNOWN", e, s); }
  const off = Object.values(e.official)[0];
  if (seenOfficial.has(off)) bad("OFFICIAL_DUPLICATE", e, off); else seenOfficial.set(off, e.id);
  if (e.aliasOf) { const t = byId.get(e.aliasOf); if (!t || t.status !== "active") bad("ALIAS_TARGET", e, e.aliasOf); if (e.status !== "alias") bad("ALIAS_TARGET", e, "aliasOf on non-alias"); } else if (e.status === "alias") bad("ALIAS_TARGET", e, "alias without target");
  for (const [d, t] of Object.entries(e.includedIn || {})) { const x = byId.get(t); if (!e.deliverables.includes(d) || !x || x.status !== "active" || !x.deliverables.includes(d)) bad("INCLUDED_IN", e, `${d}:${t}`); }
  if (e.guide) {
    const [gfile, anchor] = e.guide.split("#");
    if (!fs.existsSync(path.join(skillRoot, gfile))) bad("GUIDE_MISSING", e, `file ${gfile}`);
    else if (anchor !== undefined && !anchorsOf(fs.readFileSync(path.join(skillRoot, gfile), "utf8")).has(anchor)) bad("GUIDE_MISSING", e, `heading #${anchor} in ${gfile}`);
  }
  if (e.official.script && !fs.existsSync(path.join(skillRoot, "scripts", e.official.script))) bad("OFFICIAL_MISSING", e, e.official.script);
  if (e.official.doc && !fs.existsSync(path.join(skillRoot, e.official.doc)) && e.official.doc !== "references/tool-map.md") bad("OFFICIAL_MISSING", e, e.official.doc);
  for (const a of e.aliases || []) { const f = a.replace(/^node skill\/scripts\//, ""); if (!fs.existsSync(path.join(skillRoot, "scripts", f))) bad("OFFICIAL_MISSING", e, "alias script " + f); if (seenOfficial.has(a)) bad("OFFICIAL_DUPLICATE", e, a); }
}
for (const g of GROUPS) if (!usedGroups.has(g)) bad("LIST_SHAPE", { id: "groups" }, "unused group " + g);
for (const s of internalScripts) if (!fs.existsSync(path.join(skillRoot, "scripts", s.script))) bad("SCRIPT_UNACCOUNTED", { id: s.script }, "missing");
// script accounting against the real tree
const official = new Set(entries.filter((e) => e.official.script).map((e) => e.official.script));
const aliased = new Set(entries.flatMap((e) => (e.aliases || []).map((a) => a.replace(/^node skill\/scripts\//, ""))));
const internal = new Set(internalScripts.map((s) => s.script));
for (const f of fs.readdirSync(path.join(skillRoot, "scripts")).filter((n) => n.endsWith(".cjs"))) {
  if (!fs.readFileSync(path.join(skillRoot, "scripts", f), "utf8").startsWith("#!")) continue;
  if (!official.has(f) && !aliased.has(f) && !internal.has(f)) bad("SCRIPT_UNACCOUNTED", { id: f }, "not accounted for");
}
const cmd = entries.filter((e) => e.official.command);
const by = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m; }, {});
const cls = (e) => (e.status === "active" ? e.exposure : e.status === "removal-candidate" ? "removal" : e.status);
console.log("entries:", entries.length, "| command rows:", cmd.length, "| scripts:", entries.filter((e) => e.official.script).length, "| guides:", entries.filter((e) => e.official.doc).length, "| internalScripts:", internalScripts.length);
console.log("rows by class:", JSON.stringify(by(cmd, cls)));
console.log("all by class:", JSON.stringify(by(entries, cls)));
console.log("noGuide entries:", entries.filter((e) => e.noGuide).length);
console.log(problems.length ? "PROBLEMS:\n" + problems.join("\n") : "NO PROBLEMS: the appendix converts to a valid tool list");
if (problems.length) {
  console.log("nothing written: fix the appendix first (task T0)");
  process.exitCode = 1;
} else {
  const outFile = process.argv[2] || path.join(os.tmpdir(), "tool-list-from-appendix.json");
  fs.writeFileSync(outFile, JSON.stringify({ schema: "design-pipeline.tool-list.v1", version: "1", groups: GROUPS, internalScripts, entries }, null, 2) + "\n");
  console.log("wrote", outFile, fs.statSync(outFile).size, "bytes");
}

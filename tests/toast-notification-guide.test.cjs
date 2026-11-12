"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { routeJob } = require("../skill/scripts/job-route-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const references = path.join(repoRoot, "skill", "references");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const guideFile = "toast-notification.md";
const guidePath = path.join(references, guideFile);
const read = (file) => fs.readFileSync(file, "utf8");
const readJson = (file) => JSON.parse(read(file));
const guide = read(guidePath);
const packageResources = readJson(path.join(references, "package-resources.json"));

function route(query) {
  const child = spawnSync(process.execPath, [cli, "route", "--root", repoRoot, "--query", query, "--json"], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
  assert.equal(child.status, 0, `${query}: ${child.stderr || child.stdout}`);
  return JSON.parse(child.stdout);
}

// GitHub heading anchors: lower-case, punctuation dropped, spaces to hyphens, repeats numbered.
function headingAnchors(file) {
  const anchors = new Set();
  const seen = new Map();
  let fenced = false;
  for (const line of read(file).split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    const heading = fenced ? null : line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (!heading) continue;
    const text = heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "");
    const slug = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count ? `${slug}-${count}` : slug);
  }
  return anchors;
}

function section(heading) {
  const start = guide.indexOf(`\n${heading}\n`);
  assert.notEqual(start, -1, `guide has ${heading}`);
  const rest = guide.slice(start + heading.length + 2);
  const level = heading.match(/^#+/)[0].length;
  const end = rest.search(new RegExp(`\\n#{1,${level}} `));
  return end === -1 ? rest : rest.slice(0, end);
}

test("the guide is packaged, registered for tests and part of the ui-craft ablation layer", () => {
  assert.ok(packageResources.required.includes(`references/${guideFile}`), "package-resources required");
  assert.ok(readJson(path.join(repoRoot, "scripts/test-manifest.json")).tests.includes("toast-notification-guide.test.cjs"), "test manifest");
  const layers = readJson(path.join(repoRoot, "evals/ablation/layers.json")).layers;
  assert.ok(layers.find((layer) => layer.id === "ui-craft").remove.includes(`references/${guideFile}`), "ui-craft layer");
  assert.ok(!fs.existsSync(path.join(repoRoot, "skill", "vendor", "kubai")), "no bundled upstream tree");
});

test("toast, notification, reminder, badge and prompt briefs route to the guide in English and Chinese", () => {
  for (const [query, keyword] of [
    ["should this be a toast or a notification", "toast"],
    ["add an undo toast after archiving", "toast"],
    ["snackbar for upload progress", "snackbar"],
    ["the product needs a notification center with an unread count", "notification"],
    ["the settings sheet needs a push notification permission flow", "notification"],
    ["撤销提示和未读角标", "撤销提示"],
    ["给上传加进度提示", "进度提示"],
    ["操作完成后给一个轻提示", "轻提示"],
    ["帮我看下产品里的消息通知和消息提醒", "消息通知"],
    ["导航栏图标上加小红点", "小红点"],
    ["做一个站内通知中心", "通知中心"],
  ]) {
    const result = route(query);
    assert.equal(result.status, "ready", query);
    assert.equal(result.job, "toast-notification", query);
    assert.ok(result.candidates[0].score > 0, query);
    assert.ok(result.candidates[0].matchedKeywords.includes(keyword), `${query}: ${result.candidates[0].matchedKeywords}`);
    assert.notEqual(result.confidence, "low", query);
    assert.equal(`references/${result.primaryKnowledge.id}.md`, `references/${guideFile}`, query);
    assert.equal(result.primaryKnowledge.admission, "ready", query);
    // The guide is read, not executed: the route adds no step beyond the kernel.
    assert.deepEqual(result.next.map((step) => step.role), ["kernel", "kernel"], query);
  }
});

test("other jobs keep their briefs and a brief with no keyword stays on the default job", () => {
  assert.equal(routeJob({ query: "clone this page and add a toast" }).job, "website-clone");
  assert.equal(routeJob({ query: "toast notification in a three.js scene" }).job, "graphics-runtime");
  assert.equal(routeJob({ query: "what's it called when toasts stack" }).job, "motion-vocabulary");
  assert.equal(routeJob({ query: "gsap toast animation" }).job, "technique");
  assert.equal(routeJob({ query: "polish the toast" }).job, "refine-intents");
  assert.equal(routeJob({ query: "polish the toast notification" }).job, "toast-notification");
  // The eval prompt that a bare 通知 once took from `technique` (a settings page with a notification switch).
  assert.equal(routeJob({ query: "做一个中文账户资料设置单页：姓名、邮箱、通知开关、保存按钮，保存成功提示，无动画" }).job, "technique");
  assert.equal(routeJob({ query: "放假通知请提醒客户" }).job, "product-design");
  const plain = routeJob({ query: "make a pricing page for a bakery" });
  assert.equal(plain.job, "product-design");
  assert.equal(plain.confidence, "low");
  const jobs = readJson(path.join(references, "job-registry.json")).jobs;
  const job = jobs.find((entry) => entry.id === "toast-notification");
  assert.equal(job.activation, "scored");
  const priority = (id) => jobs.find((entry) => entry.id === id).priority;
  assert.ok(job.priority > priority("technique") && job.priority < priority("refine-intents") && job.priority < priority("motion-vocabulary"));
  // Substring matching: these generic words would take unrelated briefs (the enamel badge example, text editors).
  for (const generic of ["badge", "undo", "alert", "message", "popup", "reminder", "通知", "提醒", "红点", "提示"]) assert.ok(!job.keywords.includes(generic), generic);
});

test("the routing documents and release notes point to the guide", () => {
  for (const file of ["skill/SKILL.md", "skill/references/capability-routing.md", "skill/references/feature-routes.md", "docs/features.md", "CHANGELOG.md", "THIRD_PARTY_NOTICES.md"]) {
    assert.match(read(path.join(repoRoot, file)), /toast-notification/, file);
  }
  assert.match(read(path.join(repoRoot, "skill/SKILL.md")), /`references\/toast-notification\.md`/);
  assert.match(read(path.join(repoRoot, "skill/references/capability-routing.md")), /\[toast-notification\.md\]\(toast-notification\.md\)/);
});

test("the guide keeps the judgment flow: kinds, neither cases, seven questions, report and stop", () => {
  const kinds = section("## 1. What each one is for");
  for (const kind of ["**Status**", "**Action**", "**Progress**", "**Notification.**", "**Neither.**"]) assert.ok(kinds.includes(kind), kind);
  for (const neither of [
    /form error or a problem with one field/,
    /failure the person has to fix/,
    /cannot be undone: ask before doing it/,
    /badge, a dot or a change of state in place/,
  ]) assert.match(kinds, neither);
  const questions = section("## 2. Questions that settle a case");
  for (const question of [
    "Who caused it?",
    "Does the person need to act?",
    "Can the action be undone?",
    "How much is there to say?",
    "Would it matter if the person missed it?",
    "Is the work still running when the person leaves?",
    "Several at once?",
  ]) assert.ok(questions.includes(`| ${question} |`), question);
  assert.match(questions, /confirm before, not after/);
  assert.match(questions, /Undo in a toast instead of asking first/);
  const read0 = section("## 0. Read the product first");
  for (const place of ["toasts and snackbars", "notification lists", "badges and counts", "browser or push notifications"]) assert.ok(read0.includes(place), place);
  const report = section("## 3. Report before changing anything");
  for (const column of ["Where", "Now", "Should be", "Why", "Change"]) assert.ok(report.includes(`| ${column} |`), column);
  assert.match(report, /change no code/);
  assert.match(report, /Mark the rows that are already right/);
  assert.match(report, /could go either way/);
  assert.match(report, /Ask the owner which rows to change, and wait|Ask which rows to change, and wait/);
  const restyle = section("## 4. Optional: restyle the toast and the notifications");
  for (const option of ["| A |", "| B |", "| C |", "| D |"]) assert.ok(restyle.includes(option), option);
  assert.match(restyle, /wait for the go-ahead before building/);
  const flat = guide.replace(/\s+/g, " ");
  assert.match(flat, /Add no dependency, state library or new visual pattern without asking/);
  assert.match(flat, /default to start from, not a mandate/);
});

test("the guide keeps kubai's toast and notification values", () => {
  const toast = section("### 4A. Toast");
  for (const value of [
    "12 under the top bar", "40 tall", "16 corners", "#ffffff", "#f7f9fc", "rgba(214, 219, 227, 0.95)",
    "0 16px 36px rgba(17, 24, 39, 0.08), 0 3px 10px rgba(17, 24, 39, 0.05)", "24 with 8 corners", "28 with 10 corners",
    "14/20", "500 ms", "cubic-bezier(0.25, 0.1, 0.25, 1)", "10px above", "96%", "8px blur", "220 ms", "ease-in",
    "900 ms", "180 ms", "5px up", "380 ms", "cubic-bezier(0.32, 0.72, 0, 1)", "-40 degrees", "Task restored", "about 1.5 seconds",
    "3 to 5 seconds", "at least 5 seconds", "pauses while the pointer is over the toast or focus is inside it",
  ]) assert.ok(toast.includes(value), `4A: ${value}`);
  const notification = section("### 4B. Notifications");
  for (const value of [
    "344 wide", "24 corners, 12 padding", "(32,", "32 tall, 12 corners", "13/20", "95% and 90%", "at most three show",
    "56px above", "560 ms", "380 ms", "8 apart", "24, 10 corners", "48px right", "260 ms", "400 ms", "Clear all",
    "page title", "security, payments",
  ]) assert.ok(notification.includes(value), `4B: ${value}`);
  const both = section("### 4C. For both");
  for (const value of ["about 150 ms", "role=\"status\"", "announced once as it arrives", "Escape closes the one in focus", "swipe to dismiss", "spreads on tap", "sheen is fainter"]) {
    assert.ok(both.includes(value), `4C: ${value}`);
  }
});

test("each kubai value that conflicts with a package rule names the governing rule and the value to use", () => {
  const wins = section("## Where the package wins");
  const rows = wins.split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| kubai default"));
  assert.ok(rows.length >= 11, `${rows.length} conflict rows`);
  for (const [fragment, rule] of [
    ["Status toast stays 3 to 5 seconds", /UC-19: timed toasts last 5 seconds or more/],
    ["Action toast with a countdown", /never the only carrier of undo/],
    ["A progress that fails", /UC-19/],
    ["Leave: ease-in", /never ease-in/],
    ["Enter 500 ms", /Duration.*under 300 ms/],
    ["Hover spread 380 ms", /same Duration rule/],
    ["The stack spreads on hover", /TR-08/],
    ["A new toast replaces", /TR-06/],
    ["1px border beside a shadow", /UC-22/],
    ["Uploading brand-guide.pdf", /UC-39/],
    ["Z-order", /UC-29/],
  ]) {
    const row = rows.find((line) => line.includes(fragment));
    assert.ok(row, fragment);
    assert.match(row, rule, fragment);
  }
  assert.match(wins, /still have its action reachable elsewhere|reachable elsewhere/);
  assert.match(wins, /records the kubai value as not applicable with the rule named/);
  assert.match(wins, /Pausing on hover and focus is the same in both/);
});

test("every relative link, rule id and vocabulary term in the guide exists", () => {
  for (const match of guide.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target)) continue;
    const [file, anchor] = target.split("#");
    const resolved = file ? path.join(references, file) : guidePath;
    assert.ok(fs.existsSync(resolved), `${target}: file exists`);
    if (anchor) assert.ok(headingAnchors(resolved).has(anchor), `${target}: heading exists`);
  }
  const craft = read(path.join(references, "ui-craft-sources.md"));
  for (const id of new Set(guide.match(/UC-\d{2}/g))) assert.match(craft, new RegExp(`\\| ${id} \\|`), id);
  const transitions = read(path.join(references, "ui-transition-rules.md"));
  for (const id of new Set(guide.match(/TR-\d{2}/g))) assert.match(transitions, new RegExp(`### ${id} `), id);
  const vocabulary = readJson(path.join(references, "motion-vocabulary.json"));
  const known = new Set([...vocabulary.terms.map((term) => term.id), ...vocabulary.antiPatterns.map((pattern) => pattern.id)]);
  const handoff = section("## Hand-off");
  const ids = [...handoff.matchAll(/`([a-z]+(?:-[a-z]+)*)`/g)].map((match) => match[1]);
  for (const id of ["orchestration", "layered-entry", "blur", "crossfade", "layout-animation", "swipe-to-dismiss", "interruptible-animation", "reduced-motion"]) {
    assert.ok(ids.includes(id), `hand-off names ${id}`);
    assert.ok(known.has(id), `motion-vocabulary.json has ${id}`);
  }
});

test("the guide names kubai as the source and bundles nothing", () => {
  const provenance = section("## Provenance");
  assert.match(provenance, /Source: kubai's design/);
  assert.match(provenance, /supplied a prompt on 2026-11-12/);
  assert.match(provenance, /No upstream repository, revision, licence file, asset or component code/);
  assert.match(provenance, /no\s+lock entry/);
  const notices = read(path.join(repoRoot, "THIRD_PARTY_NOTICES.md"));
  assert.match(notices, /`skill\/references\/toast-notification\.md`: kubai's design/);
  const lock = readJson(path.join(repoRoot, "sources.lock.json"));
  assert.ok(!lock.sources.some((entry) => (entry.documents || []).includes("skill/references/toast-notification.md")), "no lock entry without an upstream repository");
});

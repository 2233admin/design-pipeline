"use strict";

// evals/ablation：
// - 减层的技能目录只改声明的文件和报告里的行，每段改动都落在指向被删内容的地方，剩下的仍过打包检查、命令行照常；
// - 场景合规；打分分得开好封面、平铺页、溢出页、色值不对的页，渐变和发光不加分也不扣分；
// - 判定规则（量值与盲评一致才保留、盲评单独要 48 局、Holm、待定不砍、至少 3 个场景、套模板）照 README 走；
// - runner 的列钉住、失败一律 0 分、路径相对、工作目录用完即删、记下缓存状态；盲评去重、缺截图报错、看不到变体名。

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { pathToFileURL } = require("node:url");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { validateDesignFoundationText } = require("../skill/scripts/design-synthesis-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const evalRoot = path.join(repoRoot, "evals/ablation");
const fixtures = path.join(__dirname, "fixtures/ablation");
// import() takes a URL: a bare Windows path (D:...) is read as the scheme "d:" and refused
const load = (name) => import(pathToFileURL(path.join(evalRoot, name)).href);

// 改这张表就是改 results.tsv 的列：旧结果目录将不能再追加，README 要一起改
const FROZEN_HEADER = [
  "client", "variant", "scenario", "run", "status",
  "score", "hygiene", "adherence", "rhythmScore", "contractOk", "contractIssues", "deliverable",
  "paletteElements", "palettePixels", "typeScale", "declaredFonts", "colourKinds", "sizeKinds",
  "minFont", "belowMinFont", "typeLevels", "titleBodyRatio", "hierarchyFails",
  "overflow", "safeZoneViolations", "contrastFails", "compositionErrors", "compositionCodes", "contentCoverage",
  "hiddenWithoutMotion", "fakeControls", "antiSlopHard",
  "gapCount", "gapOnStep", "distinctGaps", "ratioCv", "leftEdges", "decorations", "decorationKinds", "decorationRepeat",
  "capture", "layersRead", "nextRan", "skillUsed", "skillEdited", "exit", "seconds", "workdir",
];

function tmp(t, prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function browserTools() {
  try {
    resolvePuppeteer(repoRoot, require.resolve("puppeteer-core", { paths: [repoRoot] }));
    resolveBrowser();
    return { skip: false };
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    return { skip: `no browser for the ablation render (${error.message})` };
  }
}
const tools = browserTools();

function walk(root, rel = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(root, next));
    else out.push(next);
  }
  return out;
}

// 行级最长公共子序列，返回改动段：原文件里连续变动的行（从 0 起的行号）和对应的新行
function hunks(before, after) {
  const n = before.length;
  const m = after.length;
  const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i][j] = before[i] === after[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out = [];
  let current = null;
  let i = 0;
  let j = 0;
  const flush = () => {
    if (current) out.push(current);
    current = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i === n || table[i][j + 1] >= table[i + 1][j])) {
      current ??= { old: [], added: [] };
      current.added.push(after[j++]);
    } else {
      current ??= { old: [], added: [] };
      current.old.push(i++);
    }
  }
  flush();
  return out;
}

const isSubsequence = (small, big) => {
  let at = 0;
  for (const char of small) {
    at = big.indexOf(char, at);
    if (at < 0) return false;
    at += 1;
  }
  return true;
};

test("markdown pruning deletes the smallest unit that points at removed content", async () => {
  const { mentionFinder, pruneMarkdown } = await load("variants.mjs");
  const find = mentionFinder(new Set(["references/gone.md"]), ["vendor/gone/"], ["Gone suite"]);
  const text = [
    "# Guide",
    "",
    "Limited to the ones that [kept.md](kept.md) and [gone.md](gone.md) do not state. Next sentence stays.",
    "Checks them against recent work",
    "([gone.md](gone.md)). That look is not banned.",
    "Sources (designers, real work, roulette from `gone.md`), then a board.",
    "For a redesign, use [gone.md](gone.md) to select a method. Audit the brand first.",
    "",
    "| Task | Read |",
    "| --- | --- |",
    "| Style | [gone.md](gone.md) |",
    "| Craft | `kept.md`, `gone.md` |",
    "",
    "- **Gone suite:** picks a method. Its second sentence goes too.",
    "- kept item",
    "",
    "```bash",
    "node scripts/kept.cjs",
    "node vendor/gone/run.cjs \\",
    "  --flag",
    "```",
    "",
    "## Gone suite",
    "",
    "Everything here goes.",
    "",
    "## Kept",
    "",
    "Still here.",
  ].join("\n");
  const result = pruneMarkdown(text, (chunk) => find(chunk, "references/guide.md"));
  assert.equal(result.text, [
    "# Guide",
    "",
    "Limited to the ones that [kept.md](kept.md) do not state. Next sentence stays.",
    "Checks them against recent work.",
    "That look is not banned.",
    "Sources (designers, real work), then a board.",
    "Audit the brand first.",
    "",
    "| Task | Read |",
    "| --- | --- |",
    "| Craft | `kept.md` |",
    "",
    "- kept item",
    "",
    "```bash",
    "node scripts/kept.cjs",
    "```",
    "",
    "## Kept",
    "",
    "Still here.",
  ].join("\n"));
});

test("each variant differs from full only in its declared files and reported lines, each change points at removed content, and the CLI still works", async (t) => {
  const { LAYERS, VARIANTS, buildVariants, mentionFinder, packagedFiles } = await load("variants.mjs");
  const out = tmp(t, "ablation-variants-");
  const reports = buildVariants(VARIANTS, out);
  const packaged = packagedFiles();
  assert.equal(reports.find((report) => report.variant === "bare").tree, null, "bare installs no skill");
  const full = reports.find((report) => report.variant === "full");
  assert.deepEqual(walk(full.tree).sort(), packaged, "full is the packaged skill tree unchanged");
  assert.ok(!packaged.some((file) => /^vendor\/(mengto-skills|iart-motion-skills)\/upstream\//.test(file)), "on-demand bundles stay out, as in the Release package");
  for (const layer of LAYERS) {
    const report = reports.find((entry) => entry.variant === `full-minus-${layer.id}`);
    const declared = packaged.filter((file) => layer.remove.some((entry) => (entry.endsWith("/") ? file.startsWith(entry) : file === entry)));
    assert.ok(declared.length > 0, `${layer.id} removes something`);
    assert.deepEqual(report.removed, declared, `${layer.id} removes exactly the declared files`);
    const stubs = Object.keys(layer.stubs ?? {});
    assert.deepEqual(report.stubs, stubs);
    const files = walk(report.tree).sort();
    assert.deepEqual(files, [...packaged.filter((file) => !declared.includes(file)), ...stubs].sort(), `${layer.id} keeps every other file`);
    assert.ok(report.package.ok, `${layer.id} package check: ${report.package.problems.join("; ")}`);
    for (const { path: kept } of layer.keptCode) assert.ok(files.includes(kept), `${layer.id} keeps ${kept}`);

    // 逐文件对比：Markdown 只有报告里的行变了，每段改动都提到被删内容，新文字（去掉空白）是旧文字的子序列；
    // JSON 只有报告里的文件变了；其余文件一字不差
    const find = mentionFinder(new Set(declared), layer.remove.filter((entry) => entry.endsWith("/")), layer.pointers ?? []);
    const reportedMd = new Map(report.prunedMarkdown.map((entry) => [entry.file, entry.changes]));
    const reportedJson = new Set(report.prunedJson.map((entry) => entry.file));
    for (const file of files) {
      if (stubs.includes(file)) continue;
      const left = path.join(full.tree, file);
      const right = path.join(report.tree, file);
      const same = fs.statSync(left).ino === fs.statSync(right).ino || fs.readFileSync(left).equals(fs.readFileSync(right));
      if (file.endsWith(".md") && reportedMd.has(file)) {
        assert.ok(!same, `${layer.id}: ${file} is reported as changed`);
        const before = fs.readFileSync(left, "utf8").split("\n");
        const after = fs.readFileSync(right, "utf8").split("\n");
        const reportedLines = new Set(reportedMd.get(file).map((change) => change.line));
        const diff = hunks(before, after);
        for (const hunk of diff) {
          for (const index of hunk.old) assert.ok(reportedLines.has(index + 1), `${layer.id}: ${file}:${index + 1} changed but is not in the report`);
          const oldText = hunk.old.map((index) => before[index]).join("\n");
          assert.ok(isSubsequence(hunk.added.join("").replace(/\s/g, ""), oldText.replace(/\s/g, "")), `${layer.id}: ${file}:${hunk.old[0] + 1} only loses text`);
          const blankOnly = hunk.old.every((index) => !before[index].trim());
          assert.ok(blankOnly || find(oldText, file).length > 0, `${layer.id}: ${file}:${hunk.old[0] + 1} changes text that does not point at removed content`);
        }
        assert.equal(reportedLines.size, diff.reduce((sum, hunk) => sum + hunk.old.length, 0), `${layer.id}: ${file} report matches the diff`);
      } else if (file.endsWith(".json") && reportedJson.has(file)) assert.ok(!same, `${layer.id}: ${file} is reported as changed`);
      else assert.ok(same, `${layer.id}: ${file} changed without being declared`);
      if (file.endsWith(".md") && !file.includes("/upstream/") && !(file.startsWith("vendor/") && file !== "vendor/README.md")) {
        const lines = fs.readFileSync(right, "utf8").split("\n").filter((line) => find(line, file).length);
        assert.deepEqual(lines, [], `${layer.id}: ${file} still points at removed content`);
      }
    }
    for (const args of [["route", "--root", out, "--query", "make a poster cover", "--json"], ["doctor", "--json"]]) {
      const child = spawnSync(process.execPath, [path.join(report.tree, "scripts/designer-pipeline.cjs"), ...args], { encoding: "utf8" });
      assert.equal(child.status, 0, `${layer.id}: ${args[0]} exits 0: ${child.stdout.slice(0, 300)} ${child.stderr}`);
    }
  }
  // 设计方向库是空清单：doctor 照常、不报缺；抽轮盘时说库没装
  const library = path.join(out, "full-minus-design-direction-library/design-pipeline/scripts/designer-pipeline.cjs");
  const doctor = JSON.parse(spawnSync(process.execPath, [library, "doctor", "--json"], { encoding: "utf8" }).stdout);
  assert.deepEqual((doctor.result ?? doctor).missing, []);
  const draw = spawnSync(process.execPath, [library, "direction", "draw", "--medium", "web", "--root", out, "--json"], { encoding: "utf8" });
  assert.notEqual(draw.status, 0);
  assert.match(`${draw.stdout}${draw.stderr}`, /not installed|TOOL_MISSING/);
});

test("a stale layer declaration fails the build instead of removing nothing", async () => {
  const { expandLayer } = await load("variants.mjs");
  assert.throws(() => expandLayer({ id: "stale", remove: ["references/no-such-file.md"] }, ["references/kept.md"]), /过时/);
});

test("skill use, layer exposure and next come from tool calls, not from the skill list Claude Code prints at start", async () => {
  const { exposure, skillUsedIn } = await load("lib.mjs");
  const { LAYERS } = await load("variants.mjs");
  const init = JSON.stringify({ type: "system", subtype: "init", skills: ["design-pipeline"], note: "references/taste-skill.md" });
  const call = (name, input) => JSON.stringify({ type: "assistant", message: { content: [{ type: "tool_use", name, input }] } });
  const read = call("Read", { file_path: "/w/.claude/skills/design-pipeline/references/taste-skill.md" });
  const next = call("Bash", { command: "node /w/.claude/skills/design-pipeline/scripts/designer-pipeline.cjs next --project-root /w" });
  const write = call("Write", { file_path: "/w/cover.html" });
  assert.equal(skillUsedIn([init, write].join("\n")), false);
  assert.equal(skillUsedIn([init, read, write].join("\n")), true);
  assert.deepEqual(exposure([init, write].join("\n"), "", LAYERS), { layersRead: [], nextRan: false });
  assert.deepEqual(exposure([init, read, next, write].join("\n"), "", LAYERS), { layersRead: ["taste-skill"], nextRan: true });
  assert.equal(skillUsedIn("ran node .agents/skills/design-pipeline/scripts/designer-pipeline.cjs next"), true);
  assert.equal(skillUsedIn("wrote cover.html"), false);
});

test("scenarios declare their set, style, fixed content and output contract; every variant's rules are well formed", async () => {
  const { DEFAULT_SETS, loadCase, referenceSources, scenarios, SETS, variantSetup, VARIANTS } = await load("suite.mjs");
  const { contentPieces, readStyle } = await load("measure.mjs");
  assert.deepEqual(scenarios(["core"]), ["cover-dark", "cover-light", "explainer-light", "hero-dark"]);
  assert.deepEqual(scenarios(["open"]), ["cover-dark-open", "hero-open"]);
  assert.deepEqual(scenarios(["ignoredone"]), ["qa-card", "strategy-cover", "stream-standby", "tutorial-steps"]);
  assert.deepEqual(scenarios(["product-ui"]), ["settings-page", "workbench-list"]);
  assert.equal(scenarios(SETS).length, 12);
  assert.ok(DEFAULT_SETS.includes("product-ui"), "product screens run by default");
  assert.ok(VARIANTS.includes("reference-system"));
  for (const scenario of scenarios(SETS)) {
    const spec = loadCase(scenario);
    if (spec.set === "open") assert.equal(spec.designFile, null, `${scenario} gives no DESIGN.md`);
    else {
      validateDesignFoundationText(fs.readFileSync(spec.designFile, "utf8"));
      const style = readStyle(spec.designFile);
      assert.ok(style.colors.length >= 7 && style.sizes.length >= 6, scenario);
    }
    for (const output of spec.outputs) assert.ok(output.width > 0 && output.height > 0 && output.files.length >= 1, scenario);
    assert.ok(contentPieces(spec.contentFile).length >= 5, scenario);
    assert.ok(spec.hierarchy && spec.hierarchy.levels === 3, `${scenario} has a hierarchy floor`);
    for (const variant of VARIANTS) {
      const setup = variantSetup(variant, scenario);
      assert.equal(Boolean(setup.skill), variant.startsWith("full"), `${variant} installs a skill only for full variants`);
      assert.ok(!/ablation|消融|variant|变体/.test(setup.agents), `${variant} rules do not reveal the experiment`);
      // 只有 reference-system 带参考图；其余变体拿到的 DESIGN.md 就是场景自己的那份（开放场景没有）
      assert.equal(setup.references, variant === "reference-system", `${variant} references`);
      if (variant !== "reference-system") assert.equal(setup.designFile, spec.designFile, `${variant} gets the scenario's DESIGN.md or none`);
    }
    // reference-system：不装技能，有参考图，有一份合格的 DESIGN.md（开放场景用同一风格的那份），规则里点到这两样
    const reference = variantSetup("reference-system", scenario);
    assert.equal(reference.skill, null);
    validateDesignFoundationText(fs.readFileSync(reference.designFile, "utf8"));
    if (spec.designFile) assert.equal(reference.designFile, spec.designFile);
    assert.match(reference.agents, /references\//);
    assert.match(reference.agents, /DESIGN\.md/);
    const sources = referenceSources(scenario);
    assert.ok(sources.length >= 1 && sources.length <= 2, `${scenario} has one or two reference pages`);
    for (const source of sources) {
      const page = fs.readFileSync(source, "utf8");
      assert.match(page, /<meta name="reference-size" content="\d+x\d+">/, `${source} declares its size`);
      assert.ok(!/https?:\/\//.test(page), `${source} is self-contained`);
    }
    if (spec.set === "product-ui") {
      assert.deepEqual([spec.profile, spec.controls, spec.minFontPx], ["ui", true, 13], `${scenario} is a product screen with real controls`);
      assert.equal(Math.min(...readStyle(spec.designFile).sizes), 13, `${scenario} uses a product type scale`);
    }
    assert.match(variantSetup("decision-tree", scenario).agents, /出图前自检/);
    assert.match(variantSetup("principles", scenario).agents, /一侧安静、一侧热闹/);
    assert.match(variantSetup("recipes", scenario).agents, /点阵/);
    assert.match(variantSetup("adjectives", scenario).agents, /高级/);
  }
  const strategy = loadCase("strategy-cover");
  assert.deepEqual(strategy.outputs.map((output) => `${output.width}x${output.height}`), ["1920x1080", "2560x1600"]);
  assert.deepEqual(strategy.outputs.map((output) => output.safeZone), [{ x0: 96, y0: 0, x1: 1824, y1: 1080 }, { x0: 0, y0: 80, x1: 2560, y1: 1520 }]);
  const explainer = contentPieces(loadCase("explainer-light").contentFile).join("").replace(/[^一-鿿]/g, "");
  assert.ok(explainer.length >= 350 && explainer.length <= 450, `explainer body is about 400 CJK characters (${explainer.length})`);
  assert.ok(fs.existsSync(path.join(repoRoot, "docs/research/ignoredone-arknights-design.md")), "the research the ignoredone set comes from is in docs/research");
});

test("CIEDE2000 matches the published reference pairs", async () => {
  const { deltaE2000 } = await load("measure.mjs");
  // Sharma, Wu, Dalal (2005), table 1, pairs 1, 2, 3 and 7
  assert.equal(deltaE2000([50, 2.6772, -79.7751], [50, 0, -82.7485]).toFixed(4), "2.0425");
  assert.equal(deltaE2000([50, 3.1571, -77.2803], [50, 0, -82.7485]).toFixed(4), "2.8615");
  assert.equal(deltaE2000([50, 2.8361, -74.02], [50, 0, -82.7485]).toFixed(4), "3.4412");
  assert.equal(deltaE2000([50, 0, 0], [50, -1, 2]).toFixed(4), "2.3669");
});

test("rhythm proxies ignore the display jump; the hierarchy floor and safe zones are measured from text boxes", async () => {
  const { hierarchy, rhythm, safeZoneViolations } = await load("measure.mjs");
  const text = (x, y, h, px, chars = 4, label = "x") => ({ px, chars, text: label, box: { x, y, w: 400, h } });
  const result = rhythm(
    [text(64, 100, 40, 30), text(64, 156, 24, 20), text(64, 196, 24, 20), text(120, 230, 50, 45), text(64, 300, 112, 112)],
    [{ tag: "div", w: 20, h: 20, paint: "a" }, { tag: "div", w: 20, h: 20, paint: "a" }, { tag: "div", w: 300, h: 3, paint: "b" }],
    8,
  );
  assert.equal(result.ratioCv, 0, "20 → 30 → 45 is one ratio; the 112 px display size is not counted");
  assert.equal(result.leftEdges, 2);
  assert.deepEqual([result.decorations, result.decorationKinds, result.decorationRepeat], [3, 2, 0.667]);
  assert.deepEqual(hierarchy([text(0, 0, 10, 24, 40), text(0, 0, 10, 24, 40)], { levels: 3, ratio: 2.5 }), { typeLevels: 1, titleBodyRatio: 1, hierarchyFails: 2 });
  assert.deepEqual(hierarchy([text(0, 0, 10, 24, 60), text(0, 0, 10, 32, 8), text(0, 0, 10, 72, 6)], { levels: 3, ratio: 2.5 }), { typeLevels: 3, titleBodyRatio: 3, hierarchyFails: 0 });
  const zone = { x0: 96, y0: 0, x1: 1824, y1: 1080 };
  assert.equal(safeZoneViolations([{ text: "H7-4", box: { x: 40, y: 100, w: 400, h: 200 } }], zone, ["H7-4", "突袭"]), 1);
  assert.equal(safeZoneViolations([{ text: "H7-4", box: { x: 120, y: 100, w: 400, h: 200 } }], zone, ["H7-4"]), 0);
});

function writeRows(dir, rows) {
  const lines = [FROZEN_HEADER.join("\t"), ...rows.map((row) => FROZEN_HEADER.map((key) => row[key] ?? "").join("\t"))];
  fs.writeFileSync(path.join(dir, "results.tsv"), `${lines.join("\n")}\n`);
}

test("decision rules: KEEP needs the measured delta and the judge to agree; the judge alone needs 48 pairs; no effect is UNDETERMINED; fewer than 3 scenarios decide nothing; stamped looks lose measured wins", async (t) => {
  const { compare, decide, dedupeJudge, readTsv } = await load("report.mjs");
  const dir = tmp(t, "ablation-rules-");
  const rows = [];
  const print = (seed) => ({ cols: 4, rows: 1, gray: [seed, 0, 0, 0], mask: seed % 2 ? [1, 0, 0, 0] : [0, 0, 0, 1] });
  const add = (variant, scenario, run, score, fingerprint) => {
    const capture = `captures/${variant}-${scenario}-${run}`;
    fs.mkdirSync(path.join(dir, capture), { recursive: true });
    fs.writeFileSync(path.join(dir, capture, "fingerprint.json"), JSON.stringify(fingerprint));
    rows.push({ variant, scenario, run, status: "ok", score, capture });
  };
  for (const scenario of ["a", "b", "c", "d"]) {
    for (let run = 1; run <= 6; run++) {
      const noise = [-1, 1, -2, 2, 0, 0][run - 1];
      add("full", scenario, run, 80 + noise, print(run));
      add("full-minus-x", scenario, run, 70 + noise, print(run + 10));
      add("full-minus-y", scenario, run, 80 - noise, print(run + 20));
      add("stamp", scenario, run, 95 + noise, { cols: 4, rows: 1, gray: [9, 9, 9, 9], mask: [1, 1, 0, 0] });
      if (scenario !== "c" && scenario !== "d") add("full-minus-z", scenario, run, 60 + noise, print(run + 30));
    }
  }
  writeRows(dir, rows);
  const parsed = readTsv(path.join(dir, "results.tsv"));
  const byCell = new Map();
  for (const row of parsed) {
    const key = `${row.variant}\t${row.scenario}`;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(row);
  }
  const games = (a, b, winsA, total) => Array.from({ length: total }, (_, index) => ({ pair: `j|s|${index}|${a}|${b}`, left: a, right: b, winner: index < winsA ? a : b }));
  const verdict = (a, b, judge = []) => decide([compare(a, b, byCell, judge, dir)])[0];

  assert.equal(verdict("full", "full-minus-x").verdict, "undetermined", "a significant measured delta alone waits for the judge");
  assert.equal(verdict("full", "full-minus-x", games("full", "full-minus-x", 8, 12)).verdict, "better", "measured and judge agree");
  assert.equal(verdict("full", "full-minus-x", games("full", "full-minus-x", 3, 12)).verdict, "conflict", "measured and judge disagree");
  assert.equal(verdict("full", "full-minus-y").verdict, "undetermined", "no detectable effect is undetermined, never cut");
  assert.match(verdict("full", "full-minus-y").reason, /每格要跑 \d+ 次/);
  assert.equal(verdict("full", "full-minus-y", games("full", "full-minus-y", 34, 48)).verdict, "better", "the judge alone decides with 48 pairs");
  assert.equal(verdict("full", "full-minus-y", games("full", "full-minus-y", 30, 47)).verdict, "undetermined", "47 pairs are not enough for the judge alone");
  assert.equal(verdict("full", "full-minus-z", games("full", "full-minus-z", 12, 12)).verdict, "undetermined", "two of four scenarios are not enough for any verdict");
  const stamped = verdict("stamp", "full", games("stamp", "full", 8, 12));
  assert.ok(stamped.stampedA && stamped.measured === 0 && stamped.verdict === "undetermined", "identical layouts across runs do not win on measured scores");
  assert.equal(verdict("stamp", "full", games("stamp", "full", 36, 48)).verdict, "better", "only the judge can still prefer a stamped look");
  // Holm：单独看 p = 0.03 和 0.04 都显著，放进同一族后最小的那个乘 2 变成 0.06，都不显著
  const base = compare("full", "full-minus-y", byCell, games("full", "full-minus-y", 8, 12), dir);
  const family = decide([{ ...base, pMeasured: 0.03, D: 2 }, { ...base, pMeasured: 0.04, D: 2 }]);
  assert.deepEqual(family.map((result) => Number(result.pMeasuredAdj.toFixed(2))), [0.06, 0.06]);
  assert.deepEqual(family.map((result) => result.verdict), ["undetermined", "undetermined"]);
  assert.equal(decide([{ ...base, pMeasured: 0.03, D: 2 }])[0].verdict, "better", "alone, p = 0.03 with an agreeing judge keeps");
  // 重跑盲评不会重复计数
  const twice = [...games("full", "full-minus-x", 4, 6), ...games("full", "full-minus-x", 4, 6)];
  assert.equal(dedupeJudge(twice).length, 6);
  assert.equal(compare("full", "full-minus-x", byCell, twice, dir).decided, 6);
});

test("the variance pilot turns σ into runs per cell for 80% power on a 5-point difference", async () => {
  const { powerLines, runsNeeded } = await load("power.mjs");
  // n = 2σ²(z₀.₉₉₅ + z₀.₈)² / (S δ²) with α = 0.05/5: σ = 8, S = 6 → 2·64·11.68/150 ≈ 9.97 → 10
  assert.equal(runsNeeded(8, { scenarios: 6 }), 10);
  assert.equal(runsNeeded(2, { scenarios: 6 }), 3, "never fewer than 3");
  const rows = ["a", "b"].flatMap((scenario) => [70, 78, 74, 82, 66].map((score, index) => ({ variant: "bare", scenario, run: index + 1, status: "ok", score })));
  rows.push({ variant: "bare", scenario: "a", run: 6, status: "timeout", score: 0 });
  const lines = powerLines(rows).join("\n");
  assert.match(lines, /a：6 次/);
  assert.match(lines, /--runs \d+/);
});

test("scoring rewards hierarchy, ignores gradients and glows, and catches overflow and off-palette pages; sameness is structural", { skip: tools.skip }, async (t) => {
  const { grade } = await load("suite.mjs");
  const { similarity } = await load("measure.mjs");
  const scored = {};
  const prints = {};
  for (const kind of ["good", "monotone", "gradient", "overflow", "offpalette", "recolour-shift", "layout-b"]) {
    const workdir = tmp(t, `ablation-${kind}-`);
    fs.copyFileSync(path.join(fixtures, `${kind}.html`), path.join(workdir, "cover.html"));
    scored[kind] = await grade(workdir, "cover-dark", { captureDir: path.join(workdir, "capture") });
    prints[kind] = JSON.parse(fs.readFileSync(path.join(workdir, "capture/fingerprint.json"), "utf8"));
  }
  const { good, monotone, gradient, overflow, offpalette } = scored;
  assert.equal(good.hierarchyFails, 0);
  assert.equal(monotone.hierarchyFails, 2, "a page where everything is one size fails the hierarchy floor");
  assert.equal(monotone.rhythmScore, 0, "a one-level page has no rhythm to score");
  assert.ok(good.score >= monotone.score + 20, `good ${good.score} beats flat ${monotone.score}`);
  assert.equal(gradient.score, good.score, "a gradient background and a glow neither add nor cost points");
  assert.equal(gradient.paletteElements, 1);
  assert.ok(overflow.overflow > 0 && overflow.belowMinFont > 0 && good.score > overflow.score + 10);
  assert.ok(offpalette.paletteElements < 0.5 && good.score > offpalette.score + 10);
  // 校准：同一版式换色、换色又挪几像素要判成一个模子，不同版式不能
  const threshold = (await load("report.mjs")).RULES.stampStructure;
  assert.ok(similarity(prints.good, prints.offpalette).structure >= threshold);
  assert.ok(similarity(prints.good, prints["recolour-shift"]).structure >= threshold);
  assert.ok(similarity(prints.good, prints["layout-b"]).structure < threshold);
  assert.ok(similarity(prints.good, prints.monotone).structure < threshold);
  assert.ok(similarity(prints.monotone, prints["layout-b"]).structure < threshold);
});

test("a missing reference folder fails instead of running without references", async (t) => {
  const { referenceSources } = await load("suite.mjs");
  const empty = tmp(t, "ablation-norefs-");
  assert.throws(() => referenceSources("cover-dark", empty), /没有参考图/);
  // 场景名的目录优先于风格名的目录
  fs.mkdirSync(path.join(empty, "foundry-console"));
  fs.writeFileSync(path.join(empty, "foundry-console", "style.png"), "");
  fs.mkdirSync(path.join(empty, "cover-dark"));
  fs.writeFileSync(path.join(empty, "cover-dark", "own.jpg"), "");
  fs.writeFileSync(path.join(empty, "cover-dark", "notes.txt"), "");
  assert.deepEqual(referenceSources("cover-dark", empty).map((file) => path.basename(file)), ["own.jpg"]);
  assert.deepEqual(referenceSources("hero-dark", empty).map((file) => path.basename(file)), ["style.png"]);
});

test("the three questions are answered yes, no or not enough data, and the reference family appears only when that variant ran", async (t) => {
  const { readTsv, summarize } = await load("report.mjs");
  const dir = tmp(t, "ablation-questions-");
  const rows = [];
  const add = (variant, scenario, run, score) => {
    const capture = `captures/${variant}-${scenario}-${run}`;
    fs.mkdirSync(path.join(dir, capture), { recursive: true });
    // 相邻两次的版式不一样，免得被判成套模板
    fs.writeFileSync(path.join(dir, capture, "fingerprint.json"), JSON.stringify({ cols: 4, rows: 1, gray: [run, 0, 0, 0], mask: run % 2 ? [1, 0, 0, 0] : [0, 0, 0, 1] }));
    const skill = variant.startsWith("full");
    rows.push({ variant, scenario, run, status: "ok", score, capture, skillUsed: skill ? "true" : "", layersRead: skill ? "ui-craft" : "" });
  };
  for (const scenario of ["a", "b", "c", "d"]) {
    for (let run = 1; run <= 6; run++) {
      const noise = [-1, 1, -2, 2, 0, 0][run - 1];
      add("bare", scenario, run, 70 + noise);
      add("full", scenario, run, 80 + noise);
      add("reference-system", scenario, run, 90 + noise);
      add("full-minus-ui-craft", scenario, run, 88 + noise);
    }
  }
  writeRows(dir, rows);
  const games = (a, b, winsA, total) => Array.from({ length: total }, (_, index) => ({ pair: `j|s|${index}|${a}|${b}`, left: a, right: b, winner: index < winsA ? a : b }));
  const parsed = readTsv(path.join(dir, "results.tsv"));
  const none = summarize(parsed, [], dir).join("\n");
  assert.match(none, /1\. 装了技能是否胜过不装：样本不足/, "measured scores alone decide nothing");
  assert.match(none, /2\. 技能与“参考加设计系统”谁好：样本不足/);
  assert.match(none, /3\. 单独拿掉 ui-craft 层.*：样本不足/);
  const judged = summarize(parsed, [...games("full", "bare", 9, 12), ...games("full", "reference-system", 3, 12), ...games("full", "full-minus-ui-craft", 3, 12)], dir).join("\n");
  assert.match(judged, /1\. 装了技能是否胜过不装：是/);
  assert.match(judged, /2\. 技能与“参考加设计系统”谁好：参考加设计系统更好/);
  assert.match(judged, /3\. 单独拿掉 ui-craft 层.*：变好，这一层在拖累/);
  assert.match(judged, /参考加设计系统（不装技能/);
  const without = summarize(parsed.filter((row) => row.variant !== "reference-system"), [], dir).join("\n");
  assert.ok(!without.includes("参考加设计系统（不装技能"), "old result folders keep their report");
  assert.match(without, /2\. 技能与“参考加设计系统”谁好：没跑 reference-system 变体/);
});

test("product screens are scored: a complete page passes, tiny targets and a dropped status label are caught", { skip: tools.skip }, async (t) => {
  const { grade } = await load("suite.mjs");
  const run = async (scenario, deliverable, source) => {
    const workdir = tmp(t, "ablation-product-");
    fs.writeFileSync(path.join(workdir, deliverable), source);
    const scored = await grade(workdir, scenario, { captureDir: path.join(workdir, "capture") });
    return { ...scored, ...JSON.parse(fs.readFileSync(path.join(workdir, "capture/measure.json"), "utf8")) };
  };
  const workbench = fs.readFileSync(path.join(fixtures, "workbench-good.html"), "utf8");
  for (const [scenario, deliverable, source] of [["workbench-list", "workbench.html", workbench], ["settings-page", "settings.html", fs.readFileSync(path.join(fixtures, "settings-good.html"), "utf8")]]) {
    const good = await run(scenario, deliverable, source);
    assert.equal(good.contractOk, true, good.contractIssues.join("; "));
    assert.deepEqual([good.contentCoverage, good.overflow, good.contrastFails, good.belowMinFont, good.hierarchyFails, good.fakeControls, good.targetSizeFails], [1, 0, 0, 0, 0, 0, 0], scenario);
    assert.deepEqual([good.hygiene, good.adherence], [100, 100], scenario);
  }
  // 按钮缩到 16px 高：点击区域不够，记在 measure.json 里（不进综合分）
  const tiny = await run("workbench-list", "workbench.html", workbench.replace("height: 36px; min-width: 64px; padding: 0 16px;", "height: 16px; min-width: 16px; padding: 0;"));
  assert.ok(tiny.targetSizeFails > 0, "small hit areas are counted");
  // 运行中的那一行只留颜色、去掉文字标签：文字覆盖不到 1
  const colourOnly = await run("workbench-list", "workbench.html", workbench.replace('<span class="run">进行中</span>', '<span class="run"></span>').replace('<button type="button" aria-pressed="false">进行中</button>', ""));
  assert.ok(colourOnly.contentCoverage < 1 && colourOnly.hygiene < 100, "a status carried by colour alone loses its label");
});

test("in-page anchors count as real controls only when their target id exists", { skip: tools.skip }, async (t) => {
  const { grade } = await load("suite.mjs");
  const page = (ids) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;width:1440px;height:900px;overflow:hidden;background:#0D0F11;color:#E8EAEC;font:400 24px/32px sans-serif}a{color:#F5A623}</style></head><body><a href="#trial">免费试用 14 天</a> <a href="#demo">查看演示</a>${ids}</body></html>`;
  for (const [ids, expected] of [["", 2], ['<div id="trial"></div><div id="demo"></div>', 0]]) {
    const workdir = tmp(t, "ablation-anchor-");
    fs.writeFileSync(path.join(workdir, "hero.html"), page(ids));
    const scored = await grade(workdir, "hero-dark", { captureDir: path.join(workdir, "capture") });
    assert.equal(scored.fakeControls, expected);
  }
});

test("the runner: frozen columns, failures score 0, relative paths, workdirs deleted, cache state recorded; the judge dedupes, errors on a missing capture and never sees variant names", { skip: tools.skip }, async (t) => {
  const { HEADER } = await load("suite.mjs");
  const { readTsv } = await load("report.mjs");
  assert.deepEqual(HEADER, FROZEN_HEADER, "results.tsv columns are frozen");
  const out = tmp(t, "ablation-run-");
  const work = tmp(t, "ablation-work-");
  const home = tmp(t, "ablation-home-");
  // Windows: Chrome refuses to start under a profile folder that has no AppData\Local
  if (process.platform === "win32") for (const dir of ["Local", "Roaming"]) fs.mkdirSync(path.join(home, "AppData", dir), { recursive: true });
  const cache = tmp(t, "ablation-cache-");
  fs.mkdirSync(path.join(cache, "design-direction-library"));
  const env = { ...process.env, HOME: home, USERPROFILE: home, DESIGN_PIPELINE_CACHE: cache };
  const fake = JSON.stringify([process.execPath, path.join(fixtures, "fake-client.mjs")]);
  const runner = (args, extraEnv = env) => spawnSync(process.execPath, [path.join(evalRoot, "run.mjs"), "--client", "claude", "--command", fake, ...args], { encoding: "utf8", env: extraEnv, timeout: 300000 });
  // hero-dark 要 hero.html，假代理只会写 cover.html：没交付物，按失败记 0 分
  const run = runner(["--variants", "bare,full,full-minus-taste-skill", "--scenarios", "cover-dark,hero-dark", "--runs", "1", "--out", out, "--work-root", work]);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(fs.readFileSync(path.join(out, "results.tsv"), "utf8").split("\n")[0], FROZEN_HEADER.join("\t"));
  const rows = readTsv(path.join(out, "results.tsv"));
  const cover = Object.fromEntries(rows.filter((row) => row.scenario === "cover-dark").map((row) => [row.variant, row]));
  for (const row of Object.values(cover)) {
    assert.equal(row.status, "ok");
    assert.equal(row.contractOk, true, row.contractIssues);
    assert.ok(!path.isAbsolute(row.capture) && fs.existsSync(path.join(out, row.capture, "screenshot.png")), "captures are stored relative to the results folder");
    assert.ok(!path.isAbsolute(row.workdir) && !fs.existsSync(path.join(work, row.workdir)), "the workdir is deleted after scoring");
    assert.ok(fs.existsSync(path.join(out, row.capture, "workdir-files.json")));
  }
  assert.ok(cover.full.score > cover.bare.score + 10 && cover.full.score > cover["full-minus-taste-skill"].score + 10);
  assert.ok(cover.bare.overflow > 0, "the overflowing cover is caught");
  assert.ok(cover["full-minus-taste-skill"].paletteElements < 0.5, "the off-palette cover is caught");
  assert.equal(cover.full.skillUsed, true);
  assert.equal(cover.full.skillEdited, false);
  for (const row of rows.filter((entry) => entry.scenario === "hero-dark")) {
    assert.equal(row.status, "no-deliverable");
    assert.equal(row.score, 0, "a run without its deliverable scores 0 like a timeout or an error");
  }
  const environment = JSON.parse(fs.readFileSync(path.join(out, "environment.jsonl"), "utf8").trim().split("\n")[0]);
  assert.deepEqual(environment.cache, { root: cache, exists: true, entries: ["design-direction-library"] });
  assert.match(run.stdout, /失败 1（100%）/);

  // reference-system：工作目录里有截好的参考图和 DESIGN.md，没有技能；用的参考目录记在 environment.jsonl
  const refOut = tmp(t, "ablation-ref-");
  const ref = runner(["--variants", "reference-system", "--scenarios", "cover-dark-open", "--runs", "1", "--out", refOut, "--work-root", work]);
  assert.equal(ref.status, 0, ref.stderr);
  const [refRow] = readTsv(path.join(refOut, "results.tsv"));
  assert.equal(refRow.status, "ok");
  const listed = JSON.parse(fs.readFileSync(path.join(refOut, refRow.capture, "workdir-files.json"), "utf8"));
  for (const file of ["references/01-release-console.png", "references/02-night-shift-poster.png", "DESIGN.md", "AGENTS.md"]) assert.ok(listed.includes(file), `the workdir has ${file}`);
  assert.ok(!listed.some((file) => file.includes("skills/")), "no skill is installed");
  const shot = fs.readFileSync(path.join(refOut, "references/foundry-console/01-release-console.png"));
  assert.equal(shot.subarray(1, 4).toString("latin1"), "PNG", "the reference page is rendered to a PNG once per results folder");
  assert.equal(JSON.parse(fs.readFileSync(path.join(refOut, "environment.jsonl"), "utf8").trim().split("\n")[0]).references, path.join(evalRoot, "references"));
  // 自己的截图目录：按场景名放，原样复制；空目录在开跑前就报错
  const own = tmp(t, "ablation-own-");
  fs.mkdirSync(path.join(own, "cover-dark-open"));
  fs.writeFileSync(path.join(own, "cover-dark-open", "my-shot.png"), shot);
  const ownOut = tmp(t, "ablation-own-out-");
  const ownRun = runner(["--variants", "reference-system", "--scenarios", "cover-dark-open", "--runs", "1", "--out", ownOut, "--work-root", work, "--references", own]);
  assert.equal(ownRun.status, 0, ownRun.stderr);
  const ownFiles = JSON.parse(fs.readFileSync(path.join(ownOut, readTsv(path.join(ownOut, "results.tsv"))[0].capture, "workdir-files.json"), "utf8"));
  assert.deepEqual(ownFiles.filter((file) => file.startsWith("references/")), ["references/my-shot.png"]);
  const noRefs = runner(["--variants", "reference-system", "--scenarios", "cover-dark-open", "--runs", "1", "--out", tmp(t, "ablation-norefs-out-"), "--work-root", work, "--references", tmp(t, "ablation-norefs-")]);
  assert.notEqual(noRefs.status, 0);
  assert.match(noRefs.stderr, /没有参考图/);

  const other = tmp(t, "ablation-wrong-");
  fs.writeFileSync(path.join(other, "results.tsv"), "client\tvariant\n");
  const refused = runner(["--variants", "bare", "--scenarios", "cover-dark", "--runs", "1", "--out", other, "--work-root", work]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /列和这个实测不一样/);

  fs.mkdirSync(path.join(home, ".agents/skills/design-pipeline"), { recursive: true });
  const guarded = runner(["--variants", "bare", "--scenarios", "cover-dark", "--runs", "1", "--out", tmp(t, "ablation-guard-"), "--work-root", work]);
  assert.notEqual(guarded.status, 0);
  assert.match(guarded.stderr, /用户级目录装着 design-pipeline/);

  const judgeCommand = JSON.stringify([process.execPath, path.join(fixtures, "fake-judge.mjs")]);
  const judge = (args = []) => spawnSync(process.execPath, [path.join(evalRoot, "judge.mjs"), "--out", out, "--judge", "codex", "--command", judgeCommand, "--seed", "3", ...args], { encoding: "utf8", env });
  assert.equal(judge().status, 0);
  assert.equal(judge().status, 0, "a re-run skips pairs already judged");
  const games = readTsv(path.join(out, "judge.tsv"));
  assert.equal(games.length, 2, "full against bare and against full-minus-taste-skill, once each");
  assert.equal(new Set(games.map((game) => game.pair)).size, 2);
  for (const game of games) {
    assert.equal(game.winner, game.left, "the fake judge always picks A, which is the left variant");
    const transcript = fs.readFileSync(path.join(out, game.transcript), "utf8");
    const promptText = transcript.split("----- 收到的提示词 -----")[1].split("----- 结束 -----")[0];
    for (const name of ["bare", "full", "minus", "taste-skill", "variant", "变体", "消融"]) assert.ok(!promptText.includes(name), `the judge prompt does not contain ${name}`);
  }
  const same = spawnSync(process.execPath, [path.join(evalRoot, "judge.mjs"), "--out", out, "--judge", "claude", "--command", judgeCommand], { encoding: "utf8", env });
  assert.notEqual(same.status, 0);
  assert.match(same.stderr, /换另一家/);
  fs.rmSync(path.join(out, cover.bare.capture, "screenshot.png"));
  const missing = judge(["--rejudge"]);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /却没有截图/);
});

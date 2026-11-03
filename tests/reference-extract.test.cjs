"use strict";

// `reference extract` measures a reference page's palette, type scale and spacing without a model
// (OpenSpec change reference-palette-extract), and every reference capture refuses a challenge or block
// page. The fixture pages are served from this process on 127.0.0.1, never from the internet; the CLI
// runs as a child process (async, so the server keeps answering). Browser tests skip, like the page refs
// tests, only when no browser or puppeteer-core is found.

const assert = require("node:assert/strict");
const test = require("node:test");
const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { execFile, spawnSync } = require("node:child_process");
const { resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
const { resolveBrowser } = require("../skill/scripts/browser-locate.cjs");
const { detectBlockPage, signalsFromHtml } = require("../skill/scripts/block-page-core.cjs");
const core = require("../skill/scripts/reference-extract-core.cjs");
const { inspectPaletteFoundation } = require("../skill/scripts/palette-foundation-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const FIXTURES = path.join(__dirname, "fixtures", "reference-extract");
const PUPPETEER_MODULE = process.env.DESIGN_PIPELINE_PUPPETEER_MODULE;

function missingTool() {
  for (const probe of [() => resolvePuppeteer(process.cwd(), PUPPETEER_MODULE), () => resolveBrowser()]) {
    try {
      probe();
    } catch (error) {
      if (error.code !== "TOOL_MISSING") throw error;
      return `no browser for reference extract (${error.message})`;
    }
  }
  return false;
}
const skip = missingTool();
const puppeteerPath = () => PUPPETEER_MODULE || path.dirname(require.resolve("puppeteer-core/package.json", { paths: [repoRoot] }));

// blocked.html answers 403, as a WAF does; every other fixture answers 200.
let server;
let origin;
test.before(async () => {
  server = http.createServer((request, response) => {
    const name = path.basename(new URL(request.url, "http://localhost").pathname);
    const file = path.join(FIXTURES, name);
    if (!name.endsWith(".html") || !fs.existsSync(file)) {
      response.writeHead(404, { "content-type": "text/plain" });
      response.end("not found");
      return;
    }
    response.writeHead(name === "blocked.html" ? 403 : 200, { "content-type": "text/html; charset=utf-8" });
    response.end(fs.readFileSync(file));
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => new Promise((done) => server.close(done)));

function runAsync(args) {
  return new Promise((done) => {
    execFile(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", timeout: 180000, windowsHide: true }, (error, stdout, stderr) => {
      let output = null;
      try { output = JSON.parse(stdout); } catch { output = null; }
      done({ status: error ? (typeof error.code === "number" ? error.code : 1) : 0, stdout, stderr, output });
    });
  });
}

const tempRoot = () => fs.mkdtempSync(path.join(os.tmpdir(), "reference-extract-"));
const extract = (root, page, extra = []) => runAsync(["reference", "extract", "--root", root, "--url", `${origin}/${page}`, "--output", "out", "--puppeteer-module", puppeteerPath(), "--json", ...extra]);
const readOut = (root, name) => fs.readFileSync(path.join(root, "out", name), "utf8");

test("palette tiers, CIEDE2000 clustering, type and spacing come from computed styles", { skip }, async () => {
  const root = tempRoot();
  const result = await extract(root, "brand.html");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.output.status, "extracted");
  assert.equal(result.output.creativeAcceptance, "not-assessed");
  const extraction = JSON.parse(readOut(root, "extraction.json"));
  assert.equal(extraction.schema, "design-pipeline.reference-extraction.v1");
  assert.equal(extraction.httpStatus, 200);
  // #fefefe and #fdfdfd are within CIEDE2000 15 of white and merge into the dominant page background.
  const [white] = extraction.palette.background;
  assert.equal(white.hex, "#ffffff");
  assert.equal(white.tier, "dominant");
  assert.deepEqual([...white.members].sort(), ["#fdfdfd", "#fefefe", "#ffffff"]);
  // The CTA covers about 2% of the backgrounds, but a saturated colour is never below accent.
  const cta = extraction.palette.background.find((item) => item.hex === "#1f6feb");
  assert.ok(cta.share < 0.05, `cta share ${cta.share}`);
  assert.equal(cta.tier, "accent");
  assert.deepEqual(cta.vars, ["--brand"]);
  assert.equal(extraction.palette.text[0].hex, "#111827");
  assert.equal(extraction.palette.text[0].tier, "dominant");
  const roles = Object.fromEntries(result.output.roles.map((item) => [item.role, item.hex]));
  assert.equal(roles.background, "#ffffff");
  assert.equal(roles.text, "#111827");
  assert.equal(roles["text-muted"], "#6b7280");
  assert.equal(roles.border, "#e5e7eb");
  assert.equal(roles.primary, "#1f6feb");
  // 15.8px and 16.2px cluster to 16px with the plain 16px text.
  assert.deepEqual(extraction.type.scale.map((item) => item.size), ["14px", "16px", "32px", "48px"]);
  assert.equal(extraction.type.body, "16px");
  assert.equal(extraction.type.scale.find((item) => item.size === "16px").count, 10);
  assert.deepEqual(extraction.type.families, { heading: "Brand Display", body: "Brand Sans" });
  assert.deepEqual(extraction.spacing.scale.map((item) => item.value), ["8px", "16px", "24px", "32px"]);
  assert.deepEqual(extraction.spacing.grid, { base: "8px", coverage: 1 });
  assert.deepEqual(extraction.lowConfidence, []);

  const palette = JSON.parse(readOut(root, "palette-evidence.json"));
  assert.equal(palette.schema, "design-pipeline.palette-evidence.v1");
  assert.equal(palette.status, "pending");
  assert.equal(palette.sourceUrl, `${origin}/brand.html`);
  assert.equal(palette.targetId, "127-0-0-1");
  assert.equal(palette.sources.domComputed.status, "ready");
  assert.deepEqual(palette.sources.domComputed.evidencePaths, ["extraction.json"]);
  assert.equal(palette.sources.rasterMedia.status, "pending");
  assert.deepEqual(palette.relationships.luminanceHierarchy.slice(0, 1), ["background"]);
  assert.match(palette.relationships.temperaturePosture, /^cool/);

  const draft = readOut(root, "design-md-draft.md");
  assert.match(draft, /^---\nversion: alpha\n/);
  assert.match(draft, /\n {2}primary: "#1f6feb"\n/);
  assert.match(draft, /\n {2}heading-1:\n {4}fontFamily: "Brand Display"\n {4}fontSize: 48px\n {4}fontWeight: 700\n {4}lineHeight: 56px\n/);
  assert.match(draft, /\n {2}body:\n {4}fontFamily: "Brand Sans"\n {4}fontSize: 16px\n/);
  assert.match(draft, /\nspacing:\n {2}base: 8px\n {2}space-1: 8px\n/);
  assert.doesNotMatch(draft, /low confidence/);

  // A second run keeps the evidence unless --replace is given.
  const again = await extract(root, "brand.html");
  assert.equal(again.status, 1);
  assert.equal(again.output.error.code, "OUTPUT_EXISTS");
  const replaced = await extract(root, "brand.html", ["--replace"]);
  assert.equal(replaced.status, 0, replaced.stderr || replaced.stdout);
});

test("a fixed cookie banner is dismissed before measuring and its colours stay out", { skip }, async () => {
  const root = tempRoot();
  const result = await extract(root, "brand.html");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(result.output.overlaysDismissed, ["div.cookie-banner"]);
  const extraction = readOut(root, "extraction.json");
  assert.doesNotMatch(extraction, /#ff00aa|#00ff00/);
  assert.match(JSON.parse(readOut(root, "palette-evidence.json")).notes.join("\n"), /Dismissed before measuring: div\.cookie-banner/);
});

test("evidence that does not support a value is written as low confidence, not guessed", { skip }, async () => {
  const root = tempRoot();
  const result = await extract(root, "sparse.html");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const low = result.output.lowConfidence.join("\n");
  assert.match(low, /primary: no saturated, mid-light colour/);
  assert.match(low, /body font: no named family appears on two or more/);
  assert.match(low, /roles: only 2 semantic roles/);
  assert.match(low, /spacing grid: only 2 spacing values measured/);
  const draft = readOut(root, "design-md-draft.md");
  assert.match(draft, /\n {2}primary: "\(low confidence\)"\n/);
  assert.match(draft, /\n {4}fontFamily: "\(low confidence\)"\n/);
  assert.match(draft, /## Low confidence\n/);
  assert.doesNotMatch(draft, /base: /);
  const palette = JSON.parse(readOut(root, "palette-evidence.json"));
  assert.deepEqual(palette.semanticRoles.map((item) => item.role), ["background", "text"]);
  assert.ok(palette.notes.some((note) => note.startsWith("(low confidence) primary:")));
});

test("a 403 access-denied page is refused with REFERENCE_BLOCKED and writes nothing", { skip }, async () => {
  const root = tempRoot();
  const result = await extract(root, "blocked.html");
  assert.equal(result.status, 1, result.stdout);
  assert.equal(result.output.error.code, "REFERENCE_BLOCKED");
  assert.match(result.output.error.message, /HTTP 403/);
  assert.match(result.output.error.message, /Fix: /);
  assert.equal(fs.existsSync(path.join(root, "out")), false);
  const cloudflare = await extract(root, "cloudflare.html");
  assert.equal(cloudflare.status, 1);
  assert.equal(cloudflare.output.error.code, "REFERENCE_BLOCKED");
  assert.equal(cloudflare.output.error.details.vendor, "cloudflare");
});

test("a JavaScript challenge that clears itself is waited out and the real page measured", { skip }, async () => {
  const root = tempRoot();
  const result = await extract(root, "challenge.html");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const extraction = JSON.parse(readOut(root, "extraction.json"));
  assert.equal(extraction.palette.text[0].hex, "#111111");
});

test("the extraction is the DOM source the palette checker reads; completed, it passes", { skip }, async () => {
  const root = tempRoot();
  const research = path.join("targets", "home", "research");
  const result = await runAsync(["reference", "extract", "--root", root, "--url", `${origin}/brand.html`, "--output", research, "--target-id", "home", "--puppeteer-module", puppeteerPath(), "--json"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const target = { id: "home", url: `${origin}/brand.html` };
  assert.deepEqual(inspectPaletteFoundation({ changeRoot: root, targets: [target] }), ["home: palette evidence status is pending"]);
  // What the agent adds after judging: the raster-media source, the tokens document, ready status.
  const file = path.join(root, research, "palette-evidence.json");
  const palette = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(path.join(root, research, "page.png"), "png");
  palette.status = "ready";
  palette.sources.rasterMedia = { status: "ready", evidencePaths: ["page.png"], regions: ["hero"], colors: [{ hex: "#ffffff", role: "background", region: "hero" }, { hex: "#0f172a", role: "header", region: "hero" }] };
  fs.writeFileSync(file, JSON.stringify(palette));
  const tokens = palette.targetProjectTokens.map((item) => `${item.token}: ${item.value};`).join("\n");
  fs.writeFileSync(path.join(root, research, "design-tokens.md"), `## Palette Evidence\n\n## Semantic Roles\n\n## Palette Relationships\n\n## Target-Project Token Mapping\n\n${tokens}\n`);
  assert.deepEqual(inspectPaletteFoundation({ changeRoot: root, targets: [target] }), []);
});

test("bad input is refused before a browser starts", async () => {
  const root = tempRoot();
  for (const [args, code] of [
    [["--url", "ftp://example.com/", "--output", "out"], "OPTION_INVALID"],
    [["--url", "https://user:pw@example.com/", "--output", "out"], "OPTION_INVALID"],
    [["--url", "https://example.com/", "--output", "out", "--target-id", "Not Valid"], "OPTION_INVALID"],
    [["--url", "https://example.com/"], "OPTION_REQUIRED"],
  ]) {
    const result = await runAsync(["reference", "extract", "--root", root, "--json", ...args]);
    assert.equal(result.status, 1, result.stdout);
    assert.equal(result.output.error.code, code, `${args.join(" ")}: ${result.stdout}`);
  }
  assert.equal(fs.existsSync(path.join(root, "out")), false);
});

test("block-page detection: vendor markers alone, wording only with a second signal", () => {
  const cloudflare = detectBlockPage(signalsFromHtml(fs.readFileSync(path.join(FIXTURES, "cloudflare.html"), "utf8")));
  assert.deepEqual([cloudflare.blocked, cloudflare.vendor, cloudflare.kind], [true, "cloudflare", "block"]);
  assert.deepEqual(detectBlockPage({ title: "Pricing", text: "x".repeat(500), html: '<div class="cf-challenge-running">' }).kind, "challenge");
  assert.equal(detectBlockPage({ title: "Access Denied", text: "short", status: 200 }).blocked, true);
  // One signal is not enough: a minimal landing page, or a long page that merely says "forbidden".
  assert.equal(detectBlockPage({ title: "Studio", text: "Hello.", status: 200 }).blocked, false);
  assert.equal(detectBlockPage({ title: "Forbidden fruit recipes", text: "x".repeat(500), status: 200 }).blocked, false);
  assert.equal(detectBlockPage({ title: "Sign in", text: "Sign in", html: '<div class="g-recaptcha"></div>' }).blocked, true);
  // A project's own designed 403 page is judged by vendor markers only.
  assert.equal(detectBlockPage({ title: "Access Denied", text: "short", status: 403 }, { vendorOnly: true }).blocked, false);
  assert.equal(detectBlockPage({ title: "Bare", text: "x".repeat(500), backgrounds: ["255,255,255,1"], fonts: ["Times New Roman"] }).blocked, false);
  assert.equal(detectBlockPage({ title: "Bare", text: "short", backgrounds: ["255,255,255,1"], fonts: ["Times New Roman"] }).blocked, true);
});

test("CIEDE2000 matches the published reference pairs and tiers follow share", () => {
  // Identical and near-identical colours, black against white, and pure red against pure blue (52.88).
  assert.equal(core.deltaE2000([255, 255, 255], [255, 255, 255]), 0);
  assert.ok(core.deltaE2000([255, 255, 255], [254, 254, 254]) < 1);
  assert.ok(core.deltaE2000([0, 0, 0], [255, 255, 255]) > 99);
  assert.ok(Math.abs(core.deltaE2000([255, 0, 0], [0, 0, 255]) - 52.88) < 0.1);
  assert.equal(core.tierOf(0.3, [10, 10, 10]), "dominant");
  assert.equal(core.tierOf(0.06, [10, 10, 10]), "accent");
  assert.equal(core.tierOf(0.01, [128, 128, 128]), "incidental");
  assert.equal(core.tierOf(0.01, [31, 111, 235]), "accent");
  const clusters = core.clusterColors([
    { hex: "#ffffff", weight: 10, count: 1, region: "body", area: 10 },
    { hex: "#f8f8f8", weight: 1, count: 1, region: "div", area: 1 },
    { hex: "#1f6feb", weight: 2, count: 1, region: "button", area: 2 },
  ]);
  assert.deepEqual(clusters.map((item) => [item.hex, item.weight]), [["#ffffff", 11], ["#1f6feb", 2]]);
});

// --- the other captures refuse block pages ----------------------------------------------------------

function fakeAdapter(root, html) {
  const adapter = path.join(root, "fake-adapter.cjs");
  fs.writeFileSync(adapter, `const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path");const DOM=${JSON.stringify(html)};let s="";process.stdin.on("data",c=>s+=c);process.stdin.on("end",()=>{const r=JSON.parse(s),keys=["screenshot","trace","dom","console","network","accessibility","performance"],artifacts={},hashes={};for(const k of keys){const n=k==="dom"?"page.html":k+".txt",b=Buffer.from(k==="dom"?DOM:k);fs.writeFileSync(path.join(r.outputRoot,n),b);artifacts[k]=n;hashes[k]=crypto.createHash("sha256").update(b).digest("hex")}process.stdout.write(JSON.stringify({schema:"design-pipeline.evidence-receipt.v1",id:"fake",status:"complete",adapter:{id:"fake",version:"1",availability:"available",probe:{ok:true,message:"ready"}},target:{url:r.url,viewport:r.viewport},capturedAt:"2026-11-03T00:00:00Z",artifacts,hashes,redaction:{status:"not-required",notes:[]}}))});`);
  return adapter;
}

test("evidence capture refuses an adapter's saved block page and keeps no capture", () => {
  const root = tempRoot();
  const blocked = spawnSync(process.execPath, [cli, "evidence", "capture", "--root", root, "--project-root", root, "--adapter-path", fakeAdapter(root, fs.readFileSync(path.join(FIXTURES, "cloudflare.html"), "utf8")), "--output-root", "captured", "--url", "https://example.com", "--json"], { encoding: "utf8" });
  assert.equal(blocked.status, 1, blocked.stdout);
  assert.equal(JSON.parse(blocked.stdout).error.code, "REFERENCE_BLOCKED");
  assert.equal(fs.existsSync(path.join(root, "captured")), false);
  assert.deepEqual(fs.readdirSync(root).filter((name) => name.startsWith("captured")), []);
  const real = spawnSync(process.execPath, [cli, "evidence", "capture", "--root", root, "--project-root", root, "--adapter-path", fakeAdapter(root, fs.readFileSync(path.join(FIXTURES, "brand.html"), "utf8")), "--output-root", "captured", "--url", "https://example.com", "--json"], { encoding: "utf8" });
  assert.equal(real.status, 0, real.stdout);
  assert.ok(fs.existsSync(path.join(root, "captured", "receipt.json")));
});

test("evidence refs refuses a saved vendor block page but numbers a designed 403 page", { skip }, () => {
  const refs = (fixture) => {
    const dir = tempRoot();
    fs.copyFileSync(path.join(FIXTURES, fixture), path.join(dir, "index.html"));
    const child = spawnSync(process.execPath, [cli, "evidence", "refs", "--root", dir, "--project-root", dir, "--puppeteer-module", puppeteerPath(), "--json"], { encoding: "utf8", timeout: 180000 });
    return { dir, status: child.status, output: JSON.parse(child.stdout) };
  };
  const blocked = refs("cloudflare.html");
  assert.equal(blocked.status, 1, JSON.stringify(blocked.output));
  assert.equal(blocked.output.error.code, "REFERENCE_BLOCKED");
  assert.equal(fs.existsSync(path.join(blocked.dir, "evidence", "refs.json")), false);
  const designed = refs("blocked.html");
  assert.equal(designed.status, 0, JSON.stringify(designed.output));
});

test("replicate's extract step and the website-cloning guide run the extraction first", () => {
  const { initState, nextAction } = require("../skill/scripts/workflow-core.cjs");
  const { writeReference } = require("./helpers/replicate-flow.cjs");
  const dir = tempRoot();
  initState(dir, { mode: "replicate", deliverable: "ui", tier: "quick" });
  writeReference(dir);
  const extractStep = nextAction(dir);
  assert.deepEqual([extractStep.stage, extractStep.type], ["extract", "run"]);
  assert.match(extractStep.measure, /reference extract --root .* --url <page url> --output reference\/extract$/);
  assert.match(extractStep.instruction, /If the reference is a live page, run .*reference extract.* first/);
  assert.match(extractStep.instruction, /never a "\(low confidence\)" value/);
  assert.match(extractStep.instruction, /REFERENCE_BLOCKED/);
  const guide = fs.readFileSync(path.join(repoRoot, "skill/references/website-cloning.md"), "utf8");
  assert.match(guide, /Measure first, then judge[\s\S]*reference extract --root <project>[\s\S]*REFERENCE_BLOCKED/);
});

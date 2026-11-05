"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const brand = require("../skill/scripts/brand-design-systems-core.cjs");
const { inspectDesignMdSource, searchDesignMdSource } = require("../skill/scripts/design-md-source-core.cjs");
const { BUNDLES, WHOLE_BUNDLES, fetchBundle, partialBundles, upstreamRoot } = require("../skill/scripts/vendor-cache.cjs");
const { build, reviewed, serialize } = require("../scripts/import-brand-design-systems.cjs");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const found = partialBundles().find((entry) => entry.schema === brand.schema);
const manifestFile = found.manifestFile;
const vendorRoot = path.dirname(manifestFile);
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const sha256 = (content) => crypto.createHash("sha256").update(content).digest("hex");
const blobId = (content) => crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brand-design-systems-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function walk(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(root, file) : [file];
  }).sort();
}

const TOKENS = (accent, bg, fg) => `/* fixture */\n:root {\n  --bg: ${bg};\n  --surface: var(--bg);\n  --fg: ${fg};\n  --fg-2: color-mix(in oklab, var(--fg), var(--bg) 15%);\n  --accent: ${accent};\n  --accent-on: #ffffff;\n  --accent-hover: color-mix(in oklab, var(--accent), black 8%);\n  --font-display:\n    "Fixture Sans", system-ui, sans-serif;\n  --font-body: Inter, sans-serif;\n  --font-mono: "JetBrains Mono", monospace;\n  --text-sm: 14px;\n  --text-base: 16px;\n  --text-4xl: clamp(40px, 6vw, 72px);\n  --leading-body: 1.5;\n  --radius-sm: 6px;\n  --radius-pill: 9999px;\n  --space-1: 4px;\n  --space-2: 8px;\n}\n[data-theme="dark"] { --bg: #000000; }\n`;

// A two-pack catalog in the real manifest shape: one licence shipped per pack, two systems fetched,
// one of them corrected by an overlay from the second pack. Served by an injected fetch (no network).
function fixture(t, { tamperManifest = null, competitors = false } = {}) {
  const dir = temporary(t);
  const root = path.join(dir, "vendor", "catalog");
  const shippedFiles = { "alpha/LICENSE": "Apache License\n", "beta/LICENSE": "MIT License\n" };
  const fetchedFiles = {
    "alpha/systems/coral/manifest.json": JSON.stringify({ id: "coral", name: "Coral Travel" }),
    "alpha/systems/coral/DESIGN.md": "# Design System Inspired by Coral Travel\n\n> Category: E-Commerce\n> Warm coral marketplace with photography-led cards.\n\n## Colors\n\nRausch coral is used sparingly.\n",
    "alpha/systems/coral/tokens.css": TOKENS("#2563eb", "#ffffff", "#222222"),
    "alpha/systems/night/manifest.json": JSON.stringify({ id: "night", name: "Night Terminal" }),
    "alpha/systems/night/DESIGN.md": "# Night Terminal\n\n> Category: Developer Tools\n> Keyboard-first dark console.\n",
    "alpha/systems/night/tokens.css": TOKENS("#5e6ad2", "#08090a", "#f7f8f8"),
    "beta/local/coral/tokens.override.css": "/* generated */\n:root {\n  --accent: #ff385c;\n}\n",
  };
  // Systems that compete with the bundled linear and stripe examples on name and content.
  const competing = [["stripe", "Stripe"], ["linear-app", "Linear"]];
  if (competitors) {
    for (const [id, name] of competing) {
      fetchedFiles[`alpha/systems/${id}/manifest.json`] = JSON.stringify({ id, name });
      fetchedFiles[`alpha/systems/${id}/DESIGN.md`] = `# ${name}\n\n> Category: Fintech\n> Inspired by Stripe and Linear.\n`;
      fetchedFiles[`alpha/systems/${id}/tokens.css`] = TOKENS("#635bff", "#ffffff", "#0a2540");
    }
  }
  const section = (files, rootName) => {
    const objects = Object.entries(files).map(([file, body]) => {
      const content = Buffer.from(body);
      return { path: file, mode: "100644", oid: blobId(content), size: content.length, sha256: tamperManifest === file ? "0".repeat(64) : sha256(content) };
    }).sort((left, right) => (left.path < right.path ? -1 : 1));
    const lines = objects.map((object) => `${object.path}\0${sha256(Buffer.from(files[object.path]))}\n`);
    return { root: rootName, fileCount: objects.length, byteCount: objects.reduce((sum, object) => sum + object.size, 0), treeSha256: sha256(lines.join("")), executableFiles: [], objects };
  };
  for (const [file, body] of Object.entries(shippedFiles)) {
    fs.mkdirSync(path.dirname(path.join(root, "upstream", file)), { recursive: true });
    fs.writeFileSync(path.join(root, "upstream", file), body);
  }
  const fixtureManifest = {
    schema: brand.schema,
    bundle: "brand-design-systems",
    packs: [
      { id: "alpha", repository: "https://github.com/example/alpha", revision: "a".repeat(40), gitTree: "b".repeat(40), license: "Apache-2.0" },
      { id: "beta", repository: "https://github.com/example/beta", revision: "c".repeat(40), gitTree: "d".repeat(40), license: "MIT" },
    ],
    snapshot: section(shippedFiles, "upstream"),
    fetched: section(fetchedFiles, "fetched"),
    systems: [
      { id: "coral", name: "Coral Travel", category: "E-Commerce", description: "Warm coral marketplace with photography-led cards.", pack: "alpha", dir: "alpha/systems/coral", files: ["manifest.json", "DESIGN.md", "tokens.css"], corrections: { dir: "beta/local/coral", files: ["tokens.override.css"], decision: { color: "design", type: "tokens", reason: "placeholder accent" } } },
      { id: "night", name: "Night Terminal", category: "Developer Tools", description: "Keyboard-first dark console.", pack: "alpha", dir: "alpha/systems/night", files: ["manifest.json", "DESIGN.md", "tokens.css"] },
      ...(competitors ? competing.map(([id, name]) => ({ id, name, category: "Fintech", description: `Inspired by Stripe and Linear.`, pack: "alpha", dir: `alpha/systems/${id}`, files: ["manifest.json", "DESIGN.md", "tokens.css"] })) : []),
    ],
    boundary: { mode: "reference-material", admission: "reference-only", productDesignMd: false },
  };
  fs.writeFileSync(path.join(root, "manifest.json"), JSON.stringify(fixtureManifest));
  const served = (override = {}) => {
    const requests = [];
    const fetch = async (url) => {
      requests.push(url);
      const [owner, name, revision, ...rest] = new URL(url).pathname.slice(1).split("/").map(decodeURIComponent);
      const pack = fixtureManifest.packs.find((candidate) => candidate.repository === `https://github.com/${owner}/${name}`);
      assert.ok(pack, url);
      assert.equal(revision, pack.revision);
      const file = `${pack.id}/${rest.join("/")}`;
      return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(override[file] ?? fetchedFiles[file]) };
    };
    return { fetch, requests };
  };
  const env = { DESIGN_PIPELINE_CACHE: path.join(dir, "cache") };
  return { manifestFile: path.join(root, "manifest.json"), fixtureManifest, env, served, catalog: { manifestFile: path.join(root, "manifest.json"), env } };
}

test("the packaged catalog pins both sources, ships only licences and lists every system", () => {
  assert.equal(manifest.schema, "design-pipeline.brand-design-systems-source.v1");
  assert.equal(manifest.bundle, "brand-design-systems");
  assert.deepEqual(manifest.packs.map(({ id, repository, revision, license }) => [id, repository, revision, license]), [
    ["open-design", "https://github.com/nexu-io/open-design", reviewed["open-design"].revision, "Apache-2.0"],
    ["open-design-agent-kit", "https://github.com/feimacode/open-design-agent-kit", reviewed["open-design-agent-kit"].revision, "MIT"],
  ]);
  for (const licence of manifest.licenses) assert.ok(fs.existsSync(path.join(vendorRoot, licence.path)), licence.path);
  assert.match(fs.readFileSync(path.join(vendorRoot, "upstream/open-design/LICENSE"), "utf8"), /Apache License\s+Version 2\.0/);
  assert.match(fs.readFileSync(path.join(vendorRoot, "upstream/open-design-agent-kit/LICENSE"), "utf8"), /^MIT License\n\nCopyright \(c\) 2026 Iven Xu/);

  // Only the manifest and the four licence/attribution texts are in the repository and package.
  assert.deepEqual(walk(vendorRoot), ["manifest.json", ...manifest.snapshot.objects.map((object) => `upstream/${object.path}`)].sort());
  assert.equal(manifest.snapshot.fileCount, 4);
  for (const object of manifest.snapshot.objects) {
    const content = fs.readFileSync(path.join(vendorRoot, "upstream", object.path));
    assert.equal(object.size, content.length, object.path);
    assert.equal(object.oid, blobId(content), object.path);
    assert.equal(object.sha256, sha256(content), object.path);
  }

  assert.equal(manifest.systems.length, 198);
  assert.equal(manifest.systems.filter((system) => system.pack === "open-design").length, 152);
  assert.equal(manifest.systems.filter((system) => system.pack === "open-design-agent-kit").length, 46);
  assert.equal(manifest.systems.filter((system) => system.corrections).length, 57);
  assert.equal(manifest.dedupe.skippedExports, 198);
  assert.equal(new Set(manifest.systems.map((system) => system.id)).size, 198);
  for (const system of manifest.systems) {
    assert.ok(system.files.includes("DESIGN.md") && system.files.includes("tokens.css"), system.id);
    assert.doesNotMatch(system.description, /^Bundled OpenDesign package for /, system.id);
  }
  // English only: no translation, preview or generated export is fetched.
  assert.equal(manifest.fetched.objects.filter((object) => /DESIGN-[a-z-]+\.md$|\/preview\/|\/system\/|tailwind-v4\.css$|design-tokens\.json$/.test(object.path)).length, 0);
  assert.equal(manifest.fetched.fileCount, 1144);
  assert.equal(manifest.fetched.byteCount, manifest.fetched.objects.reduce((sum, object) => sum + object.size, 0));
  assert.equal(manifest.boundary.admission, "reference-only");
  assert.equal(manifest.boundary.productDesignMd, false);
});

test("the catalog is a partial bundle fetched by id from each pack's pinned revision", async (t) => {
  assert.ok(BUNDLES.includes("brand-design-systems"));
  assert.equal(WHOLE_BUNDLES.includes("brand-design-systems"), false);
  const where = upstreamRoot(manifestFile, manifest, { env: { DESIGN_PIPELINE_CACHE: "/x/cache" } });
  assert.equal(where.root, path.join(path.resolve("/x/cache"), "vendor", "brand-design-systems", manifest.fetched.treeSha256, "fetched"));
  assert.equal(where.fetch, "designer-pipeline sources fetch --bundle brand-design-systems");

  const small = fixture(t);
  const served = small.served();
  const result = await fetchBundle("brand-design-systems", { manifestFile: small.manifestFile, fetch: served.fetch, env: small.env });
  assert.equal(result.status, "fetched");
  assert.equal(served.requests.length, 7);
  assert.ok(served.requests.some((url) => url.startsWith(`https://raw.githubusercontent.com/example/alpha/${"a".repeat(40)}/systems/coral/`)));
  assert.ok(served.requests.some((url) => url === `https://raw.githubusercontent.com/example/beta/${"c".repeat(40)}/local/coral/tokens.override.css`));
  assert.equal(brand.verifyBrandDesignSystems(small.manifestFile, { env: small.env }).status, "ready");
});

test("before a fetch, design-system search fails TOOL_MISSING naming the fetch command; examples still search", (t) => {
  const real = brand.verifyBrandDesignSystems(manifestFile, { env: { DESIGN_PIPELINE_CACHE: temporary(t) } });
  assert.equal(real.status, "missing", real.issues.join("; "));
  assert.equal(real.fetch, "designer-pipeline sources fetch --bundle brand-design-systems");

  const small = fixture(t);
  const missing = (error) => error.code === "TOOL_MISSING" && /sources fetch --bundle brand-design-systems/.test(error.message);
  assert.throws(() => searchDesignMdSource({ query: "coral", kind: "design-system", catalog: small.catalog }), missing);
  assert.throws(() => inspectDesignMdSource("design-md:design-system:coral", undefined, small.catalog), missing);
  const mixed = searchDesignMdSource({ query: "keyboard-first", limit: 2, catalog: small.catalog });
  assert.equal(mixed.results[0].id, "design-md:example:linear");
  assert.deepEqual(mixed.catalogs, [{ bundle: "brand-design-systems", status: "missing", systems: 2, fetch: "designer-pipeline sources fetch --bundle brand-design-systems" }]);

  const child = spawnSync(process.execPath, [cli, "designmd", "search", "--root", repoRoot, "--kind", "design-system", "--query", "airbnb", "--json"], {
    cwd: repoRoot, encoding: "utf8", windowsHide: true, env: { ...process.env, DESIGN_PIPELINE_CACHE: temporary(t) },
  });
  assert.equal(child.status, 1, child.stderr || child.stdout);
  const payload = JSON.parse(child.stdout);
  assert.equal(payload.error.code, "TOOL_MISSING");
  assert.match(payload.error.message, /sources fetch --bundle brand-design-systems/);
});

test("after a fetch, designmd search returns catalog systems with category, palette and a path to read", async (t) => {
  const small = fixture(t);
  await fetchBundle("brand-design-systems", { manifestFile: small.manifestFile, fetch: small.served().fetch, env: small.env });
  const result = searchDesignMdSource({ query: "warm coral marketplace", limit: 3, catalog: small.catalog });
  assert.deepEqual(result.catalogs, [{ bundle: "brand-design-systems", status: "ready", systems: 2 }]);
  const [hit] = result.results;
  assert.equal(hit.id, "design-md:design-system:coral");
  assert.equal(hit.kind, "design-system");
  assert.equal(hit.name, "Coral Travel");
  assert.equal(hit.category, "E-Commerce");
  assert.equal(hit.admission, "reference-only");
  assert.equal(hit.executableReady, false);
  assert.equal(hit.source, "https://github.com/example/alpha");
  // The correction overlay wins over the placeholder accent.
  assert.equal(hit.palette.primary, "#ff385c");
  assert.equal(hit.palette.signature, "light · primary #ff385c · background #ffffff · text #222222");
  assert.match(fs.readFileSync(hit.contentPath, "utf8"), /^# Design System Inspired by Coral Travel/);
  assert.ok(fs.existsSync(hit.files["corrections/tokens.override.css"]));

  const narrowed = searchDesignMdSource({ query: "dark console", kind: "design-system", catalog: small.catalog });
  assert.equal(narrowed.results[0].id, "design-md:design-system:night");
  assert.equal(narrowed.results[0].palette.mode, "dark");
  assert.ok(narrowed.results.every((entry) => entry.kind === "design-system"));
  assert.ok(searchDesignMdSource({ query: "keyboard-first", kind: "example", catalog: small.catalog }).results.every((entry) => entry.kind === "example"));
  assert.throws(() => searchDesignMdSource({ query: "x", kind: "template" }), /unknown kind template/);

  const inspected = inspectDesignMdSource("design-md:design-system:coral", undefined, small.catalog);
  assert.equal(inspected.admission, "reference-only");
  assert.match(inspected.frontMatter, /^---\n# inspiration-only: Coral Travel from https:\/\/github\.com\/example\/alpha, not a product DESIGN\.md\nversion: alpha\nname: "Coral Travel"\n/);
  assert.equal(inspected.entry.instruction, brand.INSTRUCTION);
  assert.match(inspected.frontMatter, /\n {2}primary: "#ff385c"\n/);
  assert.match(inspected.instruction, /never install it, or its front matter, as the product's DESIGN\.md/);
  assert.throws(() => inspectDesignMdSource("design-md:design-system:absent", undefined, small.catalog), (error) => error.code === "ENTRY_NOT_FOUND");
});

test("examples and systems share one ranking; ties and an empty query put the examples first", async (t) => {
  const small = fixture(t, { competitors: true });
  await fetchBundle("brand-design-systems", { manifestFile: small.manifestFile, fetch: small.served().fetch, env: small.env });
  const ids = (query, limit = 20) => searchDesignMdSource({ query, limit, catalog: small.catalog }).results.map((entry) => entry.id);
  assert.deepEqual(ids("linear").slice(0, 2), ["design-md:example:linear", "design-md:design-system:linear-app"]);
  assert.deepEqual(ids("stripe").slice(0, 2), ["design-md:example:stripe", "design-md:design-system:stripe"]);
  const empty = ids("", 6);
  assert.deepEqual(empty.slice(0, 4), ["design-md:example:linear", "design-md:example:minimal-saas", "design-md:example:stripe", "design-md:example:vercel"]);
  assert.equal(empty.length, 6);
  // Every entry, example or system, carries the inspiration-only instruction.
  for (const entry of searchDesignMdSource({ query: "", catalog: small.catalog }).results) assert.match(entry.instruction, /^Inspiration-only: .*never install it/, entry.id);
});

test("a tampered cache or manifest is refused", async (t) => {
  const small = fixture(t);
  const fetched = await fetchBundle("brand-design-systems", { manifestFile: small.manifestFile, fetch: small.served().fetch, env: small.env });
  fs.appendFileSync(path.join(fetched.root, "alpha/systems/night/DESIGN.md"), "injected\n");
  const verification = brand.verifyBrandDesignSystems(small.manifestFile, { env: small.env });
  assert.equal(verification.status, "blocked");
  assert.match(verification.issues.join("\n"), /fetched: size mismatch alpha\/systems\/night\/DESIGN\.md/);
  const refused = (error) => error.code === "SOURCE_CHANGED" && /remove .* and run designer-pipeline sources fetch --bundle brand-design-systems/.test(error.message);
  assert.throws(() => searchDesignMdSource({ query: "coral", kind: "design-system", catalog: small.catalog }), refused);
  assert.throws(() => inspectDesignMdSource("design-md:design-system:coral", undefined, small.catalog), refused);
  // Without --kind the examples still search and the catalog is reported blocked with its fix.
  const degraded = searchDesignMdSource({ query: "keyboard-first", catalog: small.catalog });
  assert.equal(degraded.results[0].id, "design-md:example:linear");
  assert.ok(degraded.results.every((entry) => entry.kind === "example"));
  assert.equal(degraded.catalogs.length, 1);
  assert.equal(degraded.catalogs[0].status, "blocked");
  assert.match(degraded.catalogs[0].issues.join("\n"), /alpha\/systems\/night\/DESIGN\.md/);
  assert.match(degraded.catalogs[0].fix, /^remove .* and run designer-pipeline sources fetch --bundle brand-design-systems$/);

  // A manifest whose recorded SHA-256 differs from the served bytes installs nothing.
  const wrong = fixture(t, { tamperManifest: "alpha/systems/coral/tokens.css" });
  await assert.rejects(fetchBundle("brand-design-systems", { manifestFile: wrong.manifestFile, fetch: wrong.served().fetch, env: wrong.env }), (error) => error.code === "SOURCE_CHANGED" && /SHA-256/.test(error.message));
  assert.deepEqual(fs.readdirSync(path.join(wrong.env.DESIGN_PIPELINE_CACHE, "vendor", "brand-design-systems")), []);
  // A served file that differs from the manifest installs nothing either.
  const other = fixture(t);
  await assert.rejects(fetchBundle("brand-design-systems", { manifestFile: other.manifestFile, fetch: other.served({ "beta/local/coral/tokens.override.css": ":root { --accent: #000000; }\n" }).fetch, env: other.env }), (error) => error.code === "SOURCE_CHANGED");

  // A shipped licence that changes blocks verification; a manifest that points outside the
  // inventory, or claims a product DESIGN.md, does not load.
  const copy = path.join(temporary(t), "vendor", "copy");
  fs.cpSync(vendorRoot, copy, { recursive: true });
  fs.appendFileSync(path.join(copy, "upstream/open-design/LICENSE"), "x");
  const changed = brand.verifyBrandDesignSystems(path.join(copy, "manifest.json"), { env: small.env });
  assert.equal(changed.status, "blocked");
  assert.match(changed.issues.join("\n"), /shipped: size mismatch open-design\/LICENSE/);
  for (const mutate of [
    (value) => { value.systems[0].files.push("components.html"); },
    (value) => { value.systems[0].dir = "alpha/../../etc"; },
    (value) => { value.boundary.productDesignMd = true; },
  ]) {
    const value = JSON.parse(JSON.stringify(small.fixtureManifest));
    mutate(value);
    fs.writeFileSync(small.manifestFile, JSON.stringify(value));
    assert.equal(brand.verifyBrandDesignSystems(small.manifestFile, { env: small.env }).status, "blocked");
  }
});

test("tokens.css normalises to Google DESIGN.md token groups, overlay first, deterministically", () => {
  const css = TOKENS("#2563eb", "#ffffff", "#222222");
  const first = brand.normalizeTokens(css, ":root { --accent: rgb(255, 56, 92); --radius-sm: 0; }");
  assert.deepEqual(first, brand.normalizeTokens(css, ":root { --accent: rgb(255, 56, 92); --radius-sm: 0; }"));
  assert.equal(first.colors.primary, "#ff385c");
  assert.equal(first.colors.background, "#ffffff");
  assert.equal(first.colors.surface, "#ffffff");
  assert.equal(first.colors["on-surface-variant"], brand.hexColor("color-mix(in oklab, #222222 85%, #ffffff)"));
  assert.match(first.colors["primary-hover"], /^#[0-9a-f]{6}$/);
  assert.deepEqual(first.typography.body, { fontFamily: "Inter", fontSize: "16px", lineHeight: "1.5" });
  assert.equal(first.typography.code.fontFamily, "JetBrains Mono");
  assert.equal(first.typography.display, undefined, "clamp() sizes are not plain dimensions");
  assert.ok(first.omitted.includes("--text-4xl"));
  assert.deepEqual(first.rounded, { sm: "0px", full: "9999px" });
  assert.deepEqual(first.spacing, { "space-1": "4px", "space-2": "8px" });
  // The dark-theme block after :root is not read.
  assert.equal(brand.rootDeclarations(css).get("bg"), "#ffffff");
  assert.equal(brand.hexColor("oklch(62.8% 0.2577 29.23)"), "#ff0000");
  assert.equal(brand.hexColor("rgba(0, 0, 0, 0.5)"), "#00000080");
  assert.equal(brand.hexColor("color-mix(in srgb, #000000, #ffffff)"), "#808080");
  assert.equal(brand.hexColor("hsl(0 100% 50%)"), null);
  // Percentages under 100% make a translucent mix: omitted, not a wrong opaque colour.
  assert.equal(brand.hexColor("color-mix(in oklab, #ff0000 30%, #0000ff 30%)"), null);
  assert.equal(brand.hexColor("color-mix(in srgb, #000000 60%, #ffffff 60%)"), "#808080");
  const mixed = brand.normalizeTokens(":root {\n  --accent: color-mix(in oklab, #ff0000 20%, #ffffff 20%);\n  --bg: var(--paper, #fafafa);\n  --fg: var(--ink, var(--also-missing, rgb(10, 20, 30)));\n  --surface: var(--bg, #000000);\n}\n");
  assert.equal(mixed.colors.primary, undefined);
  assert.ok(mixed.omitted.includes("--accent"));
  assert.equal(mixed.colors.background, "#fafafa", "an undefined var() uses its fallback");
  assert.equal(mixed.colors["on-surface"], "#0a141e", "nested fallbacks resolve");
  assert.equal(mixed.colors.surface, "#fafafa", "a defined var() wins over its fallback");
  const yaml = brand.frontMatter({ name: "X", description: "Y" }, first);
  assert.match(yaml, /^---\n# inspiration-only: X, not a product DESIGN\.md\nversion: alpha\nname: "X"\ndescription: "Y"\ncolors:\n {2}primary: "#ff385c"\n/);
  assert.match(yaml, /\ntypography:\n {2}body:\n/);
  assert.match(yaml, /\nrounded:\n {2}sm: 0px\n {2}full: 9999px\nspacing:\n {2}space-1: 4px\n/);
  assert.match(yaml, /\n---\n$/);
});

// Two small Git repositories with the upstream layouts, for the importer.
function sourceRepositories(t) {
  const dir = temporary(t);
  const run = (cwd, args) => { const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
  const repo = (name, files) => {
    const root = path.join(dir, name);
    for (const [file, body] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), body);
    }
    run(root, ["init", "--quiet"]);
    run(root, ["add", "."]);
    run(root, ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
    return { root, revision: run(root, ["rev-parse", "HEAD"]), gitTree: run(root, ["rev-parse", "HEAD^{tree}"]) };
  };
  const system = (id, name, extra = {}) => ({
    [`design-systems/${id}/manifest.json`]: JSON.stringify({ id, name, category: "Test", description: `Bundled OpenDesign package for ${name}, derived from fixtures.`, source: { origin: "fixture" } }),
    [`design-systems/${id}/DESIGN.md`]: `# ${name}\n\n> Category: Test\n> ${name} tagline.\n`,
    [`design-systems/${id}/tokens.css`]: TOKENS("#123456", "#ffffff", "#000000"),
    [`design-systems/${id}/DESIGN-fr.md`]: "# traduit\n",
    ...extra,
  });
  const od = repo("od", {
    LICENSE: `${reviewed["open-design"].licenseStart}\n`,
    "design-systems/README.md": "# Design Systems\n",
    "design-systems/_schema/defaults.css": ":root {}\n",
    ...system("beta", "Beta"),
    ...system("alpha", "Alpha", { "design-systems/alpha/components.html": "<p>x</p>\n" }),
  });
  const local = "packages/content/local";
  const kit = repo("kit", {
    LICENSE: `MIT License\n\n${reviewed["open-design-agent-kit"].copyright}\n`,
    [`${local}/notices/LICENSE-awesome-ios-design-md.txt`]: "MIT License\n",
    [`${local}/design-system-sources.json`]: JSON.stringify({ beta: { color: "design", type: "tokens", reason: "placeholder" } }),
    [`${local}/design-systems/beta/tokens.override.css`]: ":root { --accent: #ff0000; }\n",
    [`${local}/design-systems/gamma-ios/manifest.json`]: JSON.stringify({ id: "gamma-ios", name: "Gamma (iOS)", category: "Mobile Apps", description: "Gamma app.", source: { origin: "Adapted" } }),
    [`${local}/design-systems/gamma-ios/DESIGN.md`]: "# Gamma\n",
    [`${local}/design-systems/gamma-ios/tokens.css`]: TOKENS("#00ff00", "#000000", "#ffffff"),
    "claude-design-systems/alpha/project/tokens.json": "{}\n",
  });
  const pins = {
    "open-design": { ...reviewed["open-design"], revision: od.revision, gitTree: od.gitTree, systems: 2 },
    "open-design-agent-kit": { ...reviewed["open-design-agent-kit"], revision: kit.revision, gitTree: kit.gitTree, systems: 1, corrections: 1 },
  };
  return { od, kit, pins, dir };
}

test("the importer is deterministic and records sources, corrections and the skipped exports", (t) => {
  const { od, kit, pins } = sourceRepositories(t);
  const first = build(od.root, kit.root, "2026-11-04", pins);
  const second = build(od.root, kit.root, "2026-11-04", pins);
  assert.equal(serialize(first.manifest), serialize(second.manifest));
  const { manifest: built } = first;
  assert.deepEqual(built.systems.map((system) => [system.id, system.pack]), [["alpha", "open-design"], ["beta", "open-design"], ["gamma-ios", "open-design-agent-kit"]]);
  assert.equal(built.systems[0].description, "Alpha tagline.");
  assert.deepEqual(built.systems[0].files, ["manifest.json", "DESIGN.md", "tokens.css", "components.html"]);
  assert.deepEqual(built.systems[1].corrections, { dir: "open-design-agent-kit/packages/content/local/design-systems/beta", files: ["tokens.override.css"], decision: { color: "design", type: "tokens", reason: "placeholder" } });
  assert.equal(built.dedupe.skippedExports, 1);
  assert.deepEqual(built.snapshot.objects.map((object) => object.path), ["open-design-agent-kit/LICENSE", "open-design-agent-kit/packages/content/local/notices/LICENSE-awesome-ios-design-md.txt", "open-design/LICENSE", "open-design/design-systems/README.md"]);
  assert.equal(built.fetched.objects.some((object) => /DESIGN-fr\.md|_schema/.test(object.path)), false);
  assert.deepEqual(built.fetched.objects.map((object) => object.path), [...built.fetched.objects.map((object) => object.path)].sort());
  // One object and one system per line.
  const text = serialize(built);
  assert.deepEqual(JSON.parse(text), built);
  assert.ok(text.split("\n").some((line) => line.trim().startsWith('{"path":"open-design/design-systems/alpha/DESIGN.md"')));

  // An overlay without an open-design system, or an export without a chosen system, fails the import.
  fs.mkdirSync(path.join(kit.root, "claude-design-systems/zeta/project"), { recursive: true });
  fs.writeFileSync(path.join(kit.root, "claude-design-systems/zeta/project/tokens.json"), "{}\n");
  spawnSync("git", ["add", "."], { cwd: kit.root });
  spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "zeta"], { cwd: kit.root });
  const moved = spawnSync("git", ["rev-parse", "HEAD", "HEAD^{tree}"], { cwd: kit.root, encoding: "utf8" }).stdout.trim().split("\n");
  const pinsMoved = { ...pins, "open-design-agent-kit": { ...pins["open-design-agent-kit"], revision: moved[0], gitTree: moved[1] } };
  assert.throws(() => build(od.root, kit.root, "2026-11-04", pinsMoved), /claude-design-systems\/zeta has no chosen system/);
});

test("the command-line importer needs both reviewed checkouts, clean, and a valid date", (t) => {
  const { od, kit, dir } = sourceRepositories(t);
  const importer = path.join(repoRoot, "scripts/import-brand-design-systems.cjs");
  const before = fs.readFileSync(manifestFile, "utf8");
  const run = (args) => spawnSync(process.execPath, [importer, ...args], { cwd: dir, encoding: "utf8", windowsHide: true });
  const rejects = (pattern, args) => {
    const result = run(args);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, pattern);
    assert.equal(fs.readFileSync(manifestFile, "utf8"), before);
  };
  rejects(/open-design: source revision must be the reviewed 5a0c4777/, ["--open-design", od.root, "--agent-kit", kit.root, "--reviewed-at", "2026-11-04"]);
  rejects(/valid YYYY-MM-DD/, ["--open-design", od.root, "--agent-kit", kit.root, "--reviewed-at", "2026-02-30"]);
  rejects(/--open-design and --agent-kit are required/, ["--open-design", od.root, "--reviewed-at", "2026-11-04"]);
  fs.appendFileSync(path.join(od.root, "design-systems/README.md"), "dirty\n");
  rejects(/tracked working-tree changes/, ["--open-design", od.root, "--agent-kit", kit.root, "--reviewed-at", "2026-11-04"]);
});

test("doctor lists the catalog download without blocking; guides route to it through search", (t) => {
  const child = spawnSync(process.execPath, [cli, "doctor", "--json"], {
    cwd: repoRoot, encoding: "utf8", windowsHide: true, env: { ...process.env, DESIGN_PIPELINE_CACHE: temporary(t) },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const doctor = JSON.parse(child.stdout);
  assert.equal(doctor.brandDesignSystems.status, "missing");
  assert.ok(doctor.downloads.some((item) => item.bundle === "brand-design-systems" && item.fetch.endsWith("sources fetch --bundle brand-design-systems")));
  assert.equal(doctor.missing.length, 0);

  const guide = fs.readFileSync(path.join(repoRoot, "skill/references/design-md.md"), "utf8");
  assert.match(guide, /sources fetch --bundle brand-design-systems/);
  assert.match(guide, /--kind design-system/);
  assert.match(fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8"), /brand design systems/i);
  const notices = fs.readFileSync(path.join(repoRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  for (const pack of manifest.packs) {
    assert.ok(notices.includes(pack.repository), pack.repository);
    assert.ok(notices.includes(pack.revision), pack.revision);
  }
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["sources:import:brand-design-systems"], "node scripts/import-brand-design-systems.cjs");
  assert.equal(packageJson.scripts["sources:check"], "node scripts/sources-check.cjs");
  assert.match(fs.readFileSync(path.join(repoRoot, "scripts/sources-check.cjs"), "utf8"), /"brand-design-systems\.test\.cjs"/);
});

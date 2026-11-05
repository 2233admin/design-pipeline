"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { BUNDLE_KINDS, checkAgreement, pinsIn, readLock, validateLock } = require("../scripts/sources-lock.cjs");
const { hexReplacer } = require("../scripts/sources-update.cjs");
const { upstreamStatus } = require("../scripts/sources-check.cjs");

const repoRoot = path.resolve(__dirname, "..");

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(result.error, undefined, result.error?.message);
  return result;
}

function git(cwd, args) {
  const result = run("git", ["-c", "user.name=Lock Test", "-c", "user.email=lock-test@example.invalid", "-c", "commit.gpgsign=false", ...args], cwd);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("the lock agrees with every derived pin, manifest and notice", () => {
  const lock = readLock(repoRoot);
  assert.deepEqual(validateLock(lock), []);
  assert.deepEqual(checkAgreement(repoRoot, lock), []);
});

test("every vendored bundle is locked, and every locked bundle is vendored", () => {
  const lock = readLock(repoRoot);
  const vendor = path.join(repoRoot, "skill/vendor");
  const bundles = fs.readdirSync(vendor, { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(vendor, entry.name, "manifest.json"))).map((entry) => entry.name).sort();
  const locked = [...new Set(lock.sources.filter((entry) => BUNDLE_KINDS.has(entry.kind)).map((entry) => entry.bundle))].sort();
  assert.deepEqual(locked, bundles);
  for (const entry of lock.sources.filter((item) => BUNDLE_KINDS.has(item.kind))) {
    assert.ok(fs.existsSync(path.join(repoRoot, entry.importer[0])), `${entry.id} importer ${entry.importer[0]}`);
  }
});

test("held sources name their follow-up issue, and the one importer that still pins a revision agrees", () => {
  const lock = readLock(repoRoot);
  for (const entry of lock.sources.filter((item) => item.held)) {
    assert.match(entry.held.issue, /^https:\/\/github\.com\/2233admin\/design-pipeline\/issues\/\d+$/, entry.id);
    assert.ok(entry.held.reason.length > 40, entry.id);
  }
  // The answer-me-with-html runtime build pins its importer's bytes, so the importer keeps the constant.
  assert.equal(require("../scripts/import-answer-me-with-html.cjs").REVISION, lock.sources.find((entry) => entry.id === "answer-me-with-html").revision);
});

test("pins are read from links, JSON revision fields and frontmatter", () => {
  const sha = "a".repeat(40);
  assert.deepEqual(pinsIn("x.md", `see https://github.com/Acme/Widgets/blob/${sha}/docs/a%20b.md#top`).map(({ repo, revision, path: file }) => [repo, revision, file]), [["acme/widgets", sha, "docs/a b.md"]]);
  assert.deepEqual(pinsIn("x.json", JSON.stringify({ tools: [{ source: "https://github.com/acme/widgets", revision: sha }] })).map((pin) => pin.via), ["json $.tools[0].revision"]);
  assert.deepEqual(pinsIn("x.md", `---\nsourceMeta:\n  url: https://github.com/acme/widgets\n  reviewedRevision: ${sha}\n---\n`).map((pin) => pin.via), ["frontmatter reviewedRevision"]);
  const replace = hexReplacer(new Map([[sha, "b".repeat(40)], ["aaaaaaa", "bbbbbbb"]]));
  assert.equal(replace(`${sha} \`aaaaaaa\` aaaaaaab ${"c".repeat(40)}`), `${"b".repeat(40)} \`bbbbbbb\` aaaaaaab ${"c".repeat(40)}`);
});

// A fixture design-pipeline checkout with one vendored bundle "widgets" from https://github.com/acme/widgets,
// served from a file:// remote. The importer is a small stand-in for scripts/import-*.cjs.
const FIXTURE_IMPORTER = `"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { canonicalTree, copyTrackedFiles, inspectCheckout } = require("./git-tree-snapshot.cjs");
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => (index % 2 ? pairs : [...pairs, [item.slice(2), all[index + 1]]]), []));
const checkout = inspectCheckout(args.source);
if (!checkout.blobs.has("README.md")) { process.stderr.write("FAIL upstream no longer provides README.md\\n"); process.exit(1); }
const destination = path.resolve(__dirname, "../skill/vendor/widgets");
fs.rmSync(destination, { recursive: true, force: true });
copyTrackedFiles(path.join(destination, "upstream"), checkout.indexEntries, checkout.blobs);
const files = checkout.indexEntries.map((entry) => entry.path);
const manifest = { schema: "fixture.v1", source: { repository: "https://github.com/acme/widgets", revision: checkout.revision, gitTree: checkout.gitTree, committedAt: checkout.committedAt, reviewedAt: args["reviewed-at"] }, snapshot: { root: "upstream", fileCount: files.length, treeSha256: canonicalTree(path.join(destination, "upstream"), files), objects: checkout.indexEntries.map(({ path: file, oid, size, mode }) => ({ path: file, mode, oid, size })) } };
fs.writeFileSync(path.join(destination, "manifest.json"), JSON.stringify(manifest, null, 2) + "\\n");
process.stdout.write(JSON.stringify({ status: "imported", revision: checkout.revision }) + "\\n");
`;

function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-sources-lock-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const upstream = path.join(base, "remote/acme/widgets");
  fs.mkdirSync(path.join(upstream, "docs"), { recursive: true });
  git(upstream, ["init", "--quiet", "--initial-branch=main"]);
  git(upstream, ["config", "uploadpack.allowAnySHA1InWant", "true"]);
  git(upstream, ["config", "uploadpack.allowFilter", "true"]);
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(upstream, file)), { recursive: true }); fs.writeFileSync(path.join(upstream, file), text); };
  write("LICENSE", "MIT License\n\nCopyright (c) 2026 Acme\n");
  write("README.md", "# widgets\n");
  write("docs/a.md", "first\n");
  write("docs/b.md", "cited by vendored path\n");
  const commit = (message, date) => {
    git(upstream, ["add", "--all"]);
    const result = run("git", ["-c", "user.name=Acme", "-c", "user.email=acme@example.invalid", "commit", "--quiet", "-m", message], upstream, { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
    assert.equal(result.status, 0, result.stderr);
    return git(upstream, ["rev-parse", "HEAD"]);
  };
  const first = commit("first", "2026-10-01T00:00:00Z");

  const root = path.join(base, "checkout");
  for (const file of ["scripts/sources-lock.cjs", "scripts/sources-update.cjs", "scripts/git-tree-snapshot.cjs", "skill/scripts/upstream-path.cjs"]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, file), path.join(root, file));
  }
  fs.writeFileSync(path.join(root, "scripts/import-widgets.cjs"), FIXTURE_IMPORTER);
  const imported = run(process.execPath, [path.join(root, "scripts/import-widgets.cjs"), "--source", upstream, "--reviewed-at", "2026-10-02"], root);
  assert.equal(imported.status, 0, imported.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "skill/vendor/widgets/manifest.json"), "utf8"));
  const files = {
    "THIRD_PARTY_NOTICES.md": `## widgets\n\nVendored at \`${first}\` (reviewed 2026-10-02).\n`,
    "skill/references/widgets.md": `Read [a](https://github.com/acme/widgets/blob/${first}/docs/a.md) and ../vendor/widgets/upstream/docs/b.md; license at https://github.com/acme/widgets/blob/${first}/LICENSE.\n`,
    "skill/references/package-resources.json": `${JSON.stringify({ required: ["references/widgets.md", "vendor/widgets/manifest.json", "vendor/widgets/upstream/docs/a.md", "vendor/widgets/upstream/docs/b.md", "vendor/widgets/upstream/LICENSE", "vendor/widgets/upstream/README.md"] }, null, 2)}\n`,
    "sources.lock.json": `${JSON.stringify({
      schema: "design-pipeline.sources-lock.v1",
      policy: "track-upstream-head",
      sources: [{ id: "widgets", kind: "vendored", repo: "https://github.com/acme/widgets", revision: first, committedAt: "2026-10-01T00:00:00Z", reviewedAt: "2026-10-02", bundle: "widgets", importer: ["scripts/import-widgets.cjs", "--source", "{source}"], treeSha256: manifest.snapshot.treeSha256 }],
    }, null, 2)}\n`,
  };
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  git(root, ["init", "--quiet"]);
  git(root, ["add", "--all"]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  assert.deepEqual(checkAgreement(root), []);
  const update = (extra = []) => run(process.execPath, [path.join(root, "scripts/sources-update.cjs"), "--root", root, "--today", "2026-11-04", "--no-npm-install", ...extra], root, { SOURCES_REMOTE_BASE: `file://${path.join(base, "remote")}` });
  return { root, upstream, first, write, commit, update, read: (file) => fs.readFileSync(path.join(root, file), "utf8") };
}

test("sources:update moves a vendored bundle, its lock entry and every derived pin to upstream HEAD", (t) => {
  const site = fixture(t);
  site.write("docs/a.md", "second\n");
  site.write("docs/c.md", "new file\n");
  const second = site.commit("second", "2026-11-01T00:00:00Z");
  const result = site.update();
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.bumped.filter((item) => item.id).map(({ id, from, to }) => [id, from, to]), [["widgets", site.first, second]]);
  const lock = JSON.parse(site.read("sources.lock.json")).sources[0];
  const manifest = JSON.parse(site.read("skill/vendor/widgets/manifest.json"));
  assert.equal(lock.revision, second);
  assert.equal(lock.committedAt, "2026-11-01T00:00:00+00:00");
  assert.equal(lock.reviewedAt, "2026-11-04");
  assert.equal(lock.treeSha256, manifest.snapshot.treeSha256);
  assert.equal(manifest.source.revision, second);
  assert.equal(manifest.source.reviewedAt, "2026-11-04");
  assert.match(site.read("skill/references/widgets.md"), new RegExp(`blob/${second}/docs/a\\.md`));
  assert.doesNotMatch(site.read("skill/references/widgets.md"), new RegExp(site.first));
  assert.equal(site.read("THIRD_PARTY_NOTICES.md"), `## widgets\n\nVendored at \`${second}\` (reviewed 2026-11-04).\n`);
  // The exhaustive per-file resource listing follows the new file set.
  assert.ok(JSON.parse(site.read("skill/references/package-resources.json")).required.includes("vendor/widgets/upstream/docs/c.md"));
  assert.deepEqual(checkAgreement(site.root), []);

  // Deterministic: the same upstream state imported again gives the same bytes.
  const again = fixture(t);
  fs.rmSync(again.upstream, { recursive: true, force: true });
  fs.cpSync(site.upstream, again.upstream, { recursive: true });
  const rerun = again.update();
  assert.equal(rerun.status, 0, rerun.stderr);
  for (const file of ["sources.lock.json", "skill/vendor/widgets/manifest.json", "skill/references/widgets.md", "skill/references/package-resources.json"]) {
    assert.equal(again.read(file).replaceAll(again.first, "FIRST"), site.read(file).replaceAll(site.first, "FIRST"), file);
  }

  // A second run with nothing new writes nothing, not even a review date.
  git(site.root, ["add", "--all"]);
  git(site.root, ["commit", "--quiet", "-m", "bumped"]);
  const quiet = run(process.execPath, [path.join(site.root, "scripts/sources-update.cjs"), "--root", site.root, "--today", "2026-12-24", "--no-npm-install"], site.root, { SOURCES_REMOTE_BASE: `file://${path.join(path.dirname(site.upstream), "..")}` });
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.deepEqual(JSON.parse(quiet.stdout).current.map((item) => item.id), ["widgets"]);
  assert.equal(git(site.root, ["status", "--porcelain"]), "");
});

test("an upstream that removes a file we cite fails loudly and leaves the bundle and lock as they were", (t) => {
  const site = fixture(t);
  const before = { lock: site.read("sources.lock.json"), manifest: site.read("skill/vendor/widgets/manifest.json"), guide: site.read("skill/references/widgets.md") };
  fs.rmSync(path.join(site.upstream, "docs/a.md"));
  site.commit("drop a", "2026-11-01T00:00:00Z");
  const linked = site.update();
  assert.equal(linked.status, 1);
  assert.match(linked.stderr, /FAIL widgets: .*skill\/references\/widgets\.md cites docs\/a\.md, which [0-9a-f]{12} no longer has/);
  assert.deepEqual({ lock: site.read("sources.lock.json"), manifest: site.read("skill/vendor/widgets/manifest.json"), guide: site.read("skill/references/widgets.md") }, before);

  // A file cited only by its vendored path: the import runs, sees the removal and restores the bundle.
  site.write("docs/a.md", "first\n");
  fs.rmSync(path.join(site.upstream, "docs/b.md"));
  site.commit("drop b", "2026-11-02T00:00:00Z");
  const vendored = site.update();
  assert.equal(vendored.status, 1);
  assert.match(vendored.stderr, /upstream removed or moved files we cite: vendor\/widgets\/upstream\/docs\/b\.md \(cited by skill\/references\/widgets\.md\)/);
  assert.deepEqual({ lock: site.read("sources.lock.json"), manifest: site.read("skill/vendor/widgets/manifest.json"), guide: site.read("skill/references/widgets.md") }, before);
  assert.ok(fs.existsSync(path.join(site.root, "skill/vendor/widgets/upstream/docs/b.md")));

  // A changed license text we cite is a review, not a silent bump.
  site.write("docs/b.md", "cited by vendored path\n");
  site.write("LICENSE", "Proprietary\n");
  site.commit("relicense", "2026-11-03T00:00:00Z");
  const relicensed = site.update();
  assert.equal(relicensed.status, 1);
  assert.match(relicensed.stderr, /LICENSE changed between [0-9a-f]{12} and [0-9a-f]{12}/);
  assert.equal(site.read("sources.lock.json"), before.lock);
});

test("an uncited root license file that changes, appears or disappears stops the source", (t) => {
  const site = fixture(t);
  const lock = site.read("sources.lock.json");
  site.write("NOTICE", "Third-party notices\n");
  site.write("docs/a.md", "second\n");
  site.commit("add notice", "2026-11-01T00:00:00Z");
  const added = site.update();
  assert.equal(added.status, 1);
  assert.match(added.stderr, /root license files differ between [0-9a-f]{12} and [0-9a-f]{12} \(NOTICE added\)/);
  assert.equal(site.read("sources.lock.json"), lock);
  assert.doesNotMatch(site.read("skill/references/widgets.md"), /NOTICE/, "the notice is not cited anywhere");
});

// An npm source whose bundled data is derived from the release: the importer reads the release
// tarball named by {pack:<package>} (SOURCES_NPM_PACKS stands in for `npm pack --ignore-scripts`).
const NPM_IMPORTER = `"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, item, index, all) => (index % 2 ? pairs : [...pairs, [item.slice(2), all[index + 1]]]), []));
const bytes = fs.readFileSync(args.pack);
if (bytes.toString("utf8").startsWith("broken")) { process.stderr.write("tarball has no docs\\n"); process.exit(1); }
const text = bytes.toString("utf8").trim();
// "stale:<sha>" writes another revision; "noversion" drops the version site.
const [version, revision] = text.startsWith("stale:") ? ["1.1.0", text.slice(6)] : [text, args.revision];
const out = { url: "https://github.com/acme/gadgets", revision, ...(text === "noversion" ? {} : { version }), sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
fs.writeFileSync(path.resolve(__dirname, "../skill/references/gadgets.json"), JSON.stringify(out, null, 2) + "\\n");
process.stdout.write("gadgets " + version + "\\n");
`;

function npmFixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-sources-npm-"));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const upstream = path.join(base, "remote/acme/gadgets");
  fs.mkdirSync(upstream, { recursive: true });
  git(upstream, ["init", "--quiet", "--initial-branch=main"]);
  git(upstream, ["config", "uploadpack.allowAnySHA1InWant", "true"]);
  git(upstream, ["config", "uploadpack.allowFilter", "true"]);
  const release = (version, date) => {
    fs.writeFileSync(path.join(upstream, "LICENSE"), "MIT License\n\nCopyright (c) 2026 Acme\n");
    fs.writeFileSync(path.join(upstream, "VERSION"), `${version}\n`);
    git(upstream, ["add", "--all"]);
    const result = run("git", ["-c", "user.name=Acme", "-c", "user.email=acme@example.invalid", "commit", "--quiet", "-m", version], upstream, { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date });
    assert.equal(result.status, 0, result.stderr);
    git(upstream, ["tag", `v${version}`]);
    const tarball = path.join(base, `gadgets-${version}.tgz`);
    fs.writeFileSync(tarball, `${version}\n`);
    return { revision: git(upstream, ["rev-parse", "HEAD"]), tarball };
  };
  const first = release("1.0.0", "2026-10-01T00:00:00Z");
  const root = path.join(base, "checkout");
  for (const file of ["scripts/sources-lock.cjs", "scripts/sources-update.cjs", "scripts/git-tree-snapshot.cjs", "skill/scripts/upstream-path.cjs"]) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, file), path.join(root, file));
  }
  fs.writeFileSync(path.join(root, "scripts/generate-gadgets.cjs"), NPM_IMPORTER);
  fs.writeFileSync(path.join(root, "THIRD_PARTY_NOTICES.md"), "## gadgets\n\nRelease data from @acme/gadgets.\n");
  fs.mkdirSync(path.join(root, "skill/references"), { recursive: true });
  const imported = run(process.execPath, [path.join(root, "scripts/generate-gadgets.cjs"), "--pack", first.tarball, "--revision", first.revision], root);
  assert.equal(imported.status, 0, imported.stderr);
  fs.writeFileSync(path.join(root, "sources.lock.json"), `${JSON.stringify({
    schema: "design-pipeline.sources-lock.v1",
    policy: "track-upstream-head",
    sources: [{ id: "gadgets", kind: "npm", package: "@acme/gadgets", version: "1.0.0", reviewedAt: "2026-10-02", repo: "https://github.com/acme/gadgets", revision: first.revision, committedAt: "2026-10-01T00:00:00+00:00", tag: "v{version}", sites: [{ file: "skill/references/gadgets.json", json: "version" }], importer: ["scripts/generate-gadgets.cjs", "--pack", "{pack:@acme/gadgets}", "--revision", "{revision}"] }],
  }, null, 2)}\n`);
  git(root, ["init", "--quiet"]);
  git(root, ["add", "--all"]);
  git(root, ["commit", "--quiet", "-m", "fixture"]);
  assert.deepEqual(checkAgreement(root), []);
  const update = (packs) => run(process.execPath, [path.join(root, "scripts/sources-update.cjs"), "--root", root, "--today", "2026-11-04", "--no-npm-install"], root, {
    SOURCES_REMOTE_BASE: `file://${path.join(base, "remote")}`,
    SOURCES_NPM_VERSIONS: JSON.stringify({ "@acme/gadgets": "1.1.0" }),
    SOURCES_NPM_PACKS: JSON.stringify(packs),
  });
  return { root, first, release, update, read: (file) => fs.readFileSync(path.join(root, file), "utf8") };
}

test("sources:update regenerates an npm source's derived data from the release tarball", (t) => {
  const site = npmFixture(t);
  const next = site.release("1.1.0", "2026-11-01T00:00:00Z");
  const result = site.update({ "@acme/gadgets@1.1.0": next.tarball });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout).bumped.map(({ id, source, importer, to }) => [id || source, importer || to]), [["gadgets", "gadgets 1.1.0"], ["gadgets", "1.1.0"]]);
  assert.deepEqual(JSON.parse(result.stdout).bumped.filter((item) => item.id).map(({ from, to }) => [from, to]), [["1.0.0", "1.1.0"]], "one from/to row per source in the pull request table");
  const data = JSON.parse(site.read("skill/references/gadgets.json"));
  assert.equal(data.version, "1.1.0");
  assert.equal(data.revision, next.revision);
  const lock = JSON.parse(site.read("sources.lock.json")).sources[0];
  assert.deepEqual([lock.version, lock.revision, lock.committedAt, lock.reviewedAt], ["1.1.0", next.revision, "2026-11-01T00:00:00+00:00", "2026-11-04"]);
  assert.deepEqual(checkAgreement(site.root), []);
});

test("an npm importer that fails leaves its data and the lock as they were", (t) => {
  const site = npmFixture(t);
  const before = { lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") };
  const next = site.release("1.1.0", "2026-11-01T00:00:00Z");
  fs.writeFileSync(next.tarball, "broken\n");
  const broken = site.update({ "@acme/gadgets@1.1.0": next.tarball });
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /FAIL gadgets: scripts\/generate-gadgets\.cjs failed: tarball has no docs/);
  assert.deepEqual({ lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") }, before);
  // Failures found after the importer succeeded restore its output too.
  fs.writeFileSync(next.tarball, `stale:${site.first.revision}\n`);
  const stale = site.update({ "@acme/gadgets@1.1.0": next.tarball });
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /FAIL gadgets: scripts\/generate-gadgets\.cjs output disagrees with the lock: skill\/references\/gadgets\.json: json \S+ pins [0-9a-f]{12}, not the release commit/);
  assert.deepEqual({ lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") }, before);
  fs.writeFileSync(next.tarball, "noversion\n");
  const unversioned = site.update({ "@acme/gadgets@1.1.0": next.tarball });
  assert.equal(unversioned.status, 1);
  assert.match(unversioned.stderr, /output disagrees with the lock: skill\/references\/gadgets\.json version is undefined, not 1\.1\.0/);
  assert.deepEqual({ lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") }, before);
  const missing = site.update({});
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /FAIL gadgets: SOURCES_NPM_PACKS has no @acme\/gadgets@1\.1\.0/);
  assert.deepEqual({ lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") }, before);
});

test("a latest version that is not a plain semver is refused before any npm command or write", (t) => {
  const site = npmFixture(t);
  const before = { lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") };
  site.release("1.1.0", "2026-11-01T00:00:00Z");
  for (const version of ["1.1.0 && touch pwned", "1.1.0;id", "latest", "1.1", "v1.1.0", "1.1.0\n"]) {
    const result = run(process.execPath, [path.join(site.root, "scripts/sources-update.cjs"), "--root", site.root, "--today", "2026-11-04", "--no-npm-install"], site.root, {
      SOURCES_REMOTE_BASE: `file://${path.join(path.dirname(site.root), "remote")}`,
      SOURCES_NPM_VERSIONS: JSON.stringify({ "@acme/gadgets": version }),
      SOURCES_NPM_PACKS: JSON.stringify({}),
    });
    assert.equal(result.status, 1, version);
    assert.match(result.stderr, /FAIL gadgets: @acme\/gadgets: latest version .* is not a semver/, version);
  }
  assert.deepEqual({ lock: site.read("sources.lock.json"), data: site.read("skill/references/gadgets.json") }, before);
  assert.equal(fs.existsSync(path.join(site.root, "pwned")), false);
});

test("an npm importer reads a {pack:} tarball and only an entry with a repo may ask for {revision}", () => {
  const base = { id: "tool", kind: "npm", package: "tool", version: "1.0.0", reviewedAt: "2026-11-04", sites: [{ file: "x.json", json: "version" }] };
  const lock = (entry) => ({ schema: "design-pipeline.sources-lock.v1", policy: "track-upstream-head", sources: [{ ...base, ...entry }] });
  assert.deepEqual(validateLock(lock({ importer: ["scripts/generate-tool.cjs", "--pack", "{pack:tool}"] })), []);
  assert.match(validateLock(lock({ importer: ["scripts/generate-tool.cjs", "--pack", "./tool.tgz"] })).join(), /reads at least one \{pack:<package>\} tarball/);
  assert.match(validateLock(lock({ importer: ["node_modules/x.cjs", "{pack:tool}"] })).join(), /must start with scripts\/import-\*\.cjs or scripts\/generate-\*\.cjs/);
  assert.match(validateLock(lock({ importer: ["scripts/generate-tool.cjs", "{pack:tool}", "{revision}"] })).join(), /\{revision\} needs the entry's repo and tag/);
});

test("sources:check --upstream reports what is behind and what is held, without failing", () => {
  const sha = (character) => character.repeat(40);
  const lock = {
    sources: [
      { id: "fresh", kind: "catalog-reference", repo: "https://github.com/acme/fresh", revision: sha("a") },
      { id: "stale", kind: "vendored", repo: "https://github.com/acme/stale", revision: sha("b") },
      { id: "stale-docs", kind: "adapted-reference", repo: "https://github.com/acme/stale", revision: sha("b") },
      { id: "runtime", kind: "npm", package: "runtime", version: "1.0.0", repo: "https://github.com/acme/runtime", tag: "v{version}", revision: sha("c"), held: { reason: "redesign", issue: "https://github.com/2233admin/design-pipeline/issues/1" } },
      { id: "tool", kind: "npm", package: "tool", version: "2.0.0" },
      { id: "gone", kind: "catalog-reference", repo: "https://github.com/acme/gone", revision: sha("d") },
    ],
  };
  const heads = { "https://github.com/acme/fresh HEAD": sha("a"), "https://github.com/acme/stale HEAD": sha("e"), "https://github.com/acme/runtime refs/tags/v1.1.0": sha("f") };
  const fake = {
    head: (repo, ref) => { if (!heads[`${repo} ${ref}`]) throw new Error(`${repo} unreachable`); return heads[`${repo} ${ref}`]; },
    version: (entry) => ({ runtime: "1.1.0", tool: "2.0.0" })[entry.package],
  };
  const rows = upstreamStatus(lock, fake);
  assert.deepEqual(rows.map(({ ids, behind, held, error }) => [ids.join("+"), behind, Boolean(held), Boolean(error)]), [
    ["fresh", false, false, false],
    ["stale+stale-docs", true, false, false],
    ["runtime", true, true, false],
    ["tool", false, false, false],
    ["gone", null, false, true],
  ]);
});

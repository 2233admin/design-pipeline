"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { gitTreeId } = require("../skill/scripts/mengto-skills-core.cjs");
const { findManifest, verifyDirectionLibrary } = require("../skill/scripts/design-direction-library-core.cjs");
const { BUNDLES, WHOLE_BUNDLES, fetchBundle, partialBundles, upstreamRoot } = require("../skill/scripts/vendor-cache.cjs");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");

const repoRoot = path.resolve(__dirname, "..");
const [library] = partialBundles();
const bundle = library.bundle;
const vendorRoot = path.dirname(library.manifestFile);
const shippedRoot = path.join(vendorRoot, "upstream");
const manifest = JSON.parse(fs.readFileSync(library.manifestFile, "utf8"));
const sha256 = (content) => crypto.createHash("sha256").update(content).digest("hex");
const blobId = (content) => crypto.createHash("sha1").update(`blob ${content.length}\0`).update(content).digest("hex");

function walk(root, relative = "") {
  return fs.readdirSync(path.join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const file = relative ? `${relative}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(root, file) : [file];
  }).sort();
}

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "direction-library-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A small partial bundle with the real manifest shape: two shipped texts, three fetched files.
function fixture(t, { wrongSha = null } = {}) {
  const dir = temporary(t);
  const root = path.join(dir, "vendor", "library");
  fs.mkdirSync(path.join(root, "upstream"), { recursive: true });
  const shippedFiles = { "LICENSE": "MIT License\n", "SKILL.md": "---\nname: x\n---\n" };
  const fetchedFiles = { "assets/a.jpg": Buffer.from([0xff, 0xd8, 1, 2, 3]), "assets/b.mp3": Buffer.from("audio-bytes"), "demos/page.html": Buffer.from("<p>demo</p>") };
  const objects = (files) => Object.entries(files).map(([file, body]) => {
    const content = Buffer.from(body);
    return { path: file, mode: "100644", oid: blobId(content), size: content.length, sha256: wrongSha === file ? "0".repeat(64) : sha256(content) };
  });
  for (const [file, body] of Object.entries(shippedFiles)) {
    const target = path.join(root, "upstream", storedPath(file));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
  }
  const tree = (files, rootName) => {
    const list = objects(files);
    const lines = list.map((object) => object.path).sort().map((file) => `${file}\0${sha256(Buffer.from(files[file]))}\n`);
    return { root: rootName, fileCount: list.length, byteCount: list.reduce((sum, object) => sum + object.size, 0), treeSha256: sha256(lines.join("")), executableFiles: [], objects: list };
  };
  const snapshot = tree(shippedFiles, "upstream");
  const fetched = tree(fetchedFiles, "fetched");
  const fixtureManifest = {
    schema: manifest.schema,
    bundle,
    source: { repository: "https://github.com/example/library", revision: "a".repeat(40), gitTree: gitTreeId([...snapshot.objects, ...fetched.objects]), committedAt: "2026-01-01T00:00:00Z", license: "MIT", reviewedAt: "2026-01-02", scope: ["**"] },
    snapshot,
    fetched,
  };
  const manifestFile = path.join(root, "manifest.json");
  fs.writeFileSync(manifestFile, JSON.stringify(fixtureManifest));
  const served = (override = {}) => {
    const requests = [];
    const fetch = async (url) => {
      requests.push(url);
      const [owner, name, revision, ...rest] = new URL(url).pathname.slice(1).split("/").map(decodeURIComponent);
      assert.deepEqual([owner, name, revision], ["example", "library", "a".repeat(40)]);
      const file = rest.join("/");
      if (override.missing === file) return { ok: false, status: 404 };
      const content = override[file] ?? fetchedFiles[file];
      return { ok: true, status: 200, arrayBuffer: async () => Buffer.from(content) };
    };
    return { fetch, requests };
  };
  return { manifestFile, fixtureManifest, env: { DESIGN_PIPELINE_CACHE: path.join(dir, "cache") }, served, root, dir };
}

test("the shipped part is byte-exact, hashed per file, text only and not executable", () => {
  assert.equal(manifest.schema, "design-pipeline.direction-library-source.v1");
  assert.equal(manifest.bundle, "design-direction-library");
  assert.match(manifest.source.repository, /^https:\/\/github\.com\/[^/]+\/[^/]+$/);
  assert.equal(manifest.source.revision, "798c4235ebff03d5c45e3c8affdf5e9d18f9dfa7");
  assert.equal(manifest.source.gitTree, "cf7e7baaf14ed1331ee1bb06cff2bc8e1af344de");
  assert.equal(manifest.source.license, "MIT");
  assert.deepEqual(manifest.licenses, [{ path: "upstream/LICENSE", license: "MIT", copyright: "Copyright (c) 2026 alchaincyf (花叔 · 花生)" }]);
  assert.match(fs.readFileSync(path.join(shippedRoot, "LICENSE"), "utf8"), /^MIT License\n\nCopyright \(c\) 2026 alchaincyf/);

  const stored = walk(shippedRoot);
  assert.equal(stored.length, 181);
  assert.equal(manifest.snapshot.fileCount, stored.length);
  assert.deepEqual(manifest.snapshot.objects.map((object) => storedPath(object.path)).sort(), stored);
  let bytes = 0;
  for (const object of manifest.snapshot.objects) {
    const file = path.join(shippedRoot, storedPath(object.path));
    const content = fs.readFileSync(file);
    bytes += content.length;
    assert.equal(object.size, content.length, object.path);
    assert.equal(object.oid, blobId(content), object.path);
    assert.match(object.sha256, /^[0-9a-f]{64}$/, object.path);
    assert.equal(object.sha256, sha256(content), object.path);
    assert.equal(content.includes(0), false, `${object.path} is not text`);
    assert.doesNotThrow(() => new TextDecoder("utf-8", { fatal: true }).decode(content), object.path);
    assert.equal(fs.statSync(file).mode & 0o111, 0, `${object.path} must not be executable`);
  }
  assert.equal(manifest.snapshot.byteCount, bytes);

  // The upstream entry is stored under the reserved name; no other SKILL.md ships.
  assert.ok(fs.existsSync(path.join(shippedRoot, "UPSTREAM-SKILL.md")));
  assert.equal(stored.filter((file) => path.basename(file) === "SKILL.md").length, 0);
  assert.ok(manifest.snapshot.objects.some((object) => object.path === "SKILL.md"));

  // The scope: references, all 84 specimens and the inert scripts are present.
  const shippedPaths = manifest.snapshot.objects.map((object) => object.path);
  assert.equal(shippedPaths.filter((file) => /^assets\/style-specimens\/[^/]+\/[^/]+\.html$/.test(file)).length, 84);
  for (const file of ["references/design-styles.md", "references/directions.md", "references/workflow.md", "references/critique-guide.md", "references/brand-asset-protocol.md", "references/content-guidelines.md", "references/evolution.md"]) {
    assert.ok(shippedPaths.includes(file), file);
  }
  assert.ok(shippedPaths.some((file) => file.startsWith("scripts/")));
  assert.equal(manifest.specimens.length, 84);
  for (const specimen of manifest.specimens) {
    assert.ok(fs.existsSync(path.join(vendorRoot, storedPath(specimen.path))), specimen.id);
    assert.ok(manifest.fetched.objects.some((object) => object.path === specimen.preview), `${specimen.id} preview is fetched`);
  }
});

test("shipped and fetched parts rebuild the pinned Git tree; the fetched part is hashed but absent", () => {
  const all = [...manifest.snapshot.objects, ...manifest.fetched.objects];
  assert.equal(all.length, 389);
  assert.equal(new Set(all.map((object) => object.path)).size, all.length);
  assert.equal(gitTreeId(all), manifest.source.gitTree);
  assert.equal(manifest.fetched.fileCount, 208);
  assert.equal(manifest.fetched.objects.length, 208);
  assert.equal(manifest.fetched.root, "fetched");
  const extensions = new Set(manifest.fetched.objects.map((object) => path.extname(object.path).toLowerCase()));
  for (const extension of [".jpg", ".mp3", ".png"]) assert.ok(extensions.has(extension), extension);
  for (const object of manifest.fetched.objects) {
    assert.match(object.sha256, /^[0-9a-f]{64}$/, object.path);
    assert.match(object.oid, /^[0-9a-f]{40}$/, object.path);
    assert.ok(object.size > 0, object.path);
  }
  assert.equal(manifest.fetched.byteCount, manifest.fetched.objects.reduce((sum, object) => sum + object.size, 0));

  // No fetched path is stored anywhere in the repository's copy of the bundle, and no binary is.
  const onDisk = walk(vendorRoot).map((file) => file.replace(/^upstream\//, "").replace(/UPSTREAM-SKILL\.md$/, "SKILL.md"));
  for (const object of manifest.fetched.objects) assert.equal(onDisk.includes(object.path), false, object.path);
  assert.equal(onDisk.filter((file) => /\.(jpe?g|png|mp3|wav|webp|gif|mp4)$/i.test(file)).length, 0);
  assert.equal(fs.existsSync(path.join(vendorRoot, "fetched")), false);
});

test("the library is a partial bundle: fetched by id, not skipped wholesale by packaging", () => {
  assert.ok(BUNDLES.includes(bundle));
  assert.equal(WHOLE_BUNDLES.includes(bundle), false);
  assert.ok(WHOLE_BUNDLES.includes("mengto-skills") && WHOLE_BUNDLES.includes("iart-motion-skills"));
  const where = upstreamRoot(library.manifestFile, manifest, { env: { DESIGN_PIPELINE_CACHE: "/x/cache" } });
  assert.equal(where.root, path.join(path.resolve("/x/cache"), "vendor", bundle, manifest.fetched.treeSha256, "fetched"));
  assert.equal(where.fetch, `designer-pipeline sources fetch --bundle ${bundle}`);
});

test("verification reports the download before a fetch and is ready after a verified fetch", async (t) => {
  const real = verifyDirectionLibrary(library.manifestFile, { env: { DESIGN_PIPELINE_CACHE: temporary(t) } });
  assert.equal(real.status, "missing");
  assert.equal(real.fetch, `designer-pipeline sources fetch --bundle ${bundle}`);
  assert.equal(real.shipped.fileCount, 181);
  assert.equal(findManifest(), library.manifestFile);

  const small = fixture(t);
  const before = verifyDirectionLibrary(small.manifestFile, { env: small.env });
  assert.equal(before.status, "missing");
  assert.deepEqual(before.issues, [`binaries not downloaded yet; run ${before.fetch}`]);
  const served = small.served();
  const result = await fetchBundle(bundle, { manifestFile: small.manifestFile, fetch: served.fetch, env: small.env });
  assert.equal(result.status, "fetched");
  assert.equal(served.requests.length, 3);
  assert.ok(served.requests.every((url) => url.startsWith("https://raw.githubusercontent.com/example/library/")));
  assert.equal(verifyDirectionLibrary(small.manifestFile, { env: small.env }).status, "ready");
  const again = small.served();
  assert.equal((await fetchBundle(bundle, { manifestFile: small.manifestFile, fetch: again.fetch, env: small.env })).status, "present");
  assert.equal(again.requests.length, 0);

  // A cached file changed afterwards blocks verification instead of passing.
  fs.writeFileSync(path.join(result.root, "assets/b.mp3"), "tampered!!!");
  const tampered = verifyDirectionLibrary(small.manifestFile, { env: small.env });
  assert.equal(tampered.status, "blocked");
  assert.match(tampered.issues.join("\n"), /fetched: .*assets\/b\.mp3/);
});

test("a download that differs from the manifest, or fails, installs nothing", async (t) => {
  const small = fixture(t);
  const entry = path.join(small.env.DESIGN_PIPELINE_CACHE, "vendor", bundle);
  await assert.rejects(fetchBundle(bundle, { manifestFile: small.manifestFile, fetch: small.served({ "assets/a.jpg": Buffer.from([0xff, 0xd8, 9, 9, 9]) }).fetch, env: small.env }), (error) => error.code === "SOURCE_CHANGED" && error.message.includes("assets/a.jpg"));
  assert.deepEqual(fs.readdirSync(entry), []);
  await assert.rejects(fetchBundle(bundle, { manifestFile: small.manifestFile, fetch: small.served({ missing: "assets/b.mp3" }).fetch, env: small.env }), (error) => error.code === "FETCH_FAILED" && /404/.test(error.message));
  assert.deepEqual(fs.readdirSync(entry), []);
  // The size and blob id match but the recorded SHA-256 does not.
  const wrong = fixture(t, { wrongSha: "demos/page.html" });
  await assert.rejects(fetchBundle(bundle, { manifestFile: wrong.manifestFile, fetch: wrong.served().fetch, env: wrong.env }), (error) => error.code === "SOURCE_CHANGED" && /SHA-256/.test(error.message));
  assert.deepEqual(fs.readdirSync(path.join(wrong.env.DESIGN_PIPELINE_CACHE, "vendor", bundle)), []);
});

test("verification fails for a changed, missing or added shipped file in an owned copy", (t) => {
  const dir = temporary(t);
  fs.cpSync(vendorRoot, path.join(dir, "vendor", "copy"), { recursive: true });
  const manifestFile = path.join(dir, "vendor", "copy", "manifest.json");
  const options = { env: { DESIGN_PIPELINE_CACHE: path.join(dir, "cache") } };
  assert.equal(verifyDirectionLibrary(manifestFile, options).status, "missing");
  const root = path.join(dir, "vendor", "copy", "upstream");
  const readme = path.join(root, "README.md");
  const original = fs.readFileSync(readme);
  fs.writeFileSync(readme, Buffer.concat([original, Buffer.from("x")]));
  const changed = verifyDirectionLibrary(manifestFile, options);
  assert.equal(changed.status, "blocked");
  assert.match(changed.issues.join("\n"), /size mismatch README\.md/);
  fs.writeFileSync(readme, original);
  const specimen = path.join(root, "assets/style-specimens/web/01-editorial-brutalism.html");
  const bytes = fs.readFileSync(specimen);
  fs.rmSync(specimen);
  assert.match(verifyDirectionLibrary(manifestFile, options).issues.join("\n"), /missing file assets\/style-specimens\/web\/01-editorial-brutalism\.html/);
  fs.writeFileSync(specimen, bytes);
  fs.writeFileSync(path.join(root, "extra.txt"), "added");
  assert.match(verifyDirectionLibrary(manifestFile, options).issues.join("\n"), /unlisted file extra\.txt/);
  fs.rmSync(path.join(root, "extra.txt"));
  fs.writeFileSync(path.join(root, "SKILL.md"), "escaped");
  assert.match(verifyDirectionLibrary(manifestFile, options).issues.join("\n"), /must be stored as UPSTREAM-SKILL\.md/);
});

test("doctor lists the download without blocking and nothing wires the inert scripts", (t) => {
  const cache = temporary(t);
  const child = spawnSync(process.execPath, [path.join(repoRoot, "skill/scripts/designer-pipeline.cjs"), "doctor", "--json"], {
    cwd: repoRoot, encoding: "utf8", windowsHide: true, env: { ...process.env, DESIGN_PIPELINE_CACHE: cache },
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const doctor = JSON.parse(child.stdout);
  assert.equal(doctor.directionLibrary.status, "missing");
  assert.ok(doctor.downloads.some((item) => item.bundle === bundle && item.fetch.endsWith(`sources fetch --bundle ${bundle}`)));
  assert.equal(doctor.missing.length, 0);

  assert.equal(manifest.boundary.mode, "reference-material");
  assert.equal(manifest.boundary.inertScripts, "upstream/scripts/**");
  for (const flag of ["installsUpstreamDependencies", "executesUpstreamScripts", "changesProjectRuntime"]) assert.equal(manifest.boundary[flag], false, flag);
  assert.ok(manifest.snapshot.executableFiles.every((file) => file.startsWith("scripts/")), "upstream executable bits are recorded only for the inert scripts");

  // No packaged helper, tool, CI workflow or npm script refers to the vendored scripts or runs anything from the bundle.
  const needles = [`${library.directory}/upstream/scripts`, `${library.directory}/upstream/assets`];
  const candidates = [path.join(repoRoot, "package.json"), ...walkAbsolute(path.join(repoRoot, "skill/scripts")), ...walkAbsolute(path.join(repoRoot, "skill/tools")), ...walkAbsolute(path.join(repoRoot, ".github")), ...walkAbsolute(path.join(repoRoot, "scripts"))];
  const offenders = candidates.filter((file) => {
    const text = fs.readFileSync(file, "utf8");
    return needles.some((needle) => text.includes(needle));
  });
  assert.deepEqual(offenders, []);
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.scripts["sources:import:direction-library"], "node scripts/import-design-direction-library.cjs");
  assert.match(packageJson.scripts["sources:check"], /tests\/design-direction-library\.test\.cjs/);
});

function walkAbsolute(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === "vendor" ? [] : walkAbsolute(file);
    return /\.(cjs|mjs|js|json|ya?ml|sh)$/.test(entry.name) ? [file] : [];
  });
}

test("the importer needs the reviewed revision, a clean checkout and a valid date, and keeps the snapshot", (t) => {
  const root = temporary(t);
  fs.mkdirSync(path.join(root, "scripts"));
  fs.mkdirSync(path.join(root, "skill/scripts"), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, "skill/scripts/upstream-path.cjs"), path.join(root, "skill/scripts/upstream-path.cjs"));
  for (const file of ["import-design-direction-library.cjs", "git-tree-snapshot.cjs"]) fs.copyFileSync(path.join(repoRoot, "scripts", file), path.join(root, "scripts", file));
  const destination = path.join(root, "skill/vendor", library.directory);
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, "manifest.json"), "previous snapshot\n");
  const source = path.join(root, "source");
  fs.mkdirSync(source);
  const run = (command, args, cwd) => spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true });
  const git = (args) => { const result = run("git", args, source); assert.equal(result.status, 0, result.stderr); };
  git(["init", "--quiet"]);
  fs.writeFileSync(path.join(source, "LICENSE"), "MIT License\n\nCopyright (c) 2026 someone\n");
  fs.writeFileSync(path.join(source, "README.md"), "readme\n");
  git(["add", "."]);
  git(["-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--quiet", "-m", "fixture"]);
  const importer = path.join(root, "scripts/import-design-direction-library.cjs");
  const rejects = (pattern, extra = ["--reviewed-at", "2026-10-19"]) => {
    const result = run(process.execPath, [importer, "--source", source, ...extra], root);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, pattern);
    assert.equal(fs.readFileSync(path.join(destination, "manifest.json"), "utf8"), "previous snapshot\n");
    assert.deepEqual(fs.readdirSync(path.dirname(destination)), [library.directory]);
  };
  rejects(/source revision must be the reviewed 798c4235ebff03d5c45e3c8affdf5e9d18f9dfa7/);
  rejects(/valid YYYY-MM-DD/, ["--reviewed-at", "2026-02-30"]);
  fs.appendFileSync(path.join(source, "README.md"), "dirty\n");
  rejects(/tracked working-tree changes/);
  assert.equal(run(process.execPath, [importer, "--source", source], root).status, 1);
});

test("the package carries the shipped text and none of the fetched binaries", (t) => {
  const output = temporary(t);
  const built = spawnSync(process.execPath, [path.join(repoRoot, "scripts/package.cjs"), "--output-root", output], { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  const listing = spawnSync("tar", ["-tzf", path.join(output, "design-pipeline-skill.tgz")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(listing.status, 0, listing.stderr);
  const entries = listing.stdout.split("\n").filter(Boolean);
  const prefix = `design-pipeline/vendor/${library.directory}/`;
  const packaged = entries.filter((entry) => entry.startsWith(prefix) && !entry.endsWith("/")).map((entry) => entry.slice(prefix.length)).sort();
  assert.deepEqual(packaged, ["manifest.json", ...manifest.snapshot.objects.map((object) => `upstream/${storedPath(object.path)}`)].sort());
  assert.equal(packaged.filter((entry) => /\.(jpe?g|png|mp3|wav)$/i.test(entry)).length, 0);
  assert.deepEqual(entries.filter((entry) => path.posix.basename(entry) === "SKILL.md"), ["design-pipeline/SKILL.md"]);
  assert.ok(entries.includes("design-pipeline/references/design-direction-library.md"));
});

test("partial bundle discovery tolerates a corrupt manifest so doctor can report it", (t) => {
  const vendor = path.join(temporary(t), "vendor");
  fs.mkdirSync(path.join(vendor, "broken-library"), { recursive: true });
  fs.writeFileSync(path.join(vendor, "broken-library", "manifest.json"), `{"schema":"${manifest.schema}","bundle":`);
  const [found] = partialBundles(vendor);
  assert.equal(found.bundle, "broken-library");
  assert.equal(found.directory, "broken-library");
});

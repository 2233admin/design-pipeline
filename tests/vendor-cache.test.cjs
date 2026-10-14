"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { cacheRoot, fetchBundle, upstreamRoot } = require("../skill/scripts/vendor-cache.cjs");
const { searchIartSkills, verifyIartSnapshot } = require("../skill/scripts/iart-motion-skills-core.cjs");
const { storedPath } = require("../skill/scripts/upstream-path.cjs");

const repo = path.resolve(__dirname, "..");
const bundled = path.join(repo, "skill/vendor/iart-motion-skills");
const manifest = JSON.parse(fs.readFileSync(path.join(bundled, "manifest.json"), "utf8"));

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vendor-cache-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
// A packaged layout: the manifest without its upstream tree, in a directory named after the bundle.
function packaged(t) {
  const dir = temporary(t);
  fs.mkdirSync(path.join(dir, "skill", "iart-motion-skills"), { recursive: true });
  const manifestFile = path.join(dir, "skill", "iart-motion-skills", "manifest.json");
  fs.copyFileSync(path.join(bundled, "manifest.json"), manifestFile);
  return { manifestFile, env: { DESIGN_PIPELINE_CACHE: path.join(dir, "cache") }, cache: path.join(dir, "cache") };
}
// Serves raw.githubusercontent.com URLs from the repository's own copy of the bundle.
function mirror({ alter = null, missing = null } = {}) {
  const packs = new Map(manifest.packs.map((pack) => [pack.repository.replace("https://github.com/", ""), pack]));
  const requests = [];
  const fetch = async (url) => {
    requests.push(url);
    const [owner, name, revision, ...rest] = new URL(url).pathname.slice(1).split("/").map(decodeURIComponent);
    const pack = packs.get(`${owner}/${name}`);
    assert.ok(pack && pack.revision === revision, url);
    const upstream = `${pack.id}/${rest.join("/")}`;
    if (upstream === missing) return { ok: false, status: 404 };
    let content = fs.readFileSync(path.join(bundled, "upstream", ...storedPath(upstream).split("/")));
    if (upstream === alter) content = Buffer.concat([content, Buffer.from("x")]);
    return { ok: true, status: 200, arrayBuffer: async () => content };
  };
  return { fetch, requests };
}

test("the cache follows the override, then the platform convention", () => {
  assert.equal(cacheRoot({ env: { DESIGN_PIPELINE_CACHE: "/x/cache" }, platform: "linux", home: "/h" }), path.resolve("/x/cache"));
  assert.equal(cacheRoot({ env: { XDG_CACHE_HOME: "/x/xdg" }, platform: "linux", home: "/h" }), path.join("/x/xdg", "design-pipeline"));
  assert.equal(cacheRoot({ env: {}, platform: "linux", home: "/h" }), path.join("/h", ".cache", "design-pipeline"));
  assert.equal(cacheRoot({ env: {}, platform: "darwin", home: "/h" }), path.join("/h", "Library", "Caches", "design-pipeline"));
  assert.equal(cacheRoot({ env: { LOCALAPPDATA: "C:\\Users\\a\\AppData\\Local" }, platform: "win32", home: "/h" }), path.join("C:\\Users\\a\\AppData\\Local", "design-pipeline", "Cache"));
});

test("the repository copy is used in place; a packaged manifest points at the cache entry for its tree", (t) => {
  assert.deepEqual(upstreamRoot(path.join(bundled, "manifest.json"), manifest), { root: path.join(bundled, "upstream"), source: "bundled", bundle: "iart-motion-skills" });
  const { manifestFile, env, cache } = packaged(t);
  const where = upstreamRoot(manifestFile, manifest, { env });
  assert.equal(where.root, path.join(cache, "vendor", "iart-motion-skills", manifest.snapshot.treeSha256, "upstream"));
  assert.equal(where.fetch, "designer-pipeline sources fetch --bundle iart-motion-skills");
});

test("before a fetch, verification reports the download and search fails TOOL_MISSING", (t) => {
  const { manifestFile, env } = packaged(t);
  const previous = process.env.DESIGN_PIPELINE_CACHE;
  process.env.DESIGN_PIPELINE_CACHE = env.DESIGN_PIPELINE_CACHE;
  t.after(() => { if (previous === undefined) delete process.env.DESIGN_PIPELINE_CACHE; else process.env.DESIGN_PIPELINE_CACHE = previous; });
  const result = verifyIartSnapshot(manifestFile);
  assert.equal(result.status, "missing");
  assert.equal(result.fetch, "designer-pipeline sources fetch --bundle iart-motion-skills");
  assert.throws(() => searchIartSkills({ query: "logo", manifestFile }), (error) => error.code === "TOOL_MISSING" && /sources fetch --bundle iart-motion-skills/.test(error.message));
});

test("a fetch verifies every file, installs the tree and is reused", async (t) => {
  const { manifestFile, env } = packaged(t);
  const previous = process.env.DESIGN_PIPELINE_CACHE;
  process.env.DESIGN_PIPELINE_CACHE = env.DESIGN_PIPELINE_CACHE;
  t.after(() => { if (previous === undefined) delete process.env.DESIGN_PIPELINE_CACHE; else process.env.DESIGN_PIPELINE_CACHE = previous; });
  const served = mirror();
  const fetched = await fetchBundle("iart-motion-skills", { manifestFile, fetch: served.fetch, env });
  assert.equal(fetched.status, "fetched");
  assert.equal(served.requests.length, manifest.snapshot.objects.length);
  assert.ok(served.requests.every((url) => url.startsWith("https://raw.githubusercontent.com/iart-ai/")));
  assert.equal(verifyIartSnapshot(manifestFile).status, "ready");
  const skill = searchIartSkills({ query: "logo", manifestFile }).results[0].skillPath;
  assert.ok(skill.startsWith(fetched.root) && skill.endsWith("UPSTREAM-SKILL.md") && fs.existsSync(skill), skill);
  const again = mirror();
  assert.equal((await fetchBundle("iart-motion-skills", { manifestFile, fetch: again.fetch, env })).status, "present");
  assert.equal(again.requests.length, 0);
});

test("a file that differs from the manifest, or a failed download, installs nothing", async (t) => {
  const { manifestFile, env, cache } = packaged(t);
  const entry = path.join(cache, "vendor", "iart-motion-skills");
  const object = manifest.snapshot.objects.find((item) => item.path.endsWith("/LICENSE"));
  await assert.rejects(fetchBundle("iart-motion-skills", { manifestFile, fetch: mirror({ alter: object.path }).fetch, env }), (error) => error.code === "SOURCE_CHANGED" && error.message.includes(object.path));
  assert.deepEqual(fs.readdirSync(entry), [], "no partial or installed tree is left");
  await assert.rejects(fetchBundle("iart-motion-skills", { manifestFile, fetch: mirror({ missing: object.path }).fetch, env }), (error) => error.code === "FETCH_FAILED" && /404/.test(error.message));
  assert.deepEqual(fs.readdirSync(entry), []);
  await assert.rejects(fetchBundle("taste-skill", { manifestFile, env }), (error) => error.code === "UNKNOWN_BUNDLE");
});

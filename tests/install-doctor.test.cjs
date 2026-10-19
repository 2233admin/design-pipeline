"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const { inspectDoctor } = require("../skill/scripts/cli-core.cjs");
const { classifyInstall, inspectEnvironment, nodeAtLeast, renderDoctor } = require("../skill/scripts/doctor-report.cjs");
const { installCommand } = require("../skill/scripts/install-hints.cjs");
const { locateBrowser } = require("../skill/scripts/browser-locate.cjs");

function runDoctor(args, extra = {}) {
  return spawnSync(process.execPath, [cli, "doctor", ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true, ...extra });
}

const missingTool = () => { throw Object.assign(new Error("not found"), { code: "TOOL_MISSING" }); };
const nothingFound = { locateBrowser: missingTool, findBlender: missingTool, probeTool: () => null };
const everythingFound = {
  locateBrowser: () => ({ executable: "/usr/bin/chromium", source: "chromium" }),
  findBlender: () => ({ path: "/usr/bin/blender", version: "4.2.1" }),
  probeTool: () => "7.0",
};

test("marketplace.json lists the Release archive as one valid plugin entry", () => {
  const marketplace = JSON.parse(fs.readFileSync(path.join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"));
  const identifier = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  assert.match(marketplace.name, identifier);
  assert.ok(marketplace.owner?.name);
  assert.equal(marketplace.plugins.length, 1);
  const [entry] = marketplace.plugins;
  assert.match(entry.name, identifier);
  assert.equal(entry.name, "design-pipeline");
  assert.equal(entry.source.source, "archive");
  assert.equal(entry.source.url, "https://github.com/2233admin/design-pipeline/releases/latest/download/design-pipeline-skill.zip");
  assert.equal(entry.version, undefined, "the version comes from the package's plugin.json");
  assert.equal(JSON.stringify(marketplace).includes(".."), false);
});

test("the package archive root is a valid Claude Code plugin root", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-plugin-root-"));
  try {
    const packed = spawnSync(process.execPath, [path.join(repoRoot, "scripts/package.cjs"), "--output-root", path.join(out, "dist")], {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, PACKAGE_VERSION: "1.2.3", SOURCE_DATE_EPOCH: "1784764800" },
    });
    assert.equal(packed.status, 0, packed.stderr || packed.stdout);
    const extracted = path.join(out, "extracted");
    fs.mkdirSync(extracted);
    const untar = spawnSync("tar", ["-xzf", path.join(out, "dist/design-pipeline-skill.tgz"), "-C", extracted], { encoding: "utf8" });
    assert.equal(untar.status, 0, untar.stderr);

    const pluginRoot = path.join(extracted, "design-pipeline");
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, ".claude-plugin/plugin.json"), "utf8"));
    const marketplace = JSON.parse(fs.readFileSync(path.join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"));
    assert.equal(manifest.name, marketplace.plugins[0].name, "entry name and manifest name stay equal");
    assert.equal(manifest.version, "1.2.3");
    assert.equal(manifest.skills, "./");
    assert.ok(manifest.skills.startsWith("./") && !manifest.skills.includes(".."));
    assert.ok(fs.existsSync(path.join(pluginRoot, manifest.skills, "SKILL.md")), "the declared skill directory holds SKILL.md");
    assert.deepEqual(fs.readdirSync(path.join(pluginRoot, ".claude-plugin")), ["plugin.json"]);

    const resources = JSON.parse(fs.readFileSync(path.join(repoRoot, "skill/references/package-resources.json"), "utf8"));
    assert.ok(resources.generated.includes(".claude-plugin/plugin.json"));

    // The authoritative check, when the Claude Code CLI is installed on this machine.
    const probe = spawnSync("claude", ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) {
      for (const target of [pluginRoot, repoRoot]) {
        const validated = spawnSync("claude", ["plugin", "validate", target, "--strict"], { encoding: "utf8" });
        assert.equal(validated.status, 0, `${target}: ${validated.stdout}${validated.stderr}`);
      }
    }
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test("SKILL.md declares compatibility within the Agent Skills limit", () => {
  const text = fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8");
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
  const compatibility = frontmatter.match(/^compatibility:[ \t]*(\S.*)$/m)?.[1];
  assert.ok(compatibility && compatibility.length <= 500);
  assert.match(compatibility, /Node\.js 22\.12\+/);
  for (const tool of ["browser", "ffmpeg", "Blender", "network"]) assert.match(compatibility, new RegExp(tool));
});

test("Node must be 22.12 or newer", () => {
  assert.equal(nodeAtLeast("22.11.9"), false);
  assert.equal(nodeAtLeast("22.12.0"), true);
  assert.equal(nodeAtLeast("23.0.0"), true);
  assert.equal(nodeAtLeast("20.19.0"), false);
  assert.equal(inspectDoctor(path.join(repoRoot, "skill"), "22.11.0").nodeSupported, false);
  assert.equal(inspectDoctor(path.join(repoRoot, "skill"), "22.12.0").nodeSupported, true);
});

test("the install location is classified from the script's own path", () => {
  const home = path.join(os.tmpdir(), "dp-home");
  const cwd = path.join(os.tmpdir(), "dp-project");
  const kind = (target, env = {}) => classifyInstall(target, { home, cwd, env }).kind;
  assert.equal(kind(path.join(home, ".claude/plugins/cache/design-pipeline/design-pipeline/0.12.0")), "claude-plugin");
  assert.equal(kind(path.join(home, ".claude/skills/design-pipeline")), "claude-skills");
  assert.equal(kind(path.join(home, ".agents/skills/design-pipeline")), "agents-skills");
  assert.equal(kind(path.join(cwd, ".agents/skills/design-pipeline")), "agents-skills");
  assert.equal(kind(path.join(home, ".codex/skills/design-pipeline")), "codex-legacy");
  assert.equal(kind(path.join(home, "elsewhere/plugins/cache/x"), { CLAUDE_CONFIG_DIR: path.join(home, "elsewhere") }), "claude-plugin");
  assert.equal(kind(path.join(repoRoot, "skill")), "other");
});

test("missing recommended and optional items print one copyable command each and do not block", () => {
  const doctor = {
    ...inspectDoctor(path.join(repoRoot, "skill")),
    downloads: [
      { bundle: "mengto-skills", fetch: "unused" },
      { bundle: "iart-motion-skills", fetch: "unused" },
    ],
  };
  const environment = inspectEnvironment(doctor, { ...nothingFound, platform: "linux", home: os.tmpdir(), env: {} });
  assert.deepEqual(environment.tiers.required.map((entry) => entry.ok), [true, true]);
  assert.deepEqual(environment.tiers.recommended.map((entry) => entry.id), ["browser"]);
  assert.deepEqual(environment.tiers.optional.map((entry) => entry.id), ["sources", "ffmpeg", "blender"]);
  for (const entry of [...environment.tiers.recommended, ...environment.tiers.optional]) {
    assert.equal(entry.ok, false);
    assert.equal(typeof entry.fix, "string");
    assert.equal(entry.fix.includes("\n"), false);
  }
  const text = renderDoctor(doctor, environment);
  assert.match(text, /^design-pipeline doctor/);
  assert.match(text, /run: npx hyperframes browser ensure/);
  assert.match(text, /run: sudo apt install ffmpeg/);
  assert.match(text, /run: sudo snap install blender --classic/);
  assert.match(text, /run: node .*designer-pipeline\.cjs"? sources fetch --all/);
  assert.match(text, /Result: ready\. 4 recommended or optional items are missing/);
  assert.match(text, /Nothing was installed/);
});

test("one missing bundle is fetched by name and a complete environment reports nothing missing", () => {
  const doctor = { ...inspectDoctor(path.join(repoRoot, "skill")), downloads: [{ bundle: "iart-motion-skills", fetch: "unused" }] };
  const partial = inspectEnvironment(doctor, { ...everythingFound, platform: "linux", env: {} });
  assert.match(partial.tiers.optional[0].fix, /sources fetch --bundle iart-motion-skills$/);

  const complete = { ...doctor, downloads: [] };
  const environment = inspectEnvironment(complete, { ...everythingFound, platform: "linux", env: {} });
  assert.equal([...environment.tiers.required, ...environment.tiers.recommended, ...environment.tiers.optional].every((entry) => entry.ok), true);
  assert.match(renderDoctor(complete, environment), /Result: ready\. Nothing is missing\./);
});

test("install commands match the errors raised when a task first needs the tool", () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-no-browser-"));
  try {
    assert.throws(
      // A platform with no fixed install locations, so a browser installed on this machine cannot match.
      () => locateBrowser(undefined, { env: { PATH: empty }, platform: "freebsd", home: empty }),
      (error) => error.code === "TOOL_MISSING" && error.message.includes(installCommand("browser")),
    );
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
  const audio = fs.readFileSync(path.join(repoRoot, "skill/scripts/audio-core.cjs"), "utf8");
  const film = fs.readFileSync(path.join(repoRoot, "skill/scripts/film-core.cjs"), "utf8");
  const blender = fs.readFileSync(path.join(repoRoot, "skill/scripts/blender-core.cjs"), "utf8");
  for (const source of [audio, film]) assert.match(source, /installCommand\("ffmpeg"\)/);
  assert.match(blender, /installCommand\("blender"\)/);

  const { findBlender } = require("../skill/scripts/blender-core.cjs");
  const savedPath = process.env.PATH;
  const savedBlender = process.env.BLENDER_PATH;
  try {
    process.env.PATH = os.tmpdir();
    delete process.env.BLENDER_PATH;
    if (!fs.existsSync("/usr/bin/blender") && !fs.existsSync("/usr/local/bin/blender") && process.platform === "linux") {
      assert.throws(() => findBlender(), (error) => error.code === "TOOL_MISSING" && error.message.includes(installCommand("blender", "linux")));
    }
  } finally {
    process.env.PATH = savedPath;
    if (savedBlender !== undefined) process.env.BLENDER_PATH = savedBlender;
  }
  assert.equal(installCommand("ffmpeg", "darwin"), "brew install ffmpeg");
  assert.equal(installCommand("ffmpeg", "win32"), "winget install Gyan.FFmpeg");
});

test("doctor prints a readable report by default, JSON on request, and exits 0 when only optional tools are missing", () => {
  const readable = runDoctor([]);
  assert.equal(readable.status, 0, readable.stderr || readable.stdout);
  assert.match(readable.stdout, /^design-pipeline doctor/);
  assert.match(readable.stdout, /Installed at\s+.*skill/);
  for (const heading of ["Required", "Recommended", "Optional"]) assert.match(readable.stdout, new RegExp(`^${heading} `, "m"));
  assert.throws(() => JSON.parse(readable.stdout));

  const machine = runDoctor(["--json"]);
  assert.equal(machine.status, 0, machine.stderr || machine.stdout);
  const payload = JSON.parse(machine.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.status, "ready");
  for (const key of ["node", "nodeSupported", "packageRoot", "missing", "downloads", "registry", "root"]) assert.ok(key in payload, key);
  assert.deepEqual(Object.keys(payload.environment.tiers), ["required", "recommended", "optional"]);
  assert.equal(payload.environment.install.path, path.join(repoRoot, "skill"));

  // Tools hidden from PATH: optional and recommended items go missing, the exit code stays 0.
  const bare = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-bare-"));
  try {
    const noTools = runDoctor([], { env: { PATH: bare, HOME: bare, USERPROFILE: bare, SystemRoot: process.env.SystemRoot } });
    assert.equal(noTools.status, 0, noTools.stderr || noTools.stdout);
    assert.match(noTools.stdout, /\[missing\] ffmpeg and ffprobe/);
    assert.match(noTools.stdout, /run: (brew install ffmpeg|winget install Gyan\.FFmpeg|sudo apt install ffmpeg)/);
    assert.match(noTools.stdout, /Result: ready\./);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
  }
});

test("doctor exits 2 and says blocked when a required item is missing", () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-doctor-blocked-"));
  try {
    // Without vendor/ the package manifest's required files are absent.
    fs.cpSync(path.join(repoRoot, "skill"), copy, { recursive: true, filter: (source) => !source.split(path.sep).includes("vendor") });
    const blocked = spawnSync(process.execPath, [path.join(copy, "scripts/designer-pipeline.cjs"), "doctor"], { encoding: "utf8", windowsHide: true });
    assert.equal(blocked.status, 2, blocked.stderr || blocked.stdout);
    assert.match(blocked.stdout, /\[missing\] Skill files: missing: /);
    assert.match(blocked.stdout, /Result: blocked\./);
    const json = spawnSync(process.execPath, [path.join(copy, "scripts/designer-pipeline.cjs"), "doctor", "--json"], { encoding: "utf8", windowsHide: true });
    assert.equal(json.status, 2);
    assert.equal(JSON.parse(json.stdout).status, "blocked");
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
});

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { readPersistedCatalog, searchCatalog, syncDesignMd, writeCatalog } = require("../skill/scripts/designmd-core.cjs");

const source = "https://designmd.test";
const pages = new Map([
  [`${source}`, '<a href="/skills/install">Skills</a><a href="/templates">Templates</a><a href="/guides">Guides</a><a href="/tools">Tools</a><a href="/p/linear">Linear</a>'],
  [`${source}/skills`, '<a href="/skills/install">Install</a>'],
  [`${source}/skills/install`, '<a href="/skills/a11y-audit">A11y</a>'],
  [`${source}/templates`, '<a href="/t/admin-panel">Admin</a>'],
  [`${source}/library`, '<a href="/p/linear">Linear</a>'],
  [`${source}/guides`, '<a href="/guides/design-md-for-codex">Codex guide</a>'],
  [`${source}/tools`, '<a href="/tools/figma">Figma</a>'],
  [`${source}/cli`, ""],
  [`${source}/llms-full.txt`, `${source}/skills/hidden-skill\n${source}/p/hidden-example`],
  [`${source}/skills/a11y-audit`, '<title>A11y audit</title><meta name="description" content="Audit accessibility"><a href="https://github.com/plugin87/ux-ui-agent-skills">Source</a>MIT WCAG'],
  [`${source}/skills/hidden-skill`, "<title>Hidden skill</title>Use a hidden skill."],
  [`${source}/p/hidden-example`, "<title>Hidden example</title>Use a hidden example."],
  [`${source}/t/admin-panel`, '<title>Admin Panel</title>Responsive tables and semantic states.'],
  [`${source}/p/linear`, '<title>Linear design reference</title>Dark compact keyboard-first product UI.'],
  [`${source}/guides/design-md-for-codex`, '<title>DESIGN.md for Codex</title>Use persistent visual rules beside AGENTS.md.'],
  [`${source}/tools/figma`, '<title>Figma tools</title>Extract design context from Figma.'],
]);

test("syncs all DesignMD resource kinds into an inert local catalog", async () => {
  const catalog = await syncDesignMd({ source, fetcher: async (url) => pages.get(url) || "", maxPages: 100 });
  assert.deepEqual([...new Set(catalog.entries.map((entry) => entry.kind))].sort(), ["example", "guide", "skill", "template", "tool"]);
  assert.equal(catalog.entries.length, 9);
  assert.equal(catalog.entries.find((entry) => entry.kind === "skill").license, "MIT");
  assert.equal(catalog.entries.every((entry) => entry.status === "reference-only"), true);
  assert.equal(searchCatalog(catalog, { query: "keyboard", kind: "example" })[0].slug, "linear");
});

test("writes, reloads, searches, and verifies the local DesignMD snapshot", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "designmd-sync-"));
  try {
    const catalog = await syncDesignMd({ source, fetcher: async (url) => pages.get(url) || "", maxPages: 100 });
    const written = writeCatalog(catalog, root);
    const persisted = readPersistedCatalog(written.catalogPath);
    assert.equal(persisted.entries.length, 9);
    assert.equal(fs.existsSync(path.join(root, "content", "skill", "a11y-audit.md")), true);
    assert.equal(searchCatalog(persisted, { kind: "tool", query: "figma" })[0].title, "Figma tools");

    const cli = path.resolve(__dirname, "../skill/scripts/designer-pipeline.cjs");
    const result = spawnSync(process.execPath, [cli, "designmd", "verify", "--root", root, "--catalog", "designmd-catalog.json", "--json"], { cwd: root, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).entries, 9);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("preserves a valid snapshot when a later sync is blocked", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "designmd-preserve-"));
  try {
    const complete = await syncDesignMd({ source, fetcher: async (url) => pages.get(url) || "", maxPages: 100 });
    writeCatalog(complete, root);
    const before = fs.readFileSync(path.join(root, "designmd-catalog.json"), "utf8");
    const blocked = await syncDesignMd({ source, fetcher: async (url) => { if (url.endsWith("/skills/a11y-audit")) throw new Error("HTTP 503"); return pages.get(url) || ""; }, maxPages: 100 });
    assert.ok(blocked.errors.length > 0);
    const result = writeCatalog(blocked, root);
    assert.equal(result.published, false);
    assert.equal(result.preserved, true);
    assert.equal(fs.readFileSync(path.join(root, "designmd-catalog.json"), "utf8"), before);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rejects persisted content paths outside the catalog root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "designmd-path-"));
  try {
    const content = "secret";
    const hash = require("node:crypto").createHash("sha256").update(content).digest("hex");
    const catalog = {
      schema: "design-pipeline.designmd-catalog.v1",
      version: "1",
      source,
      entries: [{
        id: "designmd:skill:escape",
        kind: "skill",
        slug: "escape",
        title: "Escape",
        description: "Escape",
        url: `${source}/skills/escape`,
        sourceUrls: [],
        license: "MIT",
        status: "reference-only",
        contentPath: "../outside.txt",
        contentSha256: hash,
      }],
    };
    fs.writeFileSync(path.join(root, "catalog.json"), JSON.stringify(catalog));
    assert.throws(() => readPersistedCatalog(path.join(root, "catalog.json")), /escapes the catalog root/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const manifestFile = path.join(repoRoot, "skill/references/iart-motion-skills/manifest.json");
const {
  loadIartCatalog,
  routeIartRequest,
  searchIartSkills,
  verifyIartSnapshot,
} = require("../skill/scripts/iart-motion-skills-core.cjs");

test("bundles licensed iart packs and excludes the unlicensed pack", () => {
  const { manifest } = loadIartCatalog(manifestFile);
  assert.equal(manifest.index.repository, "https://github.com/iart-ai/motion-skills");
  assert.equal(manifest.index.revision, "945c4c70f7cf82a4502cfe3877ff8466972d2842");
  assert.equal(manifest.packs.length, 15);
  assert.equal(manifest.skills.length, 50);
  assert.deepEqual(manifest.excluded.map((entry) => entry.id), ["generative-illustration-skills"]);
  assert.equal(manifest.skills.filter((skill) => skill.activation === "automatic").length, 20);
  const verification = verifyIartSnapshot(manifestFile);
  assert.equal(verification.status, "ready", verification.issues.join("; "));
  assert.equal(
    fs.existsSync(path.join(path.dirname(manifestFile), "upstream/generative-illustration-skills")),
    false,
  );
  assert.match(
    fs.readFileSync(path.join(path.dirname(manifestFile), "upstream/motion-skills/LICENSE"), "utf8"),
    /Copyright \(c\) 2026 iart\.ai/,
  );
});

test("search ranks web-motion playbooks and keeps video skills explicit", () => {
  const gsap = searchIartSkills({ query: "scroll-triggered GSAP pin", limit: 3 });
  assert.equal(gsap.results[0].id, "web-animation-skills/gsap-web");
  assert.equal(gsap.results[0].activation, "automatic");
  assert.ok(fs.existsSync(gsap.results[0].skillPath));

  const caption = searchIartSkills({ query: "tiktok caption animation", limit: 1 });
  assert.equal(caption.results[0].id, "tiktok-video-skills/caption-animation");
  assert.equal(caption.results[0].activation, "explicit");

  const remotion = searchIartSkills({ query: "remotion video", limit: 1 });
  assert.equal(remotion.results[0].id, "motion-design-skills/remotion-video");
  assert.equal(remotion.results[0].activation, "explicit");
});

test("route selects a playbook from a domain brief without a skill id", () => {
  const caption = routeIartRequest({ query: "tiktok caption animation" });
  assert.equal(caption.status, "ready");
  assert.equal(caption.family, "motion-graphics");
  assert.equal(caption.selected.id, "tiktok-video-skills/caption-animation");
  assert.equal(caption.runtime, "hyperframes");
  assert.equal(caption.installRequired, false);
  assert.equal(caption.executableReady, false);
  assert.ok(caption.alternatives.length >= 1);

  const remotion = routeIartRequest({ query: "remotion video" });
  assert.equal(remotion.selected.id, "motion-design-skills/remotion-video");
  assert.equal(remotion.runtime, "remotion");
  assert.equal(remotion.installRequired, true);
  assert.equal(remotion.executableReady, false);

  const hover = routeIartRequest({ query: "scroll-triggered GSAP pin" });
  assert.equal(hover.family, "web-motion");
  assert.equal(hover.selected.id, "web-animation-skills/gsap-web");
  assert.equal(hover.runtime, "css-gsap");
  assert.notEqual(hover.selected.id, "motion-design-skills/remotion-video");
});

test("public CLI searches and verifies the installed bundled snapshot", () => {
  for (const args of [
    ["iart", "search", "--root", repoRoot, "--query", "accessible reduced motion", "--limit", "1", "--json"],
    ["iart", "route", "--root", repoRoot, "--query", "tiktok caption animation", "--json"],
    ["iart", "verify", "--root", repoRoot, "--json"],
  ]) {
    const child = spawnSync(process.execPath, [cli, ...args], { cwd: repoRoot, encoding: "utf8", windowsHide: true });
    assert.equal(child.status, 0, child.stderr || child.stdout);
    const output = JSON.parse(child.stdout);
    assert.equal(output.ok, true);
    assert.equal(output.status, "ready");
  }
});

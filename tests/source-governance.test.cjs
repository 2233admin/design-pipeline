"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { readLock } = require("../scripts/sources-lock.cjs");

const repoRoot = path.resolve(__dirname, "..");
const registryPath = path.join(repoRoot, "skill", "references", "companion-capabilities.json");
const auditScript = path.join(repoRoot, "skill", "scripts", "audit-capabilities.cjs");
const sourceRefs = {
  "skill/references/ux-research-methods.md": {
    sourceId: "awesome-ux-research-methods",
    revision: "4e5d0925e1a0d34894734611b225205aa10e5a2f",
    contentHash: "396572fd3133134972196037484def6b553fa28a2b69a7aba2f3aceeaf1cf711",
    license: "unverified",
    reviewedAt: "2026-08-26T00:00:00.000Z",
  },
  "skill/references/ai-interaction-patterns.md": {
    sourceId: "awesome-ux-ai-interaction",
    revision: "4e5d0925e1a0d34894734611b225205aa10e5a2f",
    contentHash: "a9733a2e6b2f1dd11fa00216ebd2e5e66cced4c98d9dcb980c6ceb778bb93808",
    license: "unverified",
    reviewedAt: "2026-08-26T00:00:00.000Z",
  },
  "skill/references/animation-opportunity-and-review.md": {
    sourceId: "emilkowalski-animation-review",
    revision: "f1090bec277140d02ed202440185ad9d02ac1490",
    contentHash: "936fccfc37aa3a13bd49e4a5b56e937bfbc92013edfcc89fa8cb61294e1adf1c",
    license: "MIT",
    reviewedAt: "2026-08-26T00:00:00.000Z",
    sourceFiles: [
      "skills/improve-animations/SKILL.md",
      "skills/find-animation-opportunities/SKILL.md",
      "skills/animation-vocabulary/SKILL.md",
      "skills/review-animations/SKILL.md",
    ],
  },
  "skill/references/react-doctor.md": {
    sourceId: "millionco-react-doctor",
    revision: "9791c32f61fb1477a4f8dd596ff80184ad26b2e3",
    contentHash: "9185b6f241eece1f0f9bb4c6264f50ad8fa081d379fe788c51593a2d343ffa24",
    license: "LicenseRef-Million-Modified-MIT",
    reviewedAt: "2026-10-13T00:00:00.000Z",
    sourceFiles: ["skills/react-doctor/SKILL.md", "skills/react-doctor/references/explain.md"],
  },
  "skill/references/web-interface-guidelines.md": {
    sourceId: "web-interface-guidelines",
    revision: "434b7f91364665f2f733b310ec54809bf8f37937",
    contentHash: "af6d9829e75ca2d5ed28cc2ded53b81a321bfc905f36302c795c0bbcbf509238",
    license: "MIT",
    reviewedAt: "2026-11-11T00:00:00.000Z",
    sourceFiles: ["command.md", "README.md"],
  },
  "skill/references/ibelick-ui-skills.md": {
    sourceId: "ibelick-ui-skills-rules",
    revision: "73fb128d046d1f0d74c2909cd26eb616e3415567",
    contentHash: "d74377eed8c3234594d7236d216aeba4f7bb01dcbdd22139f2b69d094b5578bb",
    license: "MIT",
    reviewedAt: "2026-11-11T00:00:00.000Z",
    sourceFiles: ["skills/baseline-ui/SKILL.md", "skills/fixing-metadata/SKILL.md", "skills/fixing-motion-performance/SKILL.md"],
  },
  "skill/references/animate-ui.md": {
    sourceId: "animate-ui",
    revision: "22a9236ae107328f8564edb7e3299375da3247af",
    contentHash: "8ff98fece9000f75e9b97574a372ea07524e6676cb050b081fa65978ef561e2a",
    license: "LicenseRef-MIT-Commons-Clause",
    reviewedAt: "2026-11-12T00:00:00.000Z",
    sourceFiles: ["skills/animate-ui/SKILL.md", "skills/animate-ui/references/catalog.md", "skills/animate-ui/references/vue.md", "skills/animate-ui/references/migrate.md", "skills/animate-ui/references/review.md", "LICENSE.md"],
  },
  "skill/references/modern-web-guidance.md": {
    sourceId: "modern-web-guidance",
    revision: "4dd968349e54ca45a05dd5c818fb035c9054b022",
    contentHash: "74cd02cb89bfb177a00e0dfe0a0b3235b81272fa478ba188ed676aef2b2274e9",
    license: "Apache-2.0",
    reviewedAt: "2026-11-12T00:00:00.000Z",
    sourceFiles: ["skills/modern-web-guidance/SKILL.md", "LICENSE"],
  },
};
const motionProfileSourceFiles = [
  "skills/improve-animations/SKILL.md",
  "skills/find-animation-opportunities/SKILL.md",
  "skills/animation-vocabulary/SKILL.md",
  "skills/review-animations/SKILL.md",
];
const auditedProfiles = {
  "ux-research-method-reference": "awesome-ux-research-methods",
  "ai-interaction-pattern-reference": "awesome-ux-ai-interaction",
  "animation-opportunity-reference": "emilkowalski-animation-review",
  "motion-accessibility-review": "motion-review-skill-contracts",
  "ui-ux-pro-max-companion": "ui-ux-pro-max",
};

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function frontmatter(relativePath) {
  const content = read(relativePath);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  assert.ok(match, `${relativePath} must start with YAML frontmatter`);
  const values = Object.fromEntries(
    [...match[1].matchAll(/^  ([A-Za-z][A-Za-z0-9]*):\s*(.+)$/gm)].map(([, key, value]) => [
      key,
      value.replace(/^['"]|['"]$/g, ""),
    ]),
  );
  return values;
}

function writeJson(root, name, value) {
  const target = path.join(root, name);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
  return target;
}

function runAudit(root, sourceEvidence) {
  return spawnSync(
    process.execPath,
    [
      auditScript,
      "--root",
      root,
      "--registry",
      registryPath,
      "--source-evidence",
      writeJson(root, "source-evidence.json", sourceEvidence),
      "--json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, DESIGN_PIPELINE_NOW: "2026-08-26T00:00:00.000Z" },
    },
  );
}

test("reference files carry one fixed source evidence shape", () => {
  for (const [relativePath, expected] of Object.entries(sourceRefs)) {
    const metadata = frontmatter(relativePath);
    assert.equal(metadata.id, expected.sourceId);
    assert.equal(metadata.kind, "github");
    assert.equal(metadata.reviewedRevision, expected.revision);
    assert.equal(metadata.reviewedContentHash, expected.contentHash);
    // sources:update moves reviewedAt whenever it confirms the locked revision is still upstream HEAD.
    assert.match(metadata.reviewedAt, /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    assert.ok(metadata.reviewedAt >= expected.reviewedAt, relativePath);
    assert.equal(metadata.license, expected.license);
    assert.match(metadata.contentHashScope, /sourceFiles|single-source/i);
    if (expected.sourceFiles) {
      assert.deepEqual(metadata.sourceFiles.split(", "), expected.sourceFiles);
    }
    assert.match(metadata.useBoundary, /reference-only/i);
    assert.match(read(relativePath), /do not (?:install|execute|copy|import)/i);
  }
});

test("React Doctor stays a pinned reference-only record outside the package", () => {
  const metadata = frontmatter("skill/references/react-doctor.md");
  assert.equal(metadata.url, `https://github.com/millionco/react-doctor/tree/${metadata.reviewedRevision}`);
  assert.equal(metadata.freshnessDays, "365");
  assert.match(metadata.useBoundary, /^reference-only;/);
  assert.notEqual(metadata.license, "MIT");
  assert.equal(fs.existsSync(path.join(repoRoot, "skill", "vendor", "react-doctor")), false);
  const resources = JSON.parse(read("skill/references/package-resources.json"));
  assert.equal(resources.required.some((file) => /react-doctor\//.test(file)), false);
  assert.doesNotMatch(read("skill/references/react-doctor.md"), /react\.doctor\/prompts/);
});

test("tracked companion sources expose the same baseline metadata", () => {
  const registry = JSON.parse(read("skill/references/companion-capabilities.json"));
  for (const [profileId, sourceId] of Object.entries(auditedProfiles)) {
    const profile = registry.profiles.find((item) => item.id === profileId);
    assert.ok(profile, `missing profile ${profileId}`);
    assert.equal(profile.sourceMeta.id, sourceId);
    assert.match(profile.sourceMeta.reviewedRevision, /^[0-9a-f]{40}$/);
    assert.match(profile.sourceMeta.reviewedAt, /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/);
    assert.ok(profile.sourceMeta.reviewedAt >= "2026-08-26T00:00:00.000Z", profileId);
    assert.ok(profile.sourceMeta.license);
    const expected = Object.values(sourceRefs).find(
      (reference) => reference.sourceId === sourceId,
    );
    const expectedSourceFiles =
      expected?.sourceFiles ??
      (sourceId === "motion-review-skill-contracts" ? motionProfileSourceFiles : undefined);
    if (expectedSourceFiles) {
      assert.equal(
        profile.sourceMeta.contentHashScope,
        "ordered UTF-8 sourceFiles with path-and-newline separators",
      );
      assert.deepEqual(profile.sourceMeta.sourceFiles, expectedSourceFiles);
    }
    assert.match(profile.sourceMeta.useBoundary, /companion|reference-only/i);
  }
});

test("the existing audit reports current, drifted, and missing evidence deterministically", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-source-governance-"));
  try {
    const registry = JSON.parse(read("skill/references/companion-capabilities.json"));
    const profiles = registry.profiles.filter((profile) => Object.hasOwn(auditedProfiles, profile.id));
    const sourceEvidence = {
      schema: "design-pipeline.source-evidence.v1",
      generatedAt: "2026-08-26T00:00:00.000Z",
      sources: profiles.map(({ sourceMeta }) => ({
        sourceId: sourceMeta.id,
        observedAt: "2026-08-26T00:00:00.000Z",
        revision: sourceMeta.reviewedRevision,
        ...(sourceMeta.reviewedContentHash ? { contentHash: sourceMeta.reviewedContentHash } : {}),
        ...(sourceMeta.reviewedMarkers ? { markers: sourceMeta.reviewedMarkers } : {}),
      })),
    };

    const current = runAudit(root, sourceEvidence);
    assert.equal(current.status, 0, current.stderr || current.stdout);
    const currentSnapshot = JSON.parse(current.stdout).snapshot;
    assert.deepEqual(
      Object.fromEntries(
        currentSnapshot.profiles
          .filter(({ profileId }) => Object.hasOwn(auditedProfiles, profileId))
          .map(({ profileId, status }) => [profileId, status]),
      ),
      {
        "ux-research-method-reference": "CURRENT",
        "ai-interaction-pattern-reference": "CURRENT",
        "animation-opportunity-reference": "CURRENT",
        "motion-accessibility-review": "CURRENT",
        "ui-ux-pro-max-companion": "CURRENT",
      },
    );

    const driftedEvidence = {
      ...sourceEvidence,
      sources: sourceEvidence.sources.map((source) =>
        source.sourceId === auditedProfiles["motion-accessibility-review"]
          ? { ...source, revision: "f".repeat(40) }
          : source,
      ),
    };
    const drifted = runAudit(root, driftedEvidence);
    assert.equal(drifted.status, 0, drifted.stderr || drifted.stdout);
    assert.equal(JSON.parse(drifted.stdout).snapshot.profiles.find((item) => item.profileId === "motion-accessibility-review").status, "CHANGED");

    const contentHashDriftedEvidence = {
      ...sourceEvidence,
      sources: sourceEvidence.sources.map((source) =>
        source.sourceId === auditedProfiles["animation-opportunity-reference"]
          ? { ...source, contentHash: "f".repeat(64) }
          : source,
      ),
    };
    const contentHashDrifted = runAudit(root, contentHashDriftedEvidence);
    assert.equal(contentHashDrifted.status, 0, contentHashDrifted.stderr || contentHashDrifted.stdout);
    assert.equal(
      JSON.parse(contentHashDrifted.stdout).snapshot.profiles.find(
        (item) => item.profileId === "animation-opportunity-reference",
      ).status,
      "CHANGED",
    );

    const missing = runAudit(root, {
      ...sourceEvidence,
      sources: sourceEvidence.sources.filter(
        (source) => source.sourceId !== auditedProfiles["motion-accessibility-review"],
      ),
    });
    assert.equal(missing.status, 0, missing.stderr || missing.stdout);
    assert.equal(
      JSON.parse(missing.stdout).snapshot.profiles.find((item) => item.profileId === "motion-accessibility-review").status,
      "UNKNOWN",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Reference skills studied for ideas only (non-commercial licenses); see
// openspec/changes/archive/2026-10-15-pin-film-reference-provenance.
const referenceSkills = {
  "skill/references/reference-skill-motion-web.md": {
    sourceId: "motion-web-reference-skill",
    url: "https://github.com/feitangyuan/motion-web/tree/5f4e40f1253e11e28850d08dce28b9b7e4320115",
    revision: "5f4e40f1253e11e28850d08dce28b9b7e4320115",
    contentHash: "68945441b0bbd6b79f2849206c019c2c7bc01a13a2bbd5c267c9c3d5c069c1b4",
    license: "CC-BY-NC-4.0",
  },
  "skill/references/reference-skill-onetake.md": {
    sourceId: "onetake-reference-skill",
    url: "https://github.com/feitangyuan/onetake/tree/013a61ac8d98883c73733f59c06e49e9ba444f14",
    revision: "013a61ac8d98883c73733f59c06e49e9ba444f14",
    contentHash: "b1748e94eb8e09a13a247345d8d9eee9b244469e7557d65e5d7dec8984ad2d5d",
    license: "PolyForm-Noncommercial-1.0.0",
  },
};

test("non-commercial reference skills are pinned, ideas-only and fresh", () => {
  for (const [relativePath, expected] of Object.entries(referenceSkills)) {
    const metadata = frontmatter(relativePath);
    assert.equal(metadata.id, expected.sourceId);
    assert.equal(metadata.url, expected.url);
    assert.doesNotMatch(metadata.url, /2233admin/, "cite the canonical repository, not a fork");
    assert.equal(metadata.reviewedRevision, expected.revision);
    assert.equal(metadata.reviewedContentHash, expected.contentHash);
    assert.equal(metadata.contentHashScope, "ordered UTF-8 sourceFiles with path-and-newline separators");
    assert.deepEqual(metadata.sourceFiles.split(", "), ["README.md", "LICENSE"]);
    assert.equal(metadata.license, expected.license);
    assert.equal(metadata.codeCopied, "false");
    assert.match(metadata.useBoundary, /reference-only; ideas only/);
    // Freshness is the lock's job now: the weekly sources:update compares the locked revision with
    // upstream HEAD and moves reviewedAt only when the revision moves, so a quiet upstream is current.
    assert.equal(metadata.reviewedRevision, readLock(repoRoot).sources.find((entry) => (entry.documents || []).includes(relativePath)).revision);
    assert.ok(Number.isFinite(Date.parse(metadata.reviewedAt)), relativePath);
  }
});

// text=auto once rewrote line endings inside upstream GIFs, PNGs and SVGs (iart, holosticker) and the
// manifests were regenerated from the damaged bytes. Every upstream snapshot is stored unconverted.
test("every vendored upstream file is stored without line-ending conversion", () => {
  const bundles = fs.readdirSync(path.join(repoRoot, "skill", "vendor"), { withFileTypes: true }).filter((entry) => entry.isDirectory() && fs.existsSync(path.join(repoRoot, "skill", "vendor", entry.name, "upstream")));
  assert.ok(bundles.length >= 13);
  const probes = bundles.map((entry) => `skill/vendor/${entry.name}/upstream/probe.gif`);
  const result = spawnSync("git", ["check-attr", "text", "--", ...probes], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  for (const line of result.stdout.trim().split("\n")) assert.match(line, /: text: unset$/, line);
});

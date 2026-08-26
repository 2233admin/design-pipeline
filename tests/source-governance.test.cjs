"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const registryPath = path.join(repoRoot, "skill", "references", "companion-capabilities.json");
const auditScript = path.join(repoRoot, "skill", "scripts", "audit-capabilities.cjs");
const sourceRefs = {
  "skill/references/ux-research-methods.md": {
    sourceId: "awesome-ux-research-methods",
    revision: "4e5d0925e1a0d34894734611b225205aa10e5a2f",
    contentHash: "396572fd3133134972196037484def6b553fa28a2b69a7aba2f3aceeaf1cf711",
    license: "unverified",
  },
  "skill/references/ai-interaction-patterns.md": {
    sourceId: "awesome-ux-ai-interaction",
    revision: "4e5d0925e1a0d34894734611b225205aa10e5a2f",
    contentHash: "a9733a2e6b2f1dd11fa00216ebd2e5e66cced4c98d9dcb980c6ceb778bb93808",
    license: "unverified",
  },
  "skill/references/animation-opportunity-and-review.md": {
    sourceId: "emilkowalski-animation-review",
    revision: "d23d7f88a2e21c9e4b1418c7abe420f5c1052ba7",
    contentHash: "fff4cfc7619acb1467b0e3fafac6a4075fead4f7e90711a772af2c0280090139",
    license: "MIT",
    sourceFiles: [
      "skills/improve-animations/SKILL.md",
      "skills/find-animation-opportunities/SKILL.md",
      "skills/animation-vocabulary/SKILL.md",
      "skills/review-animations/SKILL.md",
    ],
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
    assert.equal(metadata.reviewedAt, "2026-08-26T00:00:00.000Z");
    assert.equal(metadata.license, expected.license);
    assert.match(metadata.contentHashScope, /sourceFiles|single-source/i);
    if (expected.sourceFiles) {
      assert.deepEqual(metadata.sourceFiles.split(", "), expected.sourceFiles);
    }
    assert.match(metadata.useBoundary, /reference-only/i);
    assert.match(read(relativePath), /do not (?:install|execute|copy|import)/i);
  }
});

test("tracked companion sources expose the same baseline metadata", () => {
  const registry = JSON.parse(read("skill/references/companion-capabilities.json"));
  for (const [profileId, sourceId] of Object.entries(auditedProfiles)) {
    const profile = registry.profiles.find((item) => item.id === profileId);
    assert.ok(profile, `missing profile ${profileId}`);
    assert.equal(profile.sourceMeta.id, sourceId);
    assert.match(profile.sourceMeta.reviewedRevision, /^[0-9a-f]{40}$/);
    assert.match(profile.sourceMeta.reviewedAt, /^2026-08-26T00:00:00\.000Z$/);
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

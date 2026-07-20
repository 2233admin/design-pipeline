#!/usr/bin/env node

const fs = require("node:fs");
const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "DESIGN.md",
  "MOTION.md",
  "skill/SKILL.md",
  "skill/scripts/check-deps.cjs",
  "skill/scripts/record-feedback.cjs",
  "skill/scripts/design-synthesis-core.cjs",
  "skill/scripts/check-design-foundation.cjs",
  "skill/scripts/motion-foundation-core.cjs",
  "skill/scripts/check-motion-foundation.cjs",
  "skill/scripts/palette-foundation-core.cjs",
  "skill/scripts/check-palette-foundation.cjs",
  "skill/scripts/website-cloning-manifest-core.cjs",
  "skill/scripts/website-clone-foundation-core.cjs",
  "skill/scripts/check-website-clone-foundations.cjs",
  "skill/scripts/init-design-synthesis.cjs",
  "skill/scripts/advance-design-synthesis.cjs",
  "skill/scripts/audit-capabilities.cjs",
  "skill/scripts/prepare-publication.cjs",
  "skill/scripts/reconcile-publication.cjs",
  "skill/scripts/evaluate-anti-slop.cjs",
  "skill/references/open-source-readiness.md",
  "skill/references/agent-interface.md",
  "skill/references/capability-routing.md",
  "skill/references/companion-capabilities.json",
  "skill/references/feedback-loop.md",
  "skill/references/feedback-observation.schema.json",
  "skill/references/design-synthesis.md",
  "skill/references/design-synthesis.schema.json",
  "skill/references/upstream-capability-sync.md",
  "skill/references/source-evidence.schema.json",
  "skill/references/capability-audit.schema.json",
  "skill/references/publication-request.schema.json",
  "skill/references/publication-receipt.schema.json",
  "skill/references/anti-slop-review.md",
  "skill/references/anti-slop-rubric.json",
  "skill/references/anti-slop-rubric.schema.json",
  "skill/references/anti-slop-evidence.schema.json",
  "skill/references/anti-slop-review.schema.json",
  "skill/references/palette-evidence.schema.json",
  "skill/references/motion-foundation.md",
  "skill/references/motion-foundation.schema.json",
  "skill/references/motion-primitives.json",
  "skill/references/motion-spec.md",
  "skill/references/qa-checklist.md",
  "skill/references/website-cloning.md",
  "skill/references/website-clone-component-spec.md",
  "skill/references/website-cloning-manifest.schema.json",
  "skill/scripts/init-website-clone.cjs",
  "skill/scripts/evaluate-website-clone.cjs",
  "THIRD_PARTY_NOTICES.md",
  "openspec/project.md",
  "openspec/specs/design-pipeline/spec.md",
  "openspec/changes/bootstrap-design-pipeline/proposal.md",
  "openspec/changes/bootstrap-design-pipeline/design.md",
  "openspec/changes/bootstrap-design-pipeline/tasks.md",
  "openspec/changes/bootstrap-design-pipeline/specs/design-pipeline/spec.md",
  "scripts/package.cjs",
];

let failed = false;

for (const file of requiredFiles) {
  const ok = fs.existsSync(path.join(repoRoot, file));
  console.log(`${ok ? "OK" : "FAIL"} ${file}`);
  if (!ok) failed = true;
}

const skillMd = fs.readFileSync(path.join(repoRoot, "skill/SKILL.md"), "utf8");
const frontmatter = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
if (!frontmatter) {
  console.log("FAIL skill/SKILL.md frontmatter");
  failed = true;
} else {
  const hasName = /^name:\s*design-pipeline\s*$/m.test(frontmatter[1]);
  const hasDescription = /^description:\s*\S+/m.test(frontmatter[1]);
  console.log(`${hasName ? "OK" : "FAIL"} skill/SKILL.md frontmatter name`);
  console.log(`${hasDescription ? "OK" : "FAIL"} skill/SKILL.md frontmatter description`);
  if (!hasName || !hasDescription) failed = true;
}

const referenceSources = [
  "skill/SKILL.md",
  "skill/references/companion-skills.md",
  "skill/references/capability-routing.md",
  "skill/references/curation-policy.md",
  "skill/references/development-compatibility.md",
  "skill/references/design-synthesis.md",
  "skill/references/feedback-loop.md",
  "skill/references/open-source-readiness.md",
  "skill/references/qa-checklist.md",
  "skill/references/self-check.md",
  "skill/references/upstream-capability-sync.md",
  "skill/references/anti-slop-review.md",
  "skill/references/website-cloning.md",
  "README.md",
  "CONTRIBUTING.md",
];

for (const sourceFile of referenceSources) {
  const fullPath = path.join(repoRoot, sourceFile);
  if (!fs.existsSync(fullPath)) continue;
  const text = fs.readFileSync(fullPath, "utf8");
  const matches = text.matchAll(/(?:`)?((?:references|scripts)\/[A-Za-z0-9._/-]+)(?:`)?/g);
  for (const match of matches) {
    const rel = match[1];
    const base = sourceFile.startsWith("skill/") ? path.join(repoRoot, "skill") : repoRoot;
    const candidate = path.join(base, rel);
    const skillCandidate = path.join(repoRoot, "skill", rel);
    const ok = fs.existsSync(candidate) || fs.existsSync(skillCandidate);
    console.log(`${ok ? "OK" : "FAIL"} reference ${sourceFile} -> ${rel}`);
    if (!ok) failed = true;
  }
}

// Deterministic self-check: only ship skill in a temp root (CI-safe).
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-qa-"));
const tempSkill = path.join(tempRoot, "design-pipeline");
fs.cpSync(path.join(repoRoot, "skill"), tempSkill, { recursive: true });

const check = spawnSync(
  process.execPath,
  [path.join(repoRoot, "skill/scripts/check-deps.cjs"), "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    env: { ...process.env, CODEX_SKILLS_DIR: tempRoot },
  },
);

fs.rmSync(tempRoot, { recursive: true, force: true });

if (check.status !== 0) {
  console.log("FAIL self-check exited non-zero");
  process.stdout.write(check.stdout || "");
  process.stderr.write(check.stderr || "");
  failed = true;
} else {
  try {
    const parsed = JSON.parse(check.stdout);
    console.log(`OK self-check result=${parsed.result}`);
    if (parsed.result !== "OK") failed = true;
  } catch (err) {
    console.log("FAIL self-check JSON parse");
    process.stdout.write(check.stdout || "");
    failed = true;
  }
}

const foundation = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, "skill/scripts/check-design-foundation.cjs"),
    "--project-root",
    repoRoot,
    "--json",
  ],
  { cwd: repoRoot, encoding: "utf8" },
);

if (foundation.status !== 0) {
  console.log("FAIL project DESIGN.md foundation check");
  process.stdout.write(foundation.stdout || "");
  process.stderr.write(foundation.stderr || "");
  failed = true;
} else {
  try {
    const parsed = JSON.parse(foundation.stdout);
    console.log(`OK project DESIGN.md foundation status=${parsed.status}`);
    if (parsed.status !== "ready") failed = true;
  } catch (err) {
    console.log("FAIL project DESIGN.md foundation JSON parse");
    process.stdout.write(foundation.stdout || "");
    failed = true;
  }
}

const motionFoundation = spawnSync(
  process.execPath,
  [
    path.join(repoRoot, "skill/scripts/check-motion-foundation.cjs"),
    "--project-root",
    repoRoot,
    "--json",
  ],
  { cwd: repoRoot, encoding: "utf8" },
);

if (motionFoundation.status !== 0) {
  console.log("FAIL project MOTION.md foundation check");
  process.stdout.write(motionFoundation.stdout || "");
  process.stderr.write(motionFoundation.stderr || "");
  failed = true;
} else {
  try {
    const parsed = JSON.parse(motionFoundation.stdout);
    console.log(`OK project MOTION.md foundation status=${parsed.status}`);
    const requiredModelFields = [
      "schema",
      "name",
      "posture",
      "primitiveRegistry",
      "principles",
      "primitives",
      "proceduralMotion",
      "runtimePolicy",
      "reducedMotion",
      "sourceDecisions",
    ];
    const modelReady =
      parsed.status === "ready" &&
      parsed.foundation?.schema === "design-pipeline.motion-foundation.v0.1" &&
      requiredModelFields.every((field) => Object.hasOwn(parsed.foundation, field));
    console.log(`${modelReady ? "OK" : "FAIL"} project MOTION.md normalized model`);
    if (!modelReady) failed = true;
  } catch (err) {
    console.log("FAIL project MOTION.md foundation JSON parse");
    process.stdout.write(motionFoundation.stdout || "");
    failed = true;
  }
}

// Packaging must work for GitHub Releases.
const packageEnv = {
  ...process.env,
  PACKAGE_VERSION: process.env.PACKAGE_VERSION || "0.0.0-qa",
};
const packageScript = path.join(repoRoot, "scripts/package.cjs");
const pack = spawnSync(process.execPath, [packageScript], {
  cwd: repoRoot,
  encoding: "utf8",
  env: packageEnv,
});
process.stdout.write(pack.stdout || "");
process.stderr.write(pack.stderr || "");
if (pack.status !== 0) {
  console.log("FAIL package.cjs");
  failed = true;
} else {
  const tgz = path.join(repoRoot, "dist", "design-pipeline-skill.tgz");
  const zip = path.join(repoRoot, "dist", "design-pipeline-skill.zip");
  const archivePaths = [tgz, zip];
  const archivesPresent = archivePaths.every((archivePath) => {
    const present = fs.existsSync(archivePath);
    console.log(
      `${present ? "OK" : "FAIL"} ${path.relative(repoRoot, archivePath)}`,
    );
    return present;
  });
  if (!archivesPresent) {
    failed = true;
  } else {
    const archiveHashes = new Map(
      archivePaths.map((archivePath) => [
        archivePath,
        crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex"),
      ]),
    );
    const repeatPack = spawnSync(process.execPath, [packageScript], {
      cwd: repoRoot,
      encoding: "utf8",
      env: packageEnv,
    });
    if (repeatPack.status !== 0) {
      process.stdout.write(repeatPack.stdout || "");
      process.stderr.write(repeatPack.stderr || "");
      console.log("FAIL package.cjs reproducibility rerun");
      failed = true;
    } else {
      const reproducible = archivePaths.every(
        (archivePath) =>
          archiveHashes.get(archivePath) ===
          crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex"),
      );
      console.log(`${reproducible ? "OK" : "FAIL"} reproducible package archives`);
      if (!reproducible) failed = true;

      const invalidEpochPack = spawnSync(process.execPath, [packageScript], {
        cwd: repoRoot,
        encoding: "utf8",
        env: { ...packageEnv, SOURCE_DATE_EPOCH: "invalid" },
      });
      const rejectsInvalidEpoch =
        invalidEpochPack.status !== 0 &&
        (invalidEpochPack.stderr || "").includes("SOURCE_DATE_EPOCH");
      console.log(
        `${rejectsInvalidEpoch ? "OK" : "FAIL"} package rejects invalid SOURCE_DATE_EPOCH`,
      );
      if (!rejectsInvalidEpoch) failed = true;

      const preservesArchives = archivePaths.every(
        (archivePath) =>
          archiveHashes.get(archivePath) ===
          crypto.createHash("sha256").update(fs.readFileSync(archivePath)).digest("hex"),
      );
      console.log(
        `${preservesArchives ? "OK" : "FAIL"} package failure preserves existing archives`,
      );
      if (!preservesArchives) failed = true;
    }
  }
}

// Source URL sanity for Emil pack
const companion = fs.readFileSync(
  path.join(repoRoot, "skill/references/companion-skills.md"),
  "utf8",
);
if (companion.includes("emilkowalski/skill`") || companion.includes("emilkowalski/skill |")) {
  console.log("FAIL companion-skills still references singular emilkowalski/skill");
  failed = true;
} else {
  console.log("OK companion-skills uses emilkowalski/skills");
}

const routing = fs.readFileSync(
  path.join(repoRoot, "skill/references/capability-routing.md"),
  "utf8",
);
const animeRoutingMarkers = [
  "Anime.js v4.5",
  "createLayout",
  "splitText",
  "createDraggable",
  "onScroll",
  "registerAdapter()",
  "Three.js",
  "jitter",
  "seed",
];
const missingAnimeRouting = animeRoutingMarkers.filter((marker) => !routing.includes(marker));
if (missingAnimeRouting.length) {
  console.log(`FAIL Anime.js capability routing missing: ${missingAnimeRouting.join(", ")}`);
  failed = true;
} else {
  console.log("OK Anime.js v4.5 capability routing");
}

try {
  const companionRegistry = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "skill/references/companion-capabilities.json"),
      "utf8",
    ),
  );
  const ok =
    companionRegistry.schema === "design-pipeline-companions.v1" &&
    Array.isArray(companionRegistry.groups) &&
    Array.isArray(companionRegistry.profiles) &&
    companionRegistry.profiles.length > 1;
  console.log(`${ok ? "OK" : "FAIL"} companion capability registry`);
  if (!ok) failed = true;
} catch (error) {
  console.log(`FAIL companion capability registry: ${error.message}`);
  failed = true;
}

try {
  const feedbackSchema = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "skill/references/feedback-observation.schema.json"),
      "utf8",
    ),
  );
  const ok =
    feedbackSchema.$schema === "https://json-schema.org/draft/2020-12/schema" &&
    feedbackSchema.properties?.privacy?.properties?.remotePublished?.type === "boolean" &&
    feedbackSchema.properties?.publication?.type?.includes("object");
  console.log(`${ok ? "OK" : "FAIL"} feedback observation schema`);
  if (!ok) failed = true;
} catch (error) {
  console.log(`FAIL feedback observation schema: ${error.message}`);
  failed = true;
}

try {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "skill/references/design-synthesis.schema.json"),
      "utf8",
    ),
  );
  const ok =
    schema.$schema === "https://json-schema.org/draft/2020-12/schema" &&
    schema.properties?.schema?.const === "design-pipeline.design-synthesis.v1";
  console.log(`${ok ? "OK" : "FAIL"} design-synthesis manifest schema`);
  if (!ok) failed = true;
} catch (error) {
  console.log(`FAIL design-synthesis manifest schema: ${error.message}`);
  failed = true;
}

for (const [file, schemaId] of [
  ["source-evidence.schema.json", "design-pipeline.source-evidence.v1"],
  ["capability-audit.schema.json", "design-pipeline.capability-audit.v1"],
  ["publication-request.schema.json", "design-pipeline.publication-request.v1"],
  ["publication-receipt.schema.json", "design-pipeline.publication-receipt.v1"],
  ["anti-slop-rubric.schema.json", "design-pipeline.anti-slop-rubric.v1"],
  ["anti-slop-evidence.schema.json", "design-pipeline.anti-slop-evidence.v1"],
  ["anti-slop-review.schema.json", "design-pipeline.anti-slop-review.v1"],
  ["palette-evidence.schema.json", "design-pipeline.palette-evidence.v1"],
]) {
  try {
    const schema = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "skill/references", file), "utf8"),
    );
    const ok =
      schema.$schema === "https://json-schema.org/draft/2020-12/schema" &&
      schema.properties?.schema?.const === schemaId;
    console.log(`${ok ? "OK" : "FAIL"} ${file}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`FAIL ${file}: ${error.message}`);
    failed = true;
  }
}

try {
  const motionSchema = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "skill/references/motion-foundation.schema.json"),
      "utf8",
    ),
  );
  const ok =
    motionSchema.$schema === "https://json-schema.org/draft/2020-12/schema" &&
    motionSchema.properties?.schema?.const ===
      "design-pipeline.motion-foundation.v0.1";
  console.log(`${ok ? "OK" : "FAIL"} motion-foundation.schema.json`);
  if (!ok) failed = true;
} catch (error) {
  console.log(`FAIL motion-foundation.schema.json: ${error.message}`);
  failed = true;
}

try {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "skill/references/website-cloning-manifest.schema.json"),
      "utf8",
    ),
  );
  const ok = schema.$schema === "https://json-schema.org/draft/2020-12/schema";
  console.log(`${ok ? "OK" : "FAIL"} website-cloning manifest schema`);
  if (!ok) failed = true;
} catch (error) {
  console.log(`FAIL website-cloning manifest schema: ${error.message}`);
  failed = true;
}

const tests = spawnSync(
  process.execPath,
  [
    "--test",
    "tests/website-cloning-init.test.cjs",
    "tests/check-deps.test.cjs",
    "tests/record-feedback.test.cjs",
    "tests/design-synthesis.test.cjs",
    "tests/capability-audit.test.cjs",
    "tests/publication-bridge.test.cjs",
    "tests/anti-slop-review.test.cjs",
    "tests/palette-foundation.test.cjs",
    "tests/motion-foundation.test.cjs",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);
process.stdout.write(tests.stdout);
process.stderr.write(tests.stderr);
if (tests.status !== 0) {
  console.log("FAIL repository tests");
  failed = true;
} else {
  console.log("OK repository tests");
}

process.exitCode = failed ? 1 : 0;

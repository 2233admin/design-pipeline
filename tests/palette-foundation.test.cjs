"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const skillRoot = path.join(repoRoot, "skill");
const initScript = path.join(skillRoot, "scripts", "init-website-clone.cjs");
const evaluateScript = path.join(skillRoot, "scripts", "evaluate-website-clone.cjs");
const paletteCheckScript = path.join(
  skillRoot,
  "scripts",
  "check-palette-foundation.cjs",
);
const roots = new Set();

const browserCapabilities = [
  "navigate",
  "report-final-url-status",
  "set-viewport",
  "set-device-scale",
  "screenshot",
  "evaluate",
  "scroll",
  "click",
  "hover",
  "focus",
  "type",
  "resize",
  "wait-for-fonts",
  "wait-for-page-ready",
  "record-environment",
  "record-provenance",
];
const builderCapabilities = [
  "read-spec",
  "read-evidence",
  "write-files",
  "run-project-checks",
];
const evidenceCapabilities = [
  "render-reference",
  "render-implementation",
  "content-diff",
  "responsive-diff",
  "state-diff",
  "interaction-replay",
  "mapped-interaction-replay",
  "record-evidence-provenance",
];

test.after(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function runNode(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
  });
}

function initializeProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-palette-"));
  roots.add(projectRoot);
  fs.copyFileSync(path.join(repoRoot, "DESIGN.md"), path.join(projectRoot, "DESIGN.md"));
  fs.copyFileSync(path.join(repoRoot, "MOTION.md"), path.join(projectRoot, "MOTION.md"));
  const result = runNode(
    initScript,
    [
      "--project-root",
      projectRoot,
      "--change-id",
      "palette-first",
      "--url",
      "https://example.com/",
      "--fidelity",
      "adaptive",
    ],
    projectRoot,
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return projectRoot;
}

function preparePassingCloneEvaluation(projectRoot) {
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  const manifestPath = path.join(changeRoot, "website-cloning.json");
  const evidencePath = path.join(changeRoot, "verification.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const lastProbe = {
    at: "2026-07-20T00:00:00.000Z",
    ok: true,
    message: "ready",
  };

  manifest.ports = {
    browser: {
      status: "ready",
      adapter: "test-browser",
      requiredCapabilities: browserCapabilities,
      availableCapabilities: browserCapabilities,
      lastProbe,
    },
    builder: {
      status: "ready",
      adapter: "test-builder",
      requiredCapabilities: builderCapabilities,
      availableCapabilities: builderCapabilities,
      lastProbe,
    },
    evidence: {
      status: "ready",
      adapter: "test-evidence",
      requiredCapabilities: evidenceCapabilities,
      availableCapabilities: evidenceCapabilities,
      lastProbe,
    },
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(
    evidencePath,
    `${JSON.stringify(
      {
        schema: "design-pipeline.website-cloning.verification.v1",
        targets: [
          {
            targetId: "example-com",
            textCoverage: 1,
            assetCoverage: 1,
            interactionCoverage: 1,
            viewports: manifest.fidelity.viewports.map((viewport) => ({
              ...viewport,
              unresolvedDifferences: [],
            })),
            unresolvedDifferences: [],
          },
        ],
        mappings: [],
      },
      null,
      2,
    )}\n`,
  );

  return { changeRoot, evidencePath };
}

function writeReadyPalette(changeRoot) {
  const researchRoot = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
  );
  const palettePath = path.join(researchRoot, "palette-evidence.json");
  const tokensPath = path.join(researchRoot, "design-tokens.md");
  const evidenceRoot = path.join(researchRoot, "evidence");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceRoot, "dom-colors.json"),
    `${JSON.stringify({ source: "computed-style", colors: ["#FFFFFF", "#191919"] })}\n`,
  );
  fs.writeFileSync(path.join(evidenceRoot, "hero.png"), "test-raster-evidence\n");
  const palette = {
    schema: "design-pipeline.palette-evidence.v1",
    targetId: "example-com",
    sourceUrl: "https://example.com/",
    status: "ready",
    capturedAt: "2026-07-20T00:00:00.000Z",
    sources: {
      domComputed: {
        status: "ready",
        evidencePaths: ["evidence/dom-colors.json"],
        colors: [
          { hex: "#FFFFFF", role: "canvas", region: "page-shell" },
          { hex: "#191919", role: "primary-text", region: "campaign-title" },
        ],
      },
      rasterMedia: {
        status: "ready",
        evidencePaths: ["evidence/hero.png"],
        regions: ["hero"],
        colors: [
          { hex: "#C8D8F0", role: "media-cool", region: "hero-background" },
          { hex: "#7DE4D2", role: "media-mint", region: "hero-energy" },
        ],
      },
    },
    semanticRoles: [
      { role: "canvas", sourceColor: "#FFFFFF", targetToken: "--surface-canvas" },
      { role: "primary-text", sourceColor: "#191919", targetToken: "--text-primary" },
      { role: "media-cool", sourceColor: "#C8D8F0", targetToken: "--media-cool" },
      { role: "media-mint", sourceColor: "#7DE4D2", targetToken: "--media-mint" },
    ],
    relationships: {
      coverage: [
        { role: "canvas", min: 0.4, max: 0.7 },
        { role: "media-cool", min: 0.15, max: 0.45 },
      ],
      luminanceHierarchy: ["canvas > media-cool", "primary-text < canvas"],
      saturationPosture: "Low-chroma neutral field with localized cool energy.",
      temperaturePosture: "Cool media field balanced by neutral paper and ink.",
    },
    targetProjectTokens: [
      { token: "--surface-canvas", value: "#FFFFFF", sourceRole: "canvas" },
      { token: "--text-primary", value: "#191919", sourceRole: "primary-text" },
      { token: "--media-cool", value: "#C8D8F0", sourceRole: "media-cool" },
      { token: "--media-mint", value: "#7DE4D2", sourceRole: "media-mint" },
    ],
    notes: [],
  };
  fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);
  fs.writeFileSync(
    tokensPath,
    `# Design Tokens: example-com

## Palette Evidence

DOM and raster evidence are recorded in \`palette-evidence.json\`.

## Semantic Roles

- canvas
- primary-text
- media-cool
- media-mint

## Palette Relationships

Neutral paper owns the field while cool media colors remain localized to the hero.

## Target-Project Token Mapping

- \`--surface-canvas: #FFFFFF\`
- \`--text-primary: #191919\`
- \`--media-cool: #C8D8F0\`
- \`--media-mint: #7DE4D2\`
`,
  );
}

test("website-clone initialization creates a palette-first evidence contract", () => {
  const projectRoot = initializeProject();
  const targetRoot = path.join(
    projectRoot,
    "design",
    "changes",
    "palette-first",
    "targets",
    "example-com",
  );
  const palettePath = path.join(targetRoot, "research", "palette-evidence.json");
  const tokensPath = path.join(targetRoot, "research", "design-tokens.md");

  assert.equal(fs.existsSync(palettePath), true, "palette evidence scaffold must exist");
  const palette = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  assert.equal(palette.schema, "design-pipeline.palette-evidence.v1");
  assert.equal(palette.status, "pending");
  assert.equal(palette.targetId, "example-com");

  const tokens = fs.readFileSync(tokensPath, "utf8");
  assert.match(tokens, /^## Palette Evidence$/m);
  assert.match(tokens, /^## Semantic Roles$/m);
  assert.match(tokens, /^## Palette Relationships$/m);
  assert.match(tokens, /^## Target-Project Token Mapping$/m);
});

test("palette foundation gate blocks implementation while evidence is pending", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  const result = runNode(
    paletteCheckScript,
    ["--change-root", changeRoot, "--json"],
    projectRoot,
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /palette evidence status is pending/i);
});

test("palette foundation gate unlocks implementation for complete evidence", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  writeReadyPalette(changeRoot);
  const result = runNode(
    paletteCheckScript,
    ["--change-root", changeRoot, "--json"],
    projectRoot,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(JSON.parse(result.stdout).status, "ready");
});

test("palette foundation rejects disconnected semantic-role and token mappings", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  writeReadyPalette(changeRoot);
  const palettePath = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
    "palette-evidence.json",
  );
  const palette = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  palette.semanticRoles[0].targetToken = "--missing-token";
  palette.targetProjectTokens[1].sourceRole = "missing-role";
  fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);

  const result = runNode(
    paletteCheckScript,
    ["--change-root", changeRoot, "--json"],
    projectRoot,
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /semantic role canvas maps to missing token --missing-token/i);
  assert.match(result.stdout, /token --text-primary maps to unknown semantic role missing-role/i);
});

test("palette foundation rejects mismatched source identity and missing evidence files", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  writeReadyPalette(changeRoot);
  const researchRoot = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
  );
  const palettePath = path.join(researchRoot, "palette-evidence.json");
  const palette = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  palette.sourceUrl = "https://other.example/";
  fs.unlinkSync(path.join(researchRoot, "evidence", "hero.png"));
  fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);

  const result = runNode(
    paletteCheckScript,
    ["--change-root", changeRoot, "--json"],
    projectRoot,
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /palette evidence sourceUrl does not match/i);
  assert.match(result.stdout, /raster-media palette evidence path .*hero\.png.*missing/i);
});

test("palette foundation rejects evidence files that resolve outside target research", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  writeReadyPalette(changeRoot);
  const researchRoot = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
  );
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-palette-outside-"));
  roots.add(outside);
  fs.writeFileSync(path.join(outside, "dom-colors.json"), "{}\n");
  fs.symlinkSync(
    outside,
    path.join(researchRoot, "linked-evidence"),
    process.platform === "win32" ? "junction" : "dir",
  );
  const palettePath = path.join(researchRoot, "palette-evidence.json");
  const palette = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  palette.sources.domComputed.evidencePaths = ["linked-evidence/dom-colors.json"];
  fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);

  const result = runNode(
    paletteCheckScript,
    ["--change-root", changeRoot, "--json"],
    projectRoot,
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stdout, /outside target research/i);
});

test("palette foundation rejects unknown properties declared invalid by its schema", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  writeReadyPalette(changeRoot);
  const palettePath = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
    "palette-evidence.json",
  );
  const original = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  const mutations = [
    (palette) => {
      palette.unsupported = true;
    },
    (palette) => {
      palette.sources.unsupported = true;
    },
    (palette) => {
      palette.sources.domComputed.unsupported = true;
    },
    (palette) => {
      palette.sources.domComputed.colors[0].unsupported = true;
    },
    (palette) => {
      palette.semanticRoles[0].unsupported = true;
    },
    (palette) => {
      palette.relationships.unsupported = true;
    },
    (palette) => {
      palette.relationships.coverage[0].unsupported = true;
    },
    (palette) => {
      palette.targetProjectTokens[0].unsupported = true;
    },
  ];

  for (const mutate of mutations) {
    const palette = structuredClone(original);
    mutate(palette);
    fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);
    const result = runNode(
      paletteCheckScript,
      ["--change-root", changeRoot, "--json"],
      projectRoot,
    );
    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stdout, /unsupported properties/i);
  }
});

test("palette foundation rejects non-object JSON without crashing", () => {
  for (const palette of [null, [], "palette", 42]) {
    const projectRoot = initializeProject();
    const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
    const palettePath = path.join(
      changeRoot,
      "targets",
      "example-com",
      "research",
      "palette-evidence.json",
    );
    fs.writeFileSync(palettePath, `${JSON.stringify(palette)}\n`);

    const result = runNode(
      paletteCheckScript,
      ["--change-root", changeRoot, "--json"],
      projectRoot,
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.match(result.stdout, /palette evidence must be an object/i);
    assert.doesNotMatch(result.stdout, /cannot read properties/i);
  }
});

test("palette foundation rejects malformed nested values without crashing", () => {
  const projectRoot = initializeProject();
  const changeRoot = path.join(projectRoot, "design", "changes", "palette-first");
  writeReadyPalette(changeRoot);
  const palettePath = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
    "palette-evidence.json",
  );
  const original = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  const mutations = [
    (palette) => {
      palette.sources.domComputed.colors = {};
    },
    (palette) => {
      palette.semanticRoles = {};
    },
    (palette) => {
      palette.relationships.coverage = {};
    },
    (palette) => {
      palette.relationships.coverage = [null];
    },
    (palette) => {
      palette.targetProjectTokens = {};
    },
    (palette) => {
      palette.sources.domComputed.colors[0].hex = 1;
    },
    (palette) => {
      palette.sources.rasterMedia.colors[0].hex = {};
    },
  ];

  for (const mutate of mutations) {
    const palette = structuredClone(original);
    mutate(palette);
    fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);

    const result = runNode(
      paletteCheckScript,
      ["--change-root", changeRoot, "--json"],
      projectRoot,
    );

    assert.equal(result.status, 2, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).status, "blocked");
    assert.doesNotMatch(result.stdout, /is not a function|cannot read properties/i);
  }
});

test("website-clone evaluation blocks completion while palette evidence is pending", () => {
  const projectRoot = initializeProject();
  const { changeRoot, evidencePath } = preparePassingCloneEvaluation(projectRoot);

  const result = runNode(
    evaluateScript,
    ["--change-root", changeRoot, "--evidence", evidencePath],
    projectRoot,
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /palette evidence/i);
});

test("website-clone evaluation rejects a ready label without complete palette evidence", () => {
  const projectRoot = initializeProject();
  const { changeRoot, evidencePath } = preparePassingCloneEvaluation(projectRoot);
  const palettePath = path.join(
    changeRoot,
    "targets",
    "example-com",
    "research",
    "palette-evidence.json",
  );
  const palette = JSON.parse(fs.readFileSync(palettePath, "utf8"));
  palette.status = "ready";
  fs.writeFileSync(palettePath, `${JSON.stringify(palette, null, 2)}\n`);

  const result = runNode(
    evaluateScript,
    ["--change-root", changeRoot, "--evidence", evidencePath],
    projectRoot,
  );

  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /dom-computed palette source/i);
  assert.match(`${result.stdout}\n${result.stderr}`, /raster-media palette source/i);
});

test("website-clone evaluation accepts complete palette evidence", () => {
  const projectRoot = initializeProject();
  const { changeRoot, evidencePath } = preparePassingCloneEvaluation(projectRoot);
  writeReadyPalette(changeRoot);

  const result = runNode(
    evaluateScript,
    ["--change-root", changeRoot, "--evidence", evidencePath],
    projectRoot,
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /verdict: complete/i);
});

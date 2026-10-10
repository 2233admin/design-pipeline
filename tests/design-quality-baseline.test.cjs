"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const { evaluateBenchmark, validateManifest } = require("../skill/scripts/benchmark-core.cjs");
const { sha256 } = require("../skill/scripts/contract-utils.cjs");
const { evaluateFidelityThresholds, measureFidelity } = require("../skill/scripts/fidelity-metrics-core.cjs");
const { validateEvidenceReceipt } = require("../skill/scripts/reconstruction-fidelity-contract.cjs");

const CANDIDATE = "acme-model-1@design-pipeline";
const BASELINE = "acme-model-1@naked";

function crcTable() {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const CRC = crcTable();

function crc32(buffer) {
  let remainder = 0xffffffff;
  for (const byte of buffer) remainder = CRC[(remainder ^ byte) & 0xff] ^ (remainder >>> 8);
  return (remainder ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const label = Buffer.from(type, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([label, data])));
  return Buffer.concat([length, label, data, crc]);
}

function png(width, height, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = pixel(x, y);
      const offset = y * stride + 1 + x * 4;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-quality-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function scenario(overrides = {}) {
  return {
    id: "quality-dashboard",
    operation: "generate",
    dimension: "visual-quality",
    required: true,
    threshold: 0.6,
    evidenceType: "judgment-receipt",
    prompt: "Design an operations dashboard.",
    privateExpectations: ["real data states"],
    ...overrides,
  };
}

function fidelityScenario(overrides = {}) {
  return {
    id: "clone-hero",
    operation: "generate",
    dimension: "reference-fidelity",
    required: true,
    threshold: 0.9,
    evidenceType: "fidelity-metric-receipt",
    prompt: "Reconstruct the supplied hero screenshot.",
    expectedComponents: ["hero"],
    ...overrides,
  };
}

// The authorized reference is named by the manifest and pinned by hash, so a submission cannot
// substitute its own reference bytes. `root` is null for pure validation tests.
function metricPolicy(root, overrides = {}) {
  return {
    adapterId: "fidelity-metrics",
    metrics: ["pixelDifferenceRatio", "ssim"],
    thresholds: { maxPixelDifferenceRatio: 0.03, minSsim: 0.97 },
    references: {
      "clone-hero": {
        path: "renders/reference.png",
        sha256: root ? sha256(fs.readFileSync(path.join(root, "renders/reference.png"))) : "0".repeat(64),
        viewport: { width: 32, height: 32 },
      },
    },
    maxExtraElementRate: 0.05,
    ...overrides,
  };
}

const JUDGMENT_POLICY = {
  rubricId: "anchored-visual-rubric",
  rubricPath: "anchors/rubric.json",
  rubricDigest: `sha256:${"a".repeat(64)}`,
  judgeId: "vlm-judge-1",
  judgedDimensions: ["visual-taste", "ux-clarity"],
  bothOrders: true,
  humanSpotCheckFraction: 0.2,
  minHumanAgreement: 0.7,
  referenceSetId: "human-reference-set-1",
  referenceSetPath: "anchors/reference-set.json",
  referenceSetDigest: `sha256:${"b".repeat(64)}`,
  binding: { targetIdentityDigest: "1".repeat(64), snapshotDigest: `sha256:${"2".repeat(64)}`, policyDigest: "3".repeat(64) },
};

function manifest(overrides = {}) {
  return {
    schema: "design-pipeline.benchmark-manifest.v3",
    id: "baseline-1",
    benchmarkPurpose: "design-quality",
    candidateSystem: CANDIDATE,
    systems: [CANDIDATE, BASELINE],
    systemChannels: { [CANDIDATE]: "stable", [BASELINE]: "stable" },
    fairness: {
      samePrompts: true,
      sameEnvironmentClass: true,
      evaluatorBlind: true,
      expectedAnswersHidden: true,
      freshContext: true,
      representativeDelivery: true,
    },
    requiredDimensions: ["visual-quality"],
    scenarios: [scenario()],
    judgmentPolicy: JUDGMENT_POLICY,
    ...overrides,
  };
}

// Verdict scope is exercised through measured fidelity rather than hand-written scores, because a
// raw score for a measured dimension is now rejected outright.
function fidelityManifest(root, overrides = {}) {
  const input = manifest({
    benchmarkPurpose: "fidelity",
    requiredDimensions: ["reference-fidelity"],
    scenarios: [fidelityScenario()],
    metricPolicy: metricPolicy(root),
    ...overrides,
  });
  delete input.judgmentPolicy;
  return input;
}

function fidelityMeasurements(root, arms) {
  return {
    schema: "design-pipeline.benchmark-measurements.v3",
    benchmarkId: "baseline-1",
    measurements: {},
    judgments: {},
    fidelity: { "clone-hero": { arms } },
  };
}

test("a fidelity-purpose manifest is valid without any visual-quality scenario", () => {
  assert.equal(validateManifest(fidelityManifest(null)).benchmarkPurpose, "fidelity");
});

test("a design-quality manifest without a visual-quality scenario is rejected", () => {
  const input = manifest({
    requiredDimensions: ["reference-fidelity"],
    scenarios: [fidelityScenario()],
    metricPolicy: metricPolicy(null),
  });
  assert.throws(() => validateManifest(input), /requires a visual-quality scenario/);
});

test("two model identities in one manifest are rejected as a leaderboard", () => {
  const other = "other-model@design-pipeline";
  const input = manifest({ candidateSystem: other, systems: [other, BASELINE], systemChannels: { [other]: "stable", [BASELINE]: "stable" } });
  assert.throws(() => validateManifest(input), /one model identity/);
});

test("a visual-quality threshold at parity is rejected", () => {
  assert.throws(() => validateManifest(manifest({ scenarios: [scenario({ threshold: 0.5 })] })), /parity is not lift/);
});

test("the judge cannot be asked to rate a dimension pixels cannot settle", () => {
  const policy = { ...JUDGMENT_POLICY, judgedDimensions: ["visual-taste", "accessibility"] };
  assert.throws(() => validateManifest(manifest({ judgmentPolicy: policy })), /settled by a hard gate/);
});

test("a metric policy naming an uncomputed metric is rejected", () => {
  const input = fidelityManifest(null, { metricPolicy: metricPolicy(null, { metrics: ["blockF1"] }) });
  assert.throws(() => validateManifest(input), /does not compute/);
});

test("a hand-written score cannot bypass measurement for a reference-fidelity scenario", (t) => {
  const root = renders(t);
  const input = fidelityManifest(root);
  const submitted = fidelityMeasurements(root, {});
  submitted.measurements = { [CANDIDATE]: { "clone-hero": { score: 0.99, evidence: ["trust-me.json"] } } };
  assert.throws(() => evaluateBenchmark(input, submitted, { projectRoot: root }), /cannot take a raw score/);
});

test("a winning candidate passes even though the comparator scores below threshold", (t) => {
  const root = renders(t);
  fs.writeFileSync(path.join(root, "renders/baseline.png"), png(32, 32, (x, y) => (x < 16 ? [255, 0, 0] : [(x * 8) % 256, (y * 8) % 256, 128])));
  const result = evaluateBenchmark(fidelityManifest(root), fidelityMeasurements(root, {
    [CANDIDATE]: { implementationPath: "renders/implementation.png", diffPath: "renders/diff.png" },
    [BASELINE]: { implementationPath: "renders/baseline.png", diffPath: "renders/diff.png" },
  }), { projectRoot: root });
  assert.equal(result.status, "passed");
  assert.deepEqual(result.failedRequired, []);
  assert.equal(result.aggregate, 1);
  assert.deepEqual(result.reportOnlySystems, [BASELINE]);
  const comparator = result.systems.find((entry) => entry.system === BASELINE);
  assert.equal(comparator.reportOnly, true);
  assert.deepEqual(comparator.failedRequired, ["clone-hero"]);
  // The receipt, not just the paths, travels with the result.
  assert.match(result.fidelity["clone-hero"][CANDIDATE].receipt.referenceSha256, /^[a-f0-9]{64}$/);
  assert.equal(result.fidelity["clone-hero"][BASELINE].status, "fidelity-limited");
});

test("a metric policy looser than the exact-reconstruction caps is rejected", () => {
  assert.throws(
    () => validateManifest(fidelityManifest(null, { metricPolicy: metricPolicy(null, { thresholds: { maxPixelDifferenceRatio: 0.2, minSsim: 0.9 } }) })),
    /cannot exceed 0.03|cannot be lower than 0.97/,
  );
});

test("a render clearing the ssim threshold but exceeding the pixel cap still fails", (t) => {
  // Scattered single-step differences: the ratio exceeds the 0.03 cap while the perturbation is
  // too small to move ssim below 0.97. This is exactly the case a one-metric gate would pass.
  const root = renders(t, (x, y) => {
    const base = [(x * 8) % 256, (y * 8) % 256, 128];
    return (y * 32 + x) % 20 === 0 ? [base[0], base[1], base[2] + 1] : base;
  });
  const result = evaluateBenchmark(fidelityManifest(root), fidelityMeasurements(root, {
    [CANDIDATE]: { implementationPath: "renders/implementation.png", diffPath: "renders/diff.png" },
    [BASELINE]: { implementationPath: "renders/implementation.png", diffPath: "renders/diff.png" },
  }), { projectRoot: root });
  const arm = result.fidelity["clone-hero"][CANDIDATE];
  assert.ok(arm.receipt.metrics.ssim > 0.97, `ssim clears its threshold: ${arm.receipt.metrics.ssim}`);
  assert.ok(arm.receipt.metrics.pixelDifferenceRatio > 0.03, "pixel difference exceeds its cap");
  assert.equal(arm.status, "fidelity-limited");
  assert.equal(result.status, "failed");
  assert.deepEqual(result.failedRequired, [`${CANDIDATE}/clone-hero`]);
});

test("a missing comparator measurement blocks the candidate as an incomplete lift claim", (t) => {
  const root = renders(t);
  const result = evaluateBenchmark(fidelityManifest(root), fidelityMeasurements(root, {
    [CANDIDATE]: { implementationPath: "renders/implementation.png", diffPath: "renders/diff.png" },
  }), { projectRoot: root });
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.incompleteComparators, [`${CANDIDATE}/clone-hero`]);
  assert.deepEqual(result.unknownRequired, [`${CANDIDATE}/clone-hero`]);
  assert.deepEqual(result.failedRequired, []);
});

test("a candidate below its measured threshold fails the run", (t) => {
  const root = renders(t, (x, y) => (x < 8 ? [255, 0, 0] : [(x * 8) % 256, (y * 8) % 256, 128]));
  const result = evaluateBenchmark(fidelityManifest(root), fidelityMeasurements(root, {
    [CANDIDATE]: { implementationPath: "renders/implementation.png", diffPath: "renders/diff.png" },
    [BASELINE]: { implementationPath: "renders/implementation.png", diffPath: "renders/diff.png" },
  }), { projectRoot: root });
  assert.equal(result.status, "failed");
  assert.deepEqual(result.failedRequired, [`${CANDIDATE}/clone-hero`]);
});

test("v2 evaluation still rolls every system into the verdict", () => {
  const v2 = manifest();
  delete v2.benchmarkPurpose;
  delete v2.judgmentPolicy;
  v2.schema = "design-pipeline.benchmark-manifest.v2";
  v2.requiredDimensions = ["responsive"];
  v2.scenarios = [scenario({ dimension: "responsive", threshold: 0.6 })];
  const result = evaluateBenchmark(v2, {
    schema: "design-pipeline.benchmark-measurements.v2",
    benchmarkId: "baseline-1",
    measurements: {
      [CANDIDATE]: { "quality-dashboard": { score: 0.7, evidence: ["e"] } },
      [BASELINE]: { "quality-dashboard": { score: 0.3, evidence: ["e"] } },
    },
  });
  assert.equal(result.schema, "design-pipeline.benchmark-result.v2");
  assert.equal(result.status, "failed");
  assert.deepEqual(result.failedRequired, [`${BASELINE}/quality-dashboard`]);
});

const THRESHOLDS = { maxPixelDifferenceRatio: 0.03, minSsim: 0.97 };
const VIEWPORT = { width: 32, height: 32 };

function renders(t, implementation) {
  const root = workspace(t);
  fs.mkdirSync(path.join(root, "renders"));
  const reference = png(32, 32, (x, y) => [(x * 8) % 256, (y * 8) % 256, 128]);
  fs.writeFileSync(path.join(root, "renders/reference.png"), reference);
  fs.writeFileSync(path.join(root, "renders/implementation.png"), implementation ? png(32, 32, implementation) : reference);
  fs.writeFileSync(path.join(root, "renders/diff.png"), png(32, 32, () => [0, 0, 0]));
  return root;
}

function measure(root, overrides = {}) {
  return measureFidelity({
    projectRoot: root,
    dimension: "reference-fidelity",
    referencePath: "renders/reference.png",
    implementationPath: "renders/implementation.png",
    diffPath: "renders/diff.png",
    ...overrides,
  });
}

test("identical renders measure as an exact reconstruction and satisfy the existing contract", (t) => {
  const { receipt, measurement } = measure(renders(t));
  assert.equal(receipt.metrics.pixelDifferenceRatio, 0);
  assert.equal(receipt.metrics.ssim, 1);
  assert.equal(evaluateFidelityThresholds(receipt, THRESHOLDS).status, "ready");
  assert.equal(measurement.referencePath, "renders/reference.png");
  // The receipt is accepted unchanged by the pipeline's own evidence validator - no parallel
  // receipt contract was invented for Layer A.
  const comparison = { metrics: receipt.metrics };
  assert.equal(validateEvidenceReceipt(receipt, comparison, VIEWPORT), receipt);
});

test("the emitted receipt carries only the contract's keys, in the contract's digest shape", (t) => {
  const { receipt } = measure(renders(t));
  assert.deepEqual(Object.keys(receipt).sort(), ["diffSha256", "implementationSha256", "metrics", "referenceSha256", "schema", "viewport"]);
  assert.equal(receipt.schema, "design-pipeline.reconstruction-evidence.v1");
  for (const key of ["referenceSha256", "implementationSha256", "diffSha256"]) assert.match(receipt[key], /^[a-f0-9]{64}$/);
  assert.deepEqual(receipt.viewport, VIEWPORT);
});

test("a measured difference outside the exact thresholds is fidelity-limited, not ready", (t) => {
  const root = renders(t, (x, y) => (x < 8 ? [255, 0, 0] : [(x * 8) % 256, (y * 8) % 256, 128]));
  const { receipt } = measure(root);
  assert.equal(receipt.metrics.pixelDifferenceRatio, 0.25);
  assert.ok(receipt.metrics.ssim < 0.97);
  const verdict = evaluateFidelityThresholds(receipt, THRESHOLDS);
  assert.equal(verdict.status, "fidelity-limited");
  assert.equal(verdict.reasons.length, 2);
});

test("a receipt whose metrics were edited after measurement is refused by the existing validator", (t) => {
  const { receipt } = measure(renders(t, (x, y) => (x < 8 ? [255, 0, 0] : [(x * 8) % 256, (y * 8) % 256, 128])));
  const forged = { ...receipt, metrics: { pixelDifferenceRatio: 0, ssim: 1 } };
  assert.throws(
    () => validateEvidenceReceipt(forged, { metrics: receipt.metrics }, VIEWPORT),
    /evidence receipt metrics must match finalComparison.metrics/,
  );
});

test("a receipt measured at another viewport cannot be replayed against a locked render", (t) => {
  const { receipt } = measure(renders(t));
  assert.throws(
    () => validateEvidenceReceipt(receipt, { metrics: receipt.metrics }, { width: 1440, height: 900 }),
    /viewport must match the locked render viewport/,
  );
});

test("element-level match is reported as unmeasured rather than defaulted", (t) => {
  const { receipt, measurement } = measure(renders(t));
  assert.ok(measurement.unmeasured.includes("blockF1"));
  assert.equal(receipt.metrics.blockF1, undefined);
});

test("fidelity metrics refuse a visual-quality scenario", (t) => {
  const root = renders(t);
  assert.throws(() => measure(root, { dimension: "visual-quality" }), /apply only to a reference-fidelity scenario, not visual-quality/);
});

test("masks and non-exact modes are refused instead of reinterpreted", (t) => {
  const root = renders(t);
  // The reconstruction contract models intentionalMasks as raster paths; treating them as
  // rectangles would silently change the contract's type.
  assert.throws(() => measure(root, { intentionalMasks: [{ x: 0, y: 0, width: 8, height: 32 }] }), /forbids intentional masks/);
  assert.throws(() => measure(root, { mode: "adaptive-reconstruction" }), /is not measured yet/);
});

test("render paths cannot escape the project root", (t) => {
  const root = renders(t);
  const outside = path.join(os.tmpdir(), `design-quality-outside-${process.pid}.png`);
  fs.writeFileSync(outside, png(32, 32, () => [1, 2, 3]));
  t.after(() => fs.rmSync(outside, { force: true }));
  for (const escape of ["../outside.png", outside]) {
    assert.throws(() => measure(root, { implementationPath: escape }), /must stay inside|resolves outside/);
  }
});

test("mismatched render dimensions are refused instead of scored", (t) => {
  const root = renders(t);
  fs.writeFileSync(path.join(root, "renders/implementation.png"), png(8, 8, () => [0, 0, 0]));
  assert.throws(() => measure(root), /render dimensions differ/);
});

test("an unstated or unrelated dimension cannot forge a fidelity receipt", (t) => {
  const root = renders(t);
  for (const dimension of [undefined, "accessibility", "palette"]) {
    assert.throws(
      () => measure(root, { dimension }),
      /apply only to a reference-fidelity scenario/,
      `dimension ${dimension}`,
    );
  }
});

test("unsupported or malformed PNG features fail closed instead of scoring", (t) => {
  const root = renders(t);
  const valid = fs.readFileSync(path.join(root, "renders/reference.png"));
  const rewrite = (mutate) => {
    const bytes = Buffer.from(valid);
    // IHDR payload starts at byte 16: width(4) height(4) depth colorType compression filter interlace.
    mutate(bytes);
    const payload = bytes.subarray(12, 12 + 4 + 13);
    bytes.writeUInt32BE(crc32(payload), 16 + 13);
    return bytes;
  };
  const cases = [
    ["indexed", (bytes) => { bytes[25] = 3; }, /indexed PNG/],
    ["compression method", (bytes) => { bytes[26] = 1; }, /compression method 1/],
    ["filter method", (bytes) => { bytes[27] = 1; }, /filter method 1/],
    ["interlaced", (bytes) => { bytes[28] = 1; }, /interlaced/],
  ];
  for (const [name, mutate, expected] of cases) {
    fs.writeFileSync(path.join(root, "renders/implementation.png"), rewrite(mutate));
    assert.throws(() => measure(root), expected, name);
  }
  // A flipped CRC must be refused even though every structural field is still well formed.
  const corrupt = Buffer.from(valid);
  corrupt[16 + 13] ^= 0xff;
  fs.writeFileSync(path.join(root, "renders/implementation.png"), corrupt);
  assert.throws(() => measure(root), /CRC does not match/);
});

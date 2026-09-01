"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  FIRST_WAVE_PLATFORMS,
  PLATFORMS,
  createSurface,
  resolveSurfaceProfile,
  validateSurfaceBinding,
  validateSurfaceProfile,
} = require("../skill/scripts/surface-profile-core.cjs");
test("surface design contract schema is valid JSON", () => {
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.resolve(__dirname, "../skill/references/surface-design-contract.schema.json"), "utf8")));
});

test("resolves a deterministic Web profile and creates a canonical Surface", () => {
  const profile = resolveSurfaceProfile({ platform: "web", framework: "react", profileVersion: "1" });
  assert.equal(profile.platform, "web");
  assert.ok(profile.gates.includes("dom-semantics"));
  assert.deepEqual(profile, {
    schema: "design-pipeline.platform-profile.v1",
    profileId: "web",
    version: "1",
    platform: "web",
    gates: [
      "responsive-layout",
      "dom-semantics",
      "keyboard-pointer-input",
      "accessibility",
      "browser-runtime",
    ],
    status: "active",
    firstWaveRetrieval: true,
  });

  const surface = createSurface({
    projectId: "project-1",
    surfaceId: "web-admin",
    platform: "web",
    framework: "react",
    profileVersion: "1",
  });
  assert.equal(surface.projectId, "project-1");
  assert.equal(surface.platform, "web");
  assert.deepEqual(Object.keys(surface), ["schema", "projectId", "surfaceId", "platform", "framework", "profileVersion"]);
});
test("round-trips schema-accepted platform profile fields", () => {
  const profile = validateSurfaceProfile({
    schema: "design-pipeline.platform-profile.v1",
    profileId: "web",
    version: "1",
    platform: "web",
    gates: ["responsive-layout", "dom-semantics", "keyboard-pointer-input", "accessibility", "browser-runtime"],
    status: "active",
    firstWaveRetrieval: true,
    frameworks: ["react"],
    capabilities: ["pointer"],
    interactionModel: { input: "pointer" },
    accessibilityRequirements: ["keyboard"],
    performanceBudget: { lcpMs: 2500 },
    frameworkConstraints: { react: ["dom"] },
    taskGenerationTemplate: "web-task",
    acceptanceChecks: ["browser"],
  });
  assert.equal(profile.frameworks[0], "react");
  assert.equal(profile.acceptanceChecks[0], "browser");
  assert.deepEqual(validateSurfaceProfile(profile), profile);
});

test("keeps Web and Mobile gate sets distinct", () => {
  const web = resolveSurfaceProfile({ platform: "web", framework: "react", profileVersion: "1" });
  const mobile = resolveSurfaceProfile({ platform: "mobile", framework: "react-native", profileVersion: "1" });
  assert.notDeepEqual(web.gates, mobile.gates);
  assert.ok(web.gates.includes("browser-runtime"));
  assert.ok(mobile.gates.includes("touch-targets"));
  assert.ok(mobile.gates.includes("safe-areas"));
  assert.deepEqual(PLATFORMS, ["web", "mobile", "game"]);
  assert.deepEqual(FIRST_WAVE_PLATFORMS, ["web", "mobile"]);
});

test("rejects bindings that cross a Surface platform or profile", () => {
  const profile = resolveSurfaceProfile({ platform: "web", framework: "react", profileVersion: "1" });
  assert.throws(
    () => validateSurfaceBinding({ platform: "mobile", framework: "react" }, profile),
    /platform|surface/i,
  );
  assert.throws(
    () => validateSurfaceBinding({ platform: "web", framework: "react", profileVersion: "2" }, profile),
    /profile|version/i,
  );
  for (const profileVersion of [null, ""]) {
    assert.throws(
      () => validateSurfaceBinding({ platform: "web", framework: "react", profileVersion }, profile),
      /profileVersion|non-empty/i,
    );
  }

  const binding = validateSurfaceBinding({ platform: "web", framework: "react", profileVersion: "1" }, profile);
  assert.deepEqual(binding, { platform: "web", framework: "react", profileVersion: "1" });
});

test("enforces first-wave availability and validates optional Surface records", () => {
  const gameProfile = validateSurfaceProfile({ schema: "design-pipeline.platform-profile.v1", profileId: "game", version: "1", platform: "game", gates: [], status: "reserved", firstWaveRetrieval: false });
  assert.throws(
    () => validateSurfaceBinding({ platform: "game", framework: "custom", profileVersion: "1", firstWave: true }, gameProfile),
    /reserved|first.wave|game/i,
  );
  assert.throws(
    () => validateSurfaceBinding({ platform: "game", framework: "custom", profileVersion: "1", firstWave: false, operation: null }, gameProfile),
    /operation|non-empty|string/i,
  );

  const base = {
    projectId: "project-1",
    surfaceId: "web-admin",
    platform: "web",
    framework: "react",
    profileVersion: "1",
  };
  for (const field of ["directionLock", "catalogScope", "acceptanceProfile"]) {
    assert.throws(() => createSurface({ ...base, [field]: "malformed" }), new RegExp(field));
    assert.throws(() => createSurface({ ...base, [field]: null }), new RegExp(field));
  }
  const surface = createSurface({
    ...base,
    directionLock: { directionId: "direction-1" },
    catalogScope: { regionKind: "header" },
    acceptanceProfile: { gates: ["accessibility"] },
  });
  assert.deepEqual(surface.directionLock, { directionId: "direction-1" });
  assert.deepEqual(surface.catalogScope, { regionKind: "header" });
  assert.deepEqual(surface.acceptanceProfile, { gates: ["accessibility"] });
});

test("rejects unknown platforms and reserved Game first-wave surfaces", () => {
  assert.throws(() => resolveSurfaceProfile({ platform: "desktop", framework: "custom", profileVersion: "1" }), /platform|invalid/i);
  assert.throws(() => createSurface({ platform: "game", framework: "custom" }), /reserved|first.wave|game/i);
  assert.throws(
    () => resolveSurfaceProfile({ platform: "game", framework: "custom", profileVersion: "1" }),
    /reserved|first.wave|game/i,
  );

  const reserved = resolveSurfaceProfile({ platform: "game", framework: "custom", profileVersion: "1", firstWave: false });
  assert.deepEqual(reserved, { schema: "design-pipeline.platform-profile.v1", profileId: "game", version: "1", platform: "game", gates: [], status: "reserved", firstWaveRetrieval: false });
  assert.deepEqual(validateSurfaceProfile({ schema: "design-pipeline.platform-profile.v1", profileId: "game", version: "1", platform: "game", gates: [], status: "reserved", firstWaveRetrieval: false }), reserved);
});

test("requires every stable Surface identity and profile field", () => {
  const base = {
    projectId: "project-1",
    surfaceId: "web-admin",
    platform: "web",
    framework: "react",
    profileVersion: "1",
  };
  for (const field of ["projectId", "surfaceId", "framework", "profileVersion"]) {
    const value = { ...base };
    delete value[field];
    assert.throws(() => createSurface(value), new RegExp(field));
  }
});

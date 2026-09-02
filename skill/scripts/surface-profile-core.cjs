"use strict";

const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  fail,
} = require("./contract-utils.cjs");

const PLATFORMS = ["web", "mobile", "game"];
const FIRST_WAVE_PLATFORMS = ["web", "mobile"];
const PROFILE_VERSIONS = ["1"];
const PROFILE_SCHEMA = "design-pipeline.platform-profile.v1";
const SURFACE_SCHEMA = "design-pipeline.surface.v1";

const PROFILE_OPTIONAL_KEYS = [
  "frameworks",
  "capabilities",
  "interactionModel",
  "accessibilityRequirements",
  "performanceBudget",
  "frameworkConstraints",
  "taskGenerationTemplate",
  "acceptanceChecks",
];

const WEB_GATES = [
  "responsive-layout",
  "dom-semantics",
  "keyboard-pointer-input",
  "accessibility",
  "browser-runtime",
];
const MOBILE_GATES = [
  "touch-targets",
  "safe-areas",
  "navigation-back-stack",
  "gesture-behavior",
  "weak-network-states",
  "device-variation",
];

const PROFILE_DEFINITIONS = Object.freeze({
  web: Object.freeze({ schema: PROFILE_SCHEMA, profileId: "web", version: "1", platform: "web", gates: Object.freeze(WEB_GATES), status: "active", firstWaveRetrieval: true }),
  mobile: Object.freeze({ schema: PROFILE_SCHEMA, profileId: "mobile", version: "1", platform: "mobile", gates: Object.freeze(MOBILE_GATES), status: "active", firstWaveRetrieval: true }),
  game: Object.freeze({ schema: PROFILE_SCHEMA, profileId: "game", version: "1", platform: "game", gates: Object.freeze([]), status: "reserved", firstWaveRetrieval: false }),
});

const SURFACE_REQUIRED_KEYS = ["projectId", "surfaceId", "platform", "framework", "profileVersion"];
const SURFACE_OPTIONAL_KEYS = ["schema", "profileId", "directionLock", "catalogScope", "acceptanceProfile", "status"];
const SURFACE_KEYS = [...SURFACE_REQUIRED_KEYS, ...SURFACE_OPTIONAL_KEYS];
const PROFILE_KEYS = ["schema", "profileId", "version", "platform", "gates", "status", "firstWaveRetrieval", ...PROFILE_OPTIONAL_KEYS];
const RESOLUTION_KEYS = [
  "projectId",
  "surfaceId",
  "platform",
  "framework",
  "profileVersion",
  "profileId",
  "directionLock",
  "catalogScope",
  "acceptanceProfile",
  "status",
  "firstWave",
  "operation",
];
const BINDING_KEYS = [
  ...SURFACE_KEYS,
  "firstWave",
  "operation",
];

function cloneProfile(definition, source = definition) {
  const result = {
    schema: definition.schema,
    profileId: definition.profileId,
    version: definition.version,
    platform: definition.platform,
    gates: [...definition.gates],
    status: definition.status,
    firstWaveRetrieval: definition.firstWaveRetrieval,
  };
  for (const key of PROFILE_OPTIONAL_KEYS) {
    if (Object.hasOwn(source, key)) result[key] = cloneValue(source[key]);
  }
  return result;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  return value;
}

function assertProfileVersion(value, scope) {
  assertString(value, "profileVersion", scope);
  assertEnum(value, PROFILE_VERSIONS, "profileVersion", scope);
}

function profileFor(platform, version, scope = "surface-profile") {
  assertEnum(platform, PLATFORMS, "platform", scope);
  assertProfileVersion(version, scope);
  const definition = PROFILE_DEFINITIONS[platform];
  if (!definition) fail(scope, `no profile is registered for ${platform}`);
  return definition;
}

function assertFirstWaveAvailability(platform, firstWave, operation, scope) {
  const enabled = firstWave === undefined ? true : firstWave;
  if (typeof enabled !== "boolean") fail(scope, "firstWave must be a boolean");
  if (operation !== undefined) assertString(operation, "operation", scope);
  if (enabled && !FIRST_WAVE_PLATFORMS.includes(platform)) {
    fail(scope, `${platform} is reserved and unavailable for first-wave operations`);
  }
  return enabled;
}

function validateSurfaceOptionalFields(value, scope) {
  if (value.profileId !== undefined) assertString(value.profileId, "profileId", scope);
  for (const key of ["directionLock", "catalogScope", "acceptanceProfile"]) {
    if (value[key] !== undefined) assertObject(value[key], key, scope);
  }
  if (value.status !== undefined) assertEnum(value.status, ["active", "archived"], "status", scope);
}

function validateSurfaceProfile(value) {
  const scope = "surface-profile";
  assertKeys(value, ["schema", "profileId", "version", "platform", "gates", "status", "firstWaveRetrieval"], PROFILE_KEYS, "surface profile", scope);
  if (value.schema !== PROFILE_SCHEMA) fail(scope, `schema must be ${PROFILE_SCHEMA}`);
  assertString(value.profileId, "profileId", scope);
  assertString(value.version, "version", scope);
  assertEnum(value.platform, PLATFORMS, "platform", scope);
  assertStringArray(value.gates, "gates", scope, { unique: true });
  assertEnum(value.status, ["active", "reserved"], "status", scope);
  if (typeof value.firstWaveRetrieval !== "boolean") fail(scope, "firstWaveRetrieval must be a boolean");
  if (value.frameworks !== undefined) assertStringArray(value.frameworks, "frameworks", scope, { unique: true });
  if (value.capabilities !== undefined) assertStringArray(value.capabilities, "capabilities", scope, { unique: true });
  if (value.interactionModel !== undefined) assertObject(value.interactionModel, "interactionModel", scope);
  if (value.accessibilityRequirements !== undefined) assertStringArray(value.accessibilityRequirements, "accessibilityRequirements", scope, { unique: true });
  if (value.performanceBudget !== undefined) assertObject(value.performanceBudget, "performanceBudget", scope);
  if (value.frameworkConstraints !== undefined) assertObject(value.frameworkConstraints, "frameworkConstraints", scope);
  if (value.taskGenerationTemplate !== undefined) assertString(value.taskGenerationTemplate, "taskGenerationTemplate", scope);
  if (value.acceptanceChecks !== undefined) assertStringArray(value.acceptanceChecks, "acceptanceChecks", scope, { unique: true });

  const definition = profileFor(value.platform, value.version, scope);
  if (value.profileId !== definition.profileId) {
    fail(scope, `profileId ${value.profileId} does not match platform ${value.platform}`);
  }
  if (value.gates.length !== definition.gates.length || value.gates.some((gate, index) => gate !== definition.gates[index])) {
    fail(scope, `gates do not match the ${value.platform} profile`);
  }
  if (value.status !== definition.status) {
    fail(scope, `status ${value.status} does not match the ${value.platform} profile`);
  }
  if (value.firstWaveRetrieval !== definition.firstWaveRetrieval) {
    fail(scope, `firstWaveRetrieval does not match the ${value.platform} profile`);
  }
  return cloneProfile(definition, value);
}

function normalizeSurface(value, scope = "surface") {
  assertObject(value, "surface", scope);
  if (value.platform === "game") fail(scope, "game is reserved and cannot enter first-wave surfaces");
  assertKeys(value, SURFACE_REQUIRED_KEYS, [...SURFACE_KEYS], "surface", scope);
  if (value.schema !== undefined && value.schema !== SURFACE_SCHEMA) fail(scope, `schema must be ${SURFACE_SCHEMA}`);
  if (value.platform !== undefined) assertEnum(value.platform, PLATFORMS, "platform", scope);
  for (const key of ["projectId", "surfaceId", "framework"]) assertString(value[key], key, scope);
  assertProfileVersion(value.profileVersion, scope);
  validateSurfaceOptionalFields(value, scope);

  const profile = profileFor(value.platform, value.profileVersion, scope);
  if (value.profileId !== undefined && value.profileId !== profile.profileId) {
    fail(scope, `profileId ${value.profileId} does not match surface platform ${value.platform}`);
  }

  const result = { schema: SURFACE_SCHEMA };
  for (const key of SURFACE_KEYS) {
    if (key !== "schema" && value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

function createSurface(value) {
  return normalizeSurface(value);
}

function resolveSurfaceProfile(surface) {
  const scope = "surface-profile";
  assertKeys(surface, ["platform", "framework", "profileVersion"], [...RESOLUTION_KEYS, "schema"], "surface profile input", scope);
  if (surface.schema !== undefined && surface.schema !== SURFACE_SCHEMA) fail(scope, `schema must be ${SURFACE_SCHEMA}`);
  assertString(surface.framework, "framework", scope);
  const definition = profileFor(surface.platform, surface.profileVersion, scope);
  assertFirstWaveAvailability(surface.platform, surface.firstWave, surface.operation, scope);
  if (surface.profileId !== undefined && surface.profileId !== definition.profileId) {
    fail(scope, `profileId ${surface.profileId} does not match platform ${surface.platform}`);
  }
  return cloneProfile(definition);
}

function validateSurfaceBinding(value, profile) {
  const scope = "surface-binding";
  const normalizedProfile = validateSurfaceProfile(profile);
  assertKeys(value, ["platform", "framework"], BINDING_KEYS, "surface binding", scope);
  if (value.schema !== undefined && value.schema !== SURFACE_SCHEMA) fail(scope, `schema must be ${SURFACE_SCHEMA}`);
  assertEnum(value.platform, PLATFORMS, "platform", scope);
  assertString(value.framework, "framework", scope);
  if (value.profileVersion !== undefined) assertProfileVersion(value.profileVersion, scope);
  validateSurfaceOptionalFields(value, scope);
  assertFirstWaveAvailability(value.platform, value.firstWave, value.operation, scope);
  if (value.platform !== normalizedProfile.platform) {
    fail(scope, `platform ${value.platform} does not match surface profile ${normalizedProfile.platform}`);
  }
  if (value.profileVersion !== undefined && value.profileVersion !== normalizedProfile.version) {
    fail(scope, `profileVersion ${value.profileVersion} does not match surface profile ${normalizedProfile.version}`);
  }
  if (value.profileId !== undefined && value.profileId !== normalizedProfile.profileId) {
    fail(scope, `profileId ${value.profileId} does not match surface profile ${normalizedProfile.profileId}`);
  }
  if (Object.hasOwn(value, "projectId") || Object.hasOwn(value, "surfaceId")) {
    return createSurface({ ...value, profileVersion: Object.hasOwn(value, "profileVersion") ? value.profileVersion : normalizedProfile.version });
  }
  const result = {};
  for (const key of ["platform", "framework", "profileVersion", "profileId"]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}


module.exports = {
  FIRST_WAVE_PLATFORMS,
  PLATFORMS,
  createSurface,
  resolveSurfaceProfile,
  validateSurfaceBinding,
  validateSurfaceProfile,
  SURFACE_SCHEMA,
};

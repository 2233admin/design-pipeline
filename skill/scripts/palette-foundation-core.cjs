"use strict";

const fs = require("node:fs");
const path = require("node:path");

const PALETTE_SCHEMA = "design-pipeline.palette-evidence.v1";
const REQUIRED_HEADINGS = [
  "Palette Evidence",
  "Semantic Roles",
  "Palette Relationships",
  "Target-Project Token Mapping",
];

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function arrayItems(value) {
  return Array.isArray(value) ? value : [];
}

function validHexColor(value) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pathStaysInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function inspectObjectShape(targetId, label, value, required, blockers) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    blockers.push(`${targetId}: ${label} must be an object`);
    return false;
  }
  const missing = required.filter((field) => !Object.hasOwn(value, field));
  if (missing.length) {
    blockers.push(`${targetId}: ${label} is missing properties: ${missing.join(", ")}`);
  }
  const unsupported = Object.keys(value).filter((field) => !required.includes(field));
  if (unsupported.length) {
    blockers.push(
      `${targetId}: ${label} has unsupported properties: ${unsupported.join(", ")}`,
    );
  }
  return missing.length === 0 && unsupported.length === 0;
}

function inspectPaletteSchemaShape(targetId, palette, blockers) {
  inspectObjectShape(
    targetId,
    "palette evidence",
    palette,
    [
      "schema",
      "targetId",
      "sourceUrl",
      "status",
      "capturedAt",
      "sources",
      "semanticRoles",
      "relationships",
      "targetProjectTokens",
      "notes",
    ],
    blockers,
  );
  inspectObjectShape(
    targetId,
    "palette sources",
    palette.sources,
    ["domComputed", "rasterMedia"],
    blockers,
  );
  for (const [name, fields] of [
    ["dom-computed palette source", ["status", "evidencePaths", "colors"]],
    [
      "raster-media palette source",
      ["status", "evidencePaths", "regions", "colors"],
    ],
  ]) {
    const source =
      name === "dom-computed palette source"
        ? palette.sources?.domComputed
        : palette.sources?.rasterMedia;
    inspectObjectShape(targetId, name, source, fields, blockers);
    for (const [index, color] of arrayItems(source?.colors).entries()) {
      inspectObjectShape(
        targetId,
        `${name} colors[${index}]`,
        color,
        ["hex", "role", "region"],
        blockers,
      );
    }
  }
  for (const [index, role] of arrayItems(palette.semanticRoles).entries()) {
    inspectObjectShape(
      targetId,
      `semanticRoles[${index}]`,
      role,
      ["role", "sourceColor", "targetToken"],
      blockers,
    );
  }
  inspectObjectShape(
    targetId,
    "palette relationships",
    palette.relationships,
    [
      "coverage",
      "luminanceHierarchy",
      "saturationPosture",
      "temperaturePosture",
    ],
    blockers,
  );
  for (const [index, coverage] of arrayItems(
    palette.relationships?.coverage,
  ).entries()) {
    inspectObjectShape(
      targetId,
      `palette coverage[${index}]`,
      coverage,
      ["role", "min", "max"],
      blockers,
    );
  }
  for (const [index, token] of arrayItems(
    palette.targetProjectTokens,
  ).entries()) {
    inspectObjectShape(
      targetId,
      `targetProjectTokens[${index}]`,
      token,
      ["token", "value", "sourceRole"],
      blockers,
    );
  }
  if (
    !Array.isArray(palette.notes) ||
    !palette.notes.every((note) => typeof note === "string")
  ) {
    blockers.push(`${targetId}: palette notes must be an array of strings`);
  }
}

function inspectEvidencePaths(targetId, label, researchRoot, evidencePaths, blockers) {
  if (!nonEmptyArray(evidencePaths) || !evidencePaths.every(nonEmptyString)) {
    blockers.push(`${targetId}: ${label} palette source has no evidence path`);
    return;
  }
  for (const evidencePath of evidencePaths) {
    const candidate = path.resolve(researchRoot, evidencePath);
    const exists = fs.existsSync(candidate);
    const realCandidate = exists ? fs.realpathSync(candidate) : null;
    if (
      path.isAbsolute(evidencePath) ||
      !pathStaysInside(researchRoot, candidate) ||
      !exists ||
      !pathStaysInside(researchRoot, realCandidate) ||
      !fs.statSync(realCandidate).isFile()
    ) {
      blockers.push(
        `${targetId}: ${label} palette evidence path ${evidencePath} is missing or outside target research`,
      );
    }
  }
}

function inspectPaletteSource(targetId, label, researchRoot, source, blockers) {
  if (!source || typeof source !== "object" || source.status !== "ready") {
    blockers.push(`${targetId}: ${label} palette source is not ready`);
    return;
  }
  inspectEvidencePaths(targetId, label, researchRoot, source.evidencePaths, blockers);
  if (
    !Array.isArray(source.colors) ||
    source.colors.length < 2 ||
    !source.colors.every(
      (color) =>
        color &&
        typeof color === "object" &&
        validHexColor(color.hex) &&
        nonEmptyString(color.role) &&
        nonEmptyString(color.region),
    )
  ) {
    blockers.push(`${targetId}: ${label} palette source needs at least two measured colors`);
  }
  if (
    label === "raster-media" &&
    (!nonEmptyArray(source.regions) || !source.regions.every(nonEmptyString))
  ) {
    blockers.push(`${targetId}: raster-media palette regions are missing`);
  }
}

function inspectPaletteRelationships(targetId, relationships, blockers) {
  if (
    !relationships ||
    typeof relationships !== "object" ||
    !nonEmptyArray(relationships.coverage) ||
    !relationships.coverage.every(
      (item) =>
        item &&
        typeof item === "object" &&
        nonEmptyString(item.role) &&
        typeof item.min === "number" &&
        typeof item.max === "number" &&
        item.min >= 0 &&
        item.max <= 1 &&
        item.min <= item.max,
    )
  ) {
    blockers.push(`${targetId}: palette coverage relationships are incomplete`);
  }
  if (
    !nonEmptyArray(relationships?.luminanceHierarchy) ||
    !relationships.luminanceHierarchy.every(nonEmptyString)
  ) {
    blockers.push(`${targetId}: palette luminance hierarchy is incomplete`);
  }
  if (!nonEmptyString(relationships?.saturationPosture)) {
    blockers.push(`${targetId}: palette saturation posture is missing`);
  }
  if (!nonEmptyString(relationships?.temperaturePosture)) {
    blockers.push(`${targetId}: palette temperature posture is missing`);
  }
}

function validSemanticRoleMapping(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      nonEmptyString(item.role) &&
      validHexColor(item.sourceColor) &&
      /^--[a-z0-9-]+$/i.test(item.targetToken || ""),
  );
}

function validTargetTokenMapping(item) {
  return Boolean(
    item &&
      typeof item === "object" &&
      /^--[a-z0-9-]+$/i.test(item.token || "") &&
      validHexColor(item.value) &&
      nonEmptyString(item.sourceRole),
  );
}

function duplicateValues(items, field) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    if (seen.has(item[field])) duplicates.add(item[field]);
    seen.add(item[field]);
  }
  return duplicates;
}

function inspectSemanticRoleMappings(targetId, semanticRoles, blockers) {
  if (
    !Array.isArray(semanticRoles) ||
    semanticRoles.length < 4 ||
    !semanticRoles.every(validSemanticRoleMapping)
  ) {
    blockers.push(`${targetId}: palette semantic roles need at least four mappings`);
    return null;
  }
  for (const role of duplicateValues(semanticRoles, "role")) {
    blockers.push(`${targetId}: duplicate palette semantic role ${role}`);
  }
  for (const token of duplicateValues(semanticRoles, "targetToken")) {
    blockers.push(`${targetId}: duplicate semantic target token ${token}`);
  }
  return semanticRoles;
}

function inspectTargetTokenMappings(targetId, targetProjectTokens, blockers) {
  if (
    !Array.isArray(targetProjectTokens) ||
    targetProjectTokens.length < 4 ||
    !targetProjectTokens.every(validTargetTokenMapping)
  ) {
    blockers.push(`${targetId}: target-project palette token mapping is incomplete`);
    return null;
  }
  for (const token of duplicateValues(targetProjectTokens, "token")) {
    blockers.push(`${targetId}: duplicate target-project palette token ${token}`);
  }
  return targetProjectTokens;
}

function inspectMappingReferences(targetId, palette, semanticRoles, targetProjectTokens, blockers) {
  const roleNames = new Set(semanticRoles.map((item) => item.role));
  const semanticRoleByToken = new Map(
    semanticRoles.map((item) => [item.targetToken, item.role]),
  );
  const sourceColors = new Set(
    [
      ...arrayItems(palette.sources?.domComputed?.colors),
      ...arrayItems(palette.sources?.rasterMedia?.colors),
    ]
      .map((item) => item?.hex)
      .filter(validHexColor)
      .map((hex) => hex.toLowerCase()),
  );
  for (const mapping of semanticRoles) {
    if (!targetProjectTokens.some((item) => item.token === mapping.targetToken)) {
      blockers.push(
        `${targetId}: semantic role ${mapping.role} maps to missing token ${mapping.targetToken}`,
      );
    }
    if (!sourceColors.has(mapping.sourceColor.toLowerCase())) {
      blockers.push(
        `${targetId}: semantic role ${mapping.role} uses unmeasured color ${mapping.sourceColor}`,
      );
    }
  }
  for (const mapping of targetProjectTokens) {
    if (!roleNames.has(mapping.sourceRole)) {
      blockers.push(
        `${targetId}: token ${mapping.token} maps to unknown semantic role ${mapping.sourceRole}`,
      );
      continue;
    }
    const expectedRole = semanticRoleByToken.get(mapping.token);
    if (expectedRole && expectedRole !== mapping.sourceRole) {
      blockers.push(
        `${targetId}: token ${mapping.token} maps to ${mapping.sourceRole} but semantic role expects ${expectedRole}`,
      );
    }
  }
  for (const coverage of arrayItems(palette.relationships?.coverage)) {
    if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) {
      continue;
    }
    if (!roleNames.has(coverage.role)) {
      blockers.push(
        `${targetId}: palette coverage references unknown semantic role ${coverage.role}`,
      );
    }
  }
}

function inspectTokenDocument(targetId, targetProjectTokens, tokensText, blockers) {
  for (const mapping of targetProjectTokens) {
    if (
      !tokensText.includes(mapping.token) ||
      !tokensText.toLowerCase().includes(mapping.value.toLowerCase())
    ) {
      blockers.push(
        `${targetId}: design-tokens.md does not contain ${mapping.token}: ${mapping.value}`,
      );
    }
  }
}

function inspectPaletteMappings(targetId, palette, tokensText, blockers) {
  const semanticRoles = inspectSemanticRoleMappings(
    targetId,
    palette.semanticRoles,
    blockers,
  );
  const targetProjectTokens = inspectTargetTokenMappings(
    targetId,
    palette.targetProjectTokens,
    blockers,
  );
  if (!semanticRoles || !targetProjectTokens) return;
  inspectMappingReferences(
    targetId,
    palette,
    semanticRoles,
    targetProjectTokens,
    blockers,
  );
  inspectTokenDocument(targetId, targetProjectTokens, tokensText, blockers);
}

function inspectPaletteDocument(targetId, researchRoot, tokensPath, blockers) {
  if (!fs.existsSync(tokensPath)) {
    blockers.push(`${targetId}: design-tokens.md is missing`);
    return null;
  }
  const realTokensPath = fs.realpathSync(tokensPath);
  if (!pathStaysInside(researchRoot, realTokensPath) || !fs.statSync(realTokensPath).isFile()) {
    blockers.push(`${targetId}: design-tokens.md is outside target research`);
    return null;
  }
  const text = fs.readFileSync(realTokensPath, "utf8");
  for (const heading of REQUIRED_HEADINGS) {
    if (!new RegExp(`^## ${heading}$`, "m").test(text)) {
      blockers.push(`${targetId}: design-tokens.md is missing ${heading}`);
    }
  }
  return text;
}

function inspectPaletteFoundation({ changeRoot, targets }) {
  const blockers = [];
  const realChangeRoot = fs.realpathSync(changeRoot);
  for (const target of targets || []) {
    const researchRoot = path.join(changeRoot, "targets", target.id, "research");
    if (!fs.existsSync(researchRoot)) {
      blockers.push(`${target.id}: target research directory is missing`);
      continue;
    }
    const realResearchRoot = fs.realpathSync(researchRoot);
    if (!pathStaysInside(realChangeRoot, realResearchRoot)) {
      blockers.push(`${target.id}: target research directory is outside change root`);
      continue;
    }
    const palettePath = path.join(researchRoot, "palette-evidence.json");
    if (!fs.existsSync(palettePath)) {
      blockers.push(`${target.id}: palette evidence is missing`);
      continue;
    }
    const realPalettePath = fs.realpathSync(palettePath);
    if (
      !pathStaysInside(realResearchRoot, realPalettePath) ||
      !fs.statSync(realPalettePath).isFile()
    ) {
      blockers.push(`${target.id}: palette evidence is outside target research`);
      continue;
    }
    let palette;
    try {
      palette = readJson(realPalettePath);
    } catch (error) {
      blockers.push(`${target.id}: palette evidence is invalid (${error.message})`);
      continue;
    }
    if (!palette || typeof palette !== "object" || Array.isArray(palette)) {
      blockers.push(`${target.id}: palette evidence must be an object`);
      continue;
    }
    inspectPaletteSchemaShape(target.id, palette, blockers);
    if (palette.schema !== PALETTE_SCHEMA) {
      blockers.push(`${target.id}: palette evidence schema is invalid`);
    }
    if (palette.targetId !== target.id) {
      blockers.push(`${target.id}: palette evidence targetId does not match`);
    }
    if (palette.sourceUrl !== target.url) {
      blockers.push(`${target.id}: palette evidence sourceUrl does not match`);
    }
    if (palette.status !== "ready") {
      blockers.push(`${target.id}: palette evidence status is ${palette.status || "missing"}`);
      continue;
    }
    if (
      !nonEmptyString(palette.capturedAt) ||
      Number.isNaN(new Date(palette.capturedAt).getTime())
    ) {
      blockers.push(`${target.id}: palette evidence capturedAt is invalid`);
    }
    inspectPaletteSource(
      target.id,
      "dom-computed",
      realResearchRoot,
      palette.sources?.domComputed,
      blockers,
    );
    inspectPaletteSource(
      target.id,
      "raster-media",
      realResearchRoot,
      palette.sources?.rasterMedia,
      blockers,
    );
    inspectPaletteRelationships(target.id, palette.relationships, blockers);
    const tokensText = inspectPaletteDocument(
      target.id,
      realResearchRoot,
      path.join(researchRoot, "design-tokens.md"),
      blockers,
    );
    if (tokensText !== null) {
      inspectPaletteMappings(target.id, palette, tokensText, blockers);
    }
  }
  return blockers;
}

module.exports = {
  PALETTE_SCHEMA,
  inspectPaletteFoundation,
};

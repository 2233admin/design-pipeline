"use strict";

const {
  assertEnum,
  assertKeys,
  assertString,
  assertStringArray,
  canonicalJson,
  fail,
  sha256,
} = require("./contract-utils.cjs");

const DYNAMIC_COMPOSITION_SCHEMA = "design-pipeline.dynamic-design-composition.v1";
const COMPOSITION_STATUSES = ["ready", "blocked", "review-required"];

function invalid(message, details = {}) {
  fail("dynamic design composition", message, details);
}

function validateEvidenceReferences(refs) {
  assertStringArray(refs.map((ref) => ref.id), "evidenceRefs.ids", "dynamic design composition", { unique: true, min: 1 });
  refs.forEach((ref, index) => {
    assertKeys(ref, ["id", "receiptId", "contentHash"], ["id", "receiptId", "contentHash"], `evidenceRefs[${index}]`, "dynamic design composition");
    assertString(ref.id, `evidenceRefs[${index}].id`, "dynamic design composition");
    assertString(ref.receiptId, `evidenceRefs[${index}].receiptId`, "dynamic design composition");
    if (!/^sha256:[a-f0-9]{64}$/.test(ref.contentHash || "")) invalid(`evidenceRefs[${index}].contentHash must be a sha256:<digest> value`);
  });
}

function validateDynamicDesignComposition(composition) {
  const required = ["schema", "id", "receiptId", "status", "contentHash", "renderer", "scene", "motion", "evidenceRefs"];
  assertKeys(composition, required, required, "composition", "dynamic design composition");
  if (composition.schema !== DYNAMIC_COMPOSITION_SCHEMA) invalid("unsupported Dynamic Design composition schema");
  assertString(composition.id, "id", "dynamic design composition");
  assertString(composition.receiptId, "receiptId", "dynamic design composition");
  assertEnum(composition.status, COMPOSITION_STATUSES, "status", "dynamic design composition");
  assertKeys(composition.renderer, ["kind", "adapterId"], ["kind", "adapterId"], "renderer", "dynamic design composition");
  assertString(composition.renderer.kind, "renderer.kind", "dynamic design composition");
  assertString(composition.renderer.adapterId, "renderer.adapterId", "dynamic design composition");
  assertKeys(composition.scene, ["id", "subject", "elements"], ["id", "subject", "elements"], "scene", "dynamic design composition");
  assertString(composition.scene.id, "scene.id", "dynamic design composition");
  assertString(composition.scene.subject, "scene.subject", "dynamic design composition");
  assertStringArray(composition.scene.elements, "scene.elements", "dynamic design composition", { unique: true, min: 1 });
  assertKeys(composition.motion, ["channels", "interactions"], ["channels", "interactions", "reducedMotion"], "motion", "dynamic design composition");
  assertStringArray(composition.motion.channels, "motion.channels", "dynamic design composition", { unique: true, min: 1 });
  if (!Array.isArray(composition.motion.interactions) || !composition.motion.interactions.length) invalid("motion.interactions must contain at least one interaction");
  composition.motion.interactions.forEach((interaction, index) => {
    assertKeys(interaction, ["id", "type", "trigger"], ["id", "type", "trigger"], `motion.interactions[${index}]`, "dynamic design composition");
    assertString(interaction.id, `motion.interactions[${index}].id`, "dynamic design composition");
    assertString(interaction.type, `motion.interactions[${index}].type`, "dynamic design composition");
    assertString(interaction.trigger, `motion.interactions[${index}].trigger`, "dynamic design composition");
  });
  if (composition.motion.reducedMotion !== undefined) assertString(composition.motion.reducedMotion, "motion.reducedMotion", "dynamic design composition");
  if (!Array.isArray(composition.evidenceRefs) || !composition.evidenceRefs.length) invalid("evidenceRefs must contain at least one reference");
  validateEvidenceReferences(composition.evidenceRefs);
  if (!/^sha256:[a-f0-9]{64}$/.test(composition.contentHash || "")) invalid("contentHash must be a sha256:<digest> value");
  const body = { ...composition };
  delete body.contentHash;
  if (composition.contentHash !== `sha256:${sha256(canonicalJson(body))}`) invalid("contentHash does not match the composition");
  return { status: composition.status, composition };
}

function createDynamicDesignComposition(input) {
  const body = {
    schema: DYNAMIC_COMPOSITION_SCHEMA,
    id: input.id,
    receiptId: input.receiptId || input.id,
    status: input.status || "review-required",
    renderer: { ...input.renderer },
    scene: { ...input.scene, elements: [...input.scene.elements] },
    motion: { ...input.motion, channels: [...input.motion.channels], interactions: input.motion.interactions.map((interaction) => ({ ...interaction })) },
    evidenceRefs: input.evidenceRefs.map((ref) => ({ ...ref })),
  };
  const contentHash = `sha256:${sha256(canonicalJson(body))}`;
  return validateDynamicDesignComposition({ ...body, contentHash });
}

module.exports = {
  COMPOSITION_STATUSES,
  DYNAMIC_COMPOSITION_SCHEMA,
  createDynamicDesignComposition,
  validateDynamicDesignComposition,
};

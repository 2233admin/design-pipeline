"use strict";

const {
  assertEnum,
  assertKeys,
  assertObject,
  assertString,
  assertStringArray,
  fail,
  isObject,
} = require("./contract-utils.cjs");
const {
  createSurface,
  resolveSurfaceProfile,
  validateSurfaceBinding,
} = require("./surface-profile-core.cjs");

const SCHEMA = "design-pipeline.design-brief.v1";
const STATUSES = ["empty", "inferred", "clarifying", "proposed", "user_confirmed", "stale"];
const SOURCES = ["known", "user", "agent"];
const FACT_FIELDS = [
  "audience",
  "userProblem",
  "usageContext",
  "primaryActions",
  "contentAndDataDensity",
  "brandAndStyleConstraints",
  "platformConstraints",
  "referenceIds",
  "references",
  "successCriteria",
  "assumptions",
];
const CORE_FIELDS = ["audience", "primaryActions", "surface", "successCriteria"];
const LIST_FIELDS = new Set([
  "primaryActions",
  "brandAndStyleConstraints",
  "platformConstraints",
  "referenceIds",
  "references",
  "successCriteria",
  "assumptions",
]);
const SCALAR_FIELDS = new Set(["audience", "userProblem", "usageContext", "contentAndDataDensity"]);
const BRIEF_KEYS = [
  "schema",
  "briefId",
  "projectId",
  "surfaceId",
  "input",
  "evidence",
  "audience",
  "userProblem",
  "usageContext",
  "primaryActions",
  "contentAndDataDensity",
  "brandAndStyleConstraints",
  "platformConstraints",
  "references",
  "referenceIds",
  "successCriteria",
  "assumptions",
  "uncertainties",
  "surface",
  "status",
];

const QUESTION_DEFINITIONS = Object.freeze({
  audience: Object.freeze({
    id: "intake-audience",
    field: "audience",
    prompt: "Who is this design for?",
    why: "The audience determines the information hierarchy, language, and interaction defaults.",
    options: Object.freeze([
      { value: "team-members", label: "Team members" },
      { value: "administrators", label: "Administrators" },
      { value: "customers", label: "Customers" },
      { value: "other", label: "Another audience" },
    ]),
  }),
  primaryActions: Object.freeze({
    id: "intake-primary-actions",
    field: "primaryActions",
    prompt: "What is the primary task or action users must complete?",
    why: "The primary task sets the page's interaction posture and what deserves visual priority.",
    options: Object.freeze([
      { value: "search-and-browse", label: "Search and browse" },
      { value: "create-and-edit", label: "Create and edit" },
      { value: "review-and-approve", label: "Review and approve" },
      { value: "monitor-and-respond", label: "Monitor and respond" },
      { value: "other", label: "Another task" },
    ]),
  }),
  surface: Object.freeze({
    id: "intake-surface",
    field: "surface",
    prompt: "Which target Surface should this design run on?",
    why: "Surface capabilities and platform gates change layout, input, navigation, and accessibility decisions.",
    options: Object.freeze([
      { value: { platform: "web", framework: "react", profileVersion: "1" }, label: "Web" },
      { value: { platform: "mobile", framework: "react-native", profileVersion: "1" }, label: "Mobile" },
    ]),
  }),
  successCriteria: Object.freeze({
    id: "intake-success-criteria",
    field: "successCriteria",
    prompt: "How will you know this design succeeds?",
    why: "Success criteria make the direction reviewable and prevent an attractive but ineffective result.",
    options: Object.freeze([
      { value: "task-completion", label: "Users complete the primary task" },
      { value: "findability", label: "Users find the right information quickly" },
      { value: "error-reduction", label: "Fewer errors or support requests" },
      { value: "other", label: "Another measurable outcome" },
    ]),
  }),
});

const EVIDENCE_PROFILES = Object.freeze({
  ordinary_idea: Object.freeze({ detailDepth: "deep", coveredFields: Object.freeze([]) }),
  screenshot: Object.freeze({ detailDepth: "focused", coveredFields: Object.freeze(["visual-description"]) }),
  visual_reference: Object.freeze({ detailDepth: "focused", coveredFields: Object.freeze(["visual-description"]) }),
  existing_page: Object.freeze({ detailDepth: "focused", coveredFields: Object.freeze(["existing-layout", "implementation-context"]) }),
  local_html: Object.freeze({ detailDepth: "focused", coveredFields: Object.freeze(["existing-layout", "implementation-context"]) }),
  structured_brief: Object.freeze({ detailDepth: "minimal", coveredFields: Object.freeze(["structured-facts"]) }),
});

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
}

function evidencePolicy(evidence, scope) {
  assertObject(evidence, "evidence", scope);
  const hasKind = Object.hasOwn(evidence, "kind");
  const hasType = Object.hasOwn(evidence, "type");
  if ((hasKind && evidence.kind === undefined) || (hasType && evidence.type === undefined)) {
    fail(scope, "evidence kind/type cannot be explicitly undefined");
  }
  const explicitKind = hasKind ? evidence.kind : hasType ? evidence.type : undefined;
  let kind = explicitKind;
  if (kind === undefined && evidence.screenshot === true) kind = "screenshot";
  if (kind === undefined && evidence.visualReference === true) kind = "visual_reference";
  if (kind === undefined && evidence.existingPage === true) kind = "existing_page";
  if (kind === undefined && evidence.localHtml === true) kind = "local_html";
  if (kind === undefined && evidence.structuredBrief === true) kind = "structured_brief";
  if (kind === undefined) kind = "ordinary_idea";
  assertEnum(kind, Object.keys(EVIDENCE_PROFILES), "evidence kind", scope);
  const profile = EVIDENCE_PROFILES[kind];
  const coveredFields = evidence.coveredFields === undefined
    ? [...profile.coveredFields]
    : evidence.coveredFields;
  assertStringArray(coveredFields, "evidence coveredFields", scope, { unique: true });
  return { kind, detailDepth: profile.detailDepth, coveredFields: [...coveredFields] };
}

function questionContent(definition, policy) {
  const result = {
    prompt: definition.prompt,
    why: definition.why,
    options: clone(definition.options),
  };
  if (policy.kind === "screenshot" || policy.kind === "visual_reference") {
    if (definition.field === "audience") {
      result.prompt = "Who should use this visual reference?";
      result.why = "A visual reference already shows appearance; audience is the remaining decision for this field.";
    } else if (definition.field === "primaryActions") {
      result.prompt = "Which primary interaction should this visual reference support?";
      result.why = "The reference shows visual form, so confirm the intended interaction rather than re-describing its appearance.";
    } else if (definition.field === "successCriteria") {
      result.prompt = "What outcome should this visual reference help users achieve?";
      result.why = "A visual reference cannot establish effectiveness; the intended outcome is still a user decision.";
    }
  } else if (policy.kind === "existing_page" || policy.kind === "local_html") {
    if (definition.field === "audience") {
      result.prompt = "Who is the intended audience for this page?";
      result.why = "An existing page supplies implementation context; audience is the remaining decision for this field.";
    } else if (definition.field === "primaryActions") {
      result.prompt = "What should users accomplish differently on this existing page?";
      result.why = "The existing page supplies current interactions; the intended change or retention is the decision still needed.";
    } else if (definition.field === "successCriteria") {
      result.prompt = "What measurable improvement should this page change deliver?";
      result.why = "Existing behavior is evidence, not a success criterion; define the outcome for the change.";
    }
  } else if (policy.kind === "structured_brief") {
    result.prompt = `Which remaining ${definition.field} intent is not already covered by the structured brief?`;
    result.why = "The structured brief covers some detail, so only the unresolved intent should be clarified.";
  }
  return result;
}

function sourceFor(raw, field, scope) {
  if (!isObject(raw) || !Object.hasOwn(raw, "value")) return { value: raw, source: "known" };
  assertKeys(raw, ["value", "source"], ["value", "source"], `${field} fact`, scope);
  assertEnum(raw.source, SOURCES, "source", scope);
  return { value: raw.value, source: raw.source };
}

function validateFactValue(field, value, scope) {
  if (field === "surface") {
    assertObject(value, "surface value", scope);
    return;
  }
  if (SCALAR_FIELDS.has(field)) {
    assertString(value, field, scope);
    return;
  }
  if (LIST_FIELDS.has(field)) {
    assertStringArray(value, field, scope, { unique: true, min: 1 });
    return;
  }
  fail(scope, `unsupported design fact ${field}`);
}

function normalizeSurfaceValue(raw, projectId, surfaceId, scope) {
  assertObject(raw, "surface", scope);
  const candidate = { ...raw };
  if (candidate.projectId !== undefined || candidate.surfaceId !== undefined) {
    if (candidate.projectId !== projectId || candidate.surfaceId !== surfaceId) {
      fail(scope, "surface identity does not match the DesignBrief identity");
    }
    return createSurface({
      ...candidate,
      profileVersion: Object.hasOwn(candidate, "profileVersion") ? candidate.profileVersion : "1",
    });
  }
  assertString(candidate.platform, "platform", scope);
  assertString(candidate.framework, "framework", scope);
  const profile = resolveSurfaceProfile({
    platform: candidate.platform,
    framework: candidate.framework,
    profileVersion: Object.hasOwn(candidate, "profileVersion") ? candidate.profileVersion : "1",
  });
  return validateSurfaceBinding(
    { ...candidate, profileVersion: Object.hasOwn(candidate, "profileVersion") ? candidate.profileVersion : "1" },
    profile,
  );
}

function normalizeFact(field, raw, projectId, surfaceId, scope) {
  const fact = sourceFor(raw, field, scope);
  validateFactValue(field, fact.value, scope);
  if (field === "surface") {
    fact.value = normalizeSurfaceValue(fact.value, projectId, surfaceId, scope);
  }
  return fact;
}

function uncertainty(field, reason, status = "unresolved") {
  return { field, reason, status };
}

function removeUncertainties(records, field) {
  return records.filter((record) => record.field !== field);
}

function createDesignBrief(input) {
  const scope = "design-brief";
  assertObject(input, "input", scope);
  assertKeys(input, ["projectId", "surfaceId"], [
    "briefId",
    "projectId",
    "surfaceId",
    "input",
    "evidence",
    "surface",
    "platform",
    "framework",
    "profileVersion",
    ...FACT_FIELDS,
  ], "DesignBrief input", scope);
  assertString(input.projectId, "projectId", scope);
  assertString(input.surfaceId, "surfaceId", scope);
  if (input.input !== undefined) assertString(input.input, "input", scope);

  const brief = {
    schema: SCHEMA,
    briefId: input.briefId || `${input.projectId}:${input.surfaceId}`,
    projectId: input.projectId,
    surfaceId: input.surfaceId,
    uncertainties: [],
    status: "inferred",
  };
  if (input.input !== undefined) brief.input = input.input;
  if (input.evidence !== undefined) brief.evidence = evidencePolicy(input.evidence, scope);
  assertString(brief.briefId, "briefId", scope);

  const suppliedSurface = input.surface || (
    input.platform !== undefined || input.framework !== undefined
      ? {
          platform: input.platform,
          framework: input.framework,
          profileVersion: Object.hasOwn(input, "profileVersion") ? input.profileVersion : "1",
        }
      : undefined
  );
  if (suppliedSurface !== undefined) {
    brief.surface = normalizeFact("surface", suppliedSurface, brief.projectId, brief.surfaceId, scope);
  }

  for (const field of FACT_FIELDS) {
    if (input[field] === undefined) continue;
    brief[field] = normalizeFact(field, input[field], brief.projectId, brief.surfaceId, scope);
  }

  const facts = [...FACT_FIELDS, "surface"];
  for (const field of facts) {
    if (brief[field] === undefined) {
      brief.uncertainties.push(uncertainty(field, "Not supplied; ask before relying on this fact"));
    } else if (brief[field].source === "agent") {
      brief.uncertainties.push(uncertainty(field, "Agent suggestion requires user confirmation", "agent_suggested"));
    }
  }
  return validateDesignBrief(brief);
}

function isResolved(brief, field) {
  const fact = brief[field];
  return Boolean(fact && fact.source !== "agent");
}

function wasSkipped(brief, field) {
  return brief.uncertainties.some((record) => record.field === field && record.status === "skipped");
}

function nextIntakeQuestion(brief, evidence) {
  const normalized = validateDesignBrief(brief);
  const policy = evidence === undefined
    ? (normalized.evidence || evidencePolicy({}, "design-brief"))
    : evidencePolicy(evidence, "design-brief");
  for (const field of CORE_FIELDS) {
    const definition = QUESTION_DEFINITIONS[field];
    if (isResolved(normalized, field)) continue;
    const content = questionContent(definition, policy);
    return {
      id: definition.id,
      field: definition.field,
      prompt: content.prompt,
      why: content.why,
      options: content.options,
      status: wasSkipped(normalized, field) ? "skipped" : "required",
      skip: { allowed: true, label: "Skip for now" },
      evidencePolicy: clone(policy),
    };
  }
  return null;
}

function applyIntakeAnswer(brief, answer) {
  const scope = "design-brief-answer";
  const normalized = validateDesignBrief(brief);
  assertObject(answer, "answer", scope);
  assertKeys(answer, ["field"], ["field", "value", "source", "skip", "reason"], "intake answer", scope);
  assertString(answer.field, "field", scope);
  const field = answer.field === "primaryTask" ? "primaryActions" : answer.field;
  if (!CORE_FIELDS.includes(field) && !FACT_FIELDS.includes(field)) fail(scope, `unsupported intake field ${answer.field}`);
  const source = answer.source === undefined ? "user" : answer.source;
  assertEnum(source, SOURCES, "source", scope);
  const skipping = answer.skip === true || answer.value === undefined || answer.value === null || answer.value === "skip";
  const result = clone(normalized);
  if (skipping) {
    delete result[field];
    result.uncertainties = removeUncertainties(result.uncertainties, field);
    result.uncertainties.push(uncertainty(field, answer.reason || "User skipped this question", "skipped"));
  } else {
    const value = LIST_FIELDS.has(field) && !Array.isArray(answer.value) ? [answer.value] : answer.value;
    result[field] = normalizeFact(field, value, result.projectId, result.surfaceId, scope);
    result[field].source = source;
    result.uncertainties = removeUncertainties(result.uncertainties, field);
    if (source === "agent") {
      result.uncertainties.push(uncertainty(field, "Agent suggestion requires user confirmation", "agent_suggested"));
    }
  }
  result.status = CORE_FIELDS.every((coreField) => isResolved(result, coreField)) ? "proposed" : "clarifying";
  return validateDesignBrief(result);
}

function confirmDesignBrief(brief) {
  const normalized = validateDesignBrief(brief);
  const missing = CORE_FIELDS.filter((field) => !isResolved(normalized, field));
  if (missing.length) {
    fail("design-brief-confirmation", `cannot confirm without ${missing.join(", ")}`);
  }
  const result = clone(normalized);
  result.status = "user_confirmed";
  result.uncertainties = result.uncertainties.filter((record) => !CORE_FIELDS.includes(record.field));
  return validateDesignBrief(result);
}

function validateUncertainties(records, scope) {
  if (!Array.isArray(records)) fail(scope, "uncertainties must be an array");
  const seen = new Set();
  for (const record of records) {
    assertObject(record, "uncertainty", scope);
    assertKeys(record, ["field", "reason", "status"], ["field", "reason", "status"], "uncertainty", scope);
    assertString(record.field, "uncertainty field", scope);
    if (![...FACT_FIELDS, "surface"].includes(record.field)) fail(scope, `uncertainty field ${record.field} is unsupported`);
    assertString(record.reason, "uncertainty reason", scope);
    assertEnum(record.status, ["unresolved", "skipped", "agent_suggested"], "uncertainty status", scope);
    if (seen.has(record.field)) fail(scope, `duplicate uncertainty for ${record.field}`);
    seen.add(record.field);
  }
}

function validateUncertaintyConsistency(brief, scope) {
  const records = new Map(brief.uncertainties.map((record) => [record.field, record]));
  for (const field of [...FACT_FIELDS, "surface"]) {
    const fact = brief[field];
    const record = records.get(field);
    if (fact === undefined) {
      if (!record || !["unresolved", "skipped"].includes(record.status)) {
        fail(scope, `missing uncertainty for unresolved field ${field}`);
      }
      continue;
    }
    if (fact.source === "agent") {
      if (!record || record.status !== "agent_suggested") {
        fail(scope, `Agent fact ${field} must have an agent_suggested uncertainty`);
      }
      continue;
    }
    if (record) fail(scope, `resolved fact ${field} cannot retain an uncertainty`);
  }
}

function validateDesignBrief(brief) {
  const scope = "design-brief";
  assertObject(brief, "brief", scope);
  assertKeys(brief, ["schema", "briefId", "projectId", "surfaceId", "status", "uncertainties"], BRIEF_KEYS, "DesignBrief", scope);
  if (brief.schema !== SCHEMA) fail(scope, `schema must be ${SCHEMA}`);
  for (const key of ["briefId", "projectId", "surfaceId"]) assertString(brief[key], key, scope);
  assertEnum(brief.status, STATUSES, "status", scope);
  if (brief.input !== undefined) assertString(brief.input, "input", scope);
  if (brief.evidence !== undefined) brief.evidence = evidencePolicy(brief.evidence, scope);
  validateUncertainties(brief.uncertainties, scope);

  for (const field of FACT_FIELDS) {
    if (brief[field] === undefined) continue;
    const fact = brief[field];
    assertObject(fact, `${field} fact`, scope);
    assertKeys(fact, ["value", "source"], ["value", "source"], `${field} fact`, scope);
    assertEnum(fact.source, SOURCES, `${field} source`, scope);
    validateFactValue(field, fact.value, scope);
  }
  if (brief.surface !== undefined) {
    const fact = brief.surface;
    assertObject(fact, "surface fact", scope);
    assertKeys(fact, ["value", "source"], ["value", "source"], "surface fact", scope);
    assertEnum(fact.source, SOURCES, "surface source", scope);
    normalizeSurfaceValue(fact.value, brief.projectId, brief.surfaceId, scope);
  }
  validateUncertaintyConsistency(brief, scope);
  return clone(brief);
}

module.exports = {
  CORE_FIELDS,
  FACT_FIELDS,
  SOURCES,
  applyIntakeAnswer,
  confirmDesignBrief,
  createDesignBrief,
  nextIntakeQuestion,
  validateDesignBrief,
};

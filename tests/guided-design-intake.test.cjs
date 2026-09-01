"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyIntakeAnswer,
  confirmDesignBrief,
  createDesignBrief,
  nextIntakeQuestion,
  validateDesignBrief,
} = require("../skill/scripts/guided-design-intake-core.cjs");

test("starts with audience and preserves a user answer", () => {
  const brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "做一个团队知识库" });
  assert.equal(brief.status, "inferred");
  assert.equal(nextIntakeQuestion(brief, {}).field, "audience");

  const answered = applyIntakeAnswer(brief, { field: "audience", value: "team-members", source: "user" });
  assert.equal(answered.audience.value, "team-members");
  assert.equal(answered.audience.source, "user");
  assert.equal(nextIntakeQuestion(answered, {}).field, "primaryActions");
  assert.throws(() => confirmDesignBrief(answered), /primary task|surface|success/i);
});

test("asks one question at a time and does not ask for known facts", () => {
  const brief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "团队知识库",
    audience: "team-members",
    userProblem: "知识分散",
  });
  const question = nextIntakeQuestion(brief, {});
  assert.equal(question.field, "primaryActions");
  assert.equal(question.status, "required");
  assert.ok(Array.isArray(question.options));
  assert.deepEqual(question.skip, { allowed: true, label: "Skip for now" });
});

test("keeps Agent suggestions distinguishable and non-confirmable", () => {
  const brief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "团队知识库",
    audience: { value: "team-members", source: "agent" },
  });
  assert.equal(brief.audience.source, "agent");
  assert.equal(nextIntakeQuestion(brief, {}).field, "audience");
  assert.throws(() => confirmDesignBrief(brief), /audience/i);
});

test("keeps skipped fields unresolved and makes them revisitable", () => {
  const brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "团队知识库" });
  const skipped = applyIntakeAnswer(brief, { field: "audience", skip: true, source: "user" });
  assert.equal(skipped.audience, undefined);
  assert.deepEqual(skipped.uncertainties.find((item) => item.field === "audience"), {
    field: "audience",
    reason: "User skipped this question",
    status: "skipped",
  });
  assert.equal(nextIntakeQuestion(skipped, {}).field, "audience");
  assert.equal(nextIntakeQuestion(skipped, {}).status, "skipped");
  assert.throws(() => confirmDesignBrief(skipped), /audience/i);
});

test("never signals a first draft when every core field is skipped", () => {
  let brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "团队知识库" });
  for (const field of ["audience", "primaryActions", "surface", "successCriteria"]) {
    brief = applyIntakeAnswer(brief, { field, skip: true, source: "user" });
  }
  const question = nextIntakeQuestion(brief, {});
  assert.equal(question.field, "audience");
  assert.equal(question.status, "skipped");
  assert.throws(() => confirmDesignBrief(brief), /audience|primaryActions|surface|success/i);
});

test("takes the confirmation path for a complete brief", () => {
  const brief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "团队知识库",
    audience: "team-members",
    primaryActions: ["search-and-browse"],
    surface: { platform: "web", framework: "react" },
    successCriteria: ["task-completion"],
  });
  assert.equal(nextIntakeQuestion(brief, {}), null);
  const confirmed = confirmDesignBrief(brief);
  assert.equal(confirmed.status, "user_confirmed");
  assert.equal(confirmed.surface.value.platform, "web");
});

test("does not invent audience or success criteria from prose", () => {
  const brief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "面向管理者的团队知识库，目标是提高查找效率",
  });
  assert.equal(brief.audience, undefined);
  assert.equal(brief.successCriteria, undefined);
  assert.throws(() => confirmDesignBrief(brief), /audience|primary task|surface|success/i);
});

test("rejects fabricated sources, unknown states, and missing identity", () => {
  assert.throws(
    () => createDesignBrief({
      projectId: "p1",
      surfaceId: "web-admin",
      input: "团队知识库",
      audience: { value: "team-members", source: "inferred" },
    }),
    /source/i,
  );
  const brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "团队知识库" });
  assert.throws(() => validateDesignBrief({ ...brief, status: "done" }), /status/i);
  assert.throws(() => validateDesignBrief({ ...brief, projectId: undefined }), /projectId/i);
});

test("accepts every emitted core option as an intake answer", () => {
  let brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "团队知识库" });
  for (const field of ["audience", "primaryActions", "surface", "successCriteria"]) {
    const question = nextIntakeQuestion(brief, {});
    assert.equal(question.field, field);
    for (const option of question.options) {
      const optionBrief = applyIntakeAnswer(brief, { field, value: option.value, source: "user" });
      assert.equal(optionBrief[field].source, "user");
    }
    brief = applyIntakeAnswer(brief, { field, value: question.options[0].value, source: "user" });
  }
  assert.equal(nextIntakeQuestion(brief, {}), null);
});

test("enforces uncertainty consistency for absent, Agent, and resolved facts", () => {
  const brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "团队知识库" });
  assert.throws(() => validateDesignBrief({ ...brief, uncertainties: [] }), /uncertainty.*audience/i);

  const agentBrief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "团队知识库",
    audience: { value: "team-members", source: "agent" },
  });
  assert.throws(
    () => validateDesignBrief({
      ...agentBrief,
      uncertainties: agentBrief.uncertainties.filter((item) => item.field !== "audience"),
    }),
    /agent_suggested|Agent fact|audience/i,
  );

  const knownBrief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "团队知识库",
    audience: "team-members",
  });
  assert.throws(
    () => validateDesignBrief({
      ...knownBrief,
      uncertainties: [...knownBrief.uncertainties, { field: "audience", reason: "old", status: "unresolved" }],
    }),
    /resolved fact|uncertainty|audience/i,
  );
});

test("adapts intake policy to supported evidence signals", () => {
  const brief = createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "团队知识库" });
  const ordinary = nextIntakeQuestion(brief, { kind: "ordinary_idea" });
  const screenshot = nextIntakeQuestion(brief, { kind: "screenshot", coveredFields: ["visual-description", "color-palette"] });
  const structured = nextIntakeQuestion(brief, { kind: "structured_brief" });
  const existingPage = nextIntakeQuestion(brief, { kind: "existing_page" });
  const localHtml = nextIntakeQuestion(brief, { kind: "local_html" });
  assert.equal(ordinary.evidencePolicy.detailDepth, "deep");
  assert.equal(screenshot.evidencePolicy.detailDepth, "focused");
  assert.deepEqual(screenshot.evidencePolicy.coveredFields, ["visual-description", "color-palette"]);
  assert.equal(structured.evidencePolicy.detailDepth, "minimal");
  for (const question of [ordinary, screenshot, existingPage, localHtml, structured]) {
    assert.equal(question.field, "audience");
    assert.ok(question.prompt.endsWith("?"));
    assert.ok(question.options.every((option) => typeof option.value === "string"));
  }
  assert.doesNotMatch(screenshot.prompt, /purpose|interaction/i);

  assert.doesNotMatch(existingPage.prompt, /change|stay/i);
  assert.doesNotMatch(localHtml.prompt, /change|stay/i);
  assert.match(structured.prompt, /remaining.*audience|audience.*structured brief/i);
  assert.notEqual(ordinary.prompt, screenshot.prompt);
  assert.notEqual(screenshot.prompt, existingPage.prompt);
  assert.notEqual(existingPage.prompt, structured.prompt);
  assert.throws(() => nextIntakeQuestion(brief, { kind: "unsupported" }), /evidence kind/i);
});
test("persists explicit evidence policy and rejects falsy discriminators", () => {
  const brief = createDesignBrief({
    projectId: "p1",
    surfaceId: "web-admin",
    input: "团队知识库",
    evidence: { kind: "screenshot", coveredFields: ["visual-description"] },
    surface: { platform: "web", framework: "react", profileVersion: "1" },
  });
  assert.equal(brief.evidence.kind, "screenshot");
  assert.deepEqual(nextIntakeQuestion(brief).evidencePolicy.coveredFields, ["visual-description"]);
  assert.throws(() => createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "x", evidence: { kind: "" } }), /evidence/i);
  assert.throws(() => createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "x", evidence: { kind: null } }), /evidence/i);
  assert.throws(() => createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "x", evidence: { kind: "unknown" } }), /evidence/i);
  assert.throws(() => createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "x", surface: { platform: "web", framework: "react", profileVersion: null } }), /profileVersion/i);
  assert.throws(() => createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "x", evidence: { kind: undefined } }), /undefined|evidence/i);
  assert.throws(() => createDesignBrief({ projectId: "p1", surfaceId: "web-admin", input: "x", evidence: { type: undefined } }), /undefined|evidence/i);
});

test("validates a supplied Surface through the shared surface profile contract", () => {
  assert.throws(
    () => createDesignBrief({
      projectId: "p1",
      surfaceId: "mobile-app",
      input: "团队知识库",
      surface: { platform: "game", framework: "unity" },
    }),
    /game|reserved|platform/i,
  );
});

"use strict";

/*
 * The long-content stress pass of a `verify interaction` audit probe. It is evidence for the
 * component state gate's existing `long-content` and `overflow` states (APPLICABLE_STATES in
 * gate-core.cjs), measured with the audit's own overflow checks; it is not a gate of its own.
 *
 * After the normal audit at a viewport, `applyStress` rewrites the visible text of the loaded page
 * in place (the files are never touched): prose and labels are lengthened `textScale` times by
 * repeating their own words, every fourth data cell or list item becomes one unbroken word, and
 * numbers become 9,999,999. The page then settles and `auditPage` measures it again; only the
 * overflow checks (STRESS_CODES) are read from that second measurement, and only what the stress
 * newly breaks is reported, so a failure the normal audit already reports is not repeated.
 * Clipped text that is a deliberate truncation (ellipsis or line clamp) passes only when the full
 * value can still be reached (its own title holding the full text, a link with a real href, or a
 * details element) and fails otherwise. A page that reverts the rewrite fails the pass.
 *
 * Idea from feimacode/open-design-agent-kit packages/core/src/export/screenChecks.ts at
 * 927d4b6e6a29d8bfebdccadb4bb4a1b2a6438e73 (MIT, Copyright (c) 2026 Iven Xu): the 2.5x lengthening,
 * the unbroken cell string, the huge number and truncation with no way back. The code is ours and
 * measures through this repository's audit instead of scrollWidth comparisons.
 *
 * `applyStress` and `classifyClipping` run inside the page through page.evaluate and stay
 * self-contained; the rest is plain Node.
 */

const { fail, isObject, nonEmpty } = require("./contract-utils.cjs");

const SCOPE = "interaction probe";
const STRESS_CODES = Object.freeze(["audit.horizontal-overflow", "audit.viewport-bounds", "audit.content-clipping", "audit.content-overflow"]);
// The component state gate's states this pass is evidence for (gate-core.cjs APPLICABLE_STATES).
const STRESS_STATES = Object.freeze(["long-content", "overflow"]);
const STRESS_DEFAULTS = Object.freeze({ textScale: 2.5 });
const MAX_TEXT_SCALE = 10;
const STRESS_KEYS = ["textScale", "scope"];
// A word with no break opportunity: no hyphen, slash or space.
const UNBROKEN = "Wolfeschlegelsteinhausenbergerdorffinternationalholdingsltd";
const HUGE_NUMBER = "9,999,999";
const PASSING = ["passed", "not-applicable"];
const TRUNCATION_FIX = "Give truncated text a way back to the full value: a title attribute with the full text, a link to a detail view, or a details element; or let it wrap.";
const REVERTED_FIX = "The page re-rendered over the stress text; point stress.scope at a region it doesn't re-render, or disable re-rendering in the fixture.";
const SKIPPED_KEYS = ["shadowRoots", "inputsAndPlaceholders", "pseudoContent", "svgText"];
const STRESS_FIX_SUFFIX = " Real content is longer than the mock-up: let the text wrap (overflow-wrap: anywhere, min-width: 0 in flex and grid rows), or truncate it with a way back to the full value.";

// ---------- probe contract ----------

// Problems with the probe's `stress` field, appended to the audit probe's own error list.
function validateStress(stress, error) {
  if (!isObject(stress)) return error(".stress", "must be an object, for example {} or { \"textScale\": 2.5 }");
  const extras = Object.keys(stress).filter((key) => !STRESS_KEYS.includes(key));
  if (extras.length) error(".stress", `has unsupported properties: ${extras.join(", ")}; allowed: ${STRESS_KEYS.join(", ")}`);
  if (Object.hasOwn(stress, "textScale")) {
    const scale = stress.textScale;
    if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 1 || scale > MAX_TEXT_SCALE) error(".stress.textScale", `must be a number above 1 and at most ${MAX_TEXT_SCALE}`);
  }
  if (Object.hasOwn(stress, "scope")) {
    if (!Array.isArray(stress.scope) || !stress.scope.length) error(".stress.scope", "must be a non-empty list of selectors");
    else stress.scope.forEach((selector, index) => { if (!nonEmpty(selector)) error(`.stress.scope[${index}]`, "must be a non-empty selector"); });
  }
}

// Plain JSON for page.evaluate, or null when the probe declares no stress pass.
function stressOptions(probe) {
  if (!isObject(probe?.stress)) return null;
  return {
    textScale: typeof probe.stress.textScale === "number" ? probe.stress.textScale : STRESS_DEFAULTS.textScale,
    scope: Array.isArray(probe.stress.scope) ? [...probe.stress.scope] : ["body"],
    unbroken: UNBROKEN,
    hugeNumber: HUGE_NUMBER,
  };
}

// ---------- in-page ----------

// Runs in the page. Rewrites visible text nodes inside the scope and reports what it changed.
function applyStress(options) {
  const contractErrors = [];
  const scopes = [];
  options.scope.forEach((selector, index) => {
    let matches;
    try {
      matches = [...document.querySelectorAll(selector)];
    } catch (error) {
      contractErrors.push(`stress.scope[${index}] ${JSON.stringify(selector)} is not a selector this page accepts (${error.message})`);
      return;
    }
    if (!matches.length) contractErrors.push(`stress.scope[${index}] ${JSON.stringify(selector)} matches no element on the page`);
    scopes.push(...matches);
  });
  const skipped = { shadowRoots: 0, inputsAndPlaceholders: 0, pseudoContent: 0, svgText: 0 };
  if (contractErrors.length) return { contractErrors, textScale: options.textScale, changed: 0, lengthened: 0, unbroken: 0, numbers: 0, skipped };
  const SKIP = "script, style, noscript, template, svg, math, [aria-hidden=\"true\"]";
  // What the rewrite cannot reach, counted so the coverage names its blind spots: text in open
  // shadow roots (closed ones are invisible to the page), form values and placeholders, generated
  // ::before/::after content, and SVG text.
  const inScope = new Set();
  for (const scope of scopes) for (const el of [scope, ...scope.querySelectorAll("*")]) inScope.add(el);
  for (const el of inScope) {
    if (el.shadowRoot) skipped.shadowRoots += 1;
    if (el.matches("input, textarea, select") && (el.value || el.getAttribute("placeholder"))) skipped.inputsAndPlaceholders += 1;
    if (el.matches("svg text, svg tspan, svg textPath") && el.textContent.trim()) skipped.svgText += 1;
    for (const pseudo of ["::before", "::after"]) {
      const content = getComputedStyle(el, pseudo).content;
      if (/^["']/.test(content) && content.length > 2) skipped.pseudoContent += 1;
    }
  }
  const CELL = "td, th, li, dd, [role=\"cell\"], [role=\"gridcell\"], [role=\"listitem\"]";
  const nodes = [];
  const seen = new Set();
  for (const scope of scopes) {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (seen.has(node) || !parent || parent.closest(SKIP) || node.nodeValue.trim().length < 2) continue;
      if (!parent.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) continue;
      seen.add(node);
      nodes.push(node);
    }
  }
  let lengthened = 0;
  let unbroken = 0;
  let numbers = 0;
  let cells = 0;
  // Kept on the page so the clipping classifier can read each text's pre-stress value and the
  // revert check can tell whether the page re-rendered over the stress.
  const record = { nodes: [], values: [], originals: new Map() };
  window.__designPipelineStress = record;
  for (const node of nodes) {
    const text = node.nodeValue;
    const trimmed = text.trim();
    const start = text.indexOf(trimmed);
    const lead = text.slice(0, start);
    const tail = text.slice(start + trimmed.length);
    let next;
    if (/\d/.test(trimmed) && /^[\s$€£¥%+\-−.,:/()\d]+$/.test(trimmed)) {
      next = trimmed.replace(/\d[\d,.\s]*\d|\d/, options.hugeNumber);
      numbers += 1;
    } else if (node.parentElement.closest(CELL) && cells++ % 4 === 0) {
      next = options.unbroken;
      unbroken += 1;
    } else {
      const words = trimmed.split(/\s+/);
      const target = Math.ceil(trimmed.length * options.textScale);
      next = trimmed;
      for (let index = 0; next.length < target; index += 1) next += ` ${words[index % words.length]}`;
      lengthened += 1;
    }
    record.originals.set(node, text);
    node.nodeValue = lead + next + tail;
    record.nodes.push(node);
    record.values.push(node.nodeValue);
  }
  return { contractErrors, textScale: options.textScale, changed: lengthened + unbroken + numbers, lengthened, unbroken, numbers, skipped };
}

// Runs in the page after the stressed audit. A rewritten text that is detached or no longer holds
// its stress value was reverted by the page (a MutationObserver, a framework re-render), so what
// the audit measured may have been the original copy.
function checkStressHeld() {
  const record = window.__designPipelineStress;
  if (!record) return { reverted: 0, checked: 0 };
  let reverted = 0;
  record.nodes.forEach((node, index) => { if (!node.isConnected || node.nodeValue !== record.values[index]) reverted += 1; });
  return { reverted, checked: record.nodes.length };
}

// Runs in the page. For each clipped element the stressed audit reported, whether the clip is a
// deliberate truncation (text-overflow: ellipsis or a line clamp on it or on an ancestor up to the
// clipping element) and whether the full value can be reached from it. A way back is one of: a
// title on the element itself whose whitespace-collapsed text contains the element's full
// pre-stress text; an enclosing link with a real href (not empty, not "#", not javascript:); or an
// enclosing details element. A title on an ancestor or on an unrelated child, a stale title and
// href="#" are not ways back.
function classifyClipping(items) {
  const record = window.__designPipelineStress;
  const collapse = (text) => String(text || "").replace(/\s+/g, " ").trim();
  const original = (element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text = "";
    for (let node = walker.nextNode(); node; node = walker.nextNode()) text += record?.originals.has(node) ? record.originals.get(node) : node.nodeValue;
    return collapse(text);
  };
  return items.map(({ selector, related }) => {
    let element = null;
    let clip = null;
    try {
      element = document.querySelector(selector);
      clip = related ? document.querySelector(related) : null;
    } catch {
      return { selector, truncation: false, wayBack: false };
    }
    if (!element) return { selector, truncation: false, wayBack: false };
    let truncation = false;
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      const clamp = style.webkitLineClamp || style.getPropertyValue("-webkit-line-clamp");
      if (style.textOverflow === "ellipsis" || (clamp && clamp !== "none")) truncation = true;
      if (truncation || node === clip) break;
    }
    const full = original(element);
    const title = element.hasAttribute("title") ? collapse(element.getAttribute("title")) : "";
    const titled = full.length > 0 && title.includes(full);
    const link = element.closest("a[href]");
    const href = link ? link.getAttribute("href").trim() : "";
    const linked = Boolean(link) && href !== "" && href !== "#" && !/^javascript:/i.test(href);
    const wayBack = titled || linked || Boolean(element.closest("details"));
    return { selector, truncation, wayBack };
  });
}

// ---------- summary ----------

const itemKey = (item) => `${item.selector}`;

function checkStatus(checked, failed, indeterminate) {
  if (failed) return "failed";
  if (indeterminate) return "indeterminate";
  return checked > 0 ? "passed" : "not-applicable";
}

// One viewport's stress result against that viewport's normal audit: per STRESS_CODES check the
// items the stress newly breaks become error findings; a reachable truncation passes.
function summarizeStress(probeId, where, baseline, stress, readCheck) {
  if (!isObject(stress) || !isObject(stress.applied)) fail(SCOPE, `audit ${probeId} at ${where} declares stress but has no stress measurement`);
  const applied = stress.applied;
  if (Array.isArray(applied.contractErrors) && applied.contractErrors.length) return { contractErrors: applied.contractErrors };
  const counts = ["changed", "lengthened", "unbroken", "numbers"];
  if (!counts.every((key) => Number.isInteger(applied[key]) && applied[key] >= 0) || !(applied.textScale > 1)) fail(SCOPE, `audit ${probeId} at ${where} has an incomplete stress record`);
  const skipped = isObject(applied.skipped) ? applied.skipped : null;
  if (!skipped || !SKIPPED_KEYS.every((key) => Number.isInteger(skipped[key]) && skipped[key] >= 0)) fail(SCOPE, `audit ${probeId} at ${where} has an incomplete stress record`);
  const base = { textScale: applied.textScale, changedTexts: applied.changed, lengthened: applied.lengthened, unbroken: applied.unbroken, numbers: applied.numbers, skipped: Object.fromEntries(SKIPPED_KEYS.map((key) => [key, skipped[key]])), states: [...STRESS_STATES] };
  if (applied.changed === 0) {
    return { coverage: { ...base, status: "not-applicable", hint: "The stress scope holds no visible text to lengthen; declare long-content and overflow from other evidence, or point stress.scope at the text the page does not author.", checks: STRESS_CODES.map((code) => ({ code, status: "not-applicable", checked: 0, failed: 0, indeterminate: 0 })) }, findings: [] };
  }
  const result = stress.result;
  if (!isObject(result)) fail(SCOPE, `audit ${probeId} at ${where} has no stressed measurement`);
  if (Array.isArray(result.contractErrors) && result.contractErrors.length) return { contractErrors: result.contractErrors };
  if (!isObject(result.checks)) fail(SCOPE, `audit ${probeId} at ${where} has no stressed checks`);
  const reverted = stress.reverted;
  if (!Number.isInteger(reverted) || reverted < 0) fail(SCOPE, `audit ${probeId} at ${where} has no stress revert check`);
  const truncation = new Map((Array.isArray(stress.truncation) ? stress.truncation : []).map((entry) => [entry.selector, entry]));
  const findings = [];
  const checks = STRESS_CODES.map((code) => {
    const before = readCheck(baseline[code], code, `${probeId} at ${where}`);
    const after = readCheck(result.checks[code], code, `${probeId} at ${where} with stressed text`);
    if (!after.declared) return { code, status: "not-declared", checked: 0, failed: 0, indeterminate: 0 };
    const known = new Set([...before.failed, ...before.indeterminate].map(itemKey));
    let failed = 0;
    let indeterminate = 0;
    let reachable = 0;
    const report = (item, kind) => {
      const label = `${where} with ${applied.textScale}x text`;
      const clipped = code === "audit.content-clipping" ? truncation.get(item.selector) : null;
      if (clipped?.truncation && clipped.wayBack) { reachable += 1; return; }
      if (kind === "failed") failed += 1; else indeterminate += 1;
      const truncated = Boolean(clipped?.truncation);
      findings.push({
        code, severity: "error", probeId, viewport: where, pass: "stress", selector: item.selector, expected: truncated ? "truncated text with a way back to the full value" : item.expected, actual: item.actual,
        message: `${label}: ${truncated ? "text is truncated with no way to read the full value" : item.message}`,
        fix: truncated ? TRUNCATION_FIX : `${item.fix}${STRESS_FIX_SUFFIX}`,
        ...(item.related ? { related: item.related } : {}),
      });
    };
    for (const item of after.failed) if (!known.has(itemKey(item))) report(item, "failed");
    for (const item of after.indeterminate) if (!known.has(itemKey(item))) report(item, "indeterminate");
    return { code, status: checkStatus(after.checked, failed, indeterminate), checked: after.checked, failed, indeterminate, ...(reachable ? { truncatedWithWayBack: reachable } : {}), ...(before.failedCount + before.indeterminateCount ? { alreadyReported: before.failedCount + before.indeterminateCount } : {}) };
  });
  if (reverted) {
    findings.push({
      code: "stress-reverted", severity: "error", probeId, viewport: where, pass: "stress",
      expected: "every rewritten text still holds its stress value after the stressed audit", actual: `${reverted} of ${applied.changed} rewritten texts reverted`,
      message: `${where} with ${applied.textScale}x text: the page re-rendered over the stress text, so the stressed audit may have measured the original copy`,
      fix: REVERTED_FIX,
    });
  }
  const settled = !reverted && checks.every((check) => PASSING.includes(check.status) || check.status === "not-declared");
  return { coverage: { ...base, reverted, status: settled ? "passed" : "failed", checks }, findings };
}

// The failed and indeterminate content-clipping items of a stressed measurement, for classifyClipping.
function clippedItems(result) {
  const check = isObject(result?.checks) ? result.checks["audit.content-clipping"] : null;
  if (!isObject(check)) return [];
  return [...(Array.isArray(check.failed) ? check.failed : []), ...(Array.isArray(check.indeterminate) ? check.indeterminate : [])]
    .filter((item) => nonEmpty(item?.selector))
    .map(({ selector, related }) => ({ selector, related: nonEmpty(related) ? related : null }));
}

// Native completion: a probe that declares stress needs a settled stress record at every viewport.
function stressCoverageFailure(entry) {
  const stress = entry?.stress;
  if (!isObject(stress) || !PASSING.includes(stress.status) || stress.textScale <= 1 || !Array.isArray(stress.checks)) return "has no passing stress coverage";
  if (stress.checks.map((check) => check?.code).join() !== STRESS_CODES.join()) return "does not cover every stress check";
  if (stress.status === "passed" && !(stress.changedTexts > 0)) return "claims a stress pass that lengthened no text";
  if (stress.status === "passed" && stress.reverted !== 0) return "claims a stress pass the page reverted";
  if (stress.checks.some((check) => !(PASSING.includes(check?.status) || check?.status === "not-declared") || !Number.isInteger(check.checked) || (check.status === "passed" && check.checked === 0))) return "has a stress check without a passing status";
  return null;
}

module.exports = { SKIPPED_KEYS, STRESS_CODES, STRESS_STATES, STRESS_DEFAULTS, MAX_TEXT_SCALE, UNBROKEN, HUGE_NUMBER, validateStress, stressOptions, applyStress, checkStressHeld, classifyClipping, summarizeStress, clippedItems, stressCoverageFailure };

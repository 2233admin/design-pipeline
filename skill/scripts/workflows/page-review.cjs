"use strict";

// Review on the page itself (OpenSpec change owner-attention-page-review). `evidence review-page` writes
// evidence/review.html, a copy of index.html with the comment overlay inlined; the owner submits one
// review there as a block, and `decide --page-review <file>` records it as the owner's verdict.

const fs = require("node:fs");
const path = require("node:path");
const { fail, resolveInside, sha256 } = require("../contract-utils.cjs");
const { pageDigest, refsCapture, refsCurrent } = require("./web.cjs");

const SCHEMA = "design-pipeline.page-review.v1";
const REVIEW_PAGE = "evidence/review.html";
const KEPT_DIR = "evidence/page-review";
const OVERLAY = path.resolve(__dirname, "../../tools/page-review/overlay.js");
const MAX_BYTES = 256 * 1024;
const KEYS = ["schema", "page", "capture", "ask", "verdict", "words", "comments", "submittedAt"];

// The ask a page review answers: the owner's section review or the final review. A delegated
// self-check is a run, and a directed section faces the art director, so neither is offered.
function currentAsk(root) {
  const next = require("../workflow-core.cjs").nextAction(root);
  if (next.deliverable !== "web" || next.type !== "ask" || next.director) return null;
  if (next.stage === "review") return { stage: "review", choice: null };
  if (next.stage === "build" && next.section) return { stage: "section", choice: next.section };
  return null;
}

const askName = ask => ask.stage === "review" ? "the final review" : `the review of section ${ask.choice}`;

// The current desktop capture, which maps the owner's clicks to references.
function desktopCapture(root, what) {
  const doc = refsCapture(root, "desktop");
  if (!doc || !refsCurrent(root, doc, "desktop")) fail("workflow", `${what} needs a current evidence/refs.json. Fix: run evidence refs, then ${what === "the review page" ? "evidence review-page" : "the page review"} again`, { code: "WORKFLOW_NOT_READY" });
  return doc;
}

// The page with the overlay: <base href="../"> first in <head>, so the copy in evidence/ loads the
// project's files, and the overlay with its data just before </body>.
function reviewHtml(html, data) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const script = `<script>\n${fs.readFileSync(OVERLAY, "utf8").replace("var DATA = __DATA__;", () => `var DATA = ${json};`)}</script>\n`;
  const base = '<base href="../">';
  const head = /<head\b[^>]*>/i.exec(html);
  let out = head ? `${html.slice(0, head.index + head[0].length)}${base}${html.slice(head.index + head[0].length)}`
    : html.replace(/^(\s*<!doctype[^>]*>)?/i, match => `${match}${base}`);
  const end = out.toLowerCase().lastIndexOf("</body>");
  out = end >= 0 ? `${out.slice(0, end)}${script}${out.slice(end)}` : `${out}${script}`;
  return out;
}

function buildReviewPage(root) {
  const page = pageDigest(root);
  if (!page) fail("workflow", "index.html not found. Fix: build the page first", { code: "PAGE_MISSING" });
  const ask = currentAsk(root);
  if (!ask) fail("workflow", "the review page answers the owner's section review or final review, and next is not asking the owner for one. Fix: follow next", { code: "WORKFLOW_NOT_READY" });
  const desktop = desktopCapture(root, "the review page");
  const mobile = refsCapture(root, "mobile");
  // A section review numbers only that section's elements: a comment elsewhere is about the section.
  const pick = doc => doc.refs.filter(item => ask.stage === "review" || item.section === ask.choice).map(({ ref, selector }) => ({ ref, selector }));
  const data = {
    schema: SCHEMA, page, capture: desktop.png, ask,
    refs: { desktop: pick(desktop), mobile: mobile && refsCurrent(root, mobile, "mobile") ? pick(mobile) : [] },
  };
  const target = resolveInside(root, REVIEW_PAGE, "review page", { scope: "workflow" });
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, reviewHtml(fs.readFileSync(path.join(root, "index.html"), "utf8"), data));
    fs.renameSync(temp, target);
  } finally {
    fs.rmSync(temp, { force: true });
  }
  return { status: "written", file: REVIEW_PAGE, ask, refs: { desktop: data.refs.desktop.length, mobile: data.refs.mobile.length } };
}

// Reads a submitted block and returns the decide options it stands for. Refuses, naming the cause, a
// block that is not valid, was given on another page version or capture, or answers another ask.
function pageReviewOptions(root, file) {
  const target = resolveInside(root, file, "--page-review", { scope: "workflow", mustExist: true });
  if (!fs.statSync(target).isFile() || fs.statSync(target).size > MAX_BYTES) fail("workflow", `--page-review must be the block file the review page gave (at most ${MAX_BYTES / 1024} KiB)`);
  const bytes = fs.readFileSync(target);
  let block;
  try {
    block = JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    fail("workflow", `--page-review is not the block the review page gave (${error.message}). Fix: use the downloaded file, or paste the block into a file unchanged`);
  }
  const invalid = why => fail("workflow", `--page-review is not a valid page review: ${why}. Fix: use the block the review page gave, unchanged`);
  if (!block || typeof block !== "object" || Array.isArray(block)) invalid("not an object");
  if (block.schema !== SCHEMA) invalid(`schema must be ${SCHEMA}`);
  const extra = Object.keys(block).filter(key => !KEYS.includes(key));
  if (extra.length) invalid(`unknown field ${extra[0]}`);
  if (!["accept", "reject"].includes(block.verdict)) invalid("verdict must be accept or reject");
  if (typeof block.words !== "string") invalid("words must be text");
  if (!Array.isArray(block.comments) || !block.comments.every(item => item && typeof item === "object" && (item.ref === null || typeof item.ref === "string") && typeof item.text === "string" && item.text.trim())) invalid("comments must be a list of {ref, text}");
  if (block.verdict === "accept" && block.comments.length) invalid("an acceptance carries no comments");
  const ask = block.ask;
  if (!ask || !["section", "review"].includes(ask.stage) || (ask.stage === "section" ? typeof ask.choice !== "string" : ask.choice !== null)) invalid("ask must name a section review or the final review");
  if (block.page !== pageDigest(root)) fail("workflow", "this review was given on an earlier version of the page. Fix: run evidence review-page again and ask the owner to review the current page", { code: "WORKFLOW_NOT_READY" });
  if (block.capture !== desktopCapture(root, "--page-review").png) fail("workflow", "this review was given on an earlier numbered capture of the page. Fix: run evidence review-page again and ask the owner to review it", { code: "WORKFLOW_NOT_READY" });
  const current = currentAsk(root);
  if (!current || current.stage !== ask.stage || current.choice !== ask.choice) {
    fail("workflow", `this review answers ${askName(ask)}, and next ${current ? `asks for ${askName(current)}` : "is not asking the owner for a review"}. Fix: follow next, run evidence review-page and ask the owner again`, { code: "WORKFLOW_NOT_READY" });
  }
  const comments = block.comments.map(item => ({ ref: item.ref ? item.ref.trim() : null, text: item.text.trim() }));
  const answer = [block.words.trim(), ...comments.map(item => item.ref ? `${item.ref}: ${item.text}` : item.text)].filter(Boolean).join("; ");
  const hash = sha256(bytes);
  return {
    stage: ask.stage, ...(ask.choice ? { choice: ask.choice } : {}), verdict: block.verdict, by: "owner",
    ...(answer ? { answer } : {}), ref: [...new Set(comments.map(item => item.ref).filter(Boolean))],
    via: `page-review:sha256:${hash}`, pageReview: { bytes, hash },
  };
}

// Keeps the block decide recorded, content-addressed, so the role entry's via names its bytes.
function keepPageReview(root, { bytes, hash }) {
  const target = resolveInside(root, `${KEPT_DIR}/${hash}.json`, "kept page review", { scope: "workflow" });
  if (fs.existsSync(target) && sha256(fs.readFileSync(target)) === hash) return;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temp, bytes);
    fs.renameSync(temp, target);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}

module.exports = { REVIEW_PAGE, SCHEMA, buildReviewPage, keepPageReview, pageReviewOptions, reviewHtml };

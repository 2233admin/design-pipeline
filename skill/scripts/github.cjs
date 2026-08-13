#!/usr/bin/env node
"use strict";

// Read-only GitHub orientation for agents. Requires gh on PATH and an authenticated gh session.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const FAILING = new Set(["failure", "cancelled", "timed_out", "action_required"]);
const ERROR_MARKERS = /##\[error\]|\berror\b|\bfail(?:ed|ure)?\b|exception|traceback|panic|fatal/i;

function truncate(value, max) {
  return value.length <= max ? value : `${value.slice(0, max)} […+${value.length - max} chars]`;
}

function snippet(log, before = 40, after = 5, cap = 100) {
  const lines = log.split("\n");
  const lastMatch = (pattern) => {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (pattern.test(lines[index])) return index;
    }
    return -1;
  };
  let hit = lastMatch(/##\[error\]/);
  if (hit === -1) hit = lastMatch(ERROR_MARKERS);
  const window = hit === -1
    ? lines.slice(-cap)
    : lines.slice(Math.max(0, hit - before), Math.min(lines.length, hit + after + 1));
  return window.slice(-cap).join("\n");
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "job";
}

async function gh(args, options = {}) {
  try {
    const result = await execFileAsync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return result.stdout;
  } catch (error) {
    const code = error && error.code;
    if (typeof code === "number" && options.okCodes?.includes(code)) {
      if (error.stdout?.trim() || !error.stderr?.trim()) return error.stdout || "";
    }
    if (code === "ENOENT") throw new Error("gh not found on PATH; install the GitHub CLI");
    const detail = code === "ERR_CHILD_PROCESS_STDOUT_MAXBUFFER"
      ? "output exceeded 64MB maxBuffer"
      : truncate(String(error.stderr || error.stdout || error.message || "").trim(), 2000);
    const command = args.map((arg) => truncate(String(arg).split("\n")[0], 60)).join(" ");
    throw new Error(`gh ${command}\n${detail}`);
  }
}

async function ghJson(args, options) {
  const output = await gh(args, options);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`unexpected non-JSON from gh ${args.slice(0, 3).join(" ")}: ${output.slice(0, 200)}`);
  }
}

async function resolveRepo(flag) {
  if (flag) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(flag)) throw new Error(`--repo must be owner/repo, got: ${flag}`);
    return flag;
  }
  try {
    return (await gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"])).trim();
  } catch (error) {
    if (/gh not found|auth login|authentication/i.test(String(error.message || error))) throw error;
    throw new Error("not inside a repo with a GitHub remote; pass -R owner/repo");
  }
}

async function resolvePr(argument, repoFlag) {
  if (argument !== undefined) {
    const number = Number(argument);
    if (!Number.isInteger(number) || number <= 0) throw new Error(`PR must be a positive number, got: ${argument}`);
    return number;
  }
  if (repoFlag) throw new Error("with -R, also pass the PR number");
  return (await ghJson(["pr", "view", "--json", "number"])).number;
}

const VALUE_OPTIONS = new Set(["--repo", "-R", "--author", "--since", "--workflow", "--limit", "-L", "--pr"]);
const BOOLEAN_OPTIONS = new Set(["--all", "--full", "--json", "--list", "--help", "-h"]);

function parseArgs(argv) {
  const options = { positionals: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const equals = token.indexOf("=");
    const name = equals === -1 ? token : token.slice(0, equals);
    if (BOOLEAN_OPTIONS.has(name)) {
      options[name.slice(2) === "h" ? "help" : name.slice(2)] = true;
      continue;
    }
    if (VALUE_OPTIONS.has(name)) {
      const value = equals === -1 ? argv[++index] : token.slice(equals + 1);
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
      const key = name === "-R" ? "repo" : name === "-L" ? "limit" : name.slice(2);
      options[key] = value;
      continue;
    }
    if (token.startsWith("-")) throw new Error(`unknown option: ${token}`);
    options.positionals.push(token);
  }
  return options;
}

function formatBody(value, max, full) {
  const body = full ? value : truncate(value, max);
  return body.replace(/\n/g, "\n  ");
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

const THREAD_STATS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) { pageInfo { hasNextPage } nodes { isResolved } }
    }
  }
}`;

async function fetchThreadStats(repo, number) {
  const [owner, name] = repo.split("/");
  const data = JSON.parse(await gh([
    "api", "graphql", "-f", `query=${THREAD_STATS_QUERY}`,
    "-f", `owner=${owner}`, "-f", `repo=${name}`, "-F", `number=${number}`,
  ]));
  const connection = data.data.repository.pullRequest.reviewThreads;
  return {
    open: connection.nodes.filter((item) => !item.isResolved).length,
    total: connection.nodes.length,
    capped: Boolean(connection.pageInfo.hasNextPage),
  };
}

async function prSnapshot(options) {
  if (options.positionals.length > 1) throw new Error("pr-snapshot accepts at most one PR number");
  const number = await resolvePr(options.positionals[0], options.repo);
  const repo = await resolveRepo(options.repo);
  const fields = "number,title,state,isDraft,author,url,createdAt,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus,reviewDecision,additions,deletions,changedFiles,files,reviews,comments,body";
  const [pr, checksRaw, threads] = await Promise.all([
    ghJson(["pr", "view", String(number), "-R", repo, "--json", fields]),
    gh(["pr", "checks", String(number), "-R", repo, "--json", "name,state,bucket"], { okCodes: [1, 8] }).catch((error) => {
      if (/no checks reported/i.test(String(error.message || error))) return "[]";
      throw error;
    }),
    fetchThreadStats(repo, number),
  ]);
  const checks = JSON.parse(checksRaw || "[]");
  const latestReview = new Map();
  for (const review of pr.reviews || []) {
    if (review.state !== "PENDING") latestReview.set(review.author?.login || "ghost", review.state);
  }
  const result = {
    ...pr,
    checks,
    threads,
    reviewsLatest: Object.fromEntries(latestReview),
  };
  if (options.json) return printJson(result);

  const draft = pr.isDraft ? " (draft)" : "";
  console.log(`${repo}#${pr.number}: ${pr.title}`);
  console.log(`${pr.state}${draft} · @${pr.author?.login || "ghost"} · created ${pr.createdAt.slice(0, 10)} · ${pr.url}`);
  console.log(`${pr.baseRefName} ← ${pr.headRefName} @ ${pr.headRefOid.slice(0, 12)}`);
  console.log(`mergeable ${pr.mergeable} · mergeState ${pr.mergeStateStatus} · review ${pr.reviewDecision || "NONE"}`);
  const buckets = new Map();
  for (const check of checks) buckets.set(check.bucket, [...(buckets.get(check.bucket) || []), check]);
  const counts = ["pass", "fail", "pending", "skipping", "cancel"]
    .map((bucket) => [bucket, buckets.get(bucket)?.length || 0])
    .filter(([, count]) => count > 0)
    .map(([bucket, count]) => `${count} ${bucket}`)
    .join(" · ");
  console.log(`checks: ${counts || "none reported"}`);
  for (const check of buckets.get("fail") || []) console.log(`  ✗ ${check.name}`);
  console.log(`threads: ${threads.open} open / ${threads.total}${threads.capped ? "+" : ""}`);
  console.log(`files: ${pr.changedFiles} (+${pr.additions} −${pr.deletions})`);
  for (const file of (pr.files || []).slice(0, 50)) console.log(`  +${file.additions} −${file.deletions}  ${file.path}`);
  if ((pr.files || []).length > 50) console.log(`  … ${(pr.files || []).length - 50} more files`);
  if (latestReview.size) console.log(`reviews: ${[...latestReview].map(([author, state]) => `${author} ${state}`).join(" · ")}`);
  if ((pr.comments || []).length) {
    console.log(`comments: ${pr.comments.length}${pr.comments.length > 5 ? " (last 5)" : ""}`);
    for (const comment of pr.comments.slice(-5)) {
      console.log(`  @${comment.author?.login || "ghost"} ${comment.createdAt.slice(0, 10)}: ${formatBody(comment.body, 400, options.full)}`);
    }
  }
  if (pr.body) console.log(`body:\n  ${formatBody(pr.body, 600, options.full)}`);
}

const THREADS_QUERY = `
query($owner: String!, $repo: String!, $number: Int!, $cursor: String, $withConvo: Boolean!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      reviews(last: 50) @include(if: $withConvo) { pageInfo { hasPreviousPage } nodes { author { login } state submittedAt body } }
      comments(last: 50) @include(if: $withConvo) { pageInfo { hasPreviousPage } nodes { author { login } createdAt body } }
      reviewThreads(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          isResolved isOutdated path line originalLine
          comments(first: 50) { pageInfo { hasNextPage } nodes { author { login } createdAt body } }
        }
      }
    }
  }
}`;

async function fetchConversation(repo, number) {
  const [owner, name] = repo.split("/");
  const conversation = [];
  const threads = [];
  let moreConversation = false;
  let cursor = null;
  let firstPage = true;
  do {
    const data = JSON.parse(await gh([
      "api", "graphql", "-f", `query=${THREADS_QUERY}`,
      "-f", `owner=${owner}`, "-f", `repo=${name}`, "-F", `number=${number}`,
      "-F", `withConvo=${firstPage}`, ...(cursor ? ["-f", `cursor=${cursor}`] : []),
    ]));
    const pullRequest = data.data.repository.pullRequest;
    if (firstPage) {
      for (const review of pullRequest.reviews.nodes) {
        if (review.state === "PENDING" || !review.body?.trim()) continue;
        conversation.push({ kind: "review", state: review.state, author: review.author?.login || "ghost", createdAt: review.submittedAt, body: review.body });
      }
      for (const comment of pullRequest.comments.nodes) {
        conversation.push({ kind: "comment", author: comment.author?.login || "ghost", createdAt: comment.createdAt, body: comment.body });
      }
      moreConversation = pullRequest.reviews.pageInfo.hasPreviousPage || pullRequest.comments.pageInfo.hasPreviousPage;
      conversation.sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt));
    }
    for (const thread of pullRequest.reviewThreads.nodes) {
      threads.push({
        isResolved: thread.isResolved,
        isOutdated: thread.isOutdated,
        path: thread.path,
        line: thread.line,
        originalLine: thread.originalLine,
        moreComments: thread.comments.pageInfo.hasNextPage,
        comments: thread.comments.nodes.map((comment) => ({ author: comment.author?.login || "ghost", createdAt: comment.createdAt, body: comment.body })),
      });
    }
    cursor = pullRequest.reviewThreads.pageInfo.hasNextPage ? pullRequest.reviewThreads.pageInfo.endCursor : null;
    firstPage = false;
  } while (cursor);
  return { conversation, moreConversation, threads };
}

async function prThreads(options) {
  if (options.positionals.length > 1) throw new Error("pr-threads accepts at most one PR number");
  const number = await resolvePr(options.positionals[0], options.repo);
  const repo = await resolveRepo(options.repo);
  let { conversation, moreConversation, threads } = await fetchConversation(repo, number);
  const totalThreads = threads.length;
  let hidden = 0;
  if (!options.all) {
    threads = threads.filter((thread) => !thread.isResolved && !thread.isOutdated);
    hidden = totalThreads - threads.length;
  }
  if (options.author) {
    conversation = conversation.filter((item) => item.author === options.author);
    threads = threads.filter((thread) => thread.comments.some((comment) => comment.author === options.author));
  }
  if (options.since) {
    const since = Date.parse(options.since);
    if (Number.isNaN(since)) throw new Error(`--since is not a date: ${options.since}`);
    conversation = conversation.filter((item) => Date.parse(item.createdAt) >= since);
    threads = threads.filter((thread) => thread.comments.some((comment) => Date.parse(comment.createdAt) >= since));
  }
  if (options.json) return printJson({ conversation, threads });
  const reviews = conversation.filter((item) => item.kind === "review").length;
  const comments = conversation.length - reviews;
  const threadStat = options.all
    ? `${threads.length}/${totalThreads} threads (${threads.filter((thread) => !thread.isResolved).length} open · ${threads.filter((thread) => thread.isOutdated).length} outdated)`
    : `${threads.length}/${totalThreads} threads${hidden ? ` (${hidden} resolved/outdated hidden; --all shows)` : ""}`;
  console.log(`${repo}#${number}: ${reviews} review ${reviews === 1 ? "body" : "bodies"} · ${comments} comment${comments === 1 ? "" : "s"} · ${threadStat}\n`);
  if (!conversation.length && !threads.length) return console.log(totalThreads ? "nothing matches the filters" : "no review activity");
  for (const item of conversation) {
    const tag = item.kind === "review" ? `[review · ${item.state}]` : "[comment]";
    console.log(`${tag} @${item.author} (${item.createdAt.slice(0, 10)})`);
    console.log(`  ${formatBody(item.body, 600, options.full)}\n`);
  }
  if (moreConversation) console.log("… reviews/comments older than the last 50 omitted\n");
  threads.forEach((thread, index) => {
    const state = thread.isResolved ? "RESOLVED" : "OPEN";
    const outdated = thread.isOutdated ? " · outdated" : "";
    const line = thread.line ?? (thread.originalLine != null ? `${thread.originalLine} (original)` : "?");
    console.log(`[${index + 1}] ${state}${outdated} · ${thread.path}:${line}`);
    for (const comment of thread.comments) console.log(`  @${comment.author} (${comment.createdAt.slice(0, 10)}): ${formatBody(comment.body, 600, options.full)}`);
    if (thread.moreComments) console.log("  … thread has >50 comments, rest omitted");
    console.log();
  });
}

async function jobLog(repo, job, logDirectory) {
  try {
    const log = await gh(["api", `repos/${repo}/actions/jobs/${job.databaseId}/logs`]);
    if (log.startsWith("PK")) return { error: "log came back as a zip archive; open the job URL instead" };
    const file = path.join(logDirectory, `${job.databaseId}-${slug(job.name)}.log`);
    fs.writeFileSync(file, log);
    return { file, lines: log.split("\n").length, snippet: snippet(log) };
  } catch (error) {
    const message = String(error.message || error);
    if (message.includes("404")) return { error: "log not available yet (job still running?)" };
    return { error: message.split("\n").slice(-1)[0] };
  }
}

async function analyzeRun(repo, runId, checkNames, logDirectory) {
  const run = await ghJson(["run", "view", runId, "-R", repo, "--json", "jobs,workflowName,conclusion,url"]);
  const jobs = await Promise.all((run.jobs || []).filter((job) => FAILING.has(job.conclusion)).map(async (job) => ({
    name: job.name,
    conclusion: job.conclusion,
    url: job.url,
    failedSteps: (job.steps || []).filter((step) => FAILING.has(step.conclusion)).map((step) => step.name),
    log: await jobLog(repo, job, logDirectory),
  })));
  return { runId, workflow: run.workflowName, conclusion: run.conclusion, url: run.url, checks: checkNames, jobs };
}

async function ciFailures(options) {
  const repo = await resolveRepo(options.repo);
  if (options.list) {
    const limit = options.limit === undefined ? 10 : Number(options.limit);
    if (!Number.isInteger(limit) || limit <= 0) throw new Error(`-L must be a positive number, got: ${options.limit}`);
    const args = ["run", "list", "-R", repo, "--limit", String(limit), "--json", "databaseId,workflowName,displayTitle,event,status,conclusion,createdAt"];
    if (options.workflow) args.push("--workflow", options.workflow);
    const rows = await ghJson(args);
    if (options.json) return printJson({ repo, runs: rows });
    console.log(`${repo}: last ${rows.length} runs${options.workflow ? ` · workflow ${options.workflow}` : ""}`);
    for (const row of rows) {
      const mark = row.conclusion === "success" ? "✓" : FAILING.has(row.conclusion) ? "✗" : "○";
      const conclusion = row.conclusion || row.status;
      const when = row.createdAt.slice(0, 16).replace("T", " ");
      const title = row.displayTitle && row.displayTitle !== row.workflowName ? ` · ${truncate(row.displayTitle, 48)}` : "";
      console.log(`${mark} ${row.databaseId}  ${when}  ${conclusion.padEnd(11)} ${row.event.padEnd(17)} ${row.workflowName}${title}`);
    }
    if (rows.length) console.log(`\ndrill into a failure: github.cjs ci-failures <run-id>${options.repo ? ` -R ${repo}` : ""}`);
    return;
  }
  if (options.positionals.length > 1) throw new Error("ci-failures accepts at most one run id");
  const runId = options.positionals[0];
  if (runId && !/^\d+$/.test(runId)) throw new Error("run id must be a number");
  if (options.pr && !/^\d+$/.test(options.pr)) throw new Error(`--pr must be a number, got: ${options.pr}`);
  if (runId && options.pr) throw new Error("pass either a run id or --pr, not both");
  const logDirectory = path.join(os.tmpdir(), "design-pipeline-gh-ci");
  fs.mkdirSync(logDirectory, { recursive: true });
  const runs = new Map();
  const external = [];
  let prNumber;
  if (runId) {
    runs.set(runId, []);
  } else {
    if (!options.pr && options.repo) throw new Error("with -R, also pass --pr N or a run id");
    prNumber = options.pr ? Number(options.pr) : (await ghJson(["pr", "view", "--json", "number"])).number;
    const rawChecks = await gh(["pr", "checks", String(prNumber), "-R", repo, "--json", "name,state,bucket,link"], { okCodes: [1, 8] }).catch((error) => {
      if (/no checks reported/i.test(String(error.message || error))) return "[]";
      throw error;
    });
    const checks = JSON.parse(rawChecks || "[]");
    for (const check of checks.filter((item) => item.bucket === "fail")) {
      const match = check.link?.match(/\/actions\/runs\/(\d+)/);
      if (match) runs.set(match[1], [...(runs.get(match[1]) || []), check.name]);
      else external.push(check);
    }
    if (!runs.size && !external.length) {
      return options.json
        ? printJson({ repo, pr: prNumber, runs: [], external: [] })
        : console.log(`${repo} PR #${prNumber}: ${checks.length ? "no failing checks" : "no checks reported"}`);
    }
  }
  const results = await Promise.all([...runs].map(async ([id, names]) => {
    try { return await analyzeRun(repo, id, names, logDirectory); }
    catch (error) { return { runId: id, checks: names, error: String(error.message || error) }; }
  }));
  if (options.json) return printJson({ repo, pr: prNumber, runs: results, external });
  console.log(`${repo}${prNumber ? ` PR #${prNumber}` : ""}: ${results.length} run${results.length === 1 ? "" : "s"} analyzed\n`);
  for (const result of results) {
    if (result.error) { console.log(`✗ could not analyze run ${result.runId}: ${result.error}\n`); continue; }
    if (!result.jobs.length && !FAILING.has(result.conclusion)) {
      console.log(`○ ${result.workflow} · run ${result.runId} concluded ${result.conclusion || "in progress"}, nothing to report\n`);
      continue;
    }
    const via = result.checks.length ? ` (checks: ${result.checks.join(", ")})` : "";
    console.log(`✗ ${result.workflow} · run ${result.runId} · ${result.conclusion}${via}`);
    console.log(`  ${result.url}`);
    if (!result.jobs.length) console.log("  no failing jobs; failure is at the workflow level (startup/config?)");
    for (const job of result.jobs) {
      const steps = job.failedSteps.length ? `, failed step: ${job.failedSteps.join(", ")}` : "";
      console.log(`  job: ${job.name} (${job.conclusion})${steps}`);
      if (job.log.error) console.log(`    log: ${job.log.error}`);
      else {
        console.log(`    log: ${job.log.file} (${job.log.lines} lines)`);
        console.log("    ┄ snippet ┄");
        console.log(job.log.snippet.replace(/^/gm, "    "));
      }
    }
    console.log();
  }
  for (const check of external) console.log(`✗ ${check.name} is an external check (not GitHub Actions): ${check.link || "(no link)"}`);
}

const USAGE = `usage: github.cjs <pr-snapshot|pr-threads|ci-failures> [options]

Read-only GitHub orientation. Requires gh on PATH and an authenticated gh session.
  pr-snapshot [PR] [-R owner/repo] [--full] [--json]
  pr-threads  [PR] [-R owner/repo] [--all] [--author login] [--since ISO] [--full] [--json]
  ci-failures [RUN-ID] [--pr N] [-R owner/repo] [--json]
  ci-failures --list [--workflow W] [-L n] [-R owner/repo] [--json]`;

async function main(argv) {
  const command = argv.shift();
  if (!command || command === "--help" || command === "-h") return console.log(USAGE);
  const options = parseArgs(argv);
  if (options.help) return console.log(USAGE);
  if (command === "pr-snapshot") return prSnapshot(options);
  if (command === "pr-threads") return prThreads(options);
  if (command === "ci-failures") return ciFailures(options);
  throw new Error(`unknown command: ${command}\n\n${USAGE}`);
}

function run() {
  process.stdout.on("error", (error) => {
    if (error.code === "EPIPE") process.exit(0);
    throw error;
  });
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

module.exports = { parseArgs, snippet, slug, truncate, isFailing: (value) => FAILING.has(value) };
if (require.main === module) run();

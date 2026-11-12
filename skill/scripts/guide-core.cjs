"use strict";

// Reads one section of a packaged guide and one command's usage, so an agent does not have to
// load a whole 90 KB file or the whole --help text for one answer. Read-only: nothing here writes.

const fs = require("node:fs");
const path = require("node:path");
const { fail, pathInside, sha256 } = require("./contract-utils.cjs");

const defaultReferencesRoot = path.resolve(__dirname, "../references");

function splitLines(markdown) {
  const lines = String(markdown).replace(/^﻿/, "").split(/\r?\n/);
  if (lines.length && lines.at(-1) === "") lines.pop();
  return lines;
}

// ATX headings outside fenced code blocks. The anchor is GitHub's: lower-case, punctuation dropped,
// spaces to hyphens, a repeated anchor numbered -1, -2. A `#` line inside a fence is code, not a
// heading (workflow-film.md has shell comments that start with `#`).
function parseHeadings(markdown) {
  const lines = splitLines(markdown);
  const headings = [];
  const seen = new Map();
  let fence = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (fence) {
      const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length) fence = null;
      continue;
    }
    const open = line.match(/^\s*(`{3,})[^`]*$/) || line.match(/^\s*(~{3,})/);
    if (open) {
      fence = { char: open[1][0], length: open[1].length };
      continue;
    }
    const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    const text = match[2].replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[`*]/g, "");
    const slug = text.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    headings.push({ level: match[1].length, text, anchor: count ? `${slug}-${count}` : slug, line: index + 1 });
  }
  return headings;
}

function invalidReference(name, reason) {
  return fail("skill", `invalid reference ${JSON.stringify(name)}: ${reason}`, { code: "REFERENCE_INVALID", reference: name });
}

// A name is a path under references/ without ".md". Everything else is rejected before any read.
function resolveReference(referencesRoot, name) {
  if (typeof name !== "string" || !name.trim()) return invalidReference(name, "a guide name is required");
  const trimmed = name.trim().replace(/\.md$/i, "");
  if (/[\\\0]/.test(trimmed) || path.isAbsolute(trimmed) || /^[A-Za-z]:/.test(trimmed)) {
    return invalidReference(name, "use a name relative to references/ with / separators");
  }
  const segments = trimmed.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return invalidReference(name, "empty, . and .. segments are not allowed");
  }
  const file = path.join(referencesRoot, ...segments) + ".md";
  const entry = fs.lstatSync(file, { throwIfNoEntry: false });
  if (!entry) fail("skill", `no packaged guide named ${JSON.stringify(trimmed)}; run skill --list`, { code: "REFERENCE_NOT_FOUND", reference: trimmed });
  const real = fs.realpathSync.native(file);
  if (!pathInside(fs.realpathSync.native(referencesRoot), real)) return invalidReference(name, "it resolves outside references/");
  if (!fs.statSync(real).isFile()) return invalidReference(name, "it is not a file");
  return { name: segments.join("/"), file: real };
}

function readGuide(referencesRoot, name) {
  const resolved = resolveReference(referencesRoot, name);
  const buffer = fs.readFileSync(resolved.file);
  const lines = splitLines(buffer.toString("utf8"));
  return { name: resolved.name, lines, headings: parseHeadings(lines.join("\n")), sha256: sha256(buffer) };
}

function listReferences(referencesRoot = defaultReferencesRoot) {
  const names = [];
  const visit = (directory, prefix) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(path.join(directory, entry.name), `${prefix}${entry.name}/`);
      else if (entry.isFile() && entry.name.endsWith(".md")) names.push(`${prefix}${entry.name.slice(0, -3)}`);
    }
  };
  visit(referencesRoot, "");
  return names.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map((name) => {
    const guide = readGuide(referencesRoot, name);
    const title = guide.headings.find((heading) => heading.level === 1)?.text ?? name;
    return { name, title, headings: guide.headings.length };
  });
}

function listHeadings(referencesRoot = defaultReferencesRoot, name) {
  const guide = readGuide(referencesRoot, name);
  return {
    reference: guide.name,
    file: `references/${guide.name}.md`,
    totalLines: guide.lines.length,
    headings: guide.headings.map(({ level, anchor, text, line }) => ({ level, anchor, heading: text, line })),
  };
}

function words(value) {
  return String(value).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function nearestHeadings(headings, request) {
  const wanted = new Set(words(request));
  return headings
    .map((heading) => ({ heading, score: words(heading.text).filter((word) => wanted.has(word)).length }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.heading.line - b.heading.line)
    .slice(0, 5)
    .map(({ heading }) => ({ anchor: heading.anchor, heading: heading.text, line: heading.line }));
}

// The request is an anchor first, then a heading's text (case-insensitive). A leading "#" or "##"
// is ignored, so "#stage-4-tasks" and "## Stage 4: Tasks" both work.
function readSection(referencesRoot = defaultReferencesRoot, { reference, section }) {
  if (typeof section !== "string" || !section.trim()) fail("skill", "--section requires a heading or anchor", { code: "OPTION_REQUIRED" });
  const guide = readGuide(referencesRoot, reference);
  const request = section.trim().replace(/^#{1,6}\s*/, "");
  const wanted = request.toLowerCase().replace(/\s+/g, " ");
  let matches = guide.headings.filter((heading) => heading.anchor === request);
  if (!matches.length) matches = guide.headings.filter((heading) => heading.text.toLowerCase().replace(/\s+/g, " ") === wanted);
  if (matches.length > 1) {
    const anchors = matches.map((heading) => heading.anchor);
    fail("skill", `${JSON.stringify(section)} matches ${matches.length} headings in ${guide.name}; use one anchor: ${anchors.join(", ")}`, { code: "SECTION_AMBIGUOUS", reference: guide.name, anchors });
  }
  if (!matches.length) {
    const nearest = nearestHeadings(guide.headings, request);
    const hint = nearest.length ? `closest: ${nearest.map((item) => item.anchor).join(", ")}` : `run skill --reference ${guide.name} --list`;
    fail("skill", `no heading ${JSON.stringify(section)} in ${guide.name}; ${hint}`, { code: "SECTION_NOT_FOUND", reference: guide.name, nearest });
  }
  const heading = matches[0];
  const position = guide.headings.indexOf(heading);
  const next = guide.headings.slice(position + 1).find((candidate) => candidate.level <= heading.level);
  let endLine = next ? next.line - 1 : guide.lines.length;
  while (endLine > heading.line && !guide.lines[endLine - 1].trim()) endLine -= 1;
  const headingPath = [];
  const open = [];
  for (const candidate of guide.headings.slice(0, position + 1)) {
    while (open.length && open.at(-1).level >= candidate.level) open.pop();
    open.push(candidate);
  }
  for (const item of open) headingPath.push(item.text);
  return {
    reference: guide.name,
    file: `references/${guide.name}.md`,
    headingPath,
    anchor: heading.anchor,
    level: heading.level,
    startLine: heading.line,
    endLine,
    totalLines: guide.lines.length,
    sha256: guide.sha256,
    partial: true,
    markdown: guide.lines.slice(heading.line - 1, endLine).join("\n"),
  };
}

function renderReferenceList(references) {
  return references.map((item) => `${item.name}\t${item.title}\t${item.headings}`).join("\n");
}

function renderHeadingList(listing) {
  return listing.headings.map((item) => `${item.level}\t${item.anchor}\t${item.heading}`).join("\n");
}

// Splits at " | " only outside () and [], because help text has "(a | b)" and "[--x a|b]".
function splitTopLevel(text) {
  const segments = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "(" || character === "[") depth += 1;
    else if (character === ")" || character === "]") depth = Math.max(0, depth - 1);
    else if (depth === 0 && text.startsWith(" | ", index)) {
      segments.push(text.slice(start, index));
      start = index + 3;
    }
  }
  segments.push(text.slice(start));
  return segments.map((segment) => segment.trim()).filter(Boolean);
}

// The help is a list of lines: an entry starts at two spaces of indent under "Commands:", lines
// indented four or more continue it, and the first unindented line after the list gives the exit codes.
function splitHelp(helpText) {
  const lines = String(helpText).split("\n");
  const start = lines.findIndex((line) => line.trim() === "Commands:");
  const entries = [];
  let exitCodes = "";
  let current = null;
  for (const line of lines.slice(start + 1)) {
    if (/^ {2}\S/.test(line)) {
      current = { lines: [line], segments: splitTopLevel(line.trim()).map((segment) => segment.split(/\s+/)) };
      entries.push(current);
    } else if (/^ {4,}\S/.test(line) && current) {
      current.lines.push(line);
    } else if (!line.trim()) {
      current = null;
    } else {
      exitCodes = exitCodes ? `${exitCodes}\n${line}` : line;
      current = null;
    }
  }
  return { entries: entries.map((entry) => ({ ...entry, text: entry.lines.join("\n") })), exitCodes };
}

function segmentMatches(words_, command, action) {
  if (words_[0] !== command) return false;
  if (!action) return true;
  const second = words_[1];
  return typeof second === "string" && !/^[-<\[(]/.test(second) && second.split("|").includes(action);
}

function describeCommand(helpText, command, action = null) {
  if (typeof command !== "string" || !command.trim()) fail("cli", "describe requires a command name", { code: "OPTION_REQUIRED" });
  const { entries, exitCodes } = splitHelp(helpText);
  const matching = entries.filter((entry) => entry.segments.some((segment) => segmentMatches(segment, command, action)));
  if (!matching.length) {
    fail("cli", `unknown command: ${[command, action].filter(Boolean).join(" ")}; run --help for the list`, { code: "UNKNOWN_COMMAND" });
  }
  return { command, action: action || null, entries: matching.map((entry) => entry.text), exitCodes };
}

function renderDescribe(description) {
  return [...description.entries, "", description.exitCodes].join("\n");
}

module.exports = {
  defaultReferencesRoot,
  describeCommand,
  listHeadings,
  listReferences,
  parseHeadings,
  readSection,
  renderDescribe,
  renderHeadingList,
  renderReferenceList,
  splitHelp,
};

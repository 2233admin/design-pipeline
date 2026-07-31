#!/usr/bin/env node
"use strict";

// The spec-reconciliation gate is executable. A section that only a checklist row asks for is a
// section nobody is forced to write, so this reads change `design.md`, finds the reconciliation
// section, proves the graybox capture it cites is on disk, and emits the parsed table as a
// machine-readable `specDrift` record. An absent section on a change that has a reference is
// `blocked`; an empty table is `ready`.

const fs = require("node:fs");
const path = require("node:path");
const { resolveInside } = require("./contract-utils.cjs");

const SPEC_DRIFT_SCHEMA = "design-pipeline.spec-drift.v1";
const DESIGN_ARTIFACT = "design.md";
const SECTION_TITLE = "spec reconciliation";
const COLUMN_HEADINGS = ["Value", "Specified", "Implemented", "Cause"];
const REQUIRED_COLUMNS = COLUMN_HEADINGS.map((column) => column.toLowerCase());
// Every column but Cause carries a fact that must be present; Cause has its own reason code.
const NON_EMPTY_COLUMNS = COLUMN_HEADINGS.slice(0, -1);
// A change "has a reference" when either reference carrier is on disk. Both are written by the
// reference-routing stage, so either one is enough to owe a reconciliation.
const REFERENCE_SIGNALS = ["reference-evidence.json", "reference.md"];

// Cause review is mechanical on purpose. This gate does not judge whether prose describes an
// observation - it cannot - so it blocks only on an explicit, closed deny-list of phrasings that
// design-spec.md already names as intentions, and warns on a small marker list that is merely
// suspicious. Anything else is accepted. Widening either list is a deliberate edit, never a
// heuristic that drifts.
const INTENTION_PHRASES = ["looked better", "felt cramped", "cleaner", "nicer", "preferred"];
const AMBIGUOUS_CAUSE_MARKERS = ["wanted", "felt", "liked", "seemed", "better", "worse", "prefer"];

const REASONS = {
  DESIGN_MISSING: "reconciliation-design-missing",
  DESIGN_UNREADABLE: "reconciliation-design-unreadable",
  SECTION_MISSING: "reconciliation-section-missing",
  CAPTURE_UNCITED: "reconciliation-capture-uncited",
  CAPTURE_MISSING: "reconciliation-capture-missing",
  CAPTURE_UNCONTAINED: "reconciliation-capture-uncontained",
  TIMESTAMP_INVALID: "reconciliation-timestamp-invalid",
  TABLE_MISSING: "reconciliation-table-missing",
  COLUMNS_INVALID: "reconciliation-columns-invalid",
  ROW_MALFORMED: "reconciliation-row-malformed",
  CAUSE_MISSING: "reconciliation-cause-missing",
  CAUSE_INTENTION: "reconciliation-cause-intention",
};

// Reported `reason` is the first blocking reason in this order; `reasons` carries all of them.
const REASON_ORDER = [
  REASONS.DESIGN_MISSING,
  REASONS.DESIGN_UNREADABLE,
  REASONS.SECTION_MISSING,
  REASONS.CAPTURE_UNCITED,
  REASONS.CAPTURE_UNCONTAINED,
  REASONS.CAPTURE_MISSING,
  REASONS.TIMESTAMP_INVALID,
  REASONS.TABLE_MISSING,
  REASONS.COLUMNS_INVALID,
  REASONS.ROW_MALFORMED,
  REASONS.CAUSE_MISSING,
  REASONS.CAUSE_INTENTION,
];

const WARNINGS = {
  CAUSE_AMBIGUOUS: "reconciliation-cause-ambiguous",
  RECONCILED_UNDATED: "reconciliation-reconciled-undated",
};

function phrasePattern(phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

// Fenced blocks are documentation of the format, not the format itself. `design-spec.md` shows the
// section inside a fence, so a fenced sample never satisfies or breaks the gate.
function fenceMask(lines) {
  const mask = [];
  let fence = null;
  for (const line of lines) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence === null && marker) {
      fence = marker[1][0];
      mask.push(true);
      continue;
    }
    if (fence !== null && marker && marker[1][0] === fence) {
      fence = null;
      mask.push(true);
      continue;
    }
    mask.push(fence !== null);
  }
  return mask;
}

function headingAt(line) {
  const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
  if (!match) return null;
  return { level: match[1].length, title: match[2].trim().replace(/:$/, "") };
}

function emptySection() {
  return { present: false, line: null, body: [], fenced: [] };
}

function findSection(lines) {
  const fenced = fenceMask(lines);
  let start = null;
  let level = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (fenced[index]) continue;
    const heading = headingAt(lines[index]);
    if (!heading) continue;
    if (start === null) {
      if (heading.title.toLowerCase() === SECTION_TITLE) {
        start = index;
        level = heading.level;
      }
      continue;
    }
    if (heading.level <= level) {
      return { present: true, line: start + 1, body: lines.slice(start + 1, index), fenced: fenced.slice(start + 1, index) };
    }
  }
  if (start === null) return emptySection();
  return { present: true, line: start + 1, body: lines.slice(start + 1), fenced: fenced.slice(start + 1) };
}

function splitCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isSeparatorRow(line) {
  return isTableRow(line) && splitCells(line).every((cell) => /^:?-{1,}:?$/.test(cell));
}

// The first unfenced row that is not itself a separator is the header candidate; -1 means the
// section carries no table at all.
function headerRowIndex(section) {
  for (let index = 0; index < section.body.length; index += 1) {
    if (section.fenced[index]) continue;
    const line = section.body[index];
    if (!isTableRow(line) || isSeparatorRow(line)) continue;
    return index;
  }
  return -1;
}

// Body rows run until a fence, a non-row line that is not blank, or the end of the section.
function tableBodyRows(section, start) {
  const rows = [];
  for (let cursor = start; cursor < section.body.length; cursor += 1) {
    if (section.fenced[cursor]) break;
    const candidate = section.body[cursor];
    if (isTableRow(candidate)) {
      rows.push({ line: candidate, cells: splitCells(candidate) });
      continue;
    }
    if (candidate.trim() === "") continue;
    break;
  }
  return rows;
}

function findTable(section) {
  const index = headerRowIndex(section);
  if (index === -1) return { present: false, header: [], separatorValid: false, rows: [] };
  const header = splitCells(section.body[index]);
  const next = section.body[index + 1];
  if (next === undefined || section.fenced[index + 1] || !isSeparatorRow(next)) {
    return { present: true, header, separatorValid: false, rows: [] };
  }
  return { present: true, header, separatorValid: true, rows: tableBodyRows(section, index + 2) };
}

function citedLine(section, label) {
  const pattern = new RegExp(`^\\s*(?:[-*]\\s*)?${label}\\s*:\\s*(.+)$`, "i");
  for (let index = 0; index < section.body.length; index += 1) {
    if (section.fenced[index]) continue;
    const match = pattern.exec(section.body[index]);
    if (match) return match[1].trim();
  }
  return null;
}

function isTimestamp(value) {
  return typeof value === "string" && value.trim() !== "" && !Number.isNaN(new Date(value).getTime());
}

function classifyCause(cause) {
  for (const phrase of INTENTION_PHRASES) {
    if (phrasePattern(phrase).test(cause)) return { verdict: "intention", matched: phrase };
  }
  for (const marker of AMBIGUOUS_CAUSE_MARKERS) {
    if (phrasePattern(marker).test(cause)) return { verdict: "ambiguous", matched: marker };
  }
  return { verdict: "observation", matched: null };
}

function containedFile(root, relative) {
  try {
    const file = resolveInside(root, relative, "reference carrier", { scope: "spec reconciliation" });
    return fs.existsSync(file) && fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

function referenceSignals(root, artifact) {
  const candidates = artifact ? [...new Set([artifact, ...REFERENCE_SIGNALS])] : REFERENCE_SIGNALS;
  return candidates.filter((name) => containedFile(root, name));
}

// The obligation belongs to a change that has a reference. A change without one may still carry the
// scaffolded stub, and an unfilled stub there is a warning rather than a gate failure - but the
// moment a reference carrier lands, every one of these becomes blocking. `applicable` is fixed for
// the life of a report, so the split lives here rather than at each call site.
function createReport(applicable) {
  const blockers = [];
  const reasons = [];
  const warnings = [];
  return {
    applicable,
    blockers,
    reasons,
    warnings,
    block(reason, blocker) {
      if (!applicable) {
        warnings.push({ code: reason, message: blocker });
        return;
      }
      if (!reasons.includes(reason)) reasons.push(reason);
      blockers.push(blocker);
    },
    warn(code, message) {
      warnings.push({ code, message });
    },
  };
}

// A design file that is absent on a change that owes nothing is silent, not warned about: there is
// no stub to complain of.
function readDesignText(designFile, relative, report) {
  if (!fs.existsSync(designFile) || !fs.statSync(designFile).isFile()) {
    if (report.applicable) {
      report.block(
        REASONS.DESIGN_MISSING,
        `change ${relative} does not exist, so the reconciliation section cannot be read`,
      );
    }
    return null;
  }
  try {
    return fs.readFileSync(designFile, "utf8");
  } catch (error) {
    report.block(REASONS.DESIGN_UNREADABLE, `change ${relative} cannot be read: ${error.message}`);
    return null;
  }
}

function reviewCapture(section, root, relative, report) {
  const capture = citedLine(section, "graybox");
  if (capture === null) {
    report.block(
      REASONS.CAPTURE_UNCITED,
      `change ${relative} Spec Reconciliation does not cite the graybox capture it was written against`,
    );
    return { capture: null, capturedAt: null, exists: false };
  }

  const quoted = /`([^`]+)`/.exec(capture);
  const capturePath = (quoted ? quoted[1] : capture.split(",")[0]).trim();
  const captured = /captured\s+([^,\s]+)/i.exec(capture);
  const capturedAt = captured ? captured[1] : null;
  if (capturedAt !== null && !isTimestamp(capturedAt)) {
    report.block(
      REASONS.TIMESTAMP_INVALID,
      `change ${relative} Spec Reconciliation cites a graybox capture time ${JSON.stringify(capturedAt)} that is not an ISO 8601 timestamp`,
    );
  }
  if (!capturePath) {
    report.block(
      REASONS.CAPTURE_UNCITED,
      `change ${relative} Spec Reconciliation cites an empty graybox capture path`,
    );
    return { capture: capturePath, capturedAt, exists: false };
  }

  let resolved = null;
  try {
    resolved = resolveInside(root, capturePath, "graybox capture", { scope: "spec reconciliation" });
  } catch (error) {
    report.block(REASONS.CAPTURE_UNCONTAINED, `graybox capture cited by ${relative} is not contained by the change root: ${error.message}`);
  }
  if (resolved === null) return { capture: capturePath, capturedAt, exists: false };

  const exists = fs.existsSync(resolved) && fs.statSync(resolved).isFile();
  if (!exists) {
    report.block(
      REASONS.CAPTURE_MISSING,
      `graybox capture cited by ${relative} does not exist on disk: ${capturePath}`,
    );
  }
  return { capture: capturePath, capturedAt, exists };
}

function reviewReconciled(section, relative, report) {
  const reconciled = citedLine(section, "reconciled");
  if (reconciled === null) {
    report.warn(
      WARNINGS.RECONCILED_UNDATED,
      `change ${relative} Spec Reconciliation records no Reconciled timestamp`,
    );
    return null;
  }
  if (!isTimestamp(reconciled)) {
    report.block(
      REASONS.TIMESTAMP_INVALID,
      `change ${relative} Spec Reconciliation records Reconciled ${JSON.stringify(reconciled)}, which is not an ISO 8601 timestamp`,
    );
    return null;
  }
  return new Date(reconciled).toISOString();
}

// Returns the drift row for a well-formed row, or null when the row was blocked and has nothing
// trustworthy to report.
function reviewRow(cells, number, relative, report) {
  if (cells.length !== REQUIRED_COLUMNS.length) {
    report.block(
      REASONS.ROW_MALFORMED,
      `change ${relative} Spec Reconciliation row ${number} has ${cells.length} cells instead of ${REQUIRED_COLUMNS.length}`,
    );
    return null;
  }
  const [value, specified, implemented, cause] = cells;
  const empty = NON_EMPTY_COLUMNS.filter((label, index) => cells[index] === "");
  if (empty.length) {
    report.block(
      REASONS.ROW_MALFORMED,
      `change ${relative} Spec Reconciliation row ${number} leaves ${empty.join(", ")} empty`,
    );
    return null;
  }
  if (cause === "") {
    report.block(
      REASONS.CAUSE_MISSING,
      `change ${relative} Spec Reconciliation row ${number} (${value}) records no Cause`,
    );
    return null;
  }

  const classified = classifyCause(cause);
  if (classified.verdict === "intention") {
    report.block(
      REASONS.CAUSE_INTENTION,
      `change ${relative} Spec Reconciliation row ${number} (${value}) states an intention `
      + `rather than an observation: ${JSON.stringify(classified.matched)}`,
    );
  } else if (classified.verdict === "ambiguous") {
    report.warn(
      WARNINGS.CAUSE_AMBIGUOUS,
      `change ${relative} Spec Reconciliation row ${number} (${value}) uses `
      + `${JSON.stringify(classified.matched)}; confirm the Cause reports what the render showed`,
    );
  }
  return {
    index: number,
    value,
    specified,
    implemented,
    cause,
    causeVerdict: classified.verdict,
    causeMatch: classified.matched,
  };
}

function reviewTable(section, relative, report) {
  const table = findTable(section);
  if (!table.present || !table.separatorValid) {
    // An absent table is not an empty table. The four-column header is the only thing that proves
    // the rows were reviewed at all, so prose in place of it is a declaration, not a result.
    report.block(
      REASONS.TABLE_MISSING,
      `change ${relative} Spec Reconciliation has no well-formed ${COLUMN_HEADINGS.join(" / ")} `
      + "table (a header row and a separator row); an empty table is valid, a missing one is not",
    );
    return [];
  }

  const header = table.header.map((cell) => cell.toLowerCase());
  if (
    header.length !== REQUIRED_COLUMNS.length
    || REQUIRED_COLUMNS.some((column, index) => header[index] !== column)
  ) {
    report.block(
      REASONS.COLUMNS_INVALID,
      `change ${relative} Spec Reconciliation table declares columns ${table.header.join(" | ")} `
      + `instead of ${COLUMN_HEADINGS.join(" | ")}`,
    );
    return [];
  }

  const rows = [];
  table.rows.forEach((row, index) => {
    const drift = reviewRow(row.cells, index + 1, relative, report);
    if (drift !== null) rows.push(drift);
  });
  return rows;
}

// A present section always yields a drift record, even when it blocks: the rows that did parse are
// reported so the record never overstates or hides.
function reviewSection(section, { root, relative, signals, report }) {
  const graybox = reviewCapture(section, root, relative, report);
  const reconciledAt = reviewReconciled(section, relative, report);
  const rows = reviewTable(section, relative, report);
  return {
    schema: SPEC_DRIFT_SCHEMA,
    changeId: path.basename(root),
    designFile: relative,
    referenceSignals: signals,
    graybox,
    reconciledAt,
    changedValues: rows.length,
    rows,
  };
}

function checkSpecReconciliation(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const relative = options.designFile || DESIGN_ARTIFACT;
  const signals = referenceSignals(root, options.artifact);
  const applicable = signals.length > 0;
  const report = createReport(applicable);

  const designFile = resolveInside(root, relative, "design spec", { scope: "spec reconciliation" });
  const text = readDesignText(designFile, relative, report);
  const section = text === null ? emptySection() : findSection(text.split(/\r?\n/));

  let specDrift = null;
  if (section.present) {
    specDrift = reviewSection(section, { root, relative, signals, report });
  } else if (text !== null && applicable) {
    report.block(
      REASONS.SECTION_MISSING,
      `change ${relative} has no Spec Reconciliation section; a change with a reference `
      + `(${signals.join(", ")}) records one, and an empty table is the valid way to say nothing changed`,
    );
  }

  const reason = REASON_ORDER.find((candidate) => report.reasons.includes(candidate)) ?? null;
  return {
    status: report.reasons.length ? "blocked" : "ready",
    reason,
    reasons: report.reasons,
    blockers: report.blockers,
    warnings: report.warnings,
    applicable,
    referenceSignals: signals,
    designFile,
    section: { present: section.present, line: section.line },
    specDrift,
  };
}

function parseArgs(argv) {
  const options = { changeRoot: process.cwd() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else if (["--change-root", "--design-file", "--artifact"].includes(arg)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`${arg} requires a value`);
      options[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      index += 1;
    } else throw new Error(`unknown option: ${arg}`);
  }
  return options;
}

function usage() {
  return "Usage: check-spec-reconciliation.cjs --change-root <path> [--design-file design.md] [--artifact reference-evidence.json] [--json]";
}

function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log(usage());
      return;
    }
    const result = checkSpecReconciliation(path.resolve(options.changeRoot), options);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`${result.status}: ${result.reason ?? "spec-reconciliation"}`);
      for (const blocker of result.blockers) console.log(`- ${blocker}`);
      for (const warning of result.warnings) console.log(`! ${warning.message}`);
    }
    process.exitCode = result.status === "ready" ? 0 : 2;
  } catch (error) {
    console.error(`check-spec-reconciliation: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) main();

module.exports = {
  AMBIGUOUS_CAUSE_MARKERS,
  COLUMN_HEADINGS,
  INTENTION_PHRASES,
  REASONS,
  REQUIRED_COLUMNS,
  SPEC_DRIFT_SCHEMA,
  WARNINGS,
  checkSpecReconciliation,
  classifyCause,
  parseArgs,
};

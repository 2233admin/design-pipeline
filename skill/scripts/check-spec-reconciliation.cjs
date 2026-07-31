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
  if (start === null) return { present: false, line: null, body: [], fenced: [] };
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

function findTable(section) {
  for (let index = 0; index < section.body.length; index += 1) {
    if (section.fenced[index]) continue;
    const line = section.body[index];
    if (!isTableRow(line) || isSeparatorRow(line)) continue;
    const next = section.body[index + 1];
    if (next === undefined || section.fenced[index + 1] || !isSeparatorRow(next)) {
      return { present: true, header: splitCells(line), separatorValid: false, rows: [] };
    }
    const rows = [];
    for (let cursor = index + 2; cursor < section.body.length; cursor += 1) {
      if (section.fenced[cursor]) break;
      const candidate = section.body[cursor];
      if (!isTableRow(candidate)) {
        if (candidate.trim() === "") continue;
        break;
      }
      rows.push({ line: candidate, cells: splitCells(candidate) });
    }
    return { present: true, header: splitCells(line), separatorValid: true, rows };
  }
  return { present: false, header: [], separatorValid: false, rows: [] };
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

function checkSpecReconciliation(changeRoot, options = {}) {
  const root = fs.realpathSync(path.resolve(changeRoot));
  const relative = options.designFile || DESIGN_ARTIFACT;
  const signals = referenceSignals(root, options.artifact);
  const applicable = signals.length > 0;
  const blockers = [];
  const reasons = [];
  const warnings = [];
  const block = (reason, blocker) => {
    // The obligation belongs to a change that has a reference. A change without one may still carry
    // the scaffolded stub, and an unfilled stub there is a warning rather than a gate failure - but
    // the moment a reference carrier lands, every one of these becomes blocking.
    if (!applicable) {
      warnings.push({ code: reason, message: blocker });
      return;
    }
    if (!reasons.includes(reason)) reasons.push(reason);
    blockers.push(blocker);
  };
  const warn = (code, message) => warnings.push({ code, message });

  const designFile = resolveInside(root, relative, "design spec", { scope: "spec reconciliation" });
  let text = null;
  if (!fs.existsSync(designFile) || !fs.statSync(designFile).isFile()) {
    if (applicable) {
      block(
        REASONS.DESIGN_MISSING,
        `change ${relative} does not exist, so the reconciliation section cannot be read`,
      );
    }
  } else {
    try {
      text = fs.readFileSync(designFile, "utf8");
    } catch (error) {
      block(REASONS.DESIGN_UNREADABLE, `change ${relative} cannot be read: ${error.message}`);
    }
  }

  const lines = text === null ? [] : text.split(/\r?\n/);
  const section = text === null
    ? { present: false, line: null, body: [], fenced: [] }
    : findSection(lines);

  let specDrift = null;
  if (!section.present) {
    if (text !== null && applicable) {
      block(
        REASONS.SECTION_MISSING,
        `change ${relative} has no Spec Reconciliation section; a change with a reference `
        + `(${signals.join(", ")}) records one, and an empty table is the valid way to say nothing changed`,
      );
    }
  } else {
    const capture = citedLine(section, "graybox");
    let capturePath = null;
    let capturedAt = null;
    let captureExists = false;
    if (capture === null) {
      block(
        REASONS.CAPTURE_UNCITED,
        `change ${relative} Spec Reconciliation does not cite the graybox capture it was written against`,
      );
    } else {
      const quoted = /`([^`]+)`/.exec(capture);
      capturePath = (quoted ? quoted[1] : capture.split(",")[0]).trim();
      const captured = /captured\s+([^,\s]+)/i.exec(capture);
      if (captured) {
        capturedAt = captured[1];
        if (!isTimestamp(capturedAt)) {
          block(
            REASONS.TIMESTAMP_INVALID,
            `change ${relative} Spec Reconciliation cites a graybox capture time ${JSON.stringify(capturedAt)} that is not an ISO 8601 timestamp`,
          );
        }
      }
      if (!capturePath) {
        block(
          REASONS.CAPTURE_UNCITED,
          `change ${relative} Spec Reconciliation cites an empty graybox capture path`,
        );
      } else {
        let resolved = null;
        try {
          resolved = resolveInside(root, capturePath, "graybox capture", { scope: "spec reconciliation" });
        } catch (error) {
          block(REASONS.CAPTURE_UNCONTAINED, `graybox capture cited by ${relative} is not contained by the change root: ${error.message}`);
        }
        if (resolved !== null) {
          captureExists = fs.existsSync(resolved) && fs.statSync(resolved).isFile();
          if (!captureExists) {
            block(
              REASONS.CAPTURE_MISSING,
              `graybox capture cited by ${relative} does not exist on disk: ${capturePath}`,
            );
          }
        }
      }
    }

    const reconciled = citedLine(section, "reconciled");
    let reconciledAt = null;
    if (reconciled === null) {
      warn(
        WARNINGS.RECONCILED_UNDATED,
        `change ${relative} Spec Reconciliation records no Reconciled timestamp`,
      );
    } else if (!isTimestamp(reconciled)) {
      block(
        REASONS.TIMESTAMP_INVALID,
        `change ${relative} Spec Reconciliation records Reconciled ${JSON.stringify(reconciled)}, which is not an ISO 8601 timestamp`,
      );
    } else {
      reconciledAt = new Date(reconciled).toISOString();
    }

    const table = findTable(section);
    const rows = [];
    if (!table.present || !table.separatorValid) {
      // An absent table is not an empty table. The four-column header is the only thing that proves
      // the rows were reviewed at all, so prose in place of it is a declaration, not a result.
      block(
        REASONS.TABLE_MISSING,
        `change ${relative} Spec Reconciliation has no well-formed ${COLUMN_HEADINGS.join(" / ")} `
        + "table (a header row and a separator row); an empty table is valid, a missing one is not",
      );
    } else {
      const header = table.header.map((cell) => cell.toLowerCase());
      if (
        header.length !== REQUIRED_COLUMNS.length
        || REQUIRED_COLUMNS.some((column, index) => header[index] !== column)
      ) {
        block(
          REASONS.COLUMNS_INVALID,
          `change ${relative} Spec Reconciliation table declares columns ${table.header.join(" | ")} `
          + `instead of ${COLUMN_HEADINGS.join(" | ")}`,
        );
      } else {
        table.rows.forEach((row, index) => {
          if (row.cells.length !== REQUIRED_COLUMNS.length) {
            block(
              REASONS.ROW_MALFORMED,
              `change ${relative} Spec Reconciliation row ${index + 1} has ${row.cells.length} cells instead of ${REQUIRED_COLUMNS.length}`,
            );
            return;
          }
          const [value, specified, implemented, cause] = row.cells;
          const empty = [
            ["Value", value],
            ["Specified", specified],
            ["Implemented", implemented],
          ].filter(([, cell]) => cell === "");
          if (empty.length) {
            block(
              REASONS.ROW_MALFORMED,
              `change ${relative} Spec Reconciliation row ${index + 1} leaves ${empty.map(([label]) => label).join(", ")} empty`,
            );
            return;
          }
          if (cause === "") {
            block(
              REASONS.CAUSE_MISSING,
              `change ${relative} Spec Reconciliation row ${index + 1} (${value}) records no Cause`,
            );
            return;
          }
          const classified = classifyCause(cause);
          if (classified.verdict === "intention") {
            block(
              REASONS.CAUSE_INTENTION,
              `change ${relative} Spec Reconciliation row ${index + 1} (${value}) states an intention `
              + `rather than an observation: ${JSON.stringify(classified.matched)}`,
            );
          } else if (classified.verdict === "ambiguous") {
            warn(
              WARNINGS.CAUSE_AMBIGUOUS,
              `change ${relative} Spec Reconciliation row ${index + 1} (${value}) uses `
              + `${JSON.stringify(classified.matched)}; confirm the Cause reports what the render showed`,
            );
          }
          rows.push({
            index: index + 1,
            value,
            specified,
            implemented,
            cause,
            causeVerdict: classified.verdict,
            causeMatch: classified.matched,
          });
        });
      }
    }

    specDrift = {
      schema: SPEC_DRIFT_SCHEMA,
      changeId: path.basename(root),
      designFile: relative,
      referenceSignals: signals,
      graybox: { capture: capturePath, capturedAt, exists: captureExists },
      reconciledAt,
      changedValues: rows.length,
      rows,
    };
  }

  const reason = REASON_ORDER.find((candidate) => reasons.includes(candidate)) ?? null;
  return {
    status: reasons.length ? "blocked" : "ready",
    reason,
    reasons,
    blockers,
    warnings,
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

"use strict";

// The readable half of `doctor`. cli-core.cjs `inspectDoctor` stays the source of what is required
// (Node, package files); this adds where the skill is installed, which agents are present, and the
// recommended and optional tools. Each missing item carries one copyable command. Nothing here
// installs anything, and only a missing required item makes the result blocked.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { locateBrowser } = require("./browser-locate.cjs");
const { findBlender } = require("./blender-core.cjs");
const { fetchCommand, installCommand } = require("./install-hints.cjs");

const NODE_REQUIRED = "22.12.0";
const INSTALL_DOC = "https://github.com/2233admin/design-pipeline/blob/main/docs/install.md";

function nodeAtLeast(version, minimum = NODE_REQUIRED) {
  const have = String(version).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const need = minimum.split(".").map(Number);
  for (let index = 0; index < need.length; index += 1) {
    if ((have[index] || 0) !== need[index]) return (have[index] || 0) > need[index];
  }
  return true;
}

function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

// Where this copy lives says which agent installed it; the script's own path is the only reliable
// source, so nothing is guessed from the machine.
function classifyInstall(skillRoot, { home = os.homedir(), cwd = process.cwd(), env = process.env } = {}) {
  const claudeDir = env.CLAUDE_CONFIG_DIR || path.join(home, ".claude");
  const roots = [
    ["claude-plugin", "Claude Code (plugin)", path.join(claudeDir, "plugins")],
    ["claude-skills", "Claude Code (skills directory)", path.join(claudeDir, "skills")],
    ["claude-skills", "Claude Code (project skills directory)", path.join(cwd, ".claude", "skills")],
    ["agents-skills", "Codex and other agents (~/.agents/skills)", path.join(home, ".agents", "skills")],
    ["agents-skills", "Codex and other agents (project .agents/skills)", path.join(cwd, ".agents", "skills")],
    ["codex-legacy", "Codex (legacy ~/.codex/skills; current Codex scans ~/.agents/skills)", path.join(home, ".codex", "skills")],
  ];
  for (const [kind, label, root] of roots) if (within(root, skillRoot)) return { kind, label, path: skillRoot };
  return { kind: "other", label: "a copy outside the standard agent locations (for example a checkout)", path: skillRoot };
}

function detectAgents({ home = os.homedir(), env = process.env } = {}) {
  const found = [];
  if (env.CLAUDECODE || fs.existsSync(path.join(home, ".claude"))) found.push("Claude Code");
  if (env.CODEX_HOME || fs.existsSync(path.join(home, ".codex"))) found.push("Codex");
  if (fs.existsSync(path.join(home, ".cursor"))) found.push("Cursor");
  return found;
}

function probeTool(name) {
  const result = spawnSync(name, ["-version"], { encoding: "utf8", windowsHide: true, timeout: 15000 });
  if (result.error || result.status !== 0) return null;
  return String(result.stdout).match(/version\s+(\S+)/)?.[1] || "found";
}

// `fix` is a command the user can paste; `todo` is an instruction when no single command exists.
function item(id, label, ok, detail, fix, todo) {
  return { id, label, ok, detail, ...(ok ? {} : fix ? { fix } : todo ? { todo } : {}) };
}

function inspectEnvironment(doctor, options = {}) {
  const platform = options.platform || process.platform;
  const env = options.env || process.env;
  const locate = options.locateBrowser || locateBrowser;
  const blender = options.findBlender || findBlender;
  const probe = options.probeTool || probeTool;
  const install = classifyInstall(doctor.packageRoot, { ...options, env });
  const cli = path.join(doctor.packageRoot, "scripts", "designer-pipeline.cjs");

  const required = [
    item("node", `Node.js ${NODE_REQUIRED.replace(/\.0$/, "")} or newer`, nodeAtLeast(doctor.node), `v${doctor.node}`, null, "Install Node.js 22.12 or newer from https://nodejs.org/, then run doctor again."),
    item("package", "Skill files", doctor.missing.length === 0, doctor.missing.length ? `missing: ${doctor.missing.slice(0, 5).join(", ")}${doctor.missing.length > 5 ? ", ..." : ""}` : "all present", install.kind === "claude-plugin" ? "claude plugin update design-pipeline@design-pipeline" : null, `Reinstall the skill with the command for your agent in ${INSTALL_DOC}.`),
  ];

  let browser;
  try {
    const located = locate(undefined, { env, platform });
    browser = item("browser", "Chromium-based browser (evidence gates, captures)", true, `${located.source}: ${located.executable}`);
  } catch (error) {
    browser = item("browser", "Chromium-based browser (evidence gates, captures)", false, "none found", installCommand("browser", platform));
  }

  const fetchables = doctor.downloads || [];
  const libraries = item(
    "sources",
    "MengTo, iart and design direction source libraries (about 240 MB, downloaded once)",
    fetchables.length === 0,
    fetchables.length ? `not downloaded: ${fetchables.map((entry) => entry.bundle).join(", ")}` : "downloaded",
    fetchCommand(cli, fetchables.length === 1 ? fetchables[0].bundle : undefined),
  );
  const ffmpegVersion = probe("ffmpeg");
  const ffprobeVersion = probe("ffprobe");
  const ffmpeg = item(
    "ffmpeg",
    "ffmpeg and ffprobe (film, edit and audio checks)",
    Boolean(ffmpegVersion && ffprobeVersion),
    ffmpegVersion && ffprobeVersion ? `ffmpeg ${ffmpegVersion}` :`not on PATH: ${[!ffmpegVersion && "ffmpeg", !ffprobeVersion && "ffprobe"].filter(Boolean).join(", ")}`,
    installCommand("ffmpeg", platform),
  );
  let blenderItem;
  try {
    const found = blender(undefined);
    // The same floor renderTemplate enforces: an older Blender is found but cannot render the templates.
    const recent = found.major > 4 || (found.major === 4 && found.minor >= 2);
    blenderItem = item("blender", "Blender 4.2 or newer (3D film templates)", recent, recent ? `${found.version} at ${found.path}` : `${found.version} at ${found.path} is older than 4.2`, installCommand("blender", platform));
  } catch (error) {
    blenderItem = item("blender", "Blender 4.2 or newer (3D film templates)", false, error.code === "TOOL_MISSING" ? "not found" : String(error.message).slice(0, 160), installCommand("blender", platform));
  }

  return {
    install,
    agents: detectAgents({ home: options.home, env }),
    tiers: { required, recommended: [browser], optional: [libraries, ffmpeg, blenderItem] },
  };
}

function renderDoctor(doctor, environment) {
  const lines = ["design-pipeline doctor", ""];
  lines.push(`Installed at  ${environment.install.path}`);
  lines.push(`Installed as  ${environment.install.label}`);
  lines.push(`Agents found  ${environment.agents.length ? environment.agents.join(", ") : "none detected"}`);
  const sections = [
    ["Required (the skill does not work without these)", environment.tiers.required],
    ["Recommended (needed once a task captures or verifies in a browser)", environment.tiers.recommended],
    ["Optional (install when a task needs them)", environment.tiers.optional],
  ];
  for (const [title, entries] of sections) {
    lines.push("", title);
    for (const entry of entries) {
      lines.push(`  [${entry.ok ? "ok" : "missing"}] ${entry.label}: ${entry.detail}`);
      if (!entry.ok && entry.fix) lines.push(`        run: ${entry.fix}`);
      else if (!entry.ok && entry.todo) lines.push(`        do:  ${entry.todo}`);
    }
  }
  const absent = [...environment.tiers.recommended, ...environment.tiers.optional].filter((entry) => !entry.ok).length;
  lines.push("");
  if (doctor.status !== "ready") lines.push("Result: blocked. Fix the required items above.");
  else if (absent) lines.push(`Result: ready. ${absent} recommended or optional item${absent === 1 ? " is" : "s are"} missing; install ${absent === 1 ? "it" : "them"} when a task asks. Nothing was installed.`);
  else lines.push("Result: ready. Nothing is missing.");
  return lines.join("\n");
}

module.exports = { NODE_REQUIRED, classifyInstall, detectAgents, inspectEnvironment, nodeAtLeast, renderDoctor };

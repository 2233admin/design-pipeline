"use strict";

// The one place that decides which Chromium browser puppeteer-core launches. Order: an explicit
// path (--chrome), PUPPETEER_EXECUTABLE_PATH, the HyperFrames chrome-headless-shell download
// (pinned, so film renders stay comparable), then an installed Chrome, Edge or Chromium.
// System locations follow Puppeteer's @puppeteer/browsers Chrome table and Playwright's msedge
// channel table. No dependency is added; puppeteer-core still comes from the caller's project.
// Self-contained (Node built-ins only): `film scaffold --template tracking-hud` copies this file
// into the film project as lib/browser-locate.cjs for probe.cjs.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SCOPE = "browser";
const WINDOWS_PREFIX_VARS = ["PROGRAMFILES", "ProgramW6432", "ProgramFiles(x86)", "LOCALAPPDATA"];
const WINDOWS_FALLBACK_PREFIXES = ["C:\\Program Files", "C:\\Program Files (x86)"];
const SYSTEM = {
  chrome: {
    win32: "Google\\Chrome\\Application\\chrome.exe",
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    linux: ["/opt/google/chrome/chrome"],
    path: ["google-chrome-stable", "google-chrome"],
  },
  edge: {
    win32: "Microsoft\\Edge\\Application\\msedge.exe",
    darwin: ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
    linux: ["/opt/microsoft/msedge/msedge"],
    path: ["microsoft-edge-stable", "microsoft-edge"],
  },
  chromium: {
    // Chromium's Windows installer: per user under LOCALAPPDATA, per machine under Program Files.
    win32: "Chromium\\Application\\chrome.exe",
    darwin: ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
    path: ["chromium", "chromium-browser"],
  },
};

function missing(message) {
  throw Object.assign(new Error(`${SCOPE}: ${message}`), { code: "TOOL_MISSING" });
}

// A discovered location is used only when it is a regular file this process may execute; anything
// else (absent, unreadable, a directory, no execute bit) moves discovery on to the next candidate.
function usable(file) {
  try {
    if (!fs.statSync(file).isFile()) return false;
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

// An explicit path never falls back: absent is TOOL_MISSING, any other filesystem error (EACCES,
// ELOOP) is raised as it is so the message names the real problem.
function explicitBrowser(file, label, fix) {
  let stat;
  try { stat = fs.statSync(file); }
  catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") missing(`${label} ${file} does not exist. Fix: ${fix}`);
    throw error;
  }
  if (!stat.isFile()) missing(`${label} ${file} is not a file. Fix: ${fix}`);
  return file;
}

function hyperframesShell(home = os.homedir(), platform = process.platform) {
  const root = path.join(home, ".cache", "hyperframes", "chrome", "chrome-headless-shell");
  if (!fs.existsSync(root)) return null;
  const exe = platform === "win32" ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  for (const build of fs.readdirSync(root).sort().reverse()) {
    const dir = path.join(root, build);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const sub of fs.readdirSync(dir)) {
      const candidate = path.join(dir, sub, exe);
      if (usable(candidate)) return candidate;
    }
  }
  return null;
}

// Every system location for one browser on this platform, in lookup order.
function systemCandidates(name, { platform = process.platform, env = process.env } = {}) {
  const entry = SYSTEM[name];
  if (platform === "win32") {
    if (!entry.win32) return [];
    const prefixes = [...new Set([...WINDOWS_PREFIX_VARS.map((key) => env[key]).filter(Boolean), ...WINDOWS_FALLBACK_PREFIXES])];
    return prefixes.map((prefix) => path.win32.join(prefix, entry.win32));
  }
  const fixed = entry[platform] || [];
  const dirs = platform === "darwin" ? [] : String(env.PATH || "").split(path.delimiter).filter(Boolean);
  return [...fixed, ...dirs.flatMap((dir) => (entry.path || []).map((exe) => path.join(dir, exe)))];
}

// Returns { executable, source } or fails TOOL_MISSING listing what was checked.
function locateBrowser(explicit, { env = process.env, platform = process.platform, home = os.homedir() } = {}) {
  if (explicit) {
    return { executable: explicitBrowser(explicit, "--chrome", "pass the path of an installed Chrome, Edge or Chromium executable"), source: "flag" };
  }
  if (env.PUPPETEER_EXECUTABLE_PATH) {
    return { executable: explicitBrowser(env.PUPPETEER_EXECUTABLE_PATH, "PUPPETEER_EXECUTABLE_PATH", "point it at an installed browser executable, or unset it"), source: "env" };
  }
  const shell = hyperframesShell(home, platform);
  if (shell) return { executable: shell, source: "hyperframes" };
  const checked = [];
  for (const name of Object.keys(SYSTEM)) {
    for (const candidate of systemCandidates(name, { platform, env })) {
      checked.push(candidate);
      if (usable(candidate)) return { executable: candidate, source: name };
    }
  }
  return missing(`no Chromium browser found (checked the HyperFrames download and ${checked.length ? checked.join(", ") : "no system locations"}). Fix: install Chrome or Edge, run \`npx hyperframes browser ensure\`, or pass --chrome <path to a browser executable>`);
}

const resolveBrowser = (explicit, options) => locateBrowser(explicit, options).executable;

// What a report records about the browser that rendered it.
async function browserIdentity(browser, executable) {
  return { executable, version: await browser.version() };
}

module.exports = { browserIdentity, hyperframesShell, locateBrowser, resolveBrowser, systemCandidates };

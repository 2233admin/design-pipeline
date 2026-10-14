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
    darwin: ["/Applications/Chromium.app/Contents/MacOS/Chromium"],
    path: ["chromium", "chromium-browser"],
  },
};

function missing(message) {
  throw Object.assign(new Error(`${SCOPE}: ${message}`), { code: "TOOL_MISSING" });
}

function isFile(file) {
  try { return fs.statSync(file).isFile(); } catch { return false; }
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
      if (isFile(candidate)) return candidate;
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
    if (!isFile(explicit)) missing(`--chrome ${explicit} does not exist. Fix: pass the path of an installed Chrome, Edge or Chromium executable`);
    return { executable: explicit, source: "flag" };
  }
  if (env.PUPPETEER_EXECUTABLE_PATH) {
    if (!isFile(env.PUPPETEER_EXECUTABLE_PATH)) missing(`PUPPETEER_EXECUTABLE_PATH ${env.PUPPETEER_EXECUTABLE_PATH} does not exist. Fix: point it at an installed browser executable, or unset it`);
    return { executable: env.PUPPETEER_EXECUTABLE_PATH, source: "env" };
  }
  const shell = hyperframesShell(home, platform);
  if (shell) return { executable: shell, source: "hyperframes" };
  const checked = [];
  for (const name of Object.keys(SYSTEM)) {
    for (const candidate of systemCandidates(name, { platform, env })) {
      checked.push(candidate);
      if (isFile(candidate)) return { executable: candidate, source: name };
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

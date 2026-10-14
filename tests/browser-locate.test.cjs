"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { locateBrowser, systemCandidates } = require("../skill/scripts/browser-locate.cjs");
const { scaffoldFilm } = require("../skill/scripts/film-project-core.cjs");

function temporary(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "browser-locate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function touch(file, mode = 0o755) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, "", { mode });
  fs.chmodSync(file, mode);
  return file;
}
// The tests below pass a non-Windows platform, so the download has no .exe suffix.
function shell(home, build = "131.0.0") {
  return touch(path.join(home, ".cache", "hyperframes", "chrome", "chrome-headless-shell", build, "linux64", "chrome-headless-shell"));
}
// A platform with no system table and an empty PATH: only the flag, env and download remain.
const BARE = { platform: "sunos", env: {} };

test("an explicit path wins and a missing one fails without falling back", (t) => {
  const dir = temporary(t), home = path.join(dir, "home"), flag = touch(path.join(dir, "edge"));
  shell(home);
  assert.deepEqual(locateBrowser(flag, { ...BARE, home, env: { PUPPETEER_EXECUTABLE_PATH: flag } }), { executable: flag, source: "flag" });
  assert.throws(() => locateBrowser(path.join(dir, "typo"), { ...BARE, home }), (error) => error.code === "TOOL_MISSING" && /--chrome .*typo does not exist/.test(error.message));
  assert.throws(() => locateBrowser(undefined, { ...BARE, home, env: { PUPPETEER_EXECUTABLE_PATH: path.join(dir, "typo") } }), (error) => error.code === "TOOL_MISSING" && /PUPPETEER_EXECUTABLE_PATH .*typo does not exist/.test(error.message));
});

test("PUPPETEER_EXECUTABLE_PATH precedes the HyperFrames download, which precedes system browsers", (t) => {
  const dir = temporary(t), home = path.join(dir, "home"), bin = path.join(dir, "bin");
  const env = touch(path.join(dir, "env-browser"));
  touch(path.join(bin, "chromium"));
  assert.equal(locateBrowser(undefined, { ...BARE, home, env: { PUPPETEER_EXECUTABLE_PATH: env } }).source, "env");
  const newest = shell(home, "131.0.0");
  shell(home, "120.0.0");
  assert.deepEqual(locateBrowser(undefined, { platform: "linux", home, env: { PATH: bin } }), { executable: newest, source: "hyperframes" });
});

test("without a download a system browser on PATH is used", (t) => {
  const dir = temporary(t), bin = path.join(dir, "bin"), chromium = touch(path.join(bin, "chromium"));
  const found = locateBrowser(undefined, { platform: "linux", home: path.join(dir, "home"), env: { PATH: bin } });
  // A real Chrome or Edge under /opt on this machine legitimately comes first.
  if (found.source === "chromium") assert.equal(found.executable, chromium);
  else assert.match(found.source, /^(chrome|edge)$/);
});

test("system locations follow Puppeteer's Chrome and Playwright's Edge tables, Chrome first", () => {
  const env = { PROGRAMFILES: "C:\\Program Files", "ProgramFiles(x86)": "C:\\Program Files (x86)", LOCALAPPDATA: "C:\\Users\\a\\AppData\\Local" };
  assert.deepEqual(systemCandidates("chrome", { platform: "win32", env }), [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Users\\a\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
  ]);
  assert.ok(systemCandidates("edge", { platform: "win32", env: {} }).includes("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"), "fallback prefixes cover a missing environment");
  assert.deepEqual(systemCandidates("chromium", { platform: "win32", env }), [
    "C:\\Program Files\\Chromium\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe",
    "C:\\Users\\a\\AppData\\Local\\Chromium\\Application\\chrome.exe",
  ], "Chromium's per-user Windows install is found");
  assert.deepEqual(systemCandidates("edge", { platform: "darwin", env: { PATH: "/usr/bin" } }), ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"]);
  assert.deepEqual(systemCandidates("edge", { platform: "linux", env: { PATH: ["/a", "/b"].join(path.delimiter) } }), [
    "/opt/microsoft/msedge/msedge",
    path.join("/a", "microsoft-edge-stable"), path.join("/a", "microsoft-edge"),
    path.join("/b", "microsoft-edge-stable"), path.join("/b", "microsoft-edge"),
  ]);
});

test("discovery skips a candidate it cannot execute", { skip: process.platform === "win32" && "Windows has no execute bit" }, (t) => {
  const dir = temporary(t), home = path.join(dir, "home");
  const runnable = shell(home, "120.0.0");
  fs.chmodSync(shell(home, "131.0.0"), 0o644);
  assert.deepEqual(locateBrowser(undefined, { ...BARE, home }), { executable: runnable, source: "hyperframes" }, "the newer, non-executable download is passed over");
});

test("an explicit path that cannot be read raises the real error, not \"does not exist\"", { skip: process.platform === "win32" && "symlinks need privileges on Windows" }, (t) => {
  const dir = temporary(t), loop = path.join(dir, "loop");
  fs.symlinkSync(loop, loop);
  assert.throws(() => locateBrowser(loop, BARE), (error) => error.code === "ELOOP");
  assert.throws(() => locateBrowser(dir, BARE), (error) => error.code === "TOOL_MISSING" && /is not a file/.test(error.message));
});

test("no browser fails TOOL_MISSING naming the checks and the fixes", (t) => {
  const home = path.join(temporary(t), "home");
  assert.throws(() => locateBrowser(undefined, { ...BARE, home }), (error) => {
    assert.equal(error.code, "TOOL_MISSING");
    assert.match(error.message, /no Chromium browser found \(checked the HyperFrames download/);
    assert.match(error.message, /install Chrome or Edge, run `npx hyperframes browser ensure`, or pass --chrome/);
    return true;
  });
});

test("the tracking HUD scaffold carries the shared resolver byte for byte", (t) => {
  const dir = path.join(temporary(t), "film");
  scaffoldFilm(dir, { template: "tracking-hud" });
  assert.deepEqual(fs.readFileSync(path.join(dir, "lib/browser-locate.cjs")), fs.readFileSync(path.join(__dirname, "../skill/scripts/browser-locate.cjs")));
  assert.doesNotMatch(fs.readFileSync(path.join(dir, "probe.cjs"), "utf8"), /HYPERFRAMES_BROWSER_PATH|chrome-headless-shell/);
});

// Launches every system browser actually installed here (Chrome and Edge on the Windows CI runner)
// through puppeteer-core, the way the tools do. Root cannot use Chrome's sandbox, so only a root
// run (a container) passes --no-sandbox.
const INSTALLED = ["chrome", "edge", "chromium"].flatMap((name) => {
  const executable = systemCandidates(name).find((file) => { try { return fs.statSync(file).isFile(); } catch { return false; } });
  return executable ? [{ name, executable }] : [];
});
let puppeteer = null;
try { puppeteer = require(require.resolve("puppeteer-core", { paths: [path.resolve(__dirname, "..")] })); } catch { /* skipped below */ }

test("each installed system browser launches headless through puppeteer-core", { skip: !puppeteer ? "puppeteer-core not installed" : !INSTALLED.length && "no system browser installed" }, async (t) => {
  const args = typeof process.getuid === "function" && process.getuid() === 0 ? ["--no-sandbox"] : [];
  for (const { name, executable } of INSTALLED) {
    const browser = await puppeteer.launch({ executablePath: executable, headless: true, args });
    try {
      const page = await browser.newPage();
      await page.setContent("<p id=ok>ok</p>");
      assert.equal(await page.$eval("#ok", (element) => element.textContent), "ok", name);
      t.diagnostic(`${name}: ${await browser.version()} (${executable})`);
    } finally {
      await browser.close();
    }
  }
});

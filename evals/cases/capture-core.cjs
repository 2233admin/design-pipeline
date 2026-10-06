"use strict";

// Deterministic UI capture for golden cases that show a real product interface. The page runs
// on Chrome's virtual time: each frame advances exactly 1/fps of page time and is captured at 2x,
// so timers, typing and replays land on the same frames in every capture and small UI text stays
// sharp under a camera push. Captures are regenerated locally and never committed.

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { resolveChrome } = require("../../skill/scripts/film-capture-core.cjs");

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".woff2": "font/woff2", ".woff": "font/woff" };

// Serve a built single-page app from root; unknown paths fall back to index.html.
function serveStatic(rootDir, port = 0) {
  const root = path.resolve(rootDir);
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, `.${decodeURIComponent(req.url.split("?")[0])}`);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html");
    res.setHeader("content-type", TYPES[path.extname(file)] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })));
}

async function launch() {
  const puppeteer = require(require.resolve("puppeteer-core", { paths: [__dirname] }));
  return puppeteer.launch({ executablePath: resolveChrome(), headless: true });
}

async function advance(client, ms) {
  await new Promise((resolve, reject) => {
    client.once("Emulation.virtualTimeBudgetExpired", resolve);
    client.send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: ms }).catch(reject);
  });
}

// Load url in real time (a paused clock stalls service-worker start-up), let it settle, then stop
// the page clock. Anything the capture then starts (typing, a replay button) begins at the same
// page instant in every capture. ready, if given, is polled in real time before the clock stops;
// before runs last with the clock still running (clicks wait for animation frames).
async function openPaused(page, url, { settleMs = 1500, ready, before } = {}) {
  await page.goto(url, { waitUntil: "load" });
  if (ready) await page.waitForFunction(ready, { timeout: 60000, polling: 200 });
  await new Promise((resolve) => setTimeout(resolve, settleMs));
  if (before) await before();
  const client = await page.createCDPSession();
  await client.send("Emulation.setVirtualTimePolicy", { policy: "pause" });
  return client;
}

// Chrome stamps requestAnimationFrame callbacks with compositor (wall-clock) time, which keeps
// running while each 2x frame is captured; animations timed from that stamp would race ahead of
// the page clock. Install before navigation so rAF callbacks receive the virtual performance.now().
async function useVirtualAnimationClock(page) {
  await page.evaluateOnNewDocument(() => {
    const native = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => native(() => callback(performance.now()));
  });
}

// Record durationSec of page time at fps into an H.264 file. onFrame(index) runs before each
// frame is advanced, for scripted input such as typing one character per frame.
async function recordFrames(page, client, { file, durationSec, fps = 30, scale = 2, onFrame }) {
  const frames = Math.round(durationSec * fps);
  const dir = `${file}.frames`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { width, height } = page.viewport();
  for (let index = 0; index < frames; index += 1) {
    if (onFrame) await onFrame(index);
    await advance(client, 1000 / fps);
    const shot = await client.send("Page.captureScreenshot", { format: "jpeg", quality: 92, clip: { x: 0, y: 0, width, height, scale } });
    fs.writeFileSync(path.join(dir, `f${String(index).padStart(5, "0")}.jpg`), Buffer.from(shot.data, "base64"));
  }
  encode(dir, fps, file);
  return { file, frames, fps };
}

// Stop-motion recording for a page that is still apart from the scripted change: setFrame(index)
// puts the page in that frame's state, then the frame is captured at 2x in real time. Used where
// the page clock cannot be paused (input that starts network requests stalls a paused page).
async function recordStopMotion(page, { file, frames, fps = 30, scale = 2, setFrame, settleMs = 60 }) {
  const dir = `${file}.frames`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const { width, height } = page.viewport();
  for (let index = 0; index < frames; index += 1) {
    await setFrame(index);
    await new Promise((resolve) => setTimeout(resolve, settleMs));
    await page.screenshot({ path: path.join(dir, `f${String(index).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92, clip: { x: 0, y: 0, width, height, scale } });
  }
  encode(dir, fps, file);
  return { file, frames, fps };
}

// A keyframe every half second: HyperFrames seeks every frame, and sparse keyframes freeze video.
function encode(dir, fps, file) {
  const encoded = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-framerate", String(fps), "-i", path.join(dir, "f%05d.jpg"), "-c:v", "libx264", "-crf", "14", "-preset", "slow", "-g", "15", "-keyint_min", "15", "-movflags", "+faststart", "-pix_fmt", "yuv420p", file], { encoding: "utf8", windowsHide: true });
  if (encoded.status !== 0) throw new Error(`ffmpeg failed encoding ${file}: ${encoded.stderr}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

async function still(page, client, file, scale = 2) {
  const { width, height } = page.viewport();
  const shot = await client.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width, height, scale } });
  fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
  return file;
}

module.exports = { advance, launch, openPaused, recordFrames, recordStopMotion, serveStatic, still, useVirtualAnimationClock };

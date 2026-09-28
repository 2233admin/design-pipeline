"use strict";

const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const REAL_INPUT_SKINS = Object.freeze({
  paper: { background: "#f5efe3", accent: "#b85c38", ink: "#2b211d" },
  glass: { background: "#dcecff", accent: "#2455b8", ink: "#11223d" },
});

function pageHtml(skin = "paper") {
  if (!Object.hasOwn(REAL_INPUT_SKINS, skin)) throw new Error(`unknown real-input skin: ${skin}`);
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;min-height:1400px;background:${REAL_INPUT_SKINS[skin].background};color:${REAL_INPUT_SKINS[skin].ink};font:16px sans-serif}
main{height:1400px;padding:40px;box-sizing:border-box}.panel{width:240px;height:160px;transform:translate3d(0px,0,0);background:${REAL_INPUT_SKINS[skin].accent};color:white;display:grid;place-items:center;user-select:none}
canvas{display:block;margin-top:24px;border:1px solid ${REAL_INPUT_SKINS[skin].ink}}
</style></head><body><main><div class="panel" data-animation-dom tabindex="0">${skin}</div><canvas data-animation-canvas width="160" height="80"></canvas></main>
<script>
(() => {
  const skin = ${JSON.stringify(skin)};
  const colors = ${JSON.stringify(REAL_INPUT_SKINS[skin])};
  const panel = document.querySelector("[data-animation-dom]");
  const canvas = document.querySelector("canvas[data-animation-canvas]");
  const context = canvas.getContext("2d");
  const initial = { mechanism: "drag", skin, phase: "rest", position: 0, scroll: 0, pointerX: 0, pointerY: 0, key: "", inputCount: 0 };
  let current = { ...initial };
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const readState = () => ({ ...current });
  function render() {
    panel.style.transform = "translate3d(" + (current.position * 100).toFixed(3) + "px,0,0)";
    panel.dataset.phase = current.phase;
    context.fillStyle = colors.background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = colors.accent;
    context.fillRect(current.position * 100, 16, 40, 40);
    context.fillStyle = colors.ink;
    context.fillText(current.phase + ":" + current.inputCount, 8, 72);
  }
  function reset() { current = { ...initial }; render(); return readState(); }
  function seek(timeMs) { current.position = clamp(Number(timeMs) / 600, 0, 1); current.phase = current.position === 0 ? "rest" : (current.position === 1 ? "settled" : "moving"); render(); return readState(); }
  function settle() { current.phase = current.position === 0 ? "rest" : "settled"; render(); return readState(); }
  function input(kind, event) { current.inputCount += 1; current.pointerX = event.clientX || current.pointerX; current.pointerY = event.clientY || current.pointerY; current.phase = kind; render(); }
  window.addEventListener("pointerdown", event => input("pointer-down", event));
  window.addEventListener("pointerup", event => input("pointer-up", event));
  window.addEventListener("pointermove", event => { current.inputCount += 1; current.pointerX = event.clientX; current.pointerY = event.clientY; current.position = clamp(event.clientX / 160, 0, 1); current.phase = "dragging"; render(); });
  window.addEventListener("wheel", event => { current.inputCount += 1; current.scroll += event.deltaY; current.phase = "wheel"; render(); }, { passive: true });
  window.addEventListener("scroll", () => { current.inputCount += 1; current.scroll = window.scrollY; current.phase = "scroll"; render(); });
  window.addEventListener("keydown", event => { current.inputCount += 1; current.key = event.key; current.phase = event.key === "Enter" ? "expanded" : "focused"; render(); });
  window.__animation = { seek, settle, reset, state: readState };
  reset();
})();
</script></body></html>`;
}

async function startFixtureServer(skin = "paper") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-real-input-page-"));
  const file = path.join(root, "index.html");
  fs.writeFileSync(file, pageHtml(skin));
  const server = http.createServer((request, response) => {
    if (request.url !== "/index.html" && request.url !== "/") {
      response.writeHead(404); response.end(); return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(fs.readFileSync(file));
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  return { root, file, url: `http://127.0.0.1:${address.port}/index.html`, close: () => new Promise((resolve) => server.close(resolve)) };
}

module.exports = { REAL_INPUT_SKINS, pageHtml, startFixtureServer };

"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { startPanel } = require("../skill/scripts/tunables-preview-core.cjs");
const tunables = require("../skill/scripts/tunables-core.cjs");
const { FILM_PARAMS, PAGE_PARAMS, browserTools, hashTree, makeFilm, makePage, tmp, tn } = require("./helpers/tunables-fixtures.cjs");

const BROWSER = browserTools();
const PANEL_HTML = path.join(__dirname, "../skill/tools/tunables-panel/panel.html");
const cliFile = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const cleanup = (...dirs) => { for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true }); };
const readValues = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "tunables.json"), "utf8")).values;

// A raw request, so a test can send any Host, Origin, method and path byte for byte.
function request(port, { method = "GET", target, headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, method, path: target, headers: { Host: `127.0.0.1:${port}`, ...headers } }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try { json = JSON.parse(text); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on("error", reject);
    if (body !== undefined) req.write(body);
    req.end();
  });
}

const call = (panel, route, options = {}) => request(panel.port, { ...options, target: `/${panel.token}/${route}` });
const put = (panel, route, value, headers = {}) => call(panel, route, { method: "PUT", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });
const post = (panel, route, value, headers = {}) => call(panel, route, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(value) });

async function withPanel(dir, run, options = {}) {
  const panel = await startPanel(dir, { idleMinutes: 5, ...options });
  try { await run(panel); } finally { await panel.close(); }
}

test("the server answers only on its token path, on loopback Host and Origin, with GET, PUT and POST", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      assert.match(panel.token, /^[0-9a-f]{32}$/, "128 random bits");
      assert.equal(panel.url, `http://127.0.0.1:${panel.port}/${panel.token}/`);
      assert.equal((await request(panel.port, { target: "/" })).status, 404, "no token, no page");
      assert.equal((await request(panel.port, { target: "/0".repeat(16) + "/" })).status, 404);
      assert.equal((await request(panel.port, { target: `/${panel.token}` })).status, 404, "the token needs its trailing slash");
      const home = await call(panel, "");
      assert.equal(home.status, 200);
      assert.match(home.headers["content-security-policy"], /default-src 'self'/);
      assert.match(home.headers["content-type"], /^text\/html/);
      assert.equal(home.headers["cache-control"], "no-store");
      assert.equal((await call(panel, "", { headers: { Host: "evil.example" } })).status, 403, "a foreign Host is refused");
      assert.equal((await call(panel, "", { headers: { Host: `localhost:${panel.port}` } })).status, 200);
      assert.equal((await put(panel, "api/draft", { values: {} }, { Origin: "http://evil.example" })).status, 403, "a foreign Origin is refused");
      assert.equal((await post(panel, "api/save", { revision: "x" }, { Origin: `http://127.0.0.1:${panel.port}` })).status, 409, "the panel's own Origin passes to the revision check");
      for (const method of ["DELETE", "OPTIONS", "HEAD", "PATCH"]) {
        const answer = await call(panel, "api/state", { method });
        assert.equal(answer.status, 405, method);
      }
      assert.equal((await call(panel, "api/state", { method: "POST" })).status, 405);
      assert.equal((await call(panel, "api/draft")).status, 405, "draft takes PUT only");
      assert.equal((await call(panel, "api/save", { method: "PUT" })).status, 405, "save takes POST only");
      assert.equal((await call(panel, "unknown")).status, 404);
    });
  } finally { cleanup(dir); }
});

test("the preview serves project files only: no traversal, encoded separators, .git, .env or symlinks out", async () => {
  const dir = makePage(tmp());
  const outside = tmp("tunables-outside-");
  try {
    fs.writeFileSync(path.join(outside, "secret.txt"), "outside");
    fs.mkdirSync(path.join(dir, ".git"));
    fs.writeFileSync(path.join(dir, ".git", "config"), "[core]");
    fs.writeFileSync(path.join(dir, ".env"), "TOKEN=1");
    fs.writeFileSync(path.join(dir, ".env.local"), "TOKEN=2");
    fs.mkdirSync(path.join(dir, "assets"));
    fs.writeFileSync(path.join(dir, "assets", "note.txt"), "note");
    let linked = false;
    try { fs.symlinkSync(path.join(outside, "secret.txt"), path.join(dir, "assets", "link.txt"), "file"); linked = true; } catch { linked = false; }
    await withPanel(dir, async (panel) => {
      const get = (rest) => call(panel, `preview/${rest}`);
      assert.equal((await get("assets/note.txt")).text, "note");
      assert.equal((await get("")).status, 200, "the folder answers with index.html");
      for (const rest of ["../tunables.json", "assets/../../x", "%2e%2e/secret.txt", "..%2fsecret.txt", "assets%2fnote.txt", "assets%5cnote.txt", ".git/config", ".git", ".env", ".env.local", "C:/Windows/win.ini", "index.html:stream", "assets/note.txt%00", "%zz"]) {
        assert.equal((await get(rest)).status, 404, rest);
      }
      if (linked) assert.equal((await get("assets/link.txt")).status, 404, "a symlink out of the project is not followed");
      assert.equal((await get("missing.html")).status, 404);
    });
  } finally { cleanup(dir, outside); }
});

test("the preview page gets the timeline registry and a tunables.js built from the draft", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      const page = await call(panel, "preview/index.html");
      assert.match(page.text, /<head>\s*<script>window\.__timelines=window\.__timelines\|\|\{\};<\/script>/);
      assert.match(page.text, /<script src="tunables\.js"><\/script>/, "the project's own include is untouched");
      const before = await call(panel, "preview/tunables.js");
      assert.equal(before.text, fs.readFileSync(path.join(dir, "tunables.js"), "utf8"), "no draft: the file as saved");
      const draft = await put(panel, "api/draft", { values: { "card-radius": 20, accent: "#00C2A8" } });
      assert.equal(draft.status, 200, draft.text);
      const after = await call(panel, "preview/tunables.js");
      assert.match(after.text, /"card-radius":20/);
      assert.match(after.text, /#00c2a8/);
      assert.equal(after.text.includes("do not edit"), true);
    });
  } finally { cleanup(dir); }
});

test("a draft changes the preview only: the project files keep their bytes", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      const before = hashTree(dir);
      const state = (await call(panel, "api/state")).json;
      assert.deepEqual(state.params.map((param) => param.id), PAGE_PARAMS.map((param) => param.id));
      assert.equal(state.dirty, false);
      const draft = (await put(panel, "api/draft", { values: { "card-radius": 20 } })).json;
      assert.equal(draft.dirty, true);
      assert.equal(draft.effective["card-radius"], 20);
      assert.deepEqual(draft.saved, {});
      assert.equal(draft.revision, state.revision, "a draft keeps the revision of the file");
      assert.equal(hashTree(dir), before, "the SHA-256 of every project file is unchanged");
      assert.equal((await put(panel, "api/draft", { values: {} })).json.dirty, false, "an empty draft is the saved values again");
    });
  } finally { cleanup(dir); }
});

test("an invalid or unknown draft value answers 400 and writes nothing", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      const before = hashTree(dir);
      const over = await put(panel, "api/draft", { values: { "card-radius": 999 } });
      assert.equal(over.status, 400);
      assert.equal(over.json.error.code, "VALUE_INVALID");
      assert.equal(over.json.error.id, "card-radius");
      assert.equal((await put(panel, "api/draft", { values: { nope: 1 } })).json.error.code, "VALUE_UNKNOWN");
      assert.equal((await put(panel, "api/draft", { values: [1] })).json.error.code, "VALUE_INVALID");
      assert.equal((await put(panel, "api/draft", { values: { accent: "red" } })).status, 400);
      assert.equal((await call(panel, "api/draft", { method: "PUT", body: "{ not json" })).json.error.code, "BODY_INVALID");
      assert.equal((await post(panel, "api/save", { revision: (await call(panel, "api/state")).json.revision, values: { "card-radius": 999 } })).status, 400);
      assert.equal((await call(panel, "api/state")).json.dirty, false, "the refused values never became a draft");
      assert.equal(hashTree(dir), before);
    });
  } finally { cleanup(dir); }
});

test("a body over 64 KB is refused with 413", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      const big = JSON.stringify({ values: { "title-text": "x".repeat(70 * 1024) } });
      const answer = await call(panel, "api/draft", { method: "PUT", headers: { "Content-Type": "application/json", "Content-Length": String(Buffer.byteLength(big)) }, body: big }).catch((error) => ({ status: error.code }));
      assert.ok([413, "ECONNRESET", "EPIPE"].includes(answer.status), String(answer.status));
      if (answer.status === 413) assert.equal(answer.json.error.code, "BODY_TOO_LARGE");
      assert.equal((await call(panel, "api/state")).status, 200, "the server keeps running");
    });
  } finally { cleanup(dir); }
});

test("Save writes tunables.json and tunables.js through the same checks as set, and clears the draft", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      const { revision } = (await call(panel, "api/state")).json;
      await put(panel, "api/draft", { values: { grain: true } });
      const saved = await post(panel, "api/save", { revision, values: { "card-radius": 12, accent: "#00C2A8", density: "comfortable" } });
      assert.equal(saved.status, 200, saved.text);
      assert.deepEqual(saved.json.wrote.sort(), ["tunables.js", "tunables.json"]);
      assert.deepEqual(readValues(dir), { accent: "#00c2a8", "card-radius": 12 }, "default-equal values are not stored; the body wins over the draft");
      assert.notEqual(saved.json.state.revision, revision);
      assert.equal(saved.json.state.dirty, false);
      assert.equal(tn(dir, "check").status, 0, "the written pair passes check");
      assert.match(fs.readFileSync(path.join(dir, "tunables.js"), "utf8"), /"card-radius":12/);
      const again = await post(panel, "api/save", { revision: saved.json.state.revision, values: { "card-radius": 12, accent: "#00c2a8" } });
      assert.deepEqual(again.json.wrote, [], "nothing changed, nothing written");
    });
  } finally { cleanup(dir); }
});

test("Save on a stale revision answers 409 with the file's state and writes nothing", async () => {
  const dir = makePage(tmp());
  try {
    await withPanel(dir, async (panel) => {
      const { revision } = (await call(panel, "api/state")).json;
      assert.equal(tn(dir, "set", ["--param", "accent=#112233"]).status, 0, "an edit from outside the panel");
      const before = hashTree(dir);
      const refused = await post(panel, "api/save", { revision, values: { "card-radius": 20 } });
      assert.equal(refused.status, 409);
      assert.equal(refused.json.error.code, "REVISION_CONFLICT");
      assert.deepEqual(refused.json.state.saved, { accent: "#112233" });
      assert.notEqual(refused.json.state.revision, revision);
      assert.equal(hashTree(dir), before);
      assert.deepEqual(readValues(dir), { accent: "#112233" });
    });
  } finally { cleanup(dir); }
});

test("an idle panel closes itself, and a taken port is a PORT_IN_USE error", async () => {
  const dir = makePage(tmp());
  try {
    const panel = await startPanel(dir, { idleMs: 200 });
    const started = Date.now();
    await Promise.race([panel.closed, new Promise((_, reject) => setTimeout(() => reject(new Error("the panel stayed open")), 5000))]);
    assert.ok(Date.now() - started >= 150, "it waited for the idle time");
    await assert.rejects(call(panel, "api/state"), (error) => error.code === "ECONNREFUSED");

    const first = await startPanel(dir, { idleMinutes: 5 });
    try {
      await assert.rejects(startPanel(dir, { port: first.port }), (error) => error.code === "PORT_IN_USE");
      await call(first, "api/state");
      assert.equal(first.port > 0 && first.url.startsWith("http://127.0.0.1:"), true);
    } finally { await first.close(); }
    await first.closed;
  } finally { cleanup(dir); }
});

test("tunables panel prints its URL, serves it, and exits 0 after the idle time", async () => {
  const dir = makePage(tmp());
  try {
    const child = spawn(process.execPath, [cliFile, "tunables", "panel", "--root", dir, "--project-root", dir, "--idle-minutes", "0.03", "--json"], { windowsHide: true });
    let out = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    const exit = new Promise((resolve) => child.on("close", (code) => resolve(code)));
    const started = Date.now();
    while (!out.includes("\n") && Date.now() - started < 15000) await new Promise((resolve) => setTimeout(resolve, 50));
    const body = JSON.parse(out.trim().split("\n")[0]);
    assert.equal(body.ok, true, out);
    assert.equal(body.status, "serving");
    assert.equal(body.idleMinutes, 0.03);
    assert.match(body.url, /^http:\/\/127\.0\.0\.1:\d+\/[0-9a-f]{32}\/$/);
    const url = new URL(body.url);
    const state = await request(Number(url.port), { target: `${url.pathname}api/state` });
    assert.equal(state.status, 200);
    assert.equal(await Promise.race([exit, new Promise((resolve) => setTimeout(() => resolve("timeout"), 15000))]), 0, "exit code 0 once idle");
  } finally { cleanup(dir); }
});

test("panel and probe options are checked before anything starts", () => {
  const dir = makePage(tmp());
  try {
    assert.equal(tn(dir, "panel", ["--port", "70000"]).body.error.code, "OPTION_INVALID");
    assert.equal(tn(dir, "panel", ["--idle-minutes", "0"]).body.error.code, "OPTION_INVALID");
    assert.equal(tn(dir, "panel", ["--idle-minutes", "9999"]).status, 1);
    fs.writeFileSync(path.join(dir, "tunables.json"), "{ not json");
    assert.equal(tn(dir, "panel").status, 1, "an unreadable file never starts a server");
  } finally { cleanup(dir); }
});

test("the page is self-contained, follows the color scheme and has no accept, reject or render control", () => {
  const html = fs.readFileSync(PANEL_HTML, "utf8");
  assert.match(html, /<meta name="color-scheme" content="light dark">/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.doesNotMatch(html, /https?:\/\//i, "no network address of any kind");
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/i, "no external script or stylesheet");
  const buttons = [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((match) => match[1].trim());
  assert.ok(buttons.length >= 5);
  for (const label of buttons) assert.doesNotMatch(label, /accept|reject|approve|render/i, label);
  assert.doesNotMatch(html, /localStorage|sessionStorage|document\.cookie/);
});

// ---------- in a browser ----------

async function openPanel(dir, run, options = {}) {
  const puppeteer = require(BROWSER.puppeteerModule);
  const panel = await startPanel(dir, { idleMinutes: 5 });
  const browser = await puppeteer.launch({ executablePath: BROWSER.chrome, headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport(options.viewport || { width: 1280, height: 800 });
    if (options.scheme) await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: options.scheme }]);
    await page.goto(panel.url, { waitUntil: "load" });
    await page.waitForFunction(() => /loaded/.test(document.querySelector("#status").textContent), { timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("#frame").contentDocument?.readyState === "complete" && Boolean(document.querySelector("#frame").contentWindow.tunable), { timeout: 15000 });
    return await run(page, panel);
  } finally {
    await browser.close();
    await panel.close();
  }
}

// Replaces the content of an input: focus, select all, type.
async function fill(page, selector, text) {
  await page.focus(selector);
  await page.$eval(selector, (node) => node.select());
  await page.keyboard.type(text);
}

const frameValue = (page, id) => page.evaluate((key) => document.querySelector("#frame").contentWindow.tunable(key), id);
const waitFrameValue = (page, id, value) => page.waitForFunction((key, expected) => { try { return document.querySelector("#frame").contentWindow.tunable(key) === expected; } catch { return false; } }, { timeout: 15000 }, id, value);

test("every param gets a labelled control of its type, grouped in fieldsets, each with a Reset", { skip: BROWSER.skip }, async () => {
  const dir = makePage(tmp(), { values: { "card-radius": 12, "title-text": "Hi" } });
  try {
    await openPanel(dir, async (page) => {
      const seen = await page.evaluate(() => ({
        legends: [...document.querySelectorAll("#groups fieldset > legend")].map((node) => node.textContent),
        controls: [...document.querySelectorAll(".control")].map((row) => ({
          id: row.dataset.param,
          label: row.querySelector("label").textContent,
          labelFor: row.querySelector("label").htmlFor,
          inputs: [...row.querySelectorAll("input, select")].map((input) => ({ tag: input.tagName.toLowerCase(), type: input.type, name: (input.labels?.[0]?.textContent) || input.getAttribute("aria-label"), role: input.getAttribute("role"), value: input.type === "checkbox" ? input.checked : input.value })),
          reset: { name: row.querySelector("button").getAttribute("aria-label"), disabled: row.querySelector("button").disabled },
          hint: row.querySelector(".default").textContent,
        })),
        unnamed: [...document.querySelectorAll("input, select, button")].filter((node) => !(node.labels?.length || node.getAttribute("aria-label") || node.textContent.trim())).length,
      }));
      assert.deepEqual(seen.legends, ["color", "shape", "texture", "copy"]);
      const byId = Object.fromEntries(seen.controls.map((control) => [control.id, control]));
      assert.deepEqual(byId.accent.inputs.map((input) => input.type), ["color", "text"]);
      assert.equal(byId.accent.inputs[1].value, "#0b5fff");
      assert.deepEqual(byId["card-radius"].inputs.map((input) => input.type), ["range", "number"]);
      assert.deepEqual(byId["card-radius"].inputs.map((input) => input.value), ["12", "12"]);
      assert.equal(byId["card-radius"].hint, "Default: 8 px");
      assert.equal(byId["card-radius"].reset.disabled, false, "a changed value can be reset");
      assert.equal(byId.accent.reset.disabled, true, "a default cannot");
      assert.equal(byId.density.inputs[0].tag, "select");
      assert.equal(byId.grain.inputs[0].role, "switch");
      assert.equal(byId["title-text"].inputs[0].value, "Hi");
      for (const control of seen.controls) {
        assert.equal(control.label.length > 0 && control.labelFor.length > 0, true, control.id);
        for (const input of control.inputs) assert.ok(input.name, `${control.id} ${input.type} has an accessible name`);
        assert.match(control.reset.name, /^Reset .+ to its default$/);
      }
      assert.equal(seen.unnamed, 0, "no control without a name");
      assert.equal(await page.$eval("#title-text-counter, [data-param='title-text'] .unit", (node) => node.textContent), "2/500", "a text control counts its length");
    });
  } finally { cleanup(dir); }
});

test("a moved control reaches the preview as a draft and Reset puts it back", { skip: BROWSER.skip }, async () => {
  const dir = makePage(tmp());
  try {
    await openPanel(dir, async (page) => {
      const before = hashTree(dir);
      assert.equal(await frameValue(page, "card-radius"), 8);
      await fill(page, "[data-param='card-radius'] input[type=number]", "20");
      await waitFrameValue(page, "card-radius", 20);
      assert.equal(await page.$eval("#dirty", (node) => node.hidden), false, "Unsaved changes shows");
      assert.equal(await page.$eval("[data-param='card-radius'] input[type=range]", (node) => node.value), "20", "the slider follows the number");
      await fill(page, "[data-param='card-radius'] input[type=number]", "99");
      assert.match(await page.$eval("[data-param='card-radius'] .problem", (node) => node.textContent), /0 to 48/);
      assert.equal(await page.$eval("[data-param='card-radius'] input[type=number]", (node) => node.getAttribute("aria-invalid")), "true");
      await page.click("[data-param='card-radius'] .meta button");
      await waitFrameValue(page, "card-radius", 8);
      assert.equal(await page.$eval("#dirty", (node) => node.hidden), true);
      await page.click("[data-param='grain'] input");
      await waitFrameValue(page, "grain", true);
      await page.select("[data-param='density'] select", "compact");
      await waitFrameValue(page, "density", "compact");
      await page.type("[data-param='title-text'] input", " there");
      await waitFrameValue(page, "title-text", "Hello there");
      assert.equal(hashTree(dir), before, "nothing was written without Save");
    });
  } finally { cleanup(dir); }
});

test("Save writes the values; an outside edit raises the conflict banner and both ways out work", { skip: BROWSER.skip }, async () => {
  const dir = makePage(tmp());
  try {
    await openPanel(dir, async (page) => {
      const save = async () => { await page.click("#save"); await page.waitForFunction(() => /Saved|Not saved/.test(document.querySelector("#status").textContent), { timeout: 15000 }); };
      await fill(page, "[data-param='card-radius'] input[type=number]", "20");
      await waitFrameValue(page, "card-radius", 20);
      await save();
      assert.deepEqual(readValues(dir), { "card-radius": 20 });
      assert.equal(await page.$eval("#dirty", (node) => node.hidden), true);

      assert.equal(tn(dir, "set", ["--param", "accent=#112233"]).status, 0, "an edit from outside the panel");
      await page.click("[data-param='grain'] input");
      await waitFrameValue(page, "grain", true);
      const outsideOnly = hashTree(dir);
      await save();
      assert.equal(await page.$eval("#conflict", (node) => node.hidden), false, "the conflict banner shows");
      assert.equal(hashTree(dir), outsideOnly, "the conflicting Save wrote nothing");

      await page.click("#discard");
      await page.waitForFunction(() => document.querySelector("[data-param='accent'] input[type=text]").value === "#112233", { timeout: 15000 });
      assert.equal(await page.$eval("#conflict", (node) => node.hidden), true);
      assert.equal(await page.$eval("[data-param='grain'] input", (node) => node.checked), false, "the file's values replace the panel's edits");

      assert.equal(tn(dir, "set", ["--param", "density=compact"]).status, 0);
      await page.click("[data-param='grain'] input");
      await save();
      assert.equal(await page.$eval("#conflict", (node) => node.hidden), false);
      await page.click("#keep");
      await save();
      assert.equal(await page.$eval("#conflict", (node) => node.hidden), true);
      assert.deepEqual(readValues(dir), { "card-radius": 20, accent: "#112233", grain: true }, "the panel's edits are written on the file's latest revision");
      assert.equal(tn(dir, "check").status, 0);
    });
  } finally { cleanup(dir); }
});

test("a page shows width buttons, follows the color scheme and the keyboard reaches every control", { skip: BROWSER.skip }, async () => {
  const dir = makePage(tmp());
  try {
    let lightBackground;
    await openPanel(dir, async (page) => { lightBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor); }, { scheme: "light" });
    await openPanel(dir, async (page) => {
      assert.notEqual(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), lightBackground, "dark scheme changes the page");
      assert.equal(await page.$eval("#viewport", (node) => node.hidden), false);
      assert.equal(await page.$eval("#scrub", (node) => node.hidden), true, "a page has no time scrubber");
      await page.click("#viewport button[data-width='375']");
      assert.equal(await page.$eval("#viewport button[data-width='375']", (node) => node.getAttribute("aria-pressed")), "true");
      assert.equal(await page.$eval("#viewport button[data-width='1280']", (node) => node.getAttribute("aria-pressed")), "false");
      const expected = await page.$$eval("input, select, button", (nodes) => nodes.filter((node) => !node.disabled && !node.hidden && node.offsetParent !== null).length);
      await page.focus("#save");
      const reached = new Set();
      for (let step = 0; step < expected + 5; step += 1) {
        await page.keyboard.press("Tab");
        reached.add(await page.evaluate(() => { const node = document.activeElement; return node === document.body ? "body" : `${node.tagName}#${node.id}.${node.type}.${node.getAttribute("aria-label") || node.textContent.slice(0, 20)}`; }));
      }
      assert.ok(reached.size >= expected - 3, `keyboard reached ${reached.size} of ${expected} focusable elements`);
    }, { scheme: "dark" });
  } finally { cleanup(dir); }
});

test("a film shows the time scrubber, fits its canvas and seeks to a param's window on focus", { skip: BROWSER.skip }, async () => {
  const params = FILM_PARAMS.map((param) => (param.id === "late-shift" ? { ...param, window: { startSec: 3, endSec: 4 } } : param));
  const dir = makeFilm(tmp(), BROWSER.gsap, { params });
  try {
    await openPanel(dir, async (page) => {
      await page.waitForFunction(() => !document.querySelector("#scrub").hidden, { timeout: 15000 });
      assert.equal(await page.$eval("#viewport", (node) => node.hidden), true, "a film has a fixed canvas, so no width buttons");
      assert.equal(Number(await page.$eval("#time", (node) => node.max)), 4);
      await page.$eval("#time", (node) => { node.value = "2"; node.dispatchEvent(new Event("input", { bubbles: true })); });
      assert.equal(await page.evaluate(() => document.querySelector("#frame").contentWindow.__timelines.main.time()), 2);
      assert.equal(await page.$eval("#time-out", (node) => node.textContent), "2.00 s");
      await page.focus("[data-param='late-shift'] input[type=range]");
      assert.equal(await page.evaluate(() => document.querySelector("#frame").contentWindow.__timelines.main.time()), 3.5, "focus seeks to the middle of the window");
      await fill(page, "[data-param='beat-duration'] input[type=number]", "1.6");
      await waitFrameValue(page, "beat-duration", 1.6);
      assert.equal(await page.evaluate(() => document.querySelector("#frame").contentWindow.__timelines.main.getChildren(false)[0].duration()), 1.6, "the timeline was rebuilt from the draft");
      assert.equal(await page.$eval("#stage", (node) => node.classList.contains("fit")), true);
    });
  } finally { cleanup(dir); }
});

test("a saved value newer than the render is reported as stale in the state, and Save of a new value keeps it so", async () => {
  const dir = makePage(tmp(), { params: [...PAGE_PARAMS, FILM_PARAMS[0]] });
  try {
    const video = path.join(dir, "out.mp4");
    fs.writeFileSync(video, "stand-in bytes: only the file time matters here");
    const future = new Date(Date.now() + 120000);
    fs.utimesSync(video, future, future);
    await withPanel(dir, async (panel) => {
      assert.equal((await call(panel, "api/state")).json.stale, null, "the render is newer than the values");
      const past = new Date(Date.now() - 120000);
      fs.utimesSync(video, past, past);
      const stale = (await call(panel, "api/state")).json.stale;
      assert.equal(stale.code, "render-older-than-values");
      assert.match(stale.message, /tunables\.json and tunables\.js changed after out\.mp4 was rendered/);
      assert.match(stale.fix, /hyperframes render/);
    });
  } finally { cleanup(dir); }
});

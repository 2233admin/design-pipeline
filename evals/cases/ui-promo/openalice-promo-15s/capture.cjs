#!/usr/bin/env node
"use strict";

// Capture the OpenAlice demo UI for this case:
//   OPENALICE_DIR=<OpenAlice checkout> node evals/cases/ui-promo/openalice-promo-15s/capture.cjs
// OpenAlice (TraderAlice/OpenAlice) is AGPL-3.0. Its interface, logo and demo data are captured
// locally from a checkout at the pinned commit into assets/captures/, which is git-ignored:
// nothing from OpenAlice is committed to this repository. The UI runs in its own demo mode
// (MSW-mocked backend), so no account, key or network service is involved.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { launch, openPaused, recordFrames, recordStopMotion, serveStatic, useVirtualAnimationClock } = require("../../capture-core.cjs");

const SOURCE = {
  repo: "TraderAlice/OpenAlice",
  checkout: "2233admin/OpenAlice (fork)",
  commit: "dc193d9fc856b57c793be0179c82a04bbaba1797",
  license: "AGPL-3.0",
  mode: "ui demo mode (vite --mode demo)",
};
// The same words the demo workspace's recorded agent session answers, so the question carries.
const QUESTION = "hey, what jumped out from Apple's Q1 earnings?";

const caseDir = __dirname;
const out = path.join(caseDir, "assets", "captures");
const checkout = process.env.OPENALICE_DIR;

function fail(message) {
  console.error(`capture: ${message}`);
  process.exit(1);
}

async function main() {
  if (!checkout) fail("set OPENALICE_DIR to an OpenAlice checkout (git clone https://github.com/TraderAlice/OpenAlice, then pnpm install)");
  const head = spawnSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).stdout.trim();
  if (head !== SOURCE.commit) fail(`${checkout} is at ${head || "no commit"}; check out ${SOURCE.commit} so the capture matches the approved golden`);
  const vite = path.join(checkout, "ui", "node_modules", "vite", "bin", "vite.js");
  if (!fs.existsSync(vite)) fail(`${vite} is missing; run pnpm install in the checkout`);

  const build = path.join(caseDir, "..", "..", ".work", `openalice-demo-${SOURCE.commit.slice(0, 8)}`);
  const built = spawnSync(process.execPath, [vite, "build", "--mode", "demo", "--outDir", build, "--emptyOutDir", "--logLevel", "error"], { cwd: path.join(checkout, "ui"), encoding: "utf8", windowsHide: true });
  if (built.status !== 0) fail(`demo build failed: ${built.stderr}`);
  fs.mkdirSync(out, { recursive: true });

  const { server, origin } = await serveStatic(build);
  const browser = await launch();
  try {
    // A fresh tab per section: a tab whose clock was paused cannot navigate again.
    const tab = async () => { const next = await browser.newPage(); await next.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); return next; };
    let page = await tab();

    // Ask Alice, stop-motion: 0.5 s still, then one character per frame (33 ms, close to the
    // replay's 30 ms), written through the textarea's value so React renders it as typed. The
    // caret is held steady (caret-animation: manual) so it does not flicker between frames.
    await page.goto(`${origin}/`, { waitUntil: "load" });
    await page.waitForSelector("textarea");
    await page.addStyleTag({ content: "textarea { caret-animation: manual; }" });
    await page.click("textarea");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const typeFrom = 15;
    await recordStopMotion(page, {
      file: path.join(out, "ask.mp4"), frames: typeFrom + QUESTION.length + 18,
      setFrame: (index) => page.evaluate((text) => {
        const box = document.querySelector("textarea");
        if (box.value === text) return;
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(box, text);
        box.dispatchEvent(new Event("input", { bubbles: true }));
      }, QUESTION.slice(0, Math.max(0, index - typeFrom + 1))),
    });

    // The demo workspace's recorded session: the agent reads the filing, finds the deceleration,
    // writes the report and pushes it to the Inbox. The first playback runs in real time; the
    // recording restarts it with its own "Replay again" button once the page clock is stopped.
    const replayButton = () => [...document.querySelectorAll("button")].find((button) => /Replay again/.test(button.textContent));
    page = await tab();
    await useVirtualAnimationClock(page);
    let client = await openPaused(page, `${origin}/workspaces/demo-ws/s/demo-session`, { settleMs: 300, ready: replayButton });
    await page.evaluate((finder) => new Function(`return (${finder})()`)().click(), replayButton.toString());
    await recordFrames(page, client, { file: path.join(out, "terminal.mp4"), durationSec: 17 });

    // Stills: the Inbox report the session pushed, and the portfolio it bears on. The portfolio is
    // captured 1400 px tall so its positions table (near the bottom at 1080) has room around it
    // when the camera frames a single row.
    for (const [route, name, height] of [["/inbox", "inbox.png", 1080], ["/portfolio", "portfolio.png", 1400]]) {
      page = await tab();
      await page.setViewport({ width: 1920, height, deviceScaleFactor: 1 });
      await page.goto(`${origin}${route}`, { waitUntil: "load" });
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await page.screenshot({ path: path.join(out, name), clip: { x: 0, y: 0, width: 1920, height, scale: 2 } });
    }
  } finally {
    await browser.close();
    server.close();
  }
  fs.copyFileSync(path.join(checkout, "docs", "images", "alice-full.png"), path.join(out, "alice-full.png"));

  const files = Object.fromEntries(fs.readdirSync(out).filter((name) => !name.endsWith(".json")).sort().map((name) => [name, crypto.createHash("sha256").update(fs.readFileSync(path.join(out, name))).digest("hex")]));
  fs.writeFileSync(path.join(out, "capture.json"), `${JSON.stringify({ source: SOURCE, question: QUESTION, files }, null, 2)}\n`);
  console.log(`captured ${Object.keys(files).length} files into ${path.relative(process.cwd(), out)}`);
}

main().catch((error) => fail(error.stack || error.message));

#!/usr/bin/env node
"use strict";

// Kernel for `art-motion render`: renders one Art Motion scene or grammar spec through
// tools/art-motion/render.cjs into a new directory (PNG stills, or a video with its first and last
// frames) plus render-report.json. Paths stay inside --root, which defaults to the working
// directory the CLI sets. Success prints one JSON result; failure prints the message and exits 1.

const { render } = require("../tools/art-motion/render.cjs");
const { fail, jsonResult } = require("./contract-utils.cjs");

const OPTIONS = { "--root": "root", "--spec": "spec", "--output": "output", "--stills": "stills", "--chrome": "chrome", "--puppeteer-module": "puppeteerModule", "--ffmpeg": "ffmpeg", "--ffprobe": "ffprobe" };

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!Object.hasOwn(OPTIONS, name)) fail("art-motion render", `unknown option ${name}; allowed: ${Object.keys(OPTIONS).join(", ")}`);
    if (value === undefined || value.startsWith("--")) fail("art-motion render", `${name} requires a value`);
    if (Object.hasOwn(options, OPTIONS[name])) fail("art-motion render", `${name} may be provided only once`);
    // Comma-separated seconds; an empty entry stays NaN so render() rejects it rather than reading 0.
    options[OPTIONS[name]] = name === "--stills" ? value.split(",").map((part) => (part.trim() ? Number(part) : Number.NaN)) : value;
  }
  for (const name of ["--spec", "--output"]) if (!options[OPTIONS[name]]) fail("art-motion render", `${name} is required`);
  return options;
}

(async () => {
  try {
    const { root = process.cwd(), ...options } = parseArgs(process.argv.slice(2));
    const result = await render(root, options);
    process.stdout.write(`${JSON.stringify(jsonResult(true, { status: "rendered", ...result }))}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
})();

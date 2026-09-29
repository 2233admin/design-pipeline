#!/usr/bin/env node
"use strict";

// Generate this case's character art with ChatGPT image generation through the Codex CLI:
//   OPENALICE_DIR=<OpenAlice checkout> node evals/cases/mad/openalice-mad-90s/generate.cjs [--only name,name]
// Image generation is not reproducible, so the approved files are kept and recorded in
// assets/generated/generated.json (prompt, references, tool version, sha256). Variants are edits
// of the hero illustration, so the character stays the same drawing when her face changes.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const out = path.join(__dirname, "assets", "generated");
const STYLE = "Vocaloid music-video character illustration: flat cel shading, crisp clean line art, limited palette (golden blonde hair, white and royal blue outfit, navy accents), soft rim light. Transparent background. No text, no letters, no logos, no watermark, no signature.";
const CHARACTER = "the girl in the attached references: very long golden blonde twin tails, a large royal blue bow on top of her head, violet eyes, white blouse with navy frills and blue bows";
const KEEP = "Edit the attached illustration. Keep the character, pose, outfit, hair, framing, line art, colours and canvas size exactly the same, with the transparent background. Change only:";

const ASSETS = [
  { name: "hero", refs: ["pixel", "cutout"], prompt: `Draw ${CHARACTER}. Upper body down to mid-thigh, body turned slightly to her left, facing the viewer, one hand raised beside her cheek in a playful peace sign, confident closed-mouth smile, hair and bow flowing as if in a light wind. Portrait orientation. ${STYLE}` },
  { name: "blink", refs: ["hero"], prompt: `${KEEP} her eyes are gently closed in a blink.` },
  { name: "sing", refs: ["hero"], prompt: `${KEEP} her mouth is open wide as if singing a high note, eyes bright.` },
  { name: "wink", refs: ["hero"], prompt: `${KEEP} she winks with her right eye and shows a small playful smile.` },
  { name: "serious", refs: ["hero"], prompt: `${KEEP} her expression is focused and serious, eyes looking sharply to the viewer's left, mouth closed.` },
  { name: "point", refs: ["hero"], prompt: `Draw ${CHARACTER}, in the same drawing style and outfit as the attached illustration. Upper body, leaning toward the viewer, pointing straight at the viewer with her index finger, determined smile. Portrait orientation. ${STYLE}` },
  { name: "face", refs: ["hero"], prompt: `Draw an extreme close-up of the face of ${CHARACTER}, the same drawing style as the attached illustration: her eyes and nose fill the frame, part of the bow at the top edge, looking straight at the viewer. Square. ${STYLE}` },
];

function fail(message) {
  console.error(`generate: ${message}`);
  process.exit(1);
}

// Call the Codex CLI's JS entry directly: on Windows the npm shim needs a shell, which splits the
// prompt. CODEX_JS overrides the default npm global location.
const CODEX_JS = process.env.CODEX_JS || path.join(process.env.APPDATA || "", "npm", "node_modules", "@openai", "codex", "bin", "codex.js");
function codex(args, options = {}) {
  if (!fs.existsSync(CODEX_JS)) fail(`Codex CLI not found at ${CODEX_JS}; install @openai/codex or set CODEX_JS`);
  return spawnSync(process.execPath, [CODEX_JS, ...args], { encoding: "utf8", maxBuffer: 64 << 20, ...options });
}
function codexVersion() {
  return codex(["--version"]).stdout.trim();
}

function refPath(ref) {
  if (ref === "pixel") {
    if (!process.env.OPENALICE_DIR) fail("set OPENALICE_DIR to an OpenAlice checkout (the pixel-art mascot is the character reference)");
    return path.join(process.env.OPENALICE_DIR, "docs", "images", "alice-full.png");
  }
  return path.join(out, `${ref}.png`);
}

function generate(asset) {
  const refs = asset.refs.map(refPath);
  for (const ref of refs) if (!fs.existsSync(ref)) fail(`${asset.name} needs ${ref}`);
  const prompt = `Use your image generation tool. ${asset.prompt} Only report the generated file path.`;
  const result = codex(["exec", "--skip-git-repo-check", prompt, "-i", ...refs], { timeout: 900000 });
  // Codex prints the file it saved under ~/.codex/generated_images, with or without a label.
  const saved = `${result.stdout}\n${result.stderr}`.split(/[\s`'"]+/).filter((token) => token.includes("generated_images") && token.endsWith(".png")).pop();
  if (!saved || !fs.existsSync(saved)) fail(`${asset.name}: no generated image in codex output: ${String(result.stdout).slice(-400)}`);
  const file = path.join(out, `${asset.name}.png`);
  fs.copyFileSync(saved, file);
  return { name: asset.name, file: path.basename(file), prompt: asset.prompt, refs: asset.refs, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex") };
}

function main() {
  fs.mkdirSync(out, { recursive: true });
  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1].split(",") : null;
  const manifestFile = path.join(out, "generated.json");
  const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, "utf8")) : { tool: codexVersion(), images: {} };
  if (!fs.existsSync(path.join(out, "cutout.png")) && ASSETS.some((asset) => asset.refs.includes("cutout"))) fail("assets/generated/cutout.png (the first full-body cut-out) is missing");
  for (const asset of ASSETS.filter((entry) => !only || only.includes(entry.name))) {
    const record = generate(asset);
    manifest.images[asset.name] = record;
    fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`generated ${record.file} ${record.sha256.slice(0, 12)}`);
  }
}

main();

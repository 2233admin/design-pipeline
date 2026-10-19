"use strict";

// The one copyable command per missing external tool. `doctor` prints these and the errors raised
// when a task first needs the tool name the same command. Nothing here installs anything.

const COMMANDS = {
  // Preferred by the shared browser resolver (browser-locate.cjs): a pinned chrome-headless-shell.
  browser: { all: "npx hyperframes browser ensure" },
  ffmpeg: { darwin: "brew install ffmpeg", win32: "winget install Gyan.FFmpeg", linux: "sudo apt install ffmpeg" },
  blender: { darwin: "brew install --cask blender", win32: "winget install BlenderFoundation.Blender", linux: "sudo snap install blender --classic" },
};

function installCommand(tool, platform = process.platform) {
  const entry = COMMANDS[tool];
  if (!entry) throw new Error(`no install command for ${tool}`);
  return entry.all || entry[platform] || entry.linux;
}

// `designer-pipeline sources fetch` as a command that runs from any directory.
function fetchCommand(cliPath, bundle) {
  return `node ${/\s/.test(cliPath) ? `"${cliPath}"` : cliPath} sources fetch ${bundle ? `--bundle ${bundle}` : "--all"}`;
}

module.exports = { fetchCommand, installCommand };

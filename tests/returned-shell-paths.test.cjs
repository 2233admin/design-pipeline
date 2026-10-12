"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { shellPath } = require("../skill/scripts/workflows/shared.cjs");

for (const name of ["$(x)", "back`tick", "%PATH%", "!x!", 'a"b', "a\nb", "a\rb", "a\tb", "a\u0000b", "a\u007fb", "a\u0085b"]) {
  test(`win32 rejects unsafe returned shell path ${JSON.stringify(name)}`, () => {
    const file = `C:/project ${name}/file.json`;
    assert.throws(() => shellPath(file, "win32"), error => {
      assert.equal(error.code, "CONTRACT_INVALID");
      assert.ok(error.message.includes(file), error.message);
      assert.match(error.message, /move or rename/i);
      assert.match(error.message, /project.*installation/i);
      return true;
    });
  });
}

test("win32 allows normal paths containing spaces", () => {
  assert.equal(shellPath("C:/normal project/file.json", "win32"), '"C:/normal project/file.json"');
  assert.equal(shellPath("C:/normal-project/file.json", "win32"), "C:/normal-project/file.json");
});

test("POSIX retains existing quoting and escaping", () => {
  assert.equal(shellPath('/project $(x)/a"b`c', "linux"), '"/project \\$(x)/a\\"b\\`c"');
  assert.equal(shellPath("/project/%PATH%", "linux"), "/project/%PATH%");
  assert.equal(shellPath("/project/!x!", "linux"), '"/project/!x!"');
});

test("unsafe installation imports successfully and fails only during Windows command generation", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "shell install "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, "unsafe %PATH% !x! $(x)", "scripts");
  fs.mkdirSync(path.join(scripts, "workflows"), { recursive: true });
  fs.copyFileSync(path.join(__dirname, "../skill/scripts/workflows/shared.cjs"), path.join(scripts, "workflows/shared.cjs"));
  fs.copyFileSync(path.join(__dirname, "../skill/scripts/contract-utils.cjs"), path.join(scripts, "contract-utils.cjs"));
  const imported = require(path.join(scripts, "workflows/shared.cjs"));
  assert.throws(() => imported.cliCommand(undefined, "win32"), error => {
    assert.equal(error.code, "CONTRACT_INVALID");
    assert.ok(error.message.includes(path.join(scripts, "designer-pipeline.cjs")), error.message);
    assert.match(error.message, /move or rename/i);
    return true;
  });
  assert.match(imported.cliCommand(undefined, "linux"), /^node /);
});

test("normal spaced installation generates a command that runs from unrelated cwd", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "normal install "));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, "scripts");
  const elsewhere = path.join(root, "elsewhere");
  fs.mkdirSync(path.join(scripts, "workflows"), { recursive: true });
  fs.mkdirSync(elsewhere);
  fs.copyFileSync(path.join(__dirname, "../skill/scripts/workflows/shared.cjs"), path.join(scripts, "workflows/shared.cjs"));
  fs.copyFileSync(path.join(__dirname, "../skill/scripts/contract-utils.cjs"), path.join(scripts, "contract-utils.cjs"));
  fs.writeFileSync(path.join(scripts, "designer-pipeline.cjs"), 'process.stdout.write("installed-command-ran");\n');
  const { cliCommand } = require(path.join(scripts, "workflows/shared.cjs"));
  const run = spawnSync(cliCommand(), { shell: true, cwd: elsewhere, encoding: "utf8", windowsHide: true });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.equal(run.stdout, "installed-command-ran");
});

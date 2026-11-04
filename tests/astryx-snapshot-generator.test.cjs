"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { buildSnapshot, readTarball, SnapshotError } = require("../scripts/generate-astryx-snapshot.cjs");
const { normalizeSnapshot, validateSnapshot } = require("../skill/scripts/design-system-catalog-core.cjs");
const { projectDesignSystemTokens } = require("../skill/scripts/design-system-decision-core.cjs");

const generator = path.join(__dirname, "../scripts/generate-astryx-snapshot.cjs");
const REVISION = "a".repeat(40);

// Minimal ustar writer: [name, text] entries, or [name, text, type] for links and other members.
function tarball(entries) {
  const blocks = [];
  for (const [name, text = "", type = "0"] of entries) {
    const body = Buffer.from(text, "utf8");
    const header = Buffer.alloc(512);
    header.write(name, 0, 100, "utf8");
    header.write("0000644\0", 100);
    header.write("0000000\0", 108);
    header.write("0000000\0", 116);
    header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124);
    header.write("00000000000\0", 136);
    header.write("        ", 148);
    header.write(type, 156);
    if (type === "2") header.write("../../outside", 157);
    header.write("ustar\0", 257);
    header.write("00", 263);
    const sum = header.reduce((total, byte) => total + byte, 0);
    header.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148);
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return zlib.gzipSync(Buffer.concat(blocks));
}

const BUTTON_DOC = `// Copyright (c) Meta Platforms, Inc. and affiliates.
const anatomy = [{name: 'Label', required: true, description: 'Visible text.'}];

export const docs = {
  name: 'Button',
  displayName: 'Button',
  group: 'Button',
  category: 'Action',
  keywords: ['button', 'cta'],
  usage: {
    description: 'Button triggers an action.',
    anatomy,
  },
  props: [
    {name: 'label', type: 'string', description: 'Accessible label.', required: true},
    {name: 'size', type: "'sm' | 'md'", description: 'Size.', default: "'md'"},
  ],
  playground: {defaults: {label: \`Save \${'changes'}\`, ratio: 16 / 9, onPress: undefined}},
};

export const docsZh = {
  usage: {description: '按钮触发一个操作。'},
  props: [{name: 'label', description: '无障碍标签。'}],
};

export const docsDense = {
  description: 'Action trigger.',
  propDescriptions: {label: 'a11y label'},
};
`;

function corePackage(overrides = {}) {
  return {
    "package/package.json": JSON.stringify({ name: "@astryxdesign/core", version: "1.2.3", license: "MIT", peerDependencies: { react: ">=19.0.0", "react-dom": ">=19.0.0", "@stylexjs/stylex": "^0.19.0" } }),
    "package/src/Button/Button.tsx": "export function Button() {}\n",
    "package/src/Button/Button.doc.mjs": BUTTON_DOC,
    "package/src/Secret/Secret.tsx": "export function Secret() {}\n",
    "package/src/Secret/Secret.doc.mjs": "export const docs = {name: 'Secret', hidden: true};\n",
    "package/src/hooks/useThing.doc.mjs": "export const docs = {name: 'useThing', category: 'state', params: [{name: 'value', type: 'string', description: 'Value.'}]};\nexport const docsDense = {paramDescriptions: {value: 'v'}};\n",
    ...overrides,
  };
}

function cliPackage(overrides = {}) {
  return {
    "package/package.json": JSON.stringify({ name: "@astryxdesign/cli", version: "1.2.3", license: "MIT" }),
    "package/LICENSE": "MIT License\n\nCopyright (c) 2026 Meta Platforms, Inc.\n\nPermission is hereby granted...\n",
    "package/assets/docs/color.doc.mjs": "export const docs = {name: 'color', title: 'Color', description: 'Color guidance.', sections: [{title: 'Palette', content: [{type: 'token-ref', topic: 'tokens', section: 'Color Tokens'}]}]};\n",
    "package/assets/docs/tree/tokens.doc.mjs": "export const docs = {type: 'namespace', name: 'tokens', title: 'All Tokens', summary: 'Every token.'};\n",
    "package/assets/docs/tree/tokens-color.doc.mjs": "export const docs = {type: 'generic', name: 'tokens-color', title: 'Color Tokens', placement: {parent: 'namespace:tokens'}, sections: [{title: 'Color Tokens', content: [{type: 'prose', text: 'Semantic colors.'}, {type: 'table', headers: ['Token', 'Light', 'Dark'], rows: [['--color-accent', '#0064E0', '#2694FE']]}]}]};\n",
    "package/assets/docs/tree/tokens-color.doc.zh.mjs": "export const docsZh = {sections: [{section: 'Color Tokens', title: '颜色令牌', content: [{type: 'prose', text: '语义颜色。'}]}]};\n",
    "package/assets/docs/tree/tokens-spacing.doc.mjs": "export const docs = {type: 'generic', name: 'tokens-spacing', title: 'Spacing', placement: {parent: 'namespace:tokens'}, sections: [{title: 'Spacing', content: [{type: 'table', headers: ['Token', 'Value'], rows: [['--spacing-4', '1rem']]}]}]};\n",
    "package/assets/docs/tree/template-grading-rubric.doc.mjs": "export const RUBRIC = Object.freeze({version: '1'});\nexport const docs = {name: 'template-grading-rubric', description: `Rubric ${RUBRIC.version}`};\n",
    "package/assets/templates/pages/hero/page.tsx": "export default function Page() {}\n",
    "package/assets/templates/pages/hero/template.doc.mjs": "export const doc = {type: 'page', name: 'Hero', description: 'A hero page.', isReady: true, category: 'Landing'};\n",
    "package/assets/templates/blocks/components/Button/ButtonDemo.tsx": "export default function Demo() {}\n",
    "package/assets/templates/blocks/components/Button/ButtonDemo.doc.mjs": "export const doc = {type: 'block', name: 'Button demo', description: 'Buttons.', componentsUsed: ['Button']};\n",
    ...overrides,
  };
}

function fixture(t, { core = {}, cli = {}, coreEntries, cliEntries } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "design-pipeline-astryx-generator-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (name, files, entries) => {
    const file = path.join(dir, name);
    fs.writeFileSync(file, tarball(entries || Object.entries(files).filter(([, text]) => text !== null)));
    return file;
  };
  return { dir, coreTarball: write("core.tgz", corePackage(core), coreEntries), cliTarball: write("cli.tgz", cliPackage(cli), cliEntries) };
}

test("builds a valid snapshot from literal doc data, with lenses, token tables and templates", (t) => {
  const { coreTarball, cliTarball } = fixture(t);
  const snapshot = buildSnapshot({ coreTarball, cliTarball, revision: REVISION });
  assert.equal(validateSnapshot(snapshot), snapshot);
  assert.equal(snapshot.provenance.version, "1.2.3");
  assert.equal(snapshot.provenance.revision, REVISION);
  assert.deepEqual(snapshot.provenance.runtime, { react: ">=19", "react-dom": ">=19", stylex: "^0.19", "@stylexjs/stylex": "^0.19" });
  assert.match(snapshot.provenance.integrity["@astryxdesign/core"], /^sha512-/);

  assert.deepEqual(snapshot.components.map(({ id }) => id), ["Button"], "hidden components stay out");
  const [button] = snapshot.components;
  assert.equal(button.category, "Action");
  assert.equal(button.package, "@astryxdesign/core");
  assert.deepEqual(button.usage.anatomy, [{ name: "Label", required: true, description: "Visible text." }]);
  assert.deepEqual(button.playground.defaults, { label: "Save changes", ratio: 16 / 9 }, "undefined members drop out as in JSON");
  assert.equal(button.docsZh.usage.description, "按钮触发一个操作。");
  assert.deepEqual(button.docsZh.usage.anatomy, button.usage.anatomy, "a lens without anatomy keeps the authored anatomy");
  assert.equal(button.docsZh.props[0].description, "无障碍标签。");
  assert.equal(button.docsZh.props[0].type, "string");
  assert.equal(button.docsDense.usage.description, "Action trigger.");
  assert.equal(button.docsDense.props[0].description, "a11y label");

  const [hook] = snapshot.hooks;
  assert.equal(hook.category, "state", "the doc's own category wins over the discovery group, as in the CLI list");
  assert.equal(hook.docsDense.params[0].description, "v");
  assert.equal(hook.docsZh, undefined, "a missing lens is not stored as a copy");

  assert.equal(snapshot.docs.some(({ id }) => id === "template-grading-rubric"), false, "computed CLI topics are skipped");
  const color = snapshot.docs.find(({ id }) => id === "color");
  assert.equal(color.sections[0].content[1].type, "table", "token-ref is inlined from the guide under the namespace");
  const tokens = snapshot.docs.find(({ id }) => id === "tokens");
  assert.deepEqual(tokens.theme.tokens, { "--color-accent": ["#0064E0", "#2694FE"], "--spacing-4": "1rem" });
  assert.equal(snapshot.docs.find(({ id }) => id === "tokens-color").docsZh.sections[0].title, "颜色令牌");

  assert.deepEqual(snapshot.templates.map(({ id, type, category, componentsUsed }) => [id, type, category, componentsUsed]), [
    ["ButtonDemo", "block", "components/Button", ["Button"]],
    ["hero", "page", "Landing", undefined],
  ]);
  assert.equal(projectDesignSystemTokens(normalizeSnapshot(snapshot)).status, "ready");
});

test("a non-literal value in a doc fails the run with its file and line, and writes nothing", (t) => {
  const { dir, coreTarball, cliTarball } = fixture(t, { core: { "package/src/Button/Button.doc.mjs": BUTTON_DOC.replace("keywords: ['button', 'cta'],", "keywords: makeKeywords(),") } });
  assert.throws(() => buildSnapshot({ coreTarball, cliTarball, revision: REVISION }), (error) => error instanceof SnapshotError && /src\/Button\/Button\.doc\.mjs:9: CallExpression is not a literal value/.test(error.message));
  const out = path.join(dir, "snapshot.json");
  const child = spawnSync(process.execPath, [generator, "--core", coreTarball, "--cli", cliTarball, "--revision", REVISION, "--out", out], { encoding: "utf8" });
  assert.equal(child.status, 1);
  assert.match(child.stderr, /CallExpression is not a literal value/);
  assert.equal(fs.existsSync(out), false);
});

test("doc modules are parsed, never run: any top-level statement besides import, const and export is refused", (t) => {
  const marker = path.join(os.tmpdir(), `astryx-generator-ran-${process.pid}`);
  const refuse = (source, pattern) => {
    const site = fixture(t, { core: { "package/src/Button/Button.doc.mjs": source } });
    assert.throws(() => buildSnapshot({ coreTarball: site.coreTarball, cliTarball: site.cliTarball, revision: REVISION }), (error) => error instanceof SnapshotError && pattern.test(error.message), source.slice(0, 80));
  };
  refuse(`import fs from 'node:fs';\nfs.writeFileSync(${JSON.stringify(marker)}, 'ran');\n${BUTTON_DOC}`, /Button\.doc\.mjs:2: top-level ExpressionStatement is not allowed/);
  refuse(`globalThis.__astryxDocRan = true;\n${BUTTON_DOC}`, /Button\.doc\.mjs:1: top-level ExpressionStatement/);
  refuse(`let label = 'safe';\nlabel = process.env.HOME;\n${BUTTON_DOC}`, /Button\.doc\.mjs:1: top-level let declaration/);
  refuse(`var label = 'safe';\n${BUTTON_DOC}`, /Button\.doc\.mjs:1: top-level var declaration/);
  refuse(`${BUTTON_DOC}\nanatomy.push({name: 'Injected', description: process.env.HOME});\n`, /top-level ExpressionStatement/);
  refuse(`${BUTTON_DOC}\ndocs.description = require('node:child_process').execSync('id').toString();\n`, /top-level ExpressionStatement/);
  refuse(`${BUTTON_DOC.replace("export const docs", "const docs")}\nexport {docs};\n`, /top-level export list/);
  refuse(`${BUTTON_DOC}\nif (true) { anatomy.length = 0; }\n`, /top-level IfStatement/);
  refuse(`${BUTTON_DOC}\nfunction later() {}\n`, /top-level FunctionDeclaration/);
  assert.equal(fs.existsSync(marker), false);
  assert.equal(globalThis.__astryxDocRan, undefined);

  // An import is allowed as a statement, but its binding is not data.
  const imported = fixture(t, { core: { "package/src/Button/Button.doc.mjs": `import {sharedProps} from './shared.mjs';\n${BUTTON_DOC.replace("props: [", "props: [...sharedProps, ")}` } });
  assert.throws(() => buildSnapshot({ coreTarball: imported.coreTarball, cliTarball: imported.cliTarball, revision: REVISION }), /sharedProps is not a top-level constant of this file/);
  const awaited = fixture(t, { cli: { "package/assets/docs/tree/quick-start.doc.mjs": "export const docs = {name: 'quick-start', sections: await load()};\n" } });
  assert.throws(() => buildSnapshot({ coreTarball: awaited.coreTarball, cliTarball: awaited.cliTarball, revision: REVISION }), /quick-start\.doc\.mjs:1: AwaitExpression is not a literal value/);
});

test("tarball members that leave the package are refused and links are ignored", (t) => {
  const escaping = fixture(t, { coreEntries: [...Object.entries(corePackage()), ["package/../../evil.doc.mjs", "export const docs = {};\n"]] });
  assert.throws(() => readTarball(escaping.coreTarball), /refusing tar member "package\/\.\.\/\.\.\/evil\.doc\.mjs"/);
  const linked = fixture(t, { coreEntries: [...Object.entries(corePackage()), ["package/src/Link/Link.doc.mjs", "", "2"]] });
  assert.equal(readTarball(linked.coreTarball).has("src/Link/Link.doc.mjs"), false);
});

test("mismatched releases, packages or licenses are rejected", (t) => {
  const skewed = fixture(t, { cli: { "package/package.json": JSON.stringify({ name: "@astryxdesign/cli", version: "1.2.4", license: "MIT" }) } });
  assert.throws(() => buildSnapshot({ coreTarball: skewed.coreTarball, cliTarball: skewed.cliTarball, revision: REVISION }), /core 1\.2\.3 and cli 1\.2\.4 are not the same release/);
  const swapped = fixture(t);
  assert.throws(() => buildSnapshot({ coreTarball: swapped.cliTarball, cliTarball: swapped.coreTarball, revision: REVISION }), /--core is @astryxdesign\/cli/);
  const relicensed = fixture(t, { cli: { "package/LICENSE": "Apache License 2.0\n" } });
  assert.throws(() => buildSnapshot({ coreTarball: relicensed.coreTarball, cliTarball: relicensed.cliTarball, revision: REVISION }), /LICENSE is not the reviewed MIT license/);
  const declared = fixture(t, { core: { "package/package.json": JSON.stringify({ name: "@astryxdesign/core", version: "1.2.3", license: "BUSL-1.1" }) } });
  assert.throws(() => buildSnapshot({ coreTarball: declared.coreTarball, cliTarball: declared.cliTarball, revision: REVISION }), /license is BUSL-1\.1, not MIT/);
  assert.throws(() => buildSnapshot({ coreTarball: swapped.coreTarball, cliTarball: swapped.cliTarball, revision: "v1.2.3" }), /--revision must be the 40-hex commit/);
});

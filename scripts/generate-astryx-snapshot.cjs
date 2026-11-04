#!/usr/bin/env node
"use strict";

// node scripts/generate-astryx-snapshot.cjs --core <core.tgz> --cli <cli.tgz> --revision <sha>
//   [--out skill/references/astryx-design-system-snapshot.json] [--reviewed-at YYYY-MM-DD]
//
// Builds the bundled Astryx design-system snapshot from the published @astryxdesign/core and
// @astryxdesign/cli npm tarballs without executing any of their code. The tarballs are read in
// memory (no extraction), every `*.doc.mjs` is parsed with @babel/parser, and only literal values
// are evaluated: objects, arrays, strings, numbers, booleans, null, `undefined`, template literals
// and arithmetic over them, and references to other literal top-level constants of the same file.
// Anything else (calls, functions, imports, await) fails the run, except in the CLI topics listed
// in COMPUTED_TOPICS, which the CLI builds at runtime and the snapshot leaves out.
//
// The projection follows `astryx component|hook list --detail full`, `astryx docs` and
// `astryx template list` (discovery rules, `docsZh`/`docsDense` lens overlays, token-ref
// inlining); the rules are restated here, not imported. sources:update runs this as the importer of
// the `astryx` lock entry with tarballs fetched by `npm pack --ignore-scripts`.

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const CORE_PACKAGE = "@astryxdesign/core";
const CLI_PACKAGE = "@astryxdesign/cli";
const REPOSITORY = "https://github.com/facebook/astryx";
const DEFAULT_OUT = path.resolve(__dirname, "../skill/references/astryx-design-system-snapshot.json");

// CLI reference topics whose content is computed by CLI code at runtime (authoring self-docs, the
// template grading rubric). They hold no design-system data and cannot be read statically.
const COMPUTED_TOPICS = new Set(["field-reference", "icon-set-files", "grade-template-with-agent", "template-grading-rubric"]);

class SnapshotError extends Error {}

function fail(message) {
  throw new SnapshotError(message);
}

// ---------------------------------------------------------------------------------------------
// Tarball reading (ustar + pax/GNU long names), in memory. Only regular files are kept; links and
// paths that leave the package are rejected.

function readTarball(file) {
  const bytes = zlib.gunzipSync(fs.readFileSync(file), { maxOutputLength: 512 * 1024 * 1024 });
  const files = new Map();
  let offset = 0;
  let longName = null;
  let paxPath = null;
  const text = (start, length) => {
    const slice = bytes.subarray(start, start + length);
    const end = slice.indexOf(0);
    return slice.subarray(0, end < 0 ? slice.length : end).toString("utf8");
  };
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const size = parseInt(text(offset + 124, 12).trim() || "0", 8);
    if (!Number.isFinite(size) || size < 0) fail(`${path.basename(file)}: invalid tar header at ${offset}`);
    const type = String.fromCharCode(header[156] || 48);
    const prefix = text(offset + 345, 155);
    let name = text(offset, 100);
    if (prefix) name = `${prefix}/${name}`;
    const body = bytes.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === "x") {
      for (const record of body.toString("utf8").split("\n")) {
        const match = record.match(/^\d+ path=(.*)$/);
        if (match) paxPath = match[1];
      }
      continue;
    }
    if (type === "g") continue;
    if (type === "L") {
      longName = body.toString("utf8").replace(/\0+$/, "");
      continue;
    }
    name = paxPath || longName || name;
    paxPath = null;
    longName = null;
    if (type !== "0" && type !== "\0" && type !== "7") continue;
    const parts = name.split("/").filter(Boolean);
    if (parts.length < 2 || name.startsWith("/") || parts.includes("..") || name.includes("\\")) fail(`${path.basename(file)}: refusing tar member ${JSON.stringify(name)}`);
    files.set(parts.slice(1).join("/"), Buffer.from(body));
  }
  return files;
}

// A read-only directory view over the tarball's file map.
function packageView(files, label) {
  const dirs = new Map([["", new Set()]]);
  for (const file of files.keys()) {
    const parts = file.split("/");
    for (let index = 0; index < parts.length; index += 1) {
      const parent = parts.slice(0, index).join("/");
      const child = parts.slice(0, index + 1).join("/");
      if (!dirs.has(parent)) dirs.set(parent, new Set());
      dirs.get(parent).add(parts[index]);
      if (index < parts.length - 1 && !dirs.has(child)) dirs.set(child, new Set());
    }
  }
  const join = (...parts) => parts.filter((part) => part !== "").join("/");
  return {
    label,
    join,
    isFile: (file) => files.has(file),
    isDir: (dir) => dirs.has(dir),
    exists: (file) => files.has(file) || dirs.has(file),
    // libuv returns directory entries sorted by byte order; the CLI's discovery order depends on it.
    list: (dir) => [...(dirs.get(dir) || [])].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map((name) => ({ name, isDir: dirs.has(join(dir, name)) && !files.has(join(dir, name)) })),
    read: (file) => {
      if (!files.has(file)) fail(`${label} has no ${file}`);
      return files.get(file).toString("utf8");
    },
    json: (file) => JSON.parse(files.get(file)?.toString("utf8") ?? fail(`${label} has no ${file}`)),
  };
}

// ---------------------------------------------------------------------------------------------
// Static evaluation of doc modules.

let babelParse;
function parseModule(source, label) {
  babelParse ||= require("@babel/parser").parse;
  try {
    return babelParse(source, { sourceType: "module", plugins: ["jsx"] });
  } catch (error) {
    fail(`${label}: ${error.message}`);
  }
}

const UNDEFINED = Symbol("undefined");

function evaluator(ast, label) {
  const bindings = new Map();
  for (const statement of ast.program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration?.type === "VariableDeclaration") {
      for (const item of declaration.declarations) {
        if (item.id.type === "Identifier" && item.init) bindings.set(item.id.name, { node: item.init, state: "pending" });
      }
    }
  }
  const where = (node) => `${label}:${node.loc?.start.line ?? "?"}`;
  const literal = (node) => {
    switch (node.type) {
      case "StringLiteral":
      case "NumericLiteral":
      case "BooleanLiteral":
        return node.value;
      case "NullLiteral":
        return null;
      case "TemplateLiteral": {
        let out = node.quasis[0].value.cooked;
        node.expressions.forEach((expression, index) => {
          const value = literal(expression);
          if (typeof value !== "string" && typeof value !== "number") fail(`${where(expression)}: template expression is not a string or number`);
          out += String(value) + node.quasis[index + 1].value.cooked;
        });
        return out;
      }
      case "Identifier":
        if (node.name === "undefined") return UNDEFINED;
        return binding(node);
      case "UnaryExpression": {
        const value = literal(node.argument);
        if (typeof value !== "number" || !["-", "+"].includes(node.operator)) fail(`${where(node)}: unsupported unary ${node.operator}`);
        return node.operator === "-" ? -value : value;
      }
      case "BinaryExpression": {
        const left = literal(node.left);
        const right = literal(node.right);
        const numbers = typeof left === "number" && typeof right === "number";
        if (node.operator === "+" && ((typeof left === "string" && (typeof right === "string" || typeof right === "number")) || (typeof right === "string" && typeof left === "number") || numbers)) return left + right;
        if (numbers && node.operator === "-") return left - right;
        if (numbers && node.operator === "*") return left * right;
        if (numbers && node.operator === "/") return left / right;
        return fail(`${where(node)}: unsupported binary expression ${node.operator}`);
      }
      case "ArrayExpression": {
        const out = [];
        for (const element of node.elements) {
          if (!element) fail(`${where(node)}: sparse array`);
          if (element.type === "SpreadElement") {
            const value = literal(element.argument);
            if (!Array.isArray(value)) fail(`${where(element)}: spread of a non-array`);
            out.push(...value);
          } else out.push(literal(element));
        }
        return out;
      }
      case "ObjectExpression": {
        const out = {};
        for (const property of node.properties) {
          if (property.type === "SpreadElement") {
            const value = literal(property.argument);
            if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${where(property)}: spread of a non-object`);
            Object.assign(out, value);
            continue;
          }
          if (property.type !== "ObjectProperty" || property.computed) fail(`${where(property)}: unsupported ${property.type}${property.computed ? " (computed key)" : ""}`);
          const key = property.key.type === "Identifier" ? property.key.name : property.key.type === "StringLiteral" || property.key.type === "NumericLiteral" ? String(property.key.value) : fail(`${where(property)}: unsupported key`);
          if (["__proto__", "prototype", "constructor"].includes(key)) fail(`${where(property)}: forbidden key ${key}`);
          out[key] = literal(property.value);
        }
        return out;
      }
      default:
        return fail(`${where(node)}: ${node.type} is not a literal value`);
    }
  };
  const binding = (node) => {
    const entry = bindings.get(node.name);
    if (!entry) fail(`${where(node)}: ${node.name} is not a top-level constant of this file`);
    if (entry.state === "busy") fail(`${where(node)}: ${node.name} refers to itself`);
    if (entry.state === "pending") {
      entry.state = "busy";
      entry.value = literal(entry.node);
      entry.state = "done";
    }
    return copy(entry.value);
  };
  return { literal, value: (name) => binding({ type: "Identifier", name, loc: null }) };
}

function copy(value) {
  if (Array.isArray(value)) return value.map(copy);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
  return value;
}

// JSON projection of an evaluated value: `undefined` members disappear as in JSON.stringify.
function plain(value) {
  if (value === UNDEFINED) return undefined;
  if (Array.isArray(value)) return value.map((item) => (item === UNDEFINED ? null : plain(item)));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) if (item !== UNDEFINED) out[key] = plain(item);
    return out;
  }
  if (typeof value === "number" && !Number.isFinite(value)) fail("non-finite number in doc data");
  return value;
}

const moduleCache = new Map();

// The module's exports that the CLI reads (`docs`, `docsZh`, `docsDense`, `doc`, default).
function loadModule(view, file, wanted) {
  const key = `${view.label}\0${file}`;
  if (!moduleCache.has(key)) {
    const label = `${view.label}/${file}`;
    const ast = parseModule(view.read(file), label);
    const exported = new Map();
    for (const statement of ast.program.body) {
      if (statement.type === "ExportDefaultDeclaration") exported.set("default", statement.declaration);
      if (statement.type === "ExportNamedDeclaration" && statement.declaration?.type === "VariableDeclaration") {
        for (const item of statement.declaration.declarations) exported.set(item.id.name, item.init);
      }
    }
    moduleCache.set(key, { exported, evaluate: evaluator(ast, label), values: new Map() });
  }
  const mod = moduleCache.get(key);
  const out = {};
  const { evaluate } = mod;
  for (const name of wanted) {
    if (!mod.exported.has(name)) continue;
    if (!mod.values.has(name)) mod.values.set(name, plain(name === "default" ? evaluate.literal(mod.exported.get(name)) : evaluate.value(name)));
    out[name] = copy(mod.values.get(name));
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Lens overlays (`docsZh`, `docsDense`): the CLI's overlayAuthoredDoc / mergeTranslation.

function overlayProps(baseProps, translatedProps) {
  if (!baseProps) return baseProps;
  const byName = new Map((translatedProps ?? []).map((prop) => [prop.name, prop]));
  return baseProps.map((prop) => {
    const translated = byName.get(prop.name);
    return translated ? { ...prop, ...translated, name: prop.name, type: prop.type } : prop;
  });
}

function mergeUsage(baseUsage, translatedUsage) {
  if (!translatedUsage) return baseUsage;
  const kept = {};
  for (const key of ["accessibility", "accessibilityThemeCoverage", "anatomy"]) {
    if (translatedUsage[key] === undefined && baseUsage?.[key] !== undefined) kept[key] = baseUsage[key];
  }
  return { ...translatedUsage, ...kept };
}

function overlayComponentDoc(docs, translation) {
  const merged = { ...docs, ...translation, usage: mergeUsage(docs.usage, translation.usage) };
  if (merged.usage === undefined) delete merged.usage;
  merged.props = overlayProps(docs.props, translation.props);
  if (merged.props === undefined) delete merged.props;
  if (docs.components) {
    const byName = new Map((translation.components ?? []).map((component) => [component.name, component]));
    merged.components = docs.components.map((base) => {
      const translated = byName.get(base.name);
      if (!translated) return base;
      const out = { ...base, ...translated, usage: mergeUsage(base.usage, translated.usage), props: overlayProps(base.props, translated.props) };
      if (out.usage === undefined) delete out.usage;
      if (out.props === undefined) delete out.props;
      return out;
    });
  }
  return merged;
}

function describeEach(list, descriptions) {
  return list.map((item) => (descriptions[item.name] != null ? { ...item, description: descriptions[item.name] } : item));
}

function mergeTranslation(docs, translation) {
  const merged = { ...docs };
  if (merged.usage) {
    merged.usage = { ...merged.usage };
    if (translation.usage?.description) merged.usage.description = translation.usage.description;
    else if (translation.description) merged.usage.description = translation.description;
    for (const key of ["bestPractices", "accessibility"]) if (translation.usage?.[key]) merged.usage[key] = translation.usage[key];
  }
  if (translation.description && !merged.usage) merged.description = translation.description;
  if (translation.propDescriptions && merged.props) merged.props = describeEach(merged.props, translation.propDescriptions);
  if (translation.paramDescriptions && merged.params) merged.params = describeEach(merged.params, translation.paramDescriptions);
  if (translation.returnDescriptions && merged.returns) merged.returns = describeEach(merged.returns, translation.returnDescriptions);
  if (translation.components && merged.components) {
    merged.components = merged.components.map((component, index) => {
      const translated = translation.components.find((item) => item.name === component.name) || translation.components[index];
      if (!translated) return component;
      const out = { ...component };
      if (translated.description) out.description = translated.description;
      if (translated.propDescriptions && component.props) out.props = describeEach(component.props, translated.propDescriptions);
      return out;
    });
  }
  return merged;
}

function withLens(mod, lens) {
  const translation = mod[lens];
  if (!translation) return mod.docs;
  if (translation.props || translation.components?.some((component) => component.props)) return overlayComponentDoc(mod.docs, translation);
  return mergeTranslation(mod.docs, translation);
}

// ---------------------------------------------------------------------------------------------
// Core components and hooks (lib/component-discovery.mjs and lib/hook-discovery.mjs).

// Discovery metadata comes from the parsed `docs` export. (The 0.2 CLI scanned the file text with
// regular expressions, which also matched a translated `group` prop description.)
function docMeta(view, file) {
  const docs = loadModule(view, file, ["docs"]).docs || {};
  return { group: typeof docs.group === "string" ? docs.group : null, hiddenComponents: new Set(Array.isArray(docs.hiddenComponents) ? docs.hiddenComponents : []), hidden: docs.hidden === true };
}

function isComponentSource(view, dir, name) {
  if (name.includes(".test.") || name.includes("Context.")) return false;
  if (/^XDS[A-Z]\w+\.tsx$/.test(name)) return true;
  if (!/^[A-Z]\w+\.tsx$/.test(name)) return false;
  const base = name.replace(/\.tsx$/, "");
  return view.isFile(view.join(dir, `${base}.doc.mjs`)) || view.isFile(view.join(dir, `XDS${base}.doc.mjs`));
}

function docFileIn(view, dir, name) {
  for (const candidate of [`${name}.doc.mjs`, `XDS${name}.doc.mjs`]) if (view.isFile(view.join(dir, candidate))) return view.join(dir, candidate);
  return null;
}

function discoverComponents(view) {
  const src = "src";
  const groupsByName = new Map();
  const collect = (dir) => view.list(dir).flatMap((entry) => (entry.isDir ? collect(view.join(dir, entry.name)) : isComponentSource(view, dir, entry.name) ? [entry.name] : []));
  for (const entry of view.list(src)) {
    if (!entry.isDir || ["hooks", "utils", "__tests__", "node_modules"].includes(entry.name)) continue;
    const dir = view.join(src, entry.name);
    const docFile = docFileIn(view, dir, entry.name);
    const meta = docFile ? docMeta(view, docFile) : { group: null, hiddenComponents: new Set(), hidden: false };
    if (meta.hidden) continue;
    for (const file of collect(dir)) {
      const name = file.replace(/^XDS/, "").replace(/\.tsx$/, "");
      if (meta.hiddenComponents.has(name)) continue;
      const own = docFileIn(view, dir, name);
      const group = (own && docMeta(view, own).group) || meta.group;
      if (!docFile && !own) continue;
      if (!groupsByName.has(name)) groupsByName.set(name, group);
    }
  }
  const grouped = new Map();
  for (const [name, group] of groupsByName) {
    const key = group || name;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(name);
  }
  return [...grouped.entries()].map(([key, names]) => [key, names.sort()]).sort(([a], [b]) => a.localeCompare(b));
}

function findComponentSource(view, name) {
  const candidates = [`XDS${name}.tsx`, `${name}.tsx`, `XDS${name}.ts`, `${name}.ts`];
  const search = (dir) => {
    for (const candidate of candidates) if (view.isFile(view.join(dir, candidate))) return view.join(dir, candidate);
    for (const entry of view.list(dir)) {
      if (!entry.isDir) continue;
      const found = search(view.join(dir, entry.name));
      if (found) return found;
    }
    return null;
  };
  if (view.isDir(`src/${name}`)) {
    const found = search(`src/${name}`);
    if (found) return found;
  }
  for (const entry of view.list("src").filter((item) => item.isDir)) {
    if (view.isDir(`src/${entry.name}/${name}`)) {
      const found = search(`src/${entry.name}/${name}`);
      if (found) return found;
    }
  }
  return search("src");
}

function findComponentDoc(view, name) {
  const direct = docFileIn(view, `src/${name}`, name);
  if (direct) return direct;
  const dirs = view.list("src").filter((entry) => entry.isDir).map((entry) => `src/${entry.name}`);
  for (const dir of dirs) {
    const nested = docFileIn(view, `${dir}/${name}`, name);
    if (nested) return nested;
  }
  for (const dir of dirs) {
    const own = docFileIn(view, dir, name);
    if (own) return own;
  }
  const source = findComponentSource(view, name);
  if (source) {
    for (let dir = path.posix.dirname(source); dir.startsWith("src"); dir = path.posix.dirname(dir)) {
      const doc = view.list(dir).find((entry) => !entry.isDir && entry.name.endsWith(".doc.mjs"));
      if (doc) return view.join(dir, doc.name);
    }
  }
  return null;
}

function discoverHooks(view) {
  const categories = new Map();
  const category = (file) => {
    const found = loadModule(view, file, ["docs"]).docs?.category;
    return typeof found === "string" && found ? found.charAt(0).toUpperCase() + found.slice(1) : "Other";
  };
  const files = new Map();
  for (const entry of view.list("src/hooks")) {
    if (entry.isDir || !entry.name.endsWith(".doc.mjs")) continue;
    const name = entry.name.replace(".doc.mjs", "");
    categories.set(name, category(`src/hooks/${entry.name}`));
    files.set(name, `src/hooks/${entry.name}`);
  }
  const scan = (dir) => {
    for (const entry of view.list(dir)) {
      if (entry.isDir && !["utils", "__tests__", "node_modules"].includes(entry.name)) scan(view.join(dir, entry.name));
      else if (!entry.isDir && entry.name.startsWith("use") && entry.name.endsWith(".doc.mjs")) {
        const name = entry.name.replace(".doc.mjs", "");
        if (!categories.has(name)) {
          categories.set(name, category(view.join(dir, entry.name)));
          files.set(name, view.join(dir, entry.name));
        }
      }
    }
  };
  for (const entry of view.list("src")) {
    if (entry.isDir && !["utils", "__tests__", "node_modules", "hooks"].includes(entry.name)) scan(`src/${entry.name}`);
  }
  const grouped = new Map();
  for (const [name, key] of categories) {
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(name);
  }
  const order = [...grouped.entries()].map(([key, names]) => [key, names.sort()]).sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
  return { order, files };
}

const LENSES = ["docs", "docsZh", "docsDense"];

function lensEntries(mod, category, fallback) {
  if (!mod?.docs) return { docs: fallback, docsZh: fallback, docsDense: fallback };
  return {
    docs: { category, ...mod.docs },
    docsZh: { category, ...withLens(mod, "docsZh") },
    docsDense: { category, ...withLens(mod, "docsDense") },
  };
}

// A lens is stored only where it reads differently from the English entry; readers fall back to
// the entry itself, which is what the CLI prints for a doc without that lens.
function lenses(english, docsZh, docsDense) {
  const same = (lens) => JSON.stringify(lens) === JSON.stringify(english);
  return { ...(same(docsZh) ? {} : { docsZh }), ...(same(docsDense) ? {} : { docsDense }) };
}

// The CLI's grouped lists key each lens by entry name; a later duplicate name wins.
function catalogEntries(listed) {
  const zh = new Map(listed.map((item) => [item.docsZh.name, item.docsZh]));
  const dense = new Map(listed.map((item) => [item.docsDense.name, item.docsDense]));
  return listed.map(({ docs }) => ({ id: docs.name, status: "stable", package: CORE_PACKAGE, ...docs, ...lenses(docs, zh.get(docs.name), dense.get(docs.name)) }));
}

function components(core) {
  const listed = [];
  for (const [category, names] of discoverComponents(core)) {
    for (const name of names) {
      const file = findComponentDoc(core, name);
      const fallback = { category, name: `XDS${name}`, description: "" };
      listed.push(lensEntries(file?.endsWith(".doc.mjs") ? loadModule(core, file, LENSES) : null, category, fallback));
    }
  }
  return catalogEntries(listed);
}

function hooks(core) {
  const { order, files } = discoverHooks(core);
  const listed = [];
  for (const [category, names] of order) {
    for (const name of names) listed.push(lensEntries(loadModule(core, files.get(name), LENSES), category, { category, name }));
  }
  return catalogEntries(listed);
}

// ---------------------------------------------------------------------------------------------
// CLI reference topics (`docs/` in 0.2, `assets/docs/` and its `tree/` in 0.7) and templates.

function cliLayout(cli) {
  if (cli.isDir("assets/docs")) return { docs: ["assets/docs", "assets/docs/tree"], templates: "assets/templates" };
  if (cli.isDir("docs")) return { docs: ["docs"], templates: "templates" };
  return fail(`${cli.label} has neither docs/ nor assets/docs/`);
}

function discoverTopics(cli, layout) {
  const topics = new Map();
  for (const dir of layout.docs) {
    for (const entry of cli.list(dir)) {
      const match = !entry.isDir && entry.name.match(/^([\w-]+)\.doc\.mjs$/);
      if (!match) continue;
      if (topics.has(match[1])) fail(`${cli.label}: topic ${match[1]} is defined twice`);
      topics.set(match[1], cli.join(dir, entry.name));
    }
  }
  return topics;
}

function topicDoc(cli, file, lens) {
  const docs = loadModule(cli, file, ["docs"]).docs;
  if (!docs) fail(`${cli.label}/${file} exports no docs`);
  if (!lens) return docs;
  const lensFile = file.replace(/\.doc\.mjs$/, `.doc.${lens}.mjs`);
  if (!cli.isFile(lensFile)) return docs;
  const translated = loadModule(cli, lensFile, ["docsZh", "docsDense"]);
  const translation = translated.docsZh || translated.docsDense;
  if (!translation) return docs;
  const bySection = new Map((translation.sections ?? []).filter((item) => item?.section != null).map((item) => [item.section, item]));
  return {
    ...docs,
    description: translation.description || docs.description,
    sections: docs.sections?.map((section) => {
      const translatedSection = bySection.get(section.title);
      if (!translatedSection) return section;
      return {
        ...section,
        title: translatedSection.title || section.title,
        content: section.content.map((block, index) => {
          const translatedBlock = translatedSection.content?.[index];
          if (translatedBlock?.type === "prose" && block.type === "prose") return { ...block, text: translatedBlock.text };
          if (translatedBlock?.type === "list" && block.type === "list") return { ...block, items: translatedBlock.items };
          return block;
        }),
      };
    }),
  };
}

// A token-ref names a topic and a section title; asked of a namespace topic (0.7 docs tree), the
// section comes from the one topic placed under that namespace that has it.
function tokenRefSection(cli, topics, block) {
  const file = topics.get(block.topic);
  if (!file) return null;
  const want = String(block.section).toLowerCase();
  const own = loadModule(cli, file, ["docs"]).docs;
  const direct = (own.sections || []).find((section) => section.title?.toLowerCase() === want);
  if (direct) return direct;
  const placed = [...topics.entries()].filter(([name]) => !COMPUTED_TOPICS.has(name)).map(([, other]) => loadModule(cli, other, ["docs"]).docs).filter((doc) => doc.placement?.parent === `namespace:${block.topic}`);
  const found = placed.flatMap((doc) => (doc.sections || []).filter((section) => section.title?.toLowerCase() === want));
  return found.length === 1 ? found[0] : null;
}

function inlineTokenRefs(cli, topics, docs) {
  if (!docs.sections) return docs;
  return {
    ...docs,
    sections: docs.sections.map((section) => {
      if (!section.content?.some((block) => block.type === "token-ref")) return section;
      let previewType = section.previewType;
      const content = section.content.flatMap((block) => {
        if (block.type !== "token-ref") return [block];
        if (!topics.has(block.topic)) return [{ type: "prose", text: `[token-ref: unknown topic "${block.topic}"]` }];
        const found = tokenRefSection(cli, topics, block);
        if (!found) return [{ type: "prose", text: `[token-ref: section "${block.section}" not found in "${block.topic}"]` }];
        if (found.previewType && !previewType) previewType = found.previewType;
        return found.content;
      });
      return { ...section, ...(previewType ? { previewType } : {}), content };
    }),
  };
}

function extractThemeTokens(docs) {
  const tokens = {};
  for (const section of docs.flatMap((doc) => doc.sections || [])) {
    for (const table of (section.content || []).filter(({ type }) => type === "table")) {
      const modes = JSON.stringify(table.headers) === JSON.stringify(["Token", "Light", "Dark"]);
      const scalar = JSON.stringify(table.headers) === JSON.stringify(["Token", "Value"]);
      if (!modes && !scalar) continue;
      for (const [name, ...values] of table.rows || []) {
        if (typeof name !== "string" || !name.startsWith("--")) continue;
        if (Object.hasOwn(tokens, name)) fail(`duplicate token ${name}`);
        tokens[name] = modes ? values.slice(0, 2) : values[0];
      }
    }
  }
  return tokens;
}

function docs(cli) {
  const layout = cliLayout(cli);
  const topics = discoverTopics(cli, layout);
  const out = [];
  for (const [topic, file] of topics) {
    if (COMPUTED_TOPICS.has(topic)) continue;
    const [english, zh, dense] = [null, "zh", "dense"].map((lens) => inlineTokenRefs(cli, topics, topicDoc(cli, file, lens)));
    const entry = { id: topic, status: "stable", ...english, ...lenses(english, zh, dense) };
    if (topic === "tokens") {
      const sources = english.sections ? [english] : [...topics.entries()].filter(([name]) => !COMPUTED_TOPICS.has(name)).map(([, other]) => loadModule(cli, other, ["docs"]).docs).filter((doc) => doc.placement?.parent === "namespace:tokens");
      const tokens = extractThemeTokens(sources);
      if (!Object.keys(tokens).length) fail(`${cli.label}: the tokens topic has no token tables`);
      entry.theme = { tokens };
    }
    out.push(entry);
  }
  if (!out.some((entry) => entry.theme)) fail(`${cli.label} has no tokens topic`);
  return out;
}

const TEMPLATE_SUFFIXES = [".template.ts", ".template.mjs", ".template.js", ".doc.ts", ".doc.mjs", ".doc.js"];

function templateDoc(cli, file) {
  if (!file || !cli.isFile(file)) return null;
  if (!file.endsWith(".mjs")) fail(`${cli.label}/${file}: only .mjs template docs are read`);
  const mod = loadModule(cli, file, ["default", "doc"]);
  return mod.default ?? mod.doc ?? null;
}

function templates(cli) {
  const root = cliLayout(cli).templates;
  const out = [];
  for (const entry of cli.list(`${root}/pages`).filter((item) => item.isDir)) {
    const dir = `${root}/pages/${entry.name}`;
    const file = TEMPLATE_SUFFIXES.map((suffix) => `${dir}/template${suffix}`).find((candidate) => cli.isFile(candidate)) ?? `${dir}/template.doc.mjs`;
    const doc = templateDoc(cli, file);
    out.push({ id: entry.name, name: doc?.name || entry.name, description: doc?.description || "", type: "page", category: doc?.category || "", isReady: doc?.isReady ?? true, scaffold: doc?.scaffold ?? false });
  }
  const walk = (dir) => cli.list(dir).flatMap((entry) => (entry.isDir ? walk(cli.join(dir, entry.name)) : /\.(template|doc)\.(ts|mjs|js)$/.test(entry.name) ? [cli.join(dir, entry.name)] : []));
  const blocks = `${root}/blocks`;
  for (const file of cli.isDir(blocks) ? walk(blocks) : []) {
    const suffix = TEMPLATE_SUFFIXES.find((item) => file.endsWith(item));
    if (!suffix) continue;
    const base = path.posix.basename(file, suffix);
    if (!cli.isFile(`${path.posix.dirname(file)}/${base}.tsx`)) continue;
    const doc = templateDoc(cli, file);
    out.push({ id: base, name: doc?.name || base, description: doc?.description || "", type: "block", category: path.posix.relative(blocks, path.posix.dirname(file)), componentsUsed: doc?.componentsUsed ?? [], isReady: doc?.isReady ?? true, scaffold: false });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name)).map((item) => plain({
    status: "stable",
    id: item.id,
    name: item.name,
    displayName: item.name,
    description: item.description,
    type: item.type,
    package: CORE_PACKAGE,
    category: item.category || UNDEFINED,
    componentsUsed: item.componentsUsed ?? UNDEFINED,
    isReady: item.isReady,
    scaffold: item.scaffold,
  }));
}

// ---------------------------------------------------------------------------------------------

function integrity(file) {
  return `sha512-${crypto.createHash("sha512").update(fs.readFileSync(file)).digest("base64")}`;
}

// Both packages declare MIT; only the CLI tarball ships the license text.
function checkLicense(view, { text }) {
  const license = view.isFile("LICENSE") ? view.read("LICENSE") : "";
  if (text && (!/^MIT License\s/.test(license) || !/Copyright \(c\) \d{4} Meta Platforms, Inc\./.test(license))) fail(`${view.label} LICENSE is not the reviewed MIT license of Meta Platforms, Inc.`);
  const declared = view.json("package.json").license;
  if (declared !== "MIT") fail(`${view.label} package.json license is ${declared}, not MIT`);
}

function buildSnapshot({ coreTarball, cliTarball, revision }) {
  if (!/^[0-9a-f]{40}$/.test(revision || "")) fail("--revision must be the 40-hex commit of the release tag");
  moduleCache.clear();
  const core = packageView(readTarball(coreTarball), CORE_PACKAGE);
  const cli = packageView(readTarball(cliTarball), CLI_PACKAGE);
  const corePackage = core.json("package.json");
  const cliPackage = cli.json("package.json");
  if (corePackage.name !== CORE_PACKAGE) fail(`--core is ${corePackage.name}, not ${CORE_PACKAGE}`);
  if (cliPackage.name !== CLI_PACKAGE) fail(`--cli is ${cliPackage.name}, not ${CLI_PACKAGE}`);
  if (corePackage.version !== cliPackage.version) fail(`core ${corePackage.version} and cli ${cliPackage.version} are not the same release`);
  checkLicense(core, { text: false });
  checkLicense(cli, { text: true });
  const version = corePackage.version;
  const peers = corePackage.peerDependencies || {};
  const collections = { components: components(core), docs: docs(cli), templates: templates(cli), hooks: hooks(core) };
  for (const [name, entries] of Object.entries(collections)) {
    if (!entries.length) fail(`${name} is empty`);
    entries.sort((a, b) => a.id.localeCompare(b.id, "en"));
  }
  // Serialized as the CLI's JSON output is: members left undefined by a lens merge drop out.
  return JSON.parse(JSON.stringify({
    schema: "design-pipeline.design-system-snapshot.v1",
    version: "1",
    namespace: "astryx",
    provenance: {
      provider: "astryx",
      source: "Astryx",
      url: REPOSITORY,
      revision,
      version,
      upstreamVersion: version,
      license: "MIT",
      attribution: "Copyright Meta Platforms, Inc. and affiliates",
      runtime: {
        react: peers.react?.replace(/\.0\.0$/, ""),
        "react-dom": peers["react-dom"]?.replace(/\.0\.0$/, ""),
        stylex: peers["@stylexjs/stylex"]?.replace(/\.0$/, ""),
        "@stylexjs/stylex": peers["@stylexjs/stylex"]?.replace(/\.0$/, ""),
      },
      acquisition: `Static parse of the ${CORE_PACKAGE} and ${CLI_PACKAGE} ${version} npm tarballs; no upstream code executed`,
      integrity: { [CORE_PACKAGE]: integrity(coreTarball), [CLI_PACKAGE]: integrity(cliTarball) },
    },
    ...collections,
  }));
}

function parseArgs(argv) {
  const options = { out: DEFAULT_OUT };
  const names = { "--core": "core", "--cli": "cli", "--revision": "revision", "--out": "out", "--reviewed-at": "reviewedAt" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") return { help: true };
    if (!names[token]) fail(`unknown option: ${token}`);
    const value = argv[++index];
    if (!value || value.startsWith("--")) fail(`${token} requires a value`);
    options[names[token]] = value;
  }
  if (!options.core || !options.cli) fail("--core and --cli name the two npm tarballs");
  return options;
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write("Usage: node scripts/generate-astryx-snapshot.cjs --core <core.tgz> --cli <cli.tgz> --revision <sha> [--out <file>]\n");
    } else {
      const snapshot = buildSnapshot({ coreTarball: path.resolve(options.core), cliTarball: path.resolve(options.cli), revision: options.revision });
      const out = path.resolve(options.out);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
      const counts = ["components", "docs", "templates", "hooks"].map((name) => `${snapshot[name].length} ${name}`).join(", ");
      process.stdout.write(`astryx ${snapshot.provenance.version}: ${counts}\n`);
    }
  } catch (error) {
    if (!(error instanceof SnapshotError)) throw error;
    process.stderr.write(`generate-astryx-snapshot: ${error.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { buildSnapshot, readTarball, SnapshotError };

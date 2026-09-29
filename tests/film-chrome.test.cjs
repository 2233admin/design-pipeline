"use strict";

// Text-level checks of instrument-chrome.css against the registry's `chrome` block and the
// instruments' `markup`. No CSS parser: the file is small and the constructs are text patterns.

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

const refs = path.join(__dirname, "../skill/references/film-choreography");
const raw = fs.readFileSync(path.join(refs, "instrument-chrome.css"), "utf8");
const registry = JSON.parse(fs.readFileSync(path.join(refs, "registry.json"), "utf8"));
const chrome = registry.chrome;

// Comments state what is kept out, so constructs are searched in the text without them.
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

const COLOUR_SLOTS = ["--fk-ink", "--fk-line", "--fk-text", "--fk-rest", "--fk-accent", "--fk-alert"];

const nameOf = (entry, key) => (typeof entry === "string" ? entry : entry[key]);
const classesIn = (text) => new Set([...String(text).matchAll(/fk-[a-z0-9_-]*[a-z0-9]/g)].map((m) => m[0]));

function rootDeclarations() {
  const declared = new Map();
  for (const block of css.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const decl of block[1].matchAll(/(--fk-[a-z0-9-]+)\s*:\s*([^;]+);/g)) declared.set(decl[1], decl[2].trim());
  }
  return declared;
}

function rules() {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selectors: m[1].split(",").map((s) => s.trim()),
    body: m[2],
  }));
}

const declaresProperty = (body, property) => new RegExp(`(^|[;\\s])${property}\\s*:`).test(body);
const rulesFor = (className) =>
  rules().filter((rule) => rule.selectors.some((selector) => new RegExp(`\\.${className}(?![a-z0-9_-])`).test(selector)));

function channels(colour) {
  const hex = colour.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  assert.ok(hex, `colour default ${colour} must be a #rgb or #rrggbb literal`);
  const digits = hex[1].length === 3 ? [...hex[1]].map((c) => c + c) : hex[1].match(/../g);
  return digits.map((d) => parseInt(d, 16));
}

test("the registry documents the chrome file, prefix, properties and recipes", () => {
  assert.ok(chrome && typeof chrome === "object", "registry.json needs a top-level `chrome` block");
  assert.ok(Array.isArray(chrome.properties) && chrome.properties.length > 0, "chrome.properties");
  assert.ok(Array.isArray(chrome.recipes) && chrome.recipes.length > 0, "chrome.recipes");
});

test("declared custom properties equal chrome.properties, with the documented defaults", () => {
  const declared = rootDeclarations();
  const documented = chrome.properties.map((entry) => nameOf(entry, "name"));
  assert.equal(declared.size, 14, `expected fourteen properties in :root, found ${declared.size}`);
  assert.deepEqual([...declared.keys()].sort(), [...documented].sort());
  for (const entry of chrome.properties) {
    if (typeof entry === "object" && entry.default !== undefined) {
      assert.equal(declared.get(entry.name), String(entry.default), `default of ${entry.name}`);
    }
  }
  for (const name of declared.keys()) assert.match(name, /^--fk-/);
});

test("every var(--fk-*) reference names a declared property", () => {
  const declared = new Set(rootDeclarations().keys());
  const used = [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/g)].map((m) => m[1]);
  assert.ok(used.length > 0, "the recipes must use the custom properties");
  for (const name of used) assert.ok(declared.has(name), `var(${name}) is not declared in :root`);
});

test("every colour default and every colour literal is achromatic", () => {
  const declared = rootDeclarations();
  for (const slot of COLOUR_SLOTS) {
    assert.ok(declared.has(slot), `${slot} must be declared`);
    const [r, g, b] = channels(declared.get(slot));
    assert.ok(r === g && g === b, `${slot} default ${declared.get(slot)} has a hue`);
  }
  assert.doesNotMatch(css, /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i, "colour functions can carry a hue");
  for (const literal of css.match(/#[0-9a-f]{3,8}\b/gi) || []) {
    const [r, g, b] = channels(literal);
    assert.ok(r === g && g === b, `colour literal ${literal} has a hue`);
  }
});

test("the chrome cannot fight the timeline or reach outside the file", () => {
  const banned = [
    [/\banimation/i, "animation"],
    [/\btransition/i, "transition"],
    [/@keyframes/i, "@keyframes"],
    [/@import/i, "@import"],
    [/@font-face/i, "@font-face"],
    [/url\(/i, "url("],
    [/clip-path/i, "clip-path"],
    [/polygon\(/i, "polygon("],
    [/(?<!repeating-)\b(?:linear|radial|conic)-gradient\(/i, "a gradient other than repeating-linear-gradient"],
    [/repeating-(?:radial|conic)-gradient\(/i, "a gradient other than repeating-linear-gradient"],
  ];
  for (const [pattern, label] of banned) assert.doesNotMatch(css, pattern, `the chrome must not use ${label}`);
});

test("no rule declares a property that an instrument tweens on the same element", () => {
  for (const className of ["fk-log__col", "fk-stage", "fk-cell"]) {
    const found = rulesFor(className);
    assert.ok(found.length > 0, `.${className} needs a rule`);
    for (const rule of found) assert.ok(!declaresProperty(rule.body, "transform"), `.${className} must not declare transform`);
  }
  const flash = rulesFor("fk-flash");
  assert.ok(flash.length > 0, ".fk-flash needs a rule");
  for (const rule of flash) assert.ok(!declaresProperty(rule.body, "opacity"), ".fk-flash must not declare opacity");
  for (const className of ["fk-meter__bar", "fk-scope__col"]) {
    for (const rule of rulesFor(className)) assert.ok(!declaresProperty(rule.body, "clip-path"), `.${className} must not declare clip-path`);
  }
});

test("chrome classes, chrome.recipes and instrument markup agree", () => {
  const inCss = classesIn([...css.matchAll(/\.(fk-[a-z0-9_-]+)/g)].map((m) => m[1]).join(" "));
  const recipes = new Set(chrome.recipes.map((entry) => nameOf(entry, "class").replace(/^\./, "")));
  assert.deepEqual([...inCss].sort(), [...recipes].sort(), "every fk- class in the CSS is a recipe and every recipe is in the CSS");

  const instruments = registry.patterns.filter((pattern) => pattern.kind === "instrument");
  assert.ok(instruments.length >= 6, "the six instruments must be registered with kind: instrument");
  for (const instrument of instruments) {
    const named = classesIn(JSON.stringify(instrument.markup));
    assert.ok(named.size > 0, `${instrument.id} markup names no chrome class`);
    for (const className of named) assert.ok(inCss.has(className), `${instrument.id} markup names .${className}, which the chrome lacks`);
  }
});

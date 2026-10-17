"use strict";

// The project design-system package: usage-noted tokens, a usage-rule README, per-component
// guidelines with live previews, and a cover, beside DESIGN.md. The shape is compatible with
// Claude's Design System artifact type, so a host that offers it can publish the folder as-is.
// tokens.json is the single source: DESIGN.md front-matter tokens are generated from it and the
// foundation check reports drift.

const fs = require("node:fs");
const path = require("node:path");
const { pathIsInside, resolveProjectRoot, sha256Text } = require("./design-synthesis-core.cjs");

const SCHEMA = "design-pipeline.design-system-check.v1";
const DEFAULT_DIR = "design-system";
const NAME = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;
const README_SECTIONS = [
  ["content fundamentals", /content|内容/i],
  ["visual foundations", /visual|视觉/i],
  ["iconography", /icon|图标/i],
];
const FORBIDDEN_TAGS = /<\s*(iframe|frame|object|embed|portal|noscript)\b/i;
const MARKER = /^<!--\s*@dsCard\b[^>]*-->/;
const NON_COMPONENT_DIRS = new Set(["lib", "src"]);
const COLOR_FUNCTION = /^(rgba?|hsla?|oklch|oklab|lab|lch|color)\(\s*[^()]*\)$/i;
const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const LENGTH = /^(?:-?\d+(?:\.\d+)?(?:px|rem|em)|0)$/; // DESIGN.md (Google format) accepts px, rem and em only

function readText(file) {
  return fs.readFileSync(file, "utf8");
}

function isList(family) {
  return family && typeof family === "object" && Array.isArray(family.tokens);
}

function colorValue(token, themeId, firstId) {
  if (typeof token.value === "string") return token.value;
  if (token.value && typeof token.value === "object") return token.value[themeId] ?? token.value[firstId];
  return undefined;
}

// Resolves a colour token for a theme, following "{alias}" references; null when it cannot.
function resolveColor(byName, name, themeId, firstId, seen = new Set()) {
  const token = byName.get(name);
  if (!token || seen.has(name) || seen.size > 16) return null;
  seen.add(name);
  const value = String(colorValue(token, themeId, firstId) ?? "").trim();
  const alias = value.match(/^\{([^{}]+)\}$/);
  if (alias) return resolveColor(byName, alias[1], themeId, firstId, seen);
  return HEX.test(value) || COLOR_FUNCTION.test(value) ? value.toLowerCase() : null;
}

function rgbOf(value) {
  const hex = value.match(HEX);
  if (hex) {
    let h = value.slice(1);
    if (h.length <= 4) h = [...h].map((c) => c + c).join("");
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  return rgb ? rgb.slice(1, 4).map(Number) : null;
}

function luminance([r, g, b]) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function validateTokens(tokens, findings) {
  const add = (message) => findings.push({ file: "tokens.json", message });
  if (!tokens || typeof tokens !== "object") return add("tokens.json must be a JSON object");
  if (typeof tokens.name !== "string" || !tokens.name.trim()) add("tokens.json needs a name");
  const color = tokens.color;
  if (!color || !Array.isArray(color.themes) || !color.themes.length || !isList(color)) {
    add("color needs themes and a flat tokens list");
    return { byName: new Map(), themes: [] };
  }
  const themes = color.themes.map((theme) => String(theme.id || ""));
  const firstId = themes[0];
  const names = new Set();
  const listed = [["color", color]];
  for (const [key, family] of Object.entries(tokens)) {
    if (["name", "version", "color", "type", "contrast", "meta"].includes(key)) continue;
    if (!isList(family)) add(`${key} must be {"tokens": [...]}, a list of {name, value, usage}; a name-to-value map is not read`);
    else listed.push([key, family]);
  }
  for (const [key, family] of listed) {
    for (const token of family.tokens) {
      const label = `${key}.${token && token.name}`;
      if (!token || !NAME.test(String(token.name || ""))) { add(`${label}: invalid token name`); continue; }
      if (names.has(token.name)) add(`${label}: name used twice (one --name namespace across families)`);
      names.add(token.name);
      if (typeof token.usage !== "string" || !token.usage.trim()) add(`${label}: missing usage note`);
      if (key !== "color" && key !== "shadow" && key !== "spacing" && key !== "radius") continue;
      if ((key === "spacing" || key === "radius") && !(typeof token.value === "number" || LENGTH.test(String(token.value)))) {
        add(`${label}: value must be px, rem, em or a number (DESIGN.md cannot carry %)`);
      }
    }
  }
  const byName = new Map(color.tokens.filter((t) => t && t.name).map((t) => [t.name, t]));
  for (const token of color.tokens) {
    if (!token || !token.name) continue;
    for (const theme of themes) {
      if (!resolveColor(byName, token.name, theme, firstId)) add(`color.${token.name}: no valid colour for theme ${theme} (hex, a colour function without nesting, or an alias of an existing colour)`);
    }
  }
  const type = tokens.type;
  if (!type || !type.families || !Array.isArray(type.groups) || !type.groups.length) {
    add("type needs families and at least one group of styles");
  } else {
    for (const group of type.groups) {
      if (!type.families[group.family]) add(`type group ${group.name}: family ${group.family} is not in type.families`);
      for (const style of group.styles || []) {
        if (!NAME.test(String(style.name || ""))) add(`type style ${style.name}: invalid name`);
        if (!LENGTH.test(String(style.fontSize))) add(`type style ${style.name}: fontSize must be a length`);
        if (style.family && !type.families[style.family]) add(`type style ${style.name}: family ${style.family} is not in type.families`);
        if (typeof style.usage !== "string" || !style.usage.trim()) add(`type style ${style.name}: missing usage note`);
      }
    }
  }
  return { byName, themes };
}

function checkContrast(tokens, byName, themes, findings) {
  const pairs = tokens.contrast;
  const add = (message) => findings.push({ file: "tokens.json", message });
  if (!Array.isArray(pairs) || !pairs.length) {
    add('contrast must list the text and mark colours with the grounds they sit on: [{"text": "ink", "on": ["paper"], "min": 4.5}]');
    return [];
  }
  const results = [];
  for (const pair of pairs) {
    const min = pair.min === undefined ? 4.5 : Number(pair.min);
    for (const ground of pair.on || []) {
      for (const theme of themes) {
        const fg = resolveColor(byName, pair.text, theme, themes[0]);
        const bg = resolveColor(byName, ground, theme, themes[0]);
        const a = fg && rgbOf(fg);
        const b = bg && rgbOf(bg);
        if (!a || !b) { add(`contrast ${pair.text} on ${ground} (${theme}): both colours must exist and be hex or rgb()`); continue; }
        const ratio = Math.round(contrastRatio(a, b) * 100) / 100;
        results.push({ text: pair.text, on: ground, theme, ratio, min });
        if (ratio < min) add(`contrast ${pair.text} on ${ground} (${theme}) is ${ratio}:1, below ${min}:1`);
      }
    }
  }
  return results;
}

function checkReadme(dir, findings) {
  const file = path.join(dir, "README.md");
  if (!fs.existsSync(file)) return findings.push({ file: "README.md", message: "missing: the usage rules every reader starts from" });
  const headings = [...readText(file).matchAll(/^#{2,3}\s+(.+?)\s*$/gm)].map((m) => m[1]);
  for (const [label, pattern] of README_SECTIONS) {
    if (!headings.some((h) => pattern.test(h))) findings.push({ file: "README.md", message: `missing the ${label} section` });
  }
}

function firstSentence(markdown) {
  const body = markdown.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith("#"));
  return (body[0] || "").trim();
}

function checkComponents(dir, findings) {
  const root = path.join(dir, "components");
  const components = [];
  if (!fs.existsSync(root)) {
    findings.push({ file: "components/", message: "missing: guidelines and live previews per component" });
    return components;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || NON_COMPONENT_DIRS.has(entry.name)) continue;
    const rel = `components/${entry.name}`;
    const readme = path.join(root, entry.name, "README.md");
    const preview = path.join(root, entry.name, "preview.html");
    const isCover = entry.name === "Cover";
    if (!fs.existsSync(preview)) findings.push({ file: rel, message: "missing preview.html" });
    else {
      const html = readText(preview);
      if (!MARKER.test(html)) findings.push({ file: `${rel}/preview.html`, message: "line 1 must be the <!-- @dsCard ... --> marker" });
      if (FORBIDDEN_TAGS.test(html)) findings.push({ file: `${rel}/preview.html`, message: "uses a forbidden embedding tag (iframe, frame, object, embed, portal, noscript)" });
    }
    if (isCover) {
      if (fs.existsSync(readme)) findings.push({ file: rel, message: "the cover folder stays bare: a README.md makes it an ordinary component" });
      continue;
    }
    if (!fs.existsSync(readme)) findings.push({ file: rel, message: "missing README.md guidelines" });
    else if (!firstSentence(readText(readme))) findings.push({ file: `${rel}/README.md`, message: "needs a first sentence summarising the component" });
    components.push(entry.name);
  }
  if (!fs.existsSync(path.join(root, "Cover", "preview.html")) && !findings.some((f) => f.file === "components/Cover")) {
    findings.push({ file: "components/Cover/preview.html", message: "missing: every design system has a cover" });
  }
  if (!components.length) findings.push({ file: "components/", message: "needs at least one component with guidelines and a preview" });
  return components.sort();
}

// ---- tokens.json -> CSS and DESIGN.md front matter -------------------------------------------

function firstTheme(tokens) {
  return tokens.color.themes[0].id;
}

function cssColor(token, theme, first) {
  const value = String(colorValue(token, theme, first));
  const alias = value.match(/^\{([^{}]+)\}$/);
  return alias ? `var(--${alias[1]})` : value;
}

function typeStyles(tokens) {
  return tokens.type.groups.flatMap((group) => (group.styles || []).map((style) => ({ ...style, family: style.family || group.family })));
}

function compileTokensCss(tokens) {
  const first = firstTheme(tokens);
  const lines = [`/* ${tokens.name} — generated from tokens.json */`];
  tokens.color.themes.forEach((theme, index) => {
    const selector = index === 0 ? `:root, [data-theme="${theme.id}"]` : `[data-theme="${theme.id}"]`;
    lines.push(`${selector} {`);
    for (const token of tokens.color.tokens) lines.push(`  --${token.name}: ${cssColor(token, theme.id, first)};`);
    for (const token of (tokens.shadow && tokens.shadow.tokens) || []) lines.push(`  --${token.name}: ${cssColor(token, theme.id, first)};`);
    lines.push("}");
  });
  lines.push(":root {");
  for (const [key, family] of Object.entries(tokens)) {
    if (["name", "version", "color", "type", "contrast", "meta", "shadow"].includes(key) || !isList(family)) continue;
    for (const token of family.tokens) lines.push(`  --${token.name}: ${typeof token.value === "number" ? `${token.value}px` : token.value};`);
  }
  for (const [key, stack] of Object.entries(tokens.type.families)) lines.push(`  --font-${key}: ${stack};`);
  lines.push("}");
  for (const style of typeStyles(tokens)) {
    const decl = [`font-family: var(--font-${style.family})`, `font-size: ${style.fontSize}`];
    if (style.lineHeight !== undefined) decl.push(`line-height: ${style.lineHeight}`);
    if (style.fontWeight !== undefined) decl.push(`font-weight: ${style.fontWeight}`);
    if (style.letterSpacing !== undefined) decl.push(`letter-spacing: ${style.letterSpacing}`);
    lines.push(`.${style.name} { ${decl.join("; ")}; }`);
  }
  return `${lines.join("\n")}\n`;
}

function quote(value) {
  return JSON.stringify(String(value));
}

// The DESIGN.md front-matter token groups (Google format) generated from tokens.json.
function designMdTokens(tokens) {
  const first = firstTheme(tokens);
  const byName = new Map(tokens.color.tokens.map((t) => [t.name, t]));
  const colors = tokens.color.tokens.map((t) => [t.name, resolveColor(byName, t.name, first, first)]);
  if (!byName.has("primary")) colors.unshift(["primary", colors[0][1]]);
  const out = ["colors:", ...colors.map(([name, value]) => `  ${name}: ${quote(value)}`), "typography:"];
  for (const style of typeStyles(tokens)) {
    out.push(`  ${style.name}:`, `    fontFamily: ${quote(tokens.type.families[style.family])}`, `    fontSize: ${style.fontSize}`);
    if (style.fontWeight !== undefined) out.push(`    fontWeight: ${style.fontWeight}`);
    if (style.lineHeight !== undefined) out.push(`    lineHeight: ${style.lineHeight}`);
    if (style.letterSpacing !== undefined) out.push(`    letterSpacing: ${style.letterSpacing}`);
  }
  if (isList(tokens.radius)) out.push("rounded:", ...tokens.radius.tokens.map((t) => `  ${t.name}: ${t.value}`));
  if (isList(tokens.spacing)) out.push("spacing:", ...tokens.spacing.tokens.map((t) => `  ${t.name}: ${t.value}`));
  return `${out.join("\n")}\n`;
}

// Reads the token groups of DESIGN.md front matter: top-level keys with two levels of nesting.
function frontMatterGroups(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const groups = {};
  if (!match) return groups;
  let group = null;
  let item = null;
  for (const line of match[1].split(/\r?\n/)) {
    const top = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (top) { group = top[1]; item = null; groups[group] = top[2] ? null : {}; continue; }
    const second = line.match(/^ {2}([^\s:][^:]*):\s*(.*)$/);
    if (second && groups[group]) {
      item = second[1];
      groups[group][item] = second[2] ? unquote(second[2]) : {};
      continue;
    }
    const third = line.match(/^ {4}([^\s:][^:]*):\s*(.*)$/);
    if (third && groups[group] && item && typeof groups[group][item] === "object") groups[group][item][third[1]] = unquote(third[2]);
  }
  return groups;
}

function unquote(raw) {
  const value = raw.replace(/\s+#.*$/, "").trim();
  if (/^".*"$/.test(value)) return JSON.parse(value);
  if (/^'.*'$/.test(value)) return value.slice(1, -1);
  return value;
}

function checkDesignMdDrift(designText, tokens, findings) {
  const expected = frontMatterGroups(`---\n${designMdTokens(tokens)}---\n`);
  const actual = frontMatterGroups(designText);
  const add = (message) => findings.push({ file: "DESIGN.md", message: `${message}; regenerate the front matter with \`design-system design-md-tokens\`` });
  for (const group of ["colors", "typography", "rounded", "spacing"]) {
    const want = expected[group] || {};
    const have = actual[group] || {};
    for (const [name, value] of Object.entries(want)) {
      if (!(name in have)) { add(`${group}.${name} is in tokens.json but not in DESIGN.md`); continue; }
      const a = typeof value === "object" ? JSON.stringify(value) : String(value).toLowerCase();
      const b = typeof have[name] === "object" ? JSON.stringify(have[name]) : String(have[name]).toLowerCase();
      if (a !== b) add(`${group}.${name} differs from tokens.json`);
    }
    for (const name of Object.keys(have)) if (!(name in want)) add(`${group}.${name} is in DESIGN.md but not in tokens.json`);
  }
}

function resolveSystemDir(projectRoot, raw) {
  const dir = path.resolve(projectRoot, raw || DEFAULT_DIR);
  if (!pathIsInside(projectRoot, dir)) throw new Error("--system-dir resolves outside --project-root");
  return dir;
}

function checkDesignSystemPackage(options = {}) {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const dir = resolveSystemDir(projectRoot, options.systemDir);
  const rel = path.relative(projectRoot, dir).split(path.sep).join("/") || ".";
  if (!fs.existsSync(path.join(dir, "tokens.json"))) {
    return { schema: SCHEMA, status: "synthesis-required", projectRoot, systemDir: rel, findings: [{ file: "tokens.json", message: "no design-system package; write it during design synthesis (references/design-system-package.md)" }] };
  }
  const findings = [];
  let tokens = null;
  try {
    tokens = JSON.parse(readText(path.join(dir, "tokens.json")));
  } catch (error) {
    findings.push({ file: "tokens.json", message: `not valid JSON: ${error.message}` });
  }
  let contrast = [];
  if (tokens) {
    const { byName, themes } = validateTokens(tokens, findings);
    if (themes.length) contrast = checkContrast(tokens, byName, themes, findings);
  }
  checkReadme(dir, findings);
  const components = checkComponents(dir, findings);
  const designFile = path.resolve(projectRoot, options.designFile || "DESIGN.md");
  if (tokens && !findings.some((f) => f.file === "tokens.json") && fs.existsSync(designFile)) {
    checkDesignMdDrift(readText(designFile), tokens, findings);
  }
  return {
    schema: SCHEMA,
    status: findings.length ? "invalid" : "ready",
    projectRoot,
    systemDir: rel,
    components,
    contrast,
    findings,
    ...(tokens ? { tokensSha256: sha256Text(readText(path.join(dir, "tokens.json"))) } : {}),
  };
}

// Writes tokens.css and one standalone HTML per preview (tokens.css and bundle.css inlined, first
// theme set) so `composition capture` can render each preview without the artifact host.
function compileDesignSystemPackage(options = {}) {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const dir = resolveSystemDir(projectRoot, options.systemDir);
  const tokens = JSON.parse(readText(path.join(dir, "tokens.json")));
  const output = path.resolve(projectRoot, options.output);
  if (!pathIsInside(projectRoot, output)) throw new Error("--output resolves outside --project-root");
  const css = compileTokensCss(tokens);
  const bundleFile = path.join(dir, "components", "bundle.css");
  const bundle = fs.existsSync(bundleFile) ? readText(bundleFile) : "";
  fs.mkdirSync(path.join(output, "previews"), { recursive: true });
  fs.writeFileSync(path.join(output, "tokens.css"), css);
  const previews = [];
  const root = path.join(dir, "components");
  for (const entry of fs.existsSync(root) ? fs.readdirSync(root, { withFileTypes: true }) : []) {
    const preview = path.join(root, entry.name, "preview.html");
    if (!entry.isDirectory() || !fs.existsSync(preview)) continue;
    const style = `<style>\n${css}${bundle}</style>`.replace(/<\/(?!style>$)/g, "<\\/");
    let html = readText(preview).replace(/<html(\s|>)/i, `<html data-theme="${firstTheme(tokens)}"$1`);
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}\n${style}`) : `${style}\n${html}`;
    const file = path.join(output, "previews", `${entry.name}.html`);
    fs.writeFileSync(file, html);
    previews.push(path.relative(projectRoot, file).split(path.sep).join("/"));
  }
  return { status: "compiled", tokensCss: path.relative(projectRoot, path.join(output, "tokens.css")).split(path.sep).join("/"), previews: previews.sort() };
}

module.exports = {
  DEFAULT_DIR,
  SCHEMA,
  checkDesignSystemPackage,
  compileDesignSystemPackage,
  compileTokensCss,
  contrastRatio,
  designMdTokens,
  frontMatterGroups,
};

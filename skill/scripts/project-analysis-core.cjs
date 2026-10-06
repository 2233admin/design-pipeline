"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { fail, resolveInside, sha256 } = require("./contract-utils.cjs");
const { hashArtifactFile } = require("./artifact-core.cjs");

const LIMITS = Object.freeze({ files: 512, discovered: 10000, fileBytes: 262144, totalBytes: 8388608, evidence: 2048, queryMatches: 32, queryHops: 8, queryTerms: 16 });
const EXCLUDED_DIRECTORIES = new Set([".git", ".design-pipeline", "node_modules", "vendor", "upstream", "private", "secrets", "credentials", "dist", "build", "coverage", ".next", ".nuxt", ".cache"]);
const EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".vue", ".svelte", ".html", ".css", ".scss", ".less", ".glsl", ".frag", ".vert", ".wgsl", ".json", ".yaml", ".yml", ".md"]);
const CODE = new Set([".js", ".jsx", ".ts", ".tsx", ".cjs", ".mjs", ".vue", ".svelte", ".html", ".css", ".scss", ".less", ".glsl", ".frag", ".vert", ".wgsl"]);
const SOURCE_EXTENSIONS = ["", ".js", ".ts", ".jsx", ".tsx", ".mjs", ".cjs", ".vue", ".svelte", ".css", ".scss", ".glsl", ".frag", ".vert", ".wgsl", ".json"];

function excluded(relative) {
  const parts = relative.replaceAll("\\", "/").split("/");
  const name = parts.at(-1).toLowerCase();
  return parts.some(part => EXCLUDED_DIRECTORIES.has(part.toLowerCase()))
    || /^\.env(?:\.|$)/i.test(name) || /^(?:\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519)$/i.test(name)
    || /(?:^|[._-])(?:secrets?|credentials?)(?:[._-]|$)/i.test(name)
    || /\.(?:pem|key|p12|pfx)$/i.test(name)
    || /^(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/i.test(name);
}

function inspectProject(projectRoot, options = {}) {
  const root = fs.realpathSync.native(path.resolve(projectRoot));
  if (!fs.statSync(root).isDirectory()) fail("project inspect", "project root must be a directory");
  if (options.query !== undefined && typeof options.query !== "string") fail("project inspect", "query must be a string");
  const scope = options.scope === undefined ? ["."] : Array.isArray(options.scope) ? options.scope : [options.scope];
  if (!scope.length) fail("project inspect", "scope must not be empty");
  const scopes = scope.map(value => {
    if (typeof value !== "string" || !value.trim() || path.isAbsolute(value) || path.win32.isAbsolute(value)) fail("project inspect", "scope must be project-relative paths");
    const file = resolveInside(root, value, "scope", { scope: "project inspect", mustExist: true });
    const relative = path.relative(root, file).replaceAll("\\", "/") || ".";
    if (excluded(relative)) fail("project inspect", "scope points to an excluded private, secret or generated path");
    return { relative, file, directory: fs.statSync(file).isDirectory() };
  });
  const unknowns = [];
  let truncated = false;
  function unknown(code, detail, evidence = {}) {
    if (unknowns.length < LIMITS.evidence) unknowns.push({ code, detail, ...evidence });
    else {
      truncated = true;
      if ((code.endsWith("_LIMIT") || code.startsWith("QUERY_")) && !unknowns.some(item => item.code === code)) {
        const replace = unknowns.findLastIndex(item => !item.code.endsWith("_LIMIT") && !item.code.startsWith("QUERY_"));
        if (replace >= 0) unknowns[replace] = { code, detail, ...evidence };
      }
      if (!unknowns.some(item => item.code === "UNKNOWN_LIMIT")) unknowns.push({ code: "UNKNOWN_LIMIT", detail: `Unknown findings exceed ${LIMITS.evidence} records; narrow scope` });
    }
  }
  function limit(code, detail, evidence) { truncated = true; unknown(code, detail, evidence); }
  const insideScope = relative => scopes.some(item => item.relative === "." || relative === item.relative || item.directory && relative.startsWith(`${item.relative}/`));
  let candidates = [];
  let discoverySource = "git";
  try {
    const top = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], { encoding: "utf8", maxBuffer: 65536, timeout: 10000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }).trim();
    const gitRoot = fs.realpathSync.native(top);
    const sameRoot = process.platform === "win32" ? root.toLowerCase() === gitRoot.toLowerCase() : root === gitRoot;
    if (!sameRoot) {
      const error = new Error("Project is a nested directory of another Git repository");
      error.code = "GIT_ROOT_MISMATCH";
      throw error;
    }
    // Read tracked plus non-ignored new files; never inspect Git object contents or run project scripts.
    const listed = execFileSync("git", ["-C", root, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...scopes.map(item => `:(literal)${item.relative}`)], { encoding: "utf8", maxBuffer: 1048576, timeout: 10000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    candidates = [...new Set(listed.split("\0").filter(Boolean).map(file => file.replaceAll("\\", "/")))];
    if (candidates.length > LIMITS.discovered) {
      limit("DISCOVERY_LIMIT", `Git listed more than ${LIMITS.discovered} paths; narrow scope before claiming coverage`);
      candidates = candidates.slice(0, LIMITS.discovered);
    }
  } catch (error) {
    discoverySource = "directory";
    unknown(error.code === "GIT_ROOT_MISMATCH" ? "GIT_ROOT_MISMATCH" : "GIT_DISCOVERY_UNAVAILABLE", error.code === "GIT_ROOT_MISMATCH"
      ? "Project root is not its own Git worktree root; parent inventory was not used. Directory discovery applies explicit exclusions, not parent Git ignore rules."
      : "Git file discovery unavailable; directory discovery applies explicit exclusions and does not interpret Git ignore rules.");
    let visited = 0;
    function walk(directory) {
      if (truncated) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (++visited > LIMITS.discovered) { limit("DISCOVERY_LIMIT", `Directory discovery exceeded ${LIMITS.discovered} entries; narrow scope`); return; }
        const file = path.join(directory, entry.name);
        const relative = path.relative(root, file).replaceAll("\\", "/");
        if (excluded(relative) || entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) walk(file);
        else if (entry.isFile()) candidates.push(relative);
      }
    }
    for (const item of scopes) {
      if (item.directory) walk(item.file);
      else candidates.push(item.relative);
    }
  }
  candidates = [...new Set(candidates)].filter(file => insideScope(file) && !excluded(file) && EXTENSIONS.has(path.extname(file).toLowerCase()));
  // ponytail: bounded heuristic source reading; use an installed AST/code-intel adapter when alias or semantic resolution is required.
  candidates.sort((a, b) => {
    const rank = file => path.basename(file) === "package.json" ? 0 : /(?:^|\/)(?:index\.html|main\.[jt]sx?|index\.[jt]sx?|App\.[jt]sx?)$/.test(file) ? 1 : 2;
    return rank(a) - rank(b) || a.localeCompare(b);
  });
  const discovered = candidates.length;
  if (candidates.length > LIMITS.files) {
    limit("FILE_LIMIT", `${candidates.length} candidate files exceed the ${LIMITS.files}-file read budget; narrow scope`);
    candidates = candidates.slice(0, LIMITS.files);
  }
  const files = [];
  const content = new Map();
  let totalBytes = 0;
  for (const relative of candidates) {
    try {
      const file = resolveInside(root, relative, "source", { scope: "project inspect", mustExist: true });
      const stat = fs.statSync(file);
      if (!stat.isFile()) continue;
      if (stat.size > LIMITS.fileBytes) { limit("FILE_SIZE_LIMIT", `Source exceeds ${LIMITS.fileBytes} bytes and was not read`, { path: relative }); continue; }
      if (totalBytes + stat.size > LIMITS.totalBytes) { limit("TOTAL_SIZE_LIMIT", `Source read budget exceeds ${LIMITS.totalBytes} bytes`, { path: relative }); break; }
      const bytes = fs.readFileSync(file);
      const hash = hashArtifactFile(file);
      if (hash !== `sha256:${sha256(bytes)}`) { unknown("SOURCE_CHANGED", "Source changed during inspection; retry before using this evidence", { path: relative }); continue; }
      if (bytes.includes(0)) { unknown("BINARY_SOURCE_SKIPPED", "Candidate is binary and was not analyzed", { path: relative }); continue; }
      totalBytes += bytes.length;
      files.push({ path: relative, hash, bytes: bytes.length });
      const text = bytes.toString("utf8");
      content.set(relative, { text, hash, lines: text.split(/\r?\n/), offsets: [0, ...Array.from(text.matchAll(/\n/g), match => match.index + 1)] });
    } catch (error) { unknown("SOURCE_UNAVAILABLE", "Candidate disappeared or does not resolve to a contained readable file", { path: relative }); }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const entrypoints = [];
  const dependencies = [];
  const implementation = [];
  const packages = [];
  const commands = [];
  let evidenceCount = 0;
  const evidence = (relative, position = 0) => {
    const item = content.get(relative);
    let low = 0;
    let high = item.offsets.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (item.offsets[middle] <= position) low = middle;
      else high = middle;
    }
    const line = low + 1;
    return { path: relative, line, hash: item.hash, evidence: item.lines[low].trim().slice(0, 240) };
  };
  function add(target, value, cost = 1) {
    if (evidenceCount + cost > LIMITS.evidence) {
      if (!unknowns.some(item => item.code === "EVIDENCE_LIMIT")) limit("EVIDENCE_LIMIT", `Evidence exceeds ${LIMITS.evidence} records; narrow scope`);
      return false;
    }
    evidenceCount += cost;
    target.push(value);
    return true;
  }
  function resolveLocal(from, specifier) {
    const clean = specifier.split(/[?#]/, 1)[0];
    const raw = clean.startsWith("/") ? clean.slice(1) : path.join(path.dirname(from), clean);
    let resolved;
    try { resolved = resolveInside(root, raw, "import", { scope: "project inspect" }); } catch { return { target: null, status: "outside-project" }; }
    const relative = path.relative(root, resolved).replaceAll("\\", "/");
    if (excluded(relative)) return { target: null, status: "excluded" };
    const choices = [...SOURCE_EXTENSIONS.map(extension => `${relative}${extension}`), ...SOURCE_EXTENSIONS.filter(Boolean).map(extension => `${relative}/index${extension}`)];
    const target = choices.find(candidate => content.has(candidate));
    return target ? { target, status: "resolved" } : { target: null, status: "unresolved" };
  }
  function link(relative, position, specifier, kind) {
    const observed = evidence(relative, position);
    const local = kind.startsWith("html-") ? !/^(?:[a-z][\w+.-]*:|\/\/)/i.test(specifier) : specifier.startsWith(".") || specifier.startsWith("/");
    const resolution = local ? resolveLocal(relative, specifier) : { target: null, status: "external-or-alias" };
    add(dependencies, { ...observed, specifier, kind, ...resolution });
    if (resolution.status !== "resolved") unknown(local ? "LOCAL_IMPORT_UNRESOLVED" : "ALIAS_OR_PACKAGE_UNRESOLVED", local ? "Local source was not resolved within the inspected scope/budget" : "Package or alias is source evidence only; exports and installed runtime were not verified", { path: relative, line: observed.line, specifier, status: resolution.status });
    if (resolution.target && kind === "html-script") add(entrypoints, { ...evidence(resolution.target), reason: "html-script", via: observed });
  }
  for (const [relative, item] of content) {
    if (evidenceCount >= LIMITS.evidence) {
      if (!unknowns.some(entry => entry.code === "EVIDENCE_LIMIT")) limit("EVIDENCE_LIMIT", `Evidence exceeds ${LIMITS.evidence} records; narrow scope`);
      break;
    }
    const extension = path.extname(relative).toLowerCase();
    if (path.basename(relative) === "package.json") {
      try {
        const manifest = JSON.parse(item.text);
        const scripts = manifest.scripts && typeof manifest.scripts === "object" ? manifest.scripts : {};
        const dependencies = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies };
        add(packages, { ...evidence(relative), name: typeof manifest.name === "string" ? manifest.name : null, scripts, dependencies, workspace: manifest.workspaces || null });
        for (const [name, command] of Object.entries(scripts)) if (typeof command === "string") add(commands, { ...evidence(relative, item.text.indexOf(JSON.stringify(name))), name, command, execution: "not-run" });
        const exportPaths = [];
        function exported(value) {
          if (typeof value === "string") exportPaths.push(value);
          else if (value && typeof value === "object") for (const nested of Object.values(value)) exported(nested);
        }
        exported(manifest.exports);
        for (const field of ["main", "module", "browser"]) if (typeof manifest[field] === "string") exportPaths.push(manifest[field]);
        for (const candidate of [...new Set(exportPaths)]) {
          const resolved = resolveLocal(relative, candidate);
          if (resolved.target) add(entrypoints, { ...evidence(resolved.target), reason: "package-export", via: evidence(relative, item.text.indexOf(JSON.stringify(candidate))) });
          else unknown("PACKAGE_ENTRY_UNRESOLVED", "Declared package entry is not in inspected source; it may be generated or outside scope", { path: relative, specifier: candidate });
        }
      } catch { unknown("PACKAGE_JSON_INVALID", "Package manifest could not be parsed", { path: relative }); }
    }
    if (!CODE.has(extension)) continue;
    if (extension === ".html") {
      for (const match of item.text.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) link(relative, match.index, match[1], "html-script");
      for (const match of item.text.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)) link(relative, match.index, match[1], "html-link");
      add(entrypoints, { ...evidence(relative), reason: "html-document", confidence: "candidate" });
    }
    for (const match of item.text.matchAll(/\b(?:import|export)\s+(?:(?:[^;"']*?)\s+from\s*)?["']([^"']+)["']/g)) link(relative, match.index, match[1], "static-import");
    for (const match of item.text.matchAll(/\b(require|import)\s*\(\s*["']([^"']+)["']\s*\)/g)) link(relative, match.index, match[2], match[1] === "import" ? "dynamic-import" : "require");
    for (const match of item.text.matchAll(/\bimport\s*\(\s*(?!["'\s])[^)]*\)/g)) unknown("DYNAMIC_IMPORT_UNRESOLVED", "Dynamic import expression requires runtime or semantic inspection", evidence(relative, match.index));
    const signals = [
      ["component", /\b(?:export\s+(?:default\s+)?(?:function|class|const)\s+[A-Z]\w*|defineComponent|createRoot|createApp)\b|<template\b/],
      ["renderer", /\b(?:WebGLRenderer|WebGPURenderer|CanvasRenderer|createRenderer|createRoot|createApp|getContext)\b/],
      ["material", /\b(?:\w*Material|roughness|metalness|clearcoat|transmission|ior|fragmentShader|vertexShader)\b/],
      ["shader", /\b(?:gl_FragColor|gl_Position|uniform|varying|fragmentShader|vertexShader|ShaderMaterial|RawShaderMaterial)\b|@(?:fragment|vertex)/],
      ["animation", /\b(?:requestAnimationFrame|gsap|anime|useFrame|AnimationMixer|animate|useSpring|spring|keyframes)\b|@keyframes/],
      ["tokens", /--[a-z][\w-]*\s*:|\b(?:theme|designTokens|tokens)\b/],
    ];
    for (const [index, line] of item.lines.entries()) {
      if (evidenceCount >= LIMITS.evidence) { limit("EVIDENCE_LIMIT", `Evidence exceeds ${LIMITS.evidence} records; narrow scope`); break; }
      for (const [kind, pattern] of signals) if (pattern.test(line)) add(implementation, { ...evidence(relative, item.offsets[index]), kind, confidence: "candidate" });
    }
    if ([".glsl", ".frag", ".vert", ".wgsl"].includes(extension) && !implementation.some(record => record.path === relative && record.kind === "shader")) add(implementation, { ...evidence(relative), kind: "shader", confidence: "candidate" });
  }
  if (!entrypoints.length) unknown("ENTRYPOINT_NOT_IDENTIFIED", "No HTML script or declared package entry was found; inspect the app/router config explicitly");
  if (!files.length) unknown("NO_SOURCE_READ", "No supported source files were read; this report cannot establish repository understanding. Check source root or narrow exclusions.");
  let queryResults;
  if (options.query?.trim()) {
    const allTerms = [...new Set(Array.from(options.query.toLowerCase().matchAll(/[\p{Script=Han}]+|[a-z0-9_$]+(?:[.-][a-z0-9_$]+)*/gu), match => match[0]))];
    const terms = allTerms.slice(0, LIMITS.queryTerms);
    if (allTerms.length > terms.length) limit("QUERY_TERM_LIMIT", `Query exceeds ${LIMITS.queryTerms} literal terms; shorten the query`);
    const matches = [];
    const connections = [];
    let found = false;
    search: for (const [relative, item] of content) {
      for (const [index, line] of item.lines.entries()) {
        const matchedTerms = terms.filter(term => line.toLowerCase().includes(term));
        if (!matchedTerms.length) continue;
        found = true;
        if (matches.length >= LIMITS.queryMatches) { limit("QUERY_MATCH_LIMIT", `Query exceeds ${LIMITS.queryMatches} matching lines; narrow the source scope or query`); break search; }
        if (!add(matches, { ...evidence(relative, item.offsets[index]), matchedTerms, implementationKinds: implementation.filter(record => record.path === relative && record.line === index + 1).map(record => record.kind) })) {
          limit("QUERY_EVIDENCE_LIMIT", "No shared evidence budget remains for additional source matches; narrow the scope");
          break search;
        }
      }
    }
    if (!found) unknown(terms.length ? "QUERY_NO_MATCH" : "QUERY_NO_TERMS", terms.length ? "No literal source-line matches in the inspected scope; this does not prove the implementation is absent" : "Query contains no supported literal terms");
    const edges = dependencies.filter(edge => edge.status === "resolved" && content.has(edge.path) && content.has(edge.target));
    const outgoing = new Map();
    for (const edge of edges) {
      if (!outgoing.has(edge.path)) outgoing.set(edge.path, []);
      outgoing.get(edge.path).push(edge);
    }
    const primaryEntries = entrypoints.filter(entry => ["html-document", "package-export"].includes(entry.reason));
    const entries = primaryEntries.length ? primaryEntries : entrypoints;
    const connected = new Set();
    const point = record => ({ path: record.path, line: record.line, hash: record.hash, evidence: record.evidence });
    function connect(relation, from, to, chain) {
      const key = `${relation}:${from.path}:${to.path}:${chain.map(edge => `${edge.path}:${edge.line}`).join(",")}`;
      if (connected.has(key)) return;
      connected.add(key);
      // References are counted against the same report budget, even when an import edge is reused.
      if (!add(connections, { relation, from: point(from), to: point(to), edges: chain }, 3 + chain.length)) {
        limit("QUERY_EVIDENCE_LIMIT", "No shared evidence budget remains for additional import relationships; narrow the scope");
      }
    }
    for (const relative of new Set(matches.map(match => match.path))) {
      const match = matches.find(record => record.path === relative);
      const queue = entries.map(entry => ({ entry, path: entry.path, chain: [] }));
      const visited = new Set(queue.map(node => node.path));
      let route = null;
      let hopLimit = false;
      for (let index = 0; index < queue.length; index++) {
        const node = queue[index];
        if (node.path === relative) { route = node; break; }
        for (const edge of outgoing.get(node.path) || []) {
          if (visited.has(edge.target)) continue;
          if (node.chain.length >= LIMITS.queryHops) { hopLimit = true; continue; }
          visited.add(edge.target);
          queue.push({ entry: node.entry, path: edge.target, chain: [...node.chain, edge] });
        }
      }
      if (route) connect("entrypoint-to-match", route.entry, match, route.chain);
      else {
        unknown("QUERY_ENTRY_UNREACHABLE", "No entry-to-match path was established in the observed resolved import graph", point(match));
        if (hopLimit) limit("QUERY_HOP_LIMIT", `Entry relationship search stops after ${LIMITS.queryHops} import edges; inspect an intermediate scope`, point(match));
      }
      for (const edge of outgoing.get(relative) || []) connect("match-dependency", match, evidence(edge.target), [edge]);
      for (const edge of edges.filter(record => record.target === relative)) connect("match-dependent", edge, match, [edge]);
    }
    queryResults = { method: "literal-source-terms", terms, matches, connections, limits: { matches: LIMITS.queryMatches, hops: LIMITS.queryHops, terms: LIMITS.queryTerms, evidence: LIMITS.evidence }, semantics: "Lexical source matches and observed import relationships; runtime calls and object semantics are not verified." };
  }
  const nextActions = ["Read the named entrypoints and dependency edges before changing a component; candidate matches are not verified semantics.", "Confirm renderer, material and animation responsibilities against the cited source lines; do not infer a runtime from filenames alone."];
  if (queryResults?.matches.length) nextActions.unshift("Read queryResults source matches and their entry/import connections; confirm responsibility before changing the named implementation.");
  if (truncated) nextActions.unshift("Repeat project inspect with a narrower source/package scope; current evidence does not cover the whole repository.");
  if (unknowns.some(item => ["ALIAS_OR_PACKAGE_UNRESOLVED", "DYNAMIC_IMPORT_UNRESOLVED"].includes(item.code))) nextActions.push("Inspect resolver/tsconfig aliases and dynamic imports, or use an installed code-intel adapter; no project script was executed.");
  return {
    status: !files.length || truncated || unknowns.some(item => ["SOURCE_UNAVAILABLE", "SOURCE_CHANGED"].includes(item.code)) ? "partial" : "observed",
    projectRoot: ".", method: "bounded-static-heuristic", query: options.query || null,
    scope: scopes.map(item => item.relative),
    discovery: { source: discoverySource, ignoreRules: discoverySource === "git" ? "git-standard" : "explicit-exclusions-only", limits: LIMITS, counts: { candidates: discovered, read: files.length, bytes: totalBytes }, truncated, exclusions: [...EXCLUDED_DIRECTORIES, ".env*", "credential files", "lockfiles", "binary files"] },
    files, entrypoints, dependencies, implementation, packages, commands, unknowns, nextActions, ...(queryResults ? { queryResults } : {}),
    componentConformance: "not-evaluated", visualAcceptance: "not-evaluated",
  };
}

module.exports = { inspectProject, LIMITS };

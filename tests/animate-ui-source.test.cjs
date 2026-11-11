"use strict";

// Animate UI as a component source (change animate-ui-source, #375): the catalog record, its
// provenance, search and routing, the guide, and the pinned upstream inventory it is held against.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { readLock } = require("../scripts/sources-lock.cjs");
const { FIXTURE, FIXTURE_SCHEMA, LOCK_ID } = require("../scripts/refresh-animate-ui-fixture.cjs");
const { routeComponents } = require("../skill/scripts/component-route-core.cjs");
const { CAPABILITY_TERMS, normalizeDesignSystemSnapshot, searchCatalog } = require("../skill/scripts/design-system-catalog-core.cjs");
const { resolveFrontendStack, validateRegistry } = require("../skill/scripts/frontend-stack-core.cjs");

const repoRoot = path.resolve(__dirname, "..");
const skillRoot = path.join(repoRoot, "skill");
const references = path.join(skillRoot, "references");
const cli = path.join(skillRoot, "scripts", "designer-pipeline.cjs");
const read = (relative) => fs.readFileSync(path.join(repoRoot, relative), "utf8");
const readJson = (relative) => JSON.parse(read(relative));

const RECORD = "animate-ui/components";
const SOURCE = "source/imskyleen/animate-ui";
const RECORD_ID = `frontend-component-sources:component:${RECORD}`;
const GUIDE = "skill/references/animate-ui.md";
const SITE = "https://animate-ui.com";
// Listed upstream among the primitives but not a component: a re-exported composition helper.
const NOT_LISTED = new Set(["slot"]);

const snapshot = readJson("skill/references/component-source-catalog.json");
const fixture = readJson(FIXTURE);
const record = snapshot.components.find((entry) => entry.id === RECORD);
const source = snapshot.docs.find((entry) => entry.id === SOURCE);
const inventory = record?.routing.componentInventory || [];
const catalog = () => normalizeDesignSystemSnapshot(JSON.parse(JSON.stringify(snapshot)));
const without = () => normalizeDesignSystemSnapshot({
  ...JSON.parse(JSON.stringify(snapshot)),
  components: snapshot.components.filter((entry) => entry.id !== RECORD),
  docs: snapshot.docs.filter((entry) => entry.id !== SOURCE),
});
const short = (id) => id.split(":").pop();

function search(query, extra = []) {
  const run = spawnSync(process.execPath, [cli, "design-system", "search", "--root", skillRoot, "--snapshot", "references/component-source-catalog.json", "--query", query, "--json", ...extra], { cwd: os.tmpdir(), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  assert.equal(run.status, 0, `${query}: ${run.stdout}\n${run.stderr}`);
  return JSON.parse(run.stdout).results.map((entry) => short(entry.id));
}

test("the lock, the pinned inventory, the guide and the catalog record name one upstream revision", () => {
  const locked = readLock(repoRoot).sources.find((entry) => entry.id === LOCK_ID);
  assert.ok(locked, "sources.lock.json needs the animate-ui entry");
  assert.equal(locked.kind, "adapted-reference");
  assert.equal(locked.repo, "https://github.com/imskyleen/animate-ui");
  assert.match(locked.revision, /^[0-9a-f]{40}$/);
  assert.deepEqual(locked.documents, [GUIDE]);
  assert.equal(fixture.schema, FIXTURE_SCHEMA);
  // After a weekly bump moves the lock, this fails until scripts/refresh-animate-ui-fixture.cjs
  // pins the new upstream inventory and the catalog record follows it.
  assert.equal(fixture.source.revision, locked.revision, "run scripts/refresh-animate-ui-fixture.cjs --checkout <clone>");
  assert.equal(record.provenance.revision, locked.revision);
  assert.ok(record.provenance.sourceCode.includes(locked.revision));
  const guide = read(GUIDE);
  assert.ok(guide.includes(`reviewedRevision: ${locked.revision}`));
  assert.match(guide, /^ {2}license: LicenseRef-MIT-Commons-Clause$/m);
  assert.match(guide, /^ {2}useBoundary: reference-only/m);
});

test("the licence is recorded as MIT with the Commons Clause and no component source ships", () => {
  for (const entry of [record, source]) {
    assert.equal(entry.sourceId, "imskyleen/animate-ui");
    assert.equal(entry.license.state, "verified");
    assert.equal(entry.license.id, "LicenseRef-MIT-Commons-Clause");
    assert.equal(entry.provenance.license, "MIT + Commons Clause");
    assert.match(entry.licenseScope, /Commons Clause/);
    assert.match(entry.licenseScope, /never plain MIT/);
    assert.equal(entry.availability, "reference-link");
    assert.deepEqual(entry.localPaths, { guide: "references/animate-ui.md" });
  }
  assert.match(record.provenance.licenseNotice, /do not sell or redistribute the components/i);
  assert.equal(fs.existsSync(path.join(skillRoot, "vendor", "animate-ui")), false, "upstream component source must not be bundled");
  const resources = readJson("skill/references/package-resources.json");
  assert.ok(resources.required.includes("references/animate-ui.md"));
  assert.equal(resources.required.some((file) => /vendor\/animate-ui/.test(file)), false);
  assert.match(read("THIRD_PARTY_NOTICES.md"), /imskyleen\/animate-ui[\s\S]{0,400}MIT \+ Commons Clause/);
});

test("the inventory lists every upstream primitive and registry item at the pinned revision", () => {
  const missing = [];
  for (const [library, names] of Object.entries(fixture.primitives.dropIn)) {
    for (const name of names) {
      const item = inventory.find((candidate) => candidate.category === "drop-in" && candidate.name === name);
      if (!item || !item.bases.includes(library)) missing.push(`${library}/${name}`);
    }
  }
  for (const key of fixture.primitives.own) {
    if (NOT_LISTED.has(key)) continue;
    if (!inventory.some((item) => item.import === `@animate-ui/react/primitives/${key}`)) missing.push(key);
  }
  for (const [group, prefix] of [["backgrounds", "backgrounds-"], ["buttons", "buttons-"], ["components", "components-"]]) {
    for (const name of fixture.registry[group]) {
      if (!inventory.some((item) => item.registry === `@animate-ui/${prefix}${name}`)) missing.push(`registry ${prefix}${name}`);
    }
  }
  assert.deepEqual(missing, [], `upstream items missing from ${RECORD}:\n${missing.join("\n")}`);

  // And nothing the pinned revision does not have.
  const extra = [];
  for (const item of inventory) {
    if (item.category === "drop-in") {
      for (const library of item.bases) if (!fixture.primitives.dropIn[library]?.includes(item.name)) extra.push(`${library}/${item.name}`);
    } else if (item.import) {
      if (!fixture.primitives.own.includes(item.import.replace("@animate-ui/react/primitives/", ""))) extra.push(item.import);
    } else if (item.category !== "icon") {
      const [group, ...rest] = item.registry.replace("@animate-ui/", "").split("-");
      if (!fixture.registry[group]?.includes(rest.join("-"))) extra.push(item.registry);
    }
  }
  assert.deepEqual(extra, [], `items upstream does not have:\n${extra.join("\n")}`);

  const icons = Object.fromEntries(inventory.filter((item) => item.category === "icon").map((item) => [item.name, item.count]));
  assert.deepEqual(icons, { hugeicons: fixture.registry.icons.hugeicons, "lucide-icons": fixture.registry.icons.lucide });
  assert.equal(record.routing.componentCount, inventory.length);
  assert.deepEqual(record.alignment.peers.react, fixture.packages.react.peerDependencies);
  assert.deepEqual(record.alignment.peers.vue, fixture.packages.vue.peerDependencies);
  assert.deepEqual(record.alignment.cli, { package: fixture.packages.cli.name, commands: fixture.packages.cli.commands });
  assert.equal(record.routing.package, fixture.packages.react.name);
  for (const command of fixture.packages.cli.commands) assert.match(read(GUIDE), new RegExp(`@animate-ui/cli@latest ${command}\\b`), `guide must show the ${command} command`);
});

test("every inventory item can be found, installed and looked up", () => {
  const names = inventory.map((item) => item.name);
  assert.equal(new Set(names).size, names.length, "inventory names must be unique");
  for (const item of inventory) {
    const label = `${RECORD} ${item.name}`;
    for (const key of ["displayName", "category", "description"]) assert.ok(typeof item[key] === "string" && item[key].trim(), `${label}: ${key}`);
    assert.ok(Array.isArray(item.tags) && item.tags.some((tag) => /[a-z]/i.test(tag)) && item.tags.some((tag) => /[㐀-鿿]/.test(tag)), `${label}: tags need an English and a Chinese keyword`);
    assert.ok(item.dependencies.includes("@animate-ui/react") && item.dependencies.includes("motion"), `${label}: dependencies`);
    assert.ok(Boolean(item.import) !== Boolean(item.registry), `${label}: exactly one of import or registry`);
    if (item.import) {
      assert.match(item.import, /^@animate-ui\/react\/primitives\//, label);
      assert.equal(item.installCommand, "npm install @animate-ui/react motion", label);
      assert.equal(item.hasReducedMotion, true, label);
    } else {
      assert.match(item.registry, /^@animate-ui\/[a-z0-9<>-]+$/, label);
      assert.equal(item.installCommand, `npx shadcn@latest add ${item.registry}`, label);
      assert.equal(item.registryUrl, `${SITE}/r/${item.registry.replace("@animate-ui/", "")}.json`, label);
    }
    if (item.docUrl !== undefined) assert.ok(item.docUrl.startsWith(`${SITE}/docs/`), `${label}: docUrl`);
    else assert.equal(item.category, "drop-in", `${label}: only a drop-in without its own upstream page may omit docUrl`);
  }
  assert.deepEqual(Object.keys(record.routing.recommendations).sort(), [...record.routing.capabilities].sort(), "every advertised capability recommends components");
  for (const [capability, list] of Object.entries(record.routing.recommendations)) {
    assert.ok(Object.hasOwn(CAPABILITY_TERMS, capability), `${capability} is not a known capability`);
    for (const name of list) assert.ok(names.includes(name), `${capability} recommends ${name}, which is not in the inventory`);
  }
  assert.deepEqual(record.routing.recommendations["animate-ui"], names);
});

test("design-system search finds the source and the component record in English and Chinese", () => {
  const byName = search("animate-ui");
  assert.ok(byName.includes(SOURCE), byName.join(", "));
  assert.ok(byName.includes(RECORD), byName.join(", "));
  for (const query of ["Animate UI", "动效基元", "页面转场", "数字滚动", "动态背景", "给 shadcn 组件加动效", "@animate-ui/react"]) {
    assert.ok(search(query).includes(RECORD), `${query} must find ${RECORD}`);
  }
  assert.ok(search("animate-ui", ["--platform", "web"]).includes(RECORD));
  const found = searchCatalog(catalog(), { query: "sliding number" }).find((entry) => entry.id === RECORD_ID);
  assert.equal(found.routing.componentInventory.find((item) => item.name === "sliding-number").import, "@animate-ui/react/primitives/texts/sliding-number");
});

test("a brief that names animate-ui is routed to it with the package, install command and imports", () => {
  const result = routeComponents({ catalog: catalog(), brief: "animate-ui animated tabs", platform: "web" });
  assert.equal(result.status, "ready");
  assert.ok(result.capabilities.includes("animate-ui"));
  const tabs = result.routes.find((route) => route.capability === "tabs");
  assert.equal(tabs.selected.id, RECORD_ID);
  assert.equal(tabs.selected.status, "ready");
  assert.equal(tabs.selected.mode, "package");
  assert.equal(tabs.selected.package, "@animate-ui/react");
  assert.equal(tabs.selected.install, "npm install @animate-ui/react motion");
  assert.equal(tabs.selected.licenseEvidence.id, "LicenseRef-MIT-Commons-Clause");
  assert.match(tabs.selected.licenseNotice, /redistribut/i);
  const dropIn = tabs.selected.recommendedComponentDetails.find((item) => item.name === "tabs");
  assert.equal(dropIn.import, "@animate-ui/react/primitives/<base>/tabs");
  assert.deepEqual(dropIn.bases, ["radix-ui", "base-ui", "react-aria"]);
  assert.equal(dropIn.docUrl, `${SITE}/docs/primitives/radix-ui/tabs`);
  const own = tabs.selected.recommendedComponentDetails.find((item) => item.name === "animate-ui-tabs");
  assert.equal(own.import, "@animate-ui/react/primitives/tabs");

  // Named in a Chinese sentence, with a capability another route owns by default (web numerics).
  const mixed = routeComponents({ catalog: catalog(), brief: "用 animate ui 做 dialog 和 animated counter", platform: "web" });
  for (const capability of ["dialog", "numeric-content-transition"]) {
    assert.equal(mixed.routes.find((route) => route.capability === capability).selected.id, RECORD_ID, capability);
  }
  const registry = routeComponents({ catalog: catalog(), brief: "animateui animated background", platform: "web" }).routes.find((route) => route.capability === "animated-background");
  assert.equal(registry.selected.id, RECORD_ID);
  assert.ok(registry.selected.recommendedComponentDetails.every((item) => /^npx shadcn@latest add @animate-ui\/backgrounds-/.test(item.install)));
});

test("a brief that does not name it keeps its route and lists animate-ui as an alternative", () => {
  assert.equal(record.routing.selectWhenNamed, true);
  const before = without();
  const after = catalog();
  const select = (index, capability) => {
    const route = routeComponents({ catalog: index, brief: "x", capabilities: [capability], platform: "web" }).routes[0];
    return route.selected ? `${short(route.selected.id)} ${route.status}` : "blocked";
  };
  const changed = Object.keys(CAPABILITY_TERMS).filter((capability) => select(before, capability) !== select(after, capability));
  assert.deepEqual(changed, ["animate-ui"], "adding the source must not change any other default route");

  const tabs = routeComponents({ catalog: after, brief: "animated tabs", platform: "web" }).routes.find((route) => route.capability === "tabs");
  assert.equal(short(tabs.selected.id), "smoothui/components");
  assert.equal(short(tabs.alternatives[0].id), RECORD, "listed first among the alternatives, at its score");

  // Another named source still wins its own brief.
  const smooth = routeComponents({ catalog: after, brief: "SmoothUI animated tabs and magnetic button", platform: "web" });
  for (const capability of ["tabs", "button"]) assert.equal(short(smooth.routes.find((route) => route.capability === capability).selected.id), "smoothui/components");

  // Web numerics stay on the platform fallback unless the source is named.
  const numeric = routeComponents({ catalog: after, brief: "animated numeric stat", platform: "web" });
  assert.ok(numeric.routes.filter((route) => route.selected).every((route) => short(route.selected.id) === "native/dom-numeric-transition"));
  // The record is web only.
  assert.equal(routeComponents({ catalog: after, brief: "animate-ui tabs", platform: "expo" }).status, "blocked");
});

test("selectWhenNamed orders candidates and does not withhold a route", () => {
  // A snapshot where the marked record is the only one for a capability: nothing to yield to.
  const only = normalizeDesignSystemSnapshot({ ...JSON.parse(JSON.stringify(snapshot)), components: snapshot.components.filter((entry) => entry.id === RECORD) });
  const result = routeComponents({ catalog: only, brief: "animated tabs", platform: "web" });
  const tabs = result.routes.find((route) => route.capability === "tabs");
  assert.equal(tabs.selected.id, RECORD_ID);
  assert.equal(tabs.status, "ready");
  assert.deepEqual(tabs.alternatives, []);
  assert.equal(result.unavailable, undefined);
  // With an unmarked record present, the marked one never leads, whatever the scores.
  const two = JSON.parse(JSON.stringify(snapshot));
  two.components = two.components.filter((entry) => [RECORD, "shadcn/ui"].includes(entry.id));
  const pair = routeComponents({ catalog: normalizeDesignSystemSnapshot(two), brief: "tabs", platform: "web" }).routes.find((route) => route.capability === "tabs");
  assert.equal(short(pair.selected.id), "shadcn/ui");
  assert.equal(pair.status, "review");
  assert.deepEqual(pair.alternatives.map((entry) => short(entry.id)), [RECORD]);
});

test("selectWhenNamed must be boolean", () => {
  const broken = JSON.parse(JSON.stringify(snapshot));
  broken.components.find((entry) => entry.id === RECORD).routing.selectWhenNamed = "yes";
  assert.throws(() => routeComponents({ catalog: normalizeDesignSystemSnapshot(broken), brief: "tabs", platform: "web" }), /selectWhenNamed must be boolean/);
});

test("a brief that names animate-ui surfaces the governed tool route, and an ordinary brief does not", () => {
  const registry = readJson("skill/references/frontend-stack-registry.json");
  const skills = readJson("skill/references/mengto-skills-catalog.json");
  validateRegistry(registry);
  const request = (brief) => resolveFrontendStack({ schema: "design-pipeline.frontend-stack-request.v1", framework: "react", brief, requested: {} }, registry, skills);
  assert.ok(request("Use animate-ui for the settings dialog").toolRoutes.some((route) => route.id === "imskyleen/animate-ui" && route.status === "review"));
  assert.equal(request("Build a dashboard").toolRoutes.some((route) => route.id === "imskyleen/animate-ui"), false);
});

test("the guide covers the upstream skill's ground and the routing documents reach it", () => {
  const guide = read(GUIDE);
  for (const heading of ["When to use it", "Find a component", "Pick the path", "Install", "Use it beside existing shadcn/ui components", "Components", "Drop-in primitives", "Entrances and scroll reveals", "Numbers", "Changing text", "Press and button feedback", "Shared highlight and layout", "Pointer effects", "Page and theme transitions", "Backgrounds and icons", "Reduced motion", "Pace", "Review existing motion", "Migrate from v1", "Vue", "What the upstream skill does and where it is here", "Verify", "Keeping it current"]) {
    assert.match(guide, new RegExp(`^#{2,3} ${heading.replace(/[/.]/g, "\\$&")}$`, "m"), `guide needs the section "${heading}"`);
  }
  assert.match(guide, /do not\s+copy component source/i);
  assert.match(guide, /prefers-reduced-motion/);
  assert.match(guide, /inset-0 m-auto h-fit/);
  assert.match(guide, /--dry-run/);
  // The peer majors the guide states are the ones the pinned package declares.
  const major = (range) => range.match(/\d+/)[0];
  assert.ok(guide.includes(`React ${major(fixture.packages.react.peerDependencies.react)} and Motion ${major(fixture.packages.react.peerDependencies.motion)}`));
  // Every packaged guide it links to exists.
  for (const [, target] of guide.matchAll(/\]\(([a-z0-9-]+\.md)(?:#[^)]*)?\)/g)) assert.ok(fs.existsSync(path.join(references, target)), `guide links to a missing file ${target}`);

  for (const file of ["skill/SKILL.md", "skill/references/companion-skills.md", "skill/references/capability-routing.md", "skill/references/feature-routes.md", "skill/references/pipeline-reference.md", "skill/references/ui-craft-sources.md"]) {
    assert.match(read(file), /animate-ui\.md/, `${file} must route to the guide`);
  }
});

test("vocabulary terms that Animate UI ships link to the guide section that has them", () => {
  const vocabulary = readJson("skill/references/motion-vocabulary.json");
  const linked = (id) => vocabulary.terms.find((term) => term.id === id).local.guides.filter((reference) => reference.startsWith("references/animate-ui.md#"));
  assert.deepEqual(linked("number-ticker"), ["references/animate-ui.md#numbers"]);
  assert.deepEqual(linked("text-morph"), ["references/animate-ui.md#changing-text"]);
  assert.deepEqual(linked("page-transition"), ["references/animate-ui.md#page-and-theme-transitions"]);
  assert.deepEqual(linked("reduced-motion"), ["references/animate-ui.md#reduced-motion"]);
  // Terms with nothing matching here stay unlinked.
  for (const id of ["marquee", "parallax", "line-drawing"]) assert.deepEqual(linked(id), [], id);
  assert.ok(vocabulary.terms.filter((term) => term.local.guides.some((reference) => reference.startsWith("references/animate-ui.md#"))).length >= 15);
});

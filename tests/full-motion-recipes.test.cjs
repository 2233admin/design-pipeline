"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const helper = require("../skill/tools/motion-recipes/full/build-data.cjs");
const gallery = require("../skill/tools/motion-recipes/full/gallery.js");
const catalog = require("../skill/scripts/design-system-catalog-core.cjs");
const root = path.resolve(__dirname, "../skill");
function inputs() { return helper.loadInputs(root); }
function mutate(change) {
  const value = inputs();
  change(value);
  return () => helper.validateCoverage(value.snapshot, value.inventory, value.modules);
}
function first(snapshot) { return snapshot.docs.find(row => row.id.startsWith("motion-reference/")); }

test("canonical projection retains complete independent source membership", () => {
  const { snapshot, inventory, modules } = inputs();
  const records = helper.projectData(snapshot, inventory, modules);
  assert.equal(records.length, 782);
  assert.equal(new Set(inventory.items.map(row => row.id)).size, 782);
  assert.equal(new Set(inventory.items.map(row => row.category)).size, 64);
  assert.deepEqual(records.map(row => row.id).sort(), inventory.items.map(row => row.id).sort());
});

test("coverage rejects actual missing, extra and duplicate catalogue IDs", () => {
  assert.throws(mutate(({ snapshot }) => { snapshot.docs.splice(snapshot.docs.indexOf(first(snapshot)), 1); }), /missing catalogue variants/);
  assert.throws(mutate(({ snapshot }) => { const record = structuredClone(first(snapshot)); record.id = "motion-reference/not-an-inventory-item"; snapshot.docs.push(record); }), /not-an-inventory-item: extra catalogue variant/);
  assert.throws(mutate(({ snapshot }) => { snapshot.docs.push(structuredClone(first(snapshot))); }), /duplicate catalogue variant/);
  assert.throws(mutate(({ inventory }) => { inventory.items.push(structuredClone(inventory.items[0])); }), /duplicate or absent inventory ID/);
  assert.throws(mutate(({ inventory }) => { inventory.items[0].category = "unobserved-category"; }), /unassigned category/);
  assert.throws(mutate(({ inventory }) => { inventory.counts.finalUniqueCount += 1; }), /declared unique count/);
  assert.throws(mutate(({ inventory }) => { inventory.countProof.categorySets[0].ids[0] = "another-exact-id"; }), /independent category identity mismatch/);
});

test("coverage rejects descriptor, variant, ownership and complete parameter mismatches", () => {
  assert.throws(mutate(({ snapshot }) => { first(snapshot).motionRecipe.recipeId = "basic.nonexistent-mechanism"; }), /descriptor\/group mismatch|unsupported descriptor/);
  assert.throws(mutate(({ snapshot }) => { first(snapshot).motionRecipe.variantId = "another-exact-id"; }), /variant ID mismatch/);
  assert.throws(mutate(({ snapshot }) => { first(snapshot).sourceId = "another-owner"; }), /invalid canonical method ownership/);
  assert.throws(mutate(({ snapshot }) => { first(snapshot).motionRecipe.parameters = {}; }), /unsupported parameters/);
  assert.throws(mutate(({ snapshot }) => { first(snapshot).motionRecipe.parameters.unsupportedAuthorParameter = true; }), /unsupported parameters/);
  assert.throws(mutate(({ snapshot }) => { first(snapshot).motionRecipe.studyDurationMs = 0; }), /invalid study duration/);
  assert.throws(mutate(({ snapshot }) => {
    const record = snapshot.docs.find(row => row.motionRecipe?.recipeId === "text.japanese-ime");
    record.motionRecipe.parameters.candidates = ["朝"];
    record.motionRecipe.parameters.selected = 1;
  }), /tx-ime-conversion: unsupported parameters.*selected/);
});

test("exact selection preserves actual parameters and never substitutes a filtered match", () => {
  const { snapshot, inventory, modules } = inputs();
  const records = helper.projectData(snapshot, inventory, modules);
  const record = records.find(row => Object.keys(row.motionRecipe.parameters).length > 0);
  const original = structuredClone(record.motionRecipe.parameters);
  const selected = gallery.resolveSelection(records, modules, record.id);
  assert.equal(selected.record.motionRecipe.parameters, record.motionRecipe.parameters);
  assert.deepEqual(record.motionRecipe.parameters, original);
  assert.equal(gallery.idFromHash(`#motion=${encodeURIComponent(record.id)}`), record.id);
  assert.equal(gallery.idFromHash(""), null);
  assert.throws(() => gallery.resolveSelection(records, modules, `${record.id}-typo`), /unknown exact variant/);
  assert.throws(() => gallery.resolveSelection([...records, record], modules, record.id), /duplicate\/ambiguous variant/);
  assert.throws(() => gallery.idFromHash("#motion=%broken"), /Malformed/);
  assert.throws(() => gallery.idFromHash("#motion="), /Invalid/);
  assert.throws(() => gallery.idFromHash("#another=value"), /Invalid/);
  const wrong = structuredClone(record);
  wrong.motionRecipe.variantId = "wrong";
  assert.throws(() => gallery.resolveSelection([wrong], modules, record.id), /variant ID mismatch/);
  wrong.motionRecipe.variantId = record.id;
  wrong.motionRecipe.parameters.unsupportedAuthorParameter = true;
  assert.throws(() => gallery.resolveSelection([wrong], modules, record.id), new RegExp(record.id));
});

test("bilingual filtered discovery inherits existing documentation and component-only behavior", () => {
  const { snapshot, inventory, modules } = inputs();
  const records = helper.projectData(snapshot, inventory, modules);
  const normalized = catalog.normalizeSnapshot(snapshot);
  for (const group of helper.GROUPS) {
    const record = records.find(row => row.motionRecipe.group === group);
    for (const query of [record.id, record.name.zh, record.name.en]) {
      assert.ok(gallery.filterRecords(records, { query, group, category: record.category }).some(row => row.id === record.id));
      const found = catalog.searchCatalog(normalized, { kind: "doc", query });
      assert.ok(found.some(row => row.localId === `motion-reference/${record.id}`));
    }
    assert.equal(gallery.filterRecords(records, { query: record.id, group: helper.GROUPS.find(value => value !== group) }).length, 0);
    assert.equal(catalog.searchCatalog(normalized, { kind: "doc", query: record.id, platform: "web" }).length, 0);
  }
  for (const slug of ["hp-ghost-bar", "cooldown-completion", "reward-arrival", "menu-switch"]) {
    const record = snapshot.docs.find(row => row.id === `motion-recipe/${slug}`);
    assert.ok(record);
    assert.ok(fs.statSync(path.join(root, record.localPaths.implementation)).isFile());
    assert.equal(catalog.searchCatalog(normalized, { kind: "doc", query: slug, platform: "web" }).length, 0);
  }
});

test("offline browser exact selection, filter persistence, playback and error recovery", { timeout: 120_000 }, async t => {
  const { pathToFileURL } = require("node:url");
  const { resolveChrome, resolvePuppeteer } = require("../skill/scripts/film-capture-core.cjs");
  let browser;
  try {
    browser = await resolvePuppeteer(path.dirname(root)).launch({ executablePath: resolveChrome(), headless: true });
  } catch (error) {
    if (error.code !== "TOOL_MISSING") throw error;
    t.skip(error.message);
    return;
  }
  t.after(() => browser.close());
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()); });
  const { snapshot, inventory, modules } = inputs();
  const records = helper.projectData(snapshot, inventory, modules);
  const target = records.find(row => row.motionRecipe.group === "basic");
  const url = pathToFileURL(path.join(root, "tools/motion-recipes/full/index.html")).href;
  await page.goto(`${url}#motion=${encodeURIComponent(target.id)}`);
  await page.waitForFunction(id => document.getElementById("variant").value === id, {}, target.id);
  assert.equal(await page.$eval("#stage", el => el.dataset.recipe), target.motionRecipe.recipeId);
  assert.deepEqual(await page.$eval("#parameters", el => JSON.parse(el.textContent)), target.motionRecipe.parameters);
  await page.$eval("#search", el => { el.value = "no-match-inventory-query"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  assert.equal(await page.$eval("#variant", el => el.options.length), 1);
  assert.equal(await page.$eval("#stage", el => el.dataset.recipe), target.motionRecipe.recipeId);
  assert.match(await page.$eval("#filter-note", el => el.textContent), /outside these filters/);
  const next = records.find(row => row.motionRecipe.group === "text");
  await page.evaluate(id => { location.hash = `#motion=${encodeURIComponent(id)}`; }, next.id);
  await page.waitForFunction(recipe => document.getElementById("stage").dataset.recipe === recipe, {}, next.motionRecipe.recipeId);
  assert.equal(await page.$eval("#search", el => el.value), "no-match-inventory-query");
  await page.$eval("#seek", el => { el.value = "730"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  assert.equal(await page.$eval("#progress", el => el.textContent), "73%");
  await page.click("#reduced");
  assert.equal(await page.$eval("#progress", el => el.textContent), "73%");
  await page.$eval("#sample-text", el => { el.value = "中文 ABC 👩‍🔬"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  assert.equal(await page.$eval("#progress", el => el.textContent), "73%");
  await page.click("#play");
  assert.equal(await page.$eval("#play", el => el.getAttribute("aria-pressed")), "true");
  await page.click("#play");
  assert.equal(await page.$eval("#play", el => el.getAttribute("aria-pressed")), "false");
  await page.click("#reverse");
  await page.click("#replay");
  await page.waitForFunction(() => Number(document.getElementById("seek").value) < 1000);
  await page.click("#play");
  assert.equal(await page.$eval("#reverse", el => el.checked), true);
  assert.equal(await page.$eval("#play", el => el.getAttribute("aria-pressed")), "false");
  await page.evaluate(() => { location.hash = "#motion=does-not-exist"; });
  await page.waitForFunction(() => !document.getElementById("error").hidden);
  assert.match(await page.$eval("#error", el => el.textContent), /does-not-exist: unknown exact variant/);
  assert.equal(await page.$eval("#stage", el => el.childElementCount), 0);
  assert.equal(await page.$eval("#play", el => el.disabled), true);
  await page.evaluate(id => { location.hash = `#motion=${encodeURIComponent(id)}`; }, target.id);
  await page.waitForFunction(() => document.getElementById("error").hidden);
  assert.equal(await page.$eval("#play", el => el.disabled), false);
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
});


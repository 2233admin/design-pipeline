"use strict";

// The element comparison of two numbered captures (owner-attention-page-compare), on documents built
// by hand: pairing by content in order, pixel and text changes, sections, and what cannot be compared.

const assert = require("node:assert/strict");
const test = require("node:test");
const { compareCaptures, describeChanges } = require("../skill/scripts/workflows/page-compare.cjs");

const el = (ref, tag, text, pixels, section = "hero") => ({ ref, section, tag, text, pixels });
const doc = (refs, sections = [{ id: "hero", pixels: "S1" }]) => ({ refs, sections });
const summary = result => result.changes.map(item => [item.change, item.before?.ref ?? null, item.after?.ref ?? null]);

test("an element inserted before unchanged content is added, and the content after it is paired", () => {
  const before = doc([el("hero-1", "h1", "Bread", "A"), el("hero-2", "p", "Fresh daily", "B")]);
  const after = doc([el("hero-1", "p", "New line", "N"), el("hero-2", "h1", "Bread", "A"), el("hero-3", "p", "Fresh daily", "B")], [{ id: "hero", pixels: "S2" }]);
  const result = compareCaptures(before, after, "hero");
  assert.equal(result.comparable, true);
  assert.equal(result.sectionChanged, true);
  assert.deepEqual(summary(result), [["added", null, "hero-1"]]);
});

test("a text edit pairs with the element it replaced, a removal is removed, a pixel change is changed", () => {
  const before = doc([el("hero-1", "h1", "Bread", "A"), el("hero-2", "p", "Old words", "B"), el("hero-3", "a", "Reserve", "C"), el("hero-4", "img", "Logo", "D")]);
  const after = doc([el("hero-1", "h1", "Bread", "A2"), el("hero-2", "p", "New words", "B2"), el("hero-3", "a", "Reserve", "C")], [{ id: "hero", pixels: "S2" }]);
  assert.deepEqual(summary(compareCaptures(before, after, "hero")), [["changed", "hero-1", "hero-1"], ["changed", "hero-2", "hero-2"], ["removed", "hero-4", null]]);
});

test("an unchanged section is unchanged, and a section that looks different with no element changed is changed", () => {
  const before = doc([el("hero-1", "h1", "Bread", "A")]);
  assert.deepEqual(compareCaptures(before, doc([el("hero-1", "h1", "Bread", "A")]), "hero"), { comparable: true, sectionChanged: false, changes: [] });
  const background = compareCaptures(before, doc([el("hero-1", "h1", "Bread", "A")], [{ id: "hero", pixels: "grey" }]), "hero");
  assert.equal(background.sectionChanged, true);
  assert.deepEqual(summary(background), [["changed", null, null]]);
  assert.equal(describeChanges(background.changes), "section hero (changed, outside its numbered elements)");
});

test("repeated items pair in order, and the change set stays right", () => {
  const card = (ref, pixels) => el(ref, "li", "Same card", pixels);
  const before = doc([card("hero-1", "A"), card("hero-2", "A"), card("hero-3", "A")]);
  const after = doc([card("hero-1", "A"), card("hero-2", "A"), card("hero-3", "A"), card("hero-4", "A")], [{ id: "hero", pixels: "S2" }]);
  assert.deepEqual(summary(compareCaptures(before, after, "hero")), [["added", null, "hero-4"]]);
});

test("the whole page lists each section and outside element, with the phone prefix kept", () => {
  const before = { refs: [el("m:1", "a", "Home", "A", null), el("m:hero-1", "h1", "Bread", "B")], sections: [{ id: "hero", pixels: "S" }] };
  const after = { refs: [el("m:1", "a", "Home", "A2", null), el("m:hero-1", "h1", "Bread", "B"), el("m:proof-1", "p", "Proof", "P", "proof")], sections: [{ id: "hero", pixels: "S" }, { id: "proof", pixels: "Q" }] };
  const result = compareCaptures(before, after, null);
  assert.deepEqual(summary(result), [["added", null, null], ["changed", "m:1", "m:1"]]);
  assert.equal(result.changes[0].section, "proof");
  assert.equal(describeChanges(result.changes), 'section proof (added, outside its numbered elements); m:1 a "Home" (changed)');
});

test("a capture without fingerprints, or a group too large to pair, cannot be compared", () => {
  const plain = { refs: [{ ref: "hero-1", section: "hero", tag: "h1", text: "Bread" }], sections: [] };
  assert.deepEqual(compareCaptures(plain, doc([el("hero-1", "h1", "Bread", "A")]), "hero"), { comparable: false, sectionChanged: false, changes: [] });
  const many = n => doc(Array.from({ length: n }, (_, index) => el(`hero-${index + 1}`, "p", `Line ${n}-${index}`, "X")));
  assert.equal(compareCaptures(many(2001), many(2002), "hero").comparable, false);
});

test("a long list is cut with a count", () => {
  const changes = Array.from({ length: 14 }, (_, index) => ({ change: "added", section: "hero", before: null, after: { ref: `hero-${index + 1}`, tag: "p", text: "x" } }));
  assert.match(describeChanges(changes), /hero-12 p "x" \(added\); and 2 more$/);
});

test("a section that moved is compared by size and palette, so a new background still shows", () => {
  const section = (y, pixels, palette) => ({ id: "proof", box: { x: 0, y, width: 1440, height: 900 }, pixels, palette });
  const heading = el("proof-1", "h2", "Proof", "H", "proof");
  const before = { refs: [heading], sections: [section(1000, "P1", "fff,000")] };
  // Moved by a fraction of a pixel: the contents round differently, the palette is the same.
  assert.equal(compareCaptures(before, { refs: [heading], sections: [section(1874, "P2", "fff,000")] }, "proof").sectionChanged, false);
  // Moved, and the background turned grey.
  assert.equal(compareCaptures(before, { refs: [heading], sections: [section(1874, "P3", "eee,000")] }, "proof").sectionChanged, true);
  // Not moved: the fingerprint alone decides.
  assert.equal(compareCaptures(before, { refs: [heading], sections: [section(1000, "P2", "fff,000")] }, "proof").sectionChanged, true);
});

// CodeRabbit review on #142: a box outside the picture (null) on both sides was not seen either time.
test("an element outside the picture both times is unchanged; one that moved in or out is changed", () => {
  const before = doc([el("hero-1", "h1", "Bread", "A"), el("hero-2", "a", "Skip link", null)]);
  assert.deepEqual(compareCaptures(before, doc([el("hero-1", "h1", "Bread", "A"), el("hero-2", "a", "Skip link", null)]), "hero").changes, []);
  assert.deepEqual(summary(compareCaptures(before, doc([el("hero-1", "h1", "Bread", "A"), el("hero-2", "a", "Skip link", "V")]), "hero")), [["changed", "hero-2", "hero-2"]]);
});

// Independent review on #142: a moved section whose elements all look the same but sit elsewhere in it
// (padding, gap, order) changed its layout.
test("a moved section whose elements changed place inside it is changed", () => {
  const section = (y) => ({ id: "proof", box: { x: 0, y, width: 1440, height: 900 }, pixels: `P${y}`, palette: "fff:90,000:10" });
  const heading = (y) => ({ ...el("proof-1", "h2", "Proof", "H", "proof"), box: { x: 24, y, width: 300, height: 40 } });
  const before = { refs: [heading(1024)], sections: [section(1000)] };
  assert.equal(compareCaptures(before, { refs: [heading(1874)], sections: [section(1850)] }, "proof").sectionChanged, false, "moved together");
  const result = compareCaptures(before, { refs: [heading(1904)], sections: [section(1850)] }, "proof");
  assert.equal(result.sectionChanged, true, "padding above the heading grew by 30px");
  assert.deepEqual(summary(result), [["changed", "proof-1", "proof-1"]]);
});

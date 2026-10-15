"use strict";

// Compares two numbered captures of the page element by element (OpenSpec change
// owner-attention-page-compare). Pure: it reads two page-refs documents and returns what changed.
// Elements are paired within each section by their content in document order, the way a text diff
// pairs lines, so content that moved down the page is still paired; a pair whose pixels or text differ
// is changed, and an unpaired element is added or removed. A section whose pixels differ is changed even
// when no numbered element did (its background, an unnumbered part).

const key = item => `${item.tag}|${item.text}`;
const side = item => ({ ref: item.ref, tag: item.tag, text: item.text });

// The longest common subsequence of two key lists, as index pairs in order.
function lcs(a, b) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table = new Uint32Array(rows * cols);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * cols + j] = a[i] === b[j] ? table[(i + 1) * cols + j + 1] + 1 : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
    }
  }
  const pairs = [];
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { pairs.push([i, j]); i += 1; j += 1; } else if (table[(i + 1) * cols + j] >= table[i * cols + j + 1]) i += 1; else j += 1;
  }
  return pairs;
}

// Above this many elements left after trimming a group's common start and end, the group is not
// paired (the comparison reports it not comparable) rather than spending quadratic time.
const PAIR_LIMIT = 2000;

// Pairs one group's elements: the common start and end first, then content anchors (the longest common
// subsequence) in between, then leftovers of the same tag between anchors. Null when too large to pair.
function pairGroup(before, after) {
  let head = 0;
  while (head < before.length && head < after.length && key(before[head]) === key(after[head])) head += 1;
  let tail = 0;
  while (tail < before.length - head && tail < after.length - head && key(before[before.length - 1 - tail]) === key(after[after.length - 1 - tail])) tail += 1;
  const fixed = [...before.slice(0, head).map((item, index) => [item, after[index]]), ...before.slice(before.length - tail).map((item, index) => [item, after[after.length - tail + index]])];
  const middleBefore = before.slice(head, before.length - tail);
  const middleAfter = after.slice(head, after.length - tail);
  if (middleBefore.length > PAIR_LIMIT || middleAfter.length > PAIR_LIMIT) return null;
  const inner = pairMiddle(middleBefore, middleAfter);
  return { pairs: [...fixed, ...inner.pairs], added: inner.added, removed: inner.removed };
}

function pairMiddle(before, after) {
  const anchors = lcs(before.map(key), after.map(key));
  const pairs = [];
  const added = [];
  const removed = [];
  let i = 0;
  let j = 0;
  for (const [ai, bj] of [...anchors, [before.length, after.length]]) {
    const left = before.slice(i, ai);
    const right = after.slice(j, bj);
    for (const item of left) {
      const match = right.findIndex(candidate => candidate && candidate.tag === item.tag);
      if (match < 0) { removed.push(item); continue; }
      pairs.push([item, right[match]]);
      right[match] = null;
    }
    for (const item of right) if (item) added.push(item);
    if (ai < before.length) pairs.push([before[ai], after[bj]]);
    i = ai + 1;
    j = bj + 1;
  }
  return { pairs, added, removed };
}

// A section looks the same when its fingerprint matches; a section that moved is compared by its size
// and palette instead, since its contents round to new pixels when it moves by a fraction of a pixel
// (each numbered element inside it is still compared by its own fingerprint).
// `shifted` says the contents moved even when the rounded section box did not (a shift under half a pixel).
const sameRegion = (was, now, shifted = false) => {
  if (was.pixels === now.pixels) return true;
  if (was.pixels === null || now.pixels === null) return false;
  const moved = shifted || (was.box && now.box && (was.box.x !== now.box.x || was.box.y !== now.box.y));
  return Boolean(moved && was.box && now.box && was.box.width === now.box.width && was.box.height === now.box.height && typeof was.palette === "string" && was.palette === now.palette);
};

const boxMoved = (was, now) => Boolean(was.box && now.box && (was.box.x !== now.box.x || was.box.y !== now.box.y));
// An element's place inside its section, which a moved section keeps: off by more than a pixel (rounding)
// means the section's layout changed even when every element looks the same.
const relocated = (was, now, wasRegion, nowRegion) => {
  if (!was.box || !now.box || !wasRegion?.box || !nowRegion?.box) return false;
  const dx = (now.box.x - nowRegion.box.x) - (was.box.x - wasRegion.box.x);
  const dy = (now.box.y - nowRegion.box.y) - (was.box.y - wasRegion.box.y);
  return Math.abs(dx) > 1 || Math.abs(dy) > 1;
};

const groupOf = (doc, section) => doc.refs.filter(item => (item.section ?? null) === section);
const fingerprinted = doc => Array.isArray(doc?.refs) && Array.isArray(doc.sections) && doc.refs.every(item => "pixels" in item) && doc.sections.every(item => "pixels" in item);

// `scope` is a section id, or null for the whole page. Returns {comparable, sectionChanged, changes}.
function compareCaptures(before, after, scope = null) {
  if (!fingerprinted(before) || !fingerprinted(after)) return { comparable: false, sectionChanged: false, changes: [] };
  const sectionIds = scope === null ? [...new Set([...before.sections, ...after.sections].map(item => item.id)), null] : [scope];
  const changes = [];
  let sectionChanged = false;
  for (const id of sectionIds) {
    const paired = pairGroup(groupOf(before, id), groupOf(after, id));
    if (!paired) return { comparable: false, sectionChanged: false, changes: [] };
    const { pairs, added, removed } = paired;
    let regionChanged = false;
    let wasRegion = null;
    let nowRegion = null;
    if (id !== null) {
      const was = before.sections.filter(item => item.id === id);
      const now = after.sections.filter(item => item.id === id);
      [wasRegion, nowRegion] = [was[0], now[0]];
      if (!was.length || !now.length) {
        if (was.length || now.length) {
          changes.push({ change: !was.length ? "added" : "removed", section: id, before: null, after: null });
          sectionChanged = true;
          continue;
        }
      }
      const shifted = pairs.some(([a, b]) => boxMoved(a, b));
      regionChanged = was.length !== now.length || was.some((item, index) => !sameRegion(item, now[index], shifted));
    }
    const found = [];
    for (const [was, now] of pairs) {
      // A box outside the picture on both sides (null) was not seen either time; one side null moved in or out.
      // Inside a section, an element must also keep its place in it (outside sections, content above moves it).
      if (was.pixels !== now.pixels || was.text !== now.text || (id !== null && relocated(was, now, wasRegion, nowRegion))) {
        found.push({ change: "changed", section: id, before: side(was), after: side(now) });
      }
    }
    for (const item of removed) found.push({ change: "removed", section: id, before: side(item), after: null });
    for (const item of added) found.push({ change: "added", section: id, before: null, after: side(item) });
    // A section that looks different with no numbered element changed changed elsewhere in it.
    if (regionChanged && !found.length) found.push({ change: "changed", section: id, before: null, after: null });
    if (id !== null && found.length) sectionChanged = true;
    changes.push(...found);
  }
  return { comparable: true, sectionChanged, changes };
}

// One line per change for the person reading the ask, at most `limit`.
function describeChanges(changes, limit = 12) {
  const line = item => {
    if (!item.before && !item.after) return `section ${item.section} (${item.change}, outside its numbered elements)`;
    const shown = item.after || item.before;
    return `${shown.ref} ${shown.tag} "${shown.text}" (${item.change}${item.change === "changed" && item.before && item.before.ref !== shown.ref ? `, was ${item.before.ref}` : ""})`;
  };
  const lines = changes.slice(0, limit).map(line);
  return changes.length > limit ? `${lines.join("; ")}; and ${changes.length - limit} more` : lines.join("; ");
}

module.exports = { compareCaptures, describeChanges };

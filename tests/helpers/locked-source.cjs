"use strict";

// Source tests compare bundles with sources.lock.json instead of hard-coded revisions, so a
// `npm run sources:update` bump needs no test edit while a manifest that drifts from the lock fails.
const { readLock } = require("../../scripts/sources-lock.cjs");

let cached = null;
function lockedSource(id) {
  cached ||= readLock();
  const entry = cached.sources.find((item) => item.id === id);
  if (!entry) throw new Error(`sources.lock.json has no ${id}`);
  return entry;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/;
const SHA1 = /^[0-9a-f]{40}$/;

module.exports = { DATE, SHA1, TIME, lockedSource };

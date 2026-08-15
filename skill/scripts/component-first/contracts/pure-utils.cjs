"use strict";

const crypto = require("node:crypto");

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortValue(value[key])]));
}

function canonicalJson(value) {
  return `${JSON.stringify(sortValue(value), null, 2)}\n`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

module.exports = { canonicalJson, isObject, sha256, sortValue };

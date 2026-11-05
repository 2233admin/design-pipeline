"use strict";

// Glyph coverage for template-bank font roles and the browser check.
//
// Rule: a string is set in one font. When the font a role names lacks any character of the
// string, the whole string switches to the role's fallback font; it is never left to the browser
// to fall back glyph by glyph (mixed glyph styles inside one word).
//
// Coverage comes from providers, asked in order:
//   1. a registered provider (the font catalog of issue #286 registers one with
//      registerProvider(fn); fn(family, { weight }) returns a Set of code points, or null when it
//      does not know the family);
//   2. font files the caller names (the @font-face files a page loads, or files found in
//      --font-dir), read here from their cmap table (TrueType/OpenType, collections, WOFF 1).
// A family no provider knows is reported as unknown, never as covered.

const fs = require("node:fs");
const zlib = require("node:zlib");

const providers = [];
const fileCache = new Map();

function registerProvider(fn) {
  if (typeof fn !== "function") throw new TypeError("registerProvider needs a function (family, { weight }) => Set<number> | null");
  providers.push(fn);
  return () => { const index = providers.indexOf(fn); if (index >= 0) providers.splice(index, 1); };
}

// ---- sfnt reading ----------------------------------------------------------------------------
function woffToTables(buffer) {
  const numTables = buffer.readUInt16BE(12);
  const tables = new Map();
  for (let i = 0; i < numTables; i += 1) {
    const at = 44 + i * 20;
    const tag = buffer.toString("latin1", at, at + 4);
    const offset = buffer.readUInt32BE(at + 4);
    const compLength = buffer.readUInt32BE(at + 8);
    const origLength = buffer.readUInt32BE(at + 12);
    const raw = buffer.subarray(offset, offset + compLength);
    tables.set(tag, compLength < origLength ? zlib.inflateSync(raw) : raw);
  }
  return tables;
}

function sfntTables(buffer, at = 0) {
  const numTables = buffer.readUInt16BE(at + 4);
  const tables = new Map();
  for (let i = 0; i < numTables; i += 1) {
    const rec = at + 12 + i * 16;
    const tag = buffer.toString("latin1", rec, rec + 4);
    const offset = buffer.readUInt32BE(rec + 8);
    const length = buffer.readUInt32BE(rec + 12);
    tables.set(tag, buffer.subarray(offset, offset + length));
  }
  return tables;
}

function fontTables(buffer, index = 0) {
  const tag = buffer.toString("latin1", 0, 4);
  if (tag === "wOFF") return woffToTables(buffer);
  if (tag === "wOF2") throw new Error("WOFF2 is not read here; give the TTF/OTF/WOFF file or register a coverage provider");
  if (tag === "ttcf") {
    const count = buffer.readUInt32BE(8);
    if (index >= count) throw new Error(`font collection has ${count} faces, asked for ${index}`);
    return sfntTables(buffer, buffer.readUInt32BE(12 + index * 4));
  }
  if (buffer.readUInt32BE(0) === 0x00010000 || tag === "OTTO" || tag === "true") return sfntTables(buffer, 0);
  throw new Error("not a font file (TTF, OTF, TTC or WOFF)");
}

function cmapCodePoints(cmap) {
  const codes = new Set();
  const count = cmap.readUInt16BE(2);
  const subtables = [];
  for (let i = 0; i < count; i += 1) {
    const at = 4 + i * 8;
    subtables.push({ platform: cmap.readUInt16BE(at), encoding: cmap.readUInt16BE(at + 2), offset: cmap.readUInt32BE(at + 4) });
  }
  const unicode = subtables.filter((s) => s.platform === 0 || (s.platform === 3 && (s.encoding === 1 || s.encoding === 10)));
  for (const { offset } of unicode) {
    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(offset + 6);
      const ends = offset + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s += 1) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const rangeOffset = cmap.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
          let glyph;
          if (rangeOffset === 0) glyph = (c + delta) & 0xffff;
          else {
            const at = ranges + s * 2 + rangeOffset + (c - start) * 2;
            glyph = at + 1 < cmap.length ? cmap.readUInt16BE(at) : 0;
            if (glyph) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph) codes.add(c);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g += 1) {
        const at = offset + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        const glyph = cmap.readUInt32BE(at + 8);
        for (let c = start; c <= end; c += 1) if (glyph + (c - start)) codes.add(c);
      }
    } else if (format === 0) {
      for (let c = 0; c < 256; c += 1) if (cmap[offset + 6 + c]) codes.add(c);
    }
  }
  return codes;
}

function readFontCoverage(file, index = 0) {
  const key = `${file}#${index}`;
  if (!fileCache.has(key)) {
    const tables = fontTables(fs.readFileSync(file), index);
    const cmap = tables.get("cmap");
    if (!cmap) throw new Error(`${file} has no cmap table`);
    fileCache.set(key, cmapCodePoints(cmap));
  }
  return fileCache.get(key);
}

// ---- queries ---------------------------------------------------------------------------------
const normalise = (family) => String(family || "").trim().replace(/^["']|["']$/g, "").toLowerCase();

// faces: [{ family, weight, file, index }] as a page or a style pack names them.
function coverageOf(family, { weight = 400, faces = [] } = {}) {
  for (const provider of providers) {
    const found = provider(family, { weight });
    if (found) return { known: true, codes: found, source: "provider" };
  }
  const matching = faces.filter((face) => normalise(face.family) === normalise(family));
  if (!matching.length) return { known: false };
  const best = matching.slice().sort((a, b) => Math.abs((a.weight || 400) - weight) - Math.abs((b.weight || 400) - weight))[0];
  try {
    return { known: true, codes: readFontCoverage(best.file, best.index || 0), source: best.file };
  } catch (error) {
    return { known: false, error: error.message };
  }
}

function missingGlyphs(family, text, options = {}) {
  const coverage = coverageOf(family, options);
  if (!coverage.known) return { known: false, missing: "", ...(coverage.error ? { error: coverage.error } : {}) };
  const missing = [...new Set([...String(text)].filter((ch) => /\S/u.test(ch) && !coverage.codes.has(ch.codePointAt(0))))].join("");
  return { known: true, missing, source: coverage.source };
}

// Whole-string choice along a font stack: the first family that covers every character.
function chooseFamily(stack, text, options = {}) {
  const tried = [];
  for (const family of stack) {
    const result = missingGlyphs(family, text, options);
    tried.push({ family, ...result });
    if (result.known && !result.missing) return { family, tried };
  }
  return { family: null, tried };
}

module.exports = { registerProvider, readFontCoverage, cmapCodePoints, coverageOf, missingGlyphs, chooseFamily };

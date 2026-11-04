"use strict";

// Open-font catalog: what a font file really covers, measured from its own cmap, with its licence
// traced to a source file and a style read from its outlines. One reader serves three callers:
// `fonts measure` (local files), `fonts query` (packaged or cached catalog plus local files) and the
// `fonts refresh` kernel (remote files read by HTTP range, so a 20 MB CJK font costs a few hundred KB).
// Change: openspec/changes/add-open-font-catalog.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const crypto = require("node:crypto");

const FONTS_DIR = path.resolve(__dirname, "../references/fonts");
const SOURCES_FILE = path.join(FONTS_DIR, "sources.json");
const CATALOG_FILE = path.join(FONTS_DIR, "catalog.json");
const TONGYONG_FILE = path.join(FONTS_DIR, "tongyong-guifan-hanzi.txt");
const CATALOG_SCHEMA = "design-pipeline.font-catalog.v1";
const SOURCES_SCHEMA = "design-pipeline.font-sources.v1";
const FONT_EXTENSIONS = new Set([".ttf", ".otf", ".ttc", ".otc", ".woff", ".woff2"]);

class FontError extends Error {
  constructor(code, message, fix) {
    super(message);
    this.code = code;
    this.fix = fix;
  }
}

// ---------------------------------------------------------------------------------------------
// Glyph sets. Legacy encodings come from Node's own decoders, so the counts are the standards'
// own: GB 2312 hanzi 6763, JIS X 0208 level 1 2965, Big5 frequent (A440-C67E) 5401.

const HAN = /\p{Script=Han}/u;
const CJK_PUNCTUATION = "，。、；：？！「」『』（）《》〈〉【】〔〕…—～·〇々ー・";

function decodeRows(encoding, rows, cols, keep = (ch) => HAN.test(ch)) {
  const decoder = new TextDecoder(encoding);
  const out = [];
  for (const row of rows) {
    for (const col of cols) {
      const ch = decoder.decode(Uint8Array.of(...row(col)));
      if ([...ch].length === 1 && ch !== "�" && keep(ch)) out.push(ch.codePointAt(0));
    }
  }
  return out;
}

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, index) => from + index);
let SETS = null;

function glyphSets() {
  if (SETS) return SETS;
  const lines = fs.readFileSync(TONGYONG_FILE, "utf8").split("\n");
  const level = (index) => [...lines[index]].map((ch) => ch.codePointAt(0));
  const tongyong1 = level(0);
  const definitions = [
    ["tongyong-3500", "通用规范汉字表 一级字表", tongyong1],
    ["tongyong-8105", "通用规范汉字表 全表（一二三级）", [...tongyong1, ...level(1), ...level(2)]],
    ["gb2312", "GB 2312 汉字（一二级）", decodeRows("gbk", range(0xb0, 0xf7).map((r) => (c) => [r, c]), range(0xa1, 0xfe))],
    ["jis-level-1", "JIS X 0208 第一水準漢字", decodeRows("euc-jp", range(16, 47).map((r) => (c) => [r + 0xa0, c + 0xa0]), range(1, 94))],
    // Big5's frequent block is A440-C67E: lead bytes A4-C6, trail 40-7E and A1-FE, ending at C67E.
    ["big5-common", "Big5 常用字（A440–C67E）", decodeRows("big5", range(0xa4, 0xc6).map((r) => (c) => (r === 0xc6 && c > 0x7e ? [0x20] : [r, c])), [...range(0x40, 0x7e), ...range(0xa1, 0xfe)])],
    ["latin", "Basic Latin printable (U+0021–U+007E)", range(0x21, 0x7e)],
    ["cjk-punctuation", "CJK punctuation and marks", [...CJK_PUNCTUATION].map((ch) => ch.codePointAt(0))],
  ];
  SETS = Object.fromEntries(definitions.map(([id, label, codepoints]) => [id, { id, label, codepoints: [...new Set(codepoints)] }]));
  return SETS;
}

// ---------------------------------------------------------------------------------------------
// sfnt reading. A "reader" is read(offset, length) -> Buffer; local files wrap a Buffer, remote
// files are read by range in the refresh kernel through the same table code (async variant).

function tag(buf, offset) {
  return buf.toString("latin1", offset, offset + 4);
}

function sniff(head) {
  const signature = tag(head, 0);
  if (signature === "ttcf" || signature === "otcf") return "ttc";
  if (signature === "wOFF") return "woff";
  if (signature === "wOF2") return "woff2";
  if (signature === "OTTO" || signature === "true" || head.readUInt32BE(0) === 0x00010000) return "sfnt";
  return null;
}

function tableDirectory(buf, offset = 0) {
  const count = buf.readUInt16BE(offset + 4);
  const tables = {};
  for (let i = 0; i < count; i += 1) {
    const record = offset + 12 + i * 16;
    tables[tag(buf, record)] = { offset: buf.readUInt32BE(record + 8), length: buf.readUInt32BE(record + 12) };
  }
  return { flavor: tag(buf, offset), tables };
}

function woffDirectory(buf) {
  const count = buf.readUInt16BE(12);
  const tables = {};
  for (let i = 0; i < count; i += 1) {
    const record = 44 + i * 20;
    tables[tag(buf, record)] = {
      offset: buf.readUInt32BE(record + 4),
      compressed: buf.readUInt32BE(record + 8),
      length: buf.readUInt32BE(record + 12),
    };
  }
  return { flavor: tag(buf, 4), tables };
}

/** Faces of a whole local file as { index, tables: name -> Buffer-slice getter }. */
function facesOfBuffer(buf, file = "font") {
  if (buf.length < 12) throw new FontError("FONT_UNREADABLE", `${file} is too short to be a font`, "Pass a TTF, OTF, TTC or WOFF file.");
  const format = sniff(buf);
  if (!format) throw new FontError("FONT_UNREADABLE", `${file} is not a TTF, OTF, TTC or WOFF file`, "Pass the font file itself, not an archive, CSS file or HTML page.");
  if (format === "woff2") throw new FontError("FONT_FORMAT_UNSUPPORTED", `${file} is WOFF2, whose cmap this reader does not decode`, "Measure the TTF/OTF release of the same family, or decompress it first (fonttools: `fonttools ttLib.woff2 decompress <file>`).");
  const make = (directory, read) => {
    const cache = new Map();
    const table = (name) => {
      if (!directory.tables[name]) return null;
      if (!cache.has(name)) cache.set(name, read(directory.tables[name]));
      return cache.get(name);
    };
    return { flavor: directory.flavor, has: (name) => Boolean(directory.tables[name]), table };
  };
  if (format === "woff") {
    const directory = woffDirectory(buf);
    const read = (entry) => {
      const raw = buf.subarray(entry.offset, entry.offset + entry.compressed);
      return entry.compressed < entry.length ? zlib.inflateSync(raw) : raw;
    };
    return { format, faces: [make(directory, read)] };
  }
  const offsets = format === "ttc" ? Array.from({ length: buf.readUInt32BE(8) }, (_, i) => buf.readUInt32BE(12 + i * 4)) : [0];
  return { format, faces: offsets.map((offset) => make(tableDirectory(buf, offset), (entry) => buf.subarray(entry.offset, entry.offset + entry.length))) };
}

/** Unicode codepoints mapped to a non-zero glyph: cmap formats 0, 4, 6, 12 and 13. */
function readCmap(cmap) {
  if (!cmap) throw new FontError("FONT_CMAP_MISSING", "the font has no cmap table", "Use a font file with a Unicode character map.");
  const subtables = [];
  for (let i = 0; i < cmap.readUInt16BE(2); i += 1) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    // Unicode subtables only: platform 0 (any), or Windows 3/1 (BMP) and 3/10 (full).
    if (platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) subtables.push(offset);
  }
  const map = new Map();
  for (const sub of [...new Set(subtables)]) {
    const format = cmap.readUInt16BE(sub);
    if (format === 4) {
      const segments = cmap.readUInt16BE(sub + 6) / 2;
      const ends = sub + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const offsets = deltas + segments * 2;
      for (let k = 0; k < segments; k += 1) {
        const start = cmap.readUInt16BE(starts + 2 * k);
        const end = cmap.readUInt16BE(ends + 2 * k);
        const delta = cmap.readUInt16BE(deltas + 2 * k);
        const rangeOffset = cmap.readUInt16BE(offsets + 2 * k);
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
          let glyph;
          if (rangeOffset) {
            const at = offsets + 2 * k + rangeOffset + 2 * (c - start);
            glyph = at + 2 <= cmap.length ? cmap.readUInt16BE(at) : 0;
            if (glyph) glyph = (glyph + delta) & 0xffff;
          } else glyph = (c + delta) & 0xffff;
          if (glyph) map.set(c, glyph);
        }
      }
    } else if (format === 12 || format === 13) {
      const groups = cmap.readUInt32BE(sub + 12);
      for (let k = 0; k < groups; k += 1) {
        const [start, end, first] = [0, 4, 8].map((o) => cmap.readUInt32BE(sub + 16 + k * 12 + o));
        for (let c = start; c <= end; c += 1) {
          const glyph = format === 12 ? first + c - start : first;
          if (glyph) map.set(c, glyph);
        }
      }
    } else if (format === 0) {
      for (let c = 0; c < 256; c += 1) if (cmap[sub + 6 + c]) map.set(c, cmap[sub + 6 + c]);
    } else if (format === 6) {
      const first = cmap.readUInt16BE(sub + 6);
      const count = cmap.readUInt16BE(sub + 8);
      for (let k = 0; k < count; k += 1) {
        const glyph = cmap.readUInt16BE(sub + 10 + 2 * k);
        if (glyph) map.set(first + k, glyph);
      }
    }
  }
  return map;
}

function readName(name) {
  if (!name) return {};
  const count = name.readUInt16BE(2);
  const strings = name.readUInt16BE(4);
  const found = {};
  for (let i = 0; i < count; i += 1) {
    const record = 6 + i * 12;
    const [platform, encoding, language, id, length, offset] = [0, 2, 4, 6, 8, 10].map((o) => name.readUInt16BE(record + o));
    if (![1, 2, 4, 5, 16, 17].includes(id)) continue;
    const bytes = name.subarray(strings + offset, strings + offset + length);
    let text;
    if (platform === 3 || platform === 0) {
      const swapped = Buffer.from(bytes);
      swapped.swap16();
      text = swapped.toString("utf16le");
    } else if (platform === 1 && encoding === 0) text = bytes.toString("latin1");
    else continue;
    // Prefer English (Windows 0x409 / Mac 0) names; keep the first seen otherwise.
    const english = (platform === 3 && language === 0x409) || (platform === 1 && language === 0);
    if (!found[id] || english) found[id] = text;
  }
  return { family: found[16] || found[1], subfamily: found[17] || found[2], fullName: found[4], version: found[5] };
}

function readWeights(os2, fvar) {
  const weights = {};
  if (os2 && os2.length >= 6) weights.weightClass = os2.readUInt16BE(4);
  if (fvar) {
    const axesOffset = fvar.readUInt16BE(4);
    const count = fvar.readUInt16BE(8);
    const size = fvar.readUInt16BE(10);
    for (let i = 0; i < count; i += 1) {
      const at = axesOffset + i * size;
      if (tag(fvar, at) !== "wght") continue;
      const fixed = (offset) => fvar.readInt32BE(offset) / 65536;
      weights.axis = { min: fixed(at + 4), default: fixed(at + 8), max: fixed(at + 12) };
    }
  }
  return weights;
}

// ---------------------------------------------------------------------------------------------
// Stroke contrast from TrueType outlines of 十 (U+5341): the vertical stem's width above the
// cross-bar divided by the bar's thickness left of the stem. Mincho/Song stems are much thicker
// than their horizontals; gothic/hei strokes are near-even. A variable font is measured at its
// heaviest `wght` instance (gvar deltas applied), since that is where a display face is used.
// CFF outlines are reported unmeasured.

const CONTRAST_CHAR = 0x5341;

/** Simple-glyph points with contour ends, or composite components; null for an empty glyph. */
function readGlyph(data) {
  const contours = data.readInt16BE(0);
  if (contours < 0) {
    const components = [];
    let at = 10;
    for (;;) {
      const flags = data.readUInt16BE(at);
      const glyph = data.readUInt16BE(at + 2);
      at += 4;
      let dx;
      let dy;
      if (flags & 1) {
        dx = data.readInt16BE(at);
        dy = data.readInt16BE(at + 2);
        at += 4;
      } else {
        dx = data.readInt8(at);
        dy = data.readInt8(at + 1);
        at += 2;
      }
      if (!(flags & 2)) dx = dy = 0;
      if (flags & 8) at += 2;
      else if (flags & 0x40) at += 4;
      else if (flags & 0x80) at += 8;
      components.push({ glyph, dx, dy });
      if (!(flags & 0x20)) break;
    }
    return { components };
  }
  const ends = [];
  for (let i = 0; i < contours; i += 1) ends.push(data.readUInt16BE(10 + i * 2));
  const count = contours ? ends[contours - 1] + 1 : 0;
  let at = 10 + contours * 2;
  at += 2 + data.readUInt16BE(at);
  const flags = [];
  while (flags.length < count) {
    const flag = data[at++];
    flags.push(flag);
    if (flag & 8) {
      const repeat = data[at++];
      for (let r = 0; r < repeat; r += 1) flags.push(flag);
    }
  }
  const coordinate = (short, same) => {
    const values = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & short) {
        const delta = data[at++];
        value += flag & same ? delta : -delta;
      } else if (!(flag & same)) {
        value += data.readInt16BE(at);
        at += 2;
      }
      values.push(value);
    }
    return values;
  };
  const xs = coordinate(2, 16);
  const ys = coordinate(4, 32);
  return { ends, points: xs.map((x, i) => [x, ys[i], Boolean(flags[i] & 1)]) };
}

function unpackPoints(data, at) {
  let count = data[at++];
  if (count === 0) return { points: null, at };
  if (count & 0x80) count = ((count & 0x7f) << 8) | data[at++];
  const points = [];
  let value = 0;
  while (points.length < count) {
    const control = data[at++];
    const run = (control & 0x7f) + 1;
    for (let i = 0; i < run && points.length < count; i += 1) {
      if (control & 0x80) {
        value += data.readUInt16BE(at);
        at += 2;
      } else value += data[at++];
      points.push(value);
    }
  }
  return { points, at };
}

function unpackDeltas(data, at, count) {
  const deltas = [];
  while (deltas.length < count) {
    const control = data[at++];
    const run = (control & 0x3f) + 1;
    for (let i = 0; i < run && deltas.length < count; i += 1) {
      if (control & 0x80) deltas.push(0);
      else if (control & 0x40) {
        deltas.push(data.readInt16BE(at));
        at += 2;
      } else deltas.push(data.readInt8(at++));
    }
  }
  return { deltas, at };
}

function tupleScalar(peak, coords, start, end) {
  let scalar = 1;
  for (let i = 0; i < coords.length; i += 1) {
    const p = peak[i];
    const v = coords[i];
    if (p === 0) continue;
    if (v === 0 || Math.sign(v) !== Math.sign(p)) return 0;
    if (start) {
      if (v < start[i] || v > end[i]) return 0;
      scalar *= v === p ? 1 : v < p ? (v - start[i]) / (p - start[i]) : (end[i] - v) / (end[i] - p);
    } else if (Math.abs(v) < Math.abs(p)) scalar *= v / p;
  }
  return scalar;
}

/** Interpolate untouched points of each contour from their touched neighbours (gvar IUP). */
function interpolateUntouched(original, deltas, touched, ends) {
  let start = 0;
  for (const end of ends) {
    const indices = [];
    for (let i = start; i <= end; i += 1) if (touched[i]) indices.push(i);
    if (indices.length && indices.length < end - start + 1) {
      for (let k = 0; k < indices.length; k += 1) {
        const a = indices[k];
        const b = indices[(k + 1) % indices.length];
        for (let i = a + 1; ; i += 1) {
          if (i > end) i = start;
          if (i === b) break;
          for (const axis of [0, 1]) {
            const [pa, pb, p] = [original[a][axis], original[b][axis], original[i][axis]];
            const [da, db] = [deltas[a][axis], deltas[b][axis]];
            let d;
            if (pa === pb) d = da === db ? da : 0;
            else if (p <= Math.min(pa, pb)) d = pa < pb ? da : db;
            else if (p >= Math.max(pa, pb)) d = pa > pb ? da : db;
            else d = da + ((p - pa) / (pb - pa)) * (db - da);
            deltas[i][axis] = d;
          }
        }
      }
    }
    start = end + 1;
  }
}

function applyVariations(access, glyph, glyphData, coords) {
  const header = access.read("gvar", 0, 20);
  const axisCount = header.readUInt16BE(4);
  const sharedCount = header.readUInt16BE(6);
  const sharedOffset = header.readUInt32BE(8);
  const long = header.readUInt16BE(14) & 1;
  const dataArray = header.readUInt32BE(16);
  const size = long ? 4 : 2;
  const offsets = access.read("gvar", 20 + glyph * size, size * 2);
  const at = (i) => (long ? offsets.readUInt32BE(i * 4) : offsets.readUInt16BE(i * 2) * 2);
  const length = at(1) - at(0);
  if (!length) return glyphData;
  const data = access.read("gvar", dataArray + at(0), length);
  const shared = sharedCount ? access.read("gvar", sharedOffset, sharedCount * axisCount * 2) : null;
  const tuple = (buffer, offset) => Array.from({ length: axisCount }, (_, i) => buffer.readInt16BE(offset + i * 2) / 16384);
  const total = glyphData.points.length + 4;
  const original = glyphData.points.map(([x, y]) => [x, y]);
  const moved = glyphData.points.map(([x, y, on]) => [x, y, on]);
  const countWord = data.readUInt16BE(0);
  let serialized = data.readUInt16BE(2);
  let sharedPoints = null;
  if (countWord & 0x8000) ({ points: sharedPoints, at: serialized } = unpackPoints(data, serialized));
  let headerAt = 4;
  for (let t = 0; t < (countWord & 0x0fff); t += 1) {
    const dataSize = data.readUInt16BE(headerAt);
    const index = data.readUInt16BE(headerAt + 2);
    headerAt += 4;
    let peak;
    if (index & 0x8000) {
      peak = tuple(data, headerAt);
      headerAt += axisCount * 2;
    } else peak = tuple(shared, (index & 0x0fff) * axisCount * 2);
    let start = null;
    let end = null;
    if (index & 0x4000) {
      start = tuple(data, headerAt);
      end = tuple(data, headerAt + axisCount * 2);
      headerAt += axisCount * 4;
    }
    const scalar = tupleScalar(peak, coords, start, end);
    let cursor = serialized;
    serialized += dataSize;
    if (!scalar) continue;
    let points = sharedPoints;
    if (index & 0x2000) ({ points, at: cursor } = unpackPoints(data, cursor));
    const count = points ? points.length : total;
    const xs = unpackDeltas(data, cursor, count);
    const ys = unpackDeltas(data, xs.at, count);
    const deltas = glyphData.points.map(() => [0, 0]);
    const touched = new Array(glyphData.points.length).fill(!points);
    for (let k = 0; k < count; k += 1) {
      const point = points ? points[k] : k;
      if (point >= glyphData.points.length) continue;
      deltas[point] = [xs.deltas[k], ys.deltas[k]];
      touched[point] = true;
    }
    if (points) interpolateUntouched(original, deltas, touched, glyphData.ends);
    deltas.forEach(([dx, dy], i) => {
      moved[i][0] += dx * scalar;
      moved[i][1] += dy * scalar;
    });
  }
  return { ends: glyphData.ends, points: moved };
}

/** Contours of a glyph as [x, y, onCurve] lists, at the access's instance coordinates. */
function glyphContours(access, glyph, depth = 0) {
  const span = access.locate(glyph);
  if (!span || span.length <= 0 || depth > 4) return [];
  let parsed = readGlyph(access.read("glyf", span.offset, span.length));
  if (parsed.components) {
    // Components keep their default offsets; 十 is a simple glyph in every measured family.
    return parsed.components.flatMap(({ glyph: component, dx, dy }) => glyphContours(access, component, depth + 1).map((contour) => contour.map(([x, y, on]) => [x + dx, y + dy, on])));
  }
  if (access.coords && access.has("gvar")) parsed = applyVariations(access, glyph, parsed, access.coords);
  const out = [];
  let start = 0;
  for (const end of parsed.ends) {
    out.push(parsed.points.slice(start, end + 1));
    start = end + 1;
  }
  return out;
}

/** Quadratic TrueType contours flattened to closed polylines. */
function flatten(contours) {
  return contours.map((contour) => {
    const n = contour.length;
    if (!n) return [];
    const first = contour.findIndex((p) => p[2]);
    const pts = first < 0 ? [[(contour[0][0] + contour[1 % n][0]) / 2, (contour[0][1] + contour[1 % n][1]) / 2, true], ...contour] : [...contour.slice(first), ...contour.slice(0, first)];
    const line = [[pts[0][0], pts[0][1]]];
    let current = pts[0];
    for (let i = 1; i <= pts.length; i += 1) {
      const p = pts[i % pts.length];
      if (p[2]) {
        line.push([p[0], p[1]]);
        current = p;
        continue;
      }
      const next = pts[(i + 1) % pts.length];
      const end = next[2] ? next : [(p[0] + next[0]) / 2, (p[1] + next[1]) / 2, true];
      for (let s = 1; s <= 8; s += 1) {
        const t = s / 8;
        line.push([(1 - t) ** 2 * current[0] + 2 * (1 - t) * t * p[0] + t * t * end[0], (1 - t) ** 2 * current[1] + 2 * (1 - t) * t * p[1] + t * t * end[1]]);
      }
      current = end;
      if (next[2]) i += 1;
    }
    return line;
  });
}

/** Widest inside interval where the line axis=value crosses the outline (non-zero winding). */
function widestRun(polylines, axis, value) {
  const crossings = [];
  for (const line of polylines) {
    for (let i = 0; i + 1 < line.length; i += 1) {
      const [a, b] = [line[i], line[i + 1]];
      const [ua, ub] = axis === "y" ? [a[1], b[1]] : [a[0], b[0]];
      if ((ua <= value && ub > value) || (ub <= value && ua > value)) {
        const t = (value - ua) / (ub - ua);
        const at = axis === "y" ? a[0] + t * (b[0] - a[0]) : a[1] + t * (b[1] - a[1]);
        crossings.push([at, ub > ua ? 1 : -1]);
      }
    }
  }
  crossings.sort((p, q) => p[0] - q[0]);
  let winding = 0;
  let enter = null;
  let widest = 0;
  for (const [at, direction] of crossings) {
    const before = winding;
    winding += direction;
    if (before === 0 && winding !== 0) enter = at;
    else if (before !== 0 && winding === 0 && enter !== null) widest = Math.max(widest, at - enter);
  }
  return widest;
}

/** Glyph access over a table reader: read(table, offset, length) -> Buffer. */
function glyphAccess(table, read, weightAxis, fvar) {
  if (!read || !read.has("glyf") || !read.has("loca")) return null;
  const head = table("head");
  const long = head.readInt16BE(50) === 1;
  const size = long ? 4 : 2;
  let coords = null;
  if (fvar && weightAxis && weightAxis.max > weightAxis.default) {
    const count = fvar.readUInt16BE(8);
    const axesOffset = fvar.readUInt16BE(4);
    const recordSize = fvar.readUInt16BE(10);
    coords = Array.from({ length: count }, (_, i) => (tag(fvar, axesOffset + i * recordSize) === "wght" ? 1 : 0));
  }
  return {
    has: read.has,
    read: read.read,
    coords,
    locate: (glyph) => {
      const bytes = read.read("loca", glyph * size, size * 2);
      const at = (i) => (long ? bytes.readUInt32BE(i * 4) : bytes.readUInt16BE(i * 2) * 2);
      return { offset: at(0), length: at(1) - at(0) };
    },
  };
}

function strokeContrast(access, cmapMap, weightAxis) {
  if (!cmapMap.has(CONTRAST_CHAR)) return { value: null, reason: "no 十 (U+5341) in the font" };
  if (!access) return { value: null, reason: "CFF outlines are not measured; compare a rendered specimen instead" };
  const contours = glyphContours(access, cmapMap.get(CONTRAST_CHAR));
  if (!contours.length) return { value: null, reason: "十 has an empty outline" };
  const lines = flatten(contours);
  const all = lines.flat();
  const xs = all.map((p) => p[0]);
  const ys = all.map((p) => p[1]);
  const [xMin, xMax, yMin, yMax] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const stem = widestRun(lines, "y", yMin + 0.85 * (yMax - yMin));
  const bar = widestRun(lines, "x", xMin + 0.15 * (xMax - xMin));
  if (!stem || !bar) return { value: null, reason: "十 has no measurable stem and bar" };
  const result = { value: Math.round((stem / bar) * 100) / 100, stem: Math.round(stem), bar: Math.round(bar) };
  if (access.coords) result.atWeight = weightAxis.max;
  return result;
}

/** Face facts from table(name) -> Buffer|null and an optional glyph reader {has, read}. */
function measureFace(table, read) {
  const cmapMap = readCmap(table("cmap"));
  const name = readName(table("name"));
  const fvar = table("fvar");
  const weights = readWeights(table("OS/2"), fvar);
  const head = table("head");
  const access = head ? glyphAccess(table, read, weights.axis, fvar) : null;
  const contrast = strokeContrast(access, cmapMap, weights.axis);
  return {
    family: name.family || null,
    subfamily: name.subfamily || null,
    version: name.version || null,
    weightClass: weights.weightClass ?? null,
    weightAxis: weights.axis || null,
    outlines: access ? "truetype" : "cff",
    checksumAdjustment: head ? head.readUInt32BE(8).toString(16).padStart(8, "0") : null,
    contrast,
    codepoints: [...cmapMap.keys()].sort((a, b) => a - b),
  };
}

function localReader(face) {
  return {
    has: (name) => face.has(name),
    read: (name, offset, length) => face.table(name).subarray(offset, offset + length),
  };
}

/** Every face of a local font file, measured. */
function measureFile(file) {
  const buf = fs.readFileSync(file);
  const { format, faces } = facesOfBuffer(buf, file);
  return faces.map((face, index) => ({
    file,
    face: index,
    format,
    bytes: buf.length,
    sha256: crypto.createHash("sha256").update(buf).digest("hex"),
    ...measureFace((name) => face.table(name), localReader(face)),
  }));
}

// ---------------------------------------------------------------------------------------------
// Compact codepoint sets: sorted ranges as varint (gap, length) pairs, raw-deflated, base64.

function encodeCodepoints(codepoints) {
  const bytes = [];
  const varint = (value) => {
    while (value > 127) {
      bytes.push((value & 127) | 128);
      value >>>= 7;
    }
    bytes.push(value);
  };
  let previous = -1;
  for (let i = 0; i < codepoints.length; ) {
    let j = i;
    while (j + 1 < codepoints.length && codepoints[j + 1] === codepoints[j] + 1) j += 1;
    varint(codepoints[i] - previous - 1);
    varint(j - i);
    previous = codepoints[j];
    i = j + 1;
  }
  return zlib.deflateRawSync(Buffer.from(bytes), { level: 9 }).toString("base64");
}

function decodeCodepoints(encoded) {
  const bytes = zlib.inflateRawSync(Buffer.from(encoded, "base64"));
  const out = [];
  let at = 0;
  const varint = () => {
    let value = 0;
    let shift = 0;
    for (;;) {
      const byte = bytes[at++];
      value += (byte & 127) * 2 ** shift;
      if (byte < 128) return value;
      shift += 7;
    }
  };
  let previous = -1;
  while (at < bytes.length) {
    const start = previous + 1 + varint();
    const length = varint();
    for (let c = start; c <= start + length; c += 1) out.push(c);
    previous = start + length;
  }
  return out;
}

function coverageOf(codepointSet) {
  const sets = glyphSets();
  const coverage = {};
  for (const [id, set] of Object.entries(sets)) {
    const covered = set.codepoints.filter((cp) => codepointSet.has(cp)).length;
    coverage[id] = { covered, total: set.codepoints.length, ratio: Math.round((covered / set.codepoints.length) * 10000) / 10000 };
  }
  return coverage;
}

// ---------------------------------------------------------------------------------------------
// Styles. Measured contrast decides mincho vs gothic for serif/sans CJK families; the source's
// category and the registry's reviewed overrides add kai, fangsong, round, display, handwriting.

const STYLES = ["mincho", "gothic", "kai", "fangsong", "round", "display", "handwriting", "mono"];
const STYLE_LABELS = { mincho: "明朝/宋", gothic: "黑/ゴシック", kai: "楷", fangsong: "仿宋", round: "圆/丸", display: "展示", handwriting: "手写", mono: "等宽" };
const HIGH_CONTRAST = 1.8;
const LOW_CONTRAST_SERIF = 1.3;

function styleTags({ category, contrast, override }) {
  const tags = new Set();
  const c = String(category || "").toUpperCase();
  if (override && override.length) override.forEach((tag) => tags.add(tag));
  else {
    // A serif CJK face whose 十 is near-even (brush, rounded or UD designs) is left unclassified
    // rather than called gothic; the registry's reviewed overrides name those.
    if (c === "SERIF" && !(contrast !== null && contrast < LOW_CONTRAST_SERIF)) tags.add("mincho");
    if (c === "SANS_SERIF") tags.add("gothic");
    if (c === "DISPLAY") tags.add("display");
    if (c === "HANDWRITING") tags.add("handwriting");
    if (c === "MONOSPACE") tags.add("mono");
  }
  return [...tags].filter((tag) => STYLES.includes(tag));
}

// ---------------------------------------------------------------------------------------------
// Catalog loading and querying.

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function loadSources(file = SOURCES_FILE) {
  const sources = readJson(file);
  if (sources.schema !== SOURCES_SCHEMA) throw new FontError("FONT_SOURCES_INVALID", `${file} is not ${SOURCES_SCHEMA}`, "Restore skill/references/fonts/sources.json from the package.");
  return sources;
}

function userCatalogFile(cacheRootFn) {
  return path.join(cacheRootFn(), "fonts", "catalog.json");
}

/** The catalog to read: --catalog, else a refreshed user cache, else the packaged one. */
function resolveCatalog({ catalog, cacheRoot }) {
  const candidates = catalog ? [["option", path.resolve(catalog)]] : [["cache", userCatalogFile(cacheRoot)], ["packaged", CATALOG_FILE]];
  for (const [origin, file] of candidates) {
    if (!fs.existsSync(file)) {
      if (origin === "option") throw new FontError("FONT_CATALOG_MISSING", `${file} does not exist`, "Pass a catalog written by `fonts refresh --output <file>`, or omit --catalog to use the packaged one.");
      continue;
    }
    const value = readJson(file);
    if (value.schema !== CATALOG_SCHEMA) throw new FontError("FONT_CATALOG_INVALID", `${file} is not ${CATALOG_SCHEMA}`, "Regenerate it with `designer-pipeline fonts refresh`.");
    return { origin, file, catalog: value };
  }
  throw new FontError("FONT_CATALOG_MISSING", "no font catalog is packaged or cached", "Reinstall the skill or run `designer-pipeline fonts refresh`.");
}

function listFontFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (FONT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) out.push(full);
    }
  };
  walk(target);
  return out;
}

function textCodepoints(text) {
  // Whitespace and control characters are not drawn from the font.
  return [...new Set([...String(text)].filter((ch) => !/[\s\p{Cc}]/u.test(ch)).map((ch) => ch.codePointAt(0)))];
}

function weightsOf(entry) {
  const list = new Set(entry.weights || []);
  return [...list].sort((a, b) => a - b);
}

function fileMaxWeight(file) {
  return Math.max(file.weightAxis ? file.weightAxis.max : 0, ...(file.weights || []), file.weightClass || 0);
}

function maxWeight(entry) {
  const axisMax = (entry.files || []).reduce((max, file) => Math.max(max, file.weightAxis ? file.weightAxis.max : 0), 0);
  return Math.max(axisMax, ...weightsOf(entry), 0);
}

/**
 * Candidates for a string and a style role. A candidate covers every codepoint in every listed
 * file (a family whose weights differ in coverage is judged per file); a near miss lists what lacks.
 */
function queryCatalog({ catalog, text, style, contrast, weight, localFaces = [] }) {
  const wanted = textCodepoints(text);
  if (!wanted.length) throw new FontError("FONT_QUERY_TEXT_EMPTY", "the query text has no drawable characters", "Pass the real copy with --text or --text-file.");
  if (style && !STYLES.includes(style)) throw new FontError("FONT_QUERY_STYLE_INVALID", `--style must be one of ${STYLES.join(", ")}`, `Use one of: ${STYLES.map((s) => `${s} (${STYLE_LABELS[s]})`).join(", ")}.`);
  if (contrast && !["high", "low"].includes(contrast)) throw new FontError("FONT_QUERY_CONTRAST_INVALID", "--contrast must be high or low", "Use --contrast high for thick-stem/thin-bar faces or low for even strokes.");
  const minWeight = weight === null || weight === undefined ? null : Number(weight);
  if (minWeight !== null && !(Number.isInteger(minWeight) && minWeight >= 1 && minWeight <= 1000)) throw new FontError("FONT_QUERY_WEIGHT_INVALID", "--weight must be an integer from 1 to 1000", "Pass the lightest acceptable weight, e.g. --weight 700.");
  const cmaps = new Map();
  const setOf = (id) => {
    if (!cmaps.get(id)) cmaps.set(id, new Set(decodeCodepoints(catalog.cmaps[id])));
    return cmaps.get(id);
  };
  const entries = [
    ...(catalog.families || []).map((family) => ({ ...family, origin: "catalog", files: family.files.map((file) => ({ ...file, set: () => setOf(file.cmap) })) })),
    ...localFaces.map((face) => ({ ...face, origin: "local" })),
  ];
  const candidates = [];
  const missing = [];
  const excluded = [];
  for (const entry of entries) {
    const reasons = [];
    if (style && !entry.styles.includes(style)) reasons.push(`style ${entry.styles.join("/") || "unknown"}`);
    if (contrast === "high" && !(entry.contrast !== null && entry.contrast >= HIGH_CONTRAST)) reasons.push(`contrast ${entry.contrast ?? "unmeasured"} < ${HIGH_CONTRAST}`);
    if (contrast === "low" && !(entry.contrast !== null && entry.contrast < HIGH_CONTRAST)) reasons.push(`contrast ${entry.contrast ?? "unmeasured"} not < ${HIGH_CONTRAST}`);
    if (minWeight !== null && maxWeight(entry) < minWeight) reasons.push(`heaviest weight ${maxWeight(entry)} < ${minWeight}`);
    if (reasons.length) {
      excluded.push({ family: entry.family, origin: entry.origin, reasons });
      continue;
    }
    // With --weight, only the files that reach it must cover the text (a light weight may lack glyphs).
    const files = minWeight === null ? entry.files : entry.files.filter((file) => fileMaxWeight(file) >= minWeight);
    const lacking = new Set();
    for (const file of files) {
      const set = file.set();
      for (const cp of wanted) if (!set.has(cp)) lacking.add(cp);
    }
    const row = {
      family: entry.family,
      origin: entry.origin,
      source: entry.source || null,
      styles: entry.styles,
      contrast: entry.contrast,
      weights: weightsOf(entry),
      weightAxis: entry.files.find((file) => file.weightAxis)?.weightAxis || null,
      license: entry.license || null,
      files: files.map((file) => file.url || file.path),
      coverage: { covered: wanted.length - lacking.size, total: wanted.length },
    };
    if (lacking.size) missing.push({ ...row, missing: [...lacking].map((cp) => String.fromCodePoint(cp)).join("") });
    else candidates.push(row);
  }
  const byStrength = (a, b) => (b.contrast ?? 0) - (a.contrast ?? 0) || a.family.localeCompare(b.family);
  candidates.sort(byStrength);
  missing.sort((a, b) => b.coverage.covered / b.coverage.total - a.coverage.covered / a.coverage.total || byStrength(a, b));
  return { text: [...new Set([...String(text)])].join(""), characters: wanted.length, candidates, missing, excluded };
}

// Local files carry no source category, so their family name supplies the hint the registry gives
// catalog families; measured contrast still separates mincho from gothic when the name is silent.
const NAME_HINTS = [
  [/fang ?song|仿宋/i, ["fangsong"]],
  [/kai|楷/i, ["kai"]],
  [/maru|round|圆|丸/i, ["round"]],
  [/mincho|ming|song|serif|明朝|宋/i, ["mincho"]],
  [/gothic|sans|hei|黑|ゴシック/i, ["gothic"]],
];

function localStyles(family, contrast) {
  for (const [pattern, styles] of NAME_HINTS) if (pattern.test(family || "")) return styles;
  if (contrast === null) return [];
  return contrast >= LOW_CONTRAST_SERIF ? ["mincho"] : ["gothic"];
}

/** Local faces grouped by family into query entries (same shape as catalog families). */
function localEntries(measuredFaces) {
  const byFamily = new Map();
  for (const face of measuredFaces) {
    const family = face.family || path.basename(face.file);
    if (!byFamily.has(family)) byFamily.set(family, []);
    byFamily.get(family).push(face);
  }
  return [...byFamily].map(([family, faces]) => {
    const contrasts = faces.map((face) => face.contrast.value).filter((value) => value !== null);
    const contrast = contrasts.length ? Math.max(...contrasts) : null;
    return {
      family,
      source: "local",
      styles: localStyles(family, contrast),
      contrast,
      weights: [...new Set(faces.map((face) => face.weightClass).filter(Boolean))],
      license: null,
      files: faces.map((face) => {
        const set = new Set(face.codepoints);
        return { path: face.format === "ttc" ? `${face.file}#${face.face}` : face.file, weightClass: face.weightClass, weightAxis: face.weightAxis, set: () => set };
      }),
    };
  });
}

module.exports = {
  CATALOG_FILE,
  CATALOG_SCHEMA,
  FontError,
  HIGH_CONTRAST,
  SOURCES_FILE,
  SOURCES_SCHEMA,
  STYLES,
  STYLE_LABELS,
  coverageOf,
  decodeCodepoints,
  encodeCodepoints,
  facesOfBuffer,
  glyphContours,
  glyphSets,
  listFontFiles,
  loadSources,
  localEntries,
  localStyles,
  measureFace,
  measureFile,
  queryCatalog,
  readCmap,
  resolveCatalog,
  sniff,
  styleTags,
  tableDirectory,
  textCodepoints,
  userCatalogFile,
  woffDirectory,
};

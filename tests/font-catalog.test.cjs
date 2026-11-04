"use strict";

// Open-font catalog (change add-open-font-catalog): cmap reading, glyph sets, stroke contrast with
// gvar instancing, the packaged catalog's licence lineage, and the 夜想回廊 acceptance query.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const cli = path.join(repoRoot, "skill/scripts/designer-pipeline.cjs");
const core = require("../skill/scripts/font-catalog-core.cjs");
const { mergeCatalog, parseTextproto, measureRemote } = require("../skill/scripts/refresh-font-catalog.cjs");

const catalog = JSON.parse(fs.readFileSync(core.CATALOG_FILE, "utf8"));
const sources = core.loadSources();

// The real copy of the 夜想回廊 experiment (simplified Chinese title cards and chapter names).
const NOCTURNE = ["门在身后关上。走廊，又长了一间。", "钥匙不是用来开门的", "蝴蝶标本的证词", "眼睛记得的事", "记忆标本", "剪掉的那一页", "齿轮在墙里走", "第七级台阶不存在", "夜想回廊制作委员会"].join("\n");

function run(args, cache = fs.mkdtempSync(path.join(os.tmpdir(), "font-cache-"))) {
  const child = spawnSync(process.execPath, [cli, ...args, "--json"], { cwd: repoRoot, encoding: "utf8", env: { ...process.env, DESIGN_PIPELINE_CACHE: cache } });
  let value = null;
  try {
    value = JSON.parse(child.stdout);
  } catch {}
  return { status: child.status, value, stderr: child.stderr, stdout: child.stdout };
}

// ---------------------------------------------------------------------------------------------
// A minimal TrueType font builder: cmap (format 4, optionally 12), head, OS/2, loca, glyf and an
// optional fvar/gvar pair. 十 is a stem rectangle (100 wide) over a bar rectangle (20 thick).

function u16(...values) {
  const buf = Buffer.alloc(values.length * 2);
  values.forEach((value, i) => buf.writeUInt16BE(value & 0xffff, i * 2));
  return buf;
}
function u32(value) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value >>> 0);
  return buf;
}

function cmapFormat4(map, arraySegment) {
  const codes = Object.keys(map).map(Number).filter((cp) => cp <= 0xffff).sort((a, b) => a - b);
  const segments = codes.map((cp) => ({ start: cp, end: cp, delta: (map[cp] - cp) & 0xffff, array: cp === arraySegment }));
  segments.push({ start: 0xffff, end: 0xffff, delta: 1, array: false });
  const n = segments.length;
  const glyphArray = [];
  const rangeOffsets = segments.map((segment, i) => {
    if (!segment.array) return 0;
    const offset = (n - i + glyphArray.length) * 2;
    glyphArray.push(map[segment.start]);
    segment.delta = 0;
    return offset;
  });
  const body = Buffer.concat([
    u16(...segments.map((s) => s.end)),
    u16(0),
    u16(...segments.map((s) => s.start)),
    u16(...segments.map((s) => s.delta)),
    u16(...rangeOffsets),
    u16(...glyphArray),
  ]);
  return Buffer.concat([u16(4, 14 + body.length, 0, n * 2, 0, 0, 0), body]);
}

function cmapFormat12(map) {
  const codes = Object.keys(map).map(Number).sort((a, b) => a - b);
  const groups = codes.map((cp) => Buffer.concat([u32(cp), u32(cp), u32(map[cp])]));
  return Buffer.concat([u16(12, 0), u32(16 + groups.length * 12), u32(0), u32(groups.length), ...groups]);
}

function simpleGlyph(contours) {
  const points = contours.flat();
  const ends = [];
  let total = 0;
  for (const contour of contours) ends.push((total += contour.length) - 1);
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const deltas = (values) => values.map((v, i) => v - (i ? values[i - 1] : 0));
  const buf = Buffer.concat([
    u16(contours.length, Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)),
    u16(...ends),
    u16(0),
    Buffer.from(points.map(() => 1)),
    u16(...deltas(xs)),
    u16(...deltas(ys)),
  ]);
  return buf.length % 2 ? Buffer.concat([buf, Buffer.alloc(1)]) : buf;
}

const SHI = [
  [[450, 0], [450, 1000], [550, 1000], [550, 0]],
  [[0, 480], [0, 500], [1000, 500], [1000, 480]],
];

function gvarTable(glyphData) {
  const offsets = [0, 0, glyphData.length / 2];
  return Buffer.concat([u16(1, 0, 1, 0), u32(0), u16(2, 0), u32(20 + 6), u16(...offsets), glyphData]);
}

// Bar top points (6 and 7 of the 十 outline after its 4 stem points... indices 5 and 6 in SHI order)
// move up by 20 at wght max, doubling the bar's thickness.
function variationAllPoints() {
  const y = new Array(12).fill(0);
  y[5] = 20;
  y[6] = 20;
  const serialized = Buffer.concat([Buffer.from([0x80 | 11]), Buffer.from([11]), Buffer.from(y.map((v) => v & 0xff))]);
  return Buffer.concat([u16(1, 10, serialized.length, 0x8000, 16384), serialized]);
}
function variationTwoPoints() {
  // Private points 5 and 6 only; IUP moves the untouched bar points (4, 7) with them.
  const serialized = Buffer.concat([Buffer.from([2, 0x01, 5, 1]), Buffer.from([0x80 | 1]), Buffer.from([0x01, 20, 20])]);
  return Buffer.concat([u16(1, 10, serialized.length, 0x8000 | 0x2000, 16384), serialized]);
}

function buildFont({ map = { 0x5341: 1, 0x41: 1 }, arraySegment = null, supplementary = null, weight = 400, variation = null } = {}) {
  const cmapSubtables = [[3, 1, cmapFormat4(map, arraySegment)]];
  if (supplementary) cmapSubtables.push([3, 10, cmapFormat12({ ...map, ...supplementary })]);
  let offset = 4 + cmapSubtables.length * 8;
  const records = [];
  for (const [platform, encoding, table] of cmapSubtables) {
    records.push(Buffer.concat([u16(platform, encoding), u32(offset)]));
    offset += table.length;
  }
  const cmap = Buffer.concat([u16(0, cmapSubtables.length), ...records, ...cmapSubtables.map((s) => s[2])]);
  const glyph = simpleGlyph(SHI);
  const head = Buffer.alloc(54);
  head.writeUInt32BE(0x00010000, 0);
  head.writeUInt32BE(0x12345678, 8);
  head.writeUInt16BE(1000, 18);
  head.writeInt16BE(0, 50);
  const os2 = Buffer.alloc(8);
  os2.writeUInt16BE(weight, 4);
  const tables = { cmap, head, "OS/2": os2, loca: u16(0, 0, glyph.length / 2), glyf: glyph };
  if (variation) {
    tables.fvar = Buffer.concat([u16(1, 0, 16, 2, 1, 20, 0, 4), Buffer.from("wght"), u32(100 << 16), u32(400 << 16), u32(900 << 16), u16(0, 256)]);
    tables.gvar = gvarTable(variation);
  }
  return sfnt(tables);
}

function sfnt(tables) {
  const names = Object.keys(tables).sort();
  let offset = 12 + names.length * 16;
  const directory = [];
  const bodies = [];
  for (const name of names) {
    const body = tables[name];
    const padded = Buffer.concat([body, Buffer.alloc((4 - (body.length % 4)) % 4)]);
    directory.push(Buffer.concat([Buffer.from(name.padEnd(4)), u32(0), u32(offset), u32(body.length)]));
    bodies.push(padded);
    offset += padded.length;
  }
  return Buffer.concat([u32(0x00010000), u16(names.length, 0, 0, 0), ...directory, ...bodies]);
}

function woff(font) {
  const { tables } = core.tableDirectory(font);
  const names = Object.keys(tables);
  let offset = 44 + names.length * 20;
  const directory = [];
  const bodies = [];
  for (const name of names) {
    const raw = font.subarray(tables[name].offset, tables[name].offset + tables[name].length);
    const packed = zlib.deflateSync(raw);
    const body = packed.length < raw.length ? packed : raw;
    const padded = Buffer.concat([body, Buffer.alloc((4 - (body.length % 4)) % 4)]);
    directory.push(Buffer.concat([Buffer.from(name.padEnd(4)), u32(offset), u32(body.length), u32(raw.length), u32(0)]));
    bodies.push(padded);
    offset += padded.length;
  }
  const header = Buffer.alloc(44);
  header.write("wOFF", 0, "latin1");
  header.writeUInt32BE(0x00010000, 4);
  header.writeUInt16BE(names.length, 12);
  return Buffer.concat([header, ...directory, ...bodies]);
}

function ttc(font) {
  // One face at offset 16: the sfnt's table offsets shift by 16.
  const shifted = Buffer.from(font);
  const count = shifted.readUInt16BE(4);
  for (let i = 0; i < count; i += 1) shifted.writeUInt32BE(shifted.readUInt32BE(12 + i * 16 + 8) + 16, 12 + i * 16 + 8);
  return Buffer.concat([Buffer.from("ttcf"), u32(0x00010000), u32(1), u32(16), shifted]);
}

function tempFont(name, bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "font-catalog-"));
  const file = path.join(dir, name);
  fs.writeFileSync(file, bytes);
  return file;
}

// ---------------------------------------------------------------------------------------------

test("glyph sets have the standards' own sizes", () => {
  const sets = core.glyphSets();
  assert.equal(sets["tongyong-3500"].codepoints.length, 3500);
  assert.equal(sets["tongyong-8105"].codepoints.length, 8105);
  assert.equal(sets.gb2312.codepoints.length, 6763);
  assert.equal(sets["jis-level-1"].codepoints.length, 2965);
  assert.equal(sets["big5-common"].codepoints.length, 5401);
  const level1 = new Set(sets["tongyong-3500"].codepoints);
  for (const ch of "钥证记间门") assert.ok(level1.has(ch.codePointAt(0)), `${ch} is a 通用规范 level-1 character`);
});

test("reads cmap formats 4 (delta and glyph array) and 12, skipping glyph 0", () => {
  const font = buildFont({ map: { 0x5341: 1, 0x41: 1, 0x42: 0, 0x4e00: 1 }, arraySegment: 0x4e00, supplementary: { 0x20000: 1 } });
  const [face] = core.measureFile(tempFont("a.ttf", font));
  assert.deepEqual(face.codepoints, [0x41, 0x4e00, 0x5341, 0x20000]);
  assert.equal(face.weightClass, 400);
  assert.equal(face.checksumAdjustment, "12345678");
});

test("reads WOFF and TTC wrappers to the same cmap, and refuses WOFF2 and non-fonts with a fix", () => {
  const font = buildFont();
  const plain = core.measureFile(tempFont("a.ttf", font))[0];
  assert.deepEqual(core.measureFile(tempFont("a.woff", woff(font)))[0].codepoints, plain.codepoints);
  const collection = core.measureFile(tempFont("a.ttc", ttc(font)));
  assert.equal(collection.length, 1);
  assert.deepEqual(collection[0].codepoints, plain.codepoints);
  assert.equal(collection[0].contrast.value, plain.contrast.value);
  const woff2 = Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(60)]);
  assert.throws(() => core.measureFile(tempFont("a.woff2", woff2)), (error) => error.code === "FONT_FORMAT_UNSUPPORTED" && /decompress/.test(error.fix));
  assert.throws(() => core.measureFile(tempFont("a.ttf", Buffer.from("<html>not a font</html>"))), (error) => error.code === "FONT_UNREADABLE" && Boolean(error.fix));
});

test("stroke contrast reads 十 and a variable font is measured at its heaviest weight", () => {
  const still = core.measureFile(tempFont("a.ttf", buildFont()))[0];
  assert.deepEqual(still.contrast, { value: 5, stem: 100, bar: 20 });
  const variable = core.measureFile(tempFont("v.ttf", buildFont({ variation: variationAllPoints() })))[0];
  assert.deepEqual(variable.weightAxis, { min: 100, default: 400, max: 900 });
  assert.deepEqual(variable.contrast, { value: 2.5, stem: 100, bar: 40, atWeight: 900 });
  // Deltas on two points only: IUP carries the untouched bar points along, so the bar moves, not thickens.
  const partial = core.measureFile(tempFont("p.ttf", buildFont({ variation: variationTwoPoints() })))[0];
  assert.equal(partial.contrast.value, 5);
  const noShi = core.measureFile(tempFont("k.ttf", buildFont({ map: { 0x41: 1 } })))[0];
  assert.equal(noShi.contrast.value, null);
  assert.match(noShi.contrast.reason, /十/);
});

test("codepoint encoding round-trips sparse and supplementary sets", () => {
  const set = [0x20, 0x21, 0x22, 0x4e00, 0x4e02, 0x9fa5, 0x20000, 0x2a6d6];
  assert.deepEqual(core.decodeCodepoints(core.encodeCodepoints(set)), set);
  assert.deepEqual(core.decodeCodepoints(core.encodeCodepoints([])), []);
});

test("METADATA.pb text format parses nested and repeated fields", () => {
  const parsed = parseTextproto('name: "Noto Serif SC"\nlicense: "OFL"\nfonts {\n  weight: 400\n  filename: "NotoSerifSC[wght].ttf"\n}\nsubsets: "latin"\nsubsets: "chinese-simplified"  # comment\naxes {\n  tag: "wght"\n  min_value: 200.0\n}\n');
  assert.equal(parsed.license, "OFL");
  assert.deepEqual(parsed.subsets, ["latin", "chinese-simplified"]);
  assert.equal(parsed.fonts.filename, "NotoSerifSC[wght].ttf");
  assert.equal(parsed.axes.min_value, 200);
});

test("remote measurement reads by range and refuses a server that ignores Range", async () => {
  const font = buildFont({ variation: variationAllPoints() });
  let ignoreRange = false;
  let served = 0;
  const server = http.createServer((request, response) => {
    const match = /bytes=(\d+)-(\d+)/.exec(request.headers.range || "");
    if (ignoreRange || !match) {
      response.writeHead(200, { "content-length": font.length });
      response.end(font);
      return;
    }
    const [start, end] = [Number(match[1]), Math.min(Number(match[2]), font.length - 1)];
    served += end - start + 1;
    response.writeHead(206, { "content-range": `bytes ${start}-${end}/${font.length}` });
    response.end(font.subarray(start, end + 1));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}/f.ttf`;
  try {
    const measured = await measureRemote(url);
    assert.equal(measured.bytes, font.length);
    assert.equal(measured.contrast.value, 2.5);
    assert.deepEqual(measured.codepoints, [0x41, 0x5341]);
    assert.ok(served <= font.length);
    ignoreRange = true;
    await assert.rejects(measureRemote(url), /ignored the Range request/);
  } finally {
    server.close();
  }
});

test("the packaged catalog pins its sources and traces every licence to a file at that revision", () => {
  assert.equal(catalog.schema, core.CATALOG_SCHEMA);
  for (const source of sources.sources.filter((s) => s.measure)) {
    assert.deepEqual(catalog.revisions[source.id], { repository: source.repository, revision: source.revision, pinned: source.revision }, source.id);
  }
  // Only warnings: a family whose directory has no licence text is named, never dropped silently.
  assert.ok(catalog.problems.every((problem) => problem.severity === "warning" && problem.fix));
  const textless = new Set(catalog.problems.filter((p) => p.code === "FONT_LICENSE_TEXT_MISSING").map((p) => p.path));
  for (const [id, set] of Object.entries(core.glyphSets())) assert.equal(catalog.glyphSets[id].total, set.codepoints.length);
  const families = new Set();
  for (const family of catalog.families) {
    families.add(family.family);
    const { revision, repository } = catalog.revisions[family.source];
    const prefix = `https://raw.githubusercontent.com/${repository.replace("https://github.com/", "")}/${revision}/`;
    assert.ok(family.license.declaredIn.file.startsWith(prefix), `${family.family} licence is declared at the pinned revision`);
    const directory = family.files[0].url.slice(prefix.length).split("/").slice(0, -1).join("/");
    if (family.license.text) assert.ok(family.license.text.file.startsWith(prefix) && /^[0-9a-f]{64}$/.test(family.license.text.sha256), `${family.family} licence text`);
    else assert.ok(textless.has(directory), `${family.family} without licence text is reported`);
    assert.equal(typeof family.license.commercial, "boolean", `${family.family} states commercial use`);
    for (const file of family.files) {
      assert.ok(file.url.startsWith(prefix));
      assert.ok(catalog.cmaps[file.cmap], `${family.family} cmap ${file.cmap} is present`);
      assert.equal(core.decodeCodepoints(catalog.cmaps[file.cmap]).length, file.codepoints);
    }
    for (const style of family.styles) assert.ok(core.STYLES.includes(style));
  }
  for (const name of ["Noto Serif SC", "Shippori Mincho B1", "Zen Old Mincho", "LXGW WenKai"]) assert.ok(families.has(name), name);
  const overrides = sources.sources.find((s) => s.id === "google-fonts").styleOverrides;
  for (const [directory, override] of Object.entries(overrides)) assert.ok(override.reason, `${directory} override has a reason`);
  // A blocked source stays recorded, never silently measured.
  assert.equal(sources.sources.find((s) => s.id === "zhuque-fangsong").status, "blocked");
});

test("夜想回廊: bold mincho with full simplified coverage returns only cmap-verified candidates", () => {
  const result = core.queryCatalog({ catalog, text: NOCTURNE, style: "mincho", weight: 700 });
  const wanted = core.textCodepoints(NOCTURNE);
  assert.ok(result.candidates.length >= 1);
  assert.ok(result.candidates.some((row) => row.family === "Noto Serif SC"));
  for (const row of result.candidates) {
    const family = catalog.families.find((f) => f.family === row.family);
    for (const file of family.files.filter((f) => Math.max(f.weightAxis?.max || 0, ...f.weights) >= 700)) {
      const set = new Set(core.decodeCodepoints(catalog.cmaps[file.cmap]));
      assert.deepEqual(wanted.filter((cp) => !set.has(cp)), [], `${row.family} covers every character`);
    }
    assert.ok(row.styles.includes("mincho"));
  }
  const missing = Object.fromEntries(result.missing.map((row) => [row.family, row.missing]));
  for (const family of ["Shippori Mincho B1", "Shippori Mincho", "Zen Old Mincho"]) {
    assert.ok(missing[family], `${family} is reported with its missing characters`);
    for (const ch of "钥证记") assert.ok(missing[family].includes(ch), `${family} lacks ${ch}`);
  }
  assert.equal(missing["Zen Old Mincho"].includes("门"), true);
});

test("query rejects bad input with a fix and blocks when nothing covers the text", () => {
  assert.throws(() => core.queryCatalog({ catalog, text: " \n" }), (error) => error.code === "FONT_QUERY_TEXT_EMPTY" && Boolean(error.fix));
  assert.throws(() => core.queryCatalog({ catalog, text: "门", style: "serif" }), (error) => error.code === "FONT_QUERY_STYLE_INVALID" && /mincho/.test(error.fix));
  assert.throws(() => core.queryCatalog({ catalog, text: "门", weight: "bold" }), (error) => error.code === "FONT_QUERY_WEIGHT_INVALID");
  const none = run(["fonts", "query", "--text", "门\u{2B81D}", "--style", "kai", "--weight", "900"]);
  assert.equal(none.status, 2, none.stderr);
  assert.equal(none.value.status, "blocked");
  assert.equal(none.value.findings[0].code, "font-coverage-none");
  assert.ok(none.value.findings[0].fix);
});

test("CLI: query merges local fonts, measure reports coverage, refresh needs a source for a revision", () => {
  const dir = path.dirname(tempFont("ShiSans.ttf", buildFont()));
  const query = run(["fonts", "query", "--text", "十", "--path", dir, "--contrast", "high"]);
  assert.equal(query.status, 0, query.stderr);
  const local = query.value.candidates.find((row) => row.origin === "local");
  assert.ok(local, "the local face is a candidate");
  assert.match(local.licenseNote, /record the licence/);
  assert.equal(query.value.catalog.origin, "packaged");

  // No face covers 门, so measure exits 2 and names the missing character.
  const measure = run(["fonts", "measure", "--path", dir, "--text", "十A门"]);
  assert.equal(measure.status, 2, measure.stderr);
  assert.equal(measure.value.status, "blocked");
  assert.equal(measure.value.faces[0].missing, "门");
  assert.equal(measure.value.faces[0].coverage.latin.covered, 1);

  const refresh = run(["fonts", "refresh", "--revision", "head"]);
  assert.notEqual(refresh.status, 0);
  assert.match(refresh.stderr + refresh.stdout, /--revision needs --source/);
  const unknown = run(["fonts", "query", "--text", "门", "--font", "x"]);
  assert.match(unknown.stderr + unknown.stdout, /UNKNOWN_OPTION|unknown option/);
});

// ---------------------------------------------------------------------------------------------
// Review fixes (PR #290): ranges, corrupt files, cache merge and staleness, row problems, licences.

async function withRangeServer(font, mode, body) {
  const server = http.createServer((request, response) => {
    const match = /bytes=(\d+)-(\d+)/.exec(request.headers.range || "");
    const [a, b] = [Number(match[1]), Math.min(Number(match[2]), font.length - 1)];
    let chunk = font.subarray(a, b + 1);
    let range = `bytes ${a}-${b}/${font.length}`;
    if (mode === "truncate" && a > 0) chunk = chunk.subarray(0, Math.max(1, Math.floor(chunk.length * 0.6)));
    if (mode === "wrong-offset" && a > 0) {
      chunk = font.subarray(0, b - a + 1);
      range = `bytes 0-${b - a}/${font.length}`;
    }
    if (mode === "rest-of-file" && a > 0) {
      chunk = font.subarray(a);
      range = `bytes ${a}-${font.length - 1}/${font.length}`;
    }
    if (mode === "no-content-range") range = null;
    response.writeHead(206, { ...(range ? { "content-range": range } : {}), "content-length": chunk.length });
    response.end(chunk);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    return await body(`http://127.0.0.1:${server.address().port}/f.ttf`);
  } finally {
    server.close();
  }
}

test("a truncated, shifted or over-long 206 is refused, never measured as a smaller font", async () => {
  const font = buildFont({ variation: variationAllPoints() });
  await withRangeServer(font, "honest", async (url) => assert.equal((await measureRemote(url)).contrast.value, 2.5));
  for (const mode of ["truncate", "wrong-offset", "rest-of-file", "no-content-range"]) {
    await withRangeServer(font, mode, (url) => assert.rejects(measureRemote(url), /misaligned or truncated|Content-Range/, mode));
  }
});

test("corrupt fonts raise FONT_UNREADABLE with a fix; one bad file under --path does not stop the query", () => {
  const good = buildFont({ map: { 0x5341: 1, 0x41: 1, 0x4e00: 1 }, arraySegment: 0x4e00 });
  assert.throws(() => core.measureFile(tempFont("cut.ttf", good.subarray(0, good.length - 40))), (error) => error.code === "FONT_UNREADABLE" && Boolean(error.fix));
  // A glyph-array offset past the cmap table: previously read as glyph 0 (silently missing).
  const { tables } = core.tableDirectory(good);
  const broken = Buffer.from(good);
  const cmapAt = tables.cmap.offset;
  const sub = cmapAt + broken.readUInt32BE(cmapAt + 8);
  const segments = broken.readUInt16BE(sub + 6) / 2;
  const rangeOffsets = sub + 14 + segments * 6 + 2;
  for (let k = 0; k < segments; k += 1) if (broken.readUInt16BE(rangeOffsets + 2 * k)) broken.writeUInt16BE(0x7ff0, rangeOffsets + 2 * k);
  assert.throws(() => core.measureFile(tempFont("oob.ttf", broken)), (error) => error.code === "FONT_UNREADABLE" && /past the table/.test(error.message));
  const huge = Buffer.concat([Buffer.from("ttcf"), u32(0x00010000), u32(0x7fffffff), u32(16)]);
  assert.throws(() => core.measureFile(tempFont("huge.ttc", huge)), (error) => error.code === "FONT_UNREADABLE");

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "font-mixed-"));
  fs.writeFileSync(path.join(dir, "Good.ttf"), good);
  fs.writeFileSync(path.join(dir, "Bad.ttf"), broken);
  const query = run(["fonts", "query", "--text", "十", "--path", dir]);
  assert.equal(query.status, 0, query.stderr);
  assert.ok(query.value.candidates.some((row) => row.origin === "local"));
  assert.deepEqual(query.value.localProblems.map((problem) => [path.basename(problem.file), problem.code]), [["Bad.ttf", "FONT_UNREADABLE"]]);
  assert.ok(query.value.localProblems[0].fix);
});

test("refresh --source merges into the existing catalog and keeps the other sources", () => {
  const google = catalog.families.filter((family) => family.source === "google-fonts");
  const fresh = { families: [{ family: "LXGW WenKai", source: "lxgw-wenkai", directory: "lxgw-wenkai", files: [{ cmap: "new1" }] }], problems: [], revisions: { "lxgw-wenkai": { repository: "r", revision: "b".repeat(40), pinned: "a".repeat(40) } }, cmaps: { new1: "AA==" } };
  const merged = mergeCatalog(catalog, "lxgw-wenkai", fresh);
  assert.equal(merged.families.length, google.length + 1);
  assert.deepEqual(merged.revisions["google-fonts"], catalog.revisions["google-fonts"]);
  assert.equal(merged.revisions["lxgw-wenkai"].revision, "b".repeat(40));
  assert.deepEqual(merged.problems, catalog.problems.filter((problem) => problem.source !== "lxgw-wenkai"));
  const oldLxgw = catalog.families.find((family) => family.source === "lxgw-wenkai").files.map((file) => file.cmap);
  const stillUsed = new Set(google.flatMap((family) => family.files.map((file) => file.cmap)));
  for (const id of oldLxgw.filter((id) => !stillUsed.has(id))) assert.equal(merged.cmaps[id], undefined, "unreferenced cmaps are dropped");
  assert.equal(merged.cmaps.new1, "AA==");
  // Without --source the refresh is the whole catalog.
  assert.equal(mergeCatalog(catalog, null, fresh).families.length, 1);
});

test("a stale user cache (missing source or older pin) falls back to the packaged catalog", () => {
  const cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "font-cache-"));
  const cacheFile = path.join(cacheDir, "fonts", "catalog.json");
  fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
  const write = (value) => fs.writeFileSync(cacheFile, JSON.stringify(value));
  const query = () => run(["fonts", "query", "--text", "门"], cacheDir).value.catalog;

  write({ ...catalog, revisions: { "google-fonts": catalog.revisions["google-fonts"] } });
  assert.equal(query().origin, "packaged");
  assert.match(query().skippedCache.reason, /no lxgw-wenkai source/);

  write({ ...catalog, revisions: { ...catalog.revisions, "google-fonts": { ...catalog.revisions["google-fonts"], pinned: "0".repeat(40), revision: "0".repeat(40) } } });
  assert.equal(query().origin, "packaged");
  assert.match(query().skippedCache.reason, /pin 0000000/);
  assert.ok(query().skippedCache.fix);

  // A deliberate refresh to a newer commit under the same pin stays in use.
  write({ ...catalog, revisions: { ...catalog.revisions, "google-fonts": { ...catalog.revisions["google-fonts"], revision: "f".repeat(40) } } });
  assert.equal(query().origin, "cache");
  assert.equal(core.staleCacheReason(catalog, catalog), null);
});

test("query rows carry their family's catalog problems; --limit must be a positive integer", () => {
  const result = core.queryCatalog({ catalog, text: "十", style: "round" });
  const rounded = [...result.candidates, ...result.missing].find((row) => row.family === "M PLUS Rounded 1c");
  assert.ok(rounded);
  assert.deepEqual(rounded.problems.map((problem) => problem.code), ["FONT_LICENSE_TEXT_MISSING"]);
  assert.ok(rounded.problems[0].fix);
  const noto = core.queryCatalog({ catalog, text: "十", style: "mincho" }).candidates.find((row) => row.family === "Noto Serif SC");
  assert.deepEqual(noto.problems, []);
  for (const bad of ["0", "-3", "abc", "2.5"]) {
    const limited = run(["fonts", "query", "--text", "门", "--limit", bad]);
    assert.equal(limited.status, 1, `--limit ${bad}`);
    assert.match(limited.stderr + limited.stdout, /--limit/);
  }
  assert.equal(run(["fonts", "query", "--text", "门", "--limit", "2"]).value.candidates.length, 2);
});

test("licence texts are verified against the declared licence; LXGW records its additional permission", () => {
  for (const family of catalog.families) if (family.license.text) assert.equal(family.license.text.verified, true, family.family);
  const lxgw = catalog.families.find((family) => family.family === "LXGW WenKai");
  assert.equal(lxgw.license.id, "OFL");
  assert.match(lxgw.license.text.reservedFontName, /霞鹜/);
  assert.match(lxgw.license.text.additionalPermission, /web font delivery/);
  assert.match(catalog.contrast.measure, /heaviest wght/);
  assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, "skill/references/cjk-typography.md"), "utf8"), /this environment/);
});

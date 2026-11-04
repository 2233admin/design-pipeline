"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");
const { decodePng, encodePng } = require("../skill/scripts/png-core.cjs");
const { cutCollage } = require("../skill/tools/art-motion/assets.cjs");
const materials = require("../skill/scripts/material-core.cjs");
const { execute } = require("../skill/scripts/cli-core.cjs");

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "materials-"));
after(() => fs.rmSync(temporary, { recursive: true, force: true }));

// ---- synthetic sources ---------------------------------------------------------------------

function canvas(width, height, background) {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) data.set([...background(x, y), 255], (y * width + x) * 4);
  return { width, height, data };
}

function paint(image, predicate, color) {
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) if (predicate(x, y)) image.data.set([...color, 255], (y * image.width + x) * 4);
  return image;
}

// A dark key-like object (ring + shaft) at x 70..130, y 40..200 on 200x240.
const keyShape = (x, y) => (Math.hypot(x - 100, y - 70) < 30 && Math.hypot(x - 100, y - 70) > 14) || (x > 94 && x < 106 && y > 95 && y < 200) || (x > 106 && x < 124 && y > 170 && y < 186);
const flat = () => paint(canvas(200, 240, () => [128, 128, 128]), keyShape, [60, 40, 25]);
const gradient = () => paint(canvas(200, 240, (x, y) => { const v = Math.round(215 - (y / 239) * 150); return [v, v, v]; }), keyShape, [60, 40, 25]);
// Line print: dark strokes on paper whose tone drifts from warm cream to grey.
const print = () => paint(canvas(240, 180, (x) => [236 - Math.round(x / 12), 226 - Math.round(x / 14), 200 - Math.round(x / 20)]), (x, y) => (Math.hypot(x - 80, y - 90) < 30 && (x + y) % 5 < 2) || (Math.hypot(x - 170, y - 90) < 22 && (x - y) % 4 < 2) || Math.hypot(x - 80, y - 90) < 8 || Math.hypot(x - 170, y - 90) < 6, [30, 25, 20]);

function bounds(image) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < image.height; y += 1) for (let x = 0; x < image.width; x += 1) if (image.data[(y * image.width + x) * 4 + 3] > 128) {
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

// ---- cutting -------------------------------------------------------------------------------

test("border matte cuts an object on a flat backdrop cleanly and bakes a paper sticker edge", () => {
  const result = cutCollage(encodePng(flat()), { mode: "border", params: { threshold: 14 } });
  assert.deepEqual(result.findings, []);
  const cut = result.outputs.find((o) => o.finish === "cut"), sticker = result.outputs.find((o) => o.finish === "sticker");
  const box = bounds(cut.image);
  // Object spans x 70..130, y 40..200; the crop is padded by 4px.
  assert.ok(Math.abs(cut.placement.x + box.minX - 70) <= 2 && Math.abs(cut.placement.x + box.maxX - 129) <= 2, JSON.stringify({ box, p: cut.placement }));
  assert.ok(Math.abs(cut.placement.y + box.minY - 40) <= 2 && Math.abs(cut.placement.y + box.maxY - 199) <= 2);
  // The sticker is larger and its outer ring is opaque paper colour, not object or backdrop.
  assert.ok(sticker.image.width > cut.image.width && sticker.image.height > cut.image.height);
  const pad = sticker.image.padPx, edgeY = pad + 2 + cut.image.height / 2 | 0;
  let paperPixels = 0;
  for (let x = 0; x < sticker.image.width; x += 1) {
    const o = (edgeY * sticker.image.width + x) * 4, [r, g, b, a] = sticker.image.data.subarray(o, o + 4);
    if (a > 240 && r > 235 && g > 230 && b > 220) paperPixels += 1;
  }
  assert.ok(paperPixels >= sticker.image.edgePx, `paper edge pixels on a scanline: ${paperPixels}`);
});

test("a studio gradient is flagged in border mode and separated in paper mode", () => {
  const input = encodePng(gradient());
  const border = cutCollage(input, { mode: "border", params: { threshold: 14 } });
  assert.ok(border.findings.some((f) => f.code === "matte-uneven-background" && /--mode paper/.test(f.fix)), JSON.stringify(border.findings));
  const paper = cutCollage(input, { mode: "paper", params: { threshold: 14 } });
  assert.ok(!paper.findings.some((f) => f.code === "matte-uneven-background"), JSON.stringify(paper.findings));
  const cut = paper.outputs.find((o) => o.finish === "cut"), box = bounds(cut.image);
  assert.ok(Math.abs(cut.placement.x + box.minX - 70) <= 3 && Math.abs(cut.placement.y + box.maxY - 199) <= 3, JSON.stringify({ box, p: cut.placement }));
  assert.ok(cut.image.width < 80, `gradient backdrop leaked into the piece: ${cut.image.width}px wide`);
});

test("paper mode keeps separate printed motifs as separate pieces; ink and plate finishes", () => {
  const input = encodePng(print());
  const result = cutCollage(input, { mode: "paper", finishes: ["cut", "ink", "plate"], params: { threshold: 18, keep: 4, minFraction: 0.005, close: 3 } });
  const pieces = result.outputs.filter((o) => o.finish === "cut");
  assert.equal(pieces.length, 2, JSON.stringify(result.measurements));
  assert.ok(pieces[0].placement.x < 60 && pieces[1].placement.x > 130);
  const ink = result.outputs.find((o) => o.finish === "ink").image;
  const alpha = (x, y) => ink.data[(y * ink.width + x) * 4 + 3];
  assert.equal(alpha(10, 10), 0, "paper is transparent in the ink layer");
  assert.ok(alpha(80, 90) > 200, "a solid dark stroke is near-opaque ink");
  const plate = result.outputs.find((o) => o.finish === "plate").image;
  assert.ok(plate.width > 240 && plate.data[3] === 0, "plate is padded and its corner is transparent");
  // Plates are deterministic for a seed and change with it.
  const again = cutCollage(input, { mode: "none", finishes: ["plate"], params: {} }).outputs[0].image.data;
  const same = cutCollage(input, { mode: "none", finishes: ["plate"], params: {} }).outputs[0].image.data;
  const other = cutCollage(input, { mode: "none", finishes: ["plate"], params: { seed: 99 } }).outputs[0].image.data;
  assert.ok(again.equals(same));
  assert.ok(!again.equals(other));
});

test("cut flags a piece running into the frame and rejects bad options with a fix", () => {
  const image = paint(canvas(120, 120, () => [200, 200, 200]), (x, y) => x < 50 && y > 30 && y < 90, [20, 20, 20]);
  const result = cutCollage(encodePng(image), { mode: "border", params: { threshold: 14 } });
  assert.ok(result.findings.some((f) => f.code === "matte-touches-frame" && f.fix));
  const blank = cutCollage(encodePng(canvas(60, 60, () => [128, 128, 128])), { mode: "border" });
  assert.ok(blank.findings.some((f) => f.code === "matte-empty" && f.severity === "error"));
  assert.throws(() => cutCollage(encodePng(flat()), { mode: "border", params: { tresh: 4 } }), /unknown cut param tresh/);
  assert.throws(() => cutCollage(encodePng(flat()), { mode: "none", finishes: ["sticker"] }), /mode none has no matte/);
  assert.throws(() => cutCollage(encodePng(flat()), { mode: "border", params: { roi: [0.5, 0, 0.2, 1] } }), /roi must be/);
  assert.throws(() => cutCollage(encodePng(flat()), { mode: "lasso" }), /mode must be one of/);
});

// ---- registry and reachability -------------------------------------------------------------

test("every registered source records measured reachability, a licence field and a way forward", () => {
  const registry = materials.loadRegistry(), ids = new Set();
  for (const source of registry.sources) {
    assert.ok(!ids.has(source.id)); ids.add(source.id);
    assert.ok(["reachable", "rate-limited", "needs-key", "blocked", "html-only"].includes(source.reachability.status), source.id);
    assert.match(source.reachability.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(source.reachability.evidence.length > 10 && source.license.field && Object.keys(source.probes).length, source.id);
    if (source.adapter) assert.ok(materials.ADAPTERS[source.adapter], source.id);
    if (source.reachability.status !== "reachable") assert.ok(source.fix && /materials add|--id/.test(source.fix), `${source.id} needs a fix`);
  }
  for (const id of ["cleveland", "met", "wikimedia", "nypl", "old-book-illustrations", "smithsonian", "bhl", "rijksmuseum"]) assert.ok(ids.has(id), id);
});

test("HTTP answers classify into reachability without treating challenges as content", () => {
  assert.equal(materials.classify(200, "{}"), "reachable");
  assert.equal(materials.classify(200, '<script src="/_Incapsula_Resource?x=1">'), "blocked");
  assert.equal(materials.classify(403, "<title>Just a moment...</title>"), "blocked");
  assert.equal(materials.classify(403, '{"error":{"code":"API_KEY_MISSING"}}'), "needs-key");
  assert.equal(materials.classify(401, "HTTP Token: Access denied."), "needs-key");
  assert.equal(materials.classify(429, "too many requests"), "rate-limited");
  assert.equal(materials.classify(410, ""), "retired");
  assert.equal(materials.summarize({ search: { status: "rate-limited" }, object: { status: "reachable" } }), "rate-limited");
  assert.equal(materials.summarize({ site: { status: "reachable" }, search: { status: "not-found" } }), "html-only");
  assert.equal(materials.summarize({ search: { status: "needs-key" }, site: { status: "blocked" } }), "needs-key");
});

// ---- adapters against recorded response shapes (trimmed from 2026-11-05 responses) ---------

function stubFetch(routes) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, headers: init.headers });
    const hit = Object.entries(routes).find(([prefix]) => url.startsWith(prefix));
    if (!hit) return new Response("not found", { status: 404 });
    const [, answer] = hit;
    const value = typeof answer === "function" ? answer(url) : answer;
    if (value instanceof Response) return value;
    if (Buffer.isBuffer(value)) return new Response(value, { status: 200, headers: { "content-type": "image/png" } });
    return new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  };
  return { http: materials.httpClient(fetchImpl), calls };
}

const clevelandObject = { data: { id: 130217, title: "Key", creation_date: "1–100 CE", url: "https://clevelandart.org/art/1952.586", share_license_status: "CC0", creators: [], images: { web: { url: "https://openaccess-cdn.clevelandart.org/1952.586/1952.586_web.jpg", width: "590", height: "900" }, print: { url: "https://openaccess-cdn.clevelandart.org/1952.586/1952.586_print.jpg", width: "2231", height: "3400" } } } };
const metObject = (id, pd) => ({ objectID: id, title: pd ? "Pocket watch" : "Assassination of President Lincoln", isPublicDomain: pd, primaryImage: `https://images.metmuseum.org/CRDImages/es/original/${id}.jpg`, primaryImageSmall: "", artistDisplayName: pd ? "Robert Roskell" : "William H. Key", objectDate: "ca. 1810", objectURL: `https://www.metmuseum.org/art/collection/search/${id}` });
const rijksObject = { id: "https://id.rijksmuseum.nl/200140255", identified_by: [{ type: "Identifier", content: "RP-T-1899-A-4261" }, { type: "Name", content: "Drie vlinders" }], produced_by: { type: "Production", part: [{ type: "Production", referred_to_by: [{ type: "LinguisticObject", content: "Herman Henstenburgh" }] }] }, subject_of: [{ type: "LinguisticObject", digitally_carried_by: [{ type: "DigitalObject", access_point: [{ id: "https://iiif.micr.io/rYoPx/full/max/0/default.jpg" }], referred_to_by: [{ content: "https://creativecommons.org/publicdomain/mark/1.0/" }] }] }, { type: "LinguisticObject", digitally_carried_by: [{ type: "DigitalObject", format: "text/html", access_point: [{ id: "https://www.rijksmuseum.nl/nl/collectie/object/RP-T-1899-A-4261" }] }] }] };
const commons = (license) => ({ query: { pages: { 1: { title: "File:Haeckel Tineida.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/thumb/haeckel.jpg", thumbwidth: 850, thumbheight: 1200, url: "https://upload.wikimedia.org/haeckel.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:Haeckel_Tineida.jpg", extmetadata: { LicenseShortName: { value: license }, Artist: { value: "<a href='x'>Ernst Haeckel</a>" } } }] } } } });

function project(name) {
  const dir = path.join(temporary, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

test("fetch downloads an open-licence object as PNG with complete provenance; check passes", async () => {
  const root = project("fetch-ok"), png = encodePng(flat());
  const { http, calls } = stubFetch({
    "https://openaccess-api.clevelandart.org/api/artworks/130217": clevelandObject,
    "https://openaccess-cdn.clevelandart.org/": png,
    "https://data.rijksmuseum.nl/": { orderedItems: [{ id: "https://id.rijksmuseum.nl/200140255" }] },
    "https://id.rijksmuseum.nl/200140255": rijksObject,
    "https://iiif.micr.io/": png,
  });
  const result = await materials.fetchMaterial({ project: root, sourceId: "cleveland", id: "130217", use: "collage: key", width: 160, http });
  assert.equal(result.status, "fetched");
  assert.ok(calls.some((call) => call.url.endsWith("_web.jpg")) && !calls.some((call) => call.url.endsWith("_print.jpg")), "the smallest published size covering the kept width is downloaded");
  const record = materials.readRecords(path.join(root, "materials"))["raw/cleveland-130217.png"];
  assert.equal(record.license, "CC0");
  for (const field of ["source", "sourceId", "title", "author", "sourceUrl", "fileUrl", "retrieved", "use", "sha256", "licenseEvidence"]) assert.ok(record[field], field);
  assert.ok(calls.every((call) => /design-pipeline-materials/.test(call.headers["User-Agent"])));
  const stored = decodePng(fs.readFileSync(path.join(root, "materials", "raw", "cleveland-130217.png")));
  assert.ok(Math.max(stored.width, stored.height) <= 160);
  assert.ok(!fs.readdirSync(path.join(root, "materials", "raw")).some((name) => name.endsWith(".download")));
  const rijks = await materials.fetchMaterial({ project: root, sourceId: "rijksmuseum", id: "200140255", http, width: 300 });
  assert.equal(rijks.record.license, "PDM");
  assert.equal(rijks.record.fileUrl, "https://iiif.micr.io/rYoPx/full/300,/0/default.jpg");
  assert.equal(rijks.record.author, "Herman Henstenburgh");
  const search = await materials.searchSources({ query: "butterfly", sources: ["rijksmuseum", "wikimedia", "bhl"], http });
  assert.equal(search.candidates.length, 1);
  assert.deepEqual(search.unavailable.map((entry) => [entry.source, entry.status]), [["wikimedia", "rate-limited"], ["bhl", "needs-key"]]);
  assert.equal(materials.checkMaterials(root).status, "passed");
});

test("fetch refuses non-open licences and reports blocked or rate-limited sources without writing", async () => {
  const root = project("fetch-refused");
  const { http } = stubFetch({
    "https://collectionapi.metmuseum.org/public/collection/v1/objects/14548": metObject(14548, false),
    "https://commons.wikimedia.org/w/api.php": commons("CC BY-SA 4.0"),
    "https://openaccess-api.clevelandart.org/": new Response("too many requests", { status: 429 }),
  });
  const met = await materials.fetchMaterial({ project: root, sourceId: "met", id: "14548", http });
  assert.equal(met.status, "refused");
  assert.match(met.licenseEvidence, /isPublicDomain=false/);
  const wiki = await materials.fetchMaterial({ project: root, sourceId: "wikimedia", id: "File:Haeckel_Tineida.jpg", http });
  assert.equal(wiki.status, "refused");
  assert.equal(wiki.license, "CC BY-SA 4.0");
  const limited = await materials.fetchMaterial({ project: root, sourceId: "cleveland", id: "1", http });
  assert.deepEqual([limited.status, limited.reason], ["blocked", "rate-limited"]);
  const nypl = await materials.fetchMaterial({ project: root, sourceId: "nypl", id: "x", http });
  assert.equal(nypl.status, "blocked");
  assert.match(nypl.message, /materials add/);
  assert.ok(!fs.existsSync(path.join(root, "materials", "raw")));
  const pd = stubFetch({ "https://commons.wikimedia.org/w/api.php": commons("Public domain"), "https://upload.wikimedia.org/": encodePng(flat()) });
  const ok = await materials.fetchMaterial({ project: root, sourceId: "wikimedia", id: "File:Haeckel_Tineida.jpg", http: pd.http, width: 200 });
  assert.deepEqual([ok.status, ok.record.license, ok.record.author], ["fetched", "public-domain", "Ernst Haeckel"]);
});

// ---- CLI: add, cut, check lineage ---------------------------------------------------------

function cli(args) {
  const result = execute([...args, "--json"]);
  return { ...result.output, exitCode: result.exitCode };
}

test("owner-supplied files register in the same records; cut pieces inherit licence and lineage", () => {
  const root = project("cli"), dir = path.join(root, "materials");
  fs.mkdirSync(path.join(dir, "owner"), { recursive: true });
  fs.writeFileSync(path.join(dir, "owner", "key-photo.png"), encodePng(gradient()));
  fs.writeFileSync(path.join(root, "outside.png"), encodePng(flat()));
  const base = ["--root", root, "--project-root", "."];
  assert.equal(cli(["materials", "cut", ...base, "--file", "materials/owner/key-photo.png", "--mode", "paper"]).error.code, "LICENSE_UNRECORDED");
  assert.equal(cli(["materials", "add", ...base, "--file", "outside.png", "--license", "owner-photo", "--by", "Owner"]).error.code, "PATH_OUTSIDE_ROOT");
  const added = cli(["materials", "add", ...base, "--file", "materials/owner/key-photo.png", "--license", "owner-photo", "--by", "Owner", "--kind", "photo", "--use", "collage: key"]);
  assert.equal(added.status, "recorded");
  assert.equal(added.record.commercialUse, false, "a non-open licence is not assumed commercial");
  assert.equal(added.record.sourceUrl, "owner-supplied");
  const cut = cli(["materials", "cut", ...base, "--file", "materials/owner/key-photo.png", "--mode", "paper", "--finish", "cut,sticker", "--params", '{"threshold":14}']);
  assert.equal(cut.exitCode, 0, JSON.stringify(cut));
  assert.equal(cut.creativeAcceptance, "not-assessed");
  assert.deepEqual(cut.outputs.map((o) => o.file), ["materials/cut/key-photo/piece-0.png", "materials/cut/key-photo/piece-0-sticker.png"]);
  const records = materials.readRecords(dir);
  assert.equal(records["cut/key-photo/piece-0.png"].license, "owner-photo");
  assert.equal(records["cut/key-photo/piece-0.png"].derivedFrom.file, "owner/key-photo.png");
  assert.equal(cli(["materials", "check", ...base]).status, "passed");
  assert.equal(cli(["materials", "cut", ...base, "--file", "materials/owner/key-photo.png", "--mode", "paper"]).error.code, "OUTPUT_EXISTS");
  // Another source with the same stem must not overwrite these pieces, even with --replace.
  fs.mkdirSync(path.join(dir, "raw"));
  fs.writeFileSync(path.join(dir, "raw", "key-photo.png"), encodePng(flat()));
  cli(["materials", "add", ...base, "--file", "materials/raw/key-photo.png", "--license", "CC0", "--by", "Owner"]);
  const collision = cli(["materials", "cut", ...base, "--file", "materials/raw/key-photo.png", "--mode", "border", "--replace"]);
  assert.equal(collision.error.code, "OUTPUT_EXISTS");
  assert.match(collision.error.message, /rename one of the two sources/);
  fs.rmSync(path.join(dir, "raw"), { recursive: true });
  const kept = materials.readRecords(dir);
  delete kept["raw/key-photo.png"];
  materials.writeRecords(dir, kept);

  // An unrecorded file, a changed source and a deleted file are each named with a fix.
  fs.writeFileSync(path.join(dir, "owner", "stray.png"), encodePng(flat()));
  const check = cli(["materials", "check", ...base]);
  assert.equal(check.exitCode, 2);
  assert.ok(check.findings.some((f) => f.code === "material-unrecorded" && /materials add/.test(f.fix)));
  fs.writeFileSync(path.join(dir, "owner", "key-photo.png"), encodePng(flat()));
  const stale = cli(["materials", "check", ...base]);
  assert.ok(stale.findings.some((f) => f.code === "material-changed" && f.file === "owner/key-photo.png"));
  assert.ok(stale.findings.some((f) => f.code === "material-derived-stale" && /materials cut .*--replace/.test(f.fix)));
  assert.equal(cli(["materials", "cut", ...base, "--file", "materials/owner/key-photo.png", "--mode", "paper", "--replace"]).error.code, "SOURCE_CHANGED");
  fs.rmSync(path.join(dir, "owner", "key-photo.png"));
  assert.ok(cli(["materials", "check", ...base]).findings.some((f) => f.code === "material-derived-orphan"));
});

test("materials sources lists the registry and unknown options fail", () => {
  const listed = cli(["materials", "sources"]);
  assert.equal(listed.status, "ready");
  assert.ok(listed.sources.find((s) => s.id === "bhl").fix);
  assert.equal(cli(["materials", "fetch", "--project-root", ".", "--source", "met", "--id", "1", "--bogus", "x"]).error.code, "UNKNOWN_OPTION");
  assert.equal(cli(["materials", "search", "--query", "key", "--limit", "99"]).error.code, "OPTION_VALUE_INVALID");
});

test("film-edit footage licences still read through the shared records", () => {
  const records = { "bars.mp4": { license: "generated", commercialUse: true } };
  assert.deepEqual(materials.licenseOf(records, "bars.mp4", "bars"), { license: "generated", commercialUse: true });
  assert.deepEqual(materials.licenseOf(records, "other.mp4", "other"), { license: "unrecorded", commercialUse: false });
});

// ---- review fixes (#289): exact licence matching, restrictions, probe exits, challenges, film-edit scope ----

const metaHttp = (meta) => ({ json: async () => meta, bytes: async () => { throw new Error("must not download"); } });
const commonsMeta = (short, restrictions) => ({ query: { pages: { 1: { title: "File:X.jpg", imageinfo: [{ url: "https://upload.wikimedia.org/x.jpg", descriptionurl: "d", extmetadata: { LicenseShortName: { value: short }, ...(restrictions ? { Restrictions: { value: restrictions } } : {}) } }] } } } });

test("licence fields match exactly: look-alikes, logo templates and credit lines are not open", async () => {
  const commonsCases = { "Public domain": "public-domain", "Public domain in the United States": "public-domain", "PD-old-100": "public-domain", CC0: "CC0", "Not public domain": "Not public domain", "PD-textlogo": "PD-textlogo", "PD-trademark": "PD-trademark", "PDM-owner": "PDM-owner", "CC BY-SA 4.0": "CC BY-SA 4.0" };
  for (const [short, expected] of Object.entries(commonsCases)) {
    const item = await materials.ADAPTERS.wikimedia.object(metaHttp(commonsMeta(short)), "X.jpg");
    assert.equal(item.license, expected, short);
  }
  const rights = async (statements) => (await materials.ADAPTERS.rijksmuseum.object(metaHttp({ id: "x", subject_of: [{ digitally_carried_by: [{ access_point: [{ id: "https://iiif.micr.io/a/full/max/0/default.jpg" }], referred_to_by: statements.map((content) => ({ content })) }] }] }), "x")).license;
  assert.equal(await rights(["© Photo: X, all rights reserved", "https://creativecommons.org/publicdomain/zero/1.0/"]), "CC0", "the open URL wins over a credit line listed first");
  assert.ok(!materials.isOpenLicense(await rights(["Not under https://creativecommons.org/publicdomain/mark/1.0/ ; rights reserved"])));
  assert.equal(await rights([]), "unknown");
  assert.equal((await materials.ADAPTERS.met.object(metaHttp({ objectID: 1, isPublicDomain: "true", primaryImage: "u" }), 1)).license, "not-public-domain");
  assert.equal((await materials.ADAPTERS.cleveland.object(metaHttp({ data: { id: 1, share_license_status: "cc0", images: {} } }), 1)).license, "cc0");
  await assert.rejects(materials.ADAPTERS.cleveland.object(metaHttp({}), 1), (error) => error instanceof materials.SourceError);
});

test("a Commons file with Restrictions is refused with the restriction, even when public domain", async () => {
  const root = project("restricted");
  const { http } = stubFetch({ "https://commons.wikimedia.org/w/api.php": commonsMeta("Public domain", "trademarked"), "https://upload.wikimedia.org/": encodePng(flat()) });
  const result = await materials.fetchMaterial({ project: root, sourceId: "wikimedia", id: "File:X.jpg", http });
  assert.equal(result.status, "refused");
  assert.equal(result.restrictions, "trademarked");
  assert.match(result.fix, /materials add/);
  assert.ok(!fs.existsSync(path.join(root, "materials")));
});

test("probe: offline is an environment failure, unknown source a usage error; classification is content-aware", async () => {
  const offline = await materials.probeSources({ http: { status: async () => ({ httpStatus: null, status: "unreachable", error: "ENOTFOUND" }) } });
  assert.equal(offline.status, "unreachable-env");
  assert.ok(!offline.next.join(" ").includes("Update reachability"));
  assert.match(offline.next[0], /must not be edited/);
  const down = await materials.probeSources({ http: { status: async () => ({ httpStatus: 503, status: materials.classify(503, "") }) }, sources: ["cleveland"] });
  assert.deepEqual([down.status, down.sources[0].measured], ["drift", "error"]);
  await assert.rejects(materials.probeSources({ sources: ["nope"] }), (error) => error.code === "OPTION_VALUE_INVALID");
  const cli = execute(["materials", "probe", "--source", "nope", "--json"]);
  assert.equal(cli.exitCode, 1);
  assert.match(cli.output.error.message, /unknown source nope/);
  assert.equal(materials.classify(200, '{"data":[{"title":"Captcha study"}]}'), "reachable");
  assert.equal(materials.classify(500, "internal error while checking API key"), "error");
  assert.equal(materials.classify(400, "Invalid api key format"), "needs-key");
});

test("a 200 bot-challenge page reports blocked instead of a JSON parse error", async () => {
  const challenge = () => new Response("<html><title>Just a moment...</title></html>", { status: 200, headers: { "content-type": "text/html" } });
  const { http } = stubFetch({ "https://": challenge });
  const root = project("challenge");
  const fetched = await materials.fetchMaterial({ project: root, sourceId: "cleveland", id: "1", http });
  assert.deepEqual([fetched.status, fetched.reason], ["blocked", "blocked"]);
  const searched = await materials.searchSources({ query: "key", sources: ["cleveland", "met"], http });
  assert.equal(searched.status, "blocked");
  assert.deepEqual(searched.unavailable.map((entry) => entry.status), ["blocked", "blocked"]);
});

test("film-edit licence errors name film edit and show the expected shape", () => {
  const { sourceList } = require("../skill/scripts/edit-project-core.cjs");
  for (const body of ["[]", "null", '"hello"']) {
    const root = project(`film-${body.length}-${body[0] === "[" ? "a" : body[0] === "n" ? "n" : "s"}`);
    fs.mkdirSync(path.join(root, "sources"));
    fs.writeFileSync(path.join(root, "sources", "Clip A.mp4"), "x");
    fs.writeFileSync(path.join(root, "sources", "licenses.json"), body);
    assert.throws(() => sourceList(root, "sources"), (error) => /^film edit: sources\/licenses\.json must be an object/.test(error.message), body);
  }
  const root = project("film-ok");
  fs.mkdirSync(path.join(root, "sources"));
  fs.writeFileSync(path.join(root, "sources", "Clip A.mp4"), "x");
  fs.writeFileSync(path.join(root, "sources", "licenses.json"), JSON.stringify({ "Clip A.mp4": null, "clip-a": { license: "PD", commercialUse: "yes" } }));
  assert.deepEqual(sourceList(root, "sources").map(({ license, commercialUse }) => ({ license, commercialUse })), [{ license: "PD", commercialUse: false }]);
});

test("cut warns about a dropped wing and a cast shadow; paper mode removes the shadow", () => {
  const twoWings = paint(canvas(300, 300, () => [250, 247, 240]), (x, y) => ((x - 100) / 45) ** 2 + ((y - 150) / 70) ** 2 < 1 || ((x - 205) / 45) ** 2 + ((y - 150) / 70) ** 2 < 1, [200, 215, 180]);
  const dropped = cutCollage(encodePng(twoWings), { mode: "border", finishes: ["cut"] });
  assert.ok(dropped.findings.some((f) => f.code === "matte-dropped-component" && /params\.keep to 2/.test(f.fix)), JSON.stringify(dropped.findings));
  assert.ok(!cutCollage(encodePng(twoWings), { mode: "border", finishes: ["cut"], params: { keep: 2 } }).findings.some((f) => f.code === "matte-dropped-component"));
  const shadowed = canvas(300, 300, (x, y) => {
    if ((x - 150) ** 2 + (y - 130) ** 2 < 3600) return [40, 35, 30];
    const d = ((x - 185) / 80) ** 2 + ((y - 185) / 35) ** 2;
    const v = d < 1 ? Math.round(245 - 60 * (1 - d)) : 245;
    return [v, v, v];
  });
  const border = cutCollage(encodePng(shadowed), { mode: "border", finishes: ["cut"] });
  assert.ok(border.findings.some((f) => f.code === "matte-cast-shadow" && /--mode paper/.test(f.fix)), JSON.stringify(border.measurements));
  const paper = cutCollage(encodePng(shadowed), { mode: "paper", finishes: ["cut"] });
  assert.ok(!paper.findings.some((f) => f.code === "matte-cast-shadow"));
  assert.ok(paper.measurements.pieces[0].area < border.measurements.pieces[0].area);
  // Engraving-like hatching near the paper tone is not a shadow.
  const hatched = cutCollage(encodePng(print()), { mode: "paper", finishes: ["cut"], params: { threshold: 18, keep: 2, close: 3 } });
  assert.ok(!hatched.findings.some((f) => f.code === "matte-cast-shadow"));
});

test("smooth neutral objects (silver, porcelain, grey enamel) are not reported as cast shadows", () => {
  const disc = (x, y) => (x - 150) ** 2 + (y - 150) ** 2 < 4900;
  const cases = {
    "mid-grey 200 on white": (x, y) => (disc(x, y) ? [200, 200, 200] : [250, 250, 250]),
    "grey 180 on cream paper": (x, y) => (disc(x, y) ? [180, 180, 180] : [250, 247, 240]),
    "silver gradient 160-200 on white": (x, y) => { const v = Math.round(160 + 40 * ((y - 80) / 140)); return disc(x, y) ? [v, v, v] : [255, 255, 255]; },
    "porcelain gradient on white": (x, y) => { const v = Math.round(215 + 20 * ((x - 80) / 140)); return disc(x, y) ? [v, v, v] : [250, 250, 250]; },
    "dark disc on white": (x, y) => (disc(x, y) ? [40, 35, 30] : [245, 245, 245]),
    "red on white": (x, y) => (disc(x, y) ? [200, 40, 40] : [255, 255, 255]),
  };
  for (const [name, fill] of Object.entries(cases)) for (const mode of ["border", "paper"]) {
    const result = cutCollage(encodePng(canvas(300, 300, fill)), { mode, finishes: ["cut"] });
    assert.ok(!result.findings.some((f) => f.code === "matte-cast-shadow"), `${name} (${mode}): ${JSON.stringify(result.measurements.pieces)}`);
  }
  // A real shadow beside a textured body still warns, and the fix asks to confirm it first.
  const textured = canvas(300, 300, (x, y) => {
    if ((x - 150) ** 2 + (y - 130) ** 2 < 3600) return (x + y) % 6 < 3 ? [150, 150, 150] : [90, 90, 90];
    const d = ((x - 185) / 80) ** 2 + ((y - 185) / 35) ** 2;
    const v = d < 1 ? Math.round(245 - 60 * (1 - d)) : 245;
    return [v, v, v];
  });
  const warned = cutCollage(encodePng(textured), { mode: "border", finishes: ["cut"] }).findings.find((f) => f.code === "matte-cast-shadow");
  assert.ok(warned, "textured silver body with a grey cast shadow");
  assert.match(warned.fix, /^Confirm a cast shadow exists/);
});

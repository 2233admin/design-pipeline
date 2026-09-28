"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");
const { decodePng, encodePng } = require("../skill/scripts/png-core.cjs");
const { FIX, checkComposition, contrastRatio } = require("../skill/scripts/composition-core.cjs");

const cli = path.join(__dirname, "../skill/scripts/designer-pipeline.cjs");
const codes = (result) => result.findings.map((finding) => finding.code);

function canvas(width, height, bg) {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i += 1) { data[i * 4] = bg[0]; data[i * 4 + 1] = bg[1]; data[i * 4 + 2] = bg[2]; data[i * 4 + 3] = 255; }
  const image = { width, height, data };
  image.rect = (x, y, w, h, color) => {
    for (let yy = Math.max(0, y); yy < Math.min(height, y + h); yy += 1) for (let xx = Math.max(0, x); xx < Math.min(width, x + w); xx += 1) {
      const i = (yy * width + xx) * 4;
      data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = 255;
    }
    return image;
  };
  return image;
}

// Balanced poster: dominant centered mass, a secondary block, one accent hue, margins kept.
const good = () => canvas(480, 270, [14, 17, 22]).rect(150, 55, 180, 130, [255, 122, 69]).rect(170, 200, 140, 16, [240, 240, 240]).rect(200, 225, 80, 8, [184, 192, 204]);

test("PNG codec round-trips and decodes palette and 16-bit images", () => {
  const image = good();
  assert.equal(Buffer.compare(decodePng(encodePng(image)).data, image.data), 0);
  const ihdr = (w, h, depth, type) => { const b = Buffer.alloc(13); b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4); b[8] = depth; b[9] = type; return b; };
  const png = (header, extra, raw) => {
    const chunk = (type, body) => { const len = Buffer.alloc(4); len.writeUInt32BE(body.length); return Buffer.concat([len, Buffer.from(type), body, Buffer.alloc(4)]); };
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), ...extra.map(([t, b]) => chunk(t, b)), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
  };
  const palette = decodePng(png(ihdr(2, 1, 8, 3), [["PLTE", Buffer.from([255, 0, 0, 0, 0, 255])]], Buffer.from([0, 0, 1])));
  assert.deepEqual([...palette.data], [255, 0, 0, 255, 0, 0, 255, 255]);
  const deep = decodePng(png(ihdr(1, 1, 16, 2), [], Buffer.from([0, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc])));
  assert.deepEqual([...deep.data], [0x12, 0x56, 0x9a, 255]);
  assert.throws(() => decodePng(Buffer.from("nope")), /not a PNG/);
});

test("a balanced single-accent frame passes without findings", () => {
  const result = checkComposition(good(), { profile: "poster" });
  assert.equal(result.status, "passed", JSON.stringify(result.findings));
  assert.deepEqual(result.findings, []);
  assert.equal(result.creativeAcceptance, "not-assessed");
});

test("blank and washed-out frames are errors", () => {
  assert.ok(codes(checkComposition(canvas(200, 100, [20, 20, 20]))).includes("blank-frame"));
  const washed = canvas(200, 100, [200, 200, 200]).rect(60, 30, 80, 40, [230, 230, 230]);
  const result = checkComposition(washed);
  assert.equal(result.status, "failed");
  assert.ok(codes(result).includes("low-contrast"));
});

test("bottom-heavy dark-on-dark frame warns about balance, dead band and separation", () => {
  const frame = canvas(480, 270, [11, 13, 18]).rect(40, 190, 90, 60, [31, 38, 54]).rect(150, 190, 90, 60, [31, 38, 54]).rect(260, 190, 90, 60, [31, 38, 54]).rect(370, 190, 90, 60, [31, 38, 54]).rect(60, 160, 60, 10, [240, 240, 240]);
  const result = checkComposition(frame, { profile: "frame" });
  assert.equal(result.status, "passed", "warnings alone do not fail");
  for (const code of ["off-balance", "dead-band", "weak-separation", "no-focal-point"]) assert.ok(codes(result).includes(code), code);
  const allowed = checkComposition(frame, { profile: "frame", allow: ["dead-band"] });
  assert.ok(!codes(allowed).includes("dead-band"));
  assert.ok(allowed.allowed.some((finding) => finding.code === "dead-band"));
  assert.throws(() => checkComposition(frame, { allow: ["not-a-code"] }), /allowed codes/);
});

test("palette sprawl, clutter and edge crowding are detected", () => {
  const hues = [[230, 20, 20], [20, 170, 20], [20, 20, 230], [230, 200, 20], [200, 20, 230], [20, 200, 200]];
  const sprawl = canvas(480, 270, [255, 255, 255]);
  hues.forEach((color, index) => sprawl.rect(60 + index * 60, 110, 40, 40, color));
  assert.ok(codes(checkComposition(sprawl, { profile: "poster" })).includes("palette-sprawl"));
  const busy = canvas(480, 270, [255, 255, 255]);
  for (let y = 0; y < 8; y += 1) for (let x = 0; x < 10; x += 1) busy.rect(20 + x * 45, 20 + y * 30, 10, 10, [40, 40, 40]);
  assert.ok(codes(checkComposition(busy, { profile: "poster" })).includes("clutter"));
  // Content hugs parts of every edge; the white border still dominates, so white stays the background.
  const crowd = canvas(480, 270, [255, 255, 255]).rect(0, 0, 210, 24, [30, 30, 30]).rect(270, 246, 210, 24, [30, 30, 30]).rect(0, 0, 24, 120, [30, 30, 30]).rect(456, 150, 24, 120, [30, 30, 30]).rect(180, 100, 120, 70, [30, 30, 30]);
  assert.ok(codes(checkComposition(crowd, { profile: "ui" })).includes("edge-crowding"));
});

test("element checks cover text contrast, off-canvas text, near-miss alignment and hierarchy", () => {
  const elements = {
    viewport: { width: 480, height: 270 },
    items: [
      { kind: "text", id: "#h1", text: "Headline", box: { x: 40, y: 40, w: 200, h: 30 }, fontSize: 22, fontWeight: 700, color: [201, 201, 201], background: [255, 255, 255] },
      { kind: "text", id: "#p", text: "Body copy", box: { x: 43, y: 80, w: 200, h: 20 }, fontSize: 20, fontWeight: 400, color: [30, 30, 30], background: [255, 255, 255] },
      { kind: "text", id: "#cta", text: "Start", box: { x: 40, y: 120, w: 80, h: 20 }, fontSize: 18, fontWeight: 700, color: [30, 30, 30], background: [255, 255, 255] },
      { kind: "text", id: "#foot", text: "Footer", box: { x: 450, y: 250, w: 60, h: 20 }, fontSize: 12, fontWeight: 400, color: [30, 30, 30], background: [255, 255, 255] },
    ],
  };
  const result = checkComposition(good(), { profile: "poster", elements });
  assert.equal(result.status, "failed");
  const byCode = (code) => result.findings.filter((finding) => finding.code === code);
  assert.equal(byCode("text-contrast").length, 1);
  assert.equal(byCode("text-contrast")[0].target, "#h1");
  assert.equal(byCode("text-off-canvas")[0].target, "#foot");
  assert.ok(byCode("alignment-near-miss").length === 1);
  assert.ok(byCode("flat-hierarchy").length === 1);
  assert.ok(Math.abs(contrastRatio([0, 0, 0], [255, 255, 255]) - 21) < 1e-9);
});

test("every composition finding carries a fix and CLI exits 2 on errors", () => {
  for (const [code, fix] of Object.entries(FIX)) assert.ok(fix.length > 30, code);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "composition-"));
  try {
    fs.writeFileSync(path.join(dir, "good.png"), encodePng(good()));
    fs.writeFileSync(path.join(dir, "blank.png"), encodePng(canvas(100, 60, [0, 0, 0])));
    const ok = spawnSync(process.execPath, [cli, "verify", "composition", "--root", dir, "--image", "good.png", "--profile", "poster"], { encoding: "utf8" });
    assert.equal(ok.status, 0, ok.stdout);
    const bad = spawnSync(process.execPath, [cli, "verify", "composition", "--root", dir, "--image", "blank.png"], { encoding: "utf8" });
    assert.equal(bad.status, 2, bad.stdout);
    assert.equal(JSON.parse(bad.stdout).findings[0].code, "blank-frame");
    const profile = spawnSync(process.execPath, [cli, "verify", "composition", "--root", dir, "--image", "good.png", "--profile", "billboard"], { encoding: "utf8" });
    assert.match(profile.stdout, /allowed: ui, poster, frame/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

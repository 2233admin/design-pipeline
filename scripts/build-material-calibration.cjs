#!/usr/bin/env node
"use strict";

// Rebuild skill/references/material-calibration.json from public-domain / CC0 scans.
//
//   node scripts/build-material-calibration.cjs --project-root .design-pipeline/cal [--fetch]
//
// --fetch downloads the samples through `materials fetch` (licence checked, provenance recorded)
// into <project>/materials/raw/. The scans are not committed; their hashes, regions and measured
// statistics are. Each profile is fitted on region A and checked on a held-out region B of the same
// sheet: distance(A, B) is the natural variation a generator is held to.

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { decodePng } = require("../skill/scripts/png-core.cjs");
const { calibration, distance, measure } = require("../skill/tools/art-motion/texture-stats.cjs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "skill/references/material-calibration.json");

// pxPerMm: long side of the published image over the sheet's long side from the museum record,
// or a ruler photographed with the object.
const SAMPLES = [
  { id: "laid-cream", kind: "paper", source: "cleveland", sourceId: "396848", width: 3400, file: "raw/cleveland-396848.png", pxPerMm: 3400 / 476, pxPerMmEvidence: "sheet 47.6 x 31.5 cm (Cleveland measurements), 3400 px long side", paper: "Arches modern laid paper (Caillebotte drawing, blank areas)", a: [0.72, 0.07, 0.93, 0.42], b: [0.05, 0.62, 0.3, 0.88] },
  { id: "wove-cream", kind: "paper", source: "cleveland", sourceId: "109295", width: 3400, file: "raw/cleveland-109295.png", pxPerMm: 3400 / 322, pxPerMmEvidence: "sheet 32.2 x 24 cm, 3400 px long side", paper: "cream wove paper (Ingres circle graphite portrait, top margin)", a: [0.02, 0.02, 0.3, 0.14], b: [0.6, 0.02, 0.98, 0.2] },
  { id: "wove-toned", kind: "paper", source: "cleveland", sourceId: "130620", width: 3400, file: "raw/cleveland-130620.png", pxPerMm: 3400 / 285, pxPerMmEvidence: "sheet 21.8 x 28.5 cm, 3400 px long side", paper: "toned wove paper (graphite study of trees, top margin)", a: [0.03, 0.004, 0.26, 0.1], b: [0.55, 0.004, 0.95, 0.1] },
  { id: "woodblock-indigo", kind: "print", source: "cleveland", sourceId: "120225", width: 3400, file: "raw/cleveland-120225.png", pxPerMm: 3400 / 337, pxPerMmEvidence: "sheet 33.7 x 22 cm, 3400 px long side", paper: "indigo woodblock flat with wood grain (Hiroshige, night sky)", a: [0.04, 0.06, 0.3, 0.24], b: [0.04, 0.25, 0.3, 0.42] },
  { id: "litho-red", kind: "print", source: "cleveland", sourceId: "107215", width: 3400, file: "raw/cleveland-107215.png", pxPerMm: 3400 / 526, pxPerMmEvidence: "sheet 52.6 x 40.3 cm, 3400 px long side", paper: "colour lithograph red flat with spatter (Toulouse-Lautrec, sofa)", a: [0.35, 0.612, 0.47, 0.66], b: [0.47, 0.612, 0.59, 0.66] },
  { id: "autotype-1904", kind: "halftone", source: "rijksmuseum", sourceId: "200104782", region: [3650, 330, 800, 800], file: "raw/rijks-mapje-francis.png", pxPerMm: 31.2, pxPerMmEvidence: "mm ticks of the ruler photographed with the object, region [0,3700,4096,600]: 31.2 px per tick", paper: "1904 sepia autotype (halftone) portrait, about 160 lpi", a: [0.25, 0.15, 0.5, 0.55], b: [0.5, 0.15, 0.75, 0.55] },
];

function option(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const project = option("--project-root");
if (!project) { process.stderr.write("--project-root <dir> is required (an ignored scratch project such as .design-pipeline/cal)\n"); process.exit(1); }
const records = () => JSON.parse(fs.readFileSync(path.join(project, "materials/licenses.json"), "utf8"));

if (process.argv.includes("--fetch")) {
  for (const s of SAMPLES) {
    const args = ["skill/scripts/designer-pipeline.cjs", "materials", "fetch", "--project-root", project, "--source", s.source, "--id", s.sourceId, "--use", "calibration", "--name", path.basename(s.file, ".png"), "--replace"];
    if (s.region) args.push("--params", JSON.stringify({ region: s.region })); else args.push("--width", String(s.width));
    const run = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
    if (run.status !== 0) { process.stderr.write(`fetch ${s.id} failed: ${run.stdout}${run.stderr}\n`); process.exit(1); }
  }
}

const profiles = {}, round = (v) => Number(v.toFixed(3));
for (const s of SAMPLES) {
  const record = records()[s.file];
  if (!record) { process.stderr.write(`${s.file} is not recorded in ${project}; run with --fetch\n`); process.exit(1); }
  const img = decodePng(fs.readFileSync(path.join(project, "materials", s.file)));
  const statsA = measure(img, s.kind, { pxPerMm: s.pxPerMm, roi: s.a }), statsB = measure(img, s.kind, { pxPerMm: s.pxPerMm, roi: s.b });
  profiles[s.id] = {
    kind: s.kind,
    description: s.paper,
    sample: {
      source: record.source, sourceId: record.sourceId, title: record.title, author: record.author, sourceUrl: record.sourceUrl, fileUrl: record.fileUrl,
      license: record.license, licenseEvidence: record.licenseEvidence, retrieved: record.retrieved, sha256: record.sha256, width: record.width, height: record.height,
      ...(s.region ? { region: s.region } : {}),
    },
    pxPerMm: round(s.pxPerMm),
    pxPerMmEvidence: s.pxPerMmEvidence,
    fitRoi: s.a,
    heldOutRoi: s.b,
    stats: statsA,
    heldOut: statsB,
    natural: distance(statsA, statsB),
  };
}

// Between-sample yardstick, per profile: its distance to the nearest other real sample of the same
// kind (per metric). A profile is graded only when its natural spread is clearly below that.
const yardsticks = {};
for (const kind of ["paper", "print", "halftone"]) {
  const ids = Object.keys(profiles).filter((id) => profiles[id].kind === kind), pairs = [];
  for (let i = 0; i < ids.length; i += 1) for (let j = i + 1; j < ids.length; j += 1) {
    const d = distance(profiles[ids[i]].stats, profiles[ids[j]].stats);
    if (d.comparable) pairs.push({ pair: [ids[i], ids[j]], ...(kind === "halftone" ? { offLattice: d.offLattice } : { spectralDb: d.spectralDb, histogramL: d.histogramL }) });
  }
  yardsticks[kind] = { pairs };
  for (const id of ids) {
    const mine = pairs.filter((p) => p.pair.includes(id)), metrics = kind === "halftone" ? ["offLattice"] : ["spectralDb", "histogramL"];
    const between = mine.length ? Object.fromEntries(metrics.map((m) => [m, Math.min(...mine.map((p) => p[m]))])) : null;
    profiles[id].between = between;
    profiles[id].grading = calibration(kind, profiles[id].natural, between);
  }
}

const doc = {
  schema: "design-pipeline.material-calibration.v1",
  measured: new Date().toISOString().slice(0, 10),
  method: "L* statistics (texture-stats.cjs): Welch-averaged Hann-windowed power spectrum in octave bands of physical period (mm), centred L* quantiles, orientation, laid-line peak; halftone: screen period/angle, coverage, off-lattice variance share above 0.6x the screen frequency. Fit on region A, natural variation = distance(A, held-out region B).",
  rebuild: "node scripts/build-material-calibration.cjs --project-root .design-pipeline/cal --fetch",
  profiles,
  yardsticks,
};
fs.writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(Object.fromEntries(Object.entries(profiles).map(([id, p]) => [id, { natural: p.natural.spectralDb ?? p.natural.offLattice, naturalHist: p.natural.histogramL, between: p.between, grading: p.grading }])), null, 1)}\n`);

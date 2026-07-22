#!/usr/bin/env node

/**
 * Package the design-pipeline skill for GitHub Releases and offline install.
 * Output:
 * - <output-root>/design-pipeline-skill.tgz
 * - <output-root>/design-pipeline-skill.zip
 * - <output-root>/checksums.txt
 */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--output-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--output-root requires a value");
      options.outputRoot = value;
      index += 1;
    } else if (token === "--help" || token === "-h") options.help = true;
    else throw new Error(`unknown option: ${token}`);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));
const resourceManifest = JSON.parse(fs.readFileSync(path.join(__dirname, "package-resources.json"), "utf8"));
if (resourceManifest.schema !== "design-pipeline.package-resources.v1") throw new Error("unsupported package resource manifest");
if (typeof resourceManifest.packageRoot !== "string" || path.isAbsolute(resourceManifest.packageRoot) || resourceManifest.packageRoot.split(/[\\/]/).includes("..")) throw new Error("packageRoot must be repository-relative");
const skillDir = path.join(repoRoot, resourceManifest.packageRoot);
const distDir = path.resolve(options.outputRoot || process.env.PACKAGE_OUTPUT_ROOT || path.join(repoRoot, "dist"));
const version =
  process.env.PACKAGE_VERSION ||
  process.env.GITHUB_REF_NAME?.replace(/^v/, "") ||
  "0.0.0-dev";
const zipMinimumEpoch = 315532800;
const zipMaximumEpoch = 4354819199;

function fail(message) {
  throw new Error(message);
}

function parseSourceDateEpoch(value, label) {
  if (!/^\d+$/.test(value)) {
    fail(`${label} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > zipMaximumEpoch) {
    fail(`${label} must fit the supported timestamp range`);
  }
  return parsed;
}

function resolveSourceDateEpoch() {
  const declared = process.env.SOURCE_DATE_EPOCH;
  if (declared !== undefined) {
    return parseSourceDateEpoch(declared, "SOURCE_DATE_EPOCH");
  }

  const git = spawnSync("git", ["log", "-1", "--format=%ct"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
  });
  const observed = git.status === 0 ? git.stdout.trim() : "";
  return /^\d+$/.test(observed)
    ? parseSourceDateEpoch(observed, "Git commit timestamp")
    : zipMinimumEpoch;
}

function packageMetadata(sourceDateEpoch) {
  return Buffer.from(
    `${JSON.stringify(
      {
        name: "design-pipeline",
        version,
        packagedAt: new Date(sourceDateEpoch * 1000).toISOString(),
        source: "https://github.com/2233admin/design-pipeline",
        install: [
          "mkdir -p /tmp/design-pipeline-release && tar -xzf design-pipeline-skill.tgz -C /tmp/design-pipeline-release",
          "node /tmp/design-pipeline-release/design-pipeline/scripts/install-local.cjs --root ~/.codex/skills --target ~/.codex/skills/design-pipeline --source /tmp/design-pipeline-release/design-pipeline",
          "node ~/.codex/skills/design-pipeline/scripts/designer-pipeline.cjs doctor --root .",
        ],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

function collectArchiveEntries(sourceDateEpoch) {
  if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) {
    fail("skill/SKILL.md missing");
  }
  if (!Array.isArray(resourceManifest.generated)) fail("generated package resources must be an array");
  for (const generated of resourceManifest.generated) {
    if (path.isAbsolute(generated) || generated.split(/[\\/]/).includes("..")) fail(`generated package resource is unsafe: ${generated}`);
    if (fs.existsSync(path.join(skillDir, generated))) fail(`skill/${generated} is reserved for generated package content`);
  }
  for (const required of resourceManifest.required || []) {
    if (path.isAbsolute(required) || required.split(/[\\/]/).includes("..") || !fs.existsSync(path.join(skillDir, required))) {
      fail(`required package resource is missing or unsafe: ${required}`);
    }
  }

  const entries = [];

  function visit(absolutePath, relativePath) {
    const stat = fs.lstatSync(absolutePath);
    const archiveName = `design-pipeline/${relativePath.split(path.sep).join("/")}`;
    if (stat.isSymbolicLink()) {
      fail(`symbolic links are not supported in release archives: ${relativePath}`);
    }
    if (stat.isDirectory()) {
      entries.push({
        name: `${archiveName}/`,
        data: Buffer.alloc(0),
        isDirectory: true,
      });
      for (const child of fs.readdirSync(absolutePath).sort()) {
        visit(path.join(absolutePath, child), path.join(relativePath, child));
      }
      return;
    }
    if (!stat.isFile()) {
      fail(`unsupported release-archive entry: ${relativePath}`);
    }
    entries.push({
      name: archiveName,
      data: fs.readFileSync(absolutePath),
      isDirectory: false,
    });
  }

  for (const child of fs.readdirSync(skillDir).sort()) {
    visit(path.join(skillDir, child), child);
  }
  const generatedEntries = new Map([
    ["PACKAGE.json", packageMetadata(sourceDateEpoch)],
    ["scripts/install-local.cjs", fs.readFileSync(path.join(repoRoot, "scripts/install-local.cjs"))],
  ]);
  for (const generated of resourceManifest.generated) {
    const data = generatedEntries.get(generated);
    if (!data) fail(`no generator is defined for package resource: ${generated}`);
    entries.push({ name: `design-pipeline/${generated}`, data, isDirectory: false });
  }
  entries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );
  return [
    {
      name: "design-pipeline/",
      data: Buffer.alloc(0),
      isDirectory: true,
    },
    ...entries,
  ];
}

function writeTarString(header, offset, length, value, label) {
  const encoded = Buffer.from(value, "utf8");
  if (encoded.length > length) {
    fail(`${label} exceeds the USTAR field limit: ${value}`);
  }
  encoded.copy(header, offset);
}

function writeTarOctal(header, offset, length, value, label) {
  const encoded = Math.trunc(value).toString(8);
  if (encoded.length > length - 1) {
    fail(`${label} exceeds the USTAR numeric field limit`);
  }
  header.write(`${encoded.padStart(length - 1, "0")}\0`, offset, length, "ascii");
}

function splitTarPath(archiveName) {
  if (Buffer.byteLength(archiveName, "utf8") <= 100) {
    return { name: archiveName, prefix: "" };
  }
  for (let index = archiveName.lastIndexOf("/"); index > 0; index = archiveName.lastIndexOf("/", index - 1)) {
    const prefix = archiveName.slice(0, index);
    const name = archiveName.slice(index + 1);
    if (
      Buffer.byteLength(prefix, "utf8") <= 155 &&
      Buffer.byteLength(name, "utf8") <= 100
    ) {
      return { name, prefix };
    }
  }
  fail(`archive path exceeds the USTAR path limit: ${archiveName}`);
}

function createTarHeader(entry, sourceDateEpoch) {
  const header = Buffer.alloc(512);
  const tarPath = splitTarPath(entry.name);
  writeTarString(header, 0, 100, tarPath.name, "TAR name");
  writeTarOctal(header, 100, 8, entry.isDirectory ? 0o755 : 0o644, "TAR mode");
  writeTarOctal(header, 108, 8, 0, "TAR uid");
  writeTarOctal(header, 116, 8, 0, "TAR gid");
  writeTarOctal(header, 124, 12, entry.data.length, "TAR size");
  writeTarOctal(header, 136, 12, sourceDateEpoch, "TAR mtime");
  header.fill(0x20, 148, 156);
  header.write(entry.isDirectory ? "5" : "0", 156, 1, "ascii");
  writeTarString(header, 257, 6, "ustar\0", "TAR magic");
  writeTarString(header, 263, 2, "00", "TAR version");
  writeTarString(header, 345, 155, tarPath.prefix, "TAR prefix");

  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  const checksumText = checksum.toString(8);
  if (checksumText.length > 6) {
    fail("TAR checksum exceeds the USTAR field limit");
  }
  header.write(`${checksumText.padStart(6, "0")}\0 `, 148, 8, "ascii");
  return header;
}

function createTar(entries, sourceDateEpoch) {
  const chunks = [];
  for (const entry of entries) {
    chunks.push(createTarHeader(entry, sourceDateEpoch));
    if (!entry.isDirectory) {
      chunks.push(entry.data);
      const remainder = entry.data.length % 512;
      if (remainder !== 0) {
        chunks.push(Buffer.alloc(512 - remainder));
      }
    }
  }
  chunks.push(Buffer.alloc(1024));
  return Buffer.concat(chunks);
}

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(sourceDateEpoch) {
  const clamped = Math.min(
    Math.max(sourceDateEpoch, zipMinimumEpoch),
    zipMaximumEpoch,
  );
  const date = new Date(clamped * 1000);
  return {
    date:
      ((date.getUTCFullYear() - 1980) << 9) |
      ((date.getUTCMonth() + 1) << 5) |
      date.getUTCDate(),
    time:
      (date.getUTCHours() << 11) |
      (date.getUTCMinutes() << 5) |
      Math.floor(date.getUTCSeconds() / 2),
  };
}

function createZip(entries, sourceDateEpoch) {
  const localChunks = [];
  const centralChunks = [];
  const timestamp = dosTimestamp(sourceDateEpoch);
  let localOffset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const crc = entry.isDirectory ? 0 : crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(timestamp.time, 10);
    local.writeUInt16LE(timestamp.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localChunks.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(timestamp.time, 12);
    central.writeUInt16LE(timestamp.date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(
      (((entry.isDirectory ? 0o40755 : 0o100644) << 16) |
        (entry.isDirectory ? 0x10 : 0)) >>>
        0,
      38,
    );
    central.writeUInt32LE(localOffset, 42);
    centralChunks.push(central, name);
    localOffset += local.length + name.length + data.length;
  }

  if (entries.length > 0xffff) {
    fail("release archive exceeds the ZIP entry limit");
  }
  const centralDirectory = Buffer.concat(centralChunks);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localChunks, centralDirectory, end]);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function publishArtifacts(tgz, zip) {
  const parent = path.dirname(distDir);
  fs.mkdirSync(parent, { recursive: true });
  const temporary = fs.mkdtempSync(path.join(parent, ".design-pipeline-dist-"));
  const backup = path.join(parent, `.design-pipeline-dist-backup-${process.pid}`);
  let movedExisting = false;

  try {
    fs.writeFileSync(path.join(temporary, "design-pipeline-skill.tgz"), tgz);
    fs.writeFileSync(path.join(temporary, "design-pipeline-skill.zip"), zip);
    fs.writeFileSync(
      path.join(temporary, "checksums.txt"),
      [
        `${sha256(tgz)}  design-pipeline-skill.tgz`,
        `${sha256(zip)}  design-pipeline-skill.zip`,
      ].join("\n") + "\n",
    );

    if (fs.existsSync(backup)) {
      fail(`stale package backup already exists: ${backup}`);
    }
    if (fs.existsSync(distDir)) {
      fs.renameSync(distDir, backup);
      movedExisting = true;
    }
    try {
      fs.renameSync(temporary, distDir);
    } catch (error) {
      if (movedExisting && !fs.existsSync(distDir) && fs.existsSync(backup)) {
        fs.renameSync(backup, distDir);
        movedExisting = false;
      }
      throw error;
    }
    if (movedExisting) {
      fs.rmSync(backup, { recursive: true, force: true });
      movedExisting = false;
    }
  } finally {
    if (fs.existsSync(temporary)) {
      fs.rmSync(temporary, { recursive: true, force: true });
    }
    if (movedExisting && !fs.existsSync(distDir) && fs.existsSync(backup)) {
      fs.renameSync(backup, distDir);
    }
  }
}

function main() {
  if (options.help) {
    console.log("Usage: node scripts/package.cjs [--output-root <path>]");
    return;
  }
  const sourceDateEpoch = resolveSourceDateEpoch();
  const entries = collectArchiveEntries(sourceDateEpoch);
  const tar = createTar(entries, sourceDateEpoch);
  const tgz = zlib.gzipSync(tar, { level: 9, mtime: 0 });
  tgz.writeUInt32LE(0, 4);
  tgz[9] = 0xff;
  const zip = createZip(entries, sourceDateEpoch);

  publishArtifacts(tgz, zip);
  console.log(
    `OK ${path.relative(repoRoot, path.join(distDir, "design-pipeline-skill.tgz"))} (${tgz.length} bytes) v${version}`,
  );
  console.log(
    `OK ${path.relative(repoRoot, path.join(distDir, "design-pipeline-skill.zip"))} (${zip.length} bytes)`,
  );
  console.log(`OK ${path.relative(repoRoot, path.join(distDir, "checksums.txt"))}`);
}

try {
  main();
} catch (error) {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
}

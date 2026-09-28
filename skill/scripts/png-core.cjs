"use strict";

// Minimal dependency-free PNG codec for evidence analysis. Decodes non-interlaced 8/16-bit
// grayscale, RGB, palette, gray+alpha and RGBA images (what browsers, ffmpeg and Blender write)
// to 8-bit RGBA, and encodes RGBA for fixtures and diagnostic overlays.

const zlib = require("node:zlib");
const { fail } = require("./contract-utils.cjs");

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePng(buffer, label = "image") {
  if (!Buffer.isBuffer(buffer) || buffer.length < 33 || !buffer.subarray(0, 8).equals(SIGNATURE)) fail("png", `${label} is not a PNG file; export the frame as PNG`);
  let offset = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const data = [];
  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      header = { width: body.readUInt32BE(0), height: body.readUInt32BE(4), depth: body[8], colorType: body[9], interlace: body[12] };
    } else if (type === "PLTE") palette = body;
    else if (type === "tRNS") transparency = body;
    else if (type === "IDAT") data.push(body);
    else if (type === "IEND") break;
  }
  if (!header) fail("png", `${label} has no IHDR chunk`);
  const { width, height, depth, colorType, interlace } = header;
  if (!Object.hasOwn(CHANNELS, colorType)) fail("png", `${label} has unsupported color type ${colorType}`);
  if (interlace) fail("png", `${label} is interlaced; re-export it without interlacing (ffmpeg -i in.png out.png does this)`);
  if (![8, 16].includes(depth) || (colorType === 3 && depth !== 8)) fail("png", `${label} has unsupported bit depth ${depth}; re-export as 8-bit PNG`);
  if (width === 0 || height === 0 || width * height > 64e6) fail("png", `${label} has unsupported dimensions ${width}x${height}`);
  const channels = CHANNELS[colorType];
  const bytesPerPixel = channels * (depth / 8);
  const stride = width * bytesPerPixel;
  const raw = zlib.inflateSync(Buffer.concat(data));
  if (raw.length < (stride + 1) * height) fail("png", `${label} image data is truncated`);
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? out[x - bytesPerPixel] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= bytesPerPixel ? prev[x - bytesPerPixel] : 0;
      let value = line[x];
      if (filter === 1) value += left;
      else if (filter === 2) value += up;
      else if (filter === 3) value += (left + up) >> 1;
      else if (filter === 4) value += paeth(left, up, upLeft);
      else if (filter !== 0) fail("png", `${label} uses unknown filter ${filter}`);
      out[x] = value & 0xff;
    }
  }
  const rgba = Buffer.alloc(width * height * 4);
  const sample = (index) => (depth === 16 ? pixels[index * 2] : pixels[index]);
  for (let i = 0; i < width * height; i += 1) {
    const base = i * channels;
    let r;
    let g;
    let b;
    let a = 255;
    if (colorType === 0) { r = g = b = sample(base); }
    else if (colorType === 2) { r = sample(base); g = sample(base + 1); b = sample(base + 2); }
    else if (colorType === 3) {
      const index = pixels[i];
      if (!palette || index * 3 + 2 >= palette.length) fail("png", `${label} references a missing palette entry`);
      r = palette[index * 3]; g = palette[index * 3 + 1]; b = palette[index * 3 + 2];
      if (transparency && index < transparency.length) a = transparency[index];
    } else if (colorType === 4) { r = g = b = sample(base); a = sample(base + 1); }
    else { r = sample(base); g = sample(base + 1); b = sample(base + 2); a = sample(base + 3); }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }
  return { width, height, data: rgba };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng({ width, height, data }) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

module.exports = { decodePng, encodePng };

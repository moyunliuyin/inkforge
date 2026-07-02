import { deflateSync } from "node:zlib";

/**
 * Minimal PNG tEXt-chunk codec for SillyTavern card import/export.
 * Pure Buffer walking — no image decoding, no dependencies.
 */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export class PngFormatError extends Error {}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(...buffers: Buffer[]): number {
  let crc = 0xffffffff;
  for (const buf of buffers) {
    for (let i = 0; i < buf.length; i += 1) {
      crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface PngChunk {
  type: string;
  data: Buffer;
}

function walkChunks(png: Buffer): PngChunk[] {
  if (png.length < PNG_SIGNATURE.length + 12 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new PngFormatError("missing PNG signature");
  }
  const chunks: PngChunk[] = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("latin1", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > png.length) {
      throw new PngFormatError(`truncated chunk ${type}`);
    }
    chunks.push({ type, data: png.subarray(dataStart, dataEnd) });
    offset = dataEnd + 4;
    if (type === "IEND") return chunks;
  }
  throw new PngFormatError("missing IEND chunk");
}

function encodeChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "latin1");
  const head = Buffer.alloc(4);
  head.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeBuf, data), 0);
  return Buffer.concat([head, typeBuf, data, crcBuf]);
}

function parseTextChunk(data: Buffer): { keyword: string; text: string } | null {
  const nul = data.indexOf(0);
  if (nul <= 0) return null;
  return {
    keyword: data.toString("latin1", 0, nul),
    text: data.toString("latin1", nul + 1),
  };
}

/** Extract the text of the first tEXt chunk matching `keyword`, or null. */
export function extractTextChunk(png: Buffer, keyword: string): string | null {
  for (const chunk of walkChunks(png)) {
    if (chunk.type !== "tEXt") continue;
    const parsed = parseTextChunk(chunk.data);
    if (parsed && parsed.keyword === keyword) return parsed.text;
  }
  return null;
}

/**
 * Return a copy of `png` where every existing tEXt chunk with `keyword` is
 * removed and a single fresh one (inserted before IEND) carries `text`.
 */
export function replaceTextChunk(
  png: Buffer,
  keyword: string,
  text: string,
): { png: Buffer; replaced: number } {
  const chunks = walkChunks(png);
  let replaced = 0;
  const parts: Buffer[] = [PNG_SIGNATURE];
  for (const chunk of chunks) {
    if (chunk.type === "tEXt") {
      const parsed = parseTextChunk(chunk.data);
      if (parsed && parsed.keyword === keyword) {
        replaced += 1;
        continue;
      }
    }
    if (chunk.type === "IEND") {
      const textData = Buffer.concat([
        Buffer.from(keyword, "latin1"),
        Buffer.from([0]),
        Buffer.from(text, "latin1"),
      ]);
      parts.push(encodeChunk("tEXt", textData));
    }
    parts.push(encodeChunk(chunk.type, chunk.data));
  }
  return { png: Buffer.concat(parts), replaced };
}

/** Synthesize a valid solid-color RGBA PNG (placeholder avatar for cards without one). */
export function createSolidPng(input: {
  width: number;
  height: number;
  rgba: [number, number, number, number];
}): Buffer {
  const { width, height, rgba } = input;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4 + 1; // +1 filter byte per scanline
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0; // filter: none
    for (let x = 0; x < width; x += 1) {
      const px = row + 1 + x * 4;
      raw[px] = rgba[0];
      raw[px + 1] = rgba[1];
      raw[px + 2] = rgba[2];
      raw[px + 3] = rgba[3];
    }
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    encodeChunk("IHDR", ihdr),
    encodeChunk("IDAT", deflateSync(raw)),
    encodeChunk("IEND", Buffer.alloc(0)),
  ]);
}

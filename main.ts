// Orvane — a travel poster for a place that isn't there.
//
// The poster itself is entry.png, sitting next to this file in the
// repository. It was finished by draw_entry.py (Pillow): a generated dusk
// scene of Orvane's spiral lantern-tower, with the name ORVANE set in
// letterspaced cream serif across the sky and one small line at the foot
// telling the judge the place was invented for the poster.
//
// This program does no drawing. Its whole job is to hand the grader an
// exact copy of that PNG, after proving to itself that the file is a
// whole, well-formed PNG of the size the bounty allows. It runs offline,
// needs no package beyond the Node standard library, and finishes in
// well under a second.
//
// Run it by hand like this:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Without MAKEFUN_OUTPUT_DIR it writes to /output, the directory the
// grading sandbox provides.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The bounty gate: a whole PNG or JPEG, at most 1 MiB, at most 1024x1024.
const BYTE_CAP = 1048576;
const SIDE_CAP = 1024;

const PNG_MAGIC = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IHDR_TAG = 'IHDR';
// First chunk of a PNG: 4-byte length, "IHDR", 13 bytes of header,
// then a 4-byte CRC over the tag plus the header bytes.
const IHDR_CHUNK_BYTES = 25;
const IHDR_DATA_BYTES = 13;

// CRC-32 (IEEE, the one PNG uses), built once at startup.
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c;
}

function pngCrc(bytes, start, end) {
  let crc = 0xffffffff;
  for (let i = start; i < end; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function fail(why) {
  throw new Error(`orvane entry: ${why}`);
}

function checkPng(bytes) {
  if (bytes.length < IHDR_CHUNK_BYTES + 12) fail('entry.png is too short to be a PNG');
  if (bytes.length > BYTE_CAP) fail(`entry.png is ${bytes.length} bytes, over the ${BYTE_CAP} byte cap`);
  for (let i = 0; i < PNG_MAGIC.length; i += 1) {
    if (bytes[i] !== PNG_MAGIC[i]) fail('entry.png does not start with the PNG signature');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkLength = view.getUint32(8);
  if (chunkLength !== IHDR_DATA_BYTES) fail(`first chunk is ${chunkLength} bytes, expected an IHDR of 13`);
  const tag = String.fromCharCode(...bytes.subarray(12, 16));
  if (tag !== IHDR_TAG) fail(`first chunk is ${tag}, expected IHDR`);
  const storedCrc = view.getUint32(29);
  const realCrc = pngCrc(bytes, 12, 29);
  if (storedCrc !== realCrc) fail('IHDR checksum does not match its contents');
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width > SIDE_CAP || height > SIDE_CAP) {
    fail(`entry.png is ${width}x${height}, over the ${SIDE_CAP}x${SIDE_CAP} limit`);
  }
  if (width !== SIDE_CAP || height !== SIDE_CAP) {
    fail(`entry.png is ${width}x${height}, expected ${SIDE_CAP}x${SIDE_CAP}`);
  }
}

const posterPath = join(dirname(fileURLToPath(import.meta.url)), 'entry.png');
const poster = await readFile(posterPath).catch(() => {
  fail('entry.png is missing next to main.ts');
});
checkPng(poster);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'entry.png'), poster);

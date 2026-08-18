const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[i] = c;
}

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

class ZipWriter {
  constructor() {
    this.files = [];
  }

  addFile(name, content) {
    const formattedName = name.replace(/\\/g, '/');
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const compressed = zlib.deflateRawSync(data);
    this.files.push({
      name: formattedName,
      data,
      compressed,
      crc: crc32(data),
      uncompressedSize: data.length,
      compressedSize: compressed.length
    });
  }

  addDirRecursive(dirPath, zipPrefix = '') {
    for (const item of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const fullPath = path.join(dirPath, item.name);
      const zipPath = zipPrefix ? (zipPrefix + '/' + item.name) : item.name;
      if (item.isDirectory()) {
        if (item.name === 'node_modules' || item.name === '.git') continue;
        this.addDirRecursive(fullPath, zipPath);
      } else {
        this.addFile(zipPath, fs.readFileSync(fullPath));
      }
    }
  }

  toBuffer() {
    const localHeaders = [];
    const centralHeaders = [];
    let offset = 0;

    for (const f of this.files) {
      const nameBuf = Buffer.from(f.name, 'utf8');

      const lh = Buffer.alloc(30 + nameBuf.length);
      lh.writeUInt32LE(0x04034b50, 0);
      lh.writeUInt16LE(20, 4);
      lh.writeUInt16LE(0, 6);
      lh.writeUInt16LE(8, 8);
      lh.writeUInt16LE(0, 10);
      lh.writeUInt16LE(0, 12);
      lh.writeUInt32LE(f.crc, 14);
      lh.writeUInt32LE(f.compressedSize, 18);
      lh.writeUInt32LE(f.uncompressedSize, 22);
      lh.writeUInt16LE(nameBuf.length, 26);
      lh.writeUInt16LE(0, 28);
      nameBuf.copy(lh, 30);

      const localOffset = offset;
      localHeaders.push(lh, f.compressed);
      offset += lh.length + f.compressed.length;

      const ch = Buffer.alloc(46 + nameBuf.length);
      ch.writeUInt32LE(0x02014b50, 0);
      ch.writeUInt16LE(20, 4);
      ch.writeUInt16LE(20, 6);
      ch.writeUInt16LE(0, 8);
      ch.writeUInt16LE(8, 10);
      ch.writeUInt16LE(0, 12);
      ch.writeUInt16LE(0, 14);
      ch.writeUInt32LE(f.crc, 16);
      ch.writeUInt32LE(f.compressedSize, 20);
      ch.writeUInt32LE(f.uncompressedSize, 24);
      ch.writeUInt16LE(nameBuf.length, 28);
      ch.writeUInt16LE(0, 30);
      ch.writeUInt16LE(0, 32);
      ch.writeUInt16LE(0, 34);
      ch.writeUInt16LE(0, 36);
      ch.writeUInt32LE(0, 38);
      ch.writeUInt32LE(localOffset, 42);
      nameBuf.copy(ch, 46);

      centralHeaders.push(ch);
    }

    const centralDirOffset = offset;
    let centralDirSize = 0;
    for (const ch of centralHeaders) centralDirSize += ch.length;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.files.length, 8);
    eocd.writeUInt16LE(this.files.length, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirOffset, 16);
    eocd.writeUInt16LE(0, 20);

    return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  }
}

// 1. Copy main.js to both MiBP/scripts/main.js and MiBP/main.js
const bpScriptsMain = path.resolve(__dirname, '../MiBP/scripts/main.js');
const bpRootMain = path.resolve(__dirname, '../MiBP/main.js');

if (fs.existsSync(bpScriptsMain)) {
  fs.copyFileSync(bpScriptsMain, bpRootMain);
  console.log('Synchronized MiBP/scripts/main.js to MiBP/main.js');
}

// 2. Package Mi.mcaddon
const zip = new ZipWriter();
zip.addDirRecursive(path.resolve(__dirname, '../MiBP'), 'MiBP');
zip.addDirRecursive(path.resolve(__dirname, '../MiRP'), 'MiRP');

const addonPath = path.resolve(__dirname, '../Mi.mcaddon');
fs.writeFileSync(addonPath, zip.toBuffer());
console.log('Successfully created updated Mi.mcaddon at:', addonPath);

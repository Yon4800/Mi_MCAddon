const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const baseDir = path.resolve(__dirname, '..');
const emojiDir = path.join(baseDir, 'MiRP/font/emojis');

if (!fs.existsSync(emojiDir)) {
  fs.mkdirSync(emojiDir, { recursive: true });
}

// Read raw RGBA pixel data from an uncompressed or simple 16x16 PNG
// For standard PNG parsing:
function parsePngRGBA(filePath) {
  const buf = fs.readFileSync(filePath);
  // Check PNG signature
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
    return null;
  }
  let pos = 8;
  let width = 0, height = 0;
  const idatChunks = [];

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(pos + 8);
      height = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 8 + len + 4;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  const pixels = [];
  const rowSize = 1 + width * 4;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      pixels.push([
        decompressed[p] || 0,
        decompressed[p + 1] || 0,
        decompressed[p + 2] || 0,
        decompressed[p + 3] !== undefined ? decompressed[p + 3] : 255
      ]);
    }
  }
  return { width, height, pixels };
}

function createPngRGBA(width, height, getPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
      }
    }
    buf.writeUInt32BE((c ^ 0xffffffff) >>> 0, 8 + len);
    return buf;
  }

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0;
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      const [r, g, b, a] = getPixel(x, y);
      rawData[p] = r;
      rawData[p + 1] = g;
      rawData[p + 2] = b;
      rawData[p + 3] = a;
    }
  }

  const idatChunk = createChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 1. Gather all PNG files in font/emojis/
const files = fs.readdirSync(emojiDir).filter(f => f.endsWith('.png'));
console.log(`Found ${files.length} individual emoji files in MiRP/font/emojis/`);

const emojiSlotMap = []; // slot index (1..255) -> parsed pixels

for (let i = 0; i < files.length; i++) {
  const fileName = files[i];
  const parsed = parsePngRGBA(path.join(emojiDir, fileName));
  if (parsed) {
    emojiSlotMap[i + 1] = parsed; // slot 1 = \uE001, etc.
  }
}

// 2. Build 256x256 glyph_E0.png from individual 16x16 images
const sheetWidth = 256;
const sheetHeight = 256;

const packedSheet = createPngRGBA(sheetWidth, sheetHeight, (x, y) => {
  const col = Math.floor(x / 16);
  const row = Math.floor(y / 16);
  const slot = row * 16 + col;
  const localX = x % 16;
  const localY = y % 16;

  const emoji = emojiSlotMap[slot];
  if (emoji && emoji.pixels) {
    // Sample nearest if dimensions differ from 16x16
    const srcX = Math.floor((localX / 16) * emoji.width);
    const srcY = Math.floor((localY / 16) * emoji.height);
    const idx = srcY * emoji.width + srcX;
    return emoji.pixels[idx] || [0, 0, 0, 0];
  }
  return [0, 0, 0, 0];
});

// 3. Write glyph_E0.png to all target font paths
const targetPaths = [
  path.join(baseDir, 'MiRP/font/glyph_E0.png'),
  path.join(baseDir, 'MiRP/texts/ja_JP/font/glyph_E0.png'),
  path.join(baseDir, 'MiRP/texts/en_US/font/glyph_E0.png')
];

for (const target of targetPaths) {
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, packedSheet);
}

console.log("Successfully packed all individual emojis into glyph_E0.png!");

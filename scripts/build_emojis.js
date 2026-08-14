const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const baseDir = path.resolve(__dirname, '..');
const kEmojiDir = path.join(baseDir, 'MiRP/font/k_emojis');
const emojiDir = path.join(baseDir, 'MiRP/font/emojis');

if (!fs.existsSync(kEmojiDir)) fs.mkdirSync(kEmojiDir, { recursive: true });
if (!fs.existsSync(emojiDir)) fs.mkdirSync(emojiDir, { recursive: true });

// Complete PNG Decoder supporting Filter Types (None, Sub, Up, Average, Paeth) & Color Types (RGB, RGBA)
function parsePngRGBA(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4E || buf[3] !== 0x47) {
    return null;
  }
  
  let width = buf.readUInt32BE(16);
  let height = buf.readUInt32BE(20);
  let colorType = buf[25]; // 2 = RGB, 6 = RGBA

  let idatList = [];
  let pos = 8;
  while (pos < buf.length) {
    let len = buf.readUInt32BE(pos);
    let type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idatList.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 8 + len + 4;
  }

  const inflated = zlib.inflateSync(Buffer.concat(idatList));
  const bytesPerPixel = colorType === 6 ? 4 : (colorType === 2 ? 3 : 4);
  const stride = width * bytesPerPixel;
  const raw = Buffer.alloc(height * stride);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    let filterType = inflated[offset++];
    let rowStart = y * stride;
    let prevRowStart = (y - 1) * stride;

    for (let x = 0; x < stride; x++) {
      let byte = inflated[offset++];
      let a = x >= bytesPerPixel ? raw[rowStart + x - bytesPerPixel] : 0;
      let b = y > 0 ? raw[prevRowStart + x] : 0;
      let c = (y > 0 && x >= bytesPerPixel) ? raw[prevRowStart + x - bytesPerPixel] : 0;

      let val = 0;
      if (filterType === 0) {
        val = byte;
      } else if (filterType === 1) { // Sub
        val = (byte + a) & 0xff;
      } else if (filterType === 2) { // Up
        val = (byte + b) & 0xff;
      } else if (filterType === 3) { // Average
        val = (byte + Math.floor((a + b) / 2)) & 0xff;
      } else if (filterType === 4) { // Paeth
        let p = a + b - c;
        let pa = Math.abs(p - a);
        let pb = Math.abs(p - b);
        let pc = Math.abs(p - c);
        let pr = (pa <= pb && pa <= pc) ? a : ((pb <= pc) ? b : c);
        val = (byte + pr) & 0xff;
      }
      raw[rowStart + x] = val;
    }
  }

  const pixels = [];
  for (let y = 0; y < height; y++) {
    let rowStart = y * stride;
    for (let x = 0; x < width; x++) {
      let p = rowStart + x * bytesPerPixel;
      if (colorType === 6) {
        pixels.push([raw[p], raw[p + 1], raw[p + 2], raw[p + 3]]);
      } else if (colorType === 2) {
        pixels.push([raw[p], raw[p + 1], raw[p + 2], 255]);
      } else {
        pixels.push([raw[p], raw[p + 1], raw[p + 2], raw[p + 3] !== undefined ? raw[p + 3] : 255]);
      }
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
    rawData[rowStart] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const p = rowStart + 1 + x * 4;
      const [r, g, b, a] = getPixel(x, y);
      rawData[p] = r;
      rawData[p + 1] = g;
      rawData[p + 2] = b;
      rawData[p + 3] = a !== undefined ? a : 255;
    }
  }

  const idatChunk = createChunk('IDAT', zlib.deflateSync(rawData));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Fixed order for k_emojis
const fixedKOrder = [
  'blobcat.png', 'woneko.png', 'aichi.png', 'mochocho.png',
  'ota.png', 'otaku_cry.png', 'blebcat.png', 'regretcar.png',
  'yosano.png', 'tutinoko.png'
];

const emojiSlotMap = [];
let currentSlot = 1;

for (const file of fixedKOrder) {
  const p = path.join(kEmojiDir, file);
  if (fs.existsSync(p)) {
    const parsed = parsePngRGBA(p);
    if (parsed) {
      emojiSlotMap[currentSlot++] = parsed;
    }
  }
}

const otherKFiles = fs.readdirSync(kEmojiDir).filter(f => f.endsWith('.png') && !fixedKOrder.includes(f));
for (const file of otherKFiles) {
  const parsed = parsePngRGBA(path.join(kEmojiDir, file));
  if (parsed) {
    emojiSlotMap[currentSlot++] = parsed;
  }
}

const customFiles = fs.readdirSync(emojiDir).filter(f => f.endsWith('.png'));
for (const file of customFiles) {
  const parsed = parsePngRGBA(path.join(emojiDir, file));
  if (parsed) {
    emojiSlotMap[currentSlot++] = parsed;
  }
}

console.log(`Packed ${currentSlot - 1} emojis properly with complete unfilter decoding!`);

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
    const srcX = Math.floor((localX / 16) * emoji.width);
    const srcY = Math.floor((localY / 16) * emoji.height);
    const idx = srcY * emoji.width + srcX;
    return emoji.pixels[idx] || [0, 0, 0, 0];
  }
  return [0, 0, 0, 0];
});

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

console.log("Successfully packed perfectly opaque and colored emojis into glyph_E0.png!");

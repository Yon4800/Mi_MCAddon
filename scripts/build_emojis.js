const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const baseDir = path.resolve(__dirname, '..');
const kEmojiDir = path.join(baseDir, 'MiRP/font/k_emojis');
const emojiDir = path.join(baseDir, 'MiRP/font/emojis');

if (!fs.existsSync(kEmojiDir)) fs.mkdirSync(kEmojiDir, { recursive: true });
if (!fs.existsSync(emojiDir)) fs.mkdirSync(emojiDir, { recursive: true });

async function loadAnyImageRGBA(filePath) {
  try {
    const img = sharp(filePath);
    const meta = await img.metadata();
    const raw = await img.ensureAlpha().raw().toBuffer();
    
    const pixels = [];
    for (let i = 0; i < raw.length; i += 4) {
      pixels.push([raw[i], raw[i + 1], raw[i + 2], raw[i + 3]]);
    }
    return { width: meta.width, height: meta.height, pixels };
  } catch (err) {
    console.error("Failed to parse image " + filePath + ":", err);
    return null;
  }
}

async function buildSheetSharp(slotMap) {
  const sheetWidth = 256;
  const sheetHeight = 256;
  const rawBuffer = Buffer.alloc(sheetWidth * sheetHeight * 4);

  for (let y = 0; y < sheetHeight; y++) {
    for (let x = 0; x < sheetWidth; x++) {
      const col = Math.floor(x / 16);
      const row = Math.floor(y / 16);
      const slot = row * 16 + col;
      const localX = x % 16;
      const localY = y % 16;

      const emoji = slotMap[slot];
      let r = 0, g = 0, b = 0, a = 0;

      if (emoji && emoji.pixels) {
        const srcX = Math.floor((localX / 16) * emoji.width);
        const srcY = Math.floor((localY / 16) * emoji.height);
        const idx = srcY * emoji.width + srcX;
        const px = emoji.pixels[idx];
        if (px) {
          r = px[0];
          g = px[1];
          b = px[2];
          a = px[3];
        }
      }

      const pIdx = (y * sheetWidth + x) * 4;
      rawBuffer[pIdx] = r;
      rawBuffer[pIdx + 1] = g;
      rawBuffer[pIdx + 2] = b;
      rawBuffer[pIdx + 3] = a;
    }
  }

  return await sharp(rawBuffer, {
    raw: { width: sheetWidth, height: sheetHeight, channels: 4 }
  }).png().toBuffer();
}

function writeToAllFontDirs(fileName, data) {
  const targetPaths = [
    path.join(baseDir, 'MiRP/font', fileName),
    path.join(baseDir, 'MiRP/texts/ja_JP/font', fileName),
    path.join(baseDir, 'MiRP/texts/en_US/font', fileName)
  ];
  for (const target of targetPaths) {
    const dir = path.dirname(target);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(target, data);
  }
}

async function main() {
  // 1. Build glyph_E1.png for k_emojis (Default / Fixed emojis on Page 225: \uE101..\uE1FF)
  const fixedKOrder = [
    'blobcat.png', 'neko_relax.png', 'aichi.png', 'mochocho.png',
    'ota.png', 'otaku_cry.png', 'blebcat.png', 'regretcar.png',
    'yosano.png', 'tutinoko.png', 'tinfoil.png', 'neko_cry.png', 'neko_tired2.png'
  ];

  const kEmojiSlotMap = [];
  let kSlot = 1;

  for (const file of fixedKOrder) {
    const p = path.join(kEmojiDir, file);
    if (fs.existsSync(p)) {
      const parsed = await loadAnyImageRGBA(p);
      if (parsed) {
        kEmojiSlotMap[kSlot++] = parsed;
      }
    }
  }

  const otherKFiles = fs.readdirSync(kEmojiDir).filter(f => f.endsWith('.png') && !fixedKOrder.includes(f));
  for (const file of otherKFiles) {
    const parsed = await loadAnyImageRGBA(path.join(kEmojiDir, file));
    if (parsed) {
      kEmojiSlotMap[kSlot++] = parsed;
    }
  }

  const sheetE1 = await buildSheetSharp(kEmojiSlotMap);
  writeToAllFontDirs('glyph_E1.png', sheetE1);
  console.log("Successfully built glyph_E1.png with " + (kSlot - 1) + " default emojis from k_emojis/ (\\uE101 - \\uE10D)!");

  // 2. Build glyph_E0.png for custom emojis/ (User-added emojis on Page 224: \uE001..\uE0FF)
  const customFiles = fs.readdirSync(emojiDir).filter(f => f.endsWith('.png'));
  const customSlotMap = [];
  let cSlot = 1;

  for (const file of customFiles) {
    const parsed = await loadAnyImageRGBA(path.join(emojiDir, file));
    if (parsed) {
      customSlotMap[cSlot++] = parsed;
    }
  }

  const sheetE0 = await buildSheetSharp(customSlotMap);
  writeToAllFontDirs('glyph_E0.png', sheetE0);
  console.log("Successfully built glyph_E0.png with " + (cSlot - 1) + " custom emojis from emojis/ (\\uE001 .. \\uE0FF)!");
}

main().catch(console.error);

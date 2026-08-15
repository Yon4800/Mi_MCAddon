const fs = require('fs');
const path = require('path');

// Install: npm install jimp
const { Jimp } = require('jimp');

async function convertRegretcarTextures() {
  const inputPath = path.join(__dirname, '../MiRP/textures/entities/regretcar.png');
  const outputDir = path.join(__dirname, '../MiRP/textures/entities');

  if (!fs.existsSync(inputPath)) {
    console.error(`Error: ${inputPath} not found`);
    process.exit(1);
  }

  try {
    const image = await Jimp.read(inputPath);
    const width = image.bitmap.width;
    const height = image.bitmap.height;

    // Define color multipliers for each variant (all Minecraft dyes)
    // Format: { filename, r, g, b } (0.0 to 1.0)
    const variants = [
      { filename: 'regretcar_white.png', r: 1.0, g: 1.0, b: 1.0 },
      { filename: 'regretcar_orange.png', r: 1.0, g: 0.647, b: 0.0 },
      { filename: 'regretcar_magenta.png', r: 1.0, g: 0.0, b: 1.0 },
      { filename: 'regretcar_light_blue.png', r: 0.678, g: 0.847, b: 1.0 },
      { filename: 'regretcar_yellow.png', r: 1.0, g: 1.0, b: 0.0 },
      { filename: 'regretcar_lime.png', r: 0.0, g: 1.0, b: 0.0 },
      { filename: 'regretcar_pink.png', r: 1.0, g: 0.753, b: 0.796 },
      { filename: 'regretcar_gray.png', r: 0.5, g: 0.5, b: 0.5 },
      { filename: 'regretcar_light_gray.png', r: 0.75, g: 0.75, b: 0.75 },
      { filename: 'regretcar_cyan.png', r: 0.0, g: 1.0, b: 1.0 },
      { filename: 'regretcar_purple.png', r: 0.627, g: 0.0, b: 0.627 },
      { filename: 'regretcar_blue.png', r: 0.0, g: 0.0, b: 1.0 },
      { filename: 'regretcar_brown.png', r: 0.647, g: 0.322, b: 0.0 },
      { filename: 'regretcar_green.png', r: 0.0, g: 0.502, b: 0.0 },
      { filename: 'regretcar_red.png', r: 1.0, g: 0.0, b: 0.0 },
      { filename: 'regretcar_black.png', r: 0.0, g: 0.0, b: 0.0 }
    ];

    for (const variant of variants) {
      const coloredImage = image.clone();
      
      // Apply color tint to each pixel
      coloredImage.scan(0, 0, width, height, function(x, y, idx) {
        this.bitmap.data[idx + 0] = Math.round(this.bitmap.data[idx + 0] * variant.r);     // R
        this.bitmap.data[idx + 1] = Math.round(this.bitmap.data[idx + 1] * variant.g);     // G
        this.bitmap.data[idx + 2] = Math.round(this.bitmap.data[idx + 2] * variant.b);     // B
        // A (idx + 3) is not modified
      });

      const outputPath = path.join(outputDir, variant.filename);
      await coloredImage.write(outputPath);
      console.log(`✓ Created ${variant.filename}`);
    }

    console.log('All texture variants created successfully!');
  } catch (error) {
    console.error('Error processing textures:', error);
    process.exit(1);
  }
}

convertRegretcarTextures();

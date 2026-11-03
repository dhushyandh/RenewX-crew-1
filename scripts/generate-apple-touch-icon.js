const fs = require('fs');
const path = require('path');
const Jimp = require('../expo-app/node_modules/jimp-compact');

async function generate() {
  const rootDir = path.resolve(__dirname, '..');
  const srcPath = path.join(rootDir, 'expo-app', 'assets', 'icon.png');
  
  if (!fs.existsSync(srcPath)) {
    throw new Error('Source icon not found at: ' + srcPath);
  }

  const src = await Jimp.read(srcPath);

  // Find exact emblem bounds
  let minX = src.bitmap.width, maxX = 0, minY = src.bitmap.height, maxY = 0;
  for (let y = 0; y < src.bitmap.height; y++) {
    for (let x = 0; x < src.bitmap.width; x++) {
      const { r, g, b } = Jimp.intToRGBA(src.getPixelColor(x, y));
      if (r < 245 || g < 245 || b < 245) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const emblemW = maxX - minX + 1;
  const emblemH = maxY - minY + 1;
  const emblemCenterX = minX + emblemW / 2;
  const emblemCenterY = minY + emblemH / 2;

  // Clean source background pixels to pure white #ffffff
  for (let y = 0; y < src.bitmap.height; y++) {
    for (let x = 0; x < src.bitmap.width; x++) {
      const { r, g, b } = Jimp.intToRGBA(src.getPixelColor(x, y));
      if (r >= 246 && g >= 244 && b >= 244) {
        src.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
      }
    }
  }

  // Create a 1024x1024 clean white canvas and center the emblem exactly at 512, 512
  const canvas1024 = new Jimp(1024, 1024, 0xFFFFFFFF);
  const shiftX = Math.round(512 - emblemCenterX);
  const shiftY = Math.round(512 - emblemCenterY);
  canvas1024.composite(src, shiftX, shiftY);

  // Resample to exactly 180x180 pixels using bicubic interpolation
  const icon180 = canvas1024.resize(180, 180, Jimp.RESIZE_BICUBIC);

  // Guarantee clean #ffffff on outer background
  for (let y = 0; y < 180; y++) {
    for (let x = 0; x < 180; x++) {
      const { r, g, b } = Jimp.intToRGBA(icon180.getPixelColor(x, y));
      if (r >= 248 && g >= 248 && b >= 248) {
        icon180.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 255), x, y);
      }
    }
  }

  // Write destinations
  const destinations = [
    path.join(rootDir, 'public', 'apple-touch-icon.png'),
    path.join(rootDir, 'expo-app', 'web', 'apple-touch-icon.png'),
    path.join(rootDir, 'expo-app', 'public', 'apple-touch-icon.png'),
  ];

  for (const dest of destinations) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await icon180.writeAsync(dest);
    console.log('Saved 180x180 icon to:', dest);
  }

  // Verify PNG header
  const buf = fs.readFileSync(destinations[0]);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  console.log(`Verified output: ${width}x${height} pixels, ${buf.length} bytes.`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});


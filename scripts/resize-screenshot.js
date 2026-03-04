const sharp = require('sharp');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || path.join(__dirname, '..', 'assets', 'app-store-screenshot-1242x2688.png');

if (!inputPath) {
  console.error('Usage: node resize-screenshot.js <input.png> [output.png]');
  process.exit(1);
}

sharp(inputPath)
  .resize(1242, 2688, { fit: 'fill' })
  .toFile(outputPath)
  .then(() => console.log('Saved:', outputPath))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

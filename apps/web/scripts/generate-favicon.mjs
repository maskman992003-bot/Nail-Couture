import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public/NC.jpg');
const outDir = path.join(root, 'public');

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="white"/></svg>`,
  );
}

async function writeCircularFavicon(size, filename) {
  await sharp(src)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .composite([{ input: circleMask(size), blend: 'dest-in' }])
    .png()
    .toFile(path.join(outDir, filename));
}

async function main() {
  await Promise.all([
    writeCircularFavicon(16, 'favicon-16.png'),
    writeCircularFavicon(32, 'favicon-32.png'),
    writeCircularFavicon(48, 'favicon-48.png'),
    writeCircularFavicon(180, 'apple-touch-icon.png'),
    writeCircularFavicon(512, 'favicon.png'),
  ]);
  console.log('Generated circular favicons from public/NC.jpg');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public/landing/reference-mockup.png');
const outDir = path.join(root, 'public/landing');

// [left, top, right, bottom] fractions + optional target width
const CROPS = {
  'hero-reception.jpg': { box: [0.50, 0.055, 0.985, 0.255], width: 1400 },
  'experience-interior.jpg': { box: [0.50, 0.415, 0.985, 0.555], width: 1400 },
  'story-detail.jpg': { box: [0.025, 0.665, 0.335, 0.855], width: 700 },
  'service-acrylics.jpg': { box: [0.035, 0.295, 0.195, 0.385], width: 400 },
  'service-gelx.jpg': { box: [0.215, 0.295, 0.375, 0.385], width: 400 },
  'service-builder.jpg': { box: [0.395, 0.295, 0.555, 0.385], width: 400 },
  'service-pedicures.jpg': { box: [0.575, 0.295, 0.735, 0.385], width: 400 },
  'service-waxing.jpg': { box: [0.755, 0.295, 0.915, 0.385], width: 400 },
  'logo-header.png': { box: [0.03, 0.012, 0.22, 0.048], width: 320 },
};

async function main() {
  const meta = await sharp(src).metadata();
  const { width, height } = meta;
  console.log('Source dimensions:', width, 'x', height);

  for (const [name, { box, width: targetWidth }] of Object.entries(CROPS)) {
    const [x1, y1, x2, y2] = box;
    const left = Math.round(x1 * width);
    const top = Math.round(y1 * height);
    const w = Math.round((x2 - x1) * width);
    const h = Math.round((y2 - y1) * height);

    let pipeline = sharp(src).extract({ left, top, width: w, height: h });
    if (targetWidth) {
      pipeline = pipeline.resize({ width: targetWidth, withoutEnlargement: false, kernel: sharp.kernel.lanczos3 });
    }

    const outPath = path.join(outDir, name);
    if (name.endsWith('.png')) {
      await pipeline.png().toFile(outPath);
    } else {
      await pipeline.jpeg({ quality: 90 }).toFile(outPath);
    }
    console.log('Wrote', name, { left, top, width: w, height: h, targetWidth });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

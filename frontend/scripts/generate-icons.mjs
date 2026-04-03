import sharp from 'sharp';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Raster icons for favicon / PWA from the monochrome mark (same source as <Logo variant="mark" />).
 * - Default: src/assets/omega-mark.svg (aligned with chronus.svg: black artwork on transparent).
 * - Optional: omega-app-icon.override.png to substitute raster output (e.g. exported from design tool).
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const assetsDir = join(__dirname, '..', 'src', 'assets');
const publicDir = join(__dirname, '..', 'public');
const markSvgPath = join(assetsDir, 'omega-mark.svg');
const markOverridePath = join(assetsDir, 'omega-app-icon.override.png');

const outputs = [
  { name: 'favicon-32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

if (!existsSync(markSvgPath)) {
  console.error(`Missing mark SVG: ${markSvgPath}`);
  process.exit(1);
}

let inputBuffer;
if (existsSync(markOverridePath)) {
  inputBuffer = readFileSync(markOverridePath);
  console.log('Using omega-app-icon.override.png for raster icons');
} else {
  inputBuffer = readFileSync(markSvgPath);
  console.log('Using omega-mark.svg for raster icons');
}

for (const { name, size } of outputs) {
  await sharp(inputBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(join(publicDir, name));
  console.log(`Generated ${name} (${size}x${size})`);
}

const legacySvg = join(publicDir, 'omega-icon.svg');
if (existsSync(legacySvg)) {
  unlinkSync(legacySvg);
  console.log('Removed legacy public/omega-icon.svg');
}

const legacyGeneratedMark = join(assetsDir, 'omega-app-icon.png');
if (existsSync(legacyGeneratedMark)) {
  unlinkSync(legacyGeneratedMark);
  console.log('Removed legacy src/assets/omega-app-icon.png (mark is SVG now)');
}

console.log('All icons generated successfully!');

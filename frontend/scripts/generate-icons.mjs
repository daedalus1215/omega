import sharp from 'sharp';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
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

/**
 * Source image for the Tauri desktop and Android app icons. `npm run icons`
 * hands it to `tauri icon`, which cuts every size and density from it. The
 * mark sits inside the central 60% because Android launchers mask adaptive
 * icons to a circle, keeping only the central 66/108 for certain.
 */
const tauriIconSize = 1024;
const tauriMark = await sharp(inputBuffer)
  .resize(Math.round(tauriIconSize * 0.6), Math.round(tauriIconSize * 0.6))
  .png()
  .toBuffer();
await sharp({
  create: {
    width: tauriIconSize,
    height: tauriIconSize,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: tauriMark, gravity: 'centre' }])
  .png()
  .toFile(join(__dirname, '..', 'src-tauri', 'app-icon.png'));
console.log(`Generated src-tauri/app-icon.png (${tauriIconSize}x${tauriIconSize})`);

/**
 * Status bar icon for reminder notifications (src/tauri/reminder-device.ts).
 * Android draws only its alpha channel, so it's the mark in white on
 * transparent, 24dp at each density. Always from the SVG: an override PNG's
 * opaque background would come out as a white square. `tauri icon` leaves
 * drawable-* alone.
 */
const androidResDir = join(
  __dirname,
  '..',
  'src-tauri',
  'gen',
  'android',
  'app',
  'src',
  'main',
  'res'
);
const statusIconSizes = { mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 };
for (const [density, size] of Object.entries(statusIconSizes)) {
  const dir = join(androidResDir, `drawable-${density}`);
  mkdirSync(dir, { recursive: true });
  await sharp(readFileSync(markSvgPath))
    .resize(size, size)
    .negate({ alpha: false })
    .png()
    .toFile(join(dir, 'ic_stat_omega.png'));
  console.log(`Generated android drawable-${density}/ic_stat_omega.png (${size}x${size})`);
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

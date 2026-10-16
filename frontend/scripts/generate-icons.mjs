import sharp from 'sharp';
import { readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync } from 'fs';
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
 * Android launcher icons and splash screens, when the Capacitor project exists.
 * `cap add android` seeds these with Capacitor's own artwork; each one is redrawn
 * at its existing size so every density stays correct without a size table.
 * Mark scale is the mark canvas's share of the image's short side:
 * - ic_launcher_foreground is the adaptive-icon layer; launchers mask it to a
 *   circle, so the mark must sit inside the central 66/108 safe zone.
 * - ic_launcher_round is masked to a circle here (pre-Android 8 launchers).
 */
const androidResDir = join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const androidImages = {
  'ic_launcher.png': { markScale: 1, background: WHITE },
  'ic_launcher_round.png': { markScale: 0.8, background: WHITE, circle: true },
  'ic_launcher_foreground.png': { markScale: 0.6, background: TRANSPARENT },
  'splash.png': { markScale: 0.35, background: WHITE },
};

if (existsSync(androidResDir)) {
  for (const dir of readdirSync(androidResDir)) {
    for (const [file, { markScale, background, circle }] of Object.entries(androidImages)) {
      const path = join(androidResDir, dir, file);
      if (!existsSync(path)) continue;

      const { width, height } = await sharp(path).metadata();
      const markSize = Math.round(Math.min(width, height) * markScale);
      const mark = await sharp(inputBuffer).resize(markSize, markSize).png().toBuffer();
      const layers = [{ input: mark, gravity: 'centre' }];
      if (circle) {
        const r = width / 2;
        const mask = `<svg width="${width}" height="${height}"><circle cx="${r}" cy="${r}" r="${r}"/></svg>`;
        layers.push({ input: Buffer.from(mask), blend: 'dest-in' });
      }

      const image = await sharp({ create: { width, height, channels: 4, background } })
        .composite(layers)
        .png()
        .toBuffer();
      writeFileSync(path, image);
      console.log(`Generated android ${dir}/${file} (${width}x${height})`);
    }
  }
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

/**
 * Builds a white-on-transparent Android notification icon from the app icon.
 * Run: node scripts/generate-notification-icon.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const input = path.join(root, 'assets', 'images', 'app-icon.png');
const output = path.join(root, 'assets', 'images', 'notification-icon.png');

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const isBackground = luminance < 28;
  if (isBackground) {
    data[i + 3] = 0;
  } else {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 255;
  }
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(output);

console.log('Wrote', output);

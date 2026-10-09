/**
 * Rasterizes the SVG app icons into the PNG sizes required by the PWA manifest
 * (and by PWABuilder/Capacitor when packaging the Android build).
 *
 *   node scripts/generate-icons.mjs
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconDir = path.join(root, 'public', 'icons');
if (!existsSync(iconDir)) mkdirSync(iconDir, { recursive: true });

const jobs = [
  { svg: 'icon.svg', out: 'icon-192.png', size: 192 },
  { svg: 'icon.svg', out: 'icon-512.png', size: 512 },
  { svg: 'icon-maskable.svg', out: 'icon-512-maskable.png', size: 512 },
];

for (const job of jobs) {
  const svg = readFileSync(path.join(iconDir, job.svg), 'utf8');
  const raster = new Resvg(svg, {
    fitTo: { mode: 'width', value: job.size },
    background: 'rgba(0, 0, 0, 0)',
  });
  const png = raster.render().asPng();
  const dest = path.join(iconDir, job.out);
  writeFileSync(dest, png);
  console.log(`wrote ${path.relative(root, dest)} (${job.size}x${job.size}, ${png.length} bytes)`);
}

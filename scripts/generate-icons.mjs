/**
 * Generates every app icon (PWA manifest + Android adaptive/legacy mipmaps)
 * from the single 3D source artwork at design/source-3d.png (kept outside
 * public/ so the master artwork never ships inside the app bundle).
 *
 *   node scripts/generate-icons.mjs
 *
 * The source is a 1024x1024 render: glossy teal-blue tile with two glass
 * speech bubbles (ع / A) centred on a deep-navy backdrop. We crop to the
 * tile bounds and re-issue the artwork at every required density.
 */
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(path.join(root, 'design/source-3d.png'));
const href = `data:image/png;base64,${source.toString('base64')}`;

// Tile bounds inside the 1024x1024 source artwork.
const CROP = { x: 164, y: 160, w: 698, h: 698 };

function cropSvg(size, { round = false, tileScale = 1, radius = 0 } = {}) {
  const tile = size * tileScale;
  const offset = (size - tile) / 2;
  const clipId = 'clip';
  const clip = round
    ? `<clipPath id="${clipId}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></clipPath>`
    : radius > 0
      ? `<clipPath id="${clipId}"><rect x="${offset}" y="${offset}" width="${tile}" height="${tile}" rx="${tile * radius}"/></clipPath>`
      : '';
  const clipAttr = clip ? `clip-path="url(#${clipId})"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>${clip}</defs>
  <g ${clipAttr}>
    <svg x="${offset}" y="${offset}" width="${tile}" height="${tile}" viewBox="${CROP.x} ${CROP.y} ${CROP.w} ${CROP.h}" preserveAspectRatio="xMidYMid slice">
      <image href="${href}" x="0" y="0" width="1024" height="1024"/>
    </svg>
  </g>
</svg>`;
}

function render(svg, size, file) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  }).render().asPng();
  writeFileSync(file, png);
  console.log(`wrote ${path.relative(root, file)} (${size}px, ${png.length} bytes)`);
}

// ── 1. PWA / web icons ──────────────────────────────────────────────────────
const webIconDir = path.join(root, 'public/icons');
mkdirSync(webIconDir, { recursive: true });

const web512 = cropSvg(512);
writeFileSync(path.join(webIconDir, 'icon.svg'), web512);
render(web512, 512, path.join(webIconDir, 'icon-512.png'));
render(cropSvg(512), 512, path.join(webIconDir, 'icon-512-maskable.png'));
render(cropSvg(192), 192, path.join(webIconDir, 'icon-192.png'));
render(cropSvg(32, { round: true }), 32, path.join(webIconDir, 'favicon-32.png'));
render(cropSvg(180, { round: true }), 180, path.join(webIconDir, 'apple-touch-icon.png'));

// ── 2. Android mipmaps ──────────────────────────────────────────────────────
// Legacy square / round launcher icons (full-bleed artwork).
const legacy = [
  ['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192],
];
// Adaptive foreground layer is 108dp; the safe zone is the centre 72dp.
const foreground = [
  ['mdpi', 108], ['hdpi', 162], ['xhdpi', 216], ['xxhdpi', 324], ['xxxhdpi', 432],
];

for (const [density, px] of legacy) {
  const dir = path.join(root, `android/app/src/main/res/mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  render(cropSvg(px), px, path.join(dir, 'ic_launcher.png'));
  render(cropSvg(px, { round: true }), px, path.join(dir, 'ic_launcher_round.png'));
}
for (const [density, px] of foreground) {
  const dir = path.join(root, `android/app/src/main/res/mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  // Artwork occupies 74% of the foreground canvas, centred, rounded like the tile.
  render(cropSvg(px, { tileScale: 0.74, radius: 0.22 }), px, path.join(dir, 'ic_launcher_foreground.png'));
}

console.log('\n✅ All icons generated from the 3D source artwork.');

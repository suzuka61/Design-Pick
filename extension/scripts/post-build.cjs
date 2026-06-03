const { readFileSync, writeFileSync, copyFileSync, mkdirSync } = require('fs');
const { resolve } = require('path');

// Use __dirname which handles encoded paths correctly
const distDir = resolve(__dirname, '..', 'dist');

// Copy manifest.json
copyFileSync(resolve(__dirname, '..', 'manifest.json'), resolve(distDir, 'manifest.json'));

// Fix sidepanel/index.html — change absolute path to relative
const htmlPath = resolve(distDir, 'sidepanel', 'index.html');
let html = readFileSync(htmlPath, 'utf-8');
html = html.replace('src="/sidepanel.js"', 'src="../sidepanel.js"');
writeFileSync(htmlPath, html);

// Create icons directory
const iconsDir = resolve(distDir, 'icons');
try { mkdirSync(iconsDir); } catch {}

// Generate SVG placeholder icons
for (const size of [16, 48, 128]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#5b76fe"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="${size * 0.5}" font-weight="700" font-family="sans-serif">D</text></svg>`;
  writeFileSync(resolve(iconsDir, `icon${size}.svg`), svg);
}

// Fix manifest — change .png to .svg
let manifest = readFileSync(resolve(distDir, 'manifest.json'), 'utf-8');
manifest = manifest.replace(/icon\d+\.png/g, (match) => match.replace('.png', '.svg'));
writeFileSync(resolve(distDir, 'manifest.json'), manifest);

console.log('Post-build complete');
#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

console.log('=== Building DesignPick Extension ===\n');

// Step 1: content script
console.log('[1/3] Content script...');
execSync(
  `npx esbuild ${resolve(root, 'content/extract.ts')} --bundle --format=iife --target=chrome120 --outfile=${resolve(dist, 'content.js')} --platform=browser --log-level=warning`,
  { cwd: root, stdio: 'inherit' },
);

// Step 2: background service worker
console.log('[2/3] Background...');
execSync(
  `npx esbuild ${resolve(root, 'background/sw.ts')} --bundle --format=iife --target=chrome120 --outfile=${resolve(dist, 'background.js')} --platform=browser --log-level=warning`,
  { cwd: root, stdio: 'inherit' },
);

// Step 3: sidepanel (pure TS, no React)
console.log('[3/3] Side panel...');
execSync(
  `npx esbuild ${resolve(root, 'sidepanel/main.ts')} --bundle --format=iife --target=chrome120 --outfile=${resolve(dist, 'sidepanel/sidepanel.js')} --platform=browser --log-level=warning`,
  { cwd: root, stdio: 'inherit' },
);

// Post-build
console.log('\nPost-build...');
copyFileSync(resolve(root, 'manifest.json'), resolve(dist, 'manifest.json'));

// Copy sidepanel HTML (already references sidepanel.js in same dir)
mkdirSync(resolve(dist, 'sidepanel'), { recursive: true });
let html = readFileSync(resolve(root, 'sidepanel/index.html'), 'utf-8');
// No rewrite needed — HTML uses <script src="sidepanel.js">
writeFileSync(resolve(dist, 'sidepanel/index.html'), html);

console.log('\n✅ Build complete!');
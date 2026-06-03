#!/usr/bin/env node
/**
 * Verification: Simulate minimaxi.com extraction (white bg, orange brand) and
 * confirm the fixes produce the right DESIGN.md Quick Reference.
 */
import { build } from 'esbuild';
import { writeFileSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Bundle analyzer + types into a single ESM file we can import
const tmp = mkdtempSync(join(tmpdir(), 'dp-test-'));
const outFile = join(tmp, 'bundle.mjs');

await build({
  entryPoints: [resolve(root, 'scripts/test-pipeline.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: outFile,
  logLevel: 'error',
});

// Import the test (it runs on import)
const mod = await import(pathToFileURL(outFile).href);

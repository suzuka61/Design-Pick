/**
 * Generate preview.html from the actual DESIGN.md and save to /tmp.
 */
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const tmp = mkdtempSync(join(tmpdir(), 'dp-prev-'));
const outFile = join(tmp, 'gen.mjs');

await build({
  entryPoints: [resolve(__dirname, 'preview-gen-entry.ts')],
  bundle: true, format: 'esm', platform: 'node', target: 'node20',
  outfile: outFile, logLevel: 'error',
});

const { generate } = await import(pathToFileURL(outFile).href);
const html = await generate();
writeFileSync('/Users/songtao/Documents/提取design项目/preview.html', html, 'utf-8');
console.log('✅ Wrote preview.html (' + html.length + ' chars)');

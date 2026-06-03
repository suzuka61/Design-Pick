/**
 * Verification test: simulate minimaxi.com extraction and confirm
 * the color-fixing changes produce the right output.
 */
import { build } from 'esbuild';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Build a verifier that imports the analyzer + generator
const tmp = mkdtempSync(join(tmpdir(), 'dp-verify-'));
const outFile = join(tmp, 'verify.mjs');

await build({
  entryPoints: [resolve(__dirname, 'verify-entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile: outFile,
  logLevel: 'error',
});

const { runVerification } = await import(pathToFileURL(outFile).href);
const ok = await runVerification();
process.exit(ok ? 0 : 1);

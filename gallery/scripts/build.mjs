import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('=== DesignPick Gallery Build ===\n');

console.log('[1/2] Syncing templates from GitHub...');
execSync('node scripts/sync-templates.mjs', { cwd: join(__dirname, '..'), stdio: 'inherit' });

console.log('\n[2/2] Generating index...');
execSync('node scripts/generate-index.mjs', { cwd: join(__dirname, '..'), stdio: 'inherit' });

console.log('\n=== Build complete ===');

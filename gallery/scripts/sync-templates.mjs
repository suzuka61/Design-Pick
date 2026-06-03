import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'public', 'templates');
const MD_BASE = 'https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md';

async function main() {
  const slugsData = JSON.parse(await readFile(join(__dirname, 'slugs.json'), 'utf-8'));
  const allSlugs = Object.values(slugsData.slugs).flat();

  await mkdir(TEMPLATES_DIR, { recursive: true });

  let fetched = 0;
  let skipped = 0;

  for (const slug of allSlugs) {
    try {
      const res = await fetch(`${MD_BASE}/${slug}/DESIGN.md`);
      if (res.ok) {
        await writeFile(join(TEMPLATES_DIR, `${slug}.md`), await res.text(), 'utf-8');
        fetched++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }

    process.stdout.write(`\r  ✓ ${fetched}/${allSlugs.length} fetched`);

    // Rate limit: 50ms between requests
    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n\nDone: ${fetched} fetched, ${skipped} skipped, ${allSlugs.length} total`);
}

main().catch(err => { console.error(err); process.exit(1); });

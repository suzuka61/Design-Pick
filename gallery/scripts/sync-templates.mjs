import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TEMPLATES_DIR = join(ROOT, 'public', 'templates');
const PREVIEWS_DIR = join(ROOT, 'public', 'previews');
const MD_BASE = 'https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md';
const PREVIEW_BASE = 'https://vibeui.top/design-md';

async function main() {
  const slugsData = JSON.parse(await readFile(join(__dirname, 'slugs.json'), 'utf-8'));
  const allSlugs = Object.values(slugsData.slugs).flat();

  await mkdir(TEMPLATES_DIR, { recursive: true });
  await mkdir(PREVIEWS_DIR, { recursive: true });

  let mdFetched = 0, mdSkipped = 0;
  let pvFetched = 0, pvSkipped = 0;

  for (const slug of allSlugs) {
    // Fetch DESIGN.md
    try {
      const res = await fetch(`${MD_BASE}/${slug}/DESIGN.md`);
      if (res.ok) {
        await writeFile(join(TEMPLATES_DIR, `${slug}.md`), await res.text(), 'utf-8');
        mdFetched++;
      } else {
        mdSkipped++;
      }
    } catch { mdSkipped++; }

    // Fetch preview.html
    try {
      const res = await fetch(`${PREVIEW_BASE}/${slug}/preview.html`);
      if (res.ok) {
        const text = await res.text();
        if (text.length > 500) {
          await writeFile(join(PREVIEWS_DIR, `${slug}.html`), text, 'utf-8');
          pvFetched++;
        } else {
          pvSkipped++;
        }
      } else {
        pvSkipped++;
      }
    } catch { pvSkipped++; }

    process.stdout.write(`\r  ✓ md:${mdFetched} pv:${pvFetched} | ${slug}`);

    await new Promise(r => setTimeout(r, 50));
  }

  console.log(`\n\nDESIGN.md: ${mdFetched} fetched, ${mdSkipped} skipped`);
  console.log(`preview.html: ${pvFetched} fetched, ${pvSkipped} skipped`);
  console.log(`Total slugs: ${allSlugs.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });

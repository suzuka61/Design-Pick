import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PREVIEWS_DIR = join(ROOT, 'public', 'previews');

const VIBEUI_BASE = 'https://vibeui.top/design-md';
const CONCURRENCY = 6;

async function fetchOne(slug) {
  const url = `${VIBEUI_BASE}/${slug}/preview.html`;
  try {
    const res = await fetch(url);
    if (!res.ok) return { slug, ok: false, status: res.status };
    const text = await res.text();
    if (text.length < 200) return { slug, ok: false, status: 'too-small' };
    await writeFile(join(PREVIEWS_DIR, `${slug}.html`), text, 'utf-8');
    return { slug, ok: true, size: text.length };
  } catch (e) {
    return { slug, ok: false, err: e.message };
  }
}

async function main() {
  await mkdir(PREVIEWS_DIR, { recursive: true });

  const slugsData = JSON.parse(
    await readFile(join(__dirname, 'slugs.json'), 'utf-8')
  );
  const slugs = Object.values(slugsData.slugs).flat();

  console.log(`Fetching ${slugs.length} preview files from vibeui.top...`);

  let i = 0;
  let ok = 0, fail = 0;
  const queue = [...slugs];

  async function worker() {
    while (queue.length) {
      const slug = queue.shift();
      const r = await fetchOne(slug);
      if (r.ok) {
        ok++;
        process.stdout.write(`\r  ✓ ${++i}/${slugs.length}  ${slug.padEnd(20)} ${(r.size/1024).toFixed(1)}KB`);
      } else {
        fail++;
        console.log(`\n  ✗ ${slug}: ${r.status || r.err}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(`\n\nDone: ${ok} fetched, ${fail} failed, ${slugs.length} total`);
}

main().catch(err => { console.error(err); process.exit(1); });

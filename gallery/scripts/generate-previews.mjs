import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DATA_DIR = join(ROOT, 'public', 'data');
const PREVIEWS_DIR = join(ROOT, 'public', 'previews');

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Pick the typography entry with the largest fontSize — that's the "display" voice.
function pickDisplay(typography) {
  if (!typography) return null;
  let best = null, bestSize = 0;
  for (const props of Object.values(typography)) {
    if (!props || !props.fontFamily) continue;
    const size = parseInt(props.fontSize) || 0;
    if (size > bestSize) { bestSize = size; best = props; }
  }
  return best;
}

// Pick the first typography entry — used as the "body" voice.
function pickBody(typography) {
  if (!typography) return null;
  for (const props of Object.values(typography)) {
    if (props && props.fontFamily) return props;
  }
  return null;
}

// Pick a button radius: prefer rounded.lg, fall back gracefully.
function pickRadius(rounded) {
  if (!rounded) return '8px';
  return rounded.lg || rounded.xl || rounded.md || rounded.sm || '8px';
}

function monogram(name) {
  if (!name) return 'D';
  const words = name.replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function generatePreviewHTML(d) {
  // Hero design tokens pulled from this template's own DESIGN.md
  const display = pickDisplay(d.typography);
  const body = pickBody(d.typography);
  const radius = pickRadius(d.rounded);
  const colors = d.colors || {};
  const primary = d.primaryColor || '#0066cc';
  const ink = d.inkColor || '#1a1a1c';
  const body2 = colors.body || ink;
  const muted = colors.muted || colors['muted-soft'] || '#6a6a6a';
  const canvas = colors.canvas || colors['surface-soft'] || colors.parchment || '#fafafa';
  const surface = colors['surface-card'] || colors.surface || '#fff';
  const border = colors['hairline'] || colors.border || colors['border-subtle'] || '#e0e0e0';
  const onPrimary = colors['on-primary'] || colors['on-dark'] || '#fff';
  const displayFont = display ? esc(display.fontFamily) : 'system-ui, -apple-system, sans-serif';
  const displaySize = (display && display.fontSize) ? esc(display.fontSize) : '56px';
  const displayWeight = (display && display.fontWeight) ? display.fontWeight : 700;
  const displayLH = (display && display.lineHeight) ? display.lineHeight : 1.07;
  const displayLS = (display && display.letterSpacing !== undefined) ? esc(String(display.letterSpacing)) : '-0.02em';
  const bodyFont = body ? esc(body.fontFamily) : 'system-ui, -apple-system, sans-serif';
  const bodySize = (body && body.fontSize) ? esc(body.fontSize) : '17px';
  const bodyWeight = (body && body.fontWeight) ? body.fontWeight : 400;

  // Color swatches (limit to 8 most relevant)
  const swatchEntries = Object.entries(colors).filter(([, v]) => typeof v === 'string' && v.startsWith('#')).slice(0, 12);
  let swatchHTML = '';
  for (const [name, value] of swatchEntries) {
    const needsBorder = value.toLowerCase() === '#ffffff' || value.toLowerCase() === '#fff';
    swatchHTML += `<div class="swatch"><div class="swatch-fill"${needsBorder ? ' data-light="1"' : ''} style="background:${value}"></div><div class="swatch-info"><div class="swatch-name">${esc(name)}</div><div class="swatch-hex">${value}</div></div></div>`;
  }

  // Typography samples: pick 3 representative entries
  const typoEntries = Object.entries(d.typography || {}).filter(([, p]) => p && p.fontFamily).slice(0, 4);
  let typoHTML = '';
  for (const [name, p] of typoEntries) {
    const size = parseInt(p.fontSize) || 16;
    const clampedSize = Math.min(Math.max(size, 14), 56);
    typoHTML += `<div class="type-row"><div class="type-sample" style="font-family:${esc(p.fontFamily)};font-size:${clampedSize}px;font-weight:${p.fontWeight || 400};line-height:${p.lineHeight || 1.4}">${esc(name)} · ${esc(d.name)}</div><div class="type-meta">${esc((p.fontFamily.split(',')[0] || '').replace(/'/g, '').trim())} · ${p.fontSize || ''} · ${p.fontWeight || 400}</div></div>`;
  }

  // Component buttons
  const compBtnPrimary = `<button class="btn btn-primary" style="background:${primary};color:${onPrimary};border-radius:${radius}">Primary action</button>`;
  const compBtnOutline = `<button class="btn btn-outline" style="color:${ink};border:1px solid ${border};border-radius:${radius}">Secondary</button>`;
  const compBtnGhost = `<button class="btn btn-ghost" style="color:${primary};border-radius:${radius}">Learn more →</button>`;
  const sampleCard = `<div class="card-sample" style="background:${surface};border:1px solid ${border};border-radius:${radius};padding:20px"><div class="card-sample-title" style="font-family:${bodyFont};color:${ink}">Sample card</div><div class="card-sample-desc" style="font-family:${bodyFont};color:${muted}">A short description that uses the body typeface and muted color from the design system.</div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(d.name)} Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--primary:${primary};--ink:${ink};--body:${body2};--muted:${muted};--canvas:${canvas};--surface:${surface};--border:${border};--on-primary:${onPrimary};--radius:${radius};--font-d:${displayFont};--font-b:${bodyFont}}
*{margin:0;padding:0;box-sizing:border-box}
html,body{background:var(--canvas);color:var(--ink);font-family:var(--font-b);font-size:${bodySize};font-weight:${bodyWeight};line-height:1.5;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}

/* NAV */
.nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:14px 40px;background:rgba(255,255,255,0.85);backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--border)}
.nav-brand{font-family:var(--font-d);font-size:20px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:10px}
.nav-brand .logo-mark{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:var(--primary);color:var(--on-primary);border-radius:${radius};font-family:var(--font-d);font-size:15px;font-weight:600}
.nav-links{display:flex;gap:28px;align-items:center}
.nav-links a{color:var(--muted);font-size:14px;font-weight:500}
.nav-cta{background:var(--primary);color:var(--on-primary);border:none;padding:8px 18px;border-radius:${radius};font-family:var(--font-b);font-size:14px;font-weight:500;cursor:pointer}

/* HERO */
.hero{padding:96px 40px 80px;text-align:center;background:linear-gradient(180deg,var(--canvas),var(--surface))}
.hero h1{font-family:var(--font-d);font-size:${displaySize};font-weight:${displayWeight};line-height:${displayLH};letter-spacing:${displayLS};color:var(--ink);margin-bottom:16px}
.hero h1 em{font-style:normal;color:var(--primary)}
.hero p{font-family:var(--font-b);font-size:19px;font-weight:400;line-height:1.5;color:var(--muted);max-width:600px;margin:0 auto 28px}
.hero-buttons{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.hero-buttons .btn{padding:12px 24px;font-size:15px}

/* SECTION */
.section{padding:64px 40px;max-width:1100px;margin:0 auto;border-top:1px solid var(--border)}
.section-label{font-family:var(--font-b);font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--primary);margin-bottom:8px}
.section-title{font-family:var(--font-d);font-size:32px;font-weight:600;line-height:1.2;color:var(--ink);margin-bottom:8px;letter-spacing:-0.01em}
.section-desc{font-family:var(--font-b);font-size:16px;color:var(--muted);max-width:600px;margin-bottom:32px}

/* COLORS */
.color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.swatch{border:1px solid var(--border);border-radius:${radius};overflow:hidden;background:var(--surface)}
.swatch-fill{height:64px}
.swatch-fill[data-light="1"]{border-bottom:1px solid var(--border)}
.swatch-info{padding:8px 10px}
.swatch-name{font-size:11px;font-weight:500;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.swatch-hex{font-size:10px;color:var(--muted);font-family:ui-monospace,Menlo,monospace}

/* TYPOGRAPHY */
.type-row{margin-bottom:24px;padding-bottom:24px;border-bottom:1px solid var(--border)}
.type-row:last-child{border-bottom:none}
.type-sample{margin-bottom:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.type-meta{font-size:11px;color:var(--muted);font-family:ui-monospace,Menlo,monospace}

/* COMPONENTS */
.btn{padding:10px 20px;font-family:var(--font-b);font-size:14px;font-weight:500;cursor:pointer;display:inline-block;border:none;transition:opacity 140ms ease}
.btn:hover{opacity:0.85}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:24px}
.card-sample-title{font-family:var(--font-d);font-size:18px;font-weight:600;margin-bottom:6px}
.card-sample-desc{font-size:14px;line-height:1.5}

/* FOOTER */
.footer{padding:32px 40px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--muted);font-family:ui-monospace,Menlo,monospace}
</style>
</head>
<body>

<nav class="nav">
  <div class="nav-brand"><span class="logo-mark">${esc(monogram(d.name))}</span>${esc(d.name)}</div>
  <div class="nav-links">
    <a>Products</a><a>Solutions</a><a>Pricing</a><a>Docs</a>
  </div>
  <button class="nav-cta">Get started</button>
</nav>

<section class="hero">
  <h1>Design System<br><em>Inspired by ${esc(d.name)}</em></h1>
  <p>${esc(d.description || 'A faithful, reusable design system capturing the visual language of ' + d.name + '.')}</p>
  <div class="hero-buttons">
    ${compBtnPrimary}
    ${compBtnOutline}
  </div>
</section>

<section class="section">
  <div class="section-label">01 / Color</div>
  <div class="section-title">Color palette</div>
  <div class="section-desc">The signature hues that define ${esc(d.name)}'s visual identity.</div>
  <div class="color-grid">${swatchHTML}</div>
</section>

<section class="section">
  <div class="section-label">02 / Typography</div>
  <div class="section-title">Type scale</div>
  <div class="section-desc">The font families and weights used across the system.</div>
  ${typoHTML}
</section>

<section class="section">
  <div class="section-label">03 / Components</div>
  <div class="section-title">Buttons &amp; cards</div>
  <div class="section-desc">Core building blocks rendered with this template's design tokens.</div>
  <div class="btn-row">
    ${compBtnPrimary}
    ${compBtnOutline}
    ${compBtnGhost}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-top:8px">
    ${sampleCard}
    ${sampleCard}
  </div>
</section>

<footer class="footer">
  <span>${esc(d.name)} Design System · /${esc(d.slug)}</span>
  <span>Source: VoltAgent/awesome-design-md</span>
</footer>

</body>
</html>`;
}

// Slugs whose previews we have a hand-curated copy of (formerly fetched from
// vibeui.top). generate-previews.mjs will skip these to avoid overwriting the
// curated files with its simpler template.
const CURATED_SLUGS = new Set([
  'airbnb', 'airtable', 'apple', 'bmw', 'cal', 'claude', 'clay', 'clickhouse',
  'cohere', 'coinbase', 'composio', 'cursor', 'elevenlabs', 'expo', 'figma',
  'framer', 'hashicorp', 'ibm', 'intercom', 'kraken', 'linear.app', 'lovable',
  'minimax', 'mintlify', 'miro', 'mistral.ai', 'mongodb', 'notion', 'nvidia',
  'ollama', 'opencode.ai', 'pinterest', 'posthog', 'raycast', 'replicate',
  'resend', 'revolut', 'runwayml', 'sanity', 'sentry', 'spacex', 'spotify',
  'stripe', 'supabase', 'superhuman', 'together.ai', 'uber', 'vercel',
  'voltagent', 'warp', 'webflow', 'wise', 'x.ai', 'zapier',
]);

async function main() {
  await mkdir(PREVIEWS_DIR, { recursive: true });

  const files = await readdir(DATA_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'templates.json');

  let count = 0;
  for (const file of jsonFiles) {
    const slug = file.replace('.json', '');
    if (CURATED_SLUGS.has(slug)) continue; // keep the curated preview as-is
    const content = await readFile(join(DATA_DIR, file), 'utf-8');
    const data = JSON.parse(content);
    const html = generatePreviewHTML(data);
    await writeFile(join(PREVIEWS_DIR, `${slug}.html`), html, 'utf-8');
    count++;
  }

  // Update templates.json hasPreview flags now that previews exist
  const indexPath = join(DATA_DIR, 'templates.json');
  try {
    const indexRaw = await readFile(indexPath, 'utf-8');
    const index = JSON.parse(indexRaw);
    const slugsWithPreview = new Set(jsonFiles); // they all have previews if they got generated
    let updated = 0;
    for (const t of index.templates) {
      const want = slugsWithPreview.has(t.slug + '.json');
      if (t.hasPreview !== want) {
        t.hasPreview = want;
        updated++;
      }
    }
    if (updated) {
      await writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
      console.log(`Updated hasPreview for ${updated} templates`);
    }
  } catch (e) {
    console.warn('Could not update templates.json:', e.message);
  }

  console.log(`Generated ${count} preview.html files`);
}

main().catch(err => { console.error(err); process.exit(1); });

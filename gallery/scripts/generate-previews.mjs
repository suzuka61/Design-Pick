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

function generatePreviewHTML(d) {
  // Color swatches from JSON
  let colorsHTML = '';
  if (d.colors && Object.keys(d.colors).length) {
    colorsHTML = '<div class="section"><h2>色彩体系</h2><div class="color-grid">';
    for (const [name, value] of Object.entries(d.colors)) {
      if (typeof value === 'string' && value.startsWith('#')) {
        const needsBorder = value.toLowerCase() === '#ffffff' || value.toLowerCase() === '#fff';
        colorsHTML += `<div class="swatch"><div class="swatch-fill" style="background:${value}${needsBorder ? ';border-bottom:1px solid #ddd' : ''}"></div><div class="swatch-info"><div class="swatch-name">${esc(name)}</div><div class="swatch-hex">${value}</div></div></div>`;
      }
    }
    colorsHTML += '</div></div>';
  }

  // Typography from JSON
  let typoHTML = '';
  if (d.typography && Object.keys(d.typography).length) {
    typoHTML = '<div class="section"><h2>排版规范</h2>';
    for (const [name, props] of Object.entries(d.typography)) {
      if (props && props.fontFamily) {
        const size = parseInt(props.fontSize) || 16;
        const weight = props.fontWeight || 400;
        const font = props.fontFamily.split(',')[0].replace(/'/g, '').trim();
        typoHTML += `<div class="type-row"><div class="type-sample" style="font-family:${esc(props.fontFamily)};font-size:${Math.min(size, 36)}px;font-weight:${weight}">${esc(name)}</div><div class="type-meta">${esc(font)} ${props.fontSize || ''} / ${weight}</div></div>`;
      }
    }
    typoHTML += '</div>';
  }

  // Spacing from JSON
  let spacingHTML = '';
  if (d.spacing && Object.keys(d.spacing).length) {
    spacingHTML = '<div class="section"><h2>间距</h2><div class="spacing-row">';
    for (const [name, value] of Object.entries(d.spacing)) {
      const px = typeof value === 'string' ? value : `${value}px`;
      const num = parseInt(px) || 4;
      spacingHTML += `<div class="spacing-item"><div class="spacing-bar" style="width:${Math.min(num * 3, 120)}px"></div><div class="spacing-label">${esc(name)} ${px}</div></div>`;
    }
    spacingHTML += '</div></div>';
  }

  // Rounded from JSON
  let roundedHTML = '';
  if (d.rounded && Object.keys(d.rounded).length) {
    roundedHTML = '<div class="section"><h2>圆角</h2><div class="radius-row">';
    for (const [name, value] of Object.entries(d.rounded)) {
      const px = typeof value === 'string' ? value : `${value}px`;
      roundedHTML += `<div class="radius-item"><div class="radius-box" style="border-radius:${px}"></div><div class="radius-label">${esc(name)} ${px}</div></div>`;
    }
    roundedHTML += '</div></div>';
  }

  // Components from JSON
  let compHTML = '';
  if (d.components && Object.keys(d.components).length) {
    compHTML = '<div class="section"><h2>组件</h2><div class="comp-grid">';
    for (const [name, props] of Object.entries(d.components)) {
      if (typeof props !== 'object') continue;
      compHTML += `<div class="comp-card"><div class="comp-name">${esc(name)}</div><div class="comp-props">`;
      for (const [key, val] of Object.entries(props)) {
        compHTML += `<div class="comp-prop"><span class="comp-key">${esc(key)}</span><span class="comp-val">${esc(String(val))}</span></div>`;
      }
      compHTML += '</div></div>';
    }
    compHTML += '</div></div>';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(d.name)} Design System</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Onest:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f6f7;--surface:#fff;--ink:#1a1a1c;--ink2:#5c5c60;--ink3:#8c8c91;--border:#dddde0;--radius:6px;--font-d:'Bricolage Grotesque',sans-serif;--font-b:'Onest',sans-serif;--font-m:'JetBrains Mono',monospace}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--ink);font-family:var(--font-b);font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}

.hero{padding:48px 32px 32px;text-align:center;background:linear-gradient(135deg,${d.primaryColor}0a,${d.inkColor}05)}
.hero h1{font-family:var(--font-d);font-size:32px;font-weight:700;letter-spacing:-0.02em;margin-bottom:4px}
.hero .slug{font-family:var(--font-m);font-size:12px;color:var(--ink3);margin-bottom:8px}
.hero .desc{font-size:13px;color:var(--ink2);max-width:520px;margin:0 auto;line-height:1.7}

.section{padding:24px 32px;max-width:960px;margin:0 auto}
.section h2{font-family:var(--font-m);font-size:11px;font-weight:500;letter-spacing:0.5px;color:var(--ink3);text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid var(--border)}

.color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px}
.swatch{border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;background:var(--surface)}
.swatch-fill{height:48px}
.swatch-info{padding:5px 8px}
.swatch-name{font-size:10px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.swatch-hex{font-family:var(--font-m);font-size:10px;color:var(--ink3)}

.type-row{margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.type-row:last-child{border-bottom:none}
.type-sample{margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.type-meta{font-family:var(--font-m);font-size:11px;color:var(--ink3)}

.spacing-row{display:flex;gap:12px;flex-wrap:wrap}
.spacing-item{text-align:center}
.spacing-bar{background:var(--ink);opacity:0.15;height:24px;border-radius:3px;margin-bottom:4px}
.spacing-label{font-family:var(--font-m);font-size:10px;color:var(--ink3)}

.radius-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
.radius-item{text-align:center}
.radius-box{width:56px;height:56px;background:var(--surface);border:1px solid var(--border);margin-bottom:4px}
.radius-label{font-family:var(--font-m);font-size:10px;color:var(--ink3)}

.comp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.comp-card{border:1px solid var(--border);border-radius:var(--radius);padding:12px;background:var(--surface)}
.comp-name{font-family:var(--font-m);font-size:11px;font-weight:500;color:var(--ink);margin-bottom:6px}
.comp-props{font-size:10px;color:var(--ink3)}
.comp-prop{margin-bottom:2px}
.comp-key{font-weight:500;color:var(--ink2)}
.comp-val{font-family:var(--font-m);margin-left:4px}
</style>
</head>
<body>
<div class="hero">
  <h1>${esc(d.name)}</h1>
  <div class="slug">/${esc(d.slug)}</div>
  ${d.description ? `<p class="desc">${esc(d.description)}</p>` : ''}
</div>

${colorsHTML}
${typoHTML}
${spacingHTML}
${roundedHTML}
${compHTML}

</body>
</html>`;
}

async function main() {
  await mkdir(PREVIEWS_DIR, { recursive: true });

  const files = await readdir(DATA_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'templates.json');

  let count = 0;
  for (const file of jsonFiles) {
    const slug = file.replace('.json', '');
    const content = await readFile(join(DATA_DIR, file), 'utf-8');
    const data = JSON.parse(content);
    const html = generatePreviewHTML(data);
    await writeFile(join(PREVIEWS_DIR, `${slug}.html`), html, 'utf-8');
    count++;
  }

  console.log(`Generated ${count} preview.html files`);
}

main().catch(err => { console.error(err); process.exit(1); });

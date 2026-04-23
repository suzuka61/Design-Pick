import type { DesignMDDocument } from '../types/design-md.js';

// --- Data extraction from markdown sections ---

interface ColorEntry { name: string; hex: string; role: string }

function extractColors(md: string): { groups: { label: string; colors: ColorEntry[] }[] } {
  const groups: { label: string; colors: ColorEntry[] }[] = [];
  let currentLabel = '';
  const lines = md.split('\n');

  for (const line of lines) {
    if (line.startsWith('### ')) {
      currentLabel = line.replace(/^### /, '').trim();
      continue;
    }
    // Match lines like: - **Near Black** (`#1c1c1e`): Primary text
    // or: - **Blue 450** (`#5b76fe`), `--tw-color-blue-450`: primary interactive
    const match = line.match(/^- \*\*(.+?)\*\* \(`(.+?)`\)[:\s,]*(.+)/);
    if (match) {
      const hex = match[2];
      // Only add real hex colors (skip rgb, var references)
      if (hex.startsWith('#') || hex.startsWith('rgb')) {
        const role = match[3].replace(/`[^`]+`/g, '').replace(/[,;]/g, '').trim();
        if (!currentLabel) currentLabel = 'Colors';
        let group = groups.find(g => g.label === currentLabel);
        if (!group) { group = { label: currentLabel, colors: [] }; groups.push(group); }
        group.colors.push({ name: match[1], hex, role });
      }
    }
  }

  if (groups.length === 0) groups.push({ label: 'Colors', colors: [] });
  return { groups };
}

interface TypeEntry { role: string; font: string; size: string; weight: string; lineHeight: string; letterSpacing: string }

function extractTypography(md: string): TypeEntry[] {
  const entries: TypeEntry[] = [];
  const lines = md.split('\n');

  // Find table rows after | Role | ... | header
  let inTable = false;
  for (const line of lines) {
    if (line.match(/^\| Role/i)) { inTable = true; continue; }
    if (inTable && line.match(/^\|[\s-:]+\|/)) continue; // separator
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.length >= 4) {
        entries.push({
          role: cells[0],
          font: cells[1] || '',
          size: cells[2] || '',
          weight: cells[3] || '',
          lineHeight: cells[4] || '',
          letterSpacing: cells[5] || '',
        });
      }
    }
    if (inTable && !line.startsWith('|')) { inTable = false; }
  }
  return entries;
}

function extractSpacing(md: string): number[] {
  const values: number[] = [];
  // Look for spacing scale table rows or inline px values
  const pxMatches = md.matchAll(/\b(\d+)px\b/g);
  for (const m of pxMatches) {
    const v = parseInt(m[1]);
    if (v > 0 && v <= 100 && !values.includes(v)) values.push(v);
  }
  return values.sort((a, b) => a - b);
}

function extractRadius(md: string): number[] {
  const values: number[] = [];
  const pxMatches = md.matchAll(/border-radius[:\s]*(\d+)px/gi);
  for (const m of pxMatches) {
    const v = parseInt(m[1]);
    if (!values.includes(v)) values.push(v);
  }
  // Also match from radius scale descriptions
  const radiusDesc = md.matchAll(/(\d+)px\s*(?:radius|border-radius|rounded)/gi);
  for (const m of radiusDesc) {
    const v = parseInt(m[1]);
    if (!values.includes(v)) values.push(v);
  }
  // Fallback: look for numbers near "radius" in table content
  if (values.length === 0) {
    const genericPx = md.matchAll(/(\d+)px/g);
    const candidates = [...genericPx].map(m => parseInt(m[1])).filter(v => v >= 4 && v <= 50);
    for (const v of candidates) { if (!values.includes(v)) values.push(v); }
  }
  // Check for pill/circle radius (9999px or 50%)
  if (md.includes('9999px') || md.includes('pill') || md.includes('50%')) values.push(9999);
  return values.sort((a, b) => a - b);
}

function extractShadowLevels(md: string): { name: string; shadow: string; usage: string }[] {
  const levels: { name: string; shadow: string; usage: string }[] = [];

  // Try parsing markdown table rows first (e.g. | Level 0 | Flat | rgba(...) | Form |)
  const lines = md.split('\n');
  let inTable = false;
  for (const line of lines) {
    if (line.match(/^\| Level/i) || line.match(/^\|.*\|.*\|.*\|/)) { inTable = true; continue; }
    if (inTable && line.match(/^\|[\s-:]+\|/)) continue; // separator
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.length >= 3) {
        const levelName = cells[0];
        const name = cells[1];
        const shadowVal = cells[2].replace(/`/g, '');
        const usage = cells[3] || '';
        // Validate that this looks like a CSS box-shadow value
        if (shadowVal.match(/\d+px/) && (shadowVal.includes('rgba') || shadowVal.includes('rgb') || shadowVal.includes('#'))) {
          levels.push({ name: `${levelName} — ${name}`, shadow: shadowVal, usage });
        }
      }
    }
    if (inTable && !line.startsWith('|')) { inTable = false; }
  }

  // Fallback: regex match box-shadow values
  if (levels.length === 0) {
    const shadowMatches = md.matchAll(/\b(?:box-shadow|shadow)[:\s]*([^;\n]+)/gi);
    for (const m of shadowMatches) {
      const val = m[1].trim();
      // Skip values that contain markdown artifacts
      if (val.includes('|') || val.length > 200) continue;
      levels.push({ name: '', shadow: val, usage: '' });
    }
  }
  return levels;
}

// --- Rendering ---

function renderColorSwatches(colors: { groups: { label: string; colors: ColorEntry[] }[] }): string {
  return colors.groups.map(g => `
    <div class="color-group-label">${g.label}</div>
    <div class="color-grid">
      ${g.colors.map(c => {
        const bgStyle = c.hex.startsWith('rgb') ? c.hex : c.hex;
        const needsBorder = c.hex.toLowerCase() === '#ffffff' || c.hex.toLowerCase() === '#fff' || c.hex.includes('0.0') || c.hex.includes('0.03') || c.hex.includes('0.04');
        return `<div class="color-swatch"><div class="color-swatch-block" style="background:${bgStyle}${needsBorder ? ';border-bottom:1px solid #eceae4' : ''}"></div><div class="color-swatch-info"><div class="color-swatch-name">${c.name}</div><div class="color-swatch-hex">${c.hex}</div>${c.role ? `<div class="color-swatch-role">${c.role}</div>` : ''}</div></div>`;
      }).join('\n')}
    </div>
  `).join('\n');
}

function renderTypeScale(entries: TypeEntry[]): string {
  if (entries.length === 0) return '';
  return entries.map(e => {
    const sizeNum = parseInt(e.size) || 16;
    const weightNum = parseInt(e.weight) || 400;
    const lh = e.lineHeight || '1.5';
    const ls = e.letterSpacing || '0';
    const lsUnit = ls === '0' ? '' : (ls.endsWith('em') || ls.endsWith('px') ? '' : 'em');
    const sampleText = e.role || 'Sample text';
    return `<div class="type-sample"><div style="font-size:${sizeNum}px;font-weight:${weightNum};line-height:${lh};letter-spacing:${ls}${lsUnit}">${sampleText}</div><div class="type-meta">${e.font} — ${sizeNum}px / ${weightNum} / ${lh} / ${ls}</div></div>`;
  }).join('\n');
}

function renderSpacingBars(values: number[]): string {
  if (values.length === 0) return '';
  return `<div class="spacing-row">${values.map(v =>
    `<div class="spacing-item"><div class="spacing-block" style="width:${v}px;min-width:1px"></div><div class="spacing-value">${v}px</div></div>`
  ).join('\n')}</div>`;
}

function renderRadiusBoxes(values: number[]): string {
  if (values.length === 0) return '';
  return `<div class="radius-row">${values.map(v =>
    `<div class="radius-item"><div class="radius-box" style="border-radius:${v === 9999 ? '9999px' : v + 'px'}"></div><div class="radius-label">${v === 9999 ? '∞' : v + 'px'}</div></div>`
  ).join('\n')}</div>`;
}

function renderElevationCards(levels: { name: string; shadow: string; usage: string }[]): string {
  if (levels.length === 0) return '<div class="elevation-grid"><div class="elevation-card" style="box-shadow:rgb(224,226,232) 0px 0px 0px 1px"><div class="elevation-label">Flat</div><div class="elevation-desc">Ring border</div></div></div>';
  return `<div class="elevation-grid">${levels.map(l =>
    `<div class="elevation-card" style="box-shadow:${l.shadow}"><div class="elevation-label">${l.name || 'Shadow'}</div><div class="elevation-desc">${l.shadow}</div></div>`
  ).join('\n')}</div>`;
}

export function renderPreviewHTML(doc: DesignMDDocument): string {
  const sourceName = doc.sourceUrl
    ? (() => { try { return new URL(doc.sourceUrl).hostname; } catch { return doc.sourceUrl; } })()
    : 'Design System';

  // Extract visual data from markdown
  const colors = extractColors(doc.sections.colorPalette);
  const typography = extractTypography(doc.sections.typography);
  const spacing = extractSpacing(doc.sections.layoutPrinciples);
  const radius = extractRadius(doc.sections.layoutPrinciples);
  const shadows = extractShadowLevels(doc.sections.depthAndElevation);

  // Build nav links
  const navItems = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'spacing', label: 'Spacing' },
    { id: 'radius', label: 'Radius' },
    { id: 'elevation', label: 'Elevation' },
    { id: 'dos-donts', label: 'Do\'s & Don\'ts' },
    { id: 'responsive', label: 'Responsive' },
  ];
  const navLinks = navItems.map(n =>
    `<li><a href="#${n.id}" onclick="event.preventDefault();document.getElementById('${n.id}').scrollIntoView({behavior:'smooth',block:'start'})">${n.label}</a></li>`
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Design System Preview${doc.sourceUrl ? ` — ${sourceName}` : ''}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --white:#fff; --black:#1a1a2e; --accent:#5b76fe; --accent-pressed:#2a41b6;
    --slate:#555a6a; --placeholder:#a5a8b5; --border:#c7cad5; --ring:rgb(224,226,232);
    --surface:#f8f9fa; --code-bg:#f1f5f9;
    --font:'Inter',ui-sans-serif,system-ui,sans-serif;
    --font-body:'Noto Sans','Inter',sans-serif;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--white);color:var(--black);font-family:var(--font);font-size:16px;line-height:1.50;-webkit-font-smoothing:antialiased}

  .nav{position:sticky;top:0;z-index:100;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:12px 24px;background:var(--white);box-shadow:var(--ring) 0px 0px 0px 1px}
  .nav-brand{font-size:16px;font-weight:600;color:var(--black);text-decoration:none}
  .nav-brand span{color:var(--accent)}
  .nav-links{display:flex;gap:20px;list-style:none;justify-self:center}
  .nav-links a{font-size:13px;color:var(--slate);text-decoration:none;transition:color 150ms ease}
  .nav-links a:hover{color:var(--accent)}
  .nav-cta{display:inline-block;background:var(--accent);color:var(--white);padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;justify-self:end}

  .hero{padding:80px 24px 64px;text-align:center}
  .hero h1{font-size:48px;font-weight:600;line-height:1.15;letter-spacing:-1.44px;margin-bottom:16px}
  .hero h1 .accent{color:var(--accent)}
  .hero p{font-family:var(--font-body);font-size:18px;color:var(--slate);max-width:520px;margin:0 auto;line-height:1.6}
  .hero-meta{font-size:12px;color:var(--placeholder);margin-top:12px;font-family:monospace}

  .section{padding:64px 32px;max-width:1200px;margin:0 auto}
  .section-label{font-size:12px;font-weight:500;color:var(--slate);text-transform:uppercase;margin-bottom:8px;letter-spacing:0.5px}
  .section-title{font-size:36px;font-weight:600;line-height:1.10;letter-spacing:-0.9px;margin-bottom:32px}
  .section-divider{border:none;border-top:1px solid var(--ring);margin:0}

  /* Color swatches */
  .color-group-label{font-size:14px;font-weight:600;color:var(--slate);margin:24px 0 10px}
  .color-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-bottom:24px}
  .color-swatch{border-radius:12px;overflow:hidden;border:1px solid var(--ring)}
  .color-swatch-block{height:72px;width:100%}
  .color-swatch-info{padding:10px 12px}
  .color-swatch-name{font-size:13px;font-weight:600;margin-bottom:2px}
  .color-swatch-hex{font-size:12px;color:var(--slate);font-family:ui-monospace,SFMono-Regular,monospace}
  .color-swatch-role{font-size:11px;color:var(--placeholder);margin-top:3px}

  /* Typography */
  .type-sample{margin-bottom:28px;padding-bottom:24px;border-bottom:1px solid var(--ring)}
  .type-sample:last-child{border-bottom:none}
  .type-meta{font-size:12px;font-weight:500;color:var(--slate);margin-top:8px;font-family:ui-monospace,SFMono-Regular,monospace}

  /* Spacing */
  .spacing-row{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:24px}
  .spacing-item{text-align:center}
  .spacing-block{background:var(--accent);border-radius:3px;margin-bottom:6px;height:28px;opacity:0.6}
  .spacing-value{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;font-weight:500;color:var(--slate)}

  /* Radius */
  .radius-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}
  .radius-item{text-align:center}
  .radius-box{width:64px;height:64px;background:var(--surface);border:1px solid var(--border);margin-bottom:6px}
  .radius-label{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;font-weight:500;color:var(--slate)}

  /* Elevation */
  .elevation-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
  .elevation-card{background:var(--white);border-radius:12px;padding:20px;text-align:center}
  .elevation-label{font-size:14px;font-weight:600;margin-bottom:4px}
  .elevation-desc{font-family:ui-monospace,SFMono-Regular,monospace;font-size:11px;color:var(--placeholder)}

  /* Content sections (text-only) */
  .content-block{font-size:14px;line-height:1.65;color:var(--slate);max-width:800px}
  .content-block h3{font-size:18px;font-weight:600;margin:24px 0 8px;color:var(--black)}
  .content-block p{margin-bottom:12px}
  .content-block ul,.content-block ol{margin:8px 0 16px 24px}
  .content-block li{margin-bottom:4px;line-height:1.6}
  .content-block code{background:var(--code-bg);padding:2px 6px;border-radius:4px;font-size:13px;font-family:ui-monospace,SFMono-Regular,monospace;color:var(--accent-pressed)}
  .content-block pre{background:var(--surface);padding:16px 20px;border-radius:8px;overflow-x:auto;margin:12px 0;font-size:13px;line-height:1.55;border:1px solid var(--ring)}
  .content-block pre code{background:none;padding:0;color:var(--black)}
  .content-block blockquote{border-left:3px solid var(--accent);padding:8px 16px;color:var(--slate);margin:12px 0;background:var(--surface);border-radius:0 6px 6px 0}
  .content-block strong{font-weight:600;color:var(--black)}

  .do-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .do-col,.dont-col{padding:20px;border-radius:12px}
  .do-col{background:#f0fdf4;border:1px solid #bbf7d0}
  .dont-col{background:#fef2f2;border:1px solid #fecaca}
  .do-col h4,.dont-col h4{font-size:14px;font-weight:600;margin-bottom:8px}
  .do-col h4{color:#166534}
  .dont-col h4{color:#991b1b}
  .do-col li,.dont-col li{font-size:13px;line-height:1.6;margin-bottom:4px}
  .do-col li{color:#15803d}
  .dont-col li{color:#b91c1c}

  .footer{padding:32px;text-align:center;border-top:1px solid var(--ring);font-size:13px;color:var(--placeholder)}
  .footer a{color:var(--accent);text-decoration:none}

  @media(max-width:768px){.hero h1{font-size:32px;letter-spacing:-0.96px}.nav-links{display:none}.section{padding:48px 20px}.do-grid{grid-template-columns:1fr}}
</style>
</head>
<body>

<nav class="nav">
  <a href="#" class="nav-brand" onclick="event.preventDefault();window.scrollTo({top:0,behavior:'smooth'})">Design<span>Pick</span></a>
  <ul class="nav-links">${navLinks}</ul>
  <a href="#" class="nav-cta" onclick="event.preventDefault()">Preview</a>
</nav>

<section class="hero">
  <h1>Design System<br>Inspired by <span class="accent">${sourceName}</span></h1>
  <p>Every color, font, and component — extracted and visualized.</p>
  ${doc.sourceUrl ? `<div class="hero-meta">Source: ${doc.sourceUrl} · ${new Date(doc.generatedAt).toLocaleDateString()}</div>` : ''}
</section>

<hr class="section-divider">

<!-- 01 Colors -->
<section class="section" id="colors">
  <div class="section-label">01 / Colors</div>
  <h2 class="section-title">Color Palette</h2>
  ${renderColorSwatches(colors)}
  ${colors.groups.every(g => g.colors.length === 0) ? `<div class="content-block">${markdownToHTML(doc.sections.colorPalette)}</div>` : ''}
</section>

<hr class="section-divider">

<!-- 02 Typography -->
<section class="section" id="typography">
  <div class="section-label">02 / Typography</div>
  <h2 class="section-title">Typography Scale</h2>
  ${renderTypeScale(typography)}
  ${typography.length === 0 ? `<div class="content-block">${markdownToHTML(doc.sections.typography)}</div>` : ''}
</section>

<hr class="section-divider">

<!-- 03 Buttons (from component section) -->
<section class="section" id="buttons">
  <div class="section-label">03 / Buttons</div>
  <h2 class="section-title">Button Variants</h2>
  ${renderButtonVariants(doc.sections.componentStylings)}
</section>

<hr class="section-divider">

<!-- 05 Spacing -->
<section class="section" id="spacing">
  <div class="section-label">05 / Spacing</div>
  <h2 class="section-title">Spacing Scale</h2>
  ${renderSpacingBars(spacing)}
  ${spacing.length === 0 ? `<div class="content-block">${markdownToHTML(doc.sections.layoutPrinciples)}</div>` : ''}
</section>

<hr class="section-divider">

<!-- Radius -->
<section class="section" id="radius">
  <div class="section-label">Border Radius</div>
  <h2 class="section-title">Radius Scale</h2>
  ${renderRadiusBoxes(radius)}
  ${radius.length === 0 ? `<div class="content-block">${markdownToHTML(doc.sections.layoutPrinciples)}</div>` : ''}
</section>

<hr class="section-divider">

<!-- 06 Elevation -->
<section class="section" id="elevation">
  <div class="section-label">06 / Elevation</div>
  <h2 class="section-title">Depth & Elevation</h2>
  ${renderElevationCards(shadows)}
  <div class="content-block" style="margin-top:24px">${markdownToHTML(doc.sections.depthAndElevation)}</div>
</section>

<hr class="section-divider">

<!-- 07 Do's & Don'ts -->
<section class="section" id="dos-donts">
  <div class="section-label">07 / Guidelines</div>
  <h2 class="section-title">Do's and Don'ts</h2>
  ${renderDosDonts(doc.sections.dosAndDonts)}
</section>

<hr class="section-divider">

<!-- 08 Responsive -->
<section class="section" id="responsive">
  <div class="section-label">08 / Responsive</div>
  <h2 class="section-title">Responsive Behavior</h2>
  <div class="content-block">${markdownToHTML(doc.sections.responsiveBehavior)}</div>
</section>

<footer class="footer">Generated by DesignPick · ${new Date(doc.generatedAt).toLocaleDateString()}</footer>

<script>
  const navLinks = document.querySelectorAll('.nav-links a');
  const sectionEls = document.querySelectorAll('.section');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          const active = link.getAttribute('href') === '#' + entry.target.id;
          link.style.color = active ? 'var(--accent)' : '';
          link.style.fontWeight = active ? '600' : '';
        });
      }
    });
  }, {rootMargin:'-20% 0px -60% 0px'});
  sectionEls.forEach(s => observer.observe(s));
</script>
</body></html>`;
}

// --- Button rendering from markdown ---
function renderButtonVariants(md: string): string {
  const buttons: { label: string; bg: string; textColor: string; border: string; radius: string; padding: string; fontWeight: string; fontSize: string; text: string }[] = [];

  // Extract button descriptions from markdown
  const lines = md.split('\n');
  for (const line of lines) {
    if (line.match(/^### Buttons/i) || line.match(/^### Button/i)) continue;
    // Match: - **Outlined**: transparent bg, `1px solid #c7cad5`, 8px radius, 7px 12px padding
    // or: - **Secondary**: background `rgb(253, 224, 80)`, text `rgb(28, 28, 30)`, border-radius `8px`
    const m = line.match(/^- \*\*(.+?)\*\*:\s*(.+)/);
    if (m) {
      const desc = m[2];
      const bg = desc.match(/background\s*`(.+?)`/)?.[1] || desc.match(/bg\s*`(.+?)`/)?.[1] || 'transparent';
      const textColor = desc.match(/text\s*`(.+?)`/)?.[1] || desc.match(/color\s*`(.+?)`/)?.[1] || '#1a1a2e';
      const border = desc.match(/border\s*`(.+?)`/)?.[1] || desc.match(/`1px solid (.+?)`/)?.[1] || '';
      const radius = desc.match(/border-radius\s*`(.+?)`/)?.[1] || desc.match(/radius\s*`(.+?)`/)?.[1] || '8px';
      const padding = desc.match(/padding\s*`(.+?)`/)?.[1] || '10px 20px';
      const fontWeight = desc.match(/weight\s*(\d+)/)?.[1] || desc.match(/font-weight\s*`(.+?)`/)?.[1] || '500';
      const fontSize = desc.match(/font-size\s*`(.+?)`/)?.[1] || '14px';
      const text = m[1];
      buttons.push({ label: text, bg, textColor, border, radius, padding, fontWeight, fontSize, text });
    }
  }

  if (buttons.length === 0) {
    // Fallback: show generic buttons
    buttons.push(
      { label: 'Primary', bg: '#5b76fe', textColor: '#ffffff', border: '', radius: '8px', padding: '10px 20px', fontWeight: '600', fontSize: '14px', text: 'Primary' },
      { label: 'Outlined', bg: 'transparent', textColor: '#1a1a2e', border: '1px solid #c7cad5', radius: '8px', padding: '10px 20px', fontWeight: '500', fontSize: '14px', text: 'Outlined' },
    );
  }

  return `<div class="button-row">${buttons.map(b => {
    const borderStyle = b.border ? `border:${b.border}` : 'border:none';
    return `<div class="button-item"><a href="#" style="display:inline-block;background:${b.bg};color:${b.textColor};${borderStyle};border-radius:${b.radius};padding:${b.padding};font-size:${b.fontSize};font-weight:${b.fontWeight};text-decoration:none;cursor:pointer;font-family:var(--font)" onclick="event.preventDefault()">${b.text}</a><div class="button-label">${b.label}</div></div>`;
  }).join('\n')}</div>
  <div class="content-block" style="margin-top:24px">${markdownToHTML(md)}</div>`;
}

// --- Do's & Don'ts rendering ---
function renderDosDonts(md: string): string {
  const dos: string[] = [];
  const donts: string[] = [];
  const lines = md.split('\n');

  let inDo = false;
  let inDont = false;
  for (const line of lines) {
    if (line.match(/^### Do/i)) { inDo = true; inDont = false; continue; }
    if (line.match(/^### Don/i)) { inDont = true; inDo = false; continue; }
    if (line.startsWith('### ')) { inDo = false; inDont = false; continue; }
    if (line.startsWith('- ') && inDo) dos.push(line.replace(/^- /, '').replace(/\*\*/g, ''));
    if (line.startsWith('- ') && inDont) donts.push(line.replace(/^- /, '').replace(/\*\*/g, ''));
  }

  if (dos.length === 0 && donts.length === 0) {
    return `<div class="content-block">${markdownToHTML(md)}</div>`;
  }

  return `<div class="do-grid">
    <div class="do-col"><h4>Do</h4><ul>${dos.map(d => `<li>${d}</li>`).join('\n')}</ul></div>
    <div class="dont-col"><h4>Don't</h4><ul>${donts.map(d => `<li>${d}</li>`).join('\n')}</ul></div>
  </div>
  ${dos.length > 3 || donts.length > 3 ? `<div class="content-block">${markdownToHTML(md)}</div>` : ''}`;
}

// --- Markdown to HTML (simplified, for fallback text sections) ---
function markdownToHTML(md: string): string {
  if (!md) return '';
  let html = md;
  html = html.replace(/^## \d+\. .+\n?/, '');
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

  // Parse markdown tables into proper HTML tables with thead/tbody
  html = html.replace(/^\|.+\|$/gm, (line) => {
    const cells = line.split('|').filter(c => c.trim());
    if (cells.every(c => /^[\s-:]+$/.test(c))) return ''; // separator
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
  });
  html = html.replace(/((?:<tr>.*<\/tr>\s*)+)/g, (match) => {
    // Split first row as thead, rest as tbody
    const rows = match.match(/<tr>.*?<\/tr>/g) || [];
    if (rows.length <= 1) return '<table>' + rows.join('') + '</table>';
    return '<table><thead>' + rows[0] + '</thead><tbody>' + rows.slice(1).join('') + '</tbody></table>';
  });

  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^---$/gm, '<hr>');
  html = '<p>' + html + '</p>';
  // Clean up: don't wrap block elements in <p>
  html = html.replace(/<p>\s*<(h[234]|ul|ol|table|pre|blockquote|hr)/g, '<$1');
  html = html.replace(/<\/(h[234]|ul|ol|table|pre|blockquote)>\s*<\/p>/g, '</$1>');
  html = html.replace(/<p>\s*<\/p>/g, '');
  // Fix stray </p><p> inside tables (caused by double newlines in markdown table content)
  html = html.replace(/<table>(.*?)<\/table>/gs, (tableMatch) => {
    return tableMatch.replace(/<\/p><p>/g, '');
  });
  html = html.replace(/<p>\s*<li>/g, '<ul><li>');
  html = html.replace(/<\/li>\s*<\/p>/g, '</li></ul>');
  return html;
}
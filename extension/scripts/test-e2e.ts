/**
 * E2E test: fetch a real webpage, extract DOM, run full pipeline, verify output.
 * Uses JSDOM to parse the fetched HTML and build ExtractedElement tree,
 * then runs the exact same analyzer + generator as the extension.
 */
import { JSDOM } from 'jsdom';
import { fullAnalysis } from '../analyzer/index.ts';
import { generateDesignMD } from '../generator/template.ts';
import { renderPreviewHTML } from '../renderer/html-renderer.ts';
import { validateDesignMD } from '../types/design-md.ts';
import type { ExtractedPageData, ExtractedElement, ComputedStyles } from '../types/extracted.ts';

const STYLE_PROPS = [
  'color', 'backgroundColor', 'borderColor', 'borderTopColor',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'textAlign', 'textTransform', 'textDecoration',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'borderWidth', 'borderRadius', 'borderStyle', 'boxShadow',
  'display', 'position', 'gap', 'overflow', 'opacity', 'cursor',
  'transitionDuration', 'transitionTimingFunction', 'transitionProperty',
  'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
];

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK', 'BR', 'WBR',
  'G', 'RECT', 'CIRCLE', 'LINE', 'POLYGON', 'POLYLINE', 'DEFS', 'USE',
  'CLIPPATH', 'MASK', 'PATTERN', 'FILTER', 'IMAGE', 'HEAD', 'TITLE', 'NOSCRIPT',
]);

const MAX_DEPTH = 12;
const MAX_ELEMENTS = 2000;
let elementCount = 0;

function walkDOM(el: Element, cs: CSSStyleDeclaration, depth: number): ExtractedElement | null {
  if (depth > MAX_DEPTH || elementCount >= MAX_ELEMENTS) return null;
  const tag = el.tagName.toUpperCase();
  if (SKIP_TAGS.has(tag)) return null;

  elementCount++;

  const computedStyles: Record<string, string> = {};
  for (const p of STYLE_PROPS) {
    computedStyles[p] = (cs as any)[p] || '';
  }

  const children: ExtractedElement[] = [];
  for (let i = 0; i < el.children.length; i++) {
    const child = el.children[i];
    const childCs = (el.ownerDocument.defaultView as any)?.getComputedStyle(child);
    if (childCs) {
      const childResult = walkDOM(child, childCs, depth + 1);
      if (childResult) children.push(childResult);
    }
  }

  const rect = el.getBoundingClientRect();
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('aria-') || attr.name === 'role' || attr.name === 'tabindex' || attr.name === 'type' || attr.name === 'disabled' || attr.name === 'placeholder') {
      attributes[attr.name] = attr.value;
    }
  }

  return {
    tagName: tag,
    role: el.getAttribute('role') || undefined,
    text: (el.textContent || '').substring(0, 200) || undefined,
    classes: el.className && typeof el.className === 'string' ? el.className.split(/\s+/).filter(Boolean) : [],
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    computedStyles: computedStyles as ComputedStyles,
    boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    children,
  };
}

async function extractFromURL(url: string): Promise<ExtractedPageData> {
  console.log(`Fetching ${url}...`);
  const resp = await fetch(url);
  const html = await resp.text();
  console.log(`Got ${html.length} chars`);

  const dom = new JSDOM(html, { url, runScripts: 'outside-only', pretendToBeVisual: true });
  const doc = dom.window.document;
  const win = dom.window as any;

  elementCount = 0;
  const body = doc.body;
  const bodyCs = win.getComputedStyle(body);
  const bodyElement = walkDOM(body, bodyCs, 0);

  // CSS variables
  const cssVariables: Record<string, string> = {};
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof win.CSSStyleRule && rule.selectorText === ':root') {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--')) {
              cssVariables[prop] = rule.style.getPropertyValue(prop).trim();
            }
          }
        }
      }
    } catch {}
  }

  // Media queries
  const mediaQueries: string[] = [];
  for (const sheet of Array.from(doc.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof win.CSSMediaRule) {
          mediaQueries.push(rule.conditionText || rule.media.mediaText);
        }
      }
    } catch {}
  }

  return {
    url,
    title: doc.title,
    meta: {
      description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
      themeColor: doc.querySelector('meta[name="theme-color"]')?.getAttribute('content') || undefined,
    },
    body: bodyElement || {
      tagName: 'BODY', classes: [],
      computedStyles: {} as ComputedStyles,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      children: [],
    },
    cssVariables,
    mediaQueries,
    fontFaces: [],
  };
}

async function main() {
  const url = process.argv[2] || 'https://example.com';
  console.log(`\n=== Real E2E: ${url} ===\n`);

  // 1. Fetch & extract DOM
  const pageData = await extractFromURL(url);
  console.log(`Elements extracted: ${elementCount}`);
  console.log(`CSS variables: ${Object.keys(pageData.cssVariables).length}`);
  console.log(`Media queries: ${pageData.mediaQueries.length}`);

  // 2. Run full analysis
  console.log('\nRunning full analysis...');
  const { analysis, tokenMap, mapping, constraints } = fullAnalysis(pageData);

  console.log(`Colors: primary=${analysis.colors.primary.hex}, accent=${analysis.colors.accent.hex}`);
  console.log(`Typography: ${analysis.typography.fontFamilies.length} families, ${analysis.typography.hierarchy.length} levels`);
  console.log(`Spacing: baseUnit=${analysis.spacing.baseUnit}px`);
  console.log(`Components: ${analysis.components.buttons.length} buttons, ${analysis.components.cards.length} cards, ${analysis.components.inputs.length} inputs`);
  console.log(`Mapping: ${mapping.tokenToUsage.size} tokens mapped`);
  console.log(`Constraints: ${constraints.dos.length} do's, ${constraints.donts.length} don'ts`);

  // 3. Generate DESIGN.md
  console.log('\nGenerating DESIGN.md...');
  const doc = generateDesignMD(analysis, tokenMap, mapping, constraints, url);

  const sectionCount = Object.values(doc.sections).filter(s => s.length > 0).length;
  console.log(`Sections with content: ${sectionCount}/15`);
  console.log(`Total length: ${doc.rawMarkdown.length} chars`);

  // 4. Validate
  const validation = validateDesignMD(doc.rawMarkdown);
  console.log(`\nValidation: ${validation.valid ? '✅ VALID' : '❌ INVALID'}`);
  if (validation.issues.length) console.log('  Issues:', validation.issues.join('; '));
  if (validation.warnings.length) console.log('  Warnings:', validation.warnings.join('; '));

  // 5. Generate preview HTML
  const previewHtml = renderPreviewHTML(doc, tokenMap);
  console.log(`\nPreview HTML: ${previewHtml.length} chars`);

  // 6. Write outputs
  const { writeFileSync } = await import('fs');
  writeFileSync('/tmp/test-design.md', doc.rawMarkdown);
  writeFileSync('/tmp/test-preview.html', previewHtml);
  console.log('\nWritten: /tmp/test-design.md, /tmp/test-preview.html');

  // Summary
  const passed = validation.valid && sectionCount >= 12;
  console.log(`\n=== ${passed ? '✅ PASSED' : '❌ FAILED'} ===`);
  process.exit(passed ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
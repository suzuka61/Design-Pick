/**
 * Entry: simulate minimaxi.com (white bg, orange brand CTA), run the full
 * pipeline, and assert the output's Quick Reference is correct.
 */
import { analyzePage, fullAnalysis } from '../analyzer/index.ts';
import { generateDesignMD } from '../generator/template.ts';
import type { ExtractedPageData } from '../types/extracted.ts';

function makeElement(tag: string, cs: any, children: any[] = [], classes: string[] = [], attrs?: any) {
  return {
    tagName: tag,
    classes,
    attributes: attrs,
    computedStyles: cs,
    boundingBox: { x: 0, y: 0, width: 1200, height: 60 },
    children,
  };
}

const textCS = {
  color: 'rgb(24, 24, 27)',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  borderColor: 'rgb(229, 229, 234)',
  borderTopColor: 'rgb(229, 229, 234)',
  fontFamily: '"Inter", system-ui, sans-serif',
  fontSize: '16px', fontWeight: '400', lineHeight: '24px', letterSpacing: '0em',
  textAlign: 'left', textTransform: 'none', textDecoration: 'none',
  paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px',
  marginTop: '0px', marginRight: '0px', marginBottom: '0px', marginLeft: '0px',
  borderWidth: '0px', borderRadius: '0px', borderStyle: 'none',
  boxShadow: 'none', display: 'block', position: 'static',
  gap: '0px', overflow: 'visible', opacity: '1', cursor: 'auto',
  transitionDuration: '0s', transitionTimingFunction: 'ease',
  transitionProperty: 'none', outlineStyle: 'none', outlineWidth: '0px',
  outlineColor: 'rgb(0, 0, 0)', outlineOffset: '0px',
};

// White background, dark text (the actual minimaxi.com style)
const bodyCS = { ...textCS, backgroundColor: 'rgb(255, 255, 255)' };

// Orange brand color buttons — high chroma, only on bg
const orangeButtonCS = {
  ...textCS,
  color: 'rgb(255, 255, 255)',
  backgroundColor: 'rgb(255, 95, 0)',  // Minimax-style orange
};
const darkButtonCS = { ...textCS, backgroundColor: 'rgb(24, 24, 27)' };

const ctaButton = makeElement('A', orangeButtonCS, [], ['btn', 'btn-primary'], { href: '#' });
const navLink = makeElement('A', textCS, [], ['nav-link'], { href: '#' });
const nav = makeElement('NAV', bodyCS, [
  makeElement('DIV', bodyCS, [
    makeElement('A', textCS, [], ['logo'], { href: '/' }),
    makeElement('A', textCS, [makeElement('SPAN', textCS)], ['brand']),
    navLink,
    navLink,
    navLink,
    ctaButton,  // orange "API & Token Plan" button
  ]),
], ['main-nav'], { role: 'navigation' });

const heroTitle = makeElement('H1', textCS, [], ['title']);
const heroSub = makeElement('P', { ...textCS, color: 'rgb(100, 100, 110)' }, [], ['sub']);
const hero = makeElement('SECTION', bodyCS, [
  heroTitle,
  heroSub,
  makeElement('DIV', bodyCS, [
    ctaButton,  // Another orange CTA
    makeElement('A', textCS, [], ['link']),
  ]),
], ['hero']);

const card = makeElement('DIV', {
  ...textCS,
  backgroundColor: 'rgb(250, 250, 252)',
  borderColor: 'rgb(229, 229, 234)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '12px',
}, [], ['card']);

const featureSection = makeElement('SECTION', bodyCS, [
  card, card, card, card,
], ['features']);

const blogSection = makeElement('SECTION', bodyCS, [], ['blog']);
const footer = makeElement('FOOTER', { ...textCS, backgroundColor: 'rgb(248, 248, 250)' }, [], ['footer']);

const pageData: ExtractedPageData = {
  url: 'https://www.minimaxi.com/',
  title: 'MiniMax — Frontier Coding/Agentic Model',
  meta: { description: 'Test', 'og:site_name': 'MiniMax' },
  body: makeElement('BODY', bodyCS, [nav, hero, featureSection, blogSection, footer], ['page']),
  htmlComputedStyles: { backgroundColor: 'rgb(255, 255, 255)', color: 'rgb(24, 24, 27)' },
  cssVariables: {},
  mediaQueries: [],
  fontFaces: [],
};

export async function runVerification(): Promise<boolean> {
  console.log('=== Verifying color extraction fixes (minimaxi.com simulation) ===\n');

  const analysis = analyzePage(pageData);
  const { tokenMap, mapping, constraints } = fullAnalysis(pageData);
  const doc = generateDesignMD(analysis, tokenMap, mapping, constraints, pageData.url);

  // --- Assertion 1: bodyBackground detected as light ---
  const bg = analysis.colors.bodyBackground;
  console.log('[1] bodyBackground:');
  console.log(`    hex=${bg.hex}, luminance=${bg.luminance.toFixed(1)}, isDark=${bg.isDark}`);
  const bgOk = !bg.isDark && bg.luminance > 200;
  console.log(`    ${bgOk ? '✅' : '❌'} Should be light (luminance > 200, isDark=false)`);
  if (!bgOk) return false;

  // --- Assertion 2: Primary is orange (high chroma) ---
  const primary = analysis.colors.primary;
  console.log('\n[2] Primary:');
  console.log(`    hex=${primary.hex}, name=${primary.name}`);
  // Orange-ish: r >> g >> b
  const r = primary.rgb.r, g = primary.rgb.g, b = primary.rgb.b;
  const isOrange = r > 200 && g > 50 && g < 150 && b < 50;
  console.log(`    ${isOrange ? '✅' : '❌'} Should be orange-ish (R>>G>>B). Got rgb(${r},${g},${b})`);
  if (!isOrange) return false;

  // --- Assertion 3: Quick Reference uses light-theme mapping ---
  console.log('\n[3] Quick Reference:');
  const qr = doc.sections.colorPalette;
  console.log(qr.split('\n').filter(l => l.includes('Quick') || l.match(/^-\s/)).map(l => '    ' + l).join('\n'));
  const bgLine = qr.split('\n').find(l => l.includes('Background'));
  const textLine = qr.split('\n').find(l => l.trim().startsWith('- Text'));
  const bgOk2 = bgLine?.includes('color-neutral-50') && bgLine?.includes(bg.hex);
  const textOk = textLine?.includes('color-neutral-900');
  console.log(`    ${bgOk2 ? '✅' : '❌'} Background should be color-neutral-50 + actual hex (light theme)`);
  console.log(`    ${textOk ? '✅' : '❌'} Text should be color-neutral-900 (dark shade, for light theme contrast). Got: ${textLine}`);
  if (!bgOk2 || !textOk) return false;

  // --- Assertion 4: VisualTheme darkMode = false ---
  console.log('\n[4] Visual Theme:');
  console.log(`    darkMode=${analysis.visualTheme.darkMode}`);
  const themeOk = analysis.visualTheme.darkMode === false;
  console.log(`    ${themeOk ? '✅' : '❌'} darkMode should be false for white bg`);
  if (!themeOk) return false;

  console.log('\n=== ✅ ALL CHECKS PASSED ===');
  return true;
}

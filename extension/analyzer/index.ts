import type { ExtractedPageData } from '../types/extracted';
import type { AnalyzedPageData, VisualThemeSummary, MotionTokens, AccessibilityInfo, BrandContext, TokenMapping, ExtractedConstraints } from '../types/analyzed';
import type { TokenNameMap } from './token-namer';
import { analyzeColors } from './color-clusterer';
import { analyzeTypography } from './font-analyzer';
import { analyzeSpacing } from './spacing-analyzer';
import { analyzeComponents } from './component-detector';
import { analyzeShadows } from './shadow-analyzer';
import { analyzeResponsive } from './responsive-analyzer';
import { classifyStability } from './stability-classifier';
import { generateTokenNames } from './token-namer';
import { completeStates } from './state-completer';
import { buildTokenMapping } from './mapping-analyzer';
import { extractConstraints } from './constraint-extractor';

// Re-export for background/sw.ts to import individual steps
export { classifyStability, generateTokenNames, completeStates, buildTokenMapping, extractConstraints };
export type { TokenNameMap };

function detectVisualTheme(pageData: ExtractedPageData, colors: AnalyzedPageData['colors']): VisualThemeSummary {
  // Prefer the bodyBackground we already computed in color-clusterer; fall back to
  // a direct read of <html>/<body> computed style. Many sites put background on
  // <html> while <body> is transparent — reading body alone mis-classifies them.
  const isDarkPage = colors.bodyBackground?.isDark ?? (() => {
    const bodyBg = pageData.body.computedStyles.backgroundColor;
    const htmlBg = pageData.htmlComputedStyles?.backgroundColor ?? '';
    const candidates = [htmlBg, bodyBg];
    for (const v of candidates) {
      if (!v || v === 'rgba(0, 0, 0, 0)' || v === 'transparent') continue;
      const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) return (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) < 128;
    }
    return false;
  })();

  const tones: string[] = [];
  if (isDarkPage) tones.push('Premium', 'Sophisticated');
  else tones.push('Clean', 'Professional');

  const chars: string[] = [];
  const s = pageData.body.computedStyles;
  const hasMono = s.fontFamily.toLowerCase().includes('mono');
  if (hasMono) chars.push('Code-influenced');
  if (isDarkPage) chars.push('Dark-first design');

  const maxRadius = Math.max(
    ...collectAllRadius(pageData.body)
  );
  if (maxRadius >= 9999) chars.push('Pill-shaped elements');
  else if (maxRadius <= 4) chars.push('Sharp, angular edges');
  else chars.push('Rounded UI elements');

  return {
    philosophy: isDarkPage
      ? 'Dark-focused interface emphasizing content through contrast and subtle elevation'
      : 'Light, spacious interface with clear visual hierarchy and restrained decoration',
    emotionalTone: tones,
    keyCharacteristics: chars,
    darkMode: isDarkPage,
  };
}

function collectAllRadius(el: ExtractedPageData['body']): number[] {
  const values: number[] = [];
  const m = el.computedStyles.borderRadius.match(/([\d.]+)px/);
  if (m) values.push(parseFloat(m[1]));
  for (const child of el.children) {
    values.push(...collectAllRadius(child));
  }
  return values;
}

export interface FullAnalysisResult {
  analysis: AnalyzedPageData;
  tokenMap: TokenNameMap;
  mapping: TokenMapping;
  constraints: ExtractedConstraints;
}

export function analyzePage(pageData: ExtractedPageData): AnalyzedPageData {
  let colors: AnalyzedPageData['colors'];
  try { colors = analyzeColors(pageData); } catch (e: any) { console.warn('analyzeColors failed:', e.message); colors = fallbackColors(); }

  let typography: AnalyzedPageData['typography'];
  try { typography = analyzeTypography(pageData); } catch (e: any) { console.warn('analyzeTypography failed:', e.message); typography = fallbackTypography(); }

  let spacing: AnalyzedPageData['spacing'];
  try { spacing = analyzeSpacing(pageData); } catch (e: any) { console.warn('analyzeSpacing failed:', e.message); spacing = fallbackSpacing(); }

  let components: AnalyzedPageData['components'];
  try { components = analyzeComponents(pageData); } catch (e: any) { console.warn('analyzeComponents failed:', e.message); components = { buttons: [], cards: [], inputs: [], navigation: [], other: [] }; }

  let shadows: AnalyzedPageData['shadows'];
  try { shadows = analyzeShadows(pageData); } catch (e: any) { console.warn('analyzeShadows failed:', e.message); shadows = { levels: [], philosophy: 'No shadow data' }; }

  let responsive: AnalyzedPageData['responsive'];
  try { responsive = analyzeResponsive(pageData); } catch (e: any) { console.warn('analyzeResponsive failed:', e.message); responsive = fallbackResponsive(); }

  const visualTheme = detectVisualTheme(pageData, colors);
  const motion = analyzeMotion(pageData);
  const accessibility = analyzeAccessibility(pageData, colors);
  const brand = inferBrand(pageData, visualTheme);

  return {
    colors,
    typography,
    spacing,
    components,
    shadows,
    responsive,
    visualTheme,
    motion,
    accessibility,
    brand,
  };
}

function fallbackColors(): AnalyzedPageData['colors'] {
  return {
    primary: { name: 'Primary', hex: '#5b76fe', rgb: { r: 91, g: 118, b: 254 }, role: 'primary', usage: [], frequency: 0 },
    accent: { name: 'Accent', hex: '#ff6b6b', rgb: { r: 255, g: 107, b: 107 }, role: 'accent', usage: [], frequency: 0 },
    neutralScale: [],
    surface: [],
    shadows: [],
    semanticRoles: {},
    bodyBackground: { hex: '#ffffff', textHex: '#1a1a2e', rgb: { r: 255, g: 255, b: 255 }, luminance: 255, isDark: false },
  };
}

function fallbackTypography(): AnalyzedPageData['typography'] {
  return { fontFamilies: [], hierarchy: [], principles: [] };
}

function fallbackSpacing(): AnalyzedPageData['spacing'] {
  return {
    baseUnit: 8,
    scale: [],
    gridSystem: { type: 'fluid', containerMaxWidth: 1200, containerPadding: 16, columns: 12 },
    borderRadiusScale: [],
    whitespacePhilosophy: 'No spacing data extracted',
  };
}

function fallbackResponsive(): AnalyzedPageData['responsive'] {
  return {
    breakpoints: [
      { name: 'sm', minWidth: 640, description: 'Small devices' },
      { name: 'md', minWidth: 768, description: 'Medium devices' },
      { name: 'lg', minWidth: 1024, description: 'Large devices' },
      { name: 'xl', minWidth: 1280, description: 'Extra large devices' },
    ],
    touchTargets: { minSize: 44, recommendedSize: 48, minSpacing: 8 },
    collapsingStrategy: 'Stack columns vertically below md breakpoint',
  };
}

/** Full pipeline: analyze → classify stability → generate tokens → build mapping → extract constraints */
export function fullAnalysis(pageData: ExtractedPageData): FullAnalysisResult {
  const analysis = analyzePage(pageData);
  classifyStability(analysis);

  const tokenMap = generateTokenNames(analysis);
  completeStates(analysis.components, tokenMap);

  const mapping = buildTokenMapping(analysis, tokenMap);
  const constraints = extractConstraints(analysis);

  return { analysis, tokenMap, mapping, constraints };
}

function analyzeMotion(pageData: ExtractedPageData): MotionTokens {
  const durations: MotionTokens['durations'] = [];
  const easings: MotionTokens['easings'] = [];
  const transitions: MotionTokens['transitions'] = [];

  const durationSet = new Map<string, { value: string; usage: Set<string> }>();
  const easingSet = new Map<string, { value: string; usage: Set<string> }>();

  function walk(el: ExtractedPageData['body']) {
    const cs = el.computedStyles;
    if (cs.transitionDuration && cs.transitionDuration !== '0s' && cs.transitionDuration !== 'none') {
      const d = cs.transitionDuration;
      if (!durationSet.has(d)) durationSet.set(d, { value: d, usage: new Set() });
      durationSet.get(d)!.usage.add(el.tagName.toLowerCase());
    }
    if (cs.transitionTimingFunction && cs.transitionTimingFunction !== 'ease' && cs.transitionTimingFunction !== 'none') {
      const e = cs.transitionTimingFunction;
      if (!easingSet.has(e)) easingSet.set(e, { value: e, usage: new Set() });
      easingSet.get(e)!.usage.add(el.tagName.toLowerCase());
    }
    if (cs.transitionProperty && cs.transitionProperty !== 'none' && cs.transitionProperty !== 'all') {
      const parts = cs.transitionProperty.split(',').map(p => p.trim());
      const durParts = (cs.transitionDuration ?? '0s').split(',').map(p => p.trim());
      const easeParts = (cs.transitionTimingFunction ?? 'ease').split(',').map(p => p.trim());
      for (let i = 0; i < parts.length; i++) {
        transitions.push({
          property: parts[i],
          duration: durParts[i] ?? '0s',
          easing: easeParts[i] ?? 'ease',
        });
      }
    }
    for (const child of el.children) walk(child);
  }
  walk(pageData.body);

  let idx = 0;
  for (const [_, v] of durationSet) {
    const name = idx === 0 ? 'motion-duration-fast' : idx === 1 ? 'motion-duration-normal' : 'motion-duration-slow';
    durations.push({ name, value: v.value, usage: Array.from(v.usage) });
    idx++;
  }

  idx = 0;
  for (const [_, v] of easingSet) {
    const name = idx === 0 ? 'motion-easing-standard' : 'motion-easing-decelerate';
    easings.push({ name, value: v.value, usage: Array.from(v.usage) });
    idx++;
  }

  return { durations, easings, transitions };
}

function analyzeAccessibility(pageData: ExtractedPageData, _colors: AnalyzedPageData['colors']): AccessibilityInfo {
  const contrastRatios: AccessibilityInfo['contrastRatios'] = [];
  const focusIndicators: string[] = [];
  const keyboardPatterns: string[] = [];
  const ariaUsage: string[] = [];

  function hexLuminance(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function contrastRatio(fg: string, bg: string): number {
    const l1 = hexLuminance(fg);
    const l2 = hexLuminance(bg);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function walk(el: ExtractedPageData['body']) {
    const cs = el.computedStyles;
    const tag = el.tagName.toLowerCase();

    if (cs.outlineStyle && cs.outlineStyle !== 'none') {
      focusIndicators.push(`${tag}: outline ${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}`);
    }
    if (cs.outlineOffset && cs.outlineOffset !== '0px') {
      focusIndicators.push(`${tag}: outline-offset ${cs.outlineOffset}`);
    }

    if (['a', 'button', 'input', 'select', 'textarea'].includes(tag)) {
      keyboardPatterns.push(`${tag}: native keyboard accessible`);
    }
    if (tag === 'a' && cs.cursor === 'pointer') {
      keyboardPatterns.push('link: keyboard navigable');
    }

    if (el.attributes) {
      for (const [key, value] of Object.entries(el.attributes)) {
        if (key.startsWith('aria-')) {
          ariaUsage.push(`${tag}: ${key}="${value}"`);
        }
        if (key === 'role') {
          ariaUsage.push(`${tag}: role="${value}"`);
        }
      }
    }

    if (cs.color && cs.backgroundColor && cs.color !== cs.backgroundColor) {
      const fgHex = rgbToHex(cs.color);
      const bgHex = rgbToHex(cs.backgroundColor);
      if (fgHex && bgHex) {
        const ratio = contrastRatio(fgHex, bgHex);
        contrastRatios.push({
          element: tag,
          foreground: fgHex,
          background: bgHex,
          ratio: Math.round(ratio * 100) / 100,
          passes: ratio >= 4.5,
        });
      }
    }

    for (const child of el.children) walk(child);
  }
  walk(pageData.body);

  return { contrastRatios, focusIndicators, keyboardPatterns, ariaUsage };
}

function inferBrand(pageData: ExtractedPageData, visualTheme: VisualThemeSummary): BrandContext {
  const title = pageData.title || '';
  const ogSiteName = pageData.meta?.['og:site_name'] || '';

  let productSurface: string[] = ['web app'];
  if (pageData.url) {
    try {
      const u = new URL(pageData.url);
      if (u.pathname.startsWith('/blog') || u.pathname.startsWith('/posts')) productSurface = ['marketing site'];
      else if (u.pathname.startsWith('/app') || u.pathname.startsWith('/dashboard')) productSurface = ['web app', 'dashboard'];
      else productSurface = ['web app'];
    } catch {}
  }

  const audience = visualTheme.darkMode ? 'Professional / Enterprise' : 'General consumers / SaaS users';

  return {
    productName: ogSiteName || title || 'Unknown',
    audience,
    productSurface,
  };
}

function rgbToHex(rgb: string): string | null {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const r = parseInt(m[1]).toString(16).padStart(2, '0');
  const g = parseInt(m[2]).toString(16).padStart(2, '0');
  const b = parseInt(m[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}
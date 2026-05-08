import type { ExtractedPageData } from '../types/extracted.js';
import type { AnalyzedPageData, VisualThemeSummary, MotionTokens, AccessibilityInfo, BrandContext } from '../types/analyzed.js';
import { analyzeColors } from './color-clusterer.js';
import { analyzeTypography } from './font-analyzer.js';
import { analyzeSpacing } from './spacing-analyzer.js';
import { analyzeComponents } from './component-detector.js';
import { analyzeShadows } from './shadow-analyzer.js';
import { analyzeResponsive } from './responsive-analyzer.js';

function detectVisualTheme(pageData: ExtractedPageData): VisualThemeSummary {
  const bodyBg = pageData.body.computedStyles.backgroundColor;
  const isDarkPage = bodyBg !== 'rgba(0, 0, 0, 0)' && (() => {
    const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) < 128 : false;
  })();

  // Derive emotional tone from color analysis
  const tones: string[] = [];
  if (isDarkPage) tones.push('Premium', 'Sophisticated');
  else tones.push('Clean', 'Professional');

  // Derive key characteristics
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

export function analyzePage(pageData: ExtractedPageData): AnalyzedPageData {
  const colors = analyzeColors(pageData);
  const typography = analyzeTypography(pageData);
  const spacing = analyzeSpacing(pageData);
  const components = analyzeComponents(pageData);
  const shadows = analyzeShadows(pageData);
  const responsive = analyzeResponsive(pageData);
  const visualTheme = detectVisualTheme(pageData);
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
  const tag = pageData.body.tagName.toLowerCase();
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

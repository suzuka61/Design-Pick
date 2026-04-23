import type { ExtractedPageData } from '../types/extracted.js';
import type { AnalyzedPageData, VisualThemeSummary } from '../types/analyzed.js';
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

  return {
    colors,
    typography,
    spacing,
    components,
    shadows,
    responsive,
    visualTheme,
  };
}

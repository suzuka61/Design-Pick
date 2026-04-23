import type { ExtractedPageData, ExtractedElement, ComputedStyles } from '../types/extracted.js';
import type { AnalyzedComponents, ComponentStyle } from '../types/analyzed.js';

function parsePx(value: string): number {
  const m = value.match(/^([\d.]+)px/);
  return m ? parseFloat(m[1]) : 0;
}

function parseCSSColor(value: string): string {
  return value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent'
    ? value
    : 'transparent';
}

type ComponentType = 'button' | 'input' | 'navigation' | 'card';

function classifyElement(el: ExtractedElement): ComponentType | null {
  const tag = el.tagName.toLowerCase();
  const role = el.role?.toLowerCase();
  const classes = el.classes.join(' ').toLowerCase();
  const s = el.computedStyles;

  if (tag === 'button' || role === 'button') return 'button';
  if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
      role === 'textbox' || role === 'searchbox' || role === 'combobox') return 'input';
  if (tag === 'nav' || role === 'navigation' || role === 'menubar') return 'navigation';

  // Anchor that looks like a button
  if (tag === 'a' && isButtonLike(s)) return 'button';

  // Class-based heuristics
  if (/\b(btn|button|cta)\b/.test(classes)) return 'button';
  if (/\b(nav|menu|header|sidebar)\b/.test(classes)) return 'navigation';

  // Card heuristics
  if (isCardLike(el)) return 'card';

  return null;
}

function isButtonLike(s: ComputedStyles): boolean {
  return s.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
         s.backgroundColor !== 'transparent' &&
         parsePx(s.paddingTop) > 0 &&
         parsePx(s.borderRadius) > 0 &&
         s.cursor === 'pointer';
}

function isCardLike(el: ExtractedElement): boolean {
  const tag = el.tagName.toLowerCase();
  const s = el.computedStyles;
  return ['div', 'section', 'article', 'aside', 'li'].includes(tag) &&
         parsePx(s.paddingTop) >= 12 &&
         parsePx(s.borderRadius) > 0 &&
         el.children.length >= 1;
}

function nameVariant(
  type: ComponentType,
  s: ComputedStyles,
  isDarkPage: boolean
): string {
  const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
  const hasBorder = s.borderStyle !== 'none' && parsePx(s.borderWidth) > 0;

  if (type === 'button') {
    if (hasBg && isDarkBg(s, isDarkPage)) return 'Primary';
    if (hasBg) return 'Secondary';
    if (hasBorder) return 'Outline';
    return 'Ghost';
  }
  if (type === 'card') {
    return hasBg ? 'Filled' : 'Default';
  }
  return 'Default';
}

function isDarkBg(s: ComputedStyles, isDarkPage: boolean): boolean {
  // Rough heuristic: dark background on a light page = primary button
  if (!isDarkPage) {
    const m = s.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      const luma = 0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3];
      return luma < 128;
    }
  }
  return false;
}

function extractComponentStyle(
  el: ExtractedElement,
  type: ComponentType,
  variant: string
): ComponentStyle {
  const s = el.computedStyles;
  return {
    type,
    variant,
    styles: {
      backgroundColor: parseCSSColor(s.backgroundColor),
      color: parseCSSColor(s.color),
      borderColor: parseCSSColor(s.borderColor),
      borderWidth: s.borderWidth,
      borderRadius: Math.round(parsePx(s.borderRadius)),
      padding: `${parsePx(s.paddingTop)}px ${parsePx(s.paddingRight)}px`,
      fontSize: Math.round(parsePx(s.fontSize)),
      fontWeight: parseInt(s.fontWeight) || undefined,
      fontFamily: s.fontFamily.split(',')[0]?.replace(/['"]/g, '').trim(),
      boxShadow: s.boxShadow !== 'none' ? s.boxShadow : undefined,
    },
    states: {},
    sampleText: el.text?.substring(0, 50),
  };
}

export function analyzeComponents(pageData: ExtractedPageData): AnalyzedComponents {
  const buttons: ComponentStyle[] = [];
  const cards: ComponentStyle[] = [];
  const inputs: ComponentStyle[] = [];
  const navigation: ComponentStyle[] = [];
  const other: ComponentStyle[] = [];

  // Detect if page is predominantly dark
  const bodyBg = pageData.body.computedStyles.backgroundColor;
  const isDarkPage = bodyBg !== 'rgba(0, 0, 0, 0)' && (() => {
    const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) < 128 : false;
  })();

  // Track seen variants to avoid duplicates
  const seenVariants = new Map<string, boolean>();

  function walk(el: ExtractedElement) {
    const type = classifyElement(el);
    if (type) {
      const variant = nameVariant(type, el.computedStyles, isDarkPage);
      const key = `${type}|${variant}`;

      if (!seenVariants.get(key)) {
        seenVariants.set(key, true);
        const style = extractComponentStyle(el, type, variant);
        switch (type) {
          case 'button': buttons.push(style); break;
          case 'input': inputs.push(style); break;
          case 'navigation': navigation.push(style); break;
          case 'card': cards.push(style); break;
        }
      }
    }
    for (const child of el.children) walk(child);
  }

  walk(pageData.body);

  return { buttons, cards, inputs, navigation, other };
}

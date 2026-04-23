import type { ExtractedPageData, ComputedStyles } from '../types/extracted.js';
import type { AnalyzedTypography, FontFamilyInfo, TypeHierarchyEntry } from '../types/analyzed.js';

interface FontTuple {
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
  elementCount: number;
  contexts: string[];
  sampleText?: string;
}

const SYSTEM_FONT_MAP: Record<string, string> = {
  'system-ui': 'sans-serif',
  '-apple-system': 'sans-serif',
  'blinkmacsystemfont': 'sans-serif',
  'segoe ui': 'sans-serif',
  'roboto': 'sans-serif',
  'helvetica neue': 'sans-serif',
  'arial': 'sans-serif',
  'georgia': 'serif',
  'times new roman': 'serif',
  'times': 'serif',
  'serif': 'serif',
  'sans-serif': 'sans-serif',
  'monospace': 'monospace',
  'consolas': 'monospace',
  'monaco': 'monospace',
  'menlo': 'monospace',
  'courier new': 'monospace',
  'sfmono-regular': 'monospace',
  'ui-monospace': 'monospace',
};

function parseFontFamily(cssValue: string): { primary: string; fallbacks: string[] } {
  const fonts = cssValue.split(',').map(f =>
    f.trim().replace(/['"]/g, '').toLowerCase()
  );
  return {
    primary: fonts[0] || 'sans-serif',
    fallbacks: fonts.slice(1),
  };
}

function categorizeFont(name: string): FontFamilyInfo['category'] {
  const lower = name.toLowerCase();
  if (SYSTEM_FONT_MAP[lower] === 'monospace' || lower.includes('mono')) return 'monospace';
  if (SYSTEM_FONT_MAP[lower] === 'serif' || lower.includes('serif')) return 'serif';
  if (lower.includes('display') || lower.includes('heading')) return 'display';
  return 'sans-serif';
}

function parsePx(value: string): number {
  const m = value.match(/^([\d.]+)px/);
  return m ? parseFloat(m[1]) : 0;
}

function parseEm(value: string): number {
  const m = value.match(/^([-\d.]+)em/);
  return m ? parseFloat(m[1]) : 0;
}

function collectFontTuples(body: ExtractedPageData['body']): FontTuple[] {
  const tupleMap = new Map<string, FontTuple>();

  function walk(el: ExtractedPageData['body']) {
    const s = el.computedStyles;
    const { primary } = parseFontFamily(s.fontFamily);
    const size = parsePx(s.fontSize);
    const weight = parseInt(s.fontWeight) || 400;
    const lineHeight = parsePx(s.lineHeight);
    const letterSpacing = parseEm(s.letterSpacing);

    // Skip very small text and zero-size
    if (size < 1) { walkChildren(el); return; }

    const key = `${primary}|${size}|${weight}`;
    const existing = tupleMap.get(key);
    if (existing) {
      existing.elementCount++;
      if (!existing.contexts.includes(el.tagName)) {
        existing.contexts.push(el.tagName);
      }
    } else {
      tupleMap.set(key, {
        family: primary,
        size,
        weight,
        lineHeight,
        letterSpacing,
        elementCount: 1,
        contexts: [el.tagName],
        sampleText: el.text?.substring(0, 50),
      });
    }

    walkChildren(el);
  }

  function walkChildren(el: ExtractedPageData['body']) {
    for (const child of el.children) walk(child);
  }

  walk(body);
  return Array.from(tupleMap.values());
}

function assignRole(size: number, weight: number): string {
  if (size >= 48) return weight >= 600 ? 'Display' : 'Display Light';
  if (size >= 36) return weight >= 600 ? 'H1' : 'H1 Light';
  if (size >= 28) return weight >= 600 ? 'H2' : 'H2 Light';
  if (size >= 24) return weight >= 600 ? 'H3' : 'Subtitle';
  if (size >= 20) return weight >= 600 ? 'H4' : 'Body Large';
  if (size >= 18) return weight >= 500 ? 'H5' : 'Body';
  if (size >= 16) return weight >= 600 ? 'Label Semibold' : weight >= 500 ? 'Label' : 'Body Small';
  if (size >= 14) return weight >= 500 ? 'Button / Link' : 'Body Compact';
  if (size >= 12) return weight >= 500 ? 'Caption Medium' : 'Caption';
  return 'Micro';
}

function mergeSimilarTuples(tuples: FontTuple[]): FontTuple[] {
  // Merge tuples with same family, similar size (within 2px), similar weight (within 100)
  const merged: FontTuple[] = [];
  const used = new Set<number>();

  for (let i = 0; i < tuples.length; i++) {
    if (used.has(i)) continue;
    const current = { ...tuples[i] };
    used.add(i);

    for (let j = i + 1; j < tuples.length; j++) {
      if (used.has(j)) continue;
      const other = tuples[j];
      if (current.family === other.family &&
          Math.abs(current.size - other.size) <= 2 &&
          Math.abs(current.weight - other.weight) <= 100) {
        // Merge into the higher-count one
        if (other.elementCount > current.elementCount) {
          current.size = other.size;
          current.weight = other.weight;
          current.lineHeight = other.lineHeight;
          current.letterSpacing = other.letterSpacing;
          current.sampleText = other.sampleText || current.sampleText;
        }
        current.elementCount += other.elementCount;
        current.contexts = [...new Set([...current.contexts, ...other.contexts])];
        used.add(j);
      }
    }
    merged.push(current);
  }

  return merged;
}

export function analyzeTypography(pageData: ExtractedPageData): AnalyzedTypography {
  const tuples = collectFontTuples(pageData.body);

  if (tuples.length === 0) {
    return {
      fontFamilies: [{ name: 'system-ui', category: 'sans-serif', usage: ['Default'], fallbacks: ['sans-serif'], weights: [400] }],
      hierarchy: [{ role: 'Body', font: 'system-ui', size: 16, weight: 400, lineHeight: 24, letterSpacing: 0, notes: 'Default' }],
      principles: ['Use consistent font sizing across the interface'],
    };
  }

  // Sort by size descending
  tuples.sort((a, b) => b.size - a.size);

  // Merge similar entries
  const merged = mergeSimilarTuples(tuples);

  // Build font families info
  const familyMap = new Map<string, FontFamilyInfo>();
  for (const t of merged) {
    const existing = familyMap.get(t.family);
    if (existing) {
      if (!existing.weights.includes(t.weight)) existing.weights.push(t.weight);
      existing.usage = [...new Set([...existing.usage, ...t.contexts.map(c => c.toLowerCase())])];
    } else {
      familyMap.set(t.family, {
        name: t.family,
        category: categorizeFont(t.family),
        usage: t.contexts.map(c => c.toLowerCase()),
        fallbacks: [],
        weights: [t.weight],
      });
    }
  }

  const fontFamilies = Array.from(familyMap.values());

  // Add fallbacks from CSS
  if (pageData.body.computedStyles.fontFamily) {
    const { fallbacks } = parseFontFamily(pageData.body.computedStyles.fontFamily);
    for (const ff of fontFamilies) {
      ff.fallbacks = fallbacks.slice(0, 3);
    }
  }

  // Build hierarchy
  const hierarchy: TypeHierarchyEntry[] = merged.slice(0, 10).map(t => ({
    role: assignRole(t.size, t.weight),
    font: t.family,
    size: Math.round(t.size),
    weight: t.weight,
    lineHeight: Math.round(t.lineHeight),
    letterSpacing: Math.round(t.letterSpacing * 1000) / 1000,
    notes: t.contexts.slice(0, 3).join(', '),
    sampleText: t.sampleText,
  }));

  // Derive principles
  const principles: string[] = [];
  const maxWeight = Math.max(...merged.map(t => t.weight));
  const minWeight = Math.min(...merged.map(t => t.weight));
  const weightRange = maxWeight - minWeight;

  if (weightRange <= 200) {
    principles.push(`Narrow weight range (${minWeight}–${maxWeight}): hierarchy driven by size, not weight`);
  } else {
    principles.push(`Wide weight range (${minWeight}–${maxWeight}): hierarchy through both size and weight`);
  }

  const hasNegativeTracking = merged.some(t => t.letterSpacing < 0);
  if (hasNegativeTracking) {
    principles.push('Uses negative letter-spacing at display sizes for compressed, impactful headlines');
  }

  const monoFamily = fontFamilies.find(f => f.category === 'monospace');
  if (monoFamily) {
    principles.push(`${monoFamily.name} for code/technical content, primary font for everything else`);
  }

  return { fontFamilies, hierarchy, principles };
}

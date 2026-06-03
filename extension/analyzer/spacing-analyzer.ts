import type { ExtractedPageData } from '../types/extracted';
import type { AnalyzedSpacing, SpacingScaleEntry, GridInfo, BorderRadiusEntry } from '../types/analyzed';

function parsePx(value: string): number {
  const m = value.match(/^([\d.]+)px/);
  return m ? parseFloat(m[1]) : 0;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function arrayGcd(arr: number[]): number {
  return arr.reduce((acc, val) => gcd(acc, val));
}

function collectSpacingValues(body: ExtractedPageData['body']): number[] {
  const values: number[] = [];

  function walk(el: ExtractedPageData['body']) {
    const s = el.computedStyles;
    for (const prop of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'gap'] as const) {
      const v = parsePx(s[prop]);
      if (v > 0) values.push(v);
    }
    for (const child of el.children) walk(child);
  }

  walk(body);
  return values;
}

function detectBaseUnit(values: number[]): number {
  if (values.length === 0) return 8;

  const candidates = [2, 4, 5, 8, 10];
  let bestUnit = 4;
  let bestScore = 0;

  for (const unit of candidates) {
    const multiples = values.filter(v => Math.abs(v % unit) < 1);
    const score = multiples.length / values.length;
    if (score > bestScore) {
      bestScore = score;
      bestUnit = unit;
    }
  }

  if (bestScore < 0.7) {
    // Fallback: GCD of most common values
    const freq = new Map<number, number>();
    for (const v of values) {
      const rounded = Math.round(v);
      freq.set(rounded, (freq.get(rounded) ?? 0) + 1);
    }
    const topValues = Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([v]) => v)
      .filter(v => v > 0);

    if (topValues.length >= 2) {
      return arrayGcd(topValues);
    }
  }

  return bestUnit;
}

function buildSpacingScale(values: number[], baseUnit: number): SpacingScaleEntry[] {
  // Bucket values by base-unit multiplier
  const buckets = new Map<number, { value: number; count: number }>();

  for (const v of values) {
    const multiplier = Math.round(v / baseUnit * 10) / 10;
    const existing = buckets.get(multiplier);
    if (existing) {
      existing.count++;
      // Keep the most common actual value
    } else {
      buckets.set(multiplier, { value: v, count: 1 });
    }
  }

  const scaleNames: { maxMult: number; name: string }[] = [
    { maxMult: 0.5, name: 'xs' },
    { maxMult: 1, name: 'sm' },
    { maxMult: 1.5, name: 'sm-md' },
    { maxMult: 2, name: 'md' },
    { maxMult: 3, name: 'lg' },
    { maxMult: 4, name: 'xl' },
    { maxMult: 6, name: '2xl' },
    { maxMult: 8, name: '3xl' },
    { maxMult: 12, name: '4xl' },
    { maxMult: 16, name: '5xl' },
  ];

  const scale: SpacingScaleEntry[] = [];
  for (const { maxMult, name } of scaleNames) {
    const bucket = buckets.get(maxMult);
    if (bucket) {
      scale.push({
        name,
        value: Math.round(bucket.value),
        multiplier: maxMult,
        usage: [`${bucket.count} elements`],
      });
    } else if (maxMult <= 8) {
      // Fill in theoretical values
      scale.push({
        name,
        value: Math.round(baseUnit * maxMult),
        multiplier: maxMult,
        usage: [],
      });
    }
  }

  return scale;
}

function detectGridSystem(body: ExtractedPageData['body']): GridInfo {
  let maxWidth = 0;
  let maxPadding = 0;
  let columns = 12;

  function walk(el: ExtractedPageData['body']) {
    const s = el.computedStyles;
    const w = el.boundingBox.width;
    if (s.display === 'grid' || s.display === 'inline-grid') {
      if (w > maxWidth && w < 2000) maxWidth = w;
      const p = parsePx(s.paddingLeft) + parsePx(s.paddingRight);
      if (p > maxPadding) maxPadding = p;
    }
    for (const child of el.children) walk(child);
  }

  walk(body);

  return {
    type: maxWidth > 0 ? `${detectBaseUnit(collectSpacingValues(body))}px grid` : 'fluid',
    containerMaxWidth: maxWidth || 1200,
    containerPadding: Math.round(maxPadding / 2) || 16,
    columns,
  };
}

function collectRadiusValues(body: ExtractedPageData['body']): number[] {
  const values: number[] = [];

  function walk(el: ExtractedPageData['body']) {
    const s = el.computedStyles;
    const r = parsePx(s.borderRadius);
    if (r > 0) values.push(r);
    for (const child of el.children) walk(child);
  }

  walk(body);
  return values;
}

function detectRadiusScale(values: number[]): BorderRadiusEntry[] {
  if (values.length === 0) return [];

  const freq = new Map<number, number>();
  for (const v of values) {
    const rounded = Math.round(v);
    if (rounded === 9999 || rounded >= 9000) {
      freq.set(9999, (freq.get(9999) ?? 0) + 1);
    } else {
      freq.set(rounded, (freq.get(rounded) ?? 0) + 1);
    }
  }

  const sorted = Array.from(freq.entries())
    .sort((a, b) => a[0] - b[0]);

  const nameMap: Record<number, string> = {
    0: 'none', 2: 'xs', 4: 'sm', 6: 'md', 8: 'lg', 12: 'xl',
    16: '2xl', 20: '3xl', 24: '4xl', 9999: 'full',
  };

  return sorted.map(([value, count]) => ({
    name: nameMap[value] ?? (value <= 8 ? 'sm' : value <= 16 ? 'md' : value <= 24 ? 'lg' : 'xl'),
    value,
    usage: [`${count} elements`],
  }));
}

export function analyzeSpacing(pageData: ExtractedPageData): AnalyzedSpacing {
  const spacingValues = collectSpacingValues(pageData.body);
  const radiusValues = collectRadiusValues(pageData.body);

  const baseUnit = detectBaseUnit(spacingValues);
  const scale = buildSpacingScale(spacingValues, baseUnit);
  const gridSystem = detectGridSystem(pageData.body);
  const borderRadiusScale = detectRadiusScale(radiusValues);

  const maxSpacing = spacingValues.length > 0 ? Math.max(...spacingValues) : 0;
  const whitespacePhilosophy = maxSpacing > 80
    ? 'Generous whitespace with large vertical rhythm — gallery-like spacing that lets content breathe'
    : maxSpacing > 40
    ? 'Comfortable spacing with clear section separation'
    : 'Compact spacing with minimal vertical rhythm';

  return {
    baseUnit,
    scale,
    gridSystem,
    borderRadiusScale,
    whitespacePhilosophy,
  };
}

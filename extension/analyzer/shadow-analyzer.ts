import type { ExtractedPageData } from '../types/extracted';
import type { AnalyzedShadows, ShadowLevel } from '../types/analyzed';

interface ShadowObservation {
  raw: string;
  offsetX: number;
  offsetY: number;
  blurRadius: number;
  spreadRadius: number;
  color: string;
  usage: string[];
}

function parseBoxShadow(value: string): ShadowObservation[] {
  if (!value || value === 'none') return [];

  const shadows: ShadowObservation[] = [];
  // Split multi-value shadows by looking for rgba? patterns
  const parts = value.split(/(?=rgba?\(|(?<!inset\s)\d+\.?\d*\s+[\d.]+px)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Match: offsetX offsetY blurRadius spreadRadius color
    const m = trimmed.match(
      /(-?[\d.]+(?:px)?)\s+(-?[\d.]+(?:px)?)\s+([\d.]+(?:px)?)?\s+([\d.]+(?:px)?)?\s*(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8})?/
    );

    if (m) {
      const parseVal = (v: string | undefined) => v ? parseFloat(v) : 0;
      shadows.push({
        raw: trimmed,
        offsetX: parseVal(m[1]),
        offsetY: parseVal(m[2]),
        blurRadius: parseVal(m[3]),
        spreadRadius: parseVal(m[4]),
        color: m[5] || 'rgba(0,0,0,0.1)',
        usage: [],
      });
    }
  }

  return shadows;
}

export function analyzeShadows(pageData: ExtractedPageData): AnalyzedShadows {
  const shadowMap = new Map<string, ShadowObservation>();

  function walk(el: ExtractedPageData['body']) {
    const s = el.computedStyles;
    if (s.boxShadow && s.boxShadow !== 'none') {
      const parsed = parseBoxShadow(s.boxShadow);
      for (const shadow of parsed) {
        const key = shadow.raw;
        const existing = shadowMap.get(key);
        if (existing) {
          existing.usage.push(el.tagName.toLowerCase());
        } else {
          shadow.usage = [el.tagName.toLowerCase()];
          shadowMap.set(key, shadow);
        }
      }
    }
    for (const child of el.children) walk(child);
  }

  walk(pageData.body);

  const shadows = Array.from(shadowMap.values());

  // Sort by perceived depth (blur + offset magnitude)
  shadows.sort((a, b) =>
    (b.blurRadius + Math.abs(b.offsetY) + b.spreadRadius) -
    (a.blurRadius + Math.abs(a.offsetY) + a.spreadRadius)
  );

  // Assign levels
  const levelNames = ['Flat', 'Subtle', 'Low', 'Medium', 'Elevated', 'High', 'Modal'];
  const levels: ShadowLevel[] = shadows.map((s, i) => ({
    level: i,
    name: levelNames[i] || `Level ${i}`,
    boxShadow: s.raw,
    usage: [...new Set(s.usage)],
  }));

  // If no shadows found, add a default flat level
  if (levels.length === 0) {
    levels.push({
      level: 0,
      name: 'Flat',
      boxShadow: 'none',
      usage: ['All elements'],
    });
  }

  const hasBorderShadow = shadows.some(s => s.blurRadius <= 1 && s.spreadRadius > 0);
  const philosophy = hasBorderShadow
    ? 'Uses shadow-as-border technique: zero-blur, 1px-spread shadows replace traditional CSS borders for smoother rendering'
    : shadows.length > 3
    ? 'Multi-layer shadow system with distinct elevation levels for visual hierarchy'
    : 'Minimal shadow usage — depth created through spacing and borders rather than elevation';

  return { levels, philosophy };
}

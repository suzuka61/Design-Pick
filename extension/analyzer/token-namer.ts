import type { AnalyzedPageData, StabilityLevel } from '../types/analyzed';

// --- CIELAB color utilities (shared from color-clusterer pattern) ---

interface LabColor { L: number; a: number; b: number; }

function srgbToLinear(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToLab(r: number, g: number, b: number): LabColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  let x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  let y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) / 1.00000;
  let z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return { L: (116 * y) - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function labToRgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;
  const xr = Math.pow(fx, 3) > 0.008856 ? Math.pow(fx, 3) : (fx - 16 / 116) / 7.787;
  const yr = Math.pow(fy, 3) > 0.008856 ? Math.pow(fy, 3) : (fy - 16 / 116) / 7.787;
  const zr = Math.pow(fz, 3) > 0.008856 ? Math.pow(fz, 3) : (fz - 16 / 116) / 7.787;
  const lr = xr * 0.95047;
  const lg = yr * 1.00000;
  const lb = zr * 1.08883;
  const srgbInverse = (c: number) => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return {
    r: Math.round(Math.max(0, Math.min(255, srgbInverse(lr * 0.0 + lg * 3.2404542 + lb * -1.5371385) * 255))),
    g: Math.round(Math.max(0, Math.min(255, srgbInverse(lr * -0.9692660 + lg * 1.8760108 + lb * 0.0415560) * 255))),
    b: Math.round(Math.max(0, Math.min(255, srgbInverse(lr * 0.0556434 + lg * -0.2040259 + lb * 1.0572252) * 255))),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16) };
}

// --- Token name map types ---

export interface ColorTokenEntry {
  hex: string;
  tokenName: string;
  shade: number;
  stability: StabilityLevel;
  hue: string; // primary, accent, neutral, success, warning, error, info
}

export interface SpacingTokenEntry {
  value: number;
  tokenName: string;
  stability: StabilityLevel;
}

export interface RadiusTokenEntry {
  value: number;
  tokenName: string;
  stability: StabilityLevel;
}

export interface ShadowTokenEntry {
  boxShadow: string;
  tokenName: string;
  stability: StabilityLevel;
}

export interface TypographyTokenEntry {
  role: string;
  tokenName: string;
  stability: StabilityLevel;
}

export interface ComponentTokenEntry {
  componentType: string;
  property: string;
  tokenName: string;
  rawValue: string;
  stability: StabilityLevel;
}

export interface TokenNameMap {
  colors: Map<string, ColorTokenEntry>;
  spacing: Map<string, SpacingTokenEntry>;
  radius: Map<string, RadiusTokenEntry>;
  shadows: Map<string, ShadowTokenEntry>;
  typography: Map<string, TypographyTokenEntry>;
  components: Map<string, ComponentTokenEntry>;
}

// --- Shade computation ---

// Map L* (0-100) to shade step (50, 100, 200, ..., 900)
function lightnessToShade(L: number): number {
  // L=100 → shade 50, L=0 → shade 900
  const normalized = 1 - (L / 100); // 0 (lightest) to 1 (darkest)
  const shade = Math.round(normalized * 9) * 100;
  return Math.max(50, Math.min(900, shade === 0 ? 50 : shade));
}

// Generate a full 50-900 scale from a single seed color
function generateColorScale(seedHex: string, hueName: string): Map<string, ColorTokenEntry> {
  const parsed = parseHex(seedHex);
  if (!parsed) return new Map();

  const seedLab = rgbToLab(parsed.r, parsed.g, parsed.b);
  const seedShade = lightnessToShade(seedLab.L);

  const scale = new Map<string, ColorTokenEntry>();
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

  for (const shade of shades) {
    // Interpolate L* to target shade, keep a/b from seed
    const targetL = 100 - (shade / 1000) * 100; // shade 50 → L≈95, shade 900 → L≈10
    // Blend chroma: lower shades have less chroma, higher shades have more
    const chromaFactor = shade <= 500 ? 0.3 + (shade / 500) * 0.7 : 1.0 - ((shade - 500) / 400) * 0.3;
    const targetA = seedLab.a * chromaFactor;
    const targetB = seedLab.b * chromaFactor;

    const rgb = labToRgb(targetL, targetA, targetB);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const tokenName = `color-${hueName}-${shade}`;

    scale.set(tokenName, {
      hex,
      tokenName,
      shade,
      stability: shade === seedShade ? 'L1' : 'L2',
      hue: hueName,
    });
  }

  return scale;
}

// --- Main function ---

export function generateTokenNames(data: AnalyzedPageData): TokenNameMap {
  const tokenMap: TokenNameMap = {
    colors: new Map(),
    spacing: new Map(),
    radius: new Map(),
    shadows: new Map(),
    typography: new Map(),
    components: new Map(),
  };

  // 1. Color tokens — generate full scales
  const primaryScale = generateColorScale(data.colors.primary.hex, 'primary');
  for (const [k, v] of primaryScale) tokenMap.colors.set(k, v);

  const accentScale = generateColorScale(data.colors.accent.hex, 'accent');
  for (const [k, v] of accentScale) tokenMap.colors.set(k, v);

  // Neutral: map existing neutral scale to 0-9, generate full scale from midpoint
  if (data.colors.neutralScale.length > 0) {
    // Find the darkest neutral as seed for the full scale
    const sorted = [...data.colors.neutralScale].sort((a, b) => a.scalePosition - b.scalePosition);
    const midIdx = Math.floor(sorted.length / 2);
    const midNeutral = sorted[midIdx];
    const neutralScale = generateColorScale(midNeutral.hex, 'neutral');
    // Override observed values to use actual extracted colors
    for (const n of data.colors.neutralScale) {
      const shade = lightnessToShade(rgbToLab(n.rgb.r, n.rgb.g, n.rgb.b).L);
      const tokenName = `color-neutral-${shade}`;
      if (neutralScale.has(tokenName)) {
        neutralScale.set(tokenName, { ...neutralScale.get(tokenName)!, hex: n.hex });
      }
    }
    for (const [k, v] of neutralScale) tokenMap.colors.set(k, v);
  } else {
    // Fallback: generate neutral scale from gray
    const neutralScale = generateColorScale('#6b7280', 'neutral');
    for (const [k, v] of neutralScale) tokenMap.colors.set(k, v);
  }

  // Override neutral endpoints with the ACTUAL body background and text colors.
  // Many sites have a pure white bg (#ffffff) but neutral-50 was generated from
  // a gray seed and ends up as #fff1f7 — wrong. Use the detected bodyBackground
  // to pin the correct endpoint shade.
  if (data.colors.bodyBackground) {
    const isDark = data.colors.bodyBackground.isDark;
    const bgShade = isDark ? 900 : 50;
    const textShade = isDark ? 50 : 900;
    const bgTokenName = `color-neutral-${bgShade}`;
    const textTokenName = `color-neutral-${textShade}`;
    if (tokenMap.colors.has(bgTokenName)) {
      tokenMap.colors.set(bgTokenName, { ...tokenMap.colors.get(bgTokenName)!, hex: data.colors.bodyBackground.hex });
    }
    if (tokenMap.colors.has(textTokenName)) {
      tokenMap.colors.set(textTokenName, { ...tokenMap.colors.get(textTokenName)!, hex: data.colors.bodyBackground.textHex });
    }
  }

  // Semantic colors (success, warning, error, info)
  const semanticMapping: Record<string, string> = {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    link: '#3b82f6',
  };
  for (const [role, color] of Object.entries(data.colors.semanticRoles)) {
    semanticMapping[role] = color.hex;
  }
  for (const [hue, hex] of Object.entries(semanticMapping)) {
    const scale = generateColorScale(hex, hue);
    for (const [k, v] of scale) tokenMap.colors.set(k, v);
  }

  // 2. Spacing tokens
  for (const entry of data.spacing.scale) {
    const tokenName = `spacing-${entry.name}`;
    tokenMap.spacing.set(tokenName, {
      value: entry.value,
      tokenName,
      stability: entry.stability ?? 'L2',
    });
  }

  // 3. Radius tokens
  const radiusNameMapping: Record<string, string> = {
    'none': 'none', 'xs': 'xs', 'sm': 'sm', 'md': 'md',
    'lg': 'lg', 'xl': 'xl', '2xl': '2xl', '3xl': '3xl',
    '4xl': '4xl', 'full': 'full',
  };
  for (const entry of data.spacing.borderRadiusScale) {
    const sizeName = radiusNameMapping[entry.name] || entry.name;
    const tokenName = `radius-${sizeName}`;
    tokenMap.radius.set(tokenName, {
      value: entry.value,
      tokenName,
      stability: entry.stability ?? 'L2',
    });
  }

  // 4. Shadow tokens
  const shadowNameMapping: Record<string, string> = {
    'Flat': 'flat', 'Subtle': 'subtle', 'Low': 'low',
    'Medium': 'medium', 'Elevated': 'elevated',
    'High': 'high', 'Modal': 'modal',
  };
  for (const entry of data.shadows.levels) {
    const levelName = shadowNameMapping[entry.name] || entry.name.toLowerCase();
    const tokenName = `shadow-${levelName}`;
    tokenMap.shadows.set(tokenName, {
      boxShadow: entry.boxShadow,
      tokenName,
      stability: entry.stability ?? 'L2',
    });
  }

  // 5. Typography tokens
  for (const entry of data.typography.hierarchy) {
    const roleToToken: Record<string, string> = {
      'Display': 'display', 'H1': 'h1', 'H2': 'h2', 'H3': 'h3',
      'Subtitle': 'subtitle', 'H4': 'h4', 'Body Large': 'body-lg',
      'Body': 'body', 'H5': 'h5', 'Label': 'label', 'Body Compact': 'body-compact',
      'Caption': 'caption', 'Micro': 'micro',
    };
    const sizeName = roleToToken[entry.role] || entry.role.toLowerCase().replace(/\s+/g, '-');
    const tokenName = `type-${sizeName}`;
    tokenMap.typography.set(tokenName, {
      role: entry.role,
      tokenName,
      stability: entry.stability ?? 'L2',
    });
  }

  // 6. Component tokens
  const componentTypes = ['buttons', 'cards', 'inputs', 'navigation'] as const;
  for (const compType of componentTypes) {
    const items = data.components[compType];
    for (const item of items) {
      const variant = item.variant.toLowerCase().replace(/\s+/g, '-');
      const compTypeName = compType.replace(/s$/, ''); // buttons → button
      const styleEntries: [string, string | number | undefined][] = [
        ['bg', item.styles.backgroundColor],
        ['text', item.styles.color],
        ['border', item.styles.borderColor],
        ['radius', item.styles.borderRadius?.toString()],
        ['padding', item.styles.padding],
        ['shadow', item.styles.boxShadow],
      ];
      for (const [prop, val] of styleEntries) {
        if (val !== undefined && val !== 'transparent' && val !== 'none') {
          const tokenName = `color-component-${compTypeName}-${variant}-${prop}`;
          tokenMap.components.set(tokenName, {
            componentType: compTypeName,
            property: prop,
            tokenName,
            rawValue: String(val),
            stability: prop === 'bg' || prop === 'text' ? 'L1' : 'L2',
          });
        }
      }
    }
  }

  return tokenMap;
}

// Helper: lookup a color token by shade offset (e.g., primary-500 → primary-600)
export function lookupColorByShadeOffset(
  tokenMap: TokenNameMap,
  baseTokenName: string,
  shadeOffset: number
): ColorTokenEntry | undefined {
  const base = tokenMap.colors.get(baseTokenName);
  if (!base) return undefined;
  const targetShade = Math.max(50, Math.min(900, base.shade + shadeOffset * 100));
  return tokenMap.colors.get(`color-${base.hue}-${targetShade}`);
}

// Helper: find the closest color token for a given hex
export function findClosestColorToken(
  tokenMap: TokenNameMap,
  hex: string
): ColorTokenEntry | undefined {
  const parsed = parseHex(hex);
  if (!parsed) return undefined;

  const targetLab = rgbToLab(parsed.r, parsed.g, parsed.b);
  let closest: ColorTokenEntry | undefined;
  let minDist = Infinity;

  for (const entry of tokenMap.colors.values()) {
    const entryParsed = parseHex(entry.hex);
    if (!entryParsed) continue;
    const entryLab = rgbToLab(entryParsed.r, entryParsed.g, entryParsed.b);
    const dist = Math.sqrt(
      (targetLab.L - entryLab.L) ** 2 +
      (targetLab.a - entryLab.a) ** 2 +
      (targetLab.b - entryLab.b) ** 2
    );
    if (dist < minDist) {
      minDist = dist;
      closest = entry;
    }
  }
  return closest;
}

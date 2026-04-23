import type { AnalyzedPageData, StabilityLevel } from '../types/analyzed.js';

/**
 * Classify every token in AnalyzedPageData with a stability level.
 * Mutates the input in place for simplicity.
 *
 * L1 Infrastructure — permanent: primary/accent colors, font families, base unit
 * L2 System — redesign cycle: neutral scale, type hierarchy, spacing scale, components, shadows, radii
 * L3 Campaign — per-launch: low-frequency colors, hero-specific styles
 * L4 Content — constant change: image-derived colors, very low frequency one-offs
 */

function classifyColor(frequency: number, role: string): StabilityLevel {
  // Primary and accent are always L1
  if (role === 'primary' || role === 'accent') return 'L1';
  // Navigation colors are L1
  if (role.toLowerCase().includes('nav') || role.toLowerCase().includes('link')) return 'L1';
  // Very high frequency surface/structural colors are L1
  if (frequency >= 0.15 && (role.toLowerCase().includes('background') || role.toLowerCase().includes('surface'))) return 'L1';
  // Very low frequency = content noise
  if (frequency < 0.01) return 'L4';
  // Low frequency = campaign
  if (frequency < 0.03) return 'L3';
  // Everything else is system-level
  return 'L2';
}

function classifyNeutralColor(scalePosition: number): StabilityLevel {
  // Endpoints of neutral scale (0, 1000) are structural
  if (scalePosition <= 100 || scalePosition >= 900) return 'L1';
  return 'L2';
}

function classifyShadow(level: number, usage: string[]): StabilityLevel {
  // Level 0-1 (flat/subtle) are structural
  if (level <= 1) return 'L1';
  // Modal/high elevation typically more stable
  if (usage.some(u => u.toLowerCase().includes('modal') || u.toLowerCase().includes('overlay'))) return 'L2';
  return 'L2';
}

function stabilize(level: StabilityLevel | undefined, fallback: StabilityLevel): StabilityLevel {
  return level ?? fallback;
}

export function classifyStability(data: AnalyzedPageData): void {
  // Colors — primary & accent
  data.colors.primary.stability = stabilize(data.colors.primary.stability, 'L1');
  data.colors.accent.stability = stabilize(data.colors.accent.stability, 'L1');

  // Neutral scale
  for (const c of data.colors.neutralScale) {
    c.stability = classifyNeutralColor(c.scalePosition);
  }

  // Surface colors
  for (const c of data.colors.surface) {
    c.stability = classifyColor(c.frequency, c.role);
  }

  // Shadow colors
  for (const c of data.colors.shadows) {
    c.stability = c.frequency >= 0.1 ? 'L1' : 'L2';
  }

  // Semantic roles
  for (const [role, c] of Object.entries(data.colors.semanticRoles)) {
    c.stability = classifyColor(c.frequency, role);
  }

  // Typography hierarchy
  for (const h of data.typography.hierarchy) {
    // Display/H1 are more structural, body/caption are L1
    if (['Display', 'H1', 'Body', 'Body Large', 'Body Small'].includes(h.role)) {
      h.stability = 'L1';
    } else {
      h.stability = 'L2';
    }
  }

  // Spacing scale
  for (const s of data.spacing.scale) {
    // Base unit multiples are structural
    s.stability = s.multiplier <= 2 ? 'L1' : 'L2';
  }

  // Border radius
  for (const r of data.spacing.borderRadiusScale) {
    r.stability = 'L2';
  }

  // Shadows
  for (const s of data.shadows.levels) {
    s.stability = classifyShadow(s.level, s.usage);
  }
}

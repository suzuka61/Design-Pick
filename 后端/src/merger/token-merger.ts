import type { TokenNameMap, ColorTokenEntry, SpacingTokenEntry, RadiusTokenEntry, ShadowTokenEntry, TypographyTokenEntry, ComponentTokenEntry } from '../analyzer/token-namer.js';

export function mergeTokenMaps(a: TokenNameMap, b: TokenNameMap): TokenNameMap {
  const merged: TokenNameMap = {
    colors: new Map(),
    spacing: new Map(),
    radius: new Map(),
    shadows: new Map(),
    typography: new Map(),
    components: new Map(),
  };

  // Merge colors: prefer L1/L2 over L3/L4; if same token name with different values, keep higher stability
  for (const [key, entry] of a.colors) {
    const bEntry = b.colors.get(key);
    if (!bEntry) {
      merged.colors.set(key, entry);
    } else {
      // Same token name — keep the one with higher stability (L1 > L2 > L3 > L4)
      const stabilityOrder = ['L1', 'L2', 'L3', 'L4'];
      const aIdx = stabilityOrder.indexOf(entry.stability);
      const bIdx = stabilityOrder.indexOf(bEntry.stability);
      merged.colors.set(key, aIdx <= bIdx ? entry : bEntry);
    }
  }
  // Add unique tokens from b that aren't in a
  for (const [key, entry] of b.colors) {
    if (!merged.colors.has(key)) {
      merged.colors.set(key, entry);
    }
  }

  // Merge spacing: take union, prefer higher stability
  for (const [key, entry] of a.spacing) {
    const bEntry = b.spacing.get(key);
    if (!bEntry) {
      merged.spacing.set(key, entry);
    } else {
      const stabilityOrder = ['L1', 'L2', 'L3', 'L4'];
      const aIdx = stabilityOrder.indexOf(entry.stability);
      const bIdx = stabilityOrder.indexOf(bEntry.stability);
      merged.spacing.set(key, aIdx <= bIdx ? entry : bEntry);
    }
  }
  for (const [key, entry] of b.spacing) {
    if (!merged.spacing.has(key)) merged.spacing.set(key, entry);
  }

  // Merge radius: same strategy
  for (const [key, entry] of a.radius) {
    const bEntry = b.radius.get(key);
    merged.radius.set(key, !bEntry ? entry : (entry.stability === 'L1' ? entry : bEntry.stability === 'L1' ? bEntry : entry));
  }
  for (const [key, entry] of b.radius) {
    if (!merged.radius.has(key)) merged.radius.set(key, entry);
  }

  // Merge shadows: union, prefer higher stability
  for (const [key, entry] of a.shadows) {
    merged.shadows.set(key, entry);
  }
  for (const [key, entry] of b.shadows) {
    const existing = merged.shadows.get(key);
    if (!existing || entry.stability === 'L1') merged.shadows.set(key, entry);
  }

  // Merge typography: prefer higher stability
  for (const [key, entry] of a.typography) {
    merged.typography.set(key, entry);
  }
  for (const [key, entry] of b.typography) {
    if (!merged.typography.has(key)) merged.typography.set(key, entry);
  }

  // Merge components: take union (different components from different pages)
  for (const [key, entry] of a.components) {
    merged.components.set(key, entry);
  }
  for (const [key, entry] of b.components) {
    if (!merged.components.has(key)) merged.components.set(key, entry);
  }

  return merged;
}
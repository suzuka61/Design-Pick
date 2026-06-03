import type {
  ExtractedPageData,
  ComputedStyles,
  ExtractedElement,
} from '../types/extracted';
import type {
  AnalyzedColorPalette,
  SemanticColor,
  NeutralScaleColor,
  PageBackground,
} from '../types/analyzed';

interface ColorObservation {
  r: number; g: number; b: number; a: number;
  context: 'text' | 'background' | 'border' | 'shadow';
  elementCount: number;
  pixelArea: number;
  isBodyLevel: boolean;
}

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

  return {
    L: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function labDistance(a: LabColor, b: LabColor): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

function parseCSSColor(value: string): { r: number; g: number; b: number; a: number } | null {
  if (!value || value === 'none' || value === 'currentcolor' || value === 'inherit' || value === 'initial' || value === 'transparent') return null;

  const rgb = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (rgb) {
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: rgb[4] !== undefined ? +rgb[4] : 1 };
  }

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return { r: parseInt(h[0] + h[0], 16), g: parseInt(h[1] + h[1], 16), b: parseInt(h[2] + h[2], 16), a: 1 };
    }
    if (h.length === 6) {
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: 1 };
    }
  }
  return null;
}

function collectColors(body: ExtractedPageData['body']): ColorObservation[] {
  const colorMap = new Map<string, ColorObservation>();

  function addColor(
    cssValue: string,
    context: ColorObservation['context'],
    el: ExtractedElement,
    depth: number
  ) {
    const parsed = parseCSSColor(cssValue);
    if (!parsed) return;
    if (parsed.a < 0.05) return;

    // Determine if this is a body-level (page background) color
    const isBodyLevel = depth <= 2;

    // Pixel area for frequency weighting
    const pixelArea = el.boundingBox.width * el.boundingBox.height;

    // Quantize to 5-bit per channel for dedup (reduces noise from sub-pixel differences)
    const qr = Math.round(parsed.r / 8) * 8;
    const qg = Math.round(parsed.g / 8) * 8;
    const qb = Math.round(parsed.b / 8) * 8;
    const key = `${qr},${qg},${qb},${parsed.a.toFixed(1)},${context}`;

    const existing = colorMap.get(key);
    if (existing) {
      existing.elementCount++;
      existing.pixelArea += pixelArea;
      // Prefer non-body-level observations (more specific)
      if (!isBodyLevel) existing.isBodyLevel = false;
    } else {
      colorMap.set(key, {
        r: parsed.r, g: parsed.g, b: parsed.b, a: parsed.a,
        context,
        elementCount: 1,
        pixelArea,
        isBodyLevel,
      });
    }
  }

  function walk(el: ExtractedElement, depth: number) {
    const s = el.computedStyles;
    addColor(s.color, 'text', el, depth);
    addColor(s.backgroundColor, 'background', el, depth);
    addColor(s.borderColor || s.borderTopColor, 'border', el, depth);
    if (s.boxShadow && s.boxShadow !== 'none') {
      const shadowColors = s.boxShadow.match(/rgba?\([^)]+\)/g);
      if (shadowColors) {
        for (const sc of shadowColors) {
          addColor(sc, 'shadow', el, depth);
        }
      }
    }
    for (const child of el.children) {
      walk(child, depth + 1);
    }
  }

  walk(body, 0);
  return Array.from(colorMap.values());
}

// K-means++ initialization
function kmeansInit(observations: ColorObservation[], k: number): LabColor[] {
  const labs = observations.map(o => rgbToLab(o.r, o.g, o.b));
  const centers: LabColor[] = [labs[0]];

  for (let i = 1; i < k; i++) {
    const distances = labs.map(l =>
      Math.min(...centers.map(c => labDistance(l, c)))
    );
    const totalDist = distances.reduce((a, b) => a + b, 0);
    if (totalDist === 0) break;
    let r = Math.random() * totalDist;
    for (let j = 0; j < distances.length; j++) {
      r -= distances[j];
      if (r <= 0) {
        centers.push(labs[j]);
        break;
      }
    }
    if (centers.length <= i) centers.push(labs[labs.length - 1]);
  }
  return centers;
}

interface Cluster {
  center: LabColor;
  observations: ColorObservation[];
}

function kmeans(observations: ColorObservation[], k: number): Cluster[] {
  if (observations.length <= k) {
    return observations.map(o => ({
      center: rgbToLab(o.r, o.g, o.b),
      observations: [o],
    }));
  }

  let centers = kmeansInit(observations, k);
  const MAX_ITER = 50;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const clusters: Cluster[] = centers.map(c => ({ center: c, observations: [] }));

    for (const obs of observations) {
      const lab = rgbToLab(obs.r, obs.g, obs.b);
      let minDist = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < centers.length; i++) {
        const d = labDistance(lab, centers[i]);
        if (d < minDist) { minDist = d; bestIdx = i; }
      }
      clusters[bestIdx].observations.push(obs);
    }

    let converged = true;
    const newCenters: LabColor[] = [];
    for (const cluster of clusters) {
      if (cluster.observations.length === 0) {
        newCenters.push(cluster.center);
        continue;
      }
      // Weight by pixelArea for better center calculation
      const totalWeight = cluster.observations.reduce((s, o) => s + o.pixelArea, 0);
      const avgL = cluster.observations.reduce((s, o) => s + rgbToLab(o.r, o.g, o.b).L * o.pixelArea, 0) / totalWeight;
      const avga = cluster.observations.reduce((s, o) => s + rgbToLab(o.r, o.g, o.b).a * o.pixelArea, 0) / totalWeight;
      const avgb = cluster.observations.reduce((s, o) => s + rgbToLab(o.r, o.g, o.b).b * o.pixelArea, 0) / totalWeight;
      const newCenter: LabColor = { L: avgL, a: avga, b: avgb };
      if (labDistance(newCenter, cluster.center) > 0.5) converged = false;
      newCenters.push(newCenter);
    }

    centers = newCenters;
    if (converged) break;
  }

  // Final assignment
  const clusters: Cluster[] = centers.map(c => ({ center: c, observations: [] }));
  for (const obs of observations) {
    const lab = rgbToLab(obs.r, obs.g, obs.b);
    let minDist = Infinity;
    let bestIdx = 0;
    for (let i = 0; i < centers.length; i++) {
      const d = labDistance(lab, centers[i]);
      if (d < minDist) { minDist = d; bestIdx = i; }
    }
    clusters[bestIdx].observations.push(obs);
  }

  return clusters;
}

function isChromatic(lab: LabColor): boolean {
  return Math.abs(lab.a) > 8 || Math.abs(lab.b) > 8;
}

function assignSemanticRole(
  cluster: Cluster,
  allClusters: Cluster[]
): { role: string; name: string } {
  const { center } = cluster;

  // Use pixel area weighted frequency
  const totalArea = allClusters.reduce((s, c) => s + c.observations.reduce((s2, o) => s2 + o.pixelArea, 0), 0);
  const clusterArea = cluster.observations.reduce((s, o) => s + o.pixelArea, 0);
  const areaFreq = clusterArea / totalArea;

  // Use element count frequency (for text-dominated colors)
  const totalCount = allClusters.reduce((s, c) => s + c.observations.reduce((s2, o) => s2 + o.elementCount, 0), 0);
  const countFreq = cluster.observations.reduce((s, o) => s + o.elementCount, 0) / totalCount;

  const isNeutral = !isChromatic(center);
  const hasText = cluster.observations.some(o => o.context === 'text');
  const hasBg = cluster.observations.some(o => o.context === 'background');
  const nonBodyObs = cluster.observations.filter(o => !o.isBodyLevel);
  const isMostlyBodyLevel = nonBodyObs.length < cluster.observations.length * 0.3;

  if (isNeutral) {
    // Map neutral to a 1000-step scale
    const step = Math.round(center.L / 10) * 100;
    const clampedStep = Math.max(0, Math.min(1000, step));

    if (center.L > 95) {
      // Check if it's just the page background
      if (isMostlyBodyLevel && hasBg && !hasText) {
        return { role: 'Surface', name: `Neutral-${clampedStep}` };
      }
      return { role: `Neutral-${clampedStep}`, name: `Neutral-${clampedStep}` };
    }
    if (center.L > 80) return { role: `Neutral-${clampedStep}`, name: `Neutral-${clampedStep}` };
    if (center.L > 60) return { role: `Neutral-${clampedStep}`, name: `Neutral-${clampedStep}` };
    if (center.L > 40) return { role: `Neutral-${clampedStep}`, name: `Neutral-${clampedStep}` };
    if (center.L > 20) return { role: `Neutral-${clampedStep}`, name: `Neutral-${clampedStep}` };
    return { role: `Neutral-${clampedStep}`, name: `Neutral-${clampedStep}` };
  }

  // Chromatic colors — rank by combined frequency
  const combinedFreq = areaFreq * 0.4 + countFreq * 0.6;

  // High frequency chromatic = primary brand color
  if (combinedFreq > 0.08 && hasBg && !isMostlyBodyLevel) {
    return { role: 'Primary', name: 'Primary' };
  }

  // Moderate frequency or text-only chromatic = accent or semantic
  if (hasText && !hasBg) {
    // Text-only chromatic color — likely an interactive/semantic color
    if (center.a > 20 && center.b < -10) return { role: 'Link', name: 'Link Blue' };
    if (center.a > 30) return { role: 'Error', name: 'Error Red' };
    if (center.a < -15 && center.b > 15) return { role: 'Success', name: 'Success Green' };
    return { role: 'Accent', name: 'Accent' };
  }

  // Background chromatic = accent or feature color
  if (hasBg) return { role: 'Accent', name: 'Accent' };

  return { role: 'Accent', name: 'Accent' };
}

export function analyzeColors(pageData: ExtractedPageData): AnalyzedColorPalette {
  const observations = collectColors(pageData.body);

  // --- Detect actual page background ---
  // Strategy: prefer <html>/<body> explicit bg — UNLESS it's pure black,
  // which many dark sites set as a generic fallback while the real background
  // (dark navy, dark indigo, etc.) lives on a child element.
  // In that case, fall through to the largest-area DOM background observation.
  const bodyBgStr = pageData.body.computedStyles?.backgroundColor ?? '';
  const rootBgStr = pageData.htmlComputedStyles?.backgroundColor ?? '';
  const parseBg = (v: string): { r: number; g: number; b: number } | null => {
    const m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    const a = m[4] !== undefined ? +m[4] : 1;
    if (a < 0.05) return null; // truly transparent
    return { r: +m[1], g: +m[2], b: +m[3] };
  };
  const rootParsed = parseBg(rootBgStr) || parseBg(bodyBgStr);
  // Pure black (all channels ≤ 10) is often a generic fallback, not the real bg.
  // Sites like minimaxi use <html> background: #000 but the visual bg is dark navy.
  const isUntrustworthyBlack = rootParsed && rootParsed.r <= 10 && rootParsed.g <= 10 && rootParsed.b <= 10;
  const fallbackBg = (() => {
    if (observations.length === 0) return { r: 255, g: 255, b: 255 };
    // Pick the largest background observation by pixel area — regardless of depth.
    const bgObs = observations
      .filter(o => o.context === 'background')
      .sort((a, b) => b.pixelArea - a.pixelArea);
    return { r: bgObs[0]?.r ?? 255, g: bgObs[0]?.g ?? 255, b: bgObs[0]?.b ?? 255 };
  })();
  const bgRgb = (rootParsed && !isUntrustworthyBlack) ? rootParsed : fallbackBg;
  const bgLuminance = 0.299 * bgRgb.r + 0.587 * bgRgb.g + 0.114 * bgRgb.b;
  const isDark = bgLuminance < 128;
  // Body text color (used by Quick Reference). Read from body computed style;
  // fall back to the contrasting end of the page.
  const bodyTextStr = pageData.body.computedStyles?.color ?? '';
  const bodyTextRgb = (() => {
    const m = bodyTextStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
  })();
  const fallbackText = isDark ? { r: 255, g: 255, b: 255 } : { r: 26, g: 26, b: 46 };
  const textRgb = bodyTextRgb ?? fallbackText;
  const bodyBackground: PageBackground = {
    hex: rgbToHex(bgRgb.r, bgRgb.g, bgRgb.b),
    textHex: rgbToHex(textRgb.r, textRgb.g, textRgb.b),
    rgb: bgRgb,
    luminance: bgLuminance,
    isDark,
  };

  if (observations.length === 0) {
    const defaultColor: SemanticColor = {
      name: 'Default', hex: '#000000', rgb: { r: 0, g: 0, b: 0 },
      role: 'Primary', usage: ['Default'], frequency: 1,
    };
    return {
      primary: defaultColor,
      accent: defaultColor,
      neutralScale: [],
      surface: [],
      shadows: [],
      semanticRoles: {},
      bodyBackground,
    };
  }

  // Separate body-level background observations
  const bodyBgObs = observations.filter(o => o.isBodyLevel && o.context === 'background');
  const nonBodyObs = observations.filter(o => !(o.isBodyLevel && o.context === 'background' && o.pixelArea > 100000));

  // Use non-body observations for clustering (body bg skews the results)
  const clusteringObs = nonBodyObs.length > 5 ? nonBodyObs : observations;

  // Find best k using silhouette score
  let bestK = 8;
  let bestSilhouette = -1;
  for (let k = Math.min(6, clusteringObs.length); k <= Math.min(14, clusteringObs.length); k++) {
    const clusters = kmeans(clusteringObs, k);
    let totalSilhouette = 0;
    let silCount = 0;
    for (const cluster of clusters) {
      if (cluster.observations.length < 2) continue;
      for (const obs of cluster.observations) {
        const lab = rgbToLab(obs.r, obs.g, obs.b);
        const intraDist = cluster.observations
          .filter(o => o !== obs)
          .reduce((s, o) => s + labDistance(lab, rgbToLab(o.r, o.g, o.b)), 0)
          / Math.max(1, cluster.observations.length - 1);
        let minInterDist = Infinity;
        for (const other of clusters) {
          if (other === cluster || other.observations.length === 0) continue;
          const d = other.observations.reduce((s, o) => s + labDistance(lab, rgbToLab(o.r, o.g, o.b)), 0)
            / other.observations.length;
          if (d < minInterDist) minInterDist = d;
        }
        const sil = intraDist === 0 ? 1 : (minInterDist - intraDist) / Math.max(intraDist, minInterDist);
        totalSilhouette += sil;
        silCount++;
      }
    }
    const avgSil = silCount > 0 ? totalSilhouette / silCount : 0;
    if (avgSil > bestSilhouette) {
      bestSilhouette = avgSil;
      bestK = k;
    }
  }

  const clusters = kmeans(clusteringObs, bestK);

  // Sort clusters by pixel area weighted frequency (descending)
  clusters.sort((a, b) => {
    const areaA = a.observations.reduce((s, o) => s + o.pixelArea, 0);
    const areaB = b.observations.reduce((s, o) => s + o.pixelArea, 0);
    return areaB - areaA;
  });

  // Add back body background as a separate surface observation
  if (bodyBgObs.length > 0) {
    const bodyBgColor = bodyBgObs[0];
    const bodyCluster: Cluster = {
      center: rgbToLab(bodyBgColor.r, bodyBgColor.g, bodyBgColor.b),
      observations: bodyBgObs,
    };
    // Only add if not already captured
    const bodyHex = rgbToHex(bodyBgColor.r, bodyBgColor.g, bodyBgColor.b);
    const alreadyCaptured = clusters.some(c => {
      const cHex = rgbToHex(
        Math.round(c.observations.reduce((s, o) => s + o.r, 0) / c.observations.length),
        Math.round(c.observations.reduce((s, o) => s + o.g, 0) / c.observations.length),
        Math.round(c.observations.reduce((s, o) => s + o.b, 0) / c.observations.length)
      );
      return cHex === bodyHex;
    });
    if (!alreadyCaptured) {
      clusters.push(bodyCluster);
    }
  }

  let primary: SemanticColor | undefined;
  let accent: SemanticColor | undefined;
  const neutralScale: NeutralScaleColor[] = [];
  const surface: SemanticColor[] = [];
  const shadows: SemanticColor[] = [];
  const semanticRoles: Record<string, SemanticColor> = {};

  for (const cluster of clusters) {
    // Compute weighted average RGB
    const totalWeight = cluster.observations.reduce((s, o) => s + o.pixelArea, 0);
    const avgR = Math.round(cluster.observations.reduce((s, o) => s + o.r * o.pixelArea, 0) / totalWeight);
    const avgG = Math.round(cluster.observations.reduce((s, o) => s + o.g * o.pixelArea, 0) / totalWeight);
    const avgB = Math.round(cluster.observations.reduce((s, o) => s + o.b * o.pixelArea, 0) / totalWeight);
    const hex = rgbToHex(avgR, avgG, avgB);

    const totalCount = clusters.reduce((s, c) => s + c.observations.reduce((s2, o) => s2 + o.elementCount, 0), 0);
    const clusterCount = cluster.observations.reduce((s, o) => s + o.elementCount, 0);
    const frequency = clusterCount / totalCount;
    const usage = [...new Set(cluster.observations.map(o => o.context))];

    const { role, name } = assignSemanticRole(cluster, clusters);

    const color: SemanticColor = {
      name,
      hex,
      rgb: { r: avgR, g: avgG, b: avgB },
      role,
      usage,
      frequency,
    };

    if (role === 'Primary' && !primary) {
      primary = color;
    } else if (role === 'Accent' && !accent) {
      accent = color;
    } else if (role.startsWith('Neutral-')) {
      const scalePos = Math.round(cluster.center.L * 10);
      neutralScale.push({ ...color, scalePosition: scalePos });
    } else if (role === 'Surface') {
      surface.push(color);
    } else if (role === 'Shadow') {
      shadows.push(color);
    } else {
      semanticRoles[role.toLowerCase()] = color;
      if (!accent) accent = color;
    }
  }

  // Deduplicate neutral scale — keep closest to each 100-step
  const dedupedNeutral: NeutralScaleColor[] = [];
  const seenSteps = new Set<number>();
  for (const n of neutralScale) {
    const step = Math.round(n.scalePosition / 100) * 100;
    if (!seenSteps.has(step)) {
      seenSteps.add(step);
      dedupedNeutral.push(n);
    } else {
      // Keep the one with higher frequency
      const existing = dedupedNeutral.find(d => Math.round(d.scalePosition / 100) * 100 === step);
      if (existing && n.frequency > existing.frequency) {
        const idx = dedupedNeutral.indexOf(existing);
        dedupedNeutral[idx] = n;
      }
    }
  }
  dedupedNeutral.sort((a, b) => b.scalePosition - a.scalePosition);

  // --- Promote most-saturated chromatic to Primary if needed ---
  // The frequency-based primary detection often picks muted border/divider colors
  // when a brand color only appears on a few CTAs. Brand colors are recognizable
  // by HIGH chroma, so when no chromatic cluster won the frequency contest, promote
  // the chromatic cluster with the highest chroma that has any background usage.
  if (!primary) {
    const chromaticWithBg = clusters
      .filter(c => isChromatic(c.center) && c.observations.some(o => o.context === 'background'));
    if (chromaticWithBg.length > 0) {
      const sorted = [...chromaticWithBg].sort(
        (a, b) => (Math.abs(b.center.a) + Math.abs(b.center.b)) - (Math.abs(a.center.a) + Math.abs(a.center.b))
      );
      const top = sorted[0];
      const totalWeight = top.observations.reduce((s, o) => s + o.pixelArea, 0);
      const avgR = Math.round(top.observations.reduce((s, o) => s + o.r * o.pixelArea, 0) / totalWeight);
      const avgG = Math.round(top.observations.reduce((s, o) => s + o.g * o.pixelArea, 0) / totalWeight);
      const avgB = Math.round(top.observations.reduce((s, o) => s + o.b * o.pixelArea, 0) / totalWeight);
      const hex = rgbToHex(avgR, avgG, avgB);
      const totalCount = clusters.reduce((s, c) => s + c.observations.reduce((s2, o) => s2 + o.elementCount, 0), 0);
      primary = {
        name: 'Primary', hex, rgb: { r: avgR, g: avgG, b: avgB },
        role: 'Primary',
        usage: [...new Set(top.observations.map(o => o.context))],
        frequency: top.observations.reduce((s, o) => s + o.elementCount, 0) / totalCount,
      };
    }
  }

  return {
    primary: primary ?? {
      name: 'Default', hex: '#000000', rgb: { r: 0, g: 0, b: 0 },
      role: 'Primary', usage: ['Default'], frequency: 1,
    },
    accent: accent ?? {
      name: 'Default', hex: '#666666', rgb: { r: 102, g: 102, b: 102 },
      role: 'Accent', usage: ['Default'], frequency: 0.5,
    },
    neutralScale: dedupedNeutral,
    surface,
    shadows,
    semanticRoles,
    bodyBackground,
  };
}

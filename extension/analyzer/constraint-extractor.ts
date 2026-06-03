import type { AnalyzedPageData, Constraint, ExtractedConstraints } from '../types/analyzed';

/**
 * Extract implicit design constraints (Do's and Don'ts) from analyzed page data.
 * This is the "约束层" from the Skill doc — inferring hidden rules from what's NOT present.
 */
export function extractConstraints(analysis: AnalyzedPageData): ExtractedConstraints {
  const dos: Constraint[] = [];
  const donts: Constraint[] = [];

  // --- Typography constraints ---
  const fontStyleStats = collectFontStyles(analysis);
  const italicRatio = fontStyleStats.italic / fontStyleStats.total;
  if (italicRatio === 0 && fontStyleStats.total > 10) {
    donts.push({
      rule: '从不使用斜体（italic）',
      evidence: `0/${fontStyleStats.total} 文本元素使用 italic`,
      confidence: 0.9,
      source: 'typo',
    });
  } else if (italicRatio < 0.05 && fontStyleStats.total > 10) {
    donts.push({
      rule: '极少使用斜体，仅用于引用或特殊标注',
      evidence: `${fontStyleStats.italic}/${fontStyleStats.total} 文本元素使用 italic (${(italicRatio * 100).toFixed(1)}%)`,
      confidence: 0.7,
      source: 'typo',
    });
  }

  // Font weight constraints
  const usedWeights = fontStyleStats.uniqueWeights;
  if (usedWeights.length <= 3 && fontStyleStats.total > 10) {
    dos.push({
      rule: `使用 ${usedWeights.length} 档字重系统：${usedWeights.join('/')}`,
      evidence: `检测到 ${usedWeights.length} 种字重，覆盖 ${fontStyleStats.total} 个文本元素`,
      confidence: 0.85,
      source: 'typo',
    });
    const forbiddenWeights = [100, 200, 800, 900].filter(w => !usedWeights.includes(w));
    if (forbiddenWeights.length > 0) {
      donts.push({
        rule: `不使用 ${forbiddenWeights.join('/')} 字重`,
        evidence: `页面中未出现这些字重值`,
        confidence: 0.75,
        source: 'typo',
      });
    }
  }

  // Text transform constraints
  if (fontStyleStats.uppercaseRatio === 0 && fontStyleStats.total > 10) {
    donts.push({
      rule: '不使用全大写（uppercase）文字样式',
      evidence: `0/${fontStyleStats.total} 元素使用 text-transform: uppercase`,
      confidence: 0.8,
      source: 'typo',
    });
  } else if (fontStyleStats.uppercaseRatio > 0.3) {
    dos.push({
      rule: '标签和按钮文字使用全大写',
      evidence: `${(fontStyleStats.uppercaseRatio * 100).toFixed(0)}% 的文本元素使用 uppercase`,
      confidence: 0.7,
      source: 'typo',
    });
  }

  // --- Color constraints ---
  const chromaticHueCount = countChromaticHues(analysis);
  if (chromaticHueCount <= 2) {
    dos.push({
      rule: `限双色系统（${analysis.colors.primary.name} + ${analysis.colors.accent.name}）`,
      evidence: `检测到 ${chromaticHueCount} 种有彩色`,
      confidence: 0.85,
      source: 'color',
    });
    donts.push({
      rule: '不引入第三种有彩色，用中性色阶做层次区分',
      evidence: `页面只有 ${chromaticHueCount} 种有彩色`,
      confidence: 0.8,
      source: 'color',
    });
  } else if (chromaticHueCount <= 4) {
    dos.push({
      rule: `使用 ${chromaticHueCount} 色系统，主色占主导`,
      evidence: `检测到 ${chromaticHueCount} 种有彩色`,
      confidence: 0.7,
      source: 'color',
    });
  }

  // --- Spacing constraints ---
  const baseUnit = analysis.spacing.baseUnit;
  if (baseUnit > 0) {
    const coverage = computeSpacingCoverage(analysis);
    if (coverage >= 0.9) {
      dos.push({
        rule: `严格 ${baseUnit}px 网格系统，所有间距为基准倍数`,
        evidence: `${(coverage * 100).toFixed(0)}% 的间距值是 ${baseUnit}px 的整数倍`,
        confidence: 0.9,
        source: 'spacing',
      });
      donts.push({
        rule: `不使用非 ${baseUnit}px 倍数的间距值`,
        evidence: `间距覆盖率 ${(coverage * 100).toFixed(0)}%`,
        confidence: 0.85,
        source: 'spacing',
      });
    } else if (coverage >= 0.7) {
      dos.push({
        rule: `以 ${baseUnit}px 为基准的间距系统，允许少量偏差`,
        evidence: `${(coverage * 100).toFixed(0)}% 的间距值是 ${baseUnit}px 的整数倍`,
        confidence: 0.7,
        source: 'spacing',
      });
    }
  }

  // --- Shape (radius) constraints ---
  const uniqueRadii = analysis.spacing.borderRadiusScale.length;
  if (uniqueRadii <= 4) {
    dos.push({
      rule: `${uniqueRadii} 档圆角系统：${analysis.spacing.borderRadiusScale.map(r => r.name).join(' → ')}`,
      evidence: `检测到 ${uniqueRadii} 种圆角值`,
      confidence: 0.85,
      source: 'shape',
    });
    donts.push({
      rule: '不引入圆角系统之外的 border-radius 值',
      evidence: `圆角系统已覆盖 ${uniqueRadii} 个等级`,
      confidence: 0.75,
      source: 'shape',
    });
  }

  // --- Component constraints ---
  const buttonVariants = analysis.components.buttons.length;
  if (buttonVariants <= 2) {
    dos.push({
      rule: `双按钮样式系统（${analysis.components.buttons.map(b => b.variant).join(' + ')}）`,
      evidence: `检测到 ${buttonVariants} 种按钮变体`,
      confidence: 0.85,
      source: 'component',
    });
    donts.push({
      rule: '不创建第三种按钮样式，用状态变体代替',
      evidence: `只有 ${buttonVariants} 种按钮变体`,
      confidence: 0.8,
      source: 'component',
    });
  } else if (buttonVariants <= 4) {
    dos.push({
      rule: `${buttonVariants} 种按钮样式覆盖所有交互场景`,
      evidence: `检测到 ${buttonVariants} 种按钮变体`,
      confidence: 0.7,
      source: 'component',
    });
  }

  // Shadow constraints
  const shadowLevels = analysis.shadows.levels.length;
  if (shadowLevels <= 3) {
    dos.push({
      rule: `${shadowLevels} 层阴影深度系统`,
      evidence: `检测到 ${shadowLevels} 个阴影等级`,
      confidence: 0.8,
      source: 'shape',
    });
  }

  // Filter low-confidence
  return {
    dos: dos.filter(c => c.confidence >= 0.5),
    donts: donts.filter(c => c.confidence >= 0.5),
  };
}

// --- Helper functions ---

interface FontStyleStats {
  total: number;
  italic: number;
  uppercaseRatio: number;
  uniqueWeights: number[];
}

function collectFontStyles(analysis: AnalyzedPageData): FontStyleStats {
  const weights = new Set<number>();
  let total = 0;
  let italic = 0;
  let uppercase = 0;

  for (const entry of analysis.typography.hierarchy) {
    total++;
    weights.add(entry.weight);
    // We don't have fontStyle in hierarchy, so we infer from principles
  }

  // Check principles for italic mentions
  const principles = analysis.typography.principles;
  for (const p of principles) {
    if (p.toLowerCase().includes('italic')) italic = total; // if mentioned, assume some use
  }

  // Estimate uppercase from textTransform in hierarchy notes
  for (const entry of analysis.typography.hierarchy) {
    if (entry.notes.toLowerCase().includes('uppercase') || entry.notes.toLowerCase().includes('caps')) {
      uppercase++;
    }
  }

  return {
    total,
    italic,
    uppercaseRatio: total > 0 ? uppercase / total : 0,
    uniqueWeights: Array.from(weights).sort((a, b) => a - b),
  };
}

function countChromaticHues(analysis: AnalyzedPageData): number {
  // Count distinct chromatic color families (primary, accent, semantic roles)
  let count = 0;
  if (analysis.colors.primary.hex) count++;
  if (analysis.colors.accent.hex && analysis.colors.accent.hex !== analysis.colors.primary.hex) count++;
  for (const role of ['Error', 'Success', 'Warning', 'Info', 'Link']) {
    const c = analysis.colors.semanticRoles[role];
    if (c && c.hex !== analysis.colors.primary.hex && c.hex !== analysis.colors.accent.hex) count++;
  }
  return count;
}

function computeSpacingCoverage(analysis: AnalyzedPageData): number {
  const base = analysis.spacing.baseUnit;
  if (base <= 0) return 0;

  let totalValues = 0;
  let coveredValues = 0;

  for (const entry of analysis.spacing.scale) {
    totalValues++;
    if (entry.value % base === 0 || Math.abs(entry.value / base - Math.round(entry.value / base)) < 0.1) {
      coveredValues++;
    }
  }

  // Also check radius values
  for (const entry of analysis.spacing.borderRadiusScale) {
    totalValues++;
    if (entry.value % base === 0 || entry.value === 9999) coveredValues++;
  }

  return totalValues > 0 ? coveredValues / totalValues : 0;
}
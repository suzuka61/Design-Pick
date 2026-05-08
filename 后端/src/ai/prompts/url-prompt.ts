import type { AnalyzedPageData } from '../../types/analyzed.js';
import type { TokenNameMap } from '../../analyzer/token-namer.js';

export function buildURLUserPrompt(analysis: AnalyzedPageData, tokenMap?: TokenNameMap): string {
  const { colors, typography, spacing, components, shadows, responsive, visualTheme, motion, accessibility, brand } = analysis;

  const neutralScaleStr = colors.neutralScale.length > 0
    ? colors.neutralScale.map(c => `- ${c.role}: ${c.hex} [${c.stability ?? 'L2'}] (used in: ${c.usage.join(', ')})${c.tokenName ? ` → ${c.tokenName}` : ''}`).join('\n')
    : '- No neutral scale detected';

  const surfaceStr = colors.surface.length > 0
    ? colors.surface.map(c => `- ${c.name}: ${c.hex} [${c.stability ?? 'L2'}] (${c.role})${c.tokenName ? ` → ${c.tokenName}` : ''}`).join('\n')
    : '- No surface colors detected';

  const shadowStr = colors.shadows.length > 0
    ? colors.shadows.map(c => `- ${c.name}: ${c.hex} [${c.stability ?? 'L2'}] (frequency: ${(c.frequency * 100).toFixed(0)}%)`).join('\n')
    : '- No shadow colors detected';

  const semanticStr = Object.entries(colors.semanticRoles).length > 0
    ? Object.entries(colors.semanticRoles).map(([role, c]) => `- ${role}: ${c.hex} [${c.stability ?? 'L2'}]`).join('\n')
    : '- No semantic roles detected';

  const fontFamiliesStr = typography.fontFamilies.map(f =>
    `- ${f.name} (${f.category}): weights [${f.weights.join(', ')}], used for: ${f.usage.join(', ')}`
  ).join('\n');

  const hierarchyStr = typography.hierarchy.map(h =>
    `- ${h.role}: ${h.font} ${h.size}px/${h.weight}/${h.lineHeight}px tracking:${h.letterSpacing}em [${h.stability ?? 'L2'}] — ${h.notes}${h.tokenName ? ` → ${h.tokenName}` : ''}`
  ).join('\n');

  const scaleStr = spacing.scale.map(s =>
    `- ${s.name}: ${s.value}px (${s.multiplier}x base) [${s.stability ?? 'L2'}] — ${s.usage.join(', ')}${s.tokenName ? ` → ${s.tokenName}` : ''}`
  ).join('\n');

  const radiusStr = spacing.borderRadiusScale.map(r =>
    `- ${r.name}: ${r.value}px [${r.stability ?? 'L2'}] — ${r.usage.join(', ')}${r.tokenName ? ` → ${r.tokenName}` : ''}`
  ).join('\n');

  const buttonsStr = components.buttons.map(b => {
    const states = [];
    if (b.states.hover) states.push(`hover: ${JSON.stringify(b.states.hover)}`);
    if (b.states.focus) states.push(`focus: ${JSON.stringify(b.states.focus)}`);
    if (b.states.focusVisible) states.push(`focus-visible: ${JSON.stringify(b.states.focusVisible)}`);
    if (b.states.active) states.push(`active: ${JSON.stringify(b.states.active)}`);
    if (b.states.disabled) states.push(`disabled: ${JSON.stringify(b.states.disabled)}`);
    if (b.states.loading) states.push(`loading: ${JSON.stringify(b.states.loading)}`);
    if (b.states.error) states.push(`error: ${JSON.stringify(b.states.error)}`);
    const edgeStr = b.edgeCases ? ` | edges: longContent=${b.edgeCases.longContent}, overflow=${b.edgeCases.overflow}, emptyState=${b.edgeCases.emptyState}` : '';
    return `- ${b.variant}: bg=${b.styles.backgroundColor || 'transparent'} color=${b.styles.color} radius=${b.styles.borderRadius}px padding=${b.styles.padding} font=${b.styles.fontFamily} ${b.styles.fontSize}px/${b.styles.fontWeight}${b.styles.transitionDuration ? ` transition=${b.styles.transitionDuration}` : ''}${states.length ? ` | states: ${states.join('; ')}` : ''}${edgeStr}`;
  }).join('\n');

  const cardsStr = components.cards.map(c => `- ${c.variant}: bg=${c.styles.backgroundColor} radius=${c.styles.borderRadius}px padding=${c.styles.padding} shadow=${c.styles.boxShadow || 'none'}`).join('\n');

  const inputsStr = components.inputs.map(i => `- ${i.variant}: bg=${i.styles.backgroundColor} border=${i.styles.borderColor} ${i.styles.borderWidth} radius=${i.styles.borderRadius}px`).join('\n');

  const navStr = components.navigation.map(n => `- ${n.variant}: bg=${n.styles.backgroundColor} color=${n.styles.color}`).join('\n');

  const shadowLevelsStr = shadows.levels.map(s =>
    `- Level ${s.level} (${s.name}): ${s.boxShadow} [${s.stability ?? 'L2'}] — ${s.usage.join(', ')}${s.tokenName ? ` → ${s.tokenName}` : ''}`
  ).join('\n');

  const breakpointsStr = responsive.breakpoints.map(b =>
    `- ${b.name}: ${b.minWidth}px${b.maxWidth ? '-' + b.maxWidth + 'px' : '+'} — ${b.description}`
  ).join('\n');

  // Motion data
  const durationsStr = motion.durations.length > 0
    ? motion.durations.map(d => `- ${d.name}: ${d.value} — ${d.usage.join(', ')}`).join('\n')
    : '- No durations detected';

  const easingsStr = motion.easings.length > 0
    ? motion.easings.map(e => `- ${e.name}: ${e.value} — ${e.usage.join(', ')}`).join('\n')
    : '- No easings detected';

  const transitionsStr = motion.transitions.length > 0
    ? motion.transitions.map(t => `- ${t.property}: ${t.duration} ${t.easing}`).join('\n')
    : '- No transitions detected';

  // Accessibility data
  const contrastStr = accessibility.contrastRatios.length > 0
    ? accessibility.contrastRatios.map(c => `- ${c.element}: fg=${c.foreground} bg=${c.background} ratio=${c.ratio} ${c.passes ? '✅ PASS' : '❌ FAIL'}`).join('\n')
    : '- No contrast ratios computed';

  const focusStr = accessibility.focusIndicators.length > 0
    ? accessibility.focusIndicators.map(f => `- ${f}`).join('\n')
    : '- No focus indicators detected';

  const keyboardStr = accessibility.keyboardPatterns.length > 0
    ? accessibility.keyboardPatterns.map(k => `- ${k}`).join('\n')
    : '- No keyboard patterns detected';

  const ariaStr = accessibility.ariaUsage.length > 0
    ? accessibility.ariaUsage.map(a => `- ${a}`).join('\n')
    : '- No ARIA usage detected';

  // Build token mapping section if available
  let tokenSection = '';
  if (tokenMap) {
    tokenSection = `\n### Pre-Computed Token Names\n\nUse these exact token names in your output. They are pre-computed from the extracted data.\n\n`;

    // Color tokens — group by hue
    const hues = new Map<string, Map<number, string>>();
    for (const entry of tokenMap.colors.values()) {
      if (!hues.has(entry.hue)) hues.set(entry.hue, new Map());
      hues.get(entry.hue)!.set(entry.shade, `${entry.tokenName}: ${entry.hex} [${entry.stability}]`);
    }
    for (const [hueName, shades] of hues) {
      tokenSection += `**${hueName} Scale**:\n`;
      for (const [shade, line] of shades) {
        tokenSection += `- ${line}\n`;
      }
      tokenSection += '\n';
    }

    // Spacing tokens
    if (tokenMap.spacing.size > 0) {
      tokenSection += '**Spacing Tokens**:\n';
      for (const entry of tokenMap.spacing.values()) {
        tokenSection += `- ${entry.tokenName}: ${entry.value}px [${entry.stability}]\n`;
      }
      tokenSection += '\n';
    }

    // Radius tokens
    if (tokenMap.radius.size > 0) {
      tokenSection += '**Radius Tokens**:\n';
      for (const entry of tokenMap.radius.values()) {
        tokenSection += `- ${entry.tokenName}: ${entry.value}px [${entry.stability}]\n`;
      }
      tokenSection += '\n';
    }

    // Shadow tokens
    if (tokenMap.shadows.size > 0) {
      tokenSection += '**Shadow Tokens**:\n';
      for (const entry of tokenMap.shadows.values()) {
        tokenSection += `- ${entry.tokenName}: ${entry.boxShadow} [${entry.stability}]\n`;
      }
      tokenSection += '\n';
    }

    // Typography tokens
    if (tokenMap.typography.size > 0) {
      tokenSection += '**Typography Tokens**:\n';
      for (const entry of tokenMap.typography.values()) {
        tokenSection += `- ${entry.tokenName}: ${entry.role} [${entry.stability}]\n`;
      }
      tokenSection += '\n';
    }

    // Component tokens
    if (tokenMap.components.size > 0) {
      tokenSection += '**Component Tokens**:\n';
      for (const entry of tokenMap.components.values()) {
        tokenSection += `- ${entry.tokenName}: ${entry.rawValue} [${entry.stability}]\n`;
      }
      tokenSection += '\n';
    }
  }

  return `Analyze this webpage's design system and produce a DESIGN.md document with systematic token naming and quality gates.

## Extracted Design Data

### Brand Context
Product Name: ${brand.productName || 'Unknown — infer from design'}
Audience: ${brand.audience || 'Unknown — infer from visual language'}
Product Surface: ${brand.productSurface.length > 0 ? brand.productSurface.join(', ') : 'web app'}

### Visual Theme
Philosophy: ${visualTheme.philosophy}
Emotional Tone: ${visualTheme.emotionalTone.join(', ')}
Key Characteristics: ${visualTheme.keyCharacteristics.join(', ')}
Dark Mode: ${visualTheme.darkMode}

### Colors
Primary: ${colors.primary.name} (${colors.primary.hex})
Accent: ${colors.accent.name} (${colors.accent.hex})

Neutral Scale:
${neutralScaleStr}

Surface Colors:
${surfaceStr}

Shadow Colors:
${shadowStr}

Semantic Roles:
${semanticStr}

### Typography
Font Families:
${fontFamiliesStr}

Typography Hierarchy:
${hierarchyStr}

Principles:
${typography.principles.map(p => `- ${p}`).join('\n')}

### Spacing
Base Unit: ${spacing.baseUnit}px
Scale:
${scaleStr}

Grid: ${spacing.gridSystem.type}, max-width ${spacing.gridSystem.containerMaxWidth}px, ${spacing.gridSystem.columns} columns
Whitespace: ${spacing.whitespacePhilosophy}
Border Radius:
${radiusStr}

### Components
Buttons:
${buttonsStr || '- No buttons detected'}

Cards:
${cardsStr || '- No cards detected'}

Inputs:
${inputsStr || '- No inputs detected'}

Navigation:
${navStr || '- No navigation detected'}

### Shadows
${shadowLevelsStr || '- No shadows detected'}
Philosophy: ${shadows.philosophy}

### Motion & Transitions
Durations:
${durationsStr}
Easings:
${easingsStr}
Transitions:
${transitionsStr}

### Accessibility
Contrast Ratios:
${contrastStr}
Focus Indicators:
${focusStr}
Keyboard Patterns:
${keyboardStr}
ARIA Usage:
${ariaStr}

### Responsive
Breakpoints:
${breakpointsStr || '- Default breakpoints (no media queries detected)'}
Touch Targets: min ${responsive.touchTargets.minSize}px, recommended ${responsive.touchTargets.recommendedSize}px
Collapsing: ${responsive.collapsingStrategy}
${tokenSection}
I have also attached screenshots of the page for visual reference. Please generate the complete 15-section DESIGN.md using the token naming system and quality gates described in the system prompt. Use the pre-computed token names where provided.`;
}
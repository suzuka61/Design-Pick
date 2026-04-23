import type { AnalyzedPageData } from '../../types/analyzed.js';

export function buildURLUserPrompt(analysis: AnalyzedPageData): string {
  const { colors, typography, spacing, components, shadows, responsive, visualTheme } = analysis;

  const neutralScaleStr = colors.neutralScale.length > 0
    ? colors.neutralScale.map(c => `- ${c.role}: ${c.hex} [${c.stability ?? 'L2'}] (used in: ${c.usage.join(', ')})`).join('\n')
    : '- No neutral scale detected';

  const surfaceStr = colors.surface.length > 0
    ? colors.surface.map(c => `- ${c.name}: ${c.hex} [${c.stability ?? 'L2'}] (${c.role})`).join('\n')
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
    `- ${h.role}: ${h.font} ${h.size}px/${h.weight}/${h.lineHeight}px tracking:${h.letterSpacing}em [${h.stability ?? 'L2'}] — ${h.notes}`
  ).join('\n');

  const scaleStr = spacing.scale.map(s =>
    `- ${s.name}: ${s.value}px (${s.multiplier}x base) [${s.stability ?? 'L2'}] — ${s.usage.join(', ')}`
  ).join('\n');

  const radiusStr = spacing.borderRadiusScale.map(r =>
    `- ${r.name}: ${r.value}px [${r.stability ?? 'L2'}] — ${r.usage.join(', ')}`
  ).join('\n');

  const buttonsStr = components.buttons.map(b =>
    `- ${b.variant}: bg=${b.styles.backgroundColor || 'transparent'} color=${b.styles.color} radius=${b.styles.borderRadius}px padding=${b.styles.padding} font=${b.styles.fontFamily} ${b.styles.fontSize}px/${b.styles.fontWeight}`
  ).join('\n');

  const cardsStr = components.cards.map(c =>
    `- ${c.variant}: bg=${c.styles.backgroundColor} radius=${c.styles.borderRadius}px padding=${c.styles.padding} shadow=${c.styles.boxShadow || 'none'}`
  ).join('\n');

  const inputsStr = components.inputs.map(i =>
    `- ${i.variant}: bg=${i.styles.backgroundColor} border=${i.styles.borderColor} ${i.styles.borderWidth} radius=${i.styles.borderRadius}px`
  ).join('\n');

  const navStr = components.navigation.map(n =>
    `- ${n.variant}: bg=${n.styles.backgroundColor} color=${n.styles.color}`
  ).join('\n');

  const shadowLevelsStr = shadows.levels.map(s =>
    `- Level ${s.level} (${s.name}): ${s.boxShadow} [${s.stability ?? 'L2'}] — ${s.usage.join(', ')}`
  ).join('\n');

  const breakpointsStr = responsive.breakpoints.map(b =>
    `- ${b.name}: ${b.minWidth}px${b.maxWidth ? '-' + b.maxWidth + 'px' : '+'} — ${b.description}`
  ).join('\n');

  return `Analyze this webpage's design system and produce a DESIGN.md document.

## Extracted Design Data

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

### Responsive
Breakpoints:
${breakpointsStr || '- Default breakpoints (no media queries detected)'}
Touch Targets: min ${responsive.touchTargets.minSize}px, recommended ${responsive.touchTargets.recommendedSize}px
Collapsing: ${responsive.collapsingStrategy}

I have also attached screenshots of the page for visual reference. Please generate the complete 9-section DESIGN.md.`;
}

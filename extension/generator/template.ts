import type { AnalyzedPageData, TokenMapping, ExtractedConstraints } from '../types/analyzed';
import type { TokenNameMap } from '../analyzer/token-namer';
import type { DesignMDDocument } from '../types/design-md';

/**
 * Template-based DESIGN.md generator — no AI required.
 * Produces the 15-section format from analyzed data + token map + mapping + constraints.
 */
export function generateDesignMD(
  analysis: AnalyzedPageData,
  tokenMap: TokenNameMap,
  mapping: TokenMapping,
  constraints: ExtractedConstraints,
  sourceUrl?: string,
): DesignMDDocument {
  const sections = {
    mission: generateMission(analysis),
    brand: generateBrand(analysis),
    visualTheme: generateVisualTheme(analysis),
    colorPalette: generateColorPalette(analysis, tokenMap, mapping),
    typography: generateTypography(analysis, tokenMap),
    componentStylings: generateComponents(analysis, tokenMap, mapping),
    layoutPrinciples: generateLayout(analysis, tokenMap),
    depthAndElevation: generateElevation(analysis, tokenMap),
    accessibility: generateAccessibility(analysis),
    motionAndTransitions: generateMotion(analysis),
    dosAndDonts: generateDosAndDonts(constraints, analysis),
    responsiveBehavior: generateResponsive(analysis),
    antiPatterns: generateAntiPatterns(constraints, analysis),
    qaChecklist: generateQAChecklist(),
    agentPromptGuide: generateAgentGuide(analysis, tokenMap),
  };

  const rawMarkdown = Object.entries(sections)
    .map(([key, content], i) => `## ${i + 1}. ${sectionTitle(key)}\n\n${content}`)
    .join('\n\n');

  const sourceName = sourceUrl
    ? (() => { try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; } })()
    : 'Design System';

  return {
    sourceUrl,
    generatedAt: new Date().toISOString(),
    frontmatter: {
      name: `${sourceName} 设计风格分析`,
      description: `${analysis.visualTheme.philosophy}`,
    },
    sections,
    rawMarkdown,
  };
}

const SECTION_TITLES: Record<string, string> = {
  mission: 'Mission',
  brand: 'Brand Context',
  visualTheme: 'Visual Theme & Atmosphere',
  colorPalette: 'Color Palette & Roles',
  typography: 'Typography Rules',
  componentStylings: 'Component Stylings',
  layoutPrinciples: 'Layout Principles',
  depthAndElevation: 'Depth & Elevation',
  accessibility: 'Accessibility',
  motionAndTransitions: 'Motion & Transitions',
  dosAndDonts: "Do's and Don'ts",
  responsiveBehavior: 'Responsive Behavior',
  antiPatterns: 'Anti-Patterns',
  qaChecklist: 'QA Checklist',
  agentPromptGuide: 'Agent Prompt Guide',
};

function sectionTitle(key: string): string {
  return SECTION_TITLES[key] || key;
}

// --- Section generators ---

function generateMission(a: AnalyzedPageData): string {
  const tone = a.visualTheme.emotionalTone.join(', ');
  return `**Mission:** Deliver a ${tone.toLowerCase()} interface that makes ${a.brand.audience.toLowerCase()} interactions intuitive and efficient, while giving developers a token-driven system that eliminates guesswork.`;
}

function generateBrand(a: AnalyzedPageData): string {
  return `- **Product Name:** ${a.brand.productName}\n- **Audience:** ${a.brand.audience}\n- **Product Surface:** ${a.brand.productSurface.join(', ')}`;
}

function generateVisualTheme(a: AnalyzedPageData): string {
  return `**Philosophy:** ${a.visualTheme.philosophy}\n\n**Emotional Tone:** ${a.visualTheme.emotionalTone.join(', ')}\n\n**Key Characteristics:** ${a.visualTheme.keyCharacteristics.join(', ')}\n\n${a.visualTheme.darkMode ? 'This design system operates in dark mode by default, using elevation and contrast to create visual hierarchy.' : 'This design system uses a light, spacious approach with clear visual hierarchy and restrained decoration.'}`;
}

function generateColorPalette(a: AnalyzedPageData, tokenMap: TokenNameMap, mapping: TokenMapping): string {
  let md = '';

  // Group color tokens by hue
  const hues = new Map<string, Array<{ shade: number; tokenName: string; hex: string; stability: string }>>();
  for (const entry of tokenMap.colors.values()) {
    if (!hues.has(entry.hue)) hues.set(entry.hue, []);
    hues.get(entry.hue)!.push({ shade: entry.shade, tokenName: entry.tokenName, hex: entry.hex, stability: entry.stability });
  }

  const hueOrder = ['primary', 'accent', 'neutral', 'success', 'warning', 'error', 'info', 'link'];
  const sortedHues = [...hues.entries()].sort((a, b) => {
    const ai = hueOrder.indexOf(a[0]);
    const bi = hueOrder.indexOf(b[0]);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const [hueName, entries] of sortedHues) {
    entries.sort((a, b) => a.shade - b.shade);
    md += `### ${hueName.charAt(0).toUpperCase() + hueName.slice(1)} Scale (color-${hueName})\n\n`;
    md += `| Token | Hex | Shade | Stability | Role |\n|-------|-----|-------|-----------|------|\n`;

    for (const e of entries) {
      // Find mapping for this token
      const usages = mapping.tokenToUsage.get(e.tokenName);
      const role = usages?.map(u => u.scenario).join(', ') || shadeRole(e.shade);
      md += `| ${e.tokenName} | ${e.hex} | ${e.shade} | [${e.stability}] | ${role} |\n`;
    }
    md += '\n';
  }

  // Quick reference — driven by the ACTUAL body background, not hardcoded token names.
  // Without this, light-theme sites (white bg) and dark-theme sites (black bg) both
  // get the same neutral-50 / neutral-90 labels, which is wrong.
  const isDark = a.colors.bodyBackground?.isDark ?? false;
  const bgHex = a.colors.bodyBackground?.hex ?? '#ffffff';
  // For text, prefer the actual body text color stored in bodyBackground, else the
  // farthest-end neutral in the scale (opposite of bg), else a sensible fallback.
  const textHex = a.colors.bodyBackground?.textHex
    ?? (isDark
      ? a.colors.neutralScale.find(n => n.scalePosition >= 800)?.hex ?? '#ffffff'
      : a.colors.neutralScale.find(n => n.scalePosition <= 200)?.hex ?? '#1a1a2e');
  // For a light theme, bg is the LIGHTEST neutral and text is the DARKEST (and vice versa).
  const bgShade = isDark ? 900 : 50;
  const textShade = isDark ? 50 : 900;
  md += `### Quick Reference\n`;
  md += `- Primary: ${a.colors.primary.tokenName || 'color-primary-500'} (${a.colors.primary.hex}) [L1]\n`;
  md += `- Accent: ${a.colors.accent.tokenName || 'color-accent-500'} (${a.colors.accent.hex}) [L1]\n`;
  md += `- Background: color-neutral-${bgShade} (${bgHex}) [L1]\n`;
  md += `- Text: color-neutral-${textShade} (${textHex}) [L1]\n`;
  md += `- Border: color-neutral-200 (${a.colors.neutralScale.find(n => n.scalePosition <= 300)?.hex || '#e5e5e5'}) [L2]\n`;

  return md;
}

function shadeRole(shade: number): string {
  if (shade <= 100) return 'Lightest tint';
  if (shade <= 200) return 'Hover background';
  if (shade <= 300) return 'Disabled background';
  if (shade <= 400) return 'Focus ring';
  if (shade === 500) return 'Default interactive';
  if (shade <= 600) return 'Hover state';
  if (shade <= 700) return 'Active/pressed';
  if (shade <= 800) return 'Deep emphasis';
  return 'Deepest shade';
}

function generateTypography(a: AnalyzedPageData, tokenMap: TokenNameMap): string {
  let md = `### Font Families\n`;

  for (const f of a.typography.fontFamilies) {
    const category = f.category;
    const label = category === 'sans-serif' ? 'Primary' : category === 'monospace' ? 'Monospace' : category === 'serif' ? 'Serif' : 'Display';
    const token = category === 'sans-serif' ? 'type-family-primary' : category === 'monospace' ? 'type-family-mono' : `type-family-${category}`;
    md += `- **${label}**: \`${f.name}\`, fallbacks: ${f.fallbacks.join(', ')} [L1] → ${token}\n`;
  }

  md += `\n### Hierarchy\n\n`;
  md += `| Token | Role | Font | Size | Weight | Line Height | Letter Spacing | Stability | Notes |\n`;
  md += `|-------|------|------|------|--------|-------------|----------------|-----------|-------|\n`;

  for (const h of a.typography.hierarchy) {
    const token = h.tokenName || `type-${h.role.toLowerCase()}`;
    const stability = h.stability || 'L2';
    md += `| ${token} | ${h.role} | ${h.font} | ${h.size}px | ${h.weight} | ${h.lineHeight}px | ${h.letterSpacing}em | [${stability}] | ${h.notes} |\n`;
  }

  md += `\n### Principles\n`;
  for (const p of a.typography.principles) {
    md += `- ${p}\n`;
  }

  return md;
}

function generateComponents(a: AnalyzedPageData, tokenMap: TokenNameMap, mapping: TokenMapping): string {
  let md = '';

  // Buttons
  if (a.components.buttons.length > 0) {
    md += `### Buttons\n\n`;
    for (const b of a.components.buttons) {
      md += `#### ${b.variant} Button\n\n`;
      md += `| Rule | Token | Value | Stability |\n|------|-------|-------|-----------|\n`;

      const bgStability = b.variant === 'Primary' ? 'L1' : 'L2';
      if (b.styles.backgroundColor) {
        const bgToken = findMappingToken(mapping, `${b.variant.toLowerCase()}-button-background`) || `color-component-button-${b.variant.toLowerCase()}-bg`;
        md += `| Background | ${bgToken} | ${b.styles.backgroundColor} | [${bgStability}] |\n`;
      }
      if (b.styles.color) {
        md += `| Text | color-component-button-${b.variant.toLowerCase()}-text | ${b.styles.color} | [${bgStability}] |\n`;
      }
      if (b.styles.borderRadius) {
        md += `| Border-radius | radius-component-button | radius-md (${b.styles.borderRadius}px) | [L2] |\n`;
      }
      if (b.styles.padding) {
        md += `| Padding | spacing-component-button | spacing-sm spacing-md (${b.styles.padding}) | [L2] |\n`;
      }
      if (b.styles.fontFamily) {
        md += `| Font | type-component-button | type-body (${b.styles.fontSize || 16}px/${b.styles.fontWeight || 500}) | [L1] |\n`;
      }

      // States
      md += `\n**States**:\n| State | Changes |\n|-------|---------|\n`;
      md += `| Default | base styles as defined above |\n`;
      if (b.states.hover) md += `| Hover | ${formatStateChanges(b.states.hover)} |\n`;
      if (b.states.focus) md += `| Focus | ${formatStateChanges(b.states.focus)} |\n`;
      if (b.states.focusVisible) md += `| Focus-visible | ${formatStateChanges(b.states.focusVisible)} |\n`;
      if (b.states.active) md += `| Active | ${formatStateChanges(b.states.active)} |\n`;
      if (b.states.disabled) md += `| Disabled | ${formatStateChanges(b.states.disabled)} |\n`;
      if (b.states.loading) md += `| Loading | ${formatStateChanges(b.states.loading)} |\n`;
      if (b.states.error) md += `| Error | ${formatStateChanges(b.states.error)} |\n`;

      // Edge cases
      if (b.edgeCases) {
        md += `\n**Edge Cases**:\n`;
        if (b.edgeCases.longContent) md += `- **Long content**: ${b.edgeCases.longContent}\n`;
        if (b.edgeCases.overflow) md += `- **Overflow**: ${b.edgeCases.overflow}\n`;
        if (b.edgeCases.emptyState) md += `- **Empty state**: ${b.edgeCases.emptyState}\n`;
      }
      md += '\n';
    }
  }

  // Cards
  if (a.components.cards.length > 0) {
    md += `### Cards\n\n`;
    for (const c of a.components.cards) {
      md += `#### ${c.variant} Card\n\n`;
      md += `| Rule | Token | Value | Stability |\n|------|-------|-------|-----------|\n`;
      if (c.styles.backgroundColor) md += `| Background | color-component-card-${c.variant.toLowerCase()}-bg | ${c.styles.backgroundColor} | [L2] |\n`;
      if (c.styles.borderRadius) md += `| Border-radius | radius-component-card | radius-lg (${c.styles.borderRadius}px) | [L2] |\n`;
      if (c.styles.padding) md += `| Padding | spacing-component-card | spacing-lg (${c.styles.padding}) | [L2] |\n`;
      if (c.styles.boxShadow) md += `| Shadow | shadow-component-card | shadow-low | [L2] |\n`;
      md += '\n';
    }
  }

  // Inputs
  if (a.components.inputs.length > 0) {
    md += `### Inputs\n\n`;
    for (const i of a.components.inputs) {
      md += `#### ${i.variant} Input\n\n`;
      md += `| Rule | Token | Value | Stability |\n|------|-------|-------|-----------|\n`;
      if (i.styles.backgroundColor) md += `| Background | color-component-input-${i.variant.toLowerCase()}-bg | ${i.styles.backgroundColor} | [L2] |\n`;
      if (i.styles.borderColor) md += `| Border | color-component-input-${i.variant.toLowerCase()}-border | ${i.styles.borderColor} | [L2] |\n`;
      if (i.styles.borderRadius) md += `| Border-radius | radius-component-input | radius-md (${i.styles.borderRadius}px) | [L2] |\n`;
      md += '\n';
    }
  }

  // Navigation
  if (a.components.navigation.length > 0) {
    md += `### Navigation\n\n`;
    for (const n of a.components.navigation) {
      md += `#### ${n.variant} Navigation\n\n`;
      md += `| Rule | Token | Value | Stability |\n|------|-------|-------|-----------|\n`;
      if (n.styles.backgroundColor) md += `| Background | color-component-nav-${n.variant.toLowerCase()}-bg | ${n.styles.backgroundColor} | [L1] |\n`;
      if (n.styles.color) md += `| Text | color-component-nav-${n.variant.toLowerCase()}-text | ${n.styles.color} | [L1] |\n`;
      md += '\n';
    }
  }

  return md;
}

function generateLayout(a: AnalyzedPageData, tokenMap: TokenNameMap): string {
  let md = `### Spacing Tokens\n\n`;
  md += `| Token | Value | Base Multiplier | Stability | Usage |\n|-------|-------|-----------------|-----------|-------|\n`;

  for (const entry of tokenMap.spacing.values()) {
    md += `| ${entry.tokenName} | ${entry.value}px | ${entry.value / a.spacing.baseUnit}x | [${entry.stability}] | ${entry.tokenName.replace('spacing-', '')} spacing |\n`;
  }

  md += `\nBase unit: ${a.spacing.baseUnit}px [L1]\n\n`;

  md += `### Grid/Container\n`;
  md += `- Max width: ${a.spacing.gridSystem.containerMaxWidth}px [L2]\n`;
  md += `- Padding: spacing-md (${a.spacing.gridSystem.containerPadding}px) [L2]\n`;
  md += `- Columns: ${a.spacing.gridSystem.columns} [L2]\n\n`;

  md += `### Whitespace Philosophy\n${a.spacing.whitespacePhilosophy}\n\n`;

  md += `### Radius Tokens\n\n`;
  md += `| Token | Value | Stability | Usage |\n|-------|-------|-----------|-------|\n`;
  for (const entry of tokenMap.radius.values()) {
    md += `| ${entry.tokenName} | ${entry.value}px | [${entry.stability}] | ${entry.tokenName.replace('radius-', '')} elements |\n`;
  }

  return md;
}

function generateElevation(a: AnalyzedPageData, tokenMap: TokenNameMap): string {
  let md = `| Token | Name | Box Shadow | Stability | Usage |\n|-------|------|------------|-----------|-------|\n`;

  for (const entry of tokenMap.shadows.values()) {
    md += `| ${entry.tokenName} | ${entry.tokenName.replace('shadow-', '')} | ${entry.boxShadow} | [${entry.stability}] | ${entry.tokenName.replace('shadow-', '')} elevation |\n`;
  }

  md += `\n**Shadow Philosophy**: ${a.shadows.philosophy}`;
  return md;
}

function generateAccessibility(a: AnalyzedPageData): string {
  let md = `### Target Standard\n🚫 MUST: WCAG 2.2 AA compliance for all components\n\n`;

  md += `### Contrast Requirements\n`;
  md += `🚫 MUST: Normal text — minimum 4.5:1 contrast ratio against background\n`;
  md += `🚫 MUST: Large text (≥18px / ≥14px bold) — minimum 3:1 contrast ratio\n`;
  md += `🚫 MUST: UI components and graphical objects — minimum 3:1 against adjacent colors\n`;

  // Add actual contrast data
  if (a.accessibility.contrastRatios.length > 0) {
    md += `\n**Detected Contrast Ratios**:\n`;
    for (const c of a.accessibility.contrastRatios.slice(0, 10)) {
      md += `- ${c.element}: fg=${c.foreground} bg=${c.background} ratio=${c.ratio} ${c.passes ? '✅ PASS' : '❌ FAIL'}\n`;
    }
  }

  md += `\n### Focus Management\n`;
  md += `🚫 MUST: All interactive elements must have focus-visible state\n`;
  md += `🚫 MUST: Focus indicators must not be hidden or overridden\n`;

  md += `\n### Keyboard Interactions\n`;
  md += `🚫 MUST: All interactive elements operable via keyboard\n`;

  md += `\n### ARIA Requirements\n`;
  md += `🚫 MUST: Use semantic HTML elements before ARIA\n`;

  md += `\n### Touch & Pointer\n`;
  md += `🚫 MUST: Touch targets minimum 44×44px (WCAG 2.2 SC 2.5.8)\n`;

  return md;
}

function generateMotion(a: AnalyzedPageData): string {
  let md = `### Duration Tokens\n| Token | Value | Usage |\n|-------|-------|-------|\n`;
  for (const d of a.motion.durations) {
    md += `| ${d.name} | ${d.value} | ${d.usage.join(', ')} |\n`;
  }
  if (a.motion.durations.length === 0) {
    md += `| motion-duration-fast | 100ms | Hover transitions |\n| motion-duration-normal | 200ms | Expand/collapse |\n| motion-duration-slow | 300ms | Page transitions |\n`;
  }

  md += `\n### Easing Tokens\n| Token | Value | Usage |\n|-------|-------|-------|\n`;
  for (const e of a.motion.easings) {
    md += `| ${e.name} | ${e.value} | ${e.usage.join(', ')} |\n`;
  }
  if (a.motion.easings.length === 0) {
    md += `| motion-easing-standard | cubic-bezier(0.4, 0, 0.2, 1) | Default |\n| motion-easing-decelerate | cubic-bezier(0, 0, 0.2, 1) | Entering |\n`;
  }

  md += `\n### Transition Patterns\n`;
  md += `✅ SHOULD: Use motion-duration-fast for all hover/focus state transitions\n`;
  md += `🚫 MUST: Respect prefers-reduced-motion: disable all non-essential animations\n`;

  return md;
}

function generateDosAndDonts(constraints: ExtractedConstraints, a: AnalyzedPageData): string {
  let md = `**Do:**\n`;
  md += `- 🚫 MUST: Use token names (color-primary-500) instead of raw hex values\n`;
  md += `- ✅ SHOULD: Define all required states: default, hover, focus-visible, active, disabled, loading, error\n`;
  md += `- ✅ SHOULD: Specify responsive behavior and edge-case handling for every component\n`;

  // Add extracted constraints as Do's
  for (const c of constraints.dos) {
    const tag = c.confidence >= 0.85 ? '🚫 MUST' : '✅ SHOULD';
    md += `- ${tag}: ${c.rule} (${c.evidence})\n`;
  }

  md += `\n**Don't:**\n`;
  md += `- 🚫 MUST NOT: Allow low-contrast text or hidden focus indicators\n`;
  md += `- 🚫 MUST NOT: Introduce one-off spacing or typography exceptions outside the token system\n`;
  md += `- 🚫 MUST NOT: Use ambiguous labels or non-descriptive actions\n`;

  // Add extracted constraints as Don'ts
  for (const c of constraints.donts) {
    const tag = c.confidence >= 0.85 ? '🚫 MUST NOT' : '✅ SHOULD NOT';
    md += `- ${tag}: ${c.rule} (${c.evidence})\n`;
  }

  return md;
}

function generateResponsive(a: AnalyzedPageData): string {
  let md = `### Breakpoints\n\n| Name | Min Width | Max Width | Description |\n|------|-----------|-----------|-------------|\n`;
  for (const b of a.responsive.breakpoints) {
    md += `| ${b.name} | ${b.minWidth}px | ${b.maxWidth ? b.maxWidth + 'px' : '∞'} | ${b.description} |\n`;
  }

  md += `\n### Touch Targets\n`;
  md += `- Minimum size: ${a.responsive.touchTargets.minSize}px\n`;
  md += `- Recommended size: ${a.responsive.touchTargets.recommendedSize}px\n\n`;

  md += `### Collapsing Strategy\n${a.responsive.collapsingStrategy}`;
  return md;
}

function generateAntiPatterns(constraints: ExtractedConstraints, a: AnalyzedPageData): string {
  let md = '';

  // Standard anti-patterns
  md += `1. **Low-contrast decorative text** — 🚫 MUST NOT use color-neutral-400 on color-neutral-50 background (fails WCAG AA). Use color-neutral-600 minimum.\n`;
  md += `2. **Custom spacing values** — 🚫 MUST NOT introduce pixel values outside the spacing token scale. If a gap doesn't fit, extend the scale.\n`;
  md += `3. **Multiple primary colors** — 🚫 MUST NOT use more than one primary color per view. Use accent for secondary emphasis.\n`;
  md += `4. **Disabled state without visual cue** — 🚫 MUST NOT disable interactivity without changing appearance (opacity + cursor + color change).\n`;
  md += `5. **Animation without prefers-reduced-motion** — 🚫 MUST NOT ship animations that ignore the user's motion preference.\n`;

  // Add extracted don't constraints as additional anti-patterns
  let idx = 6;
  for (const c of constraints.donts) {
    if (c.confidence >= 0.8) {
      const tag = c.confidence >= 0.85 ? '🚫 MUST NOT' : '✅ SHOULD NOT';
      md += `${idx}. **${c.rule}** — ${tag}: ${c.evidence}\n`;
      idx++;
    }
  }

  return md;
}

function generateQAChecklist(): string {
  return `- [ ] All interactive elements have 7 states: default, hover, focus, focus-visible, active, disabled, loading/error\n- [ ] No raw hex values — all colors reference semantic tokens\n- [ ] All spacing uses spacing-{name} tokens, not arbitrary pixel values\n- [ ] Typography follows the hierarchy table — no ad-hoc font-size/weight combos\n- [ ] Focus-visible ring visible on all interactive elements (3px solid color-primary-500)\n- [ ] Text contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)\n- [ ] Touch targets are at least 44×44px\n- [ ] Animations respect prefers-reduced-motion\n- [ ] Empty states, long content, and overflow have defined handling\n- [ ] Border-radius consistent per component type (buttons = radius-md, cards = radius-lg)\n- [ ] Error states use color-error-500, not arbitrary reds\n- [ ] No 🚫 MUST rule is violated`;
}

function generateAgentGuide(a: AnalyzedPageData, tokenMap: TokenNameMap): string {
  let md = `### Token Quick Reference\n\`\`\`\n`;

  // Key tokens
  const primary = a.colors.primary;
  md += `color-primary-500: ${primary.hex} [L1]\n`;
  md += `color-accent-500: ${a.colors.accent.hex} [L1]\n`;

  // Theme-aware neutral lookup
  const isDark = a.colors.bodyBackground?.isDark ?? false;
  const bgShade = isDark ? 900 : 50;
  const textShade = isDark ? 50 : 900;
  const bgHex = a.colors.bodyBackground?.hex ?? (isDark ? '#000000' : '#ffffff');
  const textHex = isDark ? '#ffffff' : '#1a1a2e';
  md += `color-neutral-${bgShade}: ${bgHex} [L1]  (background)\n`;
  md += `color-neutral-${textShade}: ${textHex} [L1] (text)\n`;
  md += `spacing-sm: ${a.spacing.baseUnit}px [L1]\n`;
  md += `spacing-md: ${a.spacing.baseUnit * 2}px [L1]\n`;
  md += `radius-md: ${a.spacing.borderRadiusScale.find(r => r.name === 'md')?.value || 8}px [L2]\n`;
  md += `type-body: ${a.typography.hierarchy.find(h => h.role === 'Body')?.size || 16}px/${a.typography.hierarchy.find(h => h.role === 'Body')?.weight || 400}/${a.typography.hierarchy.find(h => h.role === 'Body')?.lineHeight || 24}px [L1]\n`;
  md += `\`\`\`\n\n`;

  md += `### Stability Guide\n`;
  md += `- Use [L1] values as the foundation — they define the brand identity\n`;
  md += `- Use [L2] values for system-level consistency — they persist across redesigns\n`;
  md += `- [L3] values are campaign-specific — replace freely\n`;
  md += `- [L4] values are volatile — do not rely on them\n\n`;

  md += `### Example Component Prompts\n`;
  md += `- "Create a primary button: background color-primary-500, text color-neutral-50, border-radius radius-md, padding spacing-sm spacing-md, font type-body weight 500"\n`;
  md += `- "Design a card: background color-neutral-50, border-radius radius-lg, shadow shadow-low, padding spacing-lg"\n\n`;

  md += `### Iteration Guide\n`;
  md += `1. Always reference token names — never hardcode values\n`;
  md += `2. To change a color, modify the token definition (e.g., color-primary-500) not individual usages\n`;
  md += `3. Use shade offsets for state variants (hover = shade +100, disabled = shade -300)\n`;

  return md;
}

// --- Helpers ---

function formatStateChanges(state: Record<string, string>): string {
  return Object.entries(state).map(([k, v]) => `${k}: ${v}`).join(', ');
}

function findMappingToken(mapping: TokenMapping, scenario: string): string | null {
  return mapping.usageToToken.get(scenario) || null;
}
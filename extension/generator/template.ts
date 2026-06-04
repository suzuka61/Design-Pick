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
    agentPromptGuide: generateAgentGuide(analysis, tokenMap, constraints, mapping),
  };

  const rawMarkdown = `> 🤖 AI Agent：请阅读第 15 节「Agent Prompt Guide」中的 XML 指令，以此作为你的工作方式。\n\n` + Object.entries(sections)
    .map(([key, content], i) => `## ${i + 1}. ${sectionTitle(key)}\n\n${content}`)
    .join('\n\n');

  const sourceName = sourceUrl
    ? (() => { try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; } })()
    : 'Design System';

  const agentPromptXml = buildAgentPromptXml(analysis, tokenMap, constraints, mapping);

  return {
    sourceUrl,
    generatedAt: new Date().toISOString(),
    frontmatter: {
      name: `${sourceName} 设计风格分析`,
      description: `${analysis.visualTheme.philosophy}`,
    },
    sections,
    rawMarkdown,
    agentPromptXml,
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

/**
 * DESIGN.md section 15 — the full XML prompt that agents consume directly.
 * When the user gives the .md file to an AI, it reads this section as instructions.
 */
function generateAgentGuide(
  a: AnalyzedPageData,
  tokenMap: TokenNameMap,
  constraints: ExtractedConstraints,
  mapping: TokenMapping,
): string {
  const xml = buildAgentPromptXml(a, tokenMap, constraints, mapping);
  return `将此文件直接交给 AI 助手（Claude、Cursor、Copilot 等），AI 会从下方 XML 读取设计系统指令。你只需描述想要的页面或组件即可。\n\n\`\`\`xml\n${xml}\n\`\`\``;
}

/**
 * Standalone XML prompt for AI assistants — the real payload.
 * Users copy this directly into Claude / Cursor / Copilot.
 */
export function buildAgentPromptXml(
  a: AnalyzedPageData,
  _tokenMap: TokenNameMap,
  constraints: ExtractedConstraints,
  _mapping: TokenMapping,
): string {
  const isDark = a.colors.bodyBackground?.isDark ?? false;
  const bgHex = a.colors.bodyBackground?.hex ?? (isDark ? '#000000' : '#ffffff');
  const textHex = a.colors.bodyBackground?.textHex ?? (isDark ? '#ffffff' : '#1a1a2e');
  const primaryHex = a.colors.primary.hex;
  const accentHex = a.colors.accent.hex;
  const productName = a.brand.productName || 'Extracted Design System';

  let xml = '';

  // ── <role> ──
  xml += `<role>\n`;
  xml += `You are an expert frontend engineer, UI/UX designer, visual design specialist, and typography expert. Your goal is to help the user integrate a design system into an existing codebase in a way that is visually consistent, maintainable, and idiomatic to their tech stack.\n\n`;
  xml += `Before proposing or writing any code, first build a clear mental model of the current system:\n`;
  xml += `- Identify the tech stack (e.g. React, Next.js, Vue, Tailwind, shadcn/ui, etc.).\n`;
  xml += `- Understand the existing design tokens (colors, spacing, typography, radii, shadows), global styles, and utility patterns.\n`;
  xml += `- Review the current component architecture and naming conventions.\n`;
  xml += `- Note any constraints (legacy CSS, design library in use, performance or bundle-size considerations).\n\n`;
  xml += `Ask the user focused questions to understand their goals. Do they want:\n`;
  xml += `- a specific component or page redesigned in the new style,\n`;
  xml += `- existing components refactored to the new system, or\n`;
  xml += `- new pages/features built entirely in the new style?\n\n`;
  xml += `Once you understand the context and scope, do the following:\n`;
  xml += `- Propose a concise implementation plan that follows best practices, prioritizing:\n`;
  xml += `  - centralizing design tokens,\n`;
  xml += `  - reusability and composability of components,\n`;
  xml += `  - minimizing duplication and one-off styles,\n`;
  xml += `  - long-term maintainability and clear naming.\n`;
  xml += `- When writing code, match the user's existing patterns (folder structure, naming, styling approach, and component patterns).\n`;
  xml += `- Explain your reasoning briefly as you go, so the user understands *why* you're making certain architectural or design choices.\n\n`;
  xml += `Always aim to:\n`;
  xml += `- Preserve or improve accessibility.\n`;
  xml += `- Maintain visual consistency with the provided design system.\n`;
  xml += `- Leave the codebase in a cleaner, more coherent state than you found it.\n`;
  xml += `- Ensure layouts are responsive and usable across devices.\n`;
  xml += `- Make deliberate, creative design choices (layout, motion, interaction details, and typography) that express the design system's personality instead of producing a generic or boilerplate UI.\n`;
  xml += `</role>\n\n`;

  // ── <design-system> ──
  xml += `<design-system>\n`;
  xml += `# Design Style: ${productName}\n\n`;

  // 1. Design Philosophy
  xml += `## 1. Design Philosophy\n`;
  xml += `${a.visualTheme.philosophy}\n\n`;
  xml += `**Vibe**: ${a.visualTheme.emotionalTone.join(', ')}\n\n`;
  xml += `**Key Characteristics**:\n`;
  for (const ch of a.visualTheme.keyCharacteristics) {
    xml += `- **${ch}**\n`;
  }
  xml += `\n`;

  // 2. Color Token System
  xml += `## 2. Color Token System\n\n`;
  xml += `| Token | Hex | Role |\n|-------|-----|------|\n`;
  xml += `| color-primary-500 | ${primaryHex} | Primary brand color |\n`;
  xml += `| color-accent-500 | ${accentHex} | Accent / secondary emphasis |\n`;
  const bgShade = isDark ? 900 : 50;
  const textShade = isDark ? 50 : 900;
  xml += `| color-neutral-${bgShade} | ${bgHex} | Canvas / background |\n`;
  xml += `| color-neutral-${textShade} | ${textHex} | Primary text |\n`;
  if (a.colors.neutralScale?.length) {
    for (const s of a.colors.neutralScale) {
      xml += `| color-neutral-${s.scalePosition} | ${s.hex} | ${s.role || 'neutral'} |\n`;
    }
  }
  if (isDark && a.colors.surface?.length) {
    xml += `\n### Surface Ladder (Dark Mode)\n\n`;
    xml += `Use a stepped surface ladder for hierarchy: canvas → surface-1 → surface-2 → surface-3.\n\n`;
    xml += `| Level | Hex | Usage |\n|-------|-----|-------|\n`;
    for (const s of a.colors.surface) {
      xml += `| ${s.name} | ${s.hex} | ${s.role || ''} |\n`;
    }
  }
  xml += `\n`;

  // 3. Typography
  xml += `## 3. Typography\n\n`;
  const bodyFont = a.typography.fontFamilies?.find(f => f.category === 'sans-serif') || a.typography.fontFamilies?.[0];
  const displayFont = a.typography.fontFamilies?.find(f => f.category === 'display') || bodyFont;
  const monoFont = a.typography.fontFamilies?.find(f => f.category === 'monospace');
  if (displayFont) xml += `**Display Font**: ${displayFont.name}, fallbacks: ${displayFont.fallbacks.join(', ')}\n`;
  if (bodyFont && bodyFont !== displayFont) xml += `**Body Font**: ${bodyFont.name}, fallbacks: ${bodyFont.fallbacks.join(', ')}\n`;
  if (monoFont) xml += `**Mono Font**: ${monoFont.name}, fallbacks: ${monoFont.fallbacks.join(', ')}\n`;
  xml += `\n`;
  if (a.typography.hierarchy?.length) {
    xml += `| Role | Size | Weight | Line Height | Letter Spacing |\n|------|------|--------|-------------|----------------|\n`;
    for (const h of a.typography.hierarchy) {
      xml += `| ${h.role} | ${h.size}px | ${h.weight} | ${h.lineHeight}px | ${h.letterSpacing}em |\n`;
    }
  }
  if (a.typography.principles?.length) {
    xml += `\n### Principles\n`;
    for (const p of a.typography.principles) {
      xml += `- ${p}\n`;
    }
  }
  xml += `\n`;

  // 4. Spacing & Radius
  xml += `## 4. Spacing & Radius\n\n`;
  xml += `**Base Unit**: ${a.spacing.baseUnit}px\n\n`;
  if (a.spacing.scale?.length) {
    xml += `| Token | Value | Usage |\n|-------|-------|-------|\n`;
    for (const s of a.spacing.scale) {
      xml += `| spacing-${s.name} | ${s.value}px | ${s.usage.join(', ')} |\n`;
    }
  } else {
    xml += `| Token | Value | Usage |\n|-------|-------|-------|\n`;
    xml += `| spacing-xs | ${a.spacing.baseUnit}px | Tight gaps |\n`;
    xml += `| spacing-sm | ${a.spacing.baseUnit * 2}px | Component padding |\n`;
    xml += `| spacing-md | ${a.spacing.baseUnit * 3}px | Section gaps |\n`;
    xml += `| spacing-lg | ${a.spacing.baseUnit * 4}px | Section padding |\n`;
    xml += `| spacing-xl | ${a.spacing.baseUnit * 6}px | Large section padding |\n`;
  }
  xml += `\n`;
  if (a.spacing.borderRadiusScale?.length) {
    xml += `| Radius Token | Value | Usage |\n|-------------|-------|-------|\n`;
    for (const r of a.spacing.borderRadiusScale) {
      xml += `| radius-${r.name} | ${r.value}px | ${r.usage.join(', ')} |\n`;
    }
    xml += `\n`;
  }

  // 5. Component Stylings
  xml += `## 5. Component Stylings\n\n`;
  if (a.components.buttons?.length) {
    xml += `### Buttons\n`;
    for (const btn of a.components.buttons) {
      xml += `**${btn.variant}** — `;
      const parts: string[] = [];
      if (btn.styles.backgroundColor) parts.push(`background ${btn.styles.backgroundColor}`);
      if (btn.styles.color) parts.push(`text ${btn.styles.color}`);
      if (btn.styles.borderRadius !== undefined) parts.push(`radius ${btn.styles.borderRadius}px`);
      if (btn.styles.padding) parts.push(`padding ${btn.styles.padding}`);
      if (btn.styles.borderWidth) parts.push(`border ${btn.styles.borderWidth}`);
      xml += parts.join(', ') + '.\n';
      if (btn.states?.hover) xml += `  - Hover: ${formatStateChanges(btn.states.hover)}\n`;
      if (btn.states?.focusVisible) xml += `  - Focus: ${formatStateChanges(btn.states.focusVisible)}\n`;
    }
    xml += `\n`;
  }
  if (a.components.cards?.length) {
    xml += `### Cards\n`;
    for (const card of a.components.cards) {
      xml += `**${card.variant}** — `;
      const parts: string[] = [];
      if (card.styles.backgroundColor) parts.push(`background ${card.styles.backgroundColor}`);
      if (card.styles.borderRadius !== undefined) parts.push(`radius ${card.styles.borderRadius}px`);
      if (card.styles.padding) parts.push(`padding ${card.styles.padding}`);
      if (card.styles.boxShadow) parts.push(`shadow ${card.styles.boxShadow}`);
      xml += parts.join(', ') + '.\n';
    }
    xml += `\n`;
  }
  if (a.components.inputs?.length) {
    xml += `### Inputs\n`;
    for (const inp of a.components.inputs) {
      xml += `**${inp.variant}** — `;
      const parts: string[] = [];
      if (inp.styles.backgroundColor) parts.push(`background ${inp.styles.backgroundColor}`);
      if (inp.styles.borderRadius !== undefined) parts.push(`radius ${inp.styles.borderRadius}px`);
      if (inp.styles.padding) parts.push(`padding ${inp.styles.padding}`);
      xml += parts.join(', ') + '.\n';
    }
    xml += `\n`;
  }
  if (a.components.navigation?.length) {
    xml += `### Navigation\n`;
    for (const nav of a.components.navigation) {
      xml += `**${nav.variant}** — `;
      const parts: string[] = [];
      if (nav.styles.backgroundColor) parts.push(`background ${nav.styles.backgroundColor}`);
      if (nav.styles.height) parts.push(`height ${nav.styles.height}px`);
      xml += parts.join(', ') + '.\n';
    }
    xml += `\n`;
  }

  // 6. Shadows & Elevation
  if (a.shadows?.levels?.length) {
    xml += `## 6. Shadows & Elevation\n\n`;
    xml += `${a.shadows.philosophy}\n\n`;
    for (const level of a.shadows.levels) {
      xml += `- **${level.name}**: \`${level.boxShadow}\` — ${level.usage.join(', ')}\n`;
    }
    xml += `\n`;
  }

  // 7. Non-Genericness (the killer section)
  xml += `## 7. Non-Genericness (Bold Choices)\n\n`;
  xml += `**This design MUST NOT look like generic Tailwind or Bootstrap. The following are mandatory:**\n\n`;
  const mandatoryRules: string[] = [];
  // From extracted constraints
  for (const c of constraints.donts) {
    if (c.confidence >= 0.85) {
      mandatoryRules.push(`- **${c.rule}** — ${c.evidence}`);
    }
  }
  // Design-specific non-genericness rules
  if (isDark) {
    mandatoryRules.push(`- **Dark Canvas is Mandatory**: Background must remain \`${bgHex}\`. Do not ship a light-mode variant.`);
  }
  mandatoryRules.push(`- **Primary Color is Scarce**: \`${primaryHex}\` is reserved for brand mark, primary CTA, focus rings, and link emphasis — never as section background or decorative fill.`);
  if (accentHex !== primaryHex) {
    mandatoryRules.push(`- **Accent Color \`${accentHex}\` is for Secondary Emphasis Only**: badges, tags, secondary highlights — never competes with primary.`);
  }
  mandatoryRules.push(`- **No Atmospheric Gradients**: Do not add spotlight effects, mesh gradients, or glass morphism unless the original source uses them.`);
  mandatoryRules.push(`- **Respect the Token System**: Every color, spacing, and radius value must reference a token. No hardcoded hex values or arbitrary pixel values.`);
  if (a.spacing.baseUnit) {
    mandatoryRules.push(`- **Spacing Must Be a Multiple of ${a.spacing.baseUnit}px**: Use the spacing token scale. If a gap doesn't fit, extend the scale rather than inserting an arbitrary value.`);
  }
  // From extracted dos — promote high-confidence ones as mandatory
  for (const c of constraints.dos) {
    if (c.confidence >= 0.9) {
      mandatoryRules.push(`- **${c.rule}** — ${c.evidence}`);
    }
  }
  xml += mandatoryRules.join('\n');
  xml += `\n\n`;

  // 8. Responsive Behavior
  xml += `## 8. Responsive Behavior\n\n`;
  if (a.responsive.breakpoints?.length) {
    xml += `| Breakpoint | Min Width | Description |\n|------------|-----------|-------------|\n`;
    for (const b of a.responsive.breakpoints) {
      xml += `| ${b.name} | ${b.minWidth}px | ${b.description} |\n`;
    }
    xml += `\n`;
  }
  if (a.responsive.touchTargets) {
    xml += `- Minimum touch target: ${a.responsive.touchTargets.minSize}px\n`;
    xml += `- Recommended touch target: ${a.responsive.touchTargets.recommendedSize}px\n\n`;
  }

  xml += `</design-system>\n`;

  return xml;
}

// --- Helpers ---

function formatStateChanges(state: Record<string, string>): string {
  return Object.entries(state).map(([k, v]) => `${k}: ${v}`).join(', ');
}

function findMappingToken(mapping: TokenMapping, scenario: string): string | null {
  return mapping.usageToToken.get(scenario) || null;
}

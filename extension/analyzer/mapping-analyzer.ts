import type { AnalyzedPageData, TokenMapping, TokenUsage } from '../types/analyzed';
import type { TokenNameMap } from './token-namer';

/**
 * Build a bidirectional mapping between design tokens and their usage scenarios.
 * This is the "映射层" from the Skill doc — Token → semantic context binding.
 */
export function buildTokenMapping(analysis: AnalyzedPageData, tokenMap: TokenNameMap): TokenMapping {
  const tokenToUsage = new Map<string, TokenUsage[]>();
  const usageToToken = new Map<string, string>();

  // 1. Color semantic roles → scenarios
  const roleScenarioMap: Record<string, string[]> = {
    'Primary': ['interactive-background', 'link-color', 'focus-ring', 'primary-button-bg'],
    'Accent': ['secondary-emphasis', 'highlight', 'badge-bg', 'accent-button-bg'],
    'Link': ['link-color', 'anchor-text'],
    'Error': ['error-border', 'error-text', 'error-bg'],
    'Success': ['success-border', 'success-text', 'success-bg'],
    'Warning': ['warning-border', 'warning-text', 'warning-bg'],
    'Info': ['info-border', 'info-text', 'info-bg'],
  };

  // Map primary/accent colors
  for (const [role, scenarios] of Object.entries(roleScenarioMap)) {
    const color = role === 'Primary' ? analysis.colors.primary
      : role === 'Accent' ? analysis.colors.accent
      : analysis.colors.semanticRoles[role];
    if (!color?.tokenName) continue;

    for (const scenario of scenarios) {
      addMapping(tokenToUsage, usageToToken, color.tokenName, {
        scenario,
        component: scenario.includes('button') ? 'button' : 'general',
        property: scenario.includes('bg') ? 'background' : scenario.includes('text') ? 'color' : scenario.includes('border') ? 'border-color' : 'color',
      });
    }
  }

  // 2. Neutral scale → scenarios
  for (const nc of analysis.colors.neutralScale) {
    if (!nc.tokenName) continue;
    const pos = nc.scalePosition;
    let scenario = '';
    let property = 'color';

    if (pos <= 100) { scenario = 'page-background'; property = 'background'; }
    else if (pos <= 200) { scenario = 'card-background'; property = 'background'; }
    else if (pos <= 300) { scenario = 'border-color'; property = 'border-color'; }
    else if (pos <= 500) { scenario = 'secondary-text'; property = 'color'; }
    else if (pos <= 700) { scenario = 'primary-text'; property = 'color'; }
    else if (pos >= 800) { scenario = 'heading-text'; property = 'color'; }

    if (scenario) {
      addMapping(tokenToUsage, usageToToken, nc.tokenName, {
        scenario,
        component: 'general',
        property,
      });
    }
  }

  // 3. Surface colors → scenarios
  for (const sc of analysis.colors.surface) {
    if (!sc.tokenName) continue;
    addMapping(tokenToUsage, usageToToken, sc.tokenName, {
      scenario: `${sc.name.toLowerCase()}-background`,
      component: 'surface',
      property: 'background',
    });
  }

  // 4. Shadow levels → scenarios
  for (const sl of analysis.shadows.levels) {
    if (!sl.tokenName) continue;
    const shadowScenarios: Record<string, string> = {
      'Flat': 'flush-elements',
      'Subtle': 'slight-lift',
      'Low': 'card-elevation',
      'Medium': 'dropdown-elevation',
      'Elevated': 'popover-elevation',
      'High': 'modal-elevation',
      'Modal': 'modal-elevation',
    };
    addMapping(tokenToUsage, usageToToken, sl.tokenName, {
      scenario: shadowScenarios[sl.name] || `${sl.name.toLowerCase()}-elevation`,
      component: 'general',
      property: 'box-shadow',
    });
  }

  // 5. Component styles → reverse-map to tokens
  mapComponentStyles(analysis.components.buttons, 'button', tokenToUsage, usageToToken, tokenMap);
  mapComponentStyles(analysis.components.cards, 'card', tokenToUsage, usageToToken, tokenMap);
  mapComponentStyles(analysis.components.inputs, 'input', tokenToUsage, usageToToken, tokenMap);
  mapComponentStyles(analysis.components.navigation, 'navigation', tokenToUsage, usageToToken, tokenMap);

  // 6. Typography tokens → scenarios
  for (const entry of tokenMap.typography.values()) {
    addMapping(tokenToUsage, usageToToken, entry.tokenName, {
      scenario: `${entry.role.toLowerCase()}-text`,
      component: 'general',
      property: 'font',
    });
  }

  // 7. Spacing tokens → scenarios
  for (const entry of tokenMap.spacing.values()) {
    addMapping(tokenToUsage, usageToToken, entry.tokenName, {
      scenario: `${entry.tokenName.replace('spacing-', '')}-spacing`,
      component: 'general',
      property: 'spacing',
    });
  }

  // 8. Radius tokens → scenarios
  for (const entry of tokenMap.radius.values()) {
    addMapping(tokenToUsage, usageToToken, entry.tokenName, {
      scenario: `${entry.tokenName.replace('radius-', '')}-radius`,
      component: 'general',
      property: 'border-radius',
    });
  }

  return { tokenToUsage, usageToToken };
}

function addMapping(
  tokenToUsage: Map<string, TokenUsage[]>,
  usageToToken: Map<string, string>,
  tokenName: string,
  usage: TokenUsage,
) {
  if (!tokenToUsage.has(tokenName)) tokenToUsage.set(tokenName, []);
  tokenToUsage.get(tokenName)!.push(usage);
  usageToToken.set(usage.scenario, tokenName);
}

function mapComponentStyles(
  components: AnalyzedPageData['components']['buttons'],
  componentType: string,
  tokenToUsage: Map<string, TokenUsage[]>,
  usageToToken: Map<string, string>,
  tokenMap: TokenNameMap,
) {
  for (const comp of components) {
    const variant = comp.variant.toLowerCase();
    const prefix = `color-component-${componentType}-${variant}`;

    // Background
    if (comp.styles.backgroundColor) {
      const bgToken = findColorToken(comp.styles.backgroundColor, tokenMap);
      if (bgToken) {
        addMapping(tokenToUsage, usageToToken, bgToken, {
          scenario: `${variant}-${componentType}-background`,
          component: componentType,
          property: 'background',
        });
      }
    }

    // Text color
    if (comp.styles.color) {
      const textToken = findColorToken(comp.styles.color, tokenMap);
      if (textToken) {
        addMapping(tokenToUsage, usageToToken, textToken, {
          scenario: `${variant}-${componentType}-text`,
          component: componentType,
          property: 'color',
        });
      }
    }

    // Border color
    if (comp.styles.borderColor) {
      const borderToken = findColorToken(comp.styles.borderColor, tokenMap);
      if (borderToken) {
        addMapping(tokenToUsage, usageToToken, borderToken, {
          scenario: `${variant}-${componentType}-border`,
          component: componentType,
          property: 'border-color',
        });
      }
    }

    // States
    for (const [stateName, stateStyles] of Object.entries(comp.states)) {
      if (!stateStyles) continue;
      if (stateStyles.backgroundColor) {
        const stateBgToken = findColorToken(stateStyles.backgroundColor, tokenMap);
        if (stateBgToken) {
          addMapping(tokenToUsage, usageToToken, stateBgToken, {
            scenario: `${variant}-${componentType}-${stateName}-background`,
            component: componentType,
            property: 'background',
            state: stateName,
          });
        }
      }
    }
  }
}

function findColorToken(hexOrRgb: string, tokenMap: TokenNameMap): string | null {
  // Normalize to hex
  const hex = normalizeToHex(hexOrRgb);
  if (!hex) return null;

  // Search in color tokens
  for (const entry of tokenMap.colors.values()) {
    if (entry.hex.toLowerCase() === hex.toLowerCase()) return entry.tokenName;
  }
  return null;
}

function normalizeToHex(value: string): string | null {
  if (value.startsWith('#')) return value.length === 7 ? value : null;
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return '#' + [m[1], m[2], m[3]].map(v => parseInt(v).toString(16).padStart(2, '0')).join('');
}
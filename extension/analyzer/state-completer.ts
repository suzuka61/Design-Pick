import type { AnalyzedComponents, ComponentStyle } from '../types/analyzed';
import type { TokenNameMap } from './token-namer';
import { lookupColorByShadeOffset, findClosestColorToken } from './token-namer';

function completeComponentStates(
  component: ComponentStyle,
  tokenMap: TokenNameMap
): ComponentStyle {
  const states = component.states;

  const bgToken = component.styles.backgroundColor
    ? findClosestColorToken(tokenMap, component.styles.backgroundColor)
    : undefined;
  const textToken = component.styles.color
    ? findClosestColorToken(tokenMap, component.styles.color)
    : undefined;

  // Hover: darken bg by one shade, add subtle shadow
  if (!states.hover && bgToken) {
    const hoverBgToken = lookupColorByShadeOffset(tokenMap, bgToken.tokenName, 1);
    states.hover = {
      backgroundColor: hoverBgToken?.hex ?? component.styles.backgroundColor ?? '',
      boxShadow: tokenMap.shadows.get('shadow-subtle')?.boxShadow ?? '0 2px 4px rgba(0,0,0,0.1)',
    };
  }

  // Focus: outline ring using primary color
  if (!states.focus) {
    const primary500 = tokenMap.colors.get('color-primary-500');
    states.focus = {
      outline: `2px solid ${primary500?.hex ?? '#5b76fe'}`,
      outlineOffset: '2px',
    };
  }

  // Focus-visible: distinct from focus — thicker ring, offset for keyboard users
  if (!states.focusVisible) {
    const primary500 = tokenMap.colors.get('color-primary-500');
    states.focusVisible = {
      outline: `3px solid ${primary500?.hex ?? '#5b76fe'}`,
      outlineOffset: '2px',
      borderRadius: component.styles.borderRadius ? `${component.styles.borderRadius}px` : '8px',
    };
  }

  // Active: darken bg by 2 shades (deeper than hover), inset shadow
  if (!states.active && bgToken) {
    const activeBgToken = lookupColorByShadeOffset(tokenMap, bgToken.tokenName, 2);
    states.active = {
      backgroundColor: activeBgToken?.hex ?? component.styles.backgroundColor ?? '',
      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.15)',
      transform: 'scale(0.98)',
    };
  }

  // Disabled: lighten bg by 3 shades, desaturate text
  if (!states.disabled) {
    const disabledBg = bgToken
      ? lookupColorByShadeOffset(tokenMap, bgToken.tokenName, -3)?.hex
      : component.styles.backgroundColor;
    const neutral500 = tokenMap.colors.get('color-neutral-500');
    states.disabled = {
      backgroundColor: disabledBg ?? '#e5e7eb',
      color: neutral500?.hex ?? '#6b7280',
      opacity: '0.6',
      cursor: 'not-allowed',
    };
  }

  // Loading: same as default but with reduced opacity and loading cursor
  if (!states.loading) {
    states.loading = {
      opacity: '0.7',
      cursor: 'wait',
      pointerEvents: 'none',
    };
  }

  // Error: error border + error text for inputs, error bg for others
  if (!states.error) {
    const error500 = tokenMap.colors.get('color-error-500');
    const errorHex = error500?.hex ?? '#ef4444';
    if (component.type === 'input') {
      states.error = {
        borderColor: errorHex,
        borderWidth: '2px',
        color: errorHex,
      };
    } else {
      states.error = {
        borderColor: errorHex,
        borderWidth: '1px',
        backgroundColor: `${errorHex}10`,
      };
    }
  }

  // Edge cases
  if (!component.edgeCases) {
    component.edgeCases = {
      longContent: 'Truncate with ellipsis after 2 lines; show tooltip on hover for full content',
      overflow: 'Hidden overflow with scroll-on-demand for containers; use `overflow-x: auto` for tables',
      emptyState: 'Display centered placeholder with muted icon + descriptive text + primary CTA',
    };
  }

  return component;
}

export function completeStates(
  components: AnalyzedComponents,
  tokenMap: TokenNameMap
): AnalyzedComponents {
  components.buttons = components.buttons.map(b => completeComponentStates(b, tokenMap));
  components.cards = components.cards.map(c => completeComponentStates(c, tokenMap));
  components.inputs = components.inputs.map(i => completeComponentStates(i, tokenMap));
  components.navigation = components.navigation.map(n => completeComponentStates(n, tokenMap));
  return components;
}
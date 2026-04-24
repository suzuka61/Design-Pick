import type { AnalyzedComponents, ComponentStyle } from '../types/analyzed.js';
import type { TokenNameMap } from './token-namer.js';
import { lookupColorByShadeOffset, findClosestColorToken } from './token-namer.js';

function completeComponentStates(
  component: ComponentStyle,
  tokenMap: TokenNameMap
): ComponentStyle {
  const states = component.states;

  // Find the closest color tokens for the component's bg and text
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

  // Disabled: lighten bg by 3 shades, desaturate text
  if (!component.states.disabled) {
    const disabledBg = bgToken
      ? lookupColorByShadeOffset(tokenMap, bgToken.tokenName, -3)?.hex
      : component.styles.backgroundColor;
    const neutral500 = tokenMap.colors.get('color-neutral-500');
    component.states.disabled = {
      backgroundColor: disabledBg ?? '#e5e7eb',
      color: neutral500?.hex ?? '#6b7280',
      opacity: '0.6',
      cursor: 'not-allowed',
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
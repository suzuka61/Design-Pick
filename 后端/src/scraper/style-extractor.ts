import type { Page } from 'playwright';
import type {
  ExtractedElement,
  FontFaceInfo,
} from '../types/extracted.js';

// Use camelCase property names for getComputedStyle indexing
const STYLE_PROPS = [
  'color', 'backgroundColor', 'borderColor', 'borderTopColor',
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'textAlign', 'textTransform', 'textDecoration',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'borderWidth', 'borderRadius', 'borderStyle', 'boxShadow',
  'display', 'position', 'gap', 'overflow', 'opacity', 'cursor',
  'transitionDuration', 'transitionTimingFunction', 'transitionProperty',
  'outlineStyle', 'outlineWidth', 'outlineColor', 'outlineOffset',
];

export async function extractAllStyles(page: Page): Promise<{
  elements: ExtractedElement[];
  cssVariables: Record<string, string>;
  mediaQueries: string[];
  fontFaces: FontFaceInfo[];
}> {
  // Inject extraction script as a string to avoid TypeScript compilation artifacts
  const extractionScript = `
    (function() {
    const props = ${JSON.stringify(STYLE_PROPS)};
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK', 'BR', 'WBR', 'G', 'RECT', 'CIRCLE', 'LINE', 'POLYGON', 'POLYLINE', 'DEFS', 'USE', 'CLIPPATH', 'MASK', 'PATTERN', 'FILTER', 'IMAGE']);
    const MAX_DEPTH = 12;
    const MIN_AREA = 4;
    let elementCount = 0;
    const MAX_ELEMENTS = 2000;

    function getComputedStyles(el) {
      const cs = window.getComputedStyle(el);
      const result = {};
      for (const p of props) {
        // Use camelCase indexing — getComputedStyle supports both
        result[p] = cs[p] || '';
      }
      return result;
    }

    function isVisible(el) {
      const rect = el.getBoundingClientRect();
      if (rect.width < MIN_AREA && rect.height < MIN_AREA) return false;
      const cs = window.getComputedStyle(el);
      return cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        cs.opacity !== '0';
    }

    function isSemantic(el) {
      const tag = el.tagName;
      const role = el.getAttribute('role');
      const semanticTags = ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'NAV', 'HEADER', 'FOOTER', 'MAIN', 'ASIDE', 'SECTION', 'ARTICLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'FORM', 'DIALOG', 'TABLE', 'UL', 'OL', 'LI'];
      if (semanticTags.includes(tag)) return true;
      if (role && ['button', 'navigation', 'search', 'textbox', 'link', 'banner', 'contentinfo', 'main', 'complementary', 'dialog', 'tablist', 'tab', 'tabpanel', 'menu', 'menubar', 'list', 'listitem', 'grid', 'row', 'cell'].includes(role)) return true;
      return false;
    }

    function hasVisualSignificance(el) {
      const cs = window.getComputedStyle(el);
      // Has non-transparent background
      if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return true;
      // Has box-shadow
      if (cs.boxShadow && cs.boxShadow !== 'none') return true;
      // Has border
      if (cs.borderStyle !== 'none' && cs.borderWidth !== '0px') return true;
      // Has border-radius
      if (cs.borderRadius !== '0px') return true;
      return false;
    }

    function walkDOM(node, depth) {
      if (depth > MAX_DEPTH) return null;
      if (elementCount >= MAX_ELEMENTS) return null;

      const tag = node.tagName;
      if (SKIP_TAGS.has(tag)) return null;
      if (!isVisible(node)) return null;

      elementCount++;

      const rect = node.getBoundingClientRect();
      const cs = getComputedStyles(node);

      const children = [];
      for (const child of node.children) {
        const childResult = walkDOM(child, depth + 1);
        if (childResult) children.push(childResult);
      }

      // Extract ARIA and semantic attributes
      const attributes = {};
      for (const attr of node.attributes) {
        if (attr.name.startsWith('aria-') || attr.name === 'role' || attr.name === 'tabindex' || attr.name === 'type' || attr.name === 'disabled' || attr.name === 'placeholder' || attr.name === 'alt' || attr.name === 'label') {
          attributes[attr.name] = attr.value;
        }
      }

      return {
        tagName: tag,
        role: node.getAttribute('role') || undefined,
        text: (node.textContent || '').substring(0, 200) || undefined,
        classes: node.className && typeof node.className === 'string'
          ? node.className.split(/\\s+/).filter(Boolean)
          : [],
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        computedStyles: cs,
        boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        children: children,
      };
    }

    // Extract CSS variables from :root
    const cssVariables = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
            for (let i = 0; i < rule.style.length; i++) {
              const prop = rule.style[i];
              if (prop.startsWith('--')) {
                cssVariables[prop] = rule.style.getPropertyValue(prop).trim();
              }
            }
          }
        }
      } catch (e) {}
    }
    const rootStyles = window.getComputedStyle(document.documentElement);
    for (const prop of rootStyles) {
      if (prop.startsWith('--')) {
        cssVariables[prop] = rootStyles.getPropertyValue(prop).trim();
      }
    }

    // Extract media queries
    const mediaQueries = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSMediaRule) {
            mediaQueries.push(rule.conditionText || rule.media.mediaText);
          }
        }
      } catch (e) {}
    }

    // Extract @font-face
    const fontFaces = [];
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule) {
            fontFaces.push({
              fontFamily: rule.style.getPropertyValue('font-family').trim(),
              src: rule.style.getPropertyValue('src').trim(),
              fontWeight: rule.style.getPropertyValue('font-weight').trim() || '400',
              fontStyle: rule.style.getPropertyValue('font-style').trim() || 'normal',
            });
          }
        }
      } catch (e) {}
    }

    const body = document.body;
    const elements = body ? [walkDOM(body, 0)].filter(Boolean) : [];

    return { elements, cssVariables, mediaQueries, fontFaces };
    })()
  `;

  return page.evaluate(extractionScript);
}

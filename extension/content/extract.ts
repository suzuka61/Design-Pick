/**
 * Content Script — DOM extraction for current page
 * Runs in the page context, extracts computed styles, CSS variables, media queries, font faces.
 * Replaces the Playwright-based scraper from the backend.
 */

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

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'PATH', 'META', 'LINK', 'BR', 'WBR',
  'G', 'RECT', 'CIRCLE', 'LINE', 'POLYGON', 'POLYLINE', 'DEFS', 'USE',
  'CLIPPATH', 'MASK', 'PATTERN', 'FILTER', 'IMAGE',
]);

const MAX_DEPTH = 12;
const MIN_AREA = 4;
const MAX_ELEMENTS = 2000;

function getComputedStyles(el: HTMLElement): Record<string, string> {
  const cs = window.getComputedStyle(el);
  const result: Record<string, string> = {};
  for (const p of STYLE_PROPS) {
    result[p] = (cs as any)[p] || '';
  }
  return result;
}

function isVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  if (rect.width < MIN_AREA && rect.height < MIN_AREA) return false;
  const cs = window.getComputedStyle(el);
  return cs.display !== 'none' &&
    cs.visibility !== 'hidden' &&
    cs.opacity !== '0';
}

let elementCount = 0;

function walkDOM(node: HTMLElement, depth: number): any | null {
  if (depth > MAX_DEPTH) return null;
  if (elementCount >= MAX_ELEMENTS) return null;

  const tag = node.tagName;
  if (SKIP_TAGS.has(tag)) return null;
  if (!isVisible(node)) return null;

  elementCount++;

  const cs = getComputedStyles(node);

  const children: any[] = [];
  for (const child of node.children) {
    const childResult = walkDOM(child as HTMLElement, depth + 1);
    if (childResult) children.push(childResult);
  }

  // Extract semantic attributes
  const attributes: Record<string, string> = {};
  for (const attr of node.attributes) {
    if (attr.name.startsWith('aria-') ||
        attr.name === 'role' ||
        attr.name === 'tabindex' ||
        attr.name === 'type' ||
        attr.name === 'disabled' ||
        attr.name === 'placeholder' ||
        attr.name === 'alt' ||
        attr.name === 'label') {
      attributes[attr.name] = attr.value;
    }
  }

  const rect = node.getBoundingClientRect();

  return {
    tagName: tag,
    role: node.getAttribute('role') || undefined,
    text: (node.textContent || '').substring(0, 200) || undefined,
    classes: node.className && typeof node.className === 'string'
      ? node.className.split(/\s+/).filter(Boolean)
      : [],
    attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
    computedStyles: cs,
    boundingBox: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    children,
  };
}

function extractCssVariables(): Record<string, string> {
  const cssVariables: Record<string, string> = {};

  // From style sheets
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
    } catch (e) { /* cross-origin sheets */ }
  }

  // From computed styles on root
  const rootStyles = window.getComputedStyle(document.documentElement);
  for (const prop of rootStyles) {
    if (prop.startsWith('--')) {
      cssVariables[prop] = rootStyles.getPropertyValue(prop).trim();
    }
  }

  return cssVariables;
}

function extractMediaQueries(): string[] {
  const mediaQueries: string[] = [];
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSMediaRule) {
          mediaQueries.push(rule.conditionText || rule.media.mediaText);
        }
      }
    } catch (e) { /* cross-origin */ }
  }
  return mediaQueries;
}

function extractFontFaces(): any[] {
  const fontFaces: any[] = [];
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
    } catch (e) { /* cross-origin */ }
  }
  return fontFaces;
}

// Main extraction function — called when background sends START_EXTRACTION
function extractPageData(): any {
  elementCount = 0;

  const body = document.body;
  const elements = body ? [walkDOM(body, 0)].filter(Boolean) : [];

  const meta: Record<string, string | undefined> = {
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined,
    themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? undefined,
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? undefined,
    'og:site_name': document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') ?? undefined,
  };

  return {
    url: window.location.href,
    title: document.title,
    meta,
    body: elements[0] ?? {
      tagName: 'BODY',
      classes: [],
      computedStyles: {},
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      children: [],
    },
    htmlComputedStyles: (() => {
      const cs = window.getComputedStyle(document.documentElement);
      return { backgroundColor: cs.backgroundColor, color: cs.color };
    })(),
    cssVariables: extractCssVariables(),
    mediaQueries: extractMediaQueries(),
    fontFaces: extractFontFaces(),
  };
}

// Listen for messages from background service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_EXTRACTION') {
    try {
      const data = extractPageData();
      sendResponse({ type: 'EXTRACTION_RESULT', data });
    } catch (error: any) {
      sendResponse({ type: 'EXTRACTION_ERROR', error: error.message });
    }
    return true; // keep message channel open for async response
  }
});
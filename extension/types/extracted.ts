export interface ComputedStyles {
  color: string;
  backgroundColor: string;
  borderColor: string;
  borderTopColor: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  textTransform: string;
  textDecoration: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  borderWidth: string;
  borderRadius: string;
  borderStyle: string;
  boxShadow: string;
  display: string;
  position: string;
  gap: string;
  overflow: string;
  opacity: string;
  cursor: string;
  transitionDuration: string;
  transitionTimingFunction: string;
  transitionProperty: string;
  outlineStyle: string;
  outlineWidth: string;
  outlineColor: string;
  outlineOffset: string;
}

export interface ExtractedElement {
  tagName: string;
  role?: string;
  text?: string;
  classes: string[];
  attributes?: Record<string, string>;
  computedStyles: ComputedStyles;
  boundingBox: { x: number; y: number; width: number; height: number };
  children: ExtractedElement[];
}

export interface FontFaceInfo {
  fontFamily: string;
  src: string;
  fontWeight: string;
  fontStyle: string;
}

// Browser extension: screenshots stored as base64 strings instead of Node.js Buffer
export interface ScreenshotData {
  fullPage: string;  // base64 JPEG
  viewport: string;  // base64 JPEG
  viewportWidth: number;
  viewportHeight: number;
}

export interface ExtractedPageData {
  url: string;
  title: string;
  meta: {
    description?: string;
    themeColor?: string;
    viewport?: string;
    'og:site_name'?: string;
  };
  body: ExtractedElement;
  /** Computed styles on <html> — used as fallback for body-background detection. */
  htmlComputedStyles?: Pick<ComputedStyles, 'backgroundColor' | 'color'>;
  screenshots?: ScreenshotData;
  cssVariables: Record<string, string>;
  mediaQueries: string[];
  fontFaces: FontFaceInfo[];
}
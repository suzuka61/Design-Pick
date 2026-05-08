export type StabilityLevel = 'L1' | 'L2' | 'L3' | 'L4';

export interface SemanticColor {
  name: string;
  hex: string;
  rgb: { r: number; g: number; b: number };
  role: string;
  usage: string[];
  frequency: number;
  stability?: StabilityLevel;
  tokenName?: string;
}

export interface NeutralScaleColor extends SemanticColor {
  scalePosition: number;
  tokenName?: string;
}

export interface AnalyzedColorPalette {
  primary: SemanticColor;
  accent: SemanticColor;
  neutralScale: NeutralScaleColor[];
  surface: SemanticColor[];
  shadows: SemanticColor[];
  semanticRoles: Record<string, SemanticColor>;
}

export interface FontFamilyInfo {
  name: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display';
  usage: string[];
  fallbacks: string[];
  weights: number[];
}

export interface TypeHierarchyEntry {
  role: string;
  font: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
  notes: string;
  sampleText?: string;
  stability?: StabilityLevel;
  tokenName?: string;
}

export interface AnalyzedTypography {
  fontFamilies: FontFamilyInfo[];
  hierarchy: TypeHierarchyEntry[];
  principles: string[];
}

export interface SpacingScaleEntry {
  name: string;
  value: number;
  multiplier: number;
  usage: string[];
  stability?: StabilityLevel;
  tokenName?: string;
}

export interface GridInfo {
  type: string;
  containerMaxWidth: number;
  containerPadding: number;
  columns: number;
}

export interface BorderRadiusEntry {
  name: string;
  value: number;
  usage: string[];
  stability?: StabilityLevel;
  tokenName?: string;
}

export interface AnalyzedSpacing {
  baseUnit: number;
  scale: SpacingScaleEntry[];
  gridSystem: GridInfo;
  borderRadiusScale: BorderRadiusEntry[];
  whitespacePhilosophy: string;
}

export interface ComponentStyle {
  type: string;
  variant: string;
  styles: {
    backgroundColor?: string;
    color?: string;
    borderColor?: string;
    borderWidth?: string;
    borderRadius?: number;
    padding?: string;
    fontSize?: number;
    fontWeight?: number;
    fontFamily?: string;
    boxShadow?: string;
    height?: number;
    minWidth?: number;
    transitionDuration?: string;
    transitionTiming?: string;
  };
  states: {
    hover?: Record<string, string>;
    focus?: Record<string, string>;
    focusVisible?: Record<string, string>;
    active?: Record<string, string>;
    disabled?: Record<string, string>;
    loading?: Record<string, string>;
    error?: Record<string, string>;
  };
  edgeCases?: {
    longContent?: string;
    overflow?: string;
    emptyState?: string;
  };
  sampleText?: string;
}

export interface AnalyzedComponents {
  buttons: ComponentStyle[];
  cards: ComponentStyle[];
  inputs: ComponentStyle[];
  navigation: ComponentStyle[];
  other: ComponentStyle[];
}

export interface ShadowLevel {
  level: number;
  name: string;
  boxShadow: string;
  usage: string[];
  stability?: StabilityLevel;
  tokenName?: string;
}

export interface AnalyzedShadows {
  levels: ShadowLevel[];
  philosophy: string;
}

export interface BreakpointEntry {
  name: string;
  minWidth: number;
  maxWidth?: number;
  description: string;
}

export interface AnalyzedResponsive {
  breakpoints: BreakpointEntry[];
  touchTargets: { minSize: number; recommendedSize: number; minSpacing: number };
  collapsingStrategy: string;
}

export interface VisualThemeSummary {
  philosophy: string;
  emotionalTone: string[];
  keyCharacteristics: string[];
  darkMode: boolean;
}

export interface MotionTokens {
  durations: { name: string; value: string; usage: string[] }[];
  easings: { name: string; value: string; usage: string[] }[];
  transitions: { property: string; duration: string; easing: string }[];
}

export interface AccessibilityInfo {
  contrastRatios: { element: string; foreground: string; background: string; ratio: number; passes: boolean }[];
  focusIndicators: string[];
  keyboardPatterns: string[];
  ariaUsage: string[];
}

export interface BrandContext {
  productName: string;
  audience: string;
  productSurface: string[];
}

export interface AnalyzedPageData {
  colors: AnalyzedColorPalette;
  typography: AnalyzedTypography;
  spacing: AnalyzedSpacing;
  components: AnalyzedComponents;
  shadows: AnalyzedShadows;
  responsive: AnalyzedResponsive;
  visualTheme: VisualThemeSummary;
  motion: MotionTokens;
  accessibility: AccessibilityInfo;
  brand: BrandContext;
}

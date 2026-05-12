export interface CaseItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  favicon: string;
  screenshot: string;
  category: string;
  tags: string[];
  source: string;
  summary: {
    primaryColor: string;
    accentColor: string;
    surfaceColor: string;
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    fontFamilies: string[];
    headingFont: string;
    bodyFont: string;
    headingSizes: string;
    componentCount: number;
    typographyLevels: number;
    spacingScale: string;
    borderRadius: string;
    visualTheme: string;
    layoutStyle: string;
    animationStyle: string;
  };
  designMdUrl?: string;
  previewHtmlUrl?: string;
}

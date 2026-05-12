export interface CaseItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  url: string;
  favicon: string;
  screenshot: string;
  category: CaseCategory;
  tags: string[];
  source: 'getdesign.md' | 'refero' | 'curated';
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

export type CaseCategory =
  | 'AI & LLM'
  | 'Developer Tools'
  | 'Backend'
  | 'Productivity'
  | 'Design & Creative'
  | 'Fintech'
  | 'E-commerce'
  | 'Media'
  | 'Automotive'
  | 'SaaS';

export interface TabConfig {
  id: string;
  label: string;
  chips: ChipConfig[];
}

export interface ChipConfig {
  id: string;
  label: string;
}

export const CASE_TABS: TabConfig[] = [
  {
    id: 'categories',
    label: '分类',
    chips: [
      { id: 'ai-llm', label: 'AI & LLM' },
      { id: 'developer-tools', label: '开发工具' },
      { id: 'backend', label: '后端' },
      { id: 'productivity', label: '效率工具' },
      { id: 'design-creative', label: '设计创意' },
      { id: 'fintech', label: '金融科技' },
      { id: 'e-commerce', label: '电商' },
      { id: 'media', label: '媒体' },
      { id: 'automotive', label: '汽车' },
      { id: 'saas', label: 'SaaS' },
    ],
  },
  {
    id: 'styles',
    label: '风格',
    chips: [
      { id: 'minimal', label: '极简' },
      { id: 'dark', label: '暗色系' },
      { id: 'colorful', label: '高饱和' },
      { id: 'developer', label: '开发者风格' },
      { id: 'illustration', label: '插画系' },
    ],
  },
];

export const CATEGORY_TAG_MAP: Record<CaseCategory, string> = {
  'AI & LLM': 'ai-llm',
  'Developer Tools': 'developer-tools',
  'Backend': 'backend',
  'Productivity': 'productivity',
  'Design & Creative': 'design-creative',
  'Fintech': 'fintech',
  'E-commerce': 'e-commerce',
  'Media': 'media',
  'Automotive': 'automotive',
  'SaaS': 'saas',
};

export function filterCases(cases: CaseItem[], activeChips: string[]): CaseItem[] {
  if (activeChips.length === 0) return cases;
  return cases.filter(c => activeChips.some(chip => c.tags.includes(chip)));
}
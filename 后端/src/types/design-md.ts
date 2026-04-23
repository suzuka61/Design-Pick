export interface DesignMDDocument {
  sourceUrl?: string;
  generatedAt: string;
  sections: {
    visualTheme: string;
    colorPalette: string;
    typography: string;
    componentStylings: string;
    layoutPrinciples: string;
    depthAndElevation: string;
    dosAndDonts: string;
    responsiveBehavior: string;
    agentPromptGuide: string;
  };
  rawMarkdown: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export function validateDesignMD(markdown: string): ValidationResult {
  const requiredSections = [
    '## 1. Visual Theme & Atmosphere',
    '## 2. Color Palette & Roles',
    '## 3. Typography Rules',
    '## 4. Component Stylings',
    '## 5. Layout Principles',
    '## 6. Depth & Elevation',
    "## 7. Do's and Don'ts",
    '## 8. Responsive Behavior',
    '## 9. Agent Prompt Guide',
  ];

  const issues: string[] = [];

  for (const section of requiredSections) {
    if (!markdown.includes(section)) {
      issues.push(`Missing section: ${section}`);
    }
  }

  const colorSection = markdown.split('## 2.')[1]?.split('## 3.')[0] ?? '';
  const hexCodes = colorSection.match(/#[0-9a-fA-F]{6}/g);
  if (!hexCodes || hexCodes.length < 3) {
    issues.push('Color section has fewer than 3 hex codes');
  }

  const typoSection = markdown.split('## 3.')[1]?.split('## 4.')[0] ?? '';
  if (!typoSection.includes('| Role |') && !typoSection.includes('| Role|')) {
    issues.push('Typography hierarchy table missing');
  }

  return { valid: issues.length === 0, issues };
}

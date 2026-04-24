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
  tokenMap?: import('../analyzer/token-namer.js').TokenNameMap;
}

export interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
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
  const warnings: string[] = [];

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

  // Token naming soft checks (warnings, not hard failures)
  const colorTokens = colorSection.match(/color-\w+-\d{2,3}/g);
  if (!colorTokens || colorTokens.length < 3) {
    warnings.push('Color section lacks systematic token naming (expected color-{hue}-{shade} patterns)');
  }

  const layoutSection = markdown.split('## 5.')[1]?.split('## 6.')[0] ?? '';
  const spacingTokens = layoutSection.match(/spacing-\w+/g);
  if (!spacingTokens || spacingTokens.length < 2) {
    warnings.push('Layout section lacks spacing token naming (expected spacing-{name} patterns)');
  }

  const radiusTokens = layoutSection.match(/radius-\w+/g);
  if (!radiusTokens || radiusTokens.length < 2) {
    warnings.push('Layout section lacks radius token naming (expected radius-{size} patterns)');
  }

  if (typoSection.length < 100) {
    warnings.push('Typography section is too short — guarantee rule may not have been applied');
  }

  const componentSection = markdown.split('## 4.')[1]?.split('## 5.')[0] ?? '';
  if (!componentSection.includes('Hover') && !componentSection.includes('Disabled')) {
    warnings.push('Component section lacks state completion (hover/disabled)');
  }

  return { valid: issues.length === 0, issues, warnings };
}

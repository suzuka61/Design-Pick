export interface DesignMDDocument {
  sourceUrl?: string;
  generatedAt: string;
  frontmatter: {
    name: string;
    description: string;
  };
  sections: {
    mission: string;
    brand: string;
    visualTheme: string;
    colorPalette: string;
    typography: string;
    componentStylings: string;
    layoutPrinciples: string;
    depthAndElevation: string;
    accessibility: string;
    motionAndTransitions: string;
    dosAndDonts: string;
    responsiveBehavior: string;
    antiPatterns: string;
    qaChecklist: string;
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
    '## 1. Mission',
    '## 2. Brand Context',
    '## 3. Visual Theme & Atmosphere',
    '## 4. Color Palette & Roles',
    '## 5. Typography Rules',
    '## 6. Component Stylings',
    '## 7. Layout Principles',
    '## 8. Depth & Elevation',
    '## 9. Accessibility',
    '## 10. Motion & Transitions',
    "## 11. Do's and Don'ts",
    '## 12. Responsive Behavior',
    '## 13. Anti-Patterns',
    '## 14. QA Checklist',
    '## 15. Agent Prompt Guide',
  ];

  const issues: string[] = [];
  const warnings: string[] = [];

  for (const section of requiredSections) {
    if (!markdown.includes(section)) {
      issues.push(`Missing section: ${section}`);
    }
  }

  const colorSection = markdown.split('## 4.')[1]?.split('## 5.')[0] ?? '';
  const hexCodes = colorSection.match(/#[0-9a-fA-F]{6}/g);
  if (!hexCodes || hexCodes.length < 3) {
    issues.push('Color section has fewer than 3 hex codes');
  }

  const typoSection = markdown.split('## 5.')[1]?.split('## 6.')[0] ?? '';
  if (!typoSection.includes('| Role |') && !typoSection.includes('| Role|')) {
    issues.push('Typography hierarchy table missing');
  }

  const colorTokens = colorSection.match(/color-\w+-\d{2,3}/g);
  if (!colorTokens || colorTokens.length < 3) {
    warnings.push('Color section lacks systematic token naming (expected color-{hue}-{shade} patterns)');
  }

  const layoutSection = markdown.split('## 7.')[1]?.split('## 8.')[0] ?? '';
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

  const componentSection = markdown.split('## 6.')[1]?.split('## 7.')[0] ?? '';
  const stateKeywords = ['Hover', 'Focus-visible', 'Active', 'Disabled', 'Loading', 'Error'];
  const missingStates = stateKeywords.filter(k => !componentSection.includes(k));
  if (missingStates.length > 2) {
    warnings.push(`Component section lacks states: ${missingStates.join(', ')}`);
  }

  const edgeKeywords = ['overflow', 'empty state', 'long content', 'truncation'];
  if (!edgeKeywords.some(k => componentSection.toLowerCase().includes(k))) {
    warnings.push('Component section lacks edge case handling (overflow/empty-state/long-content)');
  }

  const accessibilitySection = markdown.split('## 9.')[1]?.split('## 10.')[0] ?? '';
  if (!accessibilitySection.toLowerCase().includes('wcag')) {
    warnings.push('Accessibility section should reference WCAG standards');
  }
  if (!accessibilitySection.toLowerCase().includes('focus-visible')) {
    warnings.push('Accessibility section should include focus-visible rules');
  }
  if (!accessibilitySection.toLowerCase().includes('contrast')) {
    warnings.push('Accessibility section should include contrast ratio requirements');
  }

  const mustShouldCount = (markdown.match(/🚫 MUST|MUST:/g) ?? []).length;
  const dontCount = (markdown.match(/✅ SHOULD|SHOULD:/g) ?? []).length;
  if (mustShouldCount + dontCount < 3) {
    warnings.push('Document lacks MUST/SHOULD quality gates — rules need constraint strength labels');
  }

  return { valid: issues.length === 0, issues, warnings };
}
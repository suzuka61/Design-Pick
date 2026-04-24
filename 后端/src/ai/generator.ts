import type { AnalyzedPageData } from '../types/analyzed.js';
import type { ScreenshotData } from '../types/extracted.js';
import type { DesignMDDocument } from '../types/design-md.js';
import type { TokenNameMap } from '../analyzer/token-namer.js';
import { AIClient } from './client.js';
import { SYSTEM_PROMPT } from './prompts/system-prompt.js';
import { buildURLUserPrompt } from './prompts/url-prompt.js';

export class DesignMDGenerator {
  private aiClient: AIClient;

  constructor(apiKey?: string, baseURL?: string) {
    this.aiClient = new AIClient(apiKey, baseURL);
  }

  async generateFromAnalysis(
    analysis: AnalyzedPageData,
    screenshots: ScreenshotData,
    options?: { model?: string; tokenMap?: TokenNameMap }
  ): Promise<DesignMDDocument> {
    const userPrompt = buildURLUserPrompt(analysis, options?.tokenMap);
    // Only include viewport screenshot if it's small enough (<800KB base64)
    const MAX_IMAGE_SIZE = 800 * 1024;
    const viewportBase64 = screenshots.viewport.toString('base64');
    const images = viewportBase64.length < MAX_IMAGE_SIZE ? [screenshots.viewport] : undefined;

    const rawMarkdown = await this.aiClient.generateDesignMD(
      SYSTEM_PROMPT,
      userPrompt,
      images,
      { model: options?.model }
    );

    const designDoc = this.parseDesignMD(rawMarkdown);
    if (options?.tokenMap) {
      designDoc.tokenMap = options.tokenMap;
    }
    return designDoc;
  }

  private parseDesignMD(rawMarkdown: string): DesignMDDocument {
    // Clean up markdown (remove ```markdown wrapper if present)
    let md = rawMarkdown.trim();
    if (md.startsWith('```markdown')) md = md.slice(11);
    if (md.startsWith('```')) md = md.slice(3);
    if (md.endsWith('```')) md = md.slice(0, -3);
    md = md.trim();

    // Extract sections
    const sectionHeaders = [
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

    const sectionKeys = [
      'visualTheme', 'colorPalette', 'typography',
      'componentStylings', 'layoutPrinciples', 'depthAndElevation',
      'dosAndDonts', 'responsiveBehavior', 'agentPromptGuide',
    ] as const;

    const sections: DesignMDDocument['sections'] = {
      visualTheme: '',
      colorPalette: '',
      typography: '',
      componentStylings: '',
      layoutPrinciples: '',
      depthAndElevation: '',
      dosAndDonts: '',
      responsiveBehavior: '',
      agentPromptGuide: '',
    };

    for (let i = 0; i < sectionHeaders.length; i++) {
      const startIdx = md.indexOf(sectionHeaders[i]);
      if (startIdx === -1) continue;

      const endIdx = i < sectionHeaders.length - 1
        ? md.indexOf(sectionHeaders[i + 1])
        : md.length;

      const sectionContent = endIdx > startIdx
        ? md.slice(startIdx, endIdx).trim()
        : md.slice(startIdx).trim();

      sections[sectionKeys[i]] = sectionContent;
    }

    return {
      generatedAt: new Date().toISOString(),
      sections,
      rawMarkdown: md,
    };
  }
}

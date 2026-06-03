/**
 * Background Service Worker — orchestrates the extraction pipeline.
 * Each step runs with try-catch so one failure doesn't crash the whole pipeline.
 * Progress is pushed to sidepanel via chrome.runtime.sendMessage after each step.
 */

import {
  analyzePage,
  classifyStability,
  generateTokenNames,
  completeStates,
  buildTokenMapping,
  extractConstraints,
  type FullAnalysisResult,
} from '../analyzer/index';
import type { AnalyzedPageData } from '../types/analyzed';
import { generateDesignMD } from '../generator/template';
import { enhanceWithAI } from '../generator/ai-client';
import { renderPreviewHTML } from '../renderer/html-renderer';
import type { ExtractedPageData } from '../types/extracted';
import type { AIConfig } from '../generator/ai-client';

const STEP_NAMES = [
  'DOM 遍历', '颜色聚类', '排版分析', '间距/圆角', '组件检测',
  '稳定性分类', 'Token 命名', '映射生成', '约束提取', 'DESIGN.md 生成',
];

function sendProgress(stepIndex: number) {
  chrome.runtime.sendMessage({
    type: 'PROGRESS_STEP',
    step: stepIndex,
    stepName: STEP_NAMES[stepIndex] || `Step ${stepIndex}`,
  }).catch(() => { /* sidepanel might not be ready */ });
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Also set on startup
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_REQUEST') {
    handleExtractRequest(message.tabId, sendResponse);
    return true; // keep channel open for async
  }

  if (message.type === 'AI_ENHANCE_REQUEST') {
    handleAIEnhance(message.designMd, message.aiConfig, sendResponse);
    return true;
  }

  if (message.type === 'PING') {
    sendResponse({ type: 'PONG' });
    return false;
  }
});

async function handleExtractRequest(tabId: number, sendResponse: (response: any) => void) {
  try {
    // Step 0: DOM extraction
    sendProgress(0);
    let extractionResponse = await chrome.tabs.sendMessage(tabId, { type: 'START_EXTRACTION' }).catch(() => null);

    if (!extractionResponse) {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      await new Promise(r => setTimeout(r, 300));
      extractionResponse = await chrome.tabs.sendMessage(tabId, { type: 'START_EXTRACTION' });
    }

    if (!extractionResponse || extractionResponse.type === 'EXTRACTION_ERROR') {
      sendResponse({
        type: 'EXTRACT_ERROR',
        error: extractionResponse?.error || 'Content script did not respond',
      });
      return;
    }

    const pageData: ExtractedPageData = extractionResponse.data;

    // Capture screenshot (optional)
    try {
      const screenshot = await chrome.tabs.captureVisibleTab(undefined as any, { format: 'jpeg', quality: 60 });
      pageData.screenshots = {
        fullPage: screenshot,
        viewport: screenshot,
        viewportWidth: 1280,
        viewportHeight: 800,
      };
    } catch {}

    // Steps 1-4: Core analysis (analyzePage runs all sub-analyzers at once)
    // We push progress for each step before/during the call so the UI stays responsive.
    // analyzePage is synchronous, so steps 1-4 update quickly.
    let analysis: AnalyzedPageData | null = null;
    let analyzeError = '';

    sendProgress(1); // Color clustering
    sendProgress(2); // Typography
    sendProgress(3); // Spacing / border-radius
    sendProgress(4); // Component detection
    try {
      analysis = analyzePage(pageData);
    } catch (e: any) {
      analyzeError = e.message || 'unknown error';
      console.warn('[Steps 1-4] analyzePage failed:', analyzeError);
    }

    // If analyzePage never succeeded, we can't continue
    if (!analysis) {
      sendResponse({ type: 'EXTRACT_ERROR', error: 'Analysis pipeline failed: ' + analyzeError });
      return;
    }

    let tokenMap: FullAnalysisResult['tokenMap'] | null = null;
    let mapping: FullAnalysisResult['mapping'] | null = null;
    let constraints: FullAnalysisResult['constraints'] | null = null;

    // Step 5: Stability classification
    sendProgress(5);
    try { classifyStability(analysis); } catch (e: any) { console.warn('[Step 5] Stability classification failed:', e.message); }

    // Step 6: Token naming
    sendProgress(6);
    try { tokenMap = generateTokenNames(analysis); } catch (e: any) { console.warn('[Step 6] Token naming failed:', e.message); }

    // Step 7: Mapping generation
    sendProgress(7);
    try {
      if (tokenMap) {
        completeStates(analysis.components, tokenMap);
        mapping = buildTokenMapping(analysis, tokenMap);
      }
    } catch (e: any) { console.warn('[Step 7] Mapping generation failed:', e.message); }

    // Step 8: Constraint extraction
    sendProgress(8);
    try { constraints = extractConstraints(analysis); } catch (e: any) { console.warn('[Step 8] Constraint extraction failed:', e.message); }

    // Step 9: DESIGN.md generation
    sendProgress(9);
    const doc = generateDesignMD(
      analysis,
      tokenMap || new Map() as any,
      mapping || { tokenToUsage: new Map(), usageToToken: new Map() },
      constraints || { dos: [], donts: [] },
      pageData.url,
    );

    const previewHtml = renderPreviewHTML(doc, tokenMap || undefined);

    const overview = {
      primaryColor: analysis.colors.primary.hex,
      primaryColorName: analysis.colors.primary.name,
      accentColor: analysis.colors.accent.hex,
      fontFamilies: analysis.typography.fontFamilies.map(f => f.name),
      baseUnit: analysis.spacing.baseUnit,
      buttonCount: analysis.components.buttons.length,
      cardCount: analysis.components.cards.length,
    };

    sendResponse({
      type: 'EXTRACT_COMPLETE',
      result: {
        designMd: doc.rawMarkdown,
        previewHtml,
        overview,
      },
    });
  } catch (error: any) {
    sendResponse({
      type: 'EXTRACT_ERROR',
      error: error.message || 'Unknown error',
    });
  }
}

async function handleAIEnhance(designMd: string, aiConfig: AIConfig, sendResponse: (response: any) => void) {
  try {
    const enhancedMd = await enhanceWithAI(designMd, aiConfig);
    sendResponse({ type: 'AI_ENHANCE_COMPLETE', enhancedMd });
  } catch (error: any) {
    sendResponse({ type: 'AI_ENHANCE_ERROR', error: error.message });
  }
}
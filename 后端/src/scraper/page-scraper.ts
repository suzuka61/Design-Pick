import type { Page } from 'playwright';
import type { ExtractedPageData, ScrapeOptions } from '../types/extracted.js';
import { launchBrowser, createContext, closeBrowser } from './browser.js';
import { extractAllStyles } from './style-extractor.js';
import { captureScreenshots } from './screenshot.js';

export async function scrapePage(
  url: string,
  options?: ScrapeOptions
): Promise<ExtractedPageData> {
  const headless = options?.headless ?? true;
  const timeout = options?.timeout ?? 30000;

  const browser = await launchBrowser(headless);
  try {
    const context = await createContext(browser, {
      viewport: options?.viewport,
      darkMode: options?.darkMode,
    });
    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout,
    });

    if (options?.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout });
    }

    // Wait for dynamic rendering and styles to settle
    await page.waitForTimeout(2000);

    const [styleData, screenshots, title, meta] = await Promise.all([
      extractAllStyles(page),
      captureScreenshots(page),
      page.title(),
      page.evaluate(() => ({
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined,
        themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute('content') ?? undefined,
        viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? undefined,
      })),
    ]);

    const body = styleData.elements[0] ?? {
      tagName: 'BODY',
      classes: [],
      computedStyles: {} as ExtractedPageData['body']['computedStyles'],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      children: [],
    };

    return {
      url,
      title,
      meta,
      body,
      screenshots,
      cssVariables: styleData.cssVariables,
      mediaQueries: styleData.mediaQueries,
      fontFaces: styleData.fontFaces,
    };
  } finally {
    await closeBrowser(browser);
  }
}

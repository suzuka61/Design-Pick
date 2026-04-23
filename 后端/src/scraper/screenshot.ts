import type { Page } from 'playwright';
import type { ScreenshotData } from '../types/extracted.js';

export async function captureScreenshots(page: Page): Promise<ScreenshotData> {
  const viewportSize = page.viewportSize() ?? { width: 1440, height: 900 };

  // Use JPEG with low quality to keep base64 size under 500KB
  const [fullPage, viewport] = await Promise.all([
    page.screenshot({ fullPage: true, type: 'jpeg', quality: 50 }),
    page.screenshot({ fullPage: false, type: 'jpeg', quality: 60 }),
  ]);

  return {
    fullPage,
    viewport,
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height,
  };
}

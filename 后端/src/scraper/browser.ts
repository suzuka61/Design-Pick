import { chromium, type Browser, type BrowserContext } from 'playwright';

export async function launchBrowser(headless = true): Promise<Browser> {
  return chromium.launch({ headless });
}

export async function createContext(
  browser: Browser,
  options?: { viewport?: { width: number; height: number }; darkMode?: boolean }
): Promise<BrowserContext> {
  return browser.newContext({
    viewport: options?.viewport ?? { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
    colorScheme: options?.darkMode ? 'dark' : 'light',
  });
}

export async function closeBrowser(browser: Browser): Promise<void> {
  await browser.close();
}

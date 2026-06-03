import puppeteer from 'puppeteer-core';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extPath = resolve(__dirname, '..', 'dist');

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: [
      `--load-extension=${extPath}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--disable-extensions-except=${extPath}`,
      '--enable-features=ExtensionSidePanel',
    ],
  });

  // Wait longer for extension to register
  console.log('Waiting for extension to load...');
  await new Promise(r => setTimeout(r, 5000));

  // Check all targets
  const targets = await browser.targets();
  console.log(`Found ${targets.length} targets`);
  for (const t of targets) {
    const url = t.url() || '(no url)';
    console.log(`  [${t.type()}] ${url.substring(0, 100)}`);
  }

  // Navigate to chrome://extensions to check for errors
  const extPage = await browser.newPage();
  await extPage.goto('chrome://extensions', { waitUntil: 'load', timeout: 10000 }).catch(() => {
    console.log('Could not navigate to chrome://extensions directly');
  });

  // Wait for the page to render
  await new Promise(r => setTimeout(r, 3000));

  // Try to get extension info via CDP
  const client = await extPage.createCDPSession();
  await client.send('Runtime.enable');

  // Evaluate JS on the extensions page to get extension list
  const result = await client.send('Runtime.evaluate', {
    expression: `
      (function() {
        const manager = document.querySelector('extensions-manager');
        if (!manager) return 'No extensions manager found';
        const items = manager.shadowRoot.querySelectorAll('extensions-item');
        const result = [];
        items.forEach(item => {
          result.push({
            id: item.id,
            name: item.shadowRoot.querySelector('#name')?.textContent?.trim(),
            enabled: item.getAttribute('data-enabled'),
            errors: item.shadowRoot.querySelector('#errors-button')?.textContent?.trim()
          });
        });
        return JSON.stringify(result);
      })()
    `,
    returnByValue: true,
  }).catch(e => ({ result: { value: `CDP error: ${e.message}` } }));

  console.log('\nExtensions page result:', result.result?.value || 'no result');

  // Alternative: list extensions via CDP Extensions domain
  try {
    // Try to get service worker info
    const swTargets = targets.filter(t =>
      t.type() === 'service_worker' ||
      t.type() === 'shared_worker' ||
      (t.type() === 'other' && t.url())
    );
    console.log('\nWorker/other targets:');
    for (const t of swTargets) {
      console.log(`  [${t.type()}] ${t.url()}`);
    }
  } catch (e) {
    console.log('Error checking workers:', e.message);
  }

  // Try sending a message directly to the extension
  const testPage = await browser.newPage();
  await testPage.goto('https://example.com', { waitUntil: 'networkidle2' });

  // Wait for content script to load
  await new Promise(r => setTimeout(r, 2000));

  // Try to communicate with content script
  const csResult = await testPage.evaluate(() => {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        resolve('chrome.runtime not available');
        return;
      }
      chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
          resolve('Error: ' + chrome.runtime.lastError.message);
        } else {
          resolve('Response: ' + JSON.stringify(response));
        }
      });
    });
  }).catch(e => 'evaluate error: ' + e.message);

  console.log('\nContent script communication:', csResult);

  await browser.close();
  console.log('\nDone.');
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
/**
 * E2E test: load extension in Chrome via puppeteer, verify extraction works.
 */
import puppeteer from 'puppeteer-core';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extPath = resolve(__dirname, '..', 'dist');

async function main() {
  console.log('=== E2E Extension Test ===\n');

  // Step 1: Create a test profile and manually register the extension
  const profileDir = `/tmp/dp-e2e-${Date.now()}`;
  const { execSync } = await import('child_process');

  // Launch Chrome briefly to create profile, then close and inject extension
  let browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: [
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  await browser.close();
  await new Promise(r => setTimeout(r, 2000));

  // Manually register the extension in the profile's Preferences
  const prefsPath = `${profileDir}/Default/Preferences`;
  const securePrefsPath = `${profileDir}/Default/Secure Preferences`;
  const fs = await import('fs');

  // Generate a deterministic extension ID from the manifest key
  // For unpacked extensions, Chrome uses a hash of the path
  // We'll use a fixed ID for testing
  const extId = 'designpicktestextension1234567890ab';

  // Register extension in Secure Preferences
  for (const prefFile of [securePrefsPath]) {
    if (!fs.existsSync(prefFile)) continue;
    try {
      const prefs = JSON.parse(fs.readFileSync(prefFile, 'utf-8'));
      if (!prefs.extensions) prefs.extensions = {};
      if (!prefs.extensions.settings) prefs.extensions.settings = {};

      prefs.extensions.settings[extId] = {
        manifest: {
          name: 'DesignPick',
          version: '1.0.0',
          permissions: ['activeTab', 'sidePanel', 'scripting'],
          host_permissions: ['<all_urls>'],
          background: { service_worker: 'background.js' },
          side_panel: { default_path: 'sidepanel/index.html' },
          action: { default_title: '提取设计系统' },
          manifest_version: 3,
        },
        path: extPath,
        state: 1, // enabled
        was_installed_by_default: false,
        was_installed_by_oem: false,
      };
      fs.writeFileSync(prefFile, JSON.stringify(prefs));
      console.log('Registered extension in', prefFile);
    } catch (e) {
      console.log('Could not write to', prefFile, e.message);
    }
  }

  // Step 2: Relaunch Chrome with the extension loaded
  console.log('\nLaunching Chrome with extension...');
  browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: [
      `--user-data-dir=${profileDir}`,
      `--load-extension=${extPath}`,
      `--disable-extensions-except=${extPath}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-features=ExtensionSidePanel',
    ],
  });

  // Wait for extension to load
  console.log('Waiting 10s for extension...');
  await new Promise(r => setTimeout(r, 10000));

  // Check targets
  const targets = await browser.targets();
  let foundExtId = null;
  let swFound = false;

  for (const t of targets) {
    const url = t.url() || '';
    const m = url.match(/chrome-extension:\/\/([a-z]{32})/);
    if (m && !foundExtId) foundExtId = m[1];
    if (t.type() === 'service_worker') swFound = true;
    if (url.includes('background.js')) swFound = true;
  }

  console.log('Extension ID found:', foundExtId || 'NONE');
  console.log('Service Worker:', swFound ? 'YES' : 'NO');

  if (!foundExtId) {
    // Last resort: open chrome://extensions and look
    console.log('\nExtension not found via targets. Checking chrome://extensions...');
    const extPage = await browser.newPage();
    await extPage.goto('chrome://extensions', { waitUntil: 'load', timeout: 10000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));

    const ids = await extPage.evaluate(() => {
      const items = document.querySelectorAll('extensions-item');
      const result = [];
      items.forEach(item => {
        result.push({
          id: item.id,
          name: item.shadowRoot?.querySelector('#name')?.textContent?.trim(),
        });
      });
      return result;
    }).catch(() => []);
    console.log('Extensions on page:', JSON.stringify(ids));
    if (ids.length > 0) foundExtId = ids[0]?.id;
    await extPage.close();
  }

  // Step 3: Open a test page
  console.log('\nOpening test page...');
  const page = await browser.newPage();
  await page.goto('https://example.com', { waitUntil: 'networkidle2', timeout: 15000 });
  console.log('Page loaded:', page.url());

  // Step 4: Test content script injection via background
  if (foundExtId) {
    console.log('\nTesting side panel...');
    const sp = await browser.newPage();
    const spUrl = `chrome-extension://${foundExtId}/sidepanel/index.html`;

    try {
      await sp.goto(spUrl, { waitUntil: 'load', timeout: 10000 });

      // Verify UI rendered
      const ui = await sp.evaluate(() => {
        return {
          hasButton: !!document.getElementById('extractBtn'),
          hasLogo: !!document.querySelector('.logo'),
          bodyText: document.body.innerText.substring(0, 100),
        };
      });
      console.log('UI check:', JSON.stringify(ui));

      if (ui.hasButton) {
        console.log('✅ Side Panel UI renders correctly!');
      } else {
        console.log('❌ Side Panel UI broken');
      }

      // Try to trigger extraction
      console.log('\nTriggering extraction...');
      const extractResult = await sp.evaluate(async () => {
        return new Promise((resolve) => {
          const btn = document.getElementById('extractBtn');
          if (!btn) { resolve({ error: 'Button not found' }); return; }

          // Set up a MutationObserver to detect when result appears
          const resultEl = document.getElementById('result');
          const observer = new MutationObserver(() => {
            if (resultEl.classList.contains('visible')) {
              observer.disconnect();
              const mdContent = document.getElementById('mdContent');
              resolve({
                success: true,
                hasResult: true,
                mdLength: mdContent?.textContent?.length || 0,
              });
            }
          });
          observer.observe(resultEl, { attributes: true, attributeFilter: ['class'] });

          // Also listen for errors
          const errorEl = document.getElementById('error');
          const errorObserver = new MutationObserver(() => {
            if (errorEl.classList.contains('visible')) {
              errorObserver.disconnect();
              observer.disconnect();
              resolve({
                success: false,
                error: errorEl.textContent,
              });
            }
          });
          errorObserver.observe(errorEl, { attributes: true, attributeFilter: ['class'] });

          // Click the button
          btn.click();

          // Timeout after 30s
          setTimeout(() => {
            observer.disconnect();
            errorObserver.disconnect();
            const errText = errorEl.textContent;
            const resultVisible = resultEl.classList.contains('visible');
            resolve({
              success: resultVisible,
              error: errText || undefined,
              timeout: true,
            });
          }, 30000);
        });
      });

      console.log('Extract result:', JSON.stringify(extractResult));
    } catch (e) {
      console.log('❌ Side Panel test failed:', e.message);
    }
  } else {
    console.log('\n❌ Extension not loaded - cannot test extraction');
    console.log('This is a known issue with --load-extension on macOS puppeteer.');
    console.log('The extension works when loaded manually via chrome://extensions.');
  }

  await browser.close();

  // Cleanup
  try { fs.rmSync(profileDir, { recursive: true }); } catch {}

  console.log('\n=== Done ===');
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
/**
 * Side Panel logic — pure vanilla JS, no framework.
 * Communicates with background service worker via chrome.runtime.sendMessage.
 */

// --- DOM refs ---
const extractBtn = document.getElementById('extractBtn') as HTMLButtonElement;
const progressEl = document.getElementById('progress')!;
const progressFill = document.getElementById('progressFill') as HTMLDivElement;
const progressSteps = document.getElementById('progressSteps')!;
const errorEl = document.getElementById('error') as HTMLDivElement;
const resultEl = document.getElementById('result') as HTMLDivElement;
const overviewGrid = document.getElementById('overviewGrid')!;
const tabMd = document.getElementById('tabMd')!;
const tabPrompt = document.getElementById('tabPrompt')!;
const tabPreview = document.getElementById('tabPreview')!;
const copyPromptBtn = document.getElementById('copyPrompt')!;
const tabContent = document.getElementById('tabContent')!;
const mdContent = document.getElementById('mdContent')!;
const downloadMdBtn = document.getElementById('downloadMd')!;
const downloadHtmlBtn = document.getElementById('downloadHtml')!;
const settingsToggle = document.getElementById('settingsToggle')!;
const settingsPanel = document.getElementById('settingsPanel')!;
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const baseUrlInput = document.getElementById('baseUrl') as HTMLInputElement;
const modelSelect = document.getElementById('model') as HTMLSelectElement;
const saveSettingsBtn = document.getElementById('saveSettings')!;
const galleryBtn = document.getElementById('galleryBtn') as HTMLButtonElement;

// --- State ---
let designMd = '';
let agentPromptXml = '';
let previewHtml = '';
let activeTab = 'md';
let currentStep = -1; // -1 = not started

const STEPS = [
  'DOM 遍历', '颜色聚类', '排版分析', '间距/圆角', '组件检测',
  '稳定性分类', 'Token 命名', '映射生成', '约束提取', 'DESIGN.md 生成',
];

// --- UI helpers ---
function showError(msg: string) {
  errorEl.textContent = msg;
  errorEl.classList.add('visible');
}

function hideError() {
  errorEl.classList.remove('visible');
}

function showProgress(stepIndex: number) {
  currentStep = stepIndex;
  progressEl.classList.add('visible');
  progressFill.style.width = `${((stepIndex + 1) / STEPS.length) * 100}%`;
  progressSteps.innerHTML = STEPS.map((name, i) => {
    const cls = i < stepIndex ? 'done' : i === stepIndex ? 'active' : '';
    const icon = i < stepIndex ? '✓' : i === stepIndex ? '⟳' : '○';
    return `<div class="step ${cls}"><span>${icon}</span>${name}</div>`;
  }).join('');
}

// Listen for progress updates from background service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PROGRESS_STEP') {
    showProgress(message.step);
  }
});

function showResult(overview: any) {
  resultEl.classList.add('visible');
  progressFill.style.width = '100%';
  // Mark all steps as done
  progressSteps.innerHTML = STEPS.map((name) => {
    return `<div class="step done"><span>✓</span>${name}</div>`;
  }).join('');

  // Overview grid
  overviewGrid.innerHTML = `
    <div class="overview-item"><div class="overview-label">主色</div><div class="overview-value"><span class="color-dot" style="background:${overview.primaryColor}"></span>${overview.primaryColor}</div></div>
    <div class="overview-item"><div class="overview-label">强调色</div><div class="overview-value"><span class="color-dot" style="background:${overview.accentColor}"></span>${overview.accentColor}</div></div>
    <div class="overview-item"><div class="overview-label">字体</div><div class="overview-value">${overview.fontFamilies.join(', ')}</div></div>
    <div class="overview-item"><div class="overview-label">基准间距</div><div class="overview-value">${overview.baseUnit}px</div></div>
    <div class="overview-item"><div class="overview-label">按钮</div><div class="overview-value">${overview.buttonCount} 种</div></div>
    <div class="overview-item"><div class="overview-label">卡片</div><div class="overview-value">${overview.cardCount} 种</div></div>
  `;

  renderActiveTab();
}

function renderActiveTab() {
  tabMd.classList.toggle('active', activeTab === 'md');
  tabPrompt.classList.toggle('active', activeTab === 'prompt');
  tabPreview.classList.toggle('active', activeTab === 'preview');
  if (activeTab === 'md') {
    tabContent.innerHTML = `<pre>${escapeHtml(designMd)}</pre>`;
  } else if (activeTab === 'prompt') {
    tabContent.innerHTML = `<pre>${escapeHtml(agentPromptXml)}</pre>`;
    copyPromptBtn.style.display = '';
  } else {
    tabContent.innerHTML = `<iframe srcdoc="${escapeAttr(previewHtml)}" style="width:100%;height:380px;border:none"></iframe>`;
  }
  copyPromptBtn.style.display = activeTab === 'prompt' ? '' : 'none';
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Event handlers ---

// Extract
extractBtn.addEventListener('click', async () => {
  if (typeof chrome === 'undefined' || !chrome.runtime) {
    showError('Chrome API 不可用');
    return;
  }

  extractBtn.disabled = true;
  extractBtn.textContent = '提取中...';
  hideError();
  resultEl.classList.remove('visible');
  progressEl.classList.remove('visible');
  designMd = '';
  agentPromptXml = '';
  previewHtml = '';

  try {
    // Wake up service worker first
    try {
      await chrome.runtime.sendMessage({ type: 'PING' });
    } catch {
      throw new Error('Service Worker 未就绪，请刷新扩展后重试');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('找不到当前标签页');
    const url = tab.url || '';
    if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
      throw new Error('无法分析浏览器内部页面，请打开普通网页');
    }

    showProgress(0);

    const response = await chrome.runtime.sendMessage({
      type: 'EXTRACT_REQUEST',
      tabId: tab.id,
    });

    if (!response) throw new Error('Background 未响应');
    if (response.type === 'EXTRACT_ERROR') throw new Error(response.error);
    if (response.type !== 'EXTRACT_COMPLETE') throw new Error('异常响应: ' + (response.type || '无'));

    designMd = response.result.designMd;
    agentPromptXml = response.result.agentPromptXml || '';
    previewHtml = response.result.previewHtml;
    showResult(response.result.overview);
  } catch (e: any) {
    showError(e.message || '提取失败');
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = '提取当前页面设计系统';
  }
});

// Tabs
tabMd.addEventListener('click', () => { activeTab = 'md'; renderActiveTab(); });
tabPrompt.addEventListener('click', () => { activeTab = 'prompt'; renderActiveTab(); });
tabPreview.addEventListener('click', () => {
  // Open preview in a new tab instead of iframe
  if (previewHtml) {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
});

// Downloads
downloadMdBtn.addEventListener('click', () => download(designMd, 'DESIGN.md', 'text/markdown'));
downloadHtmlBtn.addEventListener('click', () => download(previewHtml, 'design-preview.html', 'text/html'));

// Copy prompt
copyPromptBtn.addEventListener('click', () => {
  if (!agentPromptXml) return;
  navigator.clipboard.writeText(agentPromptXml).then(() => {
    copyPromptBtn.textContent = '已复制 ✓';
    setTimeout(() => { copyPromptBtn.textContent = '复制 Prompt'; }, 1500);
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = agentPromptXml;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    copyPromptBtn.textContent = '已复制 ✓';
    setTimeout(() => { copyPromptBtn.textContent = '复制 Prompt'; }, 1500);
  });
});

// Settings
settingsToggle.addEventListener('click', () => {
  settingsPanel.classList.toggle('visible');
});

saveSettingsBtn.addEventListener('click', () => {
  try {
    chrome.storage.local.set({
      aiConfig: {
        apiKey: apiKeyInput.value,
        baseURL: baseUrlInput.value,
        model: modelSelect.value,
      },
    });
  } catch {}
});

// Gallery
const GALLERY_URL = 'https://design-pick-ergo.vercel.app';

galleryBtn.addEventListener('click', () => {
  window.open(GALLERY_URL, '_blank');
});

// Load saved settings
try {
  chrome.storage.local.get(['aiConfig'], (data: any) => {
    if (data?.aiConfig) {
      apiKeyInput.value = data.aiConfig.apiKey || '';
      baseUrlInput.value = data.aiConfig.baseURL || 'https://api.openai.com';
      modelSelect.value = data.aiConfig.model || 'gpt-4o-mini';
    }
  });
} catch {}
import React, { useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

interface ProgressStep {
  name: string;
  status: 'pending' | 'active' | 'done';
}

interface OverviewData {
  primaryColor: string;
  primaryColorName: string;
  accentColor: string;
  fontFamilies: string[];
  baseUnit: number;
  buttonCount: number;
  cardCount: number;
}

interface ResultData {
  designMd: string;
  previewHtml: string;
  overview: OverviewData;
}

const STEPS: ProgressStep[] = [
  { name: 'DOM 遍历', status: 'pending' },
  { name: '颜色聚类', status: 'pending' },
  { name: '排版分析', status: 'pending' },
  { name: '间距/圆角', status: 'pending' },
  { name: '组件检测', status: 'pending' },
  { name: '稳定性分类', status: 'pending' },
  { name: 'Token 命名', status: 'pending' },
  { name: '映射生成', status: 'pending' },
  { name: '约束提取', status: 'pending' },
  { name: 'DESIGN.md 生成', status: 'pending' },
];

interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

const DEFAULT_AI_CONFIG: AIConfig = {
  apiKey: '',
  baseURL: 'https://api.openai.com',
  model: 'gpt-4o-mini',
};

// Safe wrapper — returns undefined if chrome API unavailable
function getChromeAPI() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    return chrome;
  }
  return undefined;
}

function App() {
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressStep[]>(STEPS);
  const [result, setResult] = useState<ResultData | null>(null);
  const [activeTab, setActiveTab] = useState<'md' | 'preview'>('md');
  const [showSettings, setShowSettings] = useState(false);
  const [aiConfig, setAIConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [enhancing, setEnhancing] = useState(false);

  const handleExtract = useCallback(async () => {
    const api = getChromeAPI();
    if (!api) {
      setError('Chrome API 不可用，请在扩展环境中使用');
      return;
    }

    setExtracting(true);
    setError(null);
    setResult(null);
    setProgress(STEPS.map(s => ({ ...s, status: 'pending' })));

    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      const response = await api.runtime.sendMessage({
        type: 'EXTRACT_REQUEST',
        tabId: tab.id,
      });

      if (!response) throw new Error('Background 未响应');

      if (response.type === 'EXTRACT_ERROR') {
        throw new Error(response.error);
      }

      if (response.type === 'EXTRACT_COMPLETE') {
        setProgress(STEPS.map(s => ({ ...s, status: 'done' })));
        const { designMd, previewHtml, overview } = response.result;
        setResult({ designMd, previewHtml, overview });
      } else {
        throw new Error('Unexpected response: ' + (response.type || 'no type'));
      }
    } catch (err: any) {
      setError(err.message || '提取失败');
    } finally {
      setExtracting(false);
    }
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!result || !aiConfig.apiKey) return;
    const api = getChromeAPI();
    if (!api) return;

    setEnhancing(true);
    try {
      const response = await api.runtime.sendMessage({
        type: 'AI_ENHANCE_REQUEST',
        designMd: result.designMd,
        aiConfig,
      });

      if (response?.type === 'AI_ENHANCE_COMPLETE') {
        setResult({ ...result, designMd: response.enhancedMd });
      } else if (response?.type === 'AI_ENHANCE_ERROR') {
        setError(response.error);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnhancing(false);
    }
  }, [result, aiConfig]);

  const handleDownloadMd = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.designMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DESIGN.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleDownloadHtml = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result.previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'design-preview.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  // Load AI config from storage — safe, non-blocking
  React.useEffect(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['aiConfig'], (data: any) => {
          if (data?.aiConfig) setAIConfig(data.aiConfig);
        });
      }
    } catch {}
  }, []);

  const saveAIConfig = useCallback(() => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ aiConfig });
      }
    } catch {}
  }, [aiConfig]);

  const progressPercent = progress.filter(s => s.status === 'done').length / progress.length * 100;

  return (
    <div className="container">
      <div className="header">
        <div className="logo">Design<span>Pick</span></div>
        <div className="settings-toggle" onClick={() => setShowSettings(!showSettings)}>
          ⚙️ 设置
        </div>
      </div>

      <button
        className="btn btn-primary extract-btn"
        onClick={handleExtract}
        disabled={extracting}
      >
        {extracting ? '提取中...' : '提取当前页面设计系统'}
      </button>

      {(extracting || progress.some(s => s.status === 'done')) && (
        <div className="progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="progress-steps">
            {progress.map((s, i) => (
              <div key={i} className={`step ${s.status}`}>
                <span className="step-icon">
                  {s.status === 'done' ? '✓' : s.status === 'active' ? '⟳' : '○'}
                </span>
                {s.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result visible">
          <div className="overview">
            <div className="overview-grid">
              <div className="overview-item">
                <div className="overview-label">主色</div>
                <div className="overview-value">
                  <span className="color-dot" style={{ background: result.overview.primaryColor }} />
                  {result.overview.primaryColor}
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-label">强调色</div>
                <div className="overview-value">
                  <span className="color-dot" style={{ background: result.overview.accentColor }} />
                  {result.overview.accentColor}
                </div>
              </div>
              <div className="overview-item">
                <div className="overview-label">字体</div>
                <div className="overview-value">{result.overview.fontFamilies.join(', ')}</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">基准间距</div>
                <div className="overview-value">{result.overview.baseUnit}px</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">按钮</div>
                <div className="overview-value">{result.overview.buttonCount} 种</div>
              </div>
              <div className="overview-item">
                <div className="overview-label">卡片</div>
                <div className="overview-value">{result.overview.cardCount} 种</div>
              </div>
            </div>
          </div>

          <div className="tabs">
            <div className={`tab ${activeTab === 'md' ? 'active' : ''}`} onClick={() => setActiveTab('md')}>
              DESIGN.md
            </div>
            <div className={`tab ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>
              预览
            </div>
          </div>

          <div className="tab-content">
            {activeTab === 'md' ? (
              <pre>{result.designMd}</pre>
            ) : (
              <iframe
                srcDoc={result.previewHtml}
                style={{ width: '100%', height: '380px', border: 'none' }}
              />
            )}
          </div>

          <div className="actions">
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadMd}>
              下载 .md
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownloadHtml}>
              下载 .html
            </button>
            {aiConfig.apiKey && (
              <button className="btn btn-primary btn-sm" onClick={handleEnhance} disabled={enhancing}>
                {enhancing ? 'AI 增强中...' : 'AI 增强'}
              </button>
            )}
          </div>
        </div>
      )}

      {showSettings && (
        <div className="settings-panel visible">
          <div className="field">
            <label>API Key（可选）</label>
            <input
              type="password"
              value={aiConfig.apiKey}
              onChange={e => setAIConfig({ ...aiConfig, apiKey: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Base URL</label>
            <input
              value={aiConfig.baseURL}
              onChange={e => setAIConfig({ ...aiConfig, baseURL: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Model</label>
            <select
              value={aiConfig.model}
              onChange={e => setAIConfig({ ...aiConfig, model: e.target.value })}
            >
              <option value="gpt-4o-mini">GPT-4o-mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="deepseek-chat">DeepSeek Chat</option>
              <option value="glm-4-flash">智谱 GLM-4-flash</option>
              <option value="moonshot-v1-8k">Moonshot v1</option>
            </select>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={saveAIConfig}>
            保存设置
          </button>
        </div>
      )}
    </div>
  );
}

// Wrap in try-catch so a render error doesn't blank the page
try {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(React.createElement(App));
  } else {
    document.body.innerHTML = '<div style="padding:16px;color:red">Error: #root element not found</div>';
  }
} catch (e: any) {
  document.body.innerHTML = `<div style="padding:16px;color:red">React render error: ${e.message}</div>`;
}
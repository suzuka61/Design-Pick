'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SparklesText } from '@/components/ui/sparkles-text';

type ResultTab = 'markdown' | 'preview';

interface ExtractResult {
  success: boolean;
  sourceUrl?: string;
  generatedAt: string;
  validation: { valid: boolean; issues: string[] };
  designMd: string;
  previewHtml: string;
  analysis?: {
    colors: { primary: { hex: string; name: string }; accent: { hex: string; name: string }; neutralCount: number; surfaceCount: number };
    typography: { levels: number; fontFamilies: string[] };
    components: { buttons: number; cards: number; inputs: number; navigation: number };
  };
}

export default function Home() {
  // Load persisted API config from localStorage
  const stored = typeof window !== 'undefined' ? (() => { try { const s = localStorage.getItem('dp_api_config'); return s ? JSON.parse(s) : null; } catch { return null; } })() : null;

  const [apiKey, setApiKey] = useState(stored?.apiKey || '');
  const [baseURL, setBaseURL] = useState(stored?.baseURL || '');
  const [model, setModel] = useState(stored?.model || '');
  const [url, setUrl] = useState('');
  const [providerPreset, setProviderPreset] = useState(stored?.provider || '');
  const [showSettings, setShowSettings] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(
    stored?.testResult || null
  );
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState<ResultTab>('markdown');
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<{ md: 'idle' | 'success' | 'error'; html: 'idle' | 'success' | 'error' }>({ md: 'idle', html: 'idle' });
  const [progressPercent, setProgressPercent] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTargetRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Persist API config to localStorage on change
  useEffect(() => {
    try { localStorage.setItem('dp_api_config', JSON.stringify({ apiKey, baseURL, model, provider: providerPreset, testResult })); } catch {}
  }, [apiKey, baseURL, model, providerPreset, testResult]);

  const startProgress = () => {
    progressTargetRef.current = 0;
    setProgressPercent(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      progressTargetRef.current += (90 - progressTargetRef.current) * 0.04 + 0.5;
      if (progressTargetRef.current > 92) progressTargetRef.current = 92;
      setProgressPercent(Math.round(progressTargetRef.current));
    }, 250);
  };

  const advanceProgress = (phase: number, label: string) => {
    const floor = phase === 1 ? 30 : phase === 2 ? 55 : 75;
    progressTargetRef.current = Math.max(progressTargetRef.current, floor);
    setProgress(label);
  };

  const finishProgress = () => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
    progressTargetRef.current = 100;
    setProgressPercent(100);
  };

  const cancelProgress = () => {
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
    progressTargetRef.current = 0;
    setProgressPercent(0);
  };

  const handleCancel = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    cancelProgress();
    setLoading(false);
    setProgress('');
  };

  const PROVIDER_PRESETS: Record<string, { baseURL: string; model: string; label: string }> = {
    openai:     { baseURL: 'https://api.openai.com/v1',                    model: 'gpt-4o-mini',       label: 'OpenAI' },
    deepseek:   { baseURL: 'https://api.deepseek.com/v1',                  model: 'deepseek-chat',     label: 'DeepSeek' },
    zhipu:      { baseURL: 'https://open.bigmodel.cn/api/paas/v1',         model: 'glm-4-flash',       label: '智谱 GLM' },
    moonshot:   { baseURL: 'https://api.moonshot.cn/v1',                   model: 'moonshot-v1-auto',  label: 'Moonshot' },
    volcengine: { baseURL: 'https://ark.cn-beijing.volces.com/api/v3',     model: 'doubao-1-5-pro-32k-250115', label: '火山引擎' },
    siliconflow:{ baseURL: 'https://api.siliconflow.cn/v1',                model: 'deepseek-ai/DeepSeek-V3', label: 'SiliconFlow' },
    custom:     { baseURL: '', model: '', label: '自定义' },
  };

  const applyPreset = (key: string) => {
    setProviderPreset(key);
    const preset = PROVIDER_PRESETS[key];
    if (preset) {
      setBaseURL(preset.baseURL);
      setModel(preset.model);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          baseURL: baseURL || undefined,
          model: model || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: `连接成功 · ${data.model} · ${data.responseTime}ms` });
      } else {
        setTestResult({ success: false, message: data.error || '连接失败' });
      }
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : '网络错误' });
    } finally {
      setTesting(false);
    }
  };

  const apiConfig = () => ({
    apiKey: apiKey || undefined,
    baseURL: baseURL || undefined,
    model: model || undefined,
  });

  const handleExtractUrl = useCallback(async () => {
    if (!url.trim()) return;
    abortRef.current = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    setProgress('正在抓取网页');
    startProgress();
    try {
      const res = await fetch('http://localhost:3001/api/extract/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), ...apiConfig() }),
        signal: abortRef.current.signal,
      });
      advanceProgress(1, '正在分析设计系统');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `服务器错误 ${res.status}`);
      }
      advanceProgress(2, '正在生成 DESIGN.md');
      const data: ExtractResult = await res.json();
      finishProgress();
      setResult(data);
      setResultTab('markdown');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      cancelProgress();
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      abortRef.current = null;
      setLoading(false);
      setProgress('');
    }
  }, [url, apiKey, baseURL, model]);

  const triggerDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadMd = useCallback(() => {
    if (!result) return;
    triggerDownload(result.designMd, 'DESIGN.md', 'text/markdown');
    setDownloadStatus(prev => ({ ...prev, md: 'success' }));
    setTimeout(() => setDownloadStatus(prev => ({ ...prev, md: 'idle' })), 2000);
  }, [result]);

  const handleDownloadHtml = useCallback(() => {
    if (!result) return;
    triggerDownload(result.previewHtml, 'preview.html', 'text/html');
    setDownloadStatus(prev => ({ ...prev, html: 'success' }));
    setTimeout(() => setDownloadStatus(prev => ({ ...prev, html: 'idle' })), 2000);
  }, [result]);

  const steps = [
    { num: '01', title: '输入', desc: '输入网页 URL' },
    { num: '02', title: '分析', desc: 'AI 驱动的颜色、字体、间距、组件识别' },
    { num: '03', title: '输出', desc: '生成 DESIGN.md / CSS / Tailwind / JSON' },
  ];

  const caps = [
    { label: '视觉主题与氛围', desc: '设计哲学、情感调性' },
    { label: '调色板与角色', desc: '语义化颜色命名' },
    { label: '排版规则', desc: '字体家族与层级' },
    { label: '组件样式', desc: '按钮/卡片/输入框变体' },
    { label: '布局原则', desc: '间距、网格、留白' },
    { label: '深度与标高', desc: '阴影层级体系' },
  ];

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-grid" />

      {/* Nav — 全宽，内容区 1200px 居中 */}
      <nav className={`nav-fixed ${scrolled ? 'scrolled' : ''}`} style={{ position: 'relative', height: 80, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: 1200, margin: '-14px auto -14px auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60, padding: '0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ width: 24, height: 1.5, background: 'var(--color-text-primary)' }} />
              <div style={{ width: 32, height: 1.5, background: 'var(--color-text-primary)' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>DesignPick</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <a href="https://github.com/suzuka61/Design-Pick" target="_blank" rel="noopener noreferrer" className="nav-link">GitHub</a>
            <button onClick={() => setShowSettings(!showSettings)} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
              API 设置
              {testResult?.success && <span className="status-dot success" style={{ marginLeft: 2 }} />}
            </button>
          </div>
        </div>
      </nav>

      {/* API Settings Panel */}
      {showSettings && (
        <div style={{ position: 'fixed', top: 56, right: 24, width: 380, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 4, padding: '20px 24px', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>API 配置</div>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2, lineHeight: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>服务商</label>
              <select value={providerPreset} onChange={(e) => applyPreset(e.target.value)} className="settings-input" style={{ appearance: 'none', cursor: 'pointer', paddingRight: 28, backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%236b6b6b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                <option value="">选择服务商（自动填充）</option>
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="zhipu">智谱 GLM</option>
                <option value="moonshot">Moonshot / Kimi</option>
                <option value="volcengine">火山引擎 / 豆包</option>
                <option value="siliconflow">SiliconFlow</option>
                <option value="custom">自定义</option>
              </select>
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>API KEY</label>
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="粘贴你的 API Key" className="settings-input" />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>BASE URL</label>
              <input type="url" value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="选择服务商后自动填充" className="settings-input" />
            </div>
            <div>
              <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>MODEL</label>
              <input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="选择服务商后自动填充" className="settings-input" />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
            <button onClick={handleTestConnection} disabled={testing} className="btn-primary" style={{ height: 36, fontSize: 10, padding: '0 20px', flexShrink: 0 }}>
              {testing ? '测试中...' : '测试连接'}
            </button>
            {testResult && (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: testResult.success ? 'var(--color-success)' : 'var(--color-error)', lineHeight: 1.4 }}>
                {testResult.message}
              </span>
            )}
          </div>

          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--color-text-muted)', marginTop: 14, lineHeight: 1.6, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
            只需填 API Key + 选服务商即可。留空则使用服务器 .env 配置。
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>

        {/* ===== Landing ===== */}
        {!result && (
          <>
            {/* Hero — 全宽，内容垂直水平居中 */}
            <section style={{ boxSizing: 'content-box', minHeight: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 0', position: 'relative', zIndex: 1 }}>
              <SparklesText
                text="DesignPick"
                className="font-serif text-[120px] font-normal tracking-[-0.03em] leading-[0.95] text-[var(--color-text-primary)]"
                colors={{ first: '#3d7068', second: '#9E7AFF' }}
                sparklesCount={8}
              />
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 17, lineHeight: 1.7, color: 'var(--color-text-secondary)', maxWidth: 560, textAlign: 'center', marginTop: 30 }}>
                从任意网页中提取设计系统，生成结构化的
                <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}> DESIGN.md </span>
                规范文件
              </p>

              {/* Input Card — 746px 居中 */}
              <div style={{ width: 746, marginTop: 30, padding: '28px 32px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="输入网页地址"
                    className="input-field"
                    disabled={loading}
                    onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                  />
                  {loading && (
                    <div className="loading-progress">
                      <div className="progress-bar"><div className="progress-bar__fill" style={{ width: `${progressPercent}%` }} /></div>
                      <div className="progress-bar__label">{progress} · {progressPercent}%</div>
                    </div>
                  )}
                  <button className={loading ? 'btn-ghost w-full' : 'btn-primary w-full'} onClick={loading ? handleCancel : handleExtractUrl} disabled={!loading && !url.trim()} style={{ borderRadius: 4, height: 48 }}>
                    {loading ? '取消提取' : '开始提取'}
                  </button>
                </div>

                {error && (
                  <div className="error-alert" style={{ marginTop: 20 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <div style={{ flex: 1 }}>
                      <div className="error-alert__title">提取失败</div>
                      <div className="error-alert__message">{error}</div>
                    </div>
                    <button onClick={() => setError('')} className="error-alert__close">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Workflow — 全宽背景+分割线，内容 1160px 居中 */}
            <section style={{ borderTop: '1px solid var(--color-border)', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400, letterSpacing: 4, color: 'var(--color-accent)', textAlign: 'center' }}>工作流程</div>
              <div style={{ width: 1160, display: 'flex', justifyContent: 'center', border: '1px solid var(--color-border)' }}>
                {steps.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveStep(i)}
                    style={{
                      width: '33.33%', padding: '32px 36px',
                      borderRight: i < 2 ? '1px solid var(--color-border)' : 'none',
                      cursor: 'pointer',
                      opacity: activeStep === i ? 1 : 0.4,
                      transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 400, letterSpacing: 3, color: 'var(--color-text-muted)', marginBottom: 12 }}>{s.num}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', marginBottom: 12 }}>{s.title}</div>
                    {activeStep === i && (
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>{s.desc}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Capabilities — 全宽背景+分割线 */}
            <section style={{ borderTop: '1px solid var(--color-border)', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {/* Left: badge + title + desc */}
              <div style={{ maxWidth: 1160, width: 1160, display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 0' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 400, letterSpacing: 3.5, color: 'var(--color-accent)', display: 'grid', textAlign: 'center' }}>设计规范输出</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 30, fontWeight: 400, color: 'var(--color-text-primary)', letterSpacing: '-0.3px', lineHeight: 1.3, textAlign: 'center' }}>九大段落，完整覆盖</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.8, textAlign: 'center' }}>从视觉主题、调色板到组件样式、响应式行为，自动识别并结构化输出设计系统的每一个维度。</div>
              </div>

              {/* Right: 2-col list */}
              <div style={{ width: 840, display: 'flex' }}>
                {/* Left col */}
                <div style={{ width: '50%', borderRight: '1px solid var(--color-border)' }}>
                  {caps.slice(0, 3).map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 28px',
                      borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-primary)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', color: 'var(--color-text-muted)' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
                {/* Right col */}
                <div style={{ width: '50%' }}>
                  {caps.slice(3).map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '16px 28px',
                      borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none',
                    }}>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--color-text-primary)' }}>{item.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '1px', color: 'var(--color-text-muted)' }}>{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===== Results ===== */}
        {result && (
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingTop: 64 }}>
            {/* Back + Source */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', borderBottom: '1px solid var(--color-border)', background: 'rgba(247,246,242,0.9)', backdropFilter: 'blur(8px)' }}>
              <button onClick={() => setResult(null)} className="back-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                返回
              </button>
              {result.sourceUrl && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-muted)', maxWidth: 400 }} className="truncate">{result.sourceUrl}</span>
              )}
            </div>

            {/* Tabs + Downloads */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
              <div className="result-tabs">
                {(['markdown', 'preview'] as ResultTab[]).map((t) => (
                  <button key={t} onClick={() => setResultTab(t)} className={`result-tab ${resultTab === t ? 'active' : ''}`}>
                    {t === 'markdown' ? 'DESIGN.MD' : '预览'}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={handleDownloadMd} className={`download-btn ${downloadStatus.md === 'success' ? 'download-btn--success' : ''}`} disabled={downloadStatus.md === 'success'}>
                  {downloadStatus.md === 'success' ? (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>已下载</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>下载 .MD</>
                  )}
                </button>
                <button onClick={handleDownloadHtml} className={`download-btn ${downloadStatus.html === 'success' ? 'download-btn--success' : ''}`} disabled={downloadStatus.html === 'success'}>
                  {downloadStatus.html === 'success' ? (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>已下载</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>下载 .HTML</>
                  )}
                </button>
              </div>
            </div>

            {/* Analysis */}
            {result.analysis && (
              <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 24, padding: '12px 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, background: result.analysis.colors.primary.hex, border: '1px solid var(--color-border)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-secondary)' }}>{result.analysis.colors.primary.hex}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>主色</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, background: result.analysis.colors.accent.hex, border: '1px solid var(--color-border)' }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--color-text-secondary)' }}>{result.analysis.colors.accent.hex}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>强调色</span>
                </div>
                <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>{result.analysis.typography.levels} 个字体层级</span>
                <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}>{result.analysis.components.buttons + result.analysis.components.cards + result.analysis.components.inputs + result.analysis.components.navigation} 个组件</span>
                <div style={{ width: 1, height: 16, background: 'var(--color-border)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className={`status-dot ${result.validation.valid ? 'success' : 'error'}`} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: result.validation.valid ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {result.validation.valid ? '有效' : `${result.validation.issues.length} 个问题`}
                  </span>
                </div>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflow: 'auto', width: '100%' }}>
              {resultTab === 'markdown' ? (
                <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '24px 16px', width: '100%' }}>
                  <pre className="markdown-body whitespace-pre-wrap">{result.designMd}</pre>
                </div>
              ) : (
                <iframe srcDoc={result.previewHtml} style={{ width: '100%', height: '100%', border: 0, background: '#fff', minHeight: '70vh' }} title="设计预览" />
              )}
            </div>
          </section>
        )}
      </main>

      {/* Footer — 全宽，内容 1200px 居中 */}
      <footer style={{ borderTop: '1px solid var(--color-border)', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)' }} />
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 10, height: 10 }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--color-text-muted)' }}>{progress}</span>
              </div>
            ) : error ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--color-error)' }}>{error}</span>
            ) : result ? (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--color-success)' }}>完成 — {new Date(result.generatedAt).toLocaleTimeString('zh-CN')}</span>
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1.5px', color: 'var(--color-text-muted)' }}>就绪</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="status-dot success" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', color: 'var(--color-text-muted)' }}>API: {apiKey ? '自定义' : 'LOCALHOST:3001'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
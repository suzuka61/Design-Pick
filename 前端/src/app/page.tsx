'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { ApiSettings } from '@/components/ApiSettings';
import { HeroSection } from '@/components/HeroSection';
import { CaseGallery } from '@/components/CaseGallery';
import { CaseDetailSheet } from '@/components/CaseDetailSheet';
import { ExtractResultView } from '@/components/ExtractResultView';
import { HistoryPanel, loadHistory, addHistory, removeHistory } from '@/components/HistoryPanel';
import type { HistoryItem } from '@/components/HistoryPanel';
import { Footer } from '@/components/Footer';
import type { CaseItem } from '@/lib/cases-data';

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
  // API config
  const stored = typeof window !== 'undefined' ? (() => { try { const s = localStorage.getItem('dp_api_config'); return s ? JSON.parse(s) : null; } catch { return null; } })() : null;
  const [apiKey, setApiKey] = useState(stored?.apiKey || '');
  const [baseURL, setBaseURL] = useState(stored?.baseURL || '');
  const [model, setModel] = useState(stored?.model || '');
  const [providerPreset, setProviderPreset] = useState(stored?.provider || '');
  const [showSettings, setShowSettings] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(stored?.testResult || null);
  const [testing, setTesting] = useState(false);

  // Extract state
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState('');
  const [resultTab, setResultTab] = useState<ResultTab>('markdown');
  const [downloadStatus, setDownloadStatus] = useState<{ md: 'idle' | 'success' | 'error'; html: 'idle' | 'success' | 'error' }>({ md: 'idle', html: 'idle' });
  const [progressPercent, setProgressPercent] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTargetRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Case detail sheet
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // History
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistoryItems(loadHistory());
  }, []);

  useEffect(() => {
    try { localStorage.setItem('dp_api_config', JSON.stringify({ apiKey, baseURL, model, provider: providerPreset, testResult })); } catch {}
  }, [apiKey, baseURL, model, providerPreset, testResult]);

  // Progress helpers
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

  // API actions
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey || undefined, baseURL: baseURL || undefined, model: model || undefined }),
      });
      const data = await res.json();
      setTestResult(data.success
        ? { success: true, message: `连接成功 · ${data.model} · ${data.responseTime}ms` }
        : { success: false, message: data.error || '连接失败' }
      );
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : '网络错误' });
    } finally {
      setTesting(false);
    }
  };

  const apiConfig = () => ({ apiKey: apiKey || undefined, baseURL: baseURL || undefined, model: model || undefined });

  const handleExtractUrl = useCallback(async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || url;
    if (!targetUrl.trim()) return;
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
        body: JSON.stringify({ url: targetUrl.trim(), ...apiConfig() }),
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
      // Save to history
      addHistory({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        url: data.sourceUrl || targetUrl.trim(),
        generatedAt: data.generatedAt,
        designMd: data.designMd,
        previewHtml: data.previewHtml,
      });
      setHistoryItems(loadHistory());
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

  const handleCancel = () => {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    cancelProgress();
    setLoading(false);
    setProgress('');
  };

  // Download helpers
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

  // Case interactions
  const handleCaseClick = (c: CaseItem) => {
    setSelectedCase(c);
    setSheetOpen(true);
  };

  const handleLiveExtract = (targetUrl: string) => {
    setUrl(targetUrl);
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => handleExtractUrl(targetUrl), 400);
  };

  const handleDownloadDesign = (c: CaseItem) => {
    if (c.designMdUrl) {
      const a = document.createElement('a');
      a.href = c.designMdUrl;
      a.download = `DESIGN-${c.slug}.md`;
      a.click();
    } else {
      handleLiveExtract(c.url);
    }
  };

  // History interactions
  const handleHistorySelect = (item: HistoryItem) => {
    setResult({
      success: true,
      sourceUrl: item.url,
      generatedAt: item.generatedAt,
      validation: { valid: true, issues: [] },
      designMd: item.designMd,
      previewHtml: item.previewHtml,
    });
    setResultTab('markdown');
    setShowHistory(false);
  };

  const handleHistoryRemove = (id: string) => {
    const updated = removeHistory(id);
    setHistoryItems(updated);
  };

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        onToggleSettings={() => setShowSettings(!showSettings)}
        onToggleHistory={() => setShowHistory(!showHistory)}
      />
      <ApiSettings
        apiKey={apiKey} setApiKey={setApiKey}
        baseURL={baseURL} setBaseURL={setBaseURL}
        model={model} setModel={setModel}
        providerPreset={providerPreset} setProviderPreset={setProviderPreset}
        showSettings={showSettings} setShowSettings={setShowSettings}
        testResult={testResult} setTestResult={setTestResult}
        testing={testing} handleTestConnection={handleTestConnection}
      />

      <main style={{ flex: 1, position: 'relative', zIndex: 10 }}>
        {!result ? (
          <>
            <HeroSection
              url={url} setUrl={setUrl}
              loading={loading} progress={progress}
              progressPercent={progressPercent}
              error={error} setError={setError}
              onSubmit={() => handleExtractUrl()}
              onCancel={handleCancel}
            />
            <CaseGallery onCaseClick={handleCaseClick} />
          </>
        ) : (
          <ExtractResultView
            result={result}
            onBack={() => setResult(null)}
            resultTab={resultTab}
            setResultTab={setResultTab}
            downloadStatus={downloadStatus}
            onDownloadMd={handleDownloadMd}
            onDownloadHtml={handleDownloadHtml}
          />
        )}
      </main>

      <Footer
        loading={loading} progress={progress}
        error={error} result={result}
        apiKey={apiKey}
      />

      <CaseDetailSheet
        caseItem={selectedCase}
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedCase(null); }}
        onLiveExtract={handleLiveExtract}
        onDownloadDesign={handleDownloadDesign}
      />

      <HistoryPanel
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onSelect={handleHistorySelect}
        onRemove={handleHistoryRemove}
        items={historyItems}
      />
    </div>
  );
}
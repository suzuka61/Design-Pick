"use client";

import { PROVIDER_PRESETS } from '@/lib/constants';

interface ApiSettingsProps {
  apiKey: string; setApiKey: (v: string) => void;
  baseURL: string; setBaseURL: (v: string) => void;
  model: string; setModel: (v: string) => void;
  providerPreset: string; setProviderPreset: (v: string) => void;
  showSettings: boolean; setShowSettings: (v: boolean) => void;
  testResult: { success: boolean; message: string } | null;
  setTestResult: (v: { success: boolean; message: string } | null) => void;
  testing: boolean; handleTestConnection: () => void;
}

export function ApiSettings({
  apiKey, setApiKey, baseURL, setBaseURL, model, setModel,
  providerPreset, setProviderPreset, showSettings, setShowSettings,
  testResult, testing, handleTestConnection,
}: ApiSettingsProps) {
  if (!showSettings) return null;

  const applyPreset = (key: string) => {
    setProviderPreset(key);
    const preset = PROVIDER_PRESETS[key];
    if (preset) { setBaseURL(preset.baseURL); setModel(preset.model); }
  };

  const inputStyle = {
    width: '100%', background: 'rgba(30,30,30,0.04)', border: '1px solid var(--color-border)',
    borderRadius: 6, padding: '14px 16px', color: 'var(--color-text-primary)',
    fontSize: 'var(--text-body-sm)', fontFamily: 'var(--font-body)', fontWeight: 500, outline: 'none',
  };

  const labelStyle = {
    fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500,
    textTransform: 'uppercase' as const, letterSpacing: 'var(--tracking-caps)',
    color: 'var(--color-text-muted)', display: 'block', marginBottom: 6,
  };

  return (
    <div style={{ position: 'fixed', top: 80, right: 40, width: 400, background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '28px', zIndex: 100, boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>API 设置</div>
        <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div><label style={labelStyle}>服务商</label><select value={providerPreset} onChange={(e) => applyPreset(e.target.value)} style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}><option value="">选择服务商</option>{Object.entries(PROVIDER_PRESETS).map(([key, preset]) => (<option key={key} value={key}>{preset.label}</option>))}</select></div>
        <div><label style={labelStyle}>API 密钥</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="粘贴 API Key" style={inputStyle} /></div>
        <div><label style={labelStyle}>接口地址</label><input type="url" value={baseURL} onChange={(e) => setBaseURL(e.target.value)} placeholder="选择服务商后自动填充" style={inputStyle} /></div>
        <div><label style={labelStyle}>模型</label><input type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="选择服务商后自动填充" style={inputStyle} /></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
        <button onClick={handleTestConnection} disabled={testing} className="btn-pill">
          {testing ? '测试中...' : '测试连接'}
        </button>
        {testResult && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: testResult.success ? 'var(--color-success)' : 'var(--color-error)' }}>
            {testResult.message}
          </span>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-muted)', marginTop: 18, lineHeight: 'var(--leading-normal)', borderTop: '1px solid var(--color-border)', paddingTop: 14 }}>
        填写 API Key + 选择服务商即可。留空则使用服务器 .env 配置。
      </div>
    </div>
  );
}
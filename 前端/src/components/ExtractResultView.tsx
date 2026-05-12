"use client";

type ResultTab = 'markdown' | 'preview';

interface ExtractResult {
  success: boolean; sourceUrl?: string; generatedAt: string;
  validation: { valid: boolean; issues: string[] };
  designMd: string; previewHtml: string;
  analysis?: {
    colors: { primary: { hex: string; name: string }; accent: { hex: string; name: string }; neutralCount: number; surfaceCount: number };
    typography: { levels: number; fontFamilies: string[] };
    components: { buttons: number; cards: number; inputs: number; navigation: number };
  };
}

interface ExtractResultViewProps {
  result: ExtractResult; onBack: () => void;
  resultTab: ResultTab; setResultTab: (v: ResultTab) => void;
  downloadStatus: { md: 'idle' | 'success' | 'error'; html: 'idle' | 'success' | 'error' };
  onDownloadMd: () => void; onDownloadHtml: () => void;
}

export function ExtractResultView({ result, onBack, resultTab, setResultTab, downloadStatus, onDownloadMd, onDownloadHtml }: ExtractResultViewProps) {
  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', paddingTop: 80 }}>
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16, padding: '16px 40px', borderBottom: '1px solid var(--color-border)', background: 'rgba(242,242,242,0.9)', backdropFilter: 'blur(8px)' }}>
        <button onClick={onBack} className="btn-pill" style={{ color: 'var(--color-text-secondary)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          返回
        </button>
        {result.sourceUrl && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-muted)', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.sourceUrl}</span>
        )}
      </div>

      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ display: 'flex', gap: 0, border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
          {(['markdown', 'preview'] as ResultTab[]).map((t) => (
            <button key={t} onClick={() => setResultTab(t)} style={{
              padding: '10px 24px', fontSize: 'var(--text-body-sm)', fontWeight: 500,
              fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
              border: 'none', cursor: 'pointer',
              color: resultTab === t ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              background: resultTab === t ? 'var(--color-surface-raised)' : 'transparent',
              borderRight: t === 'markdown' ? '1px solid var(--color-border)' : 'none',
              transition: 'all 200ms ease',
            }}>
              {t === 'markdown' ? 'DESIGN.md' : '预览'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onDownloadMd} disabled={downloadStatus.md === 'success'} className="btn-pill">
            {downloadStatus.md === 'success' ? (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>已下载</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>下载 .MD</>)}
          </button>
          <button onClick={onDownloadHtml} disabled={downloadStatus.html === 'success'} className="btn-pill" style={{
            background: downloadStatus.html === 'success' ? 'var(--color-success)' : undefined,
            borderColor: downloadStatus.html === 'success' ? 'var(--color-success)' : undefined,
            color: downloadStatus.html === 'success' ? '#fff' : undefined,
          }}>
            {downloadStatus.html === 'success' ? (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>已下载</>) : (<><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>下载 .HTML</>)}
          </button>
        </div>
      </div>

      {result.analysis && (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 20, padding: '14px 40px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: result.analysis.colors.primary.hex, border: '1px solid var(--color-border)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{result.analysis.colors.primary.hex}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>主色</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 4, background: result.analysis.colors.accent.hex, border: '1px solid var(--color-border)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{result.analysis.colors.accent.hex}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>强调色</span>
          </div>
          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-muted)' }}>{result.analysis.typography.levels} 个字体层级</span>
          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-muted)' }}>{result.analysis.components.buttons + result.analysis.components.cards + result.analysis.components.inputs + result.analysis.components.navigation} 个组件</span>
          <div style={{ width: 1, height: 20, background: 'var(--color-border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: result.validation.valid ? 'var(--color-success)' : 'var(--color-error)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: result.validation.valid ? 'var(--color-success)' : 'var(--color-error)' }}>
              {result.validation.valid ? '有效' : `${result.validation.issues.length} 个问题`}
            </span>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto', width: '100%' }}>
        {resultTab === 'markdown' ? (
          <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '32px 24px', width: '100%' }}>
            <pre className="markdown-body whitespace-pre-wrap">{result.designMd}</pre>
          </div>
        ) : (
          <iframe srcDoc={result.previewHtml} style={{ width: '100%', height: '100%', border: 0, background: '#fff', minHeight: '70vh' }} title="设计预览" />
        )}
      </div>
    </section>
  );
}
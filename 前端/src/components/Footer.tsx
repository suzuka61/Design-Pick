"use client";

interface FooterProps {
  loading: boolean;
  progress: string;
  error: string;
  result: { generatedAt: string } | null;
  apiKey: string;
}

export function Footer({ loading, progress, error, result, apiKey }: FooterProps) {
  return (
    <footer style={{ background: 'var(--color-footer-bg)', position: 'relative', zIndex: 10 }}>
      <div style={{ borderTop: '1px solid var(--color-footer-border)' }} />
      <div style={{ maxWidth: 'var(--content-width)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--color-footer-text)', letterSpacing: '-0.02em' }}>
            DesignPick
          </span>
          {loading && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-footer-text)' }}>
              {progress}...
            </span>
          )}
          {error && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-error)' }}>
              错误: {error}
            </span>
          )}
          {result && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-success)' }}>
              完成 — {new Date(result.generatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'rgba(246,246,246,0.35)' }}>
            API: {apiKey ? '自定义' : '本地'}
          </span>
        </div>
      </div>
    </footer>
  );
}
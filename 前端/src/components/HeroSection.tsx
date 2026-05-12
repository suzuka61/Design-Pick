"use client";

import { SplitText } from '@/components/SplitText';

interface HeroSectionProps {
  url: string;
  setUrl: (v: string) => void;
  loading: boolean;
  progress: string;
  progressPercent: number;
  error: string;
  setError: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function HeroSection({ url, setUrl, loading, progress, progressPercent, error, setError, onSubmit, onCancel }: HeroSectionProps) {
  return (
    <section className="hero-section">
      {/* Dot pattern background */}
      <div className="hero-dots" />

      {/* Hero title */}
      <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative', zIndex: 2 }}>
        <SplitText
          text="Design System"
          tag="h1"
          className="hero-title"
          splitType="chars"
          delay={40}
          duration={1}
          from={{ opacity: 0, y: 60 }}
          to={{ opacity: 1, y: 0 }}
          textAlign="center"
        />
      </div>

      {/* 副标题 */}
      <p className="hero-subtitle" style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', fontWeight: 500,
        color: 'var(--color-text-muted)', lineHeight: 'var(--leading-normal)',
        maxWidth: 420, textAlign: 'center', marginBottom: 48,
        position: 'relative', zIndex: 2,
      }}>
        从任意网站提取设计系统，生成结构化 DESIGN.md
      </p>

      {/* 输入区 */}
      <div className="hero-input" style={{
        display: 'flex', alignItems: 'stretch', gap: 0,
        width: '100%', maxWidth: 640, marginBottom: 32,
        border: '1px solid var(--color-border-strong)', borderRadius: 6,
        overflow: 'hidden', background: 'var(--color-surface-raised)',
        position: 'relative', zIndex: 2,
        transition: 'box-shadow var(--transition-smooth)',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴网站 URL..."
            disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', fontWeight: 500,
              color: 'var(--color-text-primary)', height: 48,
            }}
          />
          {url && !loading && (
            <button onClick={() => setUrl('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <button onClick={onSubmit} disabled={loading} style={{
          height: 48, padding: '0 28px', border: 'none', borderLeft: '1px solid var(--color-border)',
          background: loading ? 'var(--color-text-muted)' : 'var(--color-accent)',
          color: 'var(--color-accent-text)', cursor: loading ? 'default' : 'pointer',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
          transition: 'background var(--transition-fast)', flexShrink: 0,
        }}>
          {loading ? '提取中...' : '开始提取'}
        </button>
      </div>

      {/* 加载 / 错误 */}
      {loading && (
        <div style={{ width: '100%', maxWidth: 640, position: 'relative', zIndex: 2 }}>
          <div style={{ height: 2, background: 'var(--color-border)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--color-accent)', borderRadius: 1, transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {progress} · {progressPercent}%
          </div>
          <button onClick={onCancel} className="btn-pill" style={{ marginTop: 16, width: '100%', color: 'var(--color-text-secondary)' }}>
            取消
          </button>
        </div>
      )}

      {error && (
        <div style={{
          width: '100%', maxWidth: 640, position: 'relative', zIndex: 2,
          padding: '14px 20px', background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
          <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-error)' }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Scroll hint */}
      <a href="#cases" className="hero-scroll" style={{
        fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600,
        color: 'var(--color-text-muted)', textDecoration: 'none',
        textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)',
        marginTop: 40, display: 'flex', alignItems: 'center', gap: 8,
        position: 'relative', zIndex: 2,
        transition: 'color var(--transition-fast)',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
        浏览案例库
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
      </a>
    </section>
  );
}
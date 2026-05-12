"use client";

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CaseItem } from '@/lib/cases-data';

interface CaseDetailSheetProps {
  caseItem: CaseItem | null;
  open: boolean;
  onClose: () => void;
  onLiveExtract: (url: string) => void;
  onDownloadDesign: (caseItem: CaseItem) => void;
}

export function CaseDetailSheet({ caseItem, open, onClose, onLiveExtract, onDownloadDesign }: CaseDetailSheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!caseItem) return null;

  const s = caseItem.summary;

  const colors = [
    { hex: s.primaryColor, label: '主色' },
    { hex: s.accentColor, label: '强调色' },
    { hex: s.surfaceColor, label: '表面色' },
    { hex: s.backgroundColor, label: '背景色' },
    { hex: s.textColor, label: '文字色' },
    { hex: s.borderColor, label: '边框色' },
  ];

  const stats = [
    { value: s.componentCount, label: '组件' },
    { value: s.typographyLevels, label: '字体层级' },
    { value: s.fontFamilies.length, label: '字体族' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 50 }} />

          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100vw', background: 'var(--color-sheet-bg)', borderLeft: '1px solid var(--color-sheet-border)', zIndex: 60, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img src={caseItem.favicon} alt="" width={36} height={36} style={{ borderRadius: 8, flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>{caseItem.name}</div>
                  <a href={caseItem.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-text-muted)', textDecoration: 'none' }}>
                    {caseItem.url.replace(/^https?:\/\//, '')} ↗
                  </a>
                </div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, transition: 'color 200ms' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'; }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Preview image */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', background: '#e5e5e5' }}>
                <img src={caseItem.screenshot} alt={caseItem.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            </div>

            {/* Full Design System Summary */}
            <div style={{ padding: '32px', flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 32 }}>
                设计系统摘要
              </div>

              {/* Colors — 6 swatches */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: 16 }}>色彩系统</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {colors.map(c => (
                    <div key={c.hex} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ width: '100%', aspectRatio: '1', borderRadius: 8, background: c.hex, border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-text-secondary)', textAlign: 'center' }}>{c.hex}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-micro)', fontWeight: 600, color: 'var(--color-text-muted)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typography */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: 16 }}>字体系统</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', minWidth: 56 }}>标题</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{s.headingFont}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', minWidth: 56 }}>正文</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{s.bodyFont}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', minWidth: 56 }}>层级</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{s.headingSizes}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {s.fontFamilies.map((f, i) => (
                      <span key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-text-primary)', padding: '6px 14px', borderRadius: 6, background: 'rgba(30,30,30,0.05)', border: '1px solid var(--color-border)' }}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 40, marginBottom: 32, padding: '24px', background: 'rgba(30,30,30,0.02)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                {stats.map(st => (
                  <div key={st.label}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-display)' }}>{st.value}</div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500, color: 'var(--color-text-muted)', marginTop: 8, textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>{st.label}</div>
                  </div>
                ))}
              </div>

              {/* Spacing & Radius */}
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: 16 }}>间距与圆角</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', minWidth: 56 }}>间距</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{s.spacingScale}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)', minWidth: 56 }}>圆角</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{s.borderRadius}</span>
                  </div>
                </div>
              </div>

              {/* Visual theme + Layout + Animation */}
              <div style={{ padding: '20px 24px', borderRadius: 8, background: 'rgba(30,30,30,0.03)', border: '1px solid var(--color-border)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: 14 }}>视觉风格</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>主题</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginLeft: 10, fontStyle: 'italic' }}>&ldquo;{s.visualTheme}&rdquo;</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>布局</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginLeft: 10 }}>{s.layoutStyle}</span>
                  </div>
                  <div>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>动效</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-secondary)', marginLeft: 10 }}>{s.animationStyle}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: '32px', borderTop: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => onDownloadDesign(caseItem)} className="btn-pill" style={{ width: '100%' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                下载 DESIGN.md
              </button>
              <button onClick={() => onLiveExtract(caseItem.url)} className="btn-pill" style={{
                width: '100%',
                transition: 'background 200ms ease, color 200ms ease',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent-text)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}>
                实时提取 →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
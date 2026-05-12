"use client";

interface NavbarProps {
  onToggleSettings: () => void;
  onToggleHistory: () => void;
}

export function Navbar({ onToggleSettings, onToggleHistory }: NavbarProps) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50, height: 72,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 60px',
      background: 'rgba(242,242,242,0.85)', backdropFilter: 'blur(16px) saturate(180%)',
      borderBottom: '1px solid var(--color-border)',
      maxWidth: 'var(--page-width)', margin: '0 auto', width: '100%',
    }}>
      <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-accent-text)', lineHeight: 1 }}>D</span>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
          DesignPick
        </span>
      </a>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <a href="#cases" style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
          color: 'var(--color-text-secondary)', textDecoration: 'none',
          padding: '4px 0', transition: 'color var(--transition-fast)',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
          案例库
        </a>
        <button onClick={onToggleHistory} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-text-secondary)', padding: '4px 8px',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500,
          textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'color var(--transition-fast)',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          历史
        </button>
        <button onClick={onToggleSettings} className="btn-pill" style={{ height: 40, fontSize: 'var(--text-label)' }}>
          API 设置
        </button>
      </div>
    </header>
  );
}
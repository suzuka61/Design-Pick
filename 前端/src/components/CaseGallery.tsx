"use client";

import { useState, useEffect } from 'react';
import { CaseCard } from '@/components/CaseCard';
import type { CaseItem } from '@/lib/cases-data';

interface CaseGalleryProps {
  onCaseClick: (c: CaseItem) => void;
}

export function CaseGallery({ onCaseClick }: CaseGalleryProps) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/cases.json')
      .then(r => r.json())
      .then((data: CaseItem[]) => { setCases(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section id="cases" style={{ position: 'relative', zIndex: 10 }}>
      {/* Decorative divider */}
      <div style={{ maxWidth: 'var(--content-width)', margin: '0 auto', padding: '0 60px' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, var(--color-border-strong) 50%, transparent 100%)' }} />
      </div>

      {/* Section header */}
      <div style={{ maxWidth: 'var(--content-width)', margin: '0 auto', padding: '100px 60px 40px', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-section-title)', fontWeight: 700,
          color: 'var(--color-text-primary)', letterSpacing: 'var(--tracking-display)', lineHeight: 'var(--leading-tight)',
        }}>
          设计系统案例库
        </div>
        <div style={{
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', fontWeight: 500,
          color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-normal)', marginTop: 20,
          maxWidth: 480, marginLeft: 'auto', marginRight: 'auto',
        }}>
          浏览真实产品设计系统，下载 DESIGN.md 规范文件
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 'var(--content-width)', margin: '0 auto', padding: '24px 60px 120px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>
            加载中...
          </div>
        ) : (
          <div className="case-grid">
            {cases.map(c => <CaseCard key={c.id} caseItem={c} onClick={onCaseClick} />)}
          </div>
        )}
      </div>
    </section>
  );
}
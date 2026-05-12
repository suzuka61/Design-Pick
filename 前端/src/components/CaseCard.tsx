"use client";

import { useState } from 'react';
import type { CaseItem } from '@/lib/cases-data';

interface CaseCardProps {
  caseItem: CaseItem;
  onClick: (c: CaseItem) => void;
}

export function CaseCard({ caseItem, onClick }: CaseCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClick(caseItem)}
      style={{
        cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
        position: 'relative',
        transition: 'box-shadow var(--transition-smooth)',
        boxShadow: hovered
          ? '0 16px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Image area — full bleed */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', overflow: 'hidden', background: '#e0e0e0' }}>
        {!imgError ? (
          <img
            src={caseItem.screenshot}
            alt={caseItem.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            style={{
              width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.06)' : 'scale(1)',
              transition: 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f2f2f2, #e0e0e0)',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-h3)', fontWeight: 700, color: 'var(--color-text-muted)',
          }}>
            {caseItem.name}
          </div>
        )}

        {/* Hover overlay — dark gradient from bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: hovered
            ? 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)'
            : 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 40%)',
          transition: 'background 400ms ease',
        }} />

        {/* Category — top left */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          padding: '4px 10px', borderRadius: 4,
          background: 'rgba(242,242,242,0.85)', backdropFilter: 'blur(6px)',
          fontFamily: 'var(--font-body)', fontSize: 'var(--text-micro)', fontWeight: 600,
          color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)',
          opacity: hovered ? 0 : 1,
          transition: 'opacity 300ms ease',
        }}>
          {caseItem.category}
        </div>

        {/* Arrow — top right */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          width: 32, height: 32, borderRadius: 6,
          background: hovered ? 'rgba(255,255,255,0.2)' : 'transparent',
          backdropFilter: hovered ? 'blur(6px)' : 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 300ms ease, background 300ms ease',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </div>

        {/* Bottom info — always visible, enhanced on hover */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: hovered ? '20px' : '16px',
          display: 'flex', alignItems: 'flex-end', gap: 12,
          transition: 'padding 300ms ease',
        }}>
          <img
            src={caseItem.favicon}
            alt=""
            width={hovered ? 36 : 28}
            height={hovered ? 36 : 28}
            style={{ borderRadius: 6, flexShrink: 0, transition: 'width 300ms ease, height 300ms ease' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 600,
              fontSize: hovered ? 'var(--text-body-lg)' : 'var(--text-body-sm)',
              color: 'white', letterSpacing: '-0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'font-size 300ms ease',
            }}>
              {caseItem.name}
            </div>
            {/* Description only on hover */}
            <div style={{
              fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 500,
              color: 'rgba(255,255,255,0.7)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxHeight: hovered ? 24 : 0,
              opacity: hovered ? 1 : 0,
              marginTop: hovered ? 4 : 0,
              transition: 'max-height 300ms ease, opacity 300ms ease, margin-top 300ms ease',
            }}>
              {caseItem.description}
            </div>
          </div>
          {/* Primary color swatch */}
          <div style={{
            width: hovered ? 14 : 10, height: hovered ? 14 : 10, borderRadius: '50%', flexShrink: 0,
            background: caseItem.summary.primaryColor,
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'width 300ms ease, height 300ms ease',
          }} />
        </div>
      </div>
    </div>
  );
}
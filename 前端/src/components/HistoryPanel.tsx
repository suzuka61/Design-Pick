"use client";

import { useState, useEffect } from 'react';

export interface HistoryItem {
  id: string;
  url: string;
  generatedAt: string;
  designMd: string;
  previewHtml: string;
}

const STORAGE_KEY = 'dp_history';
const MAX_ITEMS = 5;

export function loadHistory(): HistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {}
}

export function addHistory(item: HistoryItem) {
  const list = loadHistory();
  list.unshift(item);
  saveHistory(list);
}

export function removeHistory(id: string) {
  const list = loadHistory().filter(h => h.id !== id);
  saveHistory(list);
  return list;
}

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  items: HistoryItem[];
}

export function HistoryPanel({ open, onClose, onSelect, onRemove, items }: HistoryPanelProps) {
  if (!open) return null;

  const triggerDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 50 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400, maxWidth: '100vw',
        background: 'var(--color-sheet-bg)', borderLeft: '1px solid var(--color-sheet-border)',
        zIndex: 60, overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-body-lg)', fontWeight: 700, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            生成历史
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, padding: '16px 28px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, fontFamily: 'var(--font-body)', fontSize: 'var(--text-body-sm)', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              暂无历史记录
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <div key={item.id} style={{
                  padding: 16, borderRadius: 6, border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-raised)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontSize: 'var(--text-label)', fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                    }}>
                      {item.url.replace(/^https?:\/\//, '')}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-micro)', fontWeight: 500, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                      {new Date(item.generatedAt).toLocaleDateString()} {new Date(item.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => onSelect(item)} className="btn-pill" style={{ height: 36, fontSize: 'var(--text-micro)', padding: '0 16px', flex: 1 }}>
                      查看
                    </button>
                    <button onClick={() => triggerDownload(item.designMd, `DESIGN-${item.id}.md`, 'text/markdown')} style={{
                      height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--color-border)',
                      background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-micro)', fontWeight: 500, color: 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      .md
                    </button>
                    <button onClick={() => triggerDownload(item.previewHtml, `preview-${item.id}.html`, 'text/html')} style={{
                      height: 36, padding: '0 12px', borderRadius: 6, border: '1px solid var(--color-border)',
                      background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-body)',
                      fontSize: 'var(--text-micro)', fontWeight: 500, color: 'var(--color-text-secondary)',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                      .html
                    </button>
                    <button onClick={() => onRemove(item.id)} style={{
                      height: 36, padding: '0 10px', borderRadius: 6, border: 'none',
                      background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)',
                      display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '16px 28px', borderTop: '1px solid var(--color-border)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-caption)', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            最多保留 {MAX_ITEMS} 条记录
          </div>
        )}
      </div>
    </>
  );
}
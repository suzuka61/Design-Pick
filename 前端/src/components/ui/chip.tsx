"use client";

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 24px',
        fontSize: 'var(--text-label)',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-caps)',
        borderRadius: 9999,
        border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-chip-border)',
        background: active ? 'var(--color-accent)' : 'transparent',
        color: active ? 'var(--color-accent-text)' : 'var(--color-text-primary)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
      }}
    >
      {label}
    </button>
  );
}
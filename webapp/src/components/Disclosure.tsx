import React, { useMemo, useState } from 'react';

type Props = {
  title: string;
  defaultOpen?: boolean;
  tone?: 'green' | 'lime' | 'red' | 'neutral';
  children: React.ReactNode;
};

function toneStyles(tone: Props['tone']) {
  switch (tone) {
    case 'green':
      return { border: '1px solid rgba(0,128,0,0.35)', background: 'rgba(0,128,0,0.06)' };
    case 'lime':
      return { border: '1px solid rgba(120,180,0,0.35)', background: 'rgba(120,180,0,0.06)' };
    case 'red':
      return { border: '1px solid rgba(200,0,0,0.35)', background: 'rgba(200,0,0,0.06)' };
    default:
      return { border: '1px solid rgba(0,0,0,0.12)', background: 'rgba(0,0,0,0.03)' };
  }
}

export default function Disclosure({ title, defaultOpen = false, tone = 'neutral', children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = useMemo(() => toneStyles(tone), [tone]);

  return (
    <div className="card" style={{ ...styles, padding: 12 }}>
      <button
        className="btn-ghost"
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div className="muted" style={{ fontSize: 18, lineHeight: 1 }}>{open ? '▾' : '▸'}</div>
      </button>

      {open && (
        <div style={{ marginTop: 10 }}>
          {children}
        </div>
      )}
    </div>
  );
}

import React, { useId, useState } from 'react';

type Tone = 'neutral' | 'green' | 'lime' | 'red';

type Props = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: Tone;
  right?: React.ReactNode;
};

export default function Disclosure({
  title,
  children,
  defaultOpen = false,
  tone = 'neutral',
  right,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className={`disclosure tone-${tone} ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="disclosureHeader"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <div className="disclosureHeaderMain">
          <div className="disclosureTitle">{title}</div>
          {!!right && <div className="disclosureRight">{right}</div>}
        </div>

        <div className="disclosureChevron" aria-hidden="true">
          ›
        </div>
      </button>

      {open && (
        <div id={contentId} className="disclosureBody">
          {children}
        </div>
      )}
    </section>
  );
}

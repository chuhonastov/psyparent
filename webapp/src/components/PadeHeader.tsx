import React from 'react';
import { useNavigate } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  /** Show back button that goes to previous page */
  back?: boolean;
  /** Optional element on the right (button, badge, etc.) */
  right?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, back, right }: Props) {
  const navigate = useNavigate();

  return (
    <header className="page-header">
      <div className="page-header__left">
        {back && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => navigate(-1)}
            aria-label="Назад"
            title="Назад"
          >
            ←
          </button>
        )}

        <div className="page-header__titles">
          <h1 className="page-title">{title}</h1>
          {subtitle && <div className="page-subtitle muted">{subtitle}</div>}
        </div>
      </div>

      {!!right && <div className="page-header__right">{right}</div>}
    </header>
  );
}

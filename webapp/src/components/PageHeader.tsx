import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;

  /** New way: explicit link */
  backTo?: string;
  backLabel?: string;

  /** Legacy compatibility: pages may still pass `back` */
  back?: boolean;
};

export default function PageHeader({
  title,
  subtitle,
  right,
  backTo,
  backLabel = 'Назад',
  back = false,
}: Props) {
  const navigate = useNavigate();

  const hasBack = !!backTo || back;
  const hasTopRow = hasBack || !!right;
  const center = !hasTopRow;

  return (
    <header className={`pageHeader ${center ? 'center' : ''}`}>
      <div className="pageHeaderInner">
        {hasTopRow && (
          <div className="pageHeaderTop">
            <div className="pageHeaderLeft">
              {backTo ? (
                <Link className="backLink" to={backTo}>
                  ← {backLabel}
                </Link>
              ) : back ? (
                <button
                  type="button"
                  className="backLink backLinkBtn"
                  onClick={() => navigate(-1)}
                >
                  ← {backLabel}
                </button>
              ) : (
                <span />
              )}
            </div>

            <div className="pageHeaderRight">{right}</div>
          </div>
        )}

        <div className="pageHeaderMain">
          <div className="pageHeaderTitle">{title}</div>
          {!!subtitle && <div className="pageHeaderSubtitle">{subtitle}</div>}
        </div>
      </div>
    </header>
  );
}

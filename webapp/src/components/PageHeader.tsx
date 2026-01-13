import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  backTo?: string;
  backLabel?: string;
};

export default function PageHeader({
  title,
  subtitle,
  right,
  backTo,
  backLabel = 'Назад',
}: Props) {
  const hasTopRow = !!backTo || !!right;
  const center = !hasTopRow; // главная и простые страницы будут выглядеть “геройски”

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

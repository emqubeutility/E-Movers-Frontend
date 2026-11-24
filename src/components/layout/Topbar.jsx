import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { APP_NAME } from '../../lib/constants.js';
import { useLayout } from './LayoutContext.js';

/** Page header: optional back button, breadcrumb, title and right-side actions. */
export default function Topbar({ title, breadcrumb = [], back, actions }) {
  const { openMobileMenu } = useLayout();

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`;
  }, [title]);

  return (
    <header className="topbar">
      <button
        type="button"
        className="btn btn-secondary btn-icon topbar-menu"
        aria-label="Open menu"
        title="Open menu"
        aria-controls="app-sidebar"
        onClick={openMobileMenu}
      >
        <Menu />
      </button>
      {back && (
        <Link to={back} className="btn btn-secondary btn-icon" aria-label="Back" title="Back">
          <ArrowLeft />
        </Link>
      )}
      <div className="grow">
        {breadcrumb.length > 0 && <div className="breadcrumb">{breadcrumb.join(' / ')}</div>}
        <h1 className="page-title">{title}</h1>
      </div>
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  );
}

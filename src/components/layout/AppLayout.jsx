import { useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLocalState } from '../../hooks/useLocalState.js';
import { LayoutContext } from './LayoutContext.js';
import Sidebar from './Sidebar.jsx';

/** Shell shared by every signed-in page: sidebar on the left, the page on the right. */
export default function AppLayout() {
  const [collapsed, setCollapsed] = useLocalState('sidebar', false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const layout = useMemo(() => ({ openMobileMenu: () => setMobileOpen(true) }), []);
  const classes = ['app', collapsed && 'is-collapsed', mobileOpen && 'is-mobile-open']
    .filter(Boolean)
    .join(' ');

  return (
    <LayoutContext.Provider value={layout}>
      <div className={classes}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
          onNavigate={() => setMobileOpen(false)}
        />
        <div className="sidebar-scrim" aria-hidden="true" onClick={() => setMobileOpen(false)} />
        <div className="main">
          <Outlet />
        </div>
      </div>
    </LayoutContext.Provider>
  );
}

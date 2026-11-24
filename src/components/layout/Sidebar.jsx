import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronRight,
  ChevronsUpDown,
  KeyRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { usePermissions } from '../../features/auth/permissions.js';
import { useOrganizationOptions } from '../../features/organization/hooks.js';
import brandLogo from '../../assets/emove-login.png';
import { APP_NAME } from '../../lib/constants.js';
import { fullName } from '../../lib/format.js';
import { Avatar } from '../ui/Display.jsx';
import { ActionMenu } from '../ui/Dropdown.jsx';
import { useToast } from '../ui/Toast.jsx';
import { activeModuleId, buildNavigation, isPathActive } from './navigation.js';

function ModuleLink({ module, onNavigate }) {
  return (
    <NavLink
      to={module.to}
      onClick={onNavigate}
      title={module.label}
      className={({ isActive }) => `nav-module${isActive ? ' is-active' : ''}`}
    >
      <span className="nav-ico">
        <module.icon />
      </span>
      <span className="nav-label">{module.label}</span>
    </NavLink>
  );
}

function ModuleAccordion({ module, open, active, onToggle, onNavigate }) {
  const panelId = `nav-${module.id}`;
  return (
    <div>
      <button
        type="button"
        className={`nav-module${active ? ' is-active' : ''}`}
        title={module.label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="nav-ico">
          <module.icon />
        </span>
        <span className="nav-label">{module.label}</span>
        <span className="nav-chevron" aria-hidden="true">
          <ChevronRight />
        </span>
      </button>
      {open && (
        <div id={panelId} className="nav-items">
          {module.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const name = fullName(user);
  const go = (path) => () => {
    onNavigate();
    navigate(path);
  };

  const items = [
    {
      head: (
        <>
          <div className="su-name">{name}</div>
          <div className="su-role">{user?.employeeCode}</div>
        </>
      ),
    },
    { divider: true },
    { label: 'My profile', icon: UserRound, onClick: go('/account/profile') },
    { label: 'Change password', icon: KeyRound, onClick: go('/account/password') },
    { divider: true },
    { label: 'Log out', icon: LogOut, danger: true, onClick: logout },
  ];

  return (
    <ActionMenu
      items={items}
      trigger={(props) => (
        <button
          type="button"
          className="sidebar-user"
          aria-label={`Account menu for ${name}`}
          {...props}
        >
          <Avatar name={name} />
          <span className="su-text grow">
            <span className="su-name cell-trunc" style={{ display: 'block' }}>
              {name}
            </span>
            <span className="su-role">{user?.roleName}</span>
          </span>
          <span className="su-caret muted" aria-hidden="true">
            <ChevronsUpDown />
          </span>
        </button>
      )}
    />
  );
}

// "All organizations" is a super-admin-only choice.
const ALL_ORGANIZATIONS = { id: null, name: 'All organizations' };

function OrganizationSwitcher({ onNavigate }) {
  const { user, switchOrganization } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const toast = useToast();
  const allOrganizations = useOrganizationOptions(isSuperAdmin);
  // A super admin can work in any organization (or all of them); others in their own ones.
  const organizations = isSuperAdmin
    ? [
        ALL_ORGANIZATIONS,
        ...(allOrganizations.data ?? []).map((item) => ({
          id: Number(item.value),
          name: item.label,
        })),
      ]
    : (user?.organizations ?? []);
  if (organizations.length < 2) return null;
  const active = isSuperAdmin
    ? (organizations.find((item) => item.id === (user?.organizationId ?? null)) ??
      ALL_ORGANIZATIONS)
    : organizations[0];

  const items = [
    { head: <div className="su-role">Switch organization</div> },
    { divider: true },
    ...organizations.map((item) => ({
      label: item.name,
      icon: item.id === active.id ? Check : Building2,
      onClick: async () => {
        if (item.id === active.id) return;
        try {
          await switchOrganization(item.id, item.name);
          onNavigate();
        } catch (error) {
          toast.error(error.message);
        }
      },
    })),
  ];

  return (
    <div className="org-switch">
      <ActionMenu
        items={items}
        trigger={(props) => (
          <button
            type="button"
            className="org-switch-btn"
            aria-label={`Organization: ${active.name}`}
            {...props}
          >
            <Building2 />
            <span className="org-switch-text">
              <small>Organization</small>
              <strong className="cell-trunc">{active.name}</strong>
            </span>
            <ChevronsUpDown />
          </button>
        )}
      />
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle, onNavigate }) {
  const { menus } = usePermissions();
  const navigation = useMemo(() => buildNavigation(menus), [menus]);
  const { pathname } = useLocation();
  const currentModule = activeModuleId(pathname, navigation);
  // One module is open at a time: the current page's module, or the one just clicked.
  const [openModule, setOpenModule] = useState(currentModule);
  useEffect(() => setOpenModule(currentModule), [currentModule]);

  function toggleModule(id) {
    if (collapsed) onToggle();
    setOpenModule((current) => (current === id && !collapsed ? null : id));
  }

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <span className="brand-logo">
            <img className="brand-full" src={brandLogo} alt={APP_NAME} />
            <img className="brand-icon" src={brandLogo} alt={APP_NAME} />
          </span>
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            onClick={onToggle}
          >
            <ToggleIcon />
          </button>
        </div>
        <OrganizationSwitcher onNavigate={onNavigate} />
        <nav className="sidebar-nav" aria-label="Main">
          {navigation.map((module) =>
            module.to ? (
              <ModuleLink key={module.id} module={module} onNavigate={onNavigate} />
            ) : (
              <ModuleAccordion
                key={module.id}
                module={module}
                open={!collapsed && openModule === module.id}
                active={module.items.some((item) => isPathActive(item.to, pathname))}
                onToggle={() => toggleModule(module.id)}
                onNavigate={onNavigate}
              />
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <UserMenu onNavigate={onNavigate} />
        </div>
      </div>
    </aside>
  );
}

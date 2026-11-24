import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Clock,
  KeyRound,
  Landmark,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
} from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { Avatar, EmptyState, StatusBadge } from '../components/ui/Display.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { useCompanies } from '../features/company/hooks.js';
import { useCustomers } from '../features/customer/hooks.js';
import { useUserSummary } from '../features/user/hooks.js';
import { formatDate, formatDateTime, fullName } from '../lib/format.js';
import { ACTION, MENU } from '../lib/permissions.js';

const ONE_ROW = { page: 1, limit: 1 };
const STATUS_COLORS = ['#ffb3a0', '#e8847a', '#d6d6da'];

function StatCard({ icon: Icon, label, value, note, to }) {
  const body = (
    <>
      <span className="ov-stat-ico">
        <Icon />
      </span>
      <div>
        <div className="ov-stat-value">{value ?? '—'}</div>
        <div className="ov-stat-label">{label}</div>
        {note && <div className="ov-stat-note">{note}</div>}
      </div>
    </>
  );
  return to ? (
    <Link to={to} className="ov-card ov-stat">
      {body}
    </Link>
  ) : (
    <div className="ov-card ov-stat">{body}</div>
  );
}

/** Each count lives in its own component so its request only runs when the role may see it. */
function CustomerStat() {
  const query = useCustomers(ONE_ROW);
  return (
    <StatCard
      icon={UserRound}
      label="Customers"
      value={query.data?.meta?.total}
      note="Across all organizations"
      to="/customers"
    />
  );
}

function CompanyStat() {
  const query = useCompanies(ONE_ROW);
  return (
    <StatCard
      icon={Building2}
      label="Companies"
      value={query.data?.meta?.total}
      note="Agents, suppliers, contractors"
      to="/companies"
    />
  );
}

function RoleBars({ byRole }) {
  const rows = [...byRole].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section className="ov-card">
      <div className="ov-head">
        <h3>Users by role</h3>
        <span className="ov-sub">{rows.length} roles in use</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="No users yet" />
      ) : (
        <div className="ov-bars" role="img" aria-label="Number of users for each role">
          {rows.map((row) => (
            <div key={row.code} className="ov-bar-col" title={`${row.name}: ${row.count}`}>
              <span className="ov-bar-num">{row.count}</span>
              <span
                className="ov-bar"
                style={{ height: `${Math.max(6, (row.count / max) * 100)}%` }}
              />
              <span className="ov-bar-label">{row.name}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function StatusDonut({ byStatus, total }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <section className="ov-card">
      <div className="ov-head">
        <h3>Users by status</h3>
        <span className="ov-sub">{total} in total</span>
      </div>
      <div className="ov-donut-wrap">
        <svg viewBox="0 0 140 140" className="ov-donut" role="img" aria-label="Users by status">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="var(--brand-50)"
            strokeWidth="18"
          />
          {total > 0 &&
            byStatus.map((item, index) => {
              const length = (item.count / total) * circumference;
              const circle = (
                <circle
                  key={item.code}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={STATUS_COLORS[index % STATUS_COLORS.length]}
                  strokeWidth="18"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  transform="rotate(-90 70 70)"
                />
              );
              offset += length;
              return circle;
            })}
          <text x="70" y="76" textAnchor="middle" className="ov-donut-total">
            {total}
          </text>
        </svg>
        <ul className="ov-legend">
          {byStatus.map((item, index) => (
            <li key={item.code}>
              <i style={{ background: STATUS_COLORS[index % STATUS_COLORS.length] }} />
              <span>{item.label}</span>
              <b>{item.count}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RecentUsers({ users }) {
  return (
    <section className="ov-card">
      <div className="ov-head">
        <h3>Recently added</h3>
        <Link to="/users" className="ov-link">
          All users
        </Link>
      </div>
      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" />
      ) : (
        <ul className="ov-people">
          {users.map((user) => (
            <li key={user.id}>
              <Avatar name={fullName(user)} />
              <div className="ov-person">
                <strong className="cell-trunc">{fullName(user)}</strong>
                <span className="cell-trunc">{user.roleName}</span>
              </div>
              <span className="ov-date">{formatDate(user.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function QuickActions({ can }) {
  const items = [
    { label: 'Add a user', to: '/users/new', icon: UserPlus, show: can(MENU.USERS, ACTION.CREATE) },
    {
      label: 'Add a customer',
      to: '/customers/new',
      icon: UserRound,
      show: can(MENU.CUSTOMER, ACTION.CREATE),
    },
    {
      label: 'Add a company',
      to: '/companies/new',
      icon: Building2,
      show: can(MENU.COMPANY, ACTION.CREATE),
    },
    { label: 'Manage roles', to: '/roles', icon: ShieldCheck, show: can(MENU.ROLES) },
    { label: 'Menu access', to: '/menu-access', icon: KeyRound, show: can(MENU.MENU_ACCESS) },
    { label: 'Organizations', to: '/organizations', icon: Landmark, show: can(MENU.ORGANIZATIONS) },
  ].filter((item) => item.show);
  return (
    <section className="ov-card">
      <div className="ov-head">
        <h3>Quick actions</h3>
      </div>
      {items.length === 0 ? (
        <p className="ov-sub">No actions are available for your role.</p>
      ) : (
        <ul className="ov-actions">
          {items.map((item) => (
            <li key={item.to}>
              <Link to={item.to}>
                <item.icon />
                <span>{item.label}</span>
                <ArrowRight />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function MyProfile({ user, menus }) {
  const name = fullName(user);
  const screens = menus.filter((menu) => menu.pageUrl);
  return (
    <aside className="ov-card ov-profile">
      <div className="ov-head">
        <h3>My profile</h3>
        <Link to="/account/profile" className="ov-link">
          Edit
        </Link>
      </div>
      <div className="ov-me">
        <Avatar name={name} size="lg" />
        <strong>{name}</strong>
        <span className="ov-sub">{user.email}</span>
        <StatusBadge status={user.status} />
      </div>
      <dl className="kv">
        <dt>Role</dt>
        <dd>{user.roleName}</dd>
        <dt>Last sign-in</dt>
        <dd>{formatDateTime(user.lastLoginAt)}</dd>
      </dl>
      <h4 className="ov-mini">Screens you can open</h4>
      <div className="ov-chips">
        {screens.map((menu) => (
          <Link key={menu.code} to={menu.pageUrl} className="ov-chip">
            {menu.name}
          </Link>
        ))}
        {screens.length === 0 && <span className="ov-sub">None yet</span>}
      </div>
    </aside>
  );
}

export default function OverviewPage() {
  const { user } = useAuth();
  const { can, menus } = usePermissions();
  const canSeeUsers = can(MENU.USERS);
  return (
    <>
      <Topbar title="Overview" />
      <div className="ov-layout">
        <div className="ov-main">
          <UsersBlock enabled={canSeeUsers} can={can} />
        </div>
        <MyProfile user={user} menus={menus} />
      </div>
    </>
  );
}

/** Everything that needs the user summary; the rest of the page does not depend on it. */
function UsersBlock({ enabled, can }) {
  return enabled ? <WithSummary can={can} /> : <NoSummary can={can} />;
}

function Stats({ summary, can }) {
  const active = summary?.byStatus.find((status) => status.code === 'ACTIVE')?.count;
  return (
    <div className="ov-stats">
      {summary && (
        <StatCard
          icon={Users}
          label="Users"
          value={summary.total}
          note={`${active ?? 0} active`}
          to="/users"
        />
      )}
      {can(MENU.CUSTOMER) && <CustomerStat />}
      {can(MENU.COMPANY) && <CompanyStat />}
      {!summary && !can(MENU.CUSTOMER) && !can(MENU.COMPANY) && (
        <StatCard icon={UserCheck} label="Welcome" value="Hi" note="Pick a screen from the menu" />
      )}
    </div>
  );
}

function NoSummary({ can }) {
  return (
    <>
      <Stats summary={null} can={can} />
      <div className="ov-grid">
        <QuickActions can={can} />
      </div>
    </>
  );
}

function WithSummary({ can }) {
  const summary = useUserSummary();
  if (summary.isPending) return <Loader label="Loading overview" />;
  if (summary.isError)
    return <QueryError error={summary.error} onRetry={() => summary.refetch()} />;
  const data = summary.data;
  return (
    <>
      <Stats summary={data} can={can} />
      <div className="ov-grid">
        <RoleBars byRole={data.byRole} />
        <QuickActions can={can} />
        <StatusDonut byStatus={data.byStatus} total={data.total} />
        <RecentUsers users={data.recent} />
      </div>
      <p className="ov-foot">
        <Clock /> Figures update when you refresh the page.
      </p>
    </>
  );
}

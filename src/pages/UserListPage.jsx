import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  Clock,
  Download,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import Button from '../components/ui/Button.jsx';
import { ConfirmDeleteModal } from '../components/ui/Confirm.jsx';
import { Avatar, Badge, EmptyState, StatusBadge, UserCell } from '../components/ui/Display.jsx';
import Dropdown, { ActionMenu } from '../components/ui/Dropdown.jsx';
import { ActiveFilters, SortHeader, ViewSwitch } from '../components/ui/ListKit.jsx';
import { TableLoading } from '../components/ui/Loader.jsx';
import { TableFoot } from '../components/ui/Pager.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { userApi } from '../features/user/api.js';
import { useDeleteUser, useRoleOptions, useUsers } from '../features/user/hooks.js';
import { useSkills } from '../features/user/lookups.js';
import { useListState } from '../hooks/useListState.js';
import { useLocalState } from '../hooks/useLocalState.js';
import { usePageClamp } from '../hooks/usePageClamp.js';
import { STATUS_OPTIONS, statusOf } from '../lib/constants.js';
import { ACTION, MENU } from '../lib/permissions.js';
import { downloadCsv } from '../lib/csv.js';
import { EMPTY, formatDate, formatDateTime, fullName } from '../lib/format.js';

const EMPTY_FILTERS = { role: '', skill: '', status: '' };
const INITIAL_SORT = { sortBy: 'createdAt', sortOrder: 'desc' };
const CARD_TONES = ['rc-deep', '', 'rc-lime', 'rc-mint', 'rc-sage'];
const EXPORT_LIMIT = 100;

const CSV_COLUMNS = [
  { label: 'First name', value: (user) => user.firstName },
  { label: 'Last name', value: (user) => user.lastName },
  { label: 'Email', value: (user) => user.email },
  { label: 'Phone', value: (user) => user.phone },
  { label: 'Designation', value: (user) => user.designation },
  { label: 'Role', value: (user) => user.roleName },
  { label: 'Status', value: (user) => statusOf(user.status).label },
  {
    label: 'Last sign-in',
    value: (user) => (user.lastLoginAt ? formatDateTime(user.lastLoginAt) : ''),
  },
  { label: 'Created', value: (user) => formatDate(user.createdAt) },
];

function UsersTable({ rows, loading, dimmed, sort, onSort, canEdit, rowMenu }) {
  return (
    <div className="table-wrap">
      <table className={`data-table${dimmed ? ' is-dimmed' : ''}`}>
        <caption className="sr-only">Users</caption>
        <thead>
          <tr>
            <th className="col-menu">
              <span className="sr-only">Actions</span>
            </th>
            <SortHeader column="firstName" label="Name" sort={sort} onSort={onSort} />
            <th scope="col">Code</th>
            <th scope="col">Type</th>
            <SortHeader column="email" label="Email" sort={sort} onSort={onSort} />
            <th scope="col">Organizations</th>
            <th scope="col">Role</th>
            <th scope="col">Status</th>
            <SortHeader column="lastLoginAt" label="Last sign-in" sort={sort} onSort={onSort} />
            <SortHeader column="createdAt" label="Created" sort={sort} onSort={onSort} />
          </tr>
        </thead>
        <tbody>
          {loading && <TableLoading colSpan={9} />}
          {rows.map((user) => (
            <tr key={user.id}>
              <td className="col-menu">{rowMenu(user)}</td>
              <td>
                <UserCell name={fullName(user)} sub={user.designation}>
                  {canEdit ? (
                    <Link to={`/users/${user.id}/edit`}>{fullName(user)}</Link>
                  ) : (
                    fullName(user)
                  )}
                </UserCell>
              </td>
              <td className="nowrap">
                <strong>{user.employeeCode}</strong>
              </td>
              <td>{user.personType === 'EMPLOYEE' ? 'Employee' : 'Site user'}</td>
              <td>{user.email ?? '—'}</td>
              <td>{user.organizations?.map((item) => item.name).join(', ') || '—'}</td>
              <td>
                <Badge tone="brand" dot={false}>
                  {user.roleName}
                </Badge>
              </td>
              <td>
                <StatusBadge status={user.status} />
              </td>
              <td className="nowrap">{formatDateTime(user.lastLoginAt)}</td>
              <td className="nowrap">{formatDate(user.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserCards({ rows, canEdit }) {
  return (
    <div className="rec-grid">
      {rows.map((user, index) => (
        <article key={user.id} className={`rec-card ${CARD_TONES[index % CARD_TONES.length]}`}>
          <div className="rc-top">
            <UserRound />
            {user.roleName}
            {canEdit && (
              <Link
                to={`/users/${user.id}/edit`}
                className="rc-go"
                aria-label={`Edit ${fullName(user)}`}
                title="Edit"
              >
                <ArrowRight />
              </Link>
            )}
          </div>
          <div className="rc-title cell-trunc">{fullName(user)}</div>
          <div className="rc-meta">
            <span>
              <Mail />
              <span className="cell-trunc">{user.email}</span>
            </span>
            <span>
              <Briefcase />
              {user.designation || EMPTY}
            </span>
          </div>
          <div className="rc-foot">
            <span className="small">Added {formatDate(user.createdAt)}</span>
            <StatusBadge status={user.status} />
          </div>
        </article>
      ))}
    </div>
  );
}

function UserRows({ rows }) {
  return (
    <div className="list">
      {rows.map((user) => (
        <div key={user.id} className="list-item">
          <Avatar name={fullName(user)} />
          <div className="body">
            <div className="title cell-trunc">{fullName(user)}</div>
            <div className="meta">
              <span>
                <Mail />
                {user.email}
              </span>
              <span>
                <UserRound />
                {user.roleName}
              </span>
              <span>
                <Clock />
                Last sign-in {formatDateTime(user.lastLoginAt)}
              </span>
            </div>
          </div>
          <div className="trail">
            <StatusBadge status={user.status} />
            <ChevronRight />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function UserListPage() {
  const { user: currentUser } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const toast = useToast();
  const canCreate = can(MENU.USERS, ACTION.CREATE);
  const canEdit = can(MENU.USERS, ACTION.EDIT);
  const canDelete = can(MENU.USERS, ACTION.DELETE);

  const [view, setView] = useLocalState('view.users', 'table');
  const list = useListState({ filters: EMPTY_FILTERS, sort: INITIAL_SORT });
  const [toDelete, setToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  const users = useUsers(list.query);
  const roles = useRoleOptions();
  const skills = useSkills();
  const remove = useDeleteUser();

  const items = users.data?.items ?? [];
  const total = users.data?.meta.total ?? 0;
  usePageClamp(list.page, list.setPage, total, list.pageSize);

  const roleOptions = (roles.data ?? []).map((role) => ({ value: role.code, label: role.name }));

  const chips = [
    list.filters.role && {
      key: 'role',
      label: 'Role',
      value:
        roleOptions.find((option) => option.value === list.filters.role)?.label ??
        list.filters.role,
      onRemove: () => list.setFilter('role', ''),
    },
    list.filters.skill && {
      key: 'skill',
      label: 'Skill',
      value:
        (skills.data ?? []).find((option) => option.value === list.filters.skill)?.label ??
        list.filters.skill,
      onRemove: () => list.setFilter('skill', ''),
    },
    list.filters.status && {
      key: 'status',
      label: 'Status',
      value: statusOf(list.filters.status).label,
      onRemove: () => list.setFilter('status', ''),
    },
  ].filter(Boolean);

  async function exportCsv() {
    setExporting(true);
    try {
      const data = await userApi.list({ ...list.query, page: 1, limit: EXPORT_LIMIT });
      downloadCsv('users.csv', CSV_COLUMNS, data.items);
      if (data.meta.total > EXPORT_LIMIT)
        toast.warning(`Only the first ${EXPORT_LIMIT} of ${data.meta.total} users were exported`);
      else toast.success(`${data.items.length} users exported`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('User deleted');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToDelete(null);
    }
  }

  const rowMenu = (user) => (
    <ActionMenu
      label={`Actions for ${fullName(user)}`}
      items={[
        {
          label: 'Edit',
          icon: Pencil,
          onClick: () => navigate(`/users/${user.id}/edit`),
          hidden: !canEdit,
        },
        { divider: true, hidden: !canDelete || user.id === currentUser.id },
        {
          label: 'Delete',
          icon: Trash2,
          danger: true,
          onClick: () => setToDelete(user),
          hidden: !canDelete || user.id === currentUser.id,
        },
      ]}
    />
  );

  return (
    <>
      <Topbar
        title="User/Employee"
        breadcrumb={['Administration']}
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={exporting || total === 0}>
              <Download />
              {exporting ? 'Exporting…' : 'Export'}
            </Button>
            {canCreate && (
              <Link to="/users/new" className="btn btn-primary">
                <Plus />
                New user
              </Link>
            )}
          </>
        }
      />

      <div className="card card-flush">
        <div className="filter-bar">
          <div className="input-group search" role="search">
            <Search />
            <input
              className="input"
              type="search"
              placeholder="Search by name or email…"
              aria-label="Search users"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <Dropdown
            pill
            clearable
            search
            placeholder="Role"
            aria-label="Filter by role"
            options={roleOptions}
            value={list.filters.role}
            onChange={(value) => list.setFilter('role', value)}
          />
          <Dropdown
            pill
            clearable
            search
            placeholder="Skill"
            aria-label="Filter by skill"
            options={skills.data ?? []}
            value={list.filters.skill}
            onChange={(value) => list.setFilter('skill', value)}
          />
          <Dropdown
            pill
            clearable
            placeholder="Status"
            aria-label="Filter by status"
            options={STATUS_OPTIONS}
            value={list.filters.status}
            onChange={(value) => list.setFilter('status', value)}
          />
          <span className="spacer" />
          <ViewSwitch value={view} onChange={setView} />
        </div>
        <ActiveFilters chips={chips} onClearAll={list.clearFilters} />

        <QueryError inset error={users.error} onRetry={() => users.refetch()} />

        {view === 'table' && (
          <UsersTable
            rows={items}
            loading={users.isPending}
            dimmed={users.isPlaceholderData}
            sort={list.sort}
            onSort={list.setSort}
            canEdit={canEdit}
            rowMenu={rowMenu}
          />
        )}
        {view === 'cards' && items.length > 0 && <UserCards rows={items} canEdit={canEdit} />}
        {view === 'list' && items.length > 0 && <UserRows rows={items} />}

        {users.isSuccess && items.length === 0 && (
          <EmptyState
            icon={Users}
            title={list.hasFilters ? 'No users match your filters' : 'No users yet'}
            text={
              list.hasFilters
                ? 'Try a different search or clear the filters.'
                : 'Create the first user to get started.'
            }
            action={
              list.hasFilters && (
                <button type="button" className="btn btn-secondary" onClick={list.clearFilters}>
                  Clear filters
                </button>
              )
            }
          />
        )}

        {total > 0 && (
          <TableFoot
            page={list.page}
            pageSize={list.pageSize}
            total={total}
            onPage={list.setPage}
            onPageSize={list.setPageSize}
          />
        )}
      </div>

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title="Delete user?"
        message={
          toDelete &&
          `${fullName(toDelete)} will lose access immediately. The record is kept but can no longer sign in.`
        }
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

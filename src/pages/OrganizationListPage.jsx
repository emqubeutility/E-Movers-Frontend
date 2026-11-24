import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { ConfirmDeleteModal } from '../components/ui/Confirm.jsx';
import { Badge, StatusBadge } from '../components/ui/Display.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import MasterList from '../features/master/MasterList.jsx';
import { useDeleteOrganization, useOrganizations } from '../features/organization/hooks.js';
import { useListState } from '../hooks/useListState.js';
import { ACTION, MENU } from '../lib/permissions.js';

export default function OrganizationListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, isSuperAdmin } = usePermissions();
  const list = useListState({ filters: {}, sort: { sortBy: 'name', sortOrder: 'asc' } });
  const organizations = useOrganizations(list.query);
  const remove = useDeleteOrganization();
  const [toDelete, setToDelete] = useState(null);

  // Creating and deleting organizations is for the super administrator only.
  const canCreate = isSuperAdmin && can(MENU.ORGANIZATIONS, ACTION.CREATE);
  const canEdit = can(MENU.ORGANIZATIONS, ACTION.EDIT);
  const canDelete = isSuperAdmin && can(MENU.ORGANIZATIONS, ACTION.DELETE);

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Organization deleted');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <Topbar
        title="Organizations"
        breadcrumb={['Setup']}
        actions={
          canCreate && (
            <Link to="/organizations/new" className="btn btn-primary">
              <Plus />
              New organization
            </Link>
          )
        }
      />

      <div className="card card-flush">
        <div className="filter-bar">
          <div className="input-group search" role="search">
            <Search />
            <input
              className="input"
              type="search"
              placeholder="Search by code or name…"
              aria-label="Search organizations"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <span className="spacer" />
        </div>

        <QueryError error={organizations.error} onRetry={() => organizations.refetch()} />

        <MasterList
          caption="Organizations"
          rows={organizations.data?.items ?? []}
          loading={organizations.isPending}
          sort={list.sort}
          onSort={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          meta={organizations.data?.meta}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(row) => navigate(`/organizations/${row.id}/edit`)}
          onDelete={setToDelete}
          emptyTitle={
            list.hasFilters ? 'No organizations match your search' : 'No organizations yet'
          }
          emptyText={
            canCreate
              ? 'Create the first organization to get started.'
              : 'No organization is linked to your account.'
          }
          columns={[
            {
              key: 'organizationCode',
              label: 'Code',
              sortBy: 'organizationCode',
              className: 'nowrap',
            },
            {
              key: 'name',
              label: 'Name',
              sortBy: 'name',
              render: (row) => (
                <strong>
                  {row.name}{' '}
                  {row.isHeadOffice && (
                    <Badge tone="brand" dot={false}>
                      Head office
                    </Badge>
                  )}
                </strong>
              ),
            },
            { key: 'contactNo', label: 'Contact', render: (row) => row.contactNo ?? '—' },
            { key: 'leadEmail', label: 'Lead email', render: (row) => row.leadEmail ?? '—' },
            {
              key: 'isActive',
              label: 'Status',
              render: (row) => <StatusBadge status={row.isActive ? 'ACTIVE' : 'INACTIVE'} />,
            },
          ]}
        />
      </div>

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title="Delete organization?"
        message={toDelete && `${toDelete.name} will be removed.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

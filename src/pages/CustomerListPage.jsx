import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { ConfirmDeleteModal } from '../components/ui/Confirm.jsx';
import { Badge, StatusBadge } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import { ActiveFilters } from '../components/ui/ListKit.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { useCustomerOptions, useCustomers, useDeleteCustomer } from '../features/customer/hooks.js';
import MasterList from '../features/master/MasterList.jsx';
import { useListState } from '../hooks/useListState.js';
import { ACTION, MENU } from '../lib/permissions.js';

const EMPTY_FILTERS = { status: '', kind: '' };

export default function CustomerListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = usePermissions();
  const list = useListState({ filters: EMPTY_FILTERS });
  const options = useCustomerOptions();
  const customers = useCustomers(list.query);
  const remove = useDeleteCustomer();
  const [toDelete, setToDelete] = useState(null);

  const canCreate = can(MENU.CUSTOMER, ACTION.CREATE);
  const canEdit = can(MENU.CUSTOMER, ACTION.EDIT);
  const canDelete = can(MENU.CUSTOMER, ACTION.DELETE);
  const items = customers.data?.items ?? [];
  const meta = customers.data?.meta;

  const chips = [
    list.filters.status && {
      key: 'status',
      label: 'Status',
      value: list.filters.status,
      onRemove: () => list.setFilter('status', ''),
    },
    list.filters.kind && {
      key: 'kind',
      label: 'Type',
      value: list.filters.kind,
      onRemove: () => list.setFilter('kind', ''),
    },
  ].filter(Boolean);

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Customer deleted');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <Topbar
        title="Customers"
        breadcrumb={['Master']}
        actions={
          canCreate && (
            <Link to="/customers/new" className="btn btn-primary">
              <Plus />
              New customer
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
              aria-label="Search customers"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <Dropdown
            pill
            clearable
            placeholder="Type"
            aria-label="Filter by customer type"
            options={(options.data?.kinds ?? []).map((item) => ({
              value: item.code,
              label: item.label,
            }))}
            value={list.filters.kind}
            onChange={(value) => list.setFilter('kind', value)}
          />
          <Dropdown
            pill
            clearable
            placeholder="Status"
            aria-label="Filter by status"
            options={(options.data?.statuses ?? []).map((item) => ({
              value: item.code,
              label: item.label,
            }))}
            value={list.filters.status}
            onChange={(value) => list.setFilter('status', value)}
          />
          <span className="spacer" />
        </div>
        <ActiveFilters chips={chips} onClearAll={list.clearFilters} />

        <QueryError error={customers.error} onRetry={() => customers.refetch()} />

        <MasterList
          caption="Customers"
          rows={items}
          loading={customers.isPending}
          sort={list.sort}
          onSort={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          meta={meta}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(row) => navigate(`/customers/${row.id}/edit`)}
          onDelete={setToDelete}
          emptyTitle={list.hasFilters ? 'No customers match your filters' : 'No customers yet'}
          emptyText={
            list.hasFilters
              ? 'Try a different search or clear the filters.'
              : 'Create the first customer to get started.'
          }
          columns={[
            { key: 'code', label: 'Code', sortBy: 'code', className: 'nowrap' },
            {
              key: 'name',
              label: 'Name',
              sortBy: 'name',
              render: (row) => (
                <div>
                  <strong>{row.name}</strong>
                  {row.legalName && <div className="small muted">{row.legalName}</div>}
                </div>
              ),
            },
            {
              key: 'kind',
              label: 'Type',
              render: (row) => (
                <Badge tone="brand" dot={false}>
                  {row.kind === 'COMPANY' ? 'Company' : 'Individual'}
                </Badge>
              ),
            },
            { key: 'email', label: 'Email', render: (row) => row.email ?? '—' },
            { key: 'contactNo', label: 'Contact', render: (row) => row.contactNo ?? '—' },
            {
              key: 'status',
              label: 'Status',
              render: (row) => <StatusBadge status={row.status} />,
            },
          ]}
        />
      </div>

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title="Delete customer?"
        message={toDelete && `${toDelete.name} will be removed from the customer list.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

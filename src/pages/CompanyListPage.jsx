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
import { useCompanyOptions, useCompanies, useDeleteCompany } from '../features/company/hooks.js';
import MasterList from '../features/master/MasterList.jsx';
import { useListState } from '../hooks/useListState.js';
import { ACTION, MENU } from '../lib/permissions.js';

const EMPTY_FILTERS = { status: '', companyType: '' };

export default function CompanyListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = usePermissions();
  const list = useListState({ filters: EMPTY_FILTERS });
  const options = useCompanyOptions();
  const companies = useCompanies(list.query);
  const remove = useDeleteCompany();
  const [toDelete, setToDelete] = useState(null);

  const canCreate = can(MENU.COMPANY, ACTION.CREATE);
  const canEdit = can(MENU.COMPANY, ACTION.EDIT);
  const canDelete = can(MENU.COMPANY, ACTION.DELETE);
  const items = companies.data?.items ?? [];
  const meta = companies.data?.meta;

  const chips = [
    list.filters.companyType && {
      key: 'companyType',
      label: 'Type',
      value: list.filters.companyType,
      onRemove: () => list.setFilter('companyType', ''),
    },
    list.filters.status && {
      key: 'status',
      label: 'Status',
      value: list.filters.status,
      onRemove: () => list.setFilter('status', ''),
    },
  ].filter(Boolean);

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Company deleted');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToDelete(null);
    }
  }

  const toOptions = (items = []) => items.map((item) => ({ value: item.code, label: item.label }));

  return (
    <>
      <Topbar
        title="Companies"
        breadcrumb={['Master']}
        actions={
          canCreate && (
            <Link to="/companies/new" className="btn btn-primary">
              <Plus />
              New company
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
              aria-label="Search companies"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <Dropdown
            pill
            clearable
            placeholder="Type"
            aria-label="Filter by company type"
            options={toOptions(options.data?.companyTypes)}
            value={list.filters.companyType}
            onChange={(value) => list.setFilter('companyType', value)}
          />
          <Dropdown
            pill
            clearable
            placeholder="Status"
            aria-label="Filter by status"
            options={toOptions(options.data?.statuses)}
            value={list.filters.status}
            onChange={(value) => list.setFilter('status', value)}
          />
          <span className="spacer" />
        </div>
        <ActiveFilters chips={chips} onClearAll={list.clearFilters} />

        <QueryError error={companies.error} onRetry={() => companies.refetch()} />

        <MasterList
          caption="Companies"
          rows={items}
          loading={companies.isPending}
          sort={list.sort}
          onSort={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          meta={meta}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
          canEdit={canEdit}
          canDelete={canDelete}
          onEdit={(row) => navigate(`/companies/${row.id}/edit`)}
          onDelete={setToDelete}
          emptyTitle={list.hasFilters ? 'No companies match your filters' : 'No companies yet'}
          emptyText={
            list.hasFilters
              ? 'Try a different search or clear the filters.'
              : 'Create the first company to get started.'
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
                </div>
              ),
            },
            {
              key: 'companyType',
              label: 'Type',
              render: (row) => (
                <Badge tone="brand" dot={false}>
                  {row.companyTypeLabel}
                </Badge>
              ),
            },
            { key: 'contactName', label: 'Contact', render: (row) => row.contactName ?? '—' },
            { key: 'contactNo', label: 'Phone', render: (row) => row.contactNo ?? '—' },
            { key: 'email', label: 'Email', render: (row) => row.email ?? '—' },
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
        title="Delete company?"
        message={toDelete && `${toDelete.name} will be removed from the company list.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

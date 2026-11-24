import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import { ConfirmDeleteModal } from '../../components/ui/Confirm.jsx';
import { Badge } from '../../components/ui/Display.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import { ActiveFilters } from '../../components/ui/ListKit.jsx';
import { QueryError } from '../../components/ui/QueryState.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useListState } from '../../hooks/useListState.js';
import { ACTION, MENU } from '../../lib/permissions.js';
import { usePermissions } from '../auth/permissions.js';
import MasterList from '../master/MasterList.jsx';
import { paramApi, useParamList, useParamMutation, useTypeOptions } from './api.js';

const ACTIVE_FILTER = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const dash = (value) => value || '—';
const status = (row) => (
  <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>
);

/** One tab of the Parameters screen: dropdown types (fixed or dynamic) or their values. */
export default function ParamTab({ resource, kind, title, singular }) {
  const navigate = useNavigate();
  const isType = resource === 'parameter-types';
  const toast = useToast();
  const { can } = usePermissions();
  const list = useListState({
    sort: { sortBy: resource === 'parameter-types' ? 'name' : 'displayOrder', sortOrder: 'asc' },
  });
  const rows = useParamList(resource, {
    ...list.query,
    ...(list.filters.isActive && { isActive: list.filters.isActive === 'true' }),
    ...(list.filters.parameterTypeId && { parameterTypeId: Number(list.filters.parameterTypeId) }),
  });
  const types = useTypeOptions();
  const [toDelete, setToDelete] = useState(null);

  const remove = useParamMutation(paramApi(resource).remove);

  const canCreate = can(MENU.PARAMETERS, ACTION.CREATE);
  const canEdit = can(MENU.PARAMETERS, ACTION.EDIT);
  const canDelete = can(MENU.PARAMETERS, ACTION.DELETE);

  const typeName = useMemo(
    () => new Map((types.data ?? []).map((o) => [Number(o.value), o.label])),
    [types.data],
  );
  const isFixed = (row) => (isType ? row.isSystem : row.isFixed);

  const columns = [
    {
      key: 'code',
      label: 'Code',
      className: 'nowrap',
      render: (row) => <strong>{row.code}</strong>,
    },
    isType
      ? { key: 'name', label: 'Name', render: (row) => row.name }
      : { key: 'label', label: 'Label', render: (row) => row.label },
    ...(isType
      ? [
          {
            key: 'kind',
            label: 'Kind',
            render: (row) => (
              <Badge tone={row.isSystem ? 'brand' : 'info'}>
                {row.isSystem ? 'Fixed' : 'Dynamic'}
              </Badge>
            ),
          },
          {
            key: 'allowUserValues',
            label: 'Users add values',
            render: (row) => (row.allowUserValues ? 'Yes' : 'No'),
          },
        ]
      : [
          {
            key: 'type',
            label: 'Dropdown type',
            render: (row) => dash(typeName.get(row.parameterTypeId)),
          },
          {
            key: 'kind',
            label: 'Kind',
            render: (row) => (
              <Badge tone={row.isFixed ? 'brand' : 'info'}>
                {row.isFixed ? 'Fixed' : 'Dynamic'}
              </Badge>
            ),
          },
          { key: 'isDefault', label: 'Default', render: (row) => (row.isDefault ? 'Yes' : '—') },
        ]),
    ...(isType
      ? []
      : [
          { key: 'parameterValue', label: 'Value', sortBy: 'parameterValue', className: 'num' },
          { key: 'displayOrder', label: 'Order', sortBy: 'displayOrder', className: 'num' },
        ]),
    { key: 'isActive', label: 'Status', render: status },
  ];

  const chips = [
    list.filters.parameterTypeId && {
      key: 'parameterTypeId',
      label: 'Type',
      value: typeName.get(Number(list.filters.parameterTypeId)) ?? list.filters.parameterTypeId,
      onRemove: () => list.setFilter('parameterTypeId', ''),
    },
    list.filters.isActive && {
      key: 'isActive',
      label: 'Status',
      value: list.filters.isActive === 'true' ? 'Active' : 'Inactive',
      onRemove: () => list.setFilter('isActive', ''),
    },
  ].filter(Boolean);

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success(`${title.slice(0, -1)} deleted`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToDelete(null);
    }
  }

  return (
    <div className="card card-flush">
      <div className="filter-bar">
        <div className="input-group search" role="search">
          <Search />
          <input
            className="input"
            type="search"
            placeholder={`Search ${title.toLowerCase()}…`}
            aria-label={`Search ${title.toLowerCase()}`}
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </div>
        {!isType && (
          <Dropdown
            pill
            clearable
            search
            placeholder="Dropdown type"
            aria-label="Filter by dropdown type"
            options={types.data ?? []}
            value={list.filters.parameterTypeId ?? ''}
            onChange={(value) => list.setFilter('parameterTypeId', value)}
          />
        )}
        <Dropdown
          pill
          clearable
          placeholder="Status"
          aria-label="Filter by status"
          options={ACTIVE_FILTER}
          value={list.filters.isActive ?? ''}
          onChange={(value) => list.setFilter('isActive', value)}
        />
        <span className="spacer" />
        {canCreate && (
          <Button
            onClick={() =>
              navigate(
                `/parameters/${kind}/new${list.filters.parameterTypeId ? `?typeId=${list.filters.parameterTypeId}` : ''}`,
              )
            }
          >
            <Plus />
            New {singular}
          </Button>
        )}
      </div>
      <ActiveFilters chips={chips} onClearAll={list.clearFilters} />

      <QueryError error={rows.error} onRetry={() => rows.refetch()} />

      <MasterList
        caption={title}
        rows={rows.data?.items ?? []}
        loading={rows.isPending}
        sort={list.sort}
        onSort={list.setSort}
        page={list.page}
        pageSize={list.pageSize}
        meta={rows.data?.meta}
        onPage={list.setPage}
        onPageSize={list.setPageSize}
        canEdit={canEdit}
        canDelete={canDelete}
        canDeleteRow={(row) => !isFixed(row)}
        onEdit={(row) => navigate(`/parameters/${kind}/${row.id}/edit`)}
        onDelete={setToDelete}
        emptyTitle={
          list.hasFilters
            ? `No ${title.toLowerCase()} match your filters`
            : `No ${title.toLowerCase()} yet`
        }
        emptyText={
          list.hasFilters
            ? 'Try a different search or clear the filters.'
            : `Add the first ${singular}.`
        }
        columns={columns}
      />

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title={`Delete ${singular}?`}
        message={toDelete && `${toDelete.code} will be removed.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

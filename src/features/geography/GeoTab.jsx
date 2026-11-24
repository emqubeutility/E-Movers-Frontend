import { useMemo, useState } from 'react';
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
import { geoApi, useGeoList, useGeoMutation, useGeoOptions } from './api.js';
import GeoForm from './GeoForm.jsx';

const ACTIVE_FILTER = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const status = (row) => <Badge tone={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Active' : 'Inactive'}</Badge>;
const dash = (value) => value || '—';

/** One tab of the Geography screen: search, filters, table and the add / edit / delete popups. */
export default function GeoTab({ resource, title, singular }) {
  const toast = useToast();
  const { can } = usePermissions();
  const list = useListState({ sort: { sortBy: 'name', sortOrder: 'asc' } });
  const rows = useGeoList(resource, { ...list.query, ...(list.filters.isActive && { isActive: list.filters.isActive === 'true' }) });
  const countries = useGeoOptions('countries');
  const states = useGeoOptions('states', list.filters.countryId ? { countryId: list.filters.countryId } : {}, resource === 'cities');
  const [editing, setEditing] = useState(null); // { row } while the popup is open
  const [toDelete, setToDelete] = useState(null);

  const save = useGeoMutation(resource, ({ id, payload }) => (id ? geoApi(resource).update(id, payload) : geoApi(resource).create(payload)));
  const remove = useGeoMutation(resource, geoApi(resource).remove);

  const canCreate = can(MENU.GEOGRAPHY, ACTION.CREATE);
  const canEdit = can(MENU.GEOGRAPHY, ACTION.EDIT);
  const canDelete = can(MENU.GEOGRAPHY, ACTION.DELETE);

  const countryName = useMemo(() => new Map((countries.data ?? []).map((o) => [Number(o.value), o.label])), [countries.data]);
  const stateName = useMemo(() => new Map((states.data ?? []).map((o) => [Number(o.value), o.label])), [states.data]);

  const hasCountry = resource !== 'countries';
  const columns = [
    ...(resource === 'countries'
      ? [{ key: 'iso2', label: 'Code', sortBy: 'iso2', className: 'nowrap' }]
      : []),
    { key: 'name', label: 'Name', sortBy: 'name', render: (row) => <strong>{row.name}</strong> },
    ...(resource === 'states' ? [{ key: 'code', label: 'Code', render: (row) => dash(row.code) }] : []),
    ...(hasCountry ? [{ key: 'countryId', label: 'Country', render: (row) => dash(countryName.get(row.countryId)) }] : []),
    ...(resource === 'cities' ? [{ key: 'stateId', label: 'State', render: (row) => dash(stateName.get(row.stateId)) }] : []),
    { key: 'isActive', label: 'Status', render: status },
  ];

  const chips = [
    list.filters.countryId && {
      key: 'countryId',
      label: 'Country',
      value: countryName.get(Number(list.filters.countryId)) ?? list.filters.countryId,
      onRemove: () => list.setFilter('countryId', ''),
    },
    list.filters.stateId && {
      key: 'stateId',
      label: 'State',
      value: stateName.get(Number(list.filters.stateId)) ?? list.filters.stateId,
      onRemove: () => list.setFilter('stateId', ''),
    },
    list.filters.isActive && {
      key: 'isActive',
      label: 'Status',
      value: list.filters.isActive === 'true' ? 'Active' : 'Inactive',
      onRemove: () => list.setFilter('isActive', ''),
    },
  ].filter(Boolean);

  async function submit(payload) {
    try {
      await save.mutateAsync({ id: editing.row?.id, payload });
      toast.success(`${title.slice(0, -1)} saved`);
      setEditing(null);
    } catch {
      // The popup shows the error next to the field or at the top of the form.
    }
  }

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
        {hasCountry && (
          <Dropdown
            pill
            clearable
            search
            placeholder="Country"
            aria-label="Filter by country"
            options={countries.data ?? []}
            value={list.filters.countryId ?? ''}
            onChange={(value) => {
              list.setFilter('countryId', value);
              list.setFilter('stateId', '');
            }}
          />
        )}
        {resource === 'cities' && (
          <Dropdown
            pill
            clearable
            search
            placeholder="State"
            aria-label="Filter by state"
            options={states.data ?? []}
            value={list.filters.stateId ?? ''}
            onChange={(value) => list.setFilter('stateId', value)}
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
          <Button onClick={() => setEditing({ row: null })}>
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
        onEdit={(row) => setEditing({ row })}
        onDelete={setToDelete}
        emptyTitle={list.hasFilters ? `No ${title.toLowerCase()} match your filters` : `No ${title.toLowerCase()} yet`}
        emptyText={list.hasFilters ? 'Try a different search or clear the filters.' : `Add the first ${singular}.`}
        columns={columns}
      />

      <GeoForm
        key={editing?.row?.id ?? 'new'}
        resource={resource}
        open={Boolean(editing)}
        row={editing?.row ?? null}
        onClose={() => setEditing(null)}
        onSubmit={submit}
        submitting={save.isPending}
        error={save.error}
      />

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title={`Delete ${singular}?`}
        message={toDelete && `${toDelete.name} will be removed. Addresses that use it keep working.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '../../components/ui/Button.jsx';
import { ConfirmDeleteModal } from '../../components/ui/Confirm.jsx';
import { Badge, ErrorAlert } from '../../components/ui/Display.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import { ActiveFilters } from '../../components/ui/ListKit.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { QueryError } from '../../components/ui/QueryState.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useApiFormErrors } from '../../hooks/useApiFormErrors.js';
import { useListState } from '../../hooks/useListState.js';
import { ACTION, MENU } from '../../lib/permissions.js';
import { usePermissions } from '../auth/permissions.js';
import { geoApi, useGeoList, useGeoMutation, useGeoOptions } from '../geography/api.js';
import MasterList from '../master/MasterList.jsx';

const RESOURCE = 'service-types';
const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const schema = z.object({
  serviceGroupId: z.string().min(1, 'Select the service group'),
  name: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(250, 'Use at most 250 characters'),
  displayOrder: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, 'Use a number up to 9999'),
  isActive: z.string().min(1, 'Select a status'),
});

const toValues = (row) => ({
  serviceGroupId: row ? String(row.serviceGroupId) : '',
  name: row?.name ?? '',
  displayOrder: row ? String(row.displayOrder ?? '') : '',
  isActive: row ? String(row.isActive) : 'true',
});

const toPayload = (values) => ({
  serviceGroupId: Number(values.serviceGroupId),
  name: values.name,
  ...(values.displayOrder !== '' && { displayOrder: Number(values.displayOrder) }),
  isActive: values.isActive === 'true',
});

const useServiceGroups = () => useGeoOptions('service-groups');

function ServiceTypeForm({ row, open, onClose, onSubmit, submitting, error, groups }) {
  const { fieldErrors, formError } = useApiFormErrors(error);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toValues(row) });

  useEffect(() => {
    if (open) reset(toValues(row));
  }, [open, row, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
  }, [fieldErrors, setError]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${row ? 'Edit' : 'New'} service type`}
      locked={submitting}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {(!row || isDirty) && (
            <Button type="submit" form="service-type-form" loading={submitting}>
              {row ? 'Save' : 'Create'}
            </Button>
          )}
        </>
      }
    >
      <form
        id="service-type-form"
        style={{ display: 'grid', gap: 16 }}
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(toPayload(values)))}
      >
        <ErrorAlert message={formError} />
        <Field label="Service group" required error={errors.serviceGroupId?.message}>
          <Controller
            control={control}
            name="serviceGroupId"
            render={({ field }) => (
              <Dropdown
                search
                placeholder="Select service group"
                options={groups}
                value={field.value}
                onChange={field.onChange}
                aria-label="Service group"
              />
            )}
          />
        </Field>
        <Field label="Name" required error={errors.name?.message}>
          <input className="input" autoComplete="off" {...register('name')} />
        </Field>
        <Field label="Display order" error={errors.displayOrder?.message}>
          <input
            className="input"
            inputMode="numeric"
            autoComplete="off"
            {...register('displayOrder')}
          />
        </Field>
        <Field label="Status" required error={errors.isActive?.message}>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Dropdown
                options={ACTIVE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                aria-label="Status"
              />
            )}
          />
        </Field>
      </form>
    </Modal>
  );
}

/** Service types of every service group: search, filters, table and the add / edit / delete popups. */
export default function ServiceTypes() {
  const toast = useToast();
  const { can } = usePermissions();
  const list = useListState({ sort: { sortBy: 'name', sortOrder: 'asc' } });
  const groups = useServiceGroups();
  const rows = useGeoList(RESOURCE, {
    ...list.query,
    ...(list.filters.isActive && { isActive: list.filters.isActive === 'true' }),
    ...(list.filters.serviceGroupId && { serviceGroupId: Number(list.filters.serviceGroupId) }),
  });
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const save = useGeoMutation(RESOURCE, ({ id, payload }) =>
    id ? geoApi(RESOURCE).update(id, payload) : geoApi(RESOURCE).create(payload),
  );
  const remove = useGeoMutation(RESOURCE, geoApi(RESOURCE).remove);

  const canCreate = can(MENU.SERVICE_TYPES, ACTION.CREATE);
  const canEdit = can(MENU.SERVICE_TYPES, ACTION.EDIT);
  const canDelete = can(MENU.SERVICE_TYPES, ACTION.DELETE);

  const groupName = useMemo(
    () => new Map((groups.data ?? []).map((option) => [Number(option.value), option.label])),
    [groups.data],
  );

  const columns = [
    { key: 'name', label: 'Name', sortBy: 'name', render: (row) => <strong>{row.name}</strong> },
    {
      key: 'serviceGroupId',
      label: 'Service group',
      render: (row) => groupName.get(row.serviceGroupId) ?? '—',
    },
    { key: 'displayOrder', label: 'Order', sortBy: 'displayOrder', className: 'nowrap' },
    {
      key: 'isActive',
      label: 'Status',
      render: (row) => (
        <Badge tone={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  const chips = [
    list.filters.serviceGroupId && {
      key: 'serviceGroupId',
      label: 'Service group',
      value: groupName.get(Number(list.filters.serviceGroupId)) ?? list.filters.serviceGroupId,
      onRemove: () => list.setFilter('serviceGroupId', ''),
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
      toast.success('Service type saved');
      setEditing(null);
    } catch {
      // The popup shows the error next to the field or at the top of the form.
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Service type deleted');
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
            placeholder="Search service types…"
            aria-label="Search service types"
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </div>
        <Dropdown
          pill
          clearable
          placeholder="Service group"
          aria-label="Filter by service group"
          options={groups.data ?? []}
          value={list.filters.serviceGroupId ?? ''}
          onChange={(value) => list.setFilter('serviceGroupId', value)}
        />
        <Dropdown
          pill
          clearable
          placeholder="Status"
          aria-label="Filter by status"
          options={ACTIVE_OPTIONS}
          value={list.filters.isActive ?? ''}
          onChange={(value) => list.setFilter('isActive', value)}
        />
        <span className="spacer" />
        {canCreate && (
          <Button onClick={() => setEditing({ row: null })}>
            <Plus />
            New service type
          </Button>
        )}
      </div>
      <ActiveFilters chips={chips} onClearAll={list.clearFilters} />

      <QueryError error={rows.error} onRetry={() => rows.refetch()} />

      <MasterList
        caption="Service types"
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
        emptyTitle={
          list.hasFilters ? 'No service types match your filters' : 'No service types yet'
        }
        emptyText={
          list.hasFilters
            ? 'Try a different search or clear the filters.'
            : 'Add the first service type.'
        }
        columns={columns}
      />

      <ServiceTypeForm
        key={editing?.row?.id ?? 'new'}
        open={Boolean(editing)}
        row={editing?.row ?? null}
        groups={groups.data ?? []}
        onClose={() => setEditing(null)}
        onSubmit={submit}
        submitting={save.isPending}
        error={save.error}
      />

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title="Delete service type?"
        message={toDelete && `${toDelete.name} will be removed.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

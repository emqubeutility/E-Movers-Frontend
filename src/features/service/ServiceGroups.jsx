import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import Button from '../../components/ui/Button.jsx';
import { ConfirmDeleteModal } from '../../components/ui/Confirm.jsx';
import { Badge, ErrorAlert } from '../../components/ui/Display.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { QueryError } from '../../components/ui/QueryState.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useApiFormErrors } from '../../hooks/useApiFormErrors.js';
import { useListState } from '../../hooks/useListState.js';
import { ACTION, MENU } from '../../lib/permissions.js';
import { usePermissions } from '../auth/permissions.js';
import { geoApi, useGeoList, useGeoMutation } from '../geography/api.js';
import ImageUpload, { FileThumb } from '../file/ImageUpload.jsx';
import MasterList from '../master/MasterList.jsx';

const RESOURCE = 'service-groups';
const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,59}$/, 'Start with a letter; use capital letters, digits or _'),
  name: z
    .string()
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(150, 'Use at most 150 characters'),
  displayOrder: z
    .string()
    .trim()
    .regex(/^\d{0,4}$/, 'Use a number up to 9999'),
  isActive: z.string().min(1, 'Select a status'),
  fileId: z.number().nullable(),
});

const toValues = (row) => ({
  code: row?.code ?? '',
  name: row?.name ?? '',
  displayOrder: row ? String(row.displayOrder ?? '') : '',
  isActive: row ? String(row.isActive) : 'true',
  fileId: row?.fileId ?? null,
});

function GroupForm({ row, open, onClose, onSubmit, submitting, error }) {
  const { fieldErrors, formError } = useApiFormErrors(error);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: toValues(row) });

  useEffect(() => {
    if (open) reset(toValues(row));
  }, [open, row, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
  }, [fieldErrors, setError]);

  // The code is fixed once saved.
  const toPayload = (values) => ({
    ...(!row && { code: values.code }),
    name: values.name,
    ...(values.displayOrder !== '' && { displayOrder: Number(values.displayOrder) }),
    isActive: values.isActive === 'true',
    fileId: values.fileId,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${row ? 'Edit' : 'New'} service group`}
      locked={submitting}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {(!row || isDirty) && (
            <Button type="submit" form="service-group-form" loading={submitting}>
              {row ? 'Save' : 'Create'}
            </Button>
          )}
        </>
      }
    >
      <form
        id="service-group-form"
        style={{ display: 'grid', gap: 16 }}
        noValidate
        onSubmit={handleSubmit((values) => onSubmit(toPayload(values)))}
      >
        <ErrorAlert message={formError} />
        <Field label="Image" error={errors.fileId?.message}>
          <Controller
            control={control}
            name="fileId"
            render={({ field }) => (
              <ImageUpload
                folder="service-groups"
                value={field.value}
                onChange={field.onChange}
                onError={(message) =>
                  message ? setError('fileId', { type: 'upload', message }) : clearErrors('fileId')
                }
              />
            )}
          />
        </Field>
        <Field label="Code" required error={errors.code?.message}>
          <input
            className="input"
            autoComplete="off"
            readOnly={Boolean(row)}
            style={{ textTransform: 'uppercase' }}
            {...register('code')}
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

/** Service groups: name, code, order and status. The image comes with the upload feature. */
export default function ServiceGroups() {
  const toast = useToast();
  const { can } = usePermissions();
  const list = useListState({ sort: { sortBy: 'displayOrder', sortOrder: 'asc' } });
  const rows = useGeoList(RESOURCE, list.query);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const save = useGeoMutation(RESOURCE, ({ id, payload }) =>
    id ? geoApi(RESOURCE).update(id, payload) : geoApi(RESOURCE).create(payload),
  );
  const remove = useGeoMutation(RESOURCE, geoApi(RESOURCE).remove);

  async function submit(payload) {
    try {
      await save.mutateAsync({ id: editing.row?.id, payload });
      toast.success('Service group saved');
      setEditing(null);
    } catch {
      // The popup shows the error.
    }
  }

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Service group deleted');
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
            placeholder="Search service groups…"
            aria-label="Search service groups"
            value={list.search}
            onChange={(event) => list.setSearch(event.target.value)}
          />
        </div>
        <span className="spacer" />
        {can(MENU.SERVICE_TYPES, ACTION.CREATE) && (
          <Button onClick={() => setEditing({ row: null })}>
            <Plus />
            New service group
          </Button>
        )}
      </div>

      <QueryError error={rows.error} onRetry={() => rows.refetch()} />

      <MasterList
        caption="Service groups"
        rows={rows.data?.items ?? []}
        loading={rows.isPending}
        sort={list.sort}
        onSort={list.setSort}
        page={list.page}
        pageSize={list.pageSize}
        meta={rows.data?.meta}
        onPage={list.setPage}
        onPageSize={list.setPageSize}
        canEdit={can(MENU.SERVICE_TYPES, ACTION.EDIT)}
        canDelete={can(MENU.SERVICE_TYPES, ACTION.DELETE)}
        onEdit={(row) => setEditing({ row })}
        onDelete={setToDelete}
        emptyTitle="No service groups yet"
        emptyText="Add the first service group."
        columns={[
          { key: 'fileId', label: 'Image', render: (row) => <FileThumb fileId={row.fileId} /> },
          { key: 'code', label: 'Code', className: 'nowrap' },
          {
            key: 'name',
            label: 'Name',
            sortBy: 'name',
            render: (row) => <strong>{row.name}</strong>,
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
        ]}
      />

      <GroupForm
        key={editing?.row?.id ?? 'new'}
        open={Boolean(editing)}
        row={editing?.row ?? null}
        onClose={() => setEditing(null)}
        onSubmit={submit}
        submitting={save.isPending}
        error={save.error}
      />

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title="Delete service group?"
        message={toDelete && `${toDelete.name} will be removed.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

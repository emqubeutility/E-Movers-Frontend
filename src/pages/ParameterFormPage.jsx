import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import {
  paramApi,
  useParamMutation,
  useParamRecord,
  useTypeOptions,
} from '../features/parameter/api.js';
import {
  ACTIVE_OPTIONS,
  toPayload,
  toValues,
  typeSchema,
  valueSchema,
} from '../features/parameter/schemas.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';

const RESOURCES = { types: 'parameter-types', values: 'parameters' };

function Switch({ label, ...props }) {
  return (
    <label className="switch switch-form">
      <input type="checkbox" role="switch" {...props} />
      <span className="switch-track" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

/** Add / edit page for a parameter type (kind = types) or a parameter value (kind = values). */
export default function ParameterFormPage() {
  const { kind, id } = useParams();
  const [search] = useSearchParams();
  const resource = RESOURCES[kind];
  const isType = resource === 'parameter-types';
  const editing = Boolean(id);
  const listPath = `/parameters?tab=${kind}`;
  const navigate = useNavigate();
  const toast = useToast();
  const record = useParamRecord(resource, id);
  const types = useTypeOptions(!isType);
  const save = useParamMutation(({ id: rowId, payload }) =>
    rowId ? paramApi(resource).update(rowId, payload) : paramApi(resource).create(payload),
  );
  const { fieldErrors, formError } = useApiFormErrors(save.error);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(isType ? typeSchema : valueSchema),
    defaultValues: { ...toValues(resource, null), parameterTypeId: search.get('typeId') ?? '' },
  });

  useEffect(() => {
    if (record.data) reset(toValues(resource, record.data));
  }, [record.data, resource, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => setError(field, { type: 'server', message }));
  }, [fieldErrors, setError]);

  if (!resource) return null;

  const row = record.data;
  const fixed = isType ? row?.isSystem : row?.isFixed;
  const singular = isType ? 'parameter type' : 'parameter';
  const ready = !editing || record.isSuccess;
  const codeHelp = fixed
    ? 'Fixed: the code cannot be changed.'
    : editing
      ? 'Cannot be changed.'
      : 'Capital letters, numbers and underscores. Cannot be changed later.';

  async function submit(values) {
    try {
      await save.mutateAsync({ id, payload: toPayload(resource, values, editing) });
      toast.success(`${isType ? 'Parameter type' : 'Parameter'} ${editing ? 'saved' : 'created'}`);
      navigate(listPath);
    } catch {
      // Shown by the form.
    }
  }

  return (
    <>
      <Topbar
        title={editing ? `Edit ${singular} · ${row?.code ?? ''}` : `New ${singular}`}
        breadcrumb={['Setup', 'Parameters']}
        back={listPath}
      />

      {editing && record.isPending && <Loader label="Loading" />}
      <QueryError error={record.error} onRetry={() => record.refetch()} />
      {editing && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={ListChecks}
            title="Not found"
            text={record.error.message}
            action={
              <Link to={listPath} className="btn btn-primary">
                Back to parameters
              </Link>
            }
          />
        </div>
      )}

      {ready && !(editing && record.isError) && (
        <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
          <div className="form-main form-pairs">
            <div className="span-pair">
              <ErrorAlert message={formError} />
            </div>

            <FormSection
              number={1}
              title={isType ? 'Parameter type' : 'Parameter'}
              sub="The code is the stable business identifier."
              columns={2}
              full
              action={
                isType ? (
                  <Switch
                    label="Dynamic: users can add their own values"
                    {...register('allowUserValues')}
                  />
                ) : (
                  <Switch label="Default value" {...register('isDefault')} />
                )
              }
            >
              {!isType && (
                <Field label="Parameter type" required error={errors.parameterTypeId?.message}>
                  <Controller
                    control={control}
                    name="parameterTypeId"
                    render={({ field }) => (
                      <Dropdown
                        search
                        disabled={editing}
                        placeholder="Select parameter type"
                        options={types.data ?? []}
                        value={field.value}
                        onChange={field.onChange}
                        aria-label="Parameter type"
                      />
                    )}
                  />
                </Field>
              )}
              <Field label="Code" required error={errors.code?.message} help={codeHelp}>
                <input
                  className="input"
                  autoComplete="off"
                  disabled={editing}
                  style={{ textTransform: 'uppercase' }}
                  {...register('code')}
                />
              </Field>
              <Field
                label={isType ? 'Name' : 'Label'}
                required
                error={errors[isType ? 'name' : 'label']?.message}
              >
                <input
                  className="input"
                  autoComplete="off"
                  {...register(isType ? 'name' : 'label')}
                />
              </Field>
              {!isType && (
                <Field label="Display order" required error={errors.displayOrder?.message}>
                  <input
                    className="input"
                    inputMode="numeric"
                    autoComplete="off"
                    {...register('displayOrder')}
                  />
                </Field>
              )}
              {!isType && (
                <Field
                  label="Colour"
                  error={errors.colorHex?.message}
                  help="Optional, e.g. #90191C"
                >
                  <input
                    className="input"
                    autoComplete="off"
                    maxLength={7}
                    placeholder="#90191C"
                    {...register('colorHex')}
                  />
                </Field>
              )}
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
              <Field label="Description" error={errors.description?.message} span="all">
                <input className="input" autoComplete="off" {...register('description')} />
              </Field>
            </FormSection>
          </div>

          <FormBar
            cancelTo={listPath}
            submitLabel={editing ? `Save ${singular}` : `Create ${singular}`}
            changed={!editing || isDirty}
            submitting={save.isPending}
          />
        </form>
      )}
    </>
  );
}

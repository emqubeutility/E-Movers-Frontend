import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Check } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import AddressFields from '../features/address/AddressFields.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import ImageUpload from '../features/file/ImageUpload.jsx';
import {
  useCreateOrganization,
  useCurrencies,
  useOrganization,
  useTimeZones,
  useUpdateOrganization,
  useVolumeUoms,
} from '../features/organization/hooks.js';
import {
  ORGANIZATION_ERROR_FIELDS,
  fromOrganization,
  organizationDefaults,
  organizationSchema,
  toOrganizationPayload,
} from '../features/organization/schemas.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';
import { phoneProps } from '../lib/validation.js';

const LIST_PATH = '/organizations';

export default function OrganizationFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { isSuperAdmin } = usePermissions();
  const record = useOrganization(id);
  const uoms = useVolumeUoms();
  const currencies = useCurrencies();
  const timeZones = useTimeZones();
  const create = useCreateOrganization();
  const update = useUpdateOrganization();
  const mutation = editing ? update : create;
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);
  const [uploadError, setUploadError] = useState(null);

  const resolver = useMemo(() => zodResolver(organizationSchema), []);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({ resolver, defaultValues: organizationDefaults });

  useEffect(() => {
    if (record.data) reset(fromOrganization(record.data));
  }, [record.data, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => {
      const name = ORGANIZATION_ERROR_FIELDS[field];
      if (name) setError(name, { type: 'server', message });
    });
  }, [fieldErrors, setError]);

  const ready = !editing || record.isSuccess;
  const otherError = fieldErrors.find((item) => !ORGANIZATION_ERROR_FIELDS[item.field])?.message;

  async function submit(values) {
    const payload = toOrganizationPayload(values, { editing, isSuperAdmin });
    try {
      if (editing) await update.mutateAsync({ id, payload });
      else await create.mutateAsync(payload);
      toast.success(editing ? 'Organization saved' : 'Organization created');
      navigate(LIST_PATH);
    } catch {
      // Shown by the form.
    }
  }

  const pick = (name, options, placeholder) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Dropdown
          search={options.length > 8}
          placeholder={placeholder}
          options={options}
          value={field.value}
          onChange={field.onChange}
          aria-label={placeholder}
        />
      )}
    />
  );

  const upload = (name, label, folder) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ImageUpload
          value={field.value}
          onChange={(fileId) => field.onChange(fileId)}
          folder={folder}
          label={label}
          onError={setUploadError}
        />
      )}
    />
  );

  const number = (name, props = {}) => (
    <input className="input" inputMode="decimal" {...props} {...register(name)} />
  );

  return (
    <>
      <Topbar
        title={editing ? `Edit organization · ${record.data?.name ?? ''}` : 'New organization'}
        breadcrumb={['Setup', 'Organizations']}
        back={LIST_PATH}
      />

      {editing && record.isPending && <Loader label="Loading organization" />}
      <QueryError error={record.error} onRetry={() => record.refetch()} />
      {editing && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={Building2}
            title="Organization not found"
            text={record.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to organizations
              </Link>
            }
          />
        </div>
      )}

      {ready && (
        <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
          <div className="form-main form-pairs">
            <div className="span-pair">
              <ErrorAlert message={formError ?? otherError ?? uploadError} />
            </div>

            <FormSection
              number={1}
              title="Organization"
              sub="Name, short name and status."
              columns={2}
            >
              <Field label="Org name" required error={errors.name?.message}>
                <input className="input" {...register('name')} />
              </Field>
              <Field
                label="Org short name"
                required
                error={errors.organizationCode?.message}
                help={editing ? 'Cannot be changed.' : 'e.g. DXB. Cannot be changed later.'}
              >
                <input className="input" disabled={editing} {...register('organizationCode')} />
              </Field>
              <Field label="Org contact no." error={errors.contactNo?.message}>
                <input
                  className="input"
                  {...phoneProps(register('contactNo'))}
                  placeholder="+9714XXXXXXX"
                />
              </Field>
              {isSuperAdmin && (
                <Field label="Status">
                  <div className="row" style={{ gap: 16, flexWrap: 'wrap' }}>
                    <label className="check">
                      <input type="checkbox" {...register('isActive')} />
                      <span className="box" aria-hidden="true">
                        <Check />
                      </span>
                      <span>Active</span>
                    </label>
                    <label className="check">
                      <input type="checkbox" {...register('isHeadOffice')} />
                      <span className="box" aria-hidden="true">
                        <Check />
                      </span>
                      <span>Head office</span>
                    </label>
                  </div>
                </Field>
              )}
            </FormSection>

            <FormSection number={2} title="Contact person" sub="Saved as a profile." columns={2}>
              <Field label="Contact person" required error={errors.contactName?.message}>
                <input className="input" {...register('contactName')} />
              </Field>
              <Field label="Contact person email" error={errors.contactEmail?.message}>
                <input className="input" type="email" {...register('contactEmail')} />
              </Field>
              <Field label="Contact person no." error={errors.contactPhone?.message}>
                <input
                  className="input"
                  {...phoneProps(register('contactPhone'))}
                  placeholder="+9715XXXXXXXX"
                />
              </Field>
            </FormSection>

            <FormSection
              number={3}
              title="Leads and documents"
              sub="Where new leads are e-mailed, and the quote header."
              columns={2}
            >
              <Field label="Lead send email" required error={errors.leadEmail?.message}>
                <input className="input" type="email" {...register('leadEmail')} />
              </Field>
              <Field label="Lead CC email" required error={errors.leadCcEmail?.message}>
                <input className="input" type="email" {...register('leadCcEmail')} />
              </Field>
              <Field label="Logo file" error={errors.logoFileId?.message}>
                {upload('logoFileId', 'logo', 'organization-logos')}
              </Field>
              <Field label="Quote header file" error={errors.quoteHeaderFileId?.message}>
                {upload('quoteHeaderFileId', 'header', 'quote-headers')}
              </Field>
            </FormSection>

            <FormSection
              number={4}
              title="Quote and costing"
              sub="Units, currency, tax and cost rates."
              columns={2}
            >
              <Field label="Total volume UOM" required error={errors.volumeUom?.message}>
                {pick('volumeUom', uoms.data ?? [], 'Select unit')}
              </Field>
              <Field
                label="Furniture volume UOM"
                required
                error={errors.furnitureVolumeUom?.message}
              >
                {pick('furnitureVolumeUom', uoms.data ?? [], 'Select unit')}
              </Field>
              <Field label="Org currency" required error={errors.currencyId?.message}>
                {pick('currencyId', currencies.data ?? [], 'Select currency')}
              </Field>
              <Field
                label="Quote review min limit"
                required
                error={errors.quoteReviewMinLimit?.message}
              >
                {number('quoteReviewMinLimit')}
              </Field>
              <Field label="VAT (%)" required error={errors.vatPercent?.message}>
                {number('vatPercent', { placeholder: 'e.g. 5' })}
              </Field>
              <Field label="Profit (%)" required error={errors.profitPercent?.message}>
                {number('profitPercent', { placeholder: 'e.g. 8' })}
              </Field>
              <Field label="Employee cost (per hour)" error={errors.employeeCostPerHour?.message}>
                {number('employeeCostPerHour')}
              </Field>
              <Field label="Vehicle cost (per trip)" error={errors.vehicleCostPerTrip?.message}>
                {number('vehicleCostPerTrip')}
              </Field>
            </FormSection>

            <FormSection
              number={5}
              title="Work settings"
              sub="Workload, hours, time zone and display."
              columns={2}
            >
              <Field label="Work load min value" error={errors.workloadMin?.message}>
                {number('workloadMin')}
              </Field>
              <Field label="Work load max value" error={errors.workloadMax?.message}>
                {number('workloadMax')}
              </Field>
              <Field label="Job confirmation min hrs" error={errors.jobConfirmMinHours?.message}>
                {number('jobConfirmMinHours', { inputMode: 'numeric' })}
              </Field>
              <Field label="Employee working hrs" error={errors.employeeWorkingHours?.message}>
                {number('employeeWorkingHours')}
              </Field>
              <Field label="Time zone" required error={errors.timeZoneId?.message}>
                {pick('timeZoneId', timeZones.data ?? [], 'Select time zone')}
              </Field>
              <Field label="Invoice max delay (days)" error={errors.invoiceMaxDelayDays?.message}>
                {number('invoiceMaxDelayDays', { inputMode: 'numeric' })}
              </Field>
              <Field label="Employee display colour" required error={errors.displayColor?.message}>
                <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                  <input
                    type="color"
                    className="color-input"
                    aria-label="Employee display colour"
                    {...register('displayColor')}
                  />
                  <span className="muted">{watch('displayColor')}</span>
                </div>
              </Field>
            </FormSection>

            <FormSection
              number={6}
              title="Org address"
              sub="Saved in the address table."
              columns={2}
            >
              <AddressFields
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                streetSpan={2}
                multiline
              />
            </FormSection>
          </div>

          <FormBar
            cancelTo={LIST_PATH}
            submitLabel={editing ? 'Save organization' : 'Create organization'}
            changed={!editing || isDirty}
            submitting={mutation.isPending}
          />
        </form>
      )}
    </>
  );
}

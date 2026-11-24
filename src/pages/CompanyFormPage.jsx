import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import {
  useCompany,
  useCompanyOptions,
  useCreateCompany,
  useUpdateCompany,
} from '../features/company/hooks.js';
import {
  companyDefaults,
  companySchema,
  fromCompany,
  toCompanyPayload,
} from '../features/company/schemas.js';
import { usePermissions } from '../features/auth/permissions.js';
import AddressFields from '../features/address/AddressFields.jsx';
import { ADDRESS_FIELD_NAMES } from '../features/address/address.js';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useOrganizationOptions } from '../features/organization/hooks.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';
import { phoneProps } from '../lib/validation.js';

const LIST_PATH = '/companies';
const FORM_FIELDS = [
  'organizationId',
  'code',
  'name',
  'companyType',
  'contactName',
  'email',
  'contactNo',
  'website',
  'services',
  'paymentTerm',
  'status',
  'notes',
  ...ADDRESS_FIELD_NAMES,
];

export default function CompanyFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const record = useCompany(id);
  const options = useCompanyOptions();
  const { isSuperAdmin } = usePermissions();
  const { user } = useAuth();
  // A super admin on "All organizations" picks the organization; otherwise the menu's one is used.
  const pickOrganization = isSuperAdmin && !user?.organizationId;
  const organizations = useOrganizationOptions(pickOrganization);
  const create = useCreateCompany();
  const update = useUpdateCompany();
  const mutation = editing ? update : create;
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);

  const resolver = useMemo(() => zodResolver(companySchema), []);
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({ resolver, defaultValues: companyDefaults });

  useEffect(() => {
    if (record.data) reset(fromCompany(record.data));
  }, [record.data, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => {
      if (FORM_FIELDS.includes(field)) setError(field, { type: 'server', message });
    });
  }, [fieldErrors, setError]);

  const ready = (!editing || record.isSuccess) && options.isSuccess;
  const otherError = fieldErrors.find((item) => !FORM_FIELDS.includes(item.field))?.message;
  const toOptions = (items = []) => items.map((item) => ({ value: item.code, label: item.label }));

  async function submit(values) {
    // A super administrator belongs to no organization, so the company's one must be chosen.
    if (pickOrganization && !values.organizationId) {
      setError('organizationId', { type: 'required', message: 'Select the organization' });
      return;
    }
    try {
      if (editing) await update.mutateAsync({ id, payload: toCompanyPayload(values, true) });
      else await create.mutateAsync(toCompanyPayload(values, false));
      toast.success(editing ? 'Company saved' : 'Company created');
      navigate(LIST_PATH);
    } catch {
      // Shown by the form.
    }
  }

  return (
    <>
      <Topbar
        title={editing ? `Edit company · ${record.data?.name ?? ''}` : 'New company'}
        breadcrumb={['Master', 'Companies']}
        back={LIST_PATH}
      />

      {editing && record.isPending && <Loader label="Loading company" />}
      <QueryError error={record.error} onRetry={() => record.refetch()} />
      <QueryError error={options.error} onRetry={() => options.refetch()} />
      {editing && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={Building2}
            title="Company not found"
            text={record.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to companies
              </Link>
            }
          />
        </div>
      )}

      {ready && (
        <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
          <div className="form-main form-pairs">
            <div className="span-pair">
              <ErrorAlert message={formError ?? otherError} />
            </div>

            <FormSection
              number={1}
              title="Company details"
              sub="The code is the stable business identifier."
              full
            >
              {pickOrganization && (
                <Field label="Organization" required error={errors.organizationId?.message}>
                  <Controller
                    control={control}
                    name="organizationId"
                    render={({ field }) => (
                      <Dropdown
                        search
                        placeholder="Select organization"
                        options={(organizations.data ?? []).map((item) => ({
                          value: String(item.value),
                          label: item.label,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        aria-label="Organization"
                      />
                    )}
                  />
                </Field>
              )}
              <Field label="Company code" required error={errors.code?.message}>
                <input className="input" disabled={editing} {...register('code')} />
              </Field>
              <Field label="Name" required error={errors.name?.message}>
                <input className="input" {...register('name')} />
              </Field>
              <Field label="Status" required error={errors.status?.message}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Dropdown
                      options={toOptions(options.data.statuses)}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
              <Field label="Company type" required error={errors.companyType?.message}>
                <Controller
                  control={control}
                  name="companyType"
                  render={({ field }) => (
                    <Dropdown
                      options={toOptions(options.data.companyTypes)}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
              <AddressFields
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
              />
            </FormSection>

            <FormSection number={2} title="Contact" sub="Who to reach at this company." columns={2}>
              <Field label="Contact name" error={errors.contactName?.message}>
                <input className="input" autoComplete="name" {...register('contactName')} />
              </Field>
              <Field
                label="Contact number"
                error={errors.contactNo?.message}
                help="Use + followed by 8–15 digits."
              >
                <input className="input" {...phoneProps(register('contactNo'))} />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input className="input" type="email" {...register('email')} />
              </Field>
              <Field label="Website" error={errors.website?.message}>
                <input className="input" {...register('website')} />
              </Field>
            </FormSection>

            <FormSection
              number={3}
              title="Commercial"
              sub="How this company is billed and what it does."
              columns={1}
            >
              <Field label="Payment term" error={errors.paymentTerm?.message}>
                <Controller
                  control={control}
                  name="paymentTerm"
                  render={({ field }) => (
                    <Dropdown
                      clearable
                      placeholder="None"
                      options={toOptions(options.data.paymentTerms)}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </Field>
              <Field label="Services" error={errors.services?.message}>
                <textarea className="input" rows="3" {...register('services')} />
              </Field>
              <Field label="Notes" error={errors.notes?.message}>
                <textarea className="input" rows="3" {...register('notes')} />
              </Field>
            </FormSection>
          </div>

          <FormBar
            cancelTo={LIST_PATH}
            submitLabel={editing ? 'Save company' : 'Create company'}
            changed={!editing || isDirty}
            submitting={mutation.isPending}
          />
        </form>
      )}
    </>
  );
}

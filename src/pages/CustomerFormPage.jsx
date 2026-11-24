import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, Check, Plus, Trash2 } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import Button from '../components/ui/Button.jsx';
import { ConfirmDeleteModal } from '../components/ui/Confirm.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import AddressFields from '../features/address/AddressFields.jsx';
import { ADDRESS_FIELD_NAMES } from '../features/address/address.js';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import {
  useCreateCustomer,
  useCustomer,
  useCustomerOptions,
  useAgeGroups,
  useGenders,
  useUpdateCustomer,
} from '../features/customer/hooks.js';
import {
  customerDefaults,
  customerSchema,
  emptyContact,
  fromCustomer,
  toCustomerPayload,
} from '../features/customer/schemas.js';
import { useNationalities } from '../features/user/lookups.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';
import { phoneProps } from '../lib/validation.js';

const LIST_PATH = '/customers';
const FORM_FIELDS = [
  'code',
  'kind',
  'name',
  'contactName',
  'email',
  'contactNo',
  'altContactNo',
  'designation',
  'status',
  ...ADDRESS_FIELD_NAMES,
];

const isFormField = (field) => FORM_FIELDS.includes(field) || /^contacts\.\d+\./.test(field);

// Main contact form fields and the matching contact-row fields.
const MAIN_FIELDS = {
  contactName: 'name',
  designation: 'designation',
  gender: 'gender',
  ageGroup: 'ageGroup',
  nationality: 'nationality',
  email: 'email',
  contactNo: 'contactNo',
  altContactNo: 'altContactNo',
};

export default function CustomerFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const record = useCustomer(id);
  const options = useCustomerOptions();
  const genders = useGenders();
  const ageGroups = useAgeGroups();
  const nationalities = useNationalities();
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const mutation = editing ? update : create;
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);

  const resolver = useMemo(() => zodResolver(customerSchema), []);
  const {
    control,
    register,
    getValues,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({ resolver, defaultValues: customerDefaults });
  const contacts = useFieldArray({ control, name: 'contacts', keyName: 'key' });
  const isCompany = watch('kind') === 'COMPANY';
  // Contact row waiting for the "make main contact" confirmation.
  const [pendingMain, setPendingMain] = useState(null);

  /** Swap contact row `index` with the main contact; the old main becomes a contact person. */
  function makeMain(index) {
    const values = getValues();
    const row = values.contacts[index];
    const oldMain = { status: 'ACTIVE' };
    if (values.mainContactId) oldMain.id = values.mainContactId;
    Object.entries(MAIN_FIELDS).forEach(([mainKey, rowKey]) => {
      oldMain[rowKey] = values[mainKey] ?? '';
      setValue(mainKey, row[rowKey] ?? '', { shouldDirty: true });
    });
    setValue('mainContactId', row.id ?? '', { shouldDirty: true });
    contacts.update(index, oldMain);
  }

  useEffect(() => {
    if (record.data) reset(fromCustomer(record.data));
  }, [record.data, reset]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => {
      if (isFormField(field)) setError(field, { type: 'server', message });
    });
  }, [fieldErrors, setError]);

  const ready = (!editing || record.isSuccess) && options.isSuccess;
  const otherError = fieldErrors.find((item) => !isFormField(item.field))?.message;
  const toOptions = (items = []) => items.map((item) => ({ value: item.code, label: item.label }));

  const pick = (name, label, items, error, search = false) => (
    <Field label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Dropdown
            clearable
            search={search}
            placeholder={`Select ${label.toLowerCase()}`}
            aria-label={label}
            options={items ?? []}
            value={field.value}
            onChange={(value) => field.onChange(value ?? '')}
          />
        )}
      />
    </Field>
  );

  /** Gender, age group and nationality of one person; prefix is '' or 'contacts.N.'. */
  const personFields = (prefix, errs) => (
    <>
      {pick(`${prefix}gender`, 'Gender', genders.data, errs.gender?.message)}
      {pick(`${prefix}ageGroup`, 'Age group', ageGroups.data, errs.ageGroup?.message)}
      {pick(
        `${prefix}nationality`,
        'Nationality',
        nationalities.data,
        errs.nationality?.message,
        true,
      )}
    </>
  );

  const whatsapp = (
    <Field label="Consent">
      <label className="check">
        <input type="checkbox" {...register('agreedToWhatsapp')} />
        <span className="box" aria-hidden="true">
          <Check />
        </span>
        <span>Agreed to Whatsapp</span>
      </label>
    </Field>
  );

  async function submit(values) {
    try {
      if (editing) await update.mutateAsync({ id, payload: toCustomerPayload(values, true) });
      else await create.mutateAsync(toCustomerPayload(values, false));
      toast.success(editing ? 'Customer saved' : 'Customer created');
      navigate(LIST_PATH);
    } catch {
      // Shown by the form.
    }
  }

  return (
    <>
      <Topbar
        title={editing ? `Edit customer · ${record.data?.name ?? ''}` : 'New customer'}
        breadcrumb={['Master', 'Customers']}
        back={LIST_PATH}
      />

      {editing && record.isPending && <Loader label="Loading customer" />}
      <QueryError error={record.error} onRetry={() => record.refetch()} />
      <QueryError error={options.error} onRetry={() => options.refetch()} />
      {editing && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={Building2}
            title="Customer not found"
            text={record.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to customers
              </Link>
            }
          />
        </div>
      )}

      {ready && (
        <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
          <div className="form-main">
            <ErrorAlert message={formError ?? otherError} />

            <FormSection
              number={1}
              title="Customer details"
              sub="The code is the stable business identifier."
            >
              <Field label="Customer code" required error={errors.code?.message}>
                <input className="input" disabled={editing} {...register('code')} />
              </Field>
              <Field label="Customer type" required error={errors.kind?.message}>
                <Controller
                  control={control}
                  name="kind"
                  render={({ field }) => (
                    <Dropdown
                      options={toOptions(options.data.kinds)}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={editing}
                    />
                  )}
                />
              </Field>
              <Field label="Customer name" required error={errors.name?.message}>
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
              {whatsapp}
              <AddressFields
                control={control}
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
                streetSpan={2}
              />
            </FormSection>

            {!isCompany && (
              <FormSection number={2} title="Contact details" sub="How this customer is reached.">
                <Field label="Email" error={errors.email?.message}>
                  <input className="input" type="email" {...register('email')} />
                </Field>
                {personFields('', errors)}
                <Field
                  label="Contact No."
                  required
                  error={errors.contactNo?.message}
                  help="Use + followed by 8–15 digits."
                >
                  <input
                    className="input"
                    {...phoneProps(register('contactNo'))}
                    placeholder="+9715XXXXXXXX"
                  />
                </Field>
                <Field label="Alternate Contact No." error={errors.altContactNo?.message}>
                  <input
                    className="input"
                    {...phoneProps(register('altContactNo'))}
                    placeholder="+9715XXXXXXXX"
                  />
                </Field>
              </FormSection>
            )}

            {isCompany && (
              <FormSection
                number={2}
                title="Contact persons"
                sub="The main contact first, then anyone else at this company."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => contacts.append({ ...emptyContact })}
                  >
                    <Plus />
                    Add contact
                  </Button>
                }
              >
                <div className="contact-row span-all">
                  <Field label="Name" required error={errors.contactName?.message}>
                    <input className="input" {...register('contactName')} />
                  </Field>
                  <Field label="Status" help="Follows the customer status.">
                    <Dropdown
                      disabled
                      aria-label="Main contact status"
                      options={toOptions(options.data.statuses)}
                      value={watch('status')}
                      onChange={() => {}}
                    />
                  </Field>
                  <Field label="Designation" error={errors.designation?.message}>
                    <input className="input" {...register('designation')} />
                  </Field>
                  {personFields('', errors)}
                  <Field label="Email" error={errors.email?.message}>
                    <input className="input" type="email" {...register('email')} />
                  </Field>
                  <Field label="Contact No." required error={errors.contactNo?.message}>
                    <input
                      className="input"
                      {...phoneProps(register('contactNo'))}
                      placeholder="+9715XXXXXXXX"
                    />
                  </Field>
                  <Field label="Alternate No." error={errors.altContactNo?.message}>
                    <input
                      className="input"
                      {...phoneProps(register('altContactNo'))}
                      placeholder="+9715XXXXXXXX"
                    />
                  </Field>
                  <span className="contact-main">
                    <label className="contact-radio">
                      <input type="radio" name="main-contact" checked readOnly />
                      Main
                    </label>
                  </span>
                </div>
                {contacts.fields.map((item, index) => {
                  const rowErrors = errors.contacts?.[index] ?? {};
                  const name = (field) => `contacts.${index}.${field}`;
                  return (
                    <div key={item.key} className="contact-row span-all">
                      <Field label="Name" required error={rowErrors.name?.message}>
                        <input className="input" {...register(name('name'))} />
                      </Field>
                      <Field label="Status" required error={rowErrors.status?.message}>
                        <Controller
                          control={control}
                          name={name('status')}
                          render={({ field }) => (
                            <Dropdown
                              aria-label={`Contact ${index + 1} status`}
                              options={toOptions(options.data.statuses)}
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                      </Field>
                      <Field label="Designation" error={rowErrors.designation?.message}>
                        <input className="input" {...register(name('designation'))} />
                      </Field>
                      {personFields(`contacts.${index}.`, rowErrors)}
                      <Field label="Email" error={rowErrors.email?.message}>
                        <input className="input" type="email" {...register(name('email'))} />
                      </Field>
                      <Field label="Contact No." error={rowErrors.contactNo?.message}>
                        <input
                          className="input"
                          {...phoneProps(register(name('contactNo')))}
                          placeholder="+9715XXXXXXXX"
                        />
                      </Field>
                      <Field label="Alternate No." error={rowErrors.altContactNo?.message}>
                        <input
                          className="input"
                          {...phoneProps(register(name('altContactNo')))}
                          placeholder="+9715XXXXXXXX"
                        />
                      </Field>
                      <span className="contact-remove contact-actions">
                        <label
                          className="contact-radio"
                          title={
                            editing && !item.id
                              ? 'Save this new contact first, then make it the main contact'
                              : 'Make main contact'
                          }
                        >
                          <input
                            type="radio"
                            name="main-contact"
                            checked={false}
                            disabled={editing && !item.id}
                            onChange={() => setPendingMain(index)}
                            aria-label={`Make contact ${index + 1} the main contact`}
                          />
                          Main
                        </label>
                        <Button
                          variant="ghost"
                          icon
                          onClick={() => contacts.remove(index)}
                          aria-label={`Remove contact ${index + 1}`}
                        >
                          <Trash2 />
                        </Button>
                      </span>
                    </div>
                  );
                })}
              </FormSection>
            )}
          </div>

          <ConfirmDeleteModal
            open={pendingMain !== null}
            tone="brand"
            title="Change the main contact?"
            confirmLabel="Make main contact"
            message={
              pendingMain !== null &&
              `${getValues(`contacts.${pendingMain}.name`) || 'This person'} becomes the main ` +
                `contact and ${getValues('contactName') || 'the current main contact'} becomes ` +
                'a contact person. The customer address moves with the main contact. ' +
                'Click Save customer to keep the change.'
            }
            onClose={() => setPendingMain(null)}
            onConfirm={() => {
              makeMain(pendingMain);
              setPendingMain(null);
            }}
          />

          <FormBar
            cancelTo={LIST_PATH}
            submitLabel={editing ? 'Save customer' : 'Create customer'}
            changed={!editing || isDirty}
            submitting={mutation.isPending}
          />
        </form>
      )}
    </>
  );
}

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, ClipboardList } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { useOrganizationOptions } from '../features/organization/hooks.js';
import PlaceFields from '../features/service-request/PlaceFields.jsx';
import StatusActions from '../features/service-request/StatusActions.jsx';
import Timeline from '../features/service-request/Timeline.jsx';
import { ACTION, MENU } from '../lib/permissions.js';
import { CLOSED_STATUSES, REQUEST_STAGE } from '../lib/requestStatus.js';
import Button from '../components/ui/Button.jsx';
import {
  useCreateServiceRequest,
  useCustomerChoices,
  useOfficeExecutives,
  useRequestLookups,
  useRequestOptions,
  useServiceRequest,
  useUpdateServiceRequest,
} from '../features/service-request/hooks.js';
import {
  GROUP_RULES,
  PLACES,
  NEW_CUSTOMER_FIELDS,
  REQUEST_FIELD_NAMES,
  fromServiceRequest,
  makeRequestSchema,
  requestDefaults,
  toNewCustomerPayload,
  toServiceRequestPayload,
} from '../features/service-request/schemas.js';
import { useCreateCustomer } from '../features/customer/hooks.js';
import { phoneProps } from '../lib/validation.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';

const LIST_PATH = '/service-requests';

const CUSTOMER_KINDS = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'COMPANY', label: 'Company' },
];
const ADDRESS_ERRORS = { fromAddress: 'fromAddressText', toAddress: 'toAddressText' };

export default function ServiceRequestFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const record = useServiceRequest(id);
  const lookups = useRequestLookups();
  const options = useRequestOptions();
  const customers = useCustomerChoices();
  const createCustomer = useCreateCustomer();
  const { isSuperAdmin, role, can } = usePermissions();
  const { user } = useAuth();
  // The request's organization: any for a super admin, else one the person works in.
  const allOrganizations = useOrganizationOptions(isSuperAdmin);
  const organizationOptions = isSuperAdmin
    ? (allOrganizations.data ?? []).map((item) => ({
        value: String(item.value),
        label: item.label,
      }))
    : (user?.organizations ?? []).map((item) => ({ value: String(item.id), label: item.name }));
  const create = useCreateServiceRequest();
  const update = useUpdateServiceRequest();
  const mutation = editing ? update : create;
  const saving = mutation.isPending || createCustomer.isPending;
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);

  const groups = useMemo(() => options.data?.serviceGroups ?? [], [options.data]);
  const groupCodeOf = useMemo(() => {
    const codes = new Map(groups.map((group) => [group.value, group.code]));
    return (groupId) => codes.get(groupId);
  }, [groups]);
  const resolver = useMemo(() => zodResolver(makeRequestSchema(groupCodeOf)), [groupCodeOf]);

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm({ resolver, defaultValues: requestDefaults });

  // A dropped request is closed: shown, but nothing can be changed.
  const closed = CLOSED_STATUSES.includes(record.data?.statusValue);

  // A new request starts on the first group (the server sets it to Assigned).
  useEffect(() => {
    if (record.data) {
      reset(fromServiceRequest(record.data));
    } else if (!editing && lookups.data && options.data) {
      reset({
        ...requestDefaults,
        // Starts on the organization chosen in the menu.
        organizationId: user?.organizationId ? String(user.organizationId) : '',
        serviceGroupId: options.data.serviceGroups[0]?.value ?? '',
        // A new request needs a survey unless it is turned off.
        surveyRequired: true,
      });
    }
  }, [record.data, editing, lookups.data, options.data, reset, user?.organizationId]);

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => {
      const name = ADDRESS_ERRORS[field] ?? field;
      if (REQUEST_FIELD_NAMES.includes(name)) setError(name, { type: 'server', message });
    });
  }, [fieldErrors, setError]);

  const groupId = watch('serviceGroupId');
  const groupCode = groupCodeOf(groupId);
  const rules = GROUP_RULES[groupCode] ?? {};
  const surveyRequired = watch('surveyRequired');

  const services = (options.data?.serviceTypes ?? [])
    .filter((item) => String(item.serviceGroupId) === groupId)
    .map((item) => ({ value: String(item.id), label: item.name }));

  const officeId = watch('organizationId');
  // Executives of the request's organization.
  const officeExecutives = useOfficeExecutives(officeId, true);
  const executives = officeExecutives.data?.executives ?? [];
  // Local moves use the organization's country; only international moves pick one.
  const officeCountryId = officeExecutives.data?.countryId
    ? String(officeExecutives.data.countryId)
    : '';
  // Local moves start in the organization's own city.
  const officeCityId = officeExecutives.data?.cityId ? String(officeExecutives.data.cityId) : '';
  // Changing the organization clears an executive who does not work there.
  const executiveId = watch('executiveId');
  useEffect(() => {
    const list = officeExecutives.data;
    if (list && executiveId && !list.executives.some((item) => item.id === executiveId)) {
      setValue('executiveId', '', { shouldDirty: true });
    }
  }, [officeExecutives.data, executiveId, setValue]);

  const customerId = watch('customerId');
  const customerKind = watch('customerKind');
  const isCompany = customerKind === 'COMPANY';
  const customer = (customers.data ?? []).find((item) => item.value === customerId)?.customer;
  // Only customers of the chosen type are offered.
  const customerOptions = (customers.data ?? []).filter(
    (item) => item.customer.kind === customerKind,
  );

  // A company's contact persons: the main contact first, then the others.
  const contacts = customer
    ? [
        customer.mainContactId && {
          id: customer.mainContactId,
          name: customer.contactName,
          designation: customer.designation,
          contactNo: customer.contactNo,
          altContactNo: customer.altContactNo,
          email: customer.email,
          isMain: true,
        },
        ...(customer.contacts ?? []),
      ].filter(Boolean)
    : [];
  const contactOptions = contacts.map((item) => ({
    value: item.id,
    label: item.isMain ? `${item.name} (main)` : item.name,
  }));
  const customerProfileId = watch('customerProfileId');
  const contact = contacts.find((item) => item.id === customerProfileId);
  // Picking a company starts on its main contact; a contact of another customer is cleared.
  useEffect(() => {
    if (!customer || !isCompany) return;
    if (!contacts.some((item) => item.id === customerProfileId)) {
      setValue('customerProfileId', customer.mainContactId ?? '', {
        shouldDirty: Boolean(customerProfileId),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer, isCompany, customerProfileId, setValue]);

  // A saved request opens on its customer's type.
  const savedKind = editing
    ? (customers.data ?? []).find((item) => item.value === record.data?.customerId)?.customer.kind
    : undefined;
  useEffect(() => {
    if (savedKind) setValue('customerKind', savedKind);
  }, [savedKind, setValue]);

  function pickKind(kind) {
    if (kind === customerKind) return;
    setValue('customerKind', kind, { shouldDirty: true });
    setValue('customerId', '', { shouldDirty: true });
    setValue('customerProfileId', '', { shouldDirty: true });
  }

  /** Creates the typed-in individual customer; returns its id, or null (errors shown). */
  async function addIndividual(values) {
    try {
      const created = await createCustomer.mutateAsync(toNewCustomerPayload(values));
      setValue('customerId', created.id);
      return created.id;
    } catch (error) {
      const fieldErrors = error.errors ?? [];
      let shown = false;
      fieldErrors.forEach(({ field, message }) => {
        if (NEW_CUSTOMER_FIELDS[field]) {
          setError(NEW_CUSTOMER_FIELDS[field], { type: 'server', message });
          shown = true;
        }
      });
      if (!shown) toast.error(error.message);
      return null;
    }
  }

  const ready = (!editing || record.isSuccess) && lookups.isSuccess && options.isSuccess;
  const otherError = fieldErrors.find(
    (item) => !REQUEST_FIELD_NAMES.includes(ADDRESS_ERRORS[item.field] ?? item.field),
  )?.message;

  function pickGroup(value) {
    if (value === groupId) return;
    setValue('serviceGroupId', value, { shouldDirty: true });
    setValue('serviceTypeId', '', { shouldDirty: true });
  }

  const saveWith = (action) => handleSubmit((values) => submit(values, action));
  // An enquiry (new, or saved and still open) can move on to its survey or quote.
  const canStart = !closed && (!editing || record.data?.stageValue === REQUEST_STAGE.ENQUIRY);

  /** `action`: SAVE, START_SURVEY or START_QUOTE; the server sets the stage and status. */
  async function submit(values, action) {
    if (!values.organizationId) {
      setError('organizationId', { type: 'required', message: 'Select the organization' });
      return;
    }
    // An individual typed in here is saved as a customer first.
    if (!values.customerId) {
      const newId = await addIndividual(values);
      if (!newId) return;
      values = { ...values, customerId: newId };
    }
    const payload = { ...toServiceRequestPayload(values, groupCode), action };
    try {
      const saved = editing
        ? await update.mutateAsync({ id, payload })
        : await create.mutateAsync(payload);
      toast.success(
        action === 'START_SURVEY'
          ? 'Saved · survey started'
          : action === 'START_QUOTE'
            ? 'Saved · quote started'
            : editing
              ? 'Service request saved'
              : 'Service request created',
      );
      // Start Survey opens the survey; the quote screen comes later, so the rest go to the list.
      navigate(action === 'START_SURVEY' ? `/service-requests/${saved.id}/survey` : LIST_PATH);
    } catch {
      // Shown by the form.
    }
  }

  const datePicker = (name, label) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DatePicker value={field.value} onChange={field.onChange} aria-label={label} />
      )}
    />
  );

  const select = (name, items, placeholder, extra = {}) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Dropdown
          clearable={!extra.required}
          search={extra.search}
          placeholder={placeholder}
          options={items ?? []}
          value={field.value}
          onChange={field.onChange}
          aria-label={placeholder}
        />
      )}
    />
  );

  return (
    <>
      <Topbar
        title={
          editing ? `Edit service request · ${record.data?.requestNo ?? ''}` : 'New service request'
        }
        breadcrumb={['Service requests']}
        back={LIST_PATH}
        actions={
          editing &&
          record.data &&
          lookups.data && (
            <>
              {record.data.stageValue === REQUEST_STAGE.SURVEY && (
                <Link to={`/service-requests/${record.data.id}/survey`} className="btn btn-ghost">
                  <ClipboardList />
                  Survey
                </Link>
              )}
              <Timeline requestId={record.data.id} />
              <StatusActions
                request={record.data}
                executives={executives}
                dropReasons={lookups.data.ENQUIRY_DROP_REASON}
                role={role}
                canEdit={can(MENU.SERVICE_REQUESTS, ACTION.EDIT)}
              />
            </>
          )
        }
      />

      {editing && record.isPending && <Loader label="Loading service request" />}
      <QueryError error={record.error} onRetry={() => record.refetch()} />
      <QueryError error={lookups.error} onRetry={() => lookups.refetch()} />
      <QueryError error={options.error} onRetry={() => options.refetch()} />
      {editing && record.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={ClipboardList}
            title="Service request not found"
            text={record.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to service requests
              </Link>
            }
          />
        </div>
      )}

      {ready && (
        <form className="form-layout" onSubmit={saveWith('SAVE')} noValidate>
          <fieldset className="form-main form-pairs fieldset-plain" disabled={closed}>
            <div className="span-pair">
              <ErrorAlert message={formError ?? otherError} />
              {closed && (
                <div className="alert alert-warning">
                  <div>
                    <strong>Dropped · {record.data.dropReasonLabel}</strong>
                    <div>{record.data.dropRemark}</div>
                  </div>
                </div>
              )}
              {record.data?.contactedAt && (
                <p className="muted small">
                  Contacted by {record.data.contactedByName ?? '—'} on{' '}
                  {new Date(record.data.contactedAt).toLocaleString()}
                </p>
              )}
            </div>

            <FormSection
              number={1}
              title="Customer"
              sub="Who is asking and who handles it."
              columns={2}
            >
              <Field label="Customer type" required>
                <Dropdown
                  options={CUSTOMER_KINDS}
                  value={customerKind}
                  onChange={(value) => value && pickKind(value)}
                  aria-label="Customer type"
                />
              </Field>
              <Field
                label="Customer"
                required={isCompany}
                error={errors.customerId?.message}
                help={isCompany ? undefined : ''}
              >
                {select(
                  'customerId',
                  customerOptions,
                  isCompany ? 'Select company customer' : 'Select or add new',
                  { required: isCompany, search: true },
                )}
              </Field>
              {isCompany && (
                <Field label="Contact person" required error={errors.customerProfileId?.message}>
                  {select(
                    'customerProfileId',
                    contactOptions,
                    customer ? 'Select contact person' : 'Select the customer first',
                    { required: true, search: true },
                  )}
                </Field>
              )}
              <Field label="Executive" required error={errors.executiveId?.message}>
                {select(
                  'executiveId',
                  executives.map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                  officeId ? 'Select executive' : 'Select the organization first',
                  { required: true, search: true },
                )}
              </Field>
              <Field label="How did you find us" error={errors.referralId?.message}>
                {select('referralId', lookups.data.REFERRAL, 'Select')}
              </Field>
              <Field label="Enquiry channel" error={errors.enquiryChannelId?.message}>
                {select('enquiryChannelId', lookups.data.ENQUIRY_CHANNEL, 'Select')}
              </Field>
            </FormSection>

            <FormSection
              number={2}
              title="Customer details"
              sub={
                customer || isCompany
                  ? 'From the selected customer. Change them on the customer page.'
                  : 'A new individual customer is created with the request.'
              }
              columns={2}
            >
              {!customer && !isCompany ? (
                <>
                  <Field label="Name" required error={errors.newName?.message}>
                    <input className="input" maxLength={150} {...register('newName')} />
                  </Field>
                  <Field label="Contact No." required error={errors.newContactNo?.message}>
                    <input
                      className="input"
                      {...phoneProps(register('newContactNo'))}
                      placeholder="+9715XXXXXXXX"
                    />
                  </Field>
                  <Field label="Alternate No." error={errors.newAltContactNo?.message}>
                    <input
                      className="input"
                      {...phoneProps(register('newAltContactNo'))}
                      placeholder="+9715XXXXXXXX"
                    />
                  </Field>
                  <Field label="Email" error={errors.newEmail?.message}>
                    <input className="input" type="email" {...register('newEmail')} />
                  </Field>
                </>
              ) : customer ? (
                // The chosen customer's details, shown like the entry fields but read-only.
                <>
                  {(customer.kind === 'COMPANY'
                    ? [
                        // The chosen contact person's details.
                        ['Company name', customer.name],
                        ['Contact person', contact?.name],
                        ['Designation', contact?.designation],
                        ['Contact No.', contact?.contactNo],
                        ['Alternate No.', contact?.altContactNo],
                        ['Email', contact?.email],
                      ]
                    : [
                        ['Name', customer.contactName ?? customer.name],
                        ['Contact No.', customer.contactNo],
                        ['Alternate No.', customer.altContactNo],
                        ['Email', customer.email],
                      ]
                  ).map(([label, value]) => (
                    <Field key={label} label={label}>
                      <input
                        className="input"
                        value={value ?? ''}
                        placeholder="—"
                        readOnly
                        disabled
                      />
                    </Field>
                  ))}
                </>
              ) : (
                <p className="form-section-sub span-all">Select a customer to see their details.</p>
              )}
            </FormSection>

            <FormSection
              number={3}
              title="Service required"
              sub="The details change with the service group."
              columns={2}
              full
            >
              <div className="span-all">
                <div className="tabs group-tabs" role="tablist" aria-label="Service group">
                  {groups.map((group) => (
                    <button
                      key={group.value}
                      type="button"
                      role="tab"
                      aria-selected={groupId === group.value}
                      className={`tab${groupId === group.value ? ' is-active' : ''}`}
                      onClick={() => pickGroup(group.value)}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>
                {errors.serviceGroupId && (
                  <p className="field-error">{errors.serviceGroupId.message}</p>
                )}
              </div>

              <Field label="Title" required error={errors.title?.message} className="span-2">
                <input className="input" {...register('title')} />
              </Field>
              {rules.international && (
                <Field label="Service type" error={errors.internationalServiceTypeId?.message}>
                  {select(
                    'internationalServiceTypeId',
                    lookups.data.INTERNATIONAL_SERVICE_TYPE,
                    'Select service type',
                  )}
                </Field>
              )}
              <Field label="Organization" required error={errors.organizationId?.message}>
                {select('organizationId', organizationOptions, 'Select organization', {
                  required: true,
                  search: true,
                })}
              </Field>
              <Field label="Service" required error={errors.serviceTypeId?.message}>
                {select('serviceTypeId', services, 'Select service', {
                  required: true,
                  search: true,
                })}
              </Field>
              {rules.residence && (
                <Field label="Residence type" error={errors.residenceTypeId?.message}>
                  {select('residenceTypeId', lookups.data.RESIDENCE_TYPE, 'Select residence type')}
                </Field>
              )}
              <Field label="Move date" error={errors.moveDate?.message}>
                {datePicker('moveDate', 'Move date')}
              </Field>
              <Field label="Volume (CBM)" error={errors.volumeCbm?.message}>
                <input className="input" inputMode="decimal" {...register('volumeCbm')} />
              </Field>

              {rules.places && (
                <div className="span-all place-row">
                  {PLACES.map((place, index) => (
                    <PlaceFields
                      key={place}
                      place={place}
                      title={rules.places[index]}
                      control={control}
                      register={register}
                      errors={errors}
                      setValue={setValue}
                      watch={watch}
                      localCountryId={rules.international ? '' : officeCountryId}
                      defaultCityId={officeCityId}
                    />
                  ))}
                  <span className="place-arrow" aria-hidden="true">
                    <ArrowRight />
                  </span>
                </div>
              )}

              {rules.storage && (
                <>
                  <Field
                    label="Storage start date"
                    required
                    error={errors.storageStartDate?.message}
                  >
                    {datePicker('storageStartDate', 'Storage start date')}
                  </Field>
                  <Field label="Storage end date" error={errors.storageEndDate?.message}>
                    {datePicker('storageEndDate', 'Storage end date')}
                  </Field>
                  <Field label="Pick and pack" help="Turn on to collect the goods from an address.">
                    <label className="switch switch-form">
                      <input type="checkbox" role="switch" {...register('pickAndPack')} />
                      <span className="switch-track" aria-hidden="true" />
                      <span>We pick and pack the goods</span>
                    </label>
                  </Field>
                  {watch('pickAndPack') && (
                    <div className="span-all place-row is-single">
                      <PlaceFields
                        place="from"
                        title="Pick-up address"
                        control={control}
                        register={register}
                        errors={errors}
                        setValue={setValue}
                        watch={watch}
                        localCountryId={officeCountryId}
                        defaultCityId={officeCityId}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <Field label="Remarks" error={errors.remarks?.message} className="span-all">
                <textarea className="input" rows="3" {...register('remarks')} />
              </Field>
            </FormSection>

            <FormSection
              number={4}
              title="Survey"
              sub="Whether and how the move is surveyed."
              columns={2}
              full
            >
              <Field label="Survey" help="Turn on to book a survey date, time and type.">
                <label className="switch switch-form">
                  <input type="checkbox" role="switch" {...register('surveyRequired')} />
                  <span className="switch-track" aria-hidden="true" />
                  <span>Survey required</span>
                </label>
              </Field>
              {surveyRequired && (
                <>
                  {/* When first, then how (No survey, Photo, Teams, Zoom ...). */}
                  <Field
                    label="Survey date and time"
                    required
                    error={errors.surveyDate?.message ?? errors.surveyTime?.message}
                  >
                    <Controller
                      control={control}
                      name="surveyDate"
                      render={({ field }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          time={watch('surveyTime')}
                          onTimeChange={(value) =>
                            setValue('surveyTime', value, {
                              shouldDirty: true,
                              shouldValidate: Boolean(errors.surveyTime),
                            })
                          }
                          aria-label="Survey date and time"
                        />
                      )}
                    />
                  </Field>
                  <Field label="Survey type" required error={errors.surveyTypeId?.message}>
                    {select('surveyTypeId', lookups.data.SURVEY_TYPE, 'Select survey type', {
                      required: true,
                    })}
                  </Field>
                </>
              )}
            </FormSection>
          </fieldset>

          <FormBar
            cancelTo={LIST_PATH}
            submitLabel={editing ? 'Save request' : 'Create request'}
            changed={!closed && (!editing || isDirty)}
            note={closed ? 'This request was dropped and is read-only' : undefined}
            submitting={saving}
            extra={
              canStart && (
                <Button
                  variant="secondary"
                  loading={saving}
                  onClick={saveWith(surveyRequired ? 'START_SURVEY' : 'START_QUOTE')}
                >
                  {!saving && <ArrowRight />}
                  {surveyRequired ? 'Save & Start Survey' : 'Save & Start Quote'}
                </Button>
              )
            }
          />
        </form>
      )}
    </>
  );
}

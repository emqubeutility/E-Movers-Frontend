import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { Check, ClipboardList, FileText } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import DatePicker from '../components/ui/DatePicker.jsx';
import { EmptyState, ErrorAlert } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import Field from '../components/ui/Field.jsx';
import { FormBar, FormSection } from '../components/ui/FormKit.jsx';
import { Loader } from '../components/ui/Loader.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import ImageUpload from '../features/file/ImageUpload.jsx';
import { useOfficeExecutives } from '../features/service-request/hooks.js';
import Timeline from '../features/service-request/Timeline.jsx';
import SurveyStatusActions from '../features/survey/SurveyStatusActions.jsx';
import { useSaveSurvey, useSurvey, useSurveyLookups } from '../features/survey/hooks.js';
import { fromSurvey, surveySchema, toSurveyPayload } from '../features/survey/schemas.js';
import { useApiFormErrors } from '../hooks/useApiFormErrors.js';
import { ACTION, MENU } from '../lib/permissions.js';
import { CLOSED_STATUSES, toUnit } from '../lib/requestStatus.js';

const LIST_PATH = '/service-requests';
const SERVER_FIELDS = { surveyedAt: 'surveyedDate', estimatedVolumeCft: 'estimatedVolume' };

/** "2026-11-25" -> "25/11/2026". */
const dayText = (value) => (value ? value.split('-').reverse().join('/') : '—');
const placeText = (address) =>
  address
    ? [address.addressText, address.areaName, address.cityName].filter(Boolean).join(', ')
    : '—';

/** Read-only value shown like a disabled input. */
function Show({ label, value }) {
  return (
    <Field label={label}>
      <input className="input" value={value ?? ''} placeholder="—" readOnly disabled />
    </Field>
  );
}

export default function SurveyPage() {
  const { id } = useParams();
  const toast = useToast();
  const { can } = usePermissions();
  const query = useSurvey(id);
  const lookups = useSurveyLookups();
  const save = useSaveSurvey();
  const { fieldErrors, formError } = useApiFormErrors(save.error);
  const [uploadError, setUploadError] = useState(null);

  const data = query.data;
  const request = data?.request;
  const unit = data?.volumeUnit ?? 'CBM';
  const office = useOfficeExecutives(request ? String(request.organizationId) : '', true);
  const staff = (office.data?.executives ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const canEdit = can(MENU.SERVICE_REQUESTS, ACTION.EDIT);
  const closed = CLOSED_STATUSES.includes(request?.statusValue);

  // The form shows the loaded survey from its first render, and again after each save.
  const formValues = useMemo(() => (data ? fromSurvey(data) : undefined), [data]);
  const {
    control,
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(surveySchema), values: formValues });

  useEffect(() => {
    fieldErrors.forEach(({ field, message }) => {
      setError(SERVER_FIELDS[field] ?? field, { type: 'server', message });
    });
  }, [fieldErrors, setError]);

  async function submit(values) {
    try {
      await save.mutateAsync({ id, payload: toSurveyPayload(values, unit) });
      toast.success('Survey saved');
    } catch {
      // Shown on the form.
    }
  }

  const ready = query.isSuccess && lookups.isSuccess && Boolean(formValues);
  const insurance = watch('insuranceRequired');
  const residence = lookups.data?.RESIDENCE_TYPE.find(
    (item) => item.value === String(request?.residenceTypeId),
  )?.label;

  return (
    <>
      <Topbar
        title={`Survey · ${request?.requestNo ?? ''}`}
        breadcrumb={['Service requests']}
        back={LIST_PATH}
        actions={
          ready && (
            <>
              <Link to={`/service-requests/${id}/edit`} className="btn btn-ghost">
                <FileText />
                Request
              </Link>
              <Timeline requestId={id} />
              <SurveyStatusActions
                data={data}
                staff={staff}
                dropReasons={lookups.data.SURVEY_DROP_REASON}
                canEdit={canEdit}
              />
            </>
          )
        }
      />

      {query.isPending && <Loader label="Loading survey" />}
      <QueryError error={lookups.error} onRetry={() => lookups.refetch()} />
      {query.isError && (
        <div className="card card-lg">
          <EmptyState
            icon={ClipboardList}
            title="Survey not available"
            text={query.error.message}
            action={
              <Link to={LIST_PATH} className="btn btn-primary">
                Back to service requests
              </Link>
            }
          />
        </div>
      )}

      {ready && (
        <form className="form-layout" onSubmit={handleSubmit(submit)} noValidate>
          <fieldset className="form-main form-pairs fieldset-plain" disabled={closed || !canEdit}>
            <div className="span-pair">
              <ErrorAlert message={formError} />
              {closed && data.survey.dropReasonLabel && (
                <div className="alert alert-warning">
                  <div>
                    <strong>Survey dropped · {data.survey.dropReasonLabel}</strong>
                    <div>{data.survey.dropRemark}</div>
                  </div>
                </div>
              )}
            </div>

            <FormSection number={1} title="Customer" sub="From the service request." columns={2}>
              <Show label="Customer" value={request.customerName} />
              <Show label="Contact person" value={request.customerProfileName} />
              <Show label="Contact No." value={request.customerPhone} />
              <Show label="Moving from" value={placeText(request.fromAddress)} />
              <Show label="Moving to" value={placeText(request.toAddress)} />
            </FormSection>

            <FormSection number={2} title="Service" sub="From the service request." columns={2}>
              <Show
                label="Service"
                value={[request.serviceGroupLabel, request.serviceTypeName]
                  .filter(Boolean)
                  .join(' · ')}
              />
              <Show label="Move date" value={dayText(request.moveDate)} />
              <Show label="Residence type" value={residence} />
              <Show
                label="Planned survey"
                value={
                  request.surveyDate
                    ? `${dayText(request.surveyDate)} ${request.surveyTime ?? ''}`
                    : '—'
                }
              />
            </FormSection>

            <FormSection
              number={3}
              title="Survey"
              sub="Who handles it, who surveyed and when."
              columns={2}
            >
              <Field label="Executive" required error={errors.executiveId?.message}>
                <Controller
                  control={control}
                  name="executiveId"
                  render={({ field }) => (
                    <Dropdown
                      search
                      placeholder="Select executive"
                      options={staff}
                      value={field.value}
                      onChange={field.onChange}
                      aria-label="Executive"
                    />
                  )}
                />
              </Field>
              <Field label="Surveyed by" required error={errors.surveyedById?.message}>
                <Controller
                  control={control}
                  name="surveyedById"
                  render={({ field }) => (
                    <Dropdown
                      search
                      placeholder="Select surveyor"
                      options={staff}
                      value={field.value}
                      onChange={field.onChange}
                      aria-label="Surveyed by"
                    />
                  )}
                />
              </Field>
              <Field
                label="Survey date and time"
                error={errors.surveyedDate?.message ?? errors.surveyedTime?.message}
              >
                <Controller
                  control={control}
                  name="surveyedDate"
                  render={({ field }) => (
                    <Controller
                      control={control}
                      name="surveyedTime"
                      render={({ field: timeField }) => (
                        <DatePicker
                          value={field.value}
                          onChange={field.onChange}
                          time={timeField.value}
                          onTimeChange={timeField.onChange}
                          aria-label="Survey date and time"
                        />
                      )}
                    />
                  )}
                />
              </Field>
              <Field label="Scanned survey sheet" error={uploadError ?? errors.scanFileId?.message}>
                <Controller
                  control={control}
                  name="scanFileId"
                  render={({ field }) => (
                    <ImageUpload
                      value={field.value}
                      onChange={field.onChange}
                      folder="survey-sheets"
                      label="sheet"
                      onError={setUploadError}
                    />
                  )}
                />
              </Field>
            </FormSection>

            <FormSection number={4} title="Requirements" sub="What the move needs." columns={2}>
              <Field label="Time to complete (hours)" error={errors.timeToCompleteHours?.message}>
                <input className="input" inputMode="decimal" {...register('timeToCompleteHours')} />
              </Field>
              <Field label="Storage days" error={errors.storageDays?.message}>
                <input className="input" inputMode="numeric" {...register('storageDays')} />
              </Field>
              <Field label="No. of days" error={errors.noOfDays?.message}>
                <input className="input" inputMode="numeric" {...register('noOfDays')} />
              </Field>
              <Field label="People required" error={errors.peopleRequired?.message}>
                <input className="input" inputMode="numeric" {...register('peopleRequired')} />
              </Field>
              <Field
                label="People description"
                error={errors.peopleDescription?.message}
                className="span-all"
              >
                <input className="input" maxLength={500} {...register('peopleDescription')} />
              </Field>
              <Field
                label="Packing material remarks"
                error={errors.packingMaterialRemarks?.message}
                className="span-all"
              >
                <textarea
                  className="input"
                  rows="2"
                  maxLength={2000}
                  {...register('packingMaterialRemarks')}
                />
              </Field>
              <Field label="Insurance">
                <label className="switch switch-form">
                  <input type="checkbox" role="switch" {...register('insuranceRequired')} />
                  <span className="switch-track" aria-hidden="true" />
                  <span>Insurance required</span>
                </label>
              </Field>
              {insurance && (
                <Field label="Insurance value" required error={errors.insuranceValue?.message}>
                  <input className="input" inputMode="decimal" {...register('insuranceValue')} />
                </Field>
              )}
            </FormSection>

            <FormSection
              number={5}
              title="Survey sheet"
              sub="Rooms and items are added in the next step; the total then comes from them."
              columns={2}
            >
              <Show
                label={`Total survey volume (${unit})`}
                value={toUnit(data.survey.computedVolumeCft, unit) ?? 0}
              />
              <Field
                label={`My estimated volume (${unit})`}
                error={errors.estimatedVolume?.message}
              >
                <input className="input" inputMode="decimal" {...register('estimatedVolume')} />
              </Field>
            </FormSection>

            <FormSection
              number={6}
              title="Special requisites"
              sub="Tick what applies and add a note for each."
              columns={2}
              full
            >
              <Controller
                control={control}
                name="requisites"
                render={({ field }) => {
                  const picked = field.value ?? [];
                  const update = (next) => field.onChange(next);
                  return (
                    <div
                      className="requisite-grid span-all"
                      role="group"
                      aria-label="Special requisites"
                    >
                      {lookups.data.SPECIAL_REQUISITE.map((item) => {
                        const entry = picked.find((value) => value.id === item.value);
                        const index = picked.indexOf(entry);
                        return (
                          <div key={item.value} className="requisite">
                            <label className="check">
                              <input
                                type="checkbox"
                                checked={Boolean(entry)}
                                onChange={() =>
                                  update(
                                    entry
                                      ? picked.filter((value) => value.id !== item.value)
                                      : [...picked, { id: item.value, remark: '' }],
                                  )
                                }
                              />
                              <span className="box" aria-hidden="true">
                                <Check />
                              </span>
                              {item.label}
                            </label>
                            {/* A note for each ticked requisite, e.g. "2 safes, 1st floor". */}
                            {entry && (
                              <>
                                <textarea
                                  className="input"
                                  rows="3"
                                  maxLength={500}
                                  placeholder={`Notes about ${item.label.toLowerCase()}`}
                                  aria-label={`${item.label} notes`}
                                  value={entry.remark}
                                  onChange={(event) =>
                                    update(
                                      picked.map((value) =>
                                        value.id === item.value
                                          ? { ...value, remark: event.target.value }
                                          : value,
                                      ),
                                    )
                                  }
                                />
                                {errors.requisites?.[index]?.remark && (
                                  <p className="field-error">
                                    {errors.requisites[index].remark.message}
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                }}
              />
            </FormSection>

            <FormSection
              number={7}
              title="Quote notes"
              sub="For whoever prepares the quote."
              columns={2}
            >
              <Field label="Amount quoted to customer" error={errors.amountQuoted?.message}>
                <input className="input" inputMode="decimal" {...register('amountQuoted')} />
              </Field>
              <Field label="Remarks" error={errors.remarks?.message} className="span-all">
                <textarea className="input" rows="3" maxLength={2000} {...register('remarks')} />
              </Field>
              <Field
                label="Quote instructions"
                error={errors.quoteInstruction?.message}
                className="span-all"
              >
                <textarea
                  className="input"
                  rows="3"
                  maxLength={2000}
                  {...register('quoteInstruction')}
                />
              </Field>
            </FormSection>
          </fieldset>

          <FormBar
            cancelTo={LIST_PATH}
            submitLabel="Save survey"
            changed={!closed && canEdit && isDirty}
            note={closed ? 'This survey was dropped and is read-only' : undefined}
            submitting={save.isPending}
          />
        </form>
      )}
    </>
  );
}

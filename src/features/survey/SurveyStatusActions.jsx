import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker.jsx';
import Dropdown, { ActionMenu } from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useApiFormErrors } from '../../hooks/useApiFormErrors.js';
import { REQUEST_STATUS } from '../../lib/requestStatus.js';
import { useCompleteSurvey, useDropSurvey } from './hooks.js';

const { SURVEY_NEW, SURVEY_COMPLETED, SURVEY_DROPPED } = REQUEST_STATUS;
/** What each survey status (by parameter value) can move to. Survey Dropped is final. */
const NEXT = {
  [SURVEY_NEW]: [SURVEY_COMPLETED, SURVEY_DROPPED],
  [SURVEY_COMPLETED]: [SURVEY_DROPPED],
};
const LABEL = { [SURVEY_COMPLETED]: 'Completed', [SURVEY_DROPPED]: 'Dropped' };
const TONE = {
  [SURVEY_NEW]: 'is-assigned',
  [SURVEY_COMPLETED]: 'is-contacted',
  [SURVEY_DROPPED]: 'is-dropped',
};

const pad = (value) => String(value).padStart(2, '0');
const dayOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const timeOf = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Status button of the survey page, with the Completed and Dropped side panels. */
export default function SurveyStatusActions({ data, staff, dropReasons, canEdit }) {
  const [open, setOpen] = useState(null);
  const { request } = data;
  const tone = TONE[request.statusValue] ?? '';
  const next = canEdit ? (NEXT[request.statusValue] ?? []) : [];

  return (
    <>
      {next.length > 0 ? (
        <ActionMenu
          label="Change status"
          items={next.map((target) => ({
            label: LABEL[target],
            danger: target === SURVEY_DROPPED,
            onClick: () => setOpen(target),
          }))}
          trigger={(props) => (
            <button type="button" className={`btn status-btn ${tone}`} {...props}>
              {request.statusLabel}
              <ChevronDown />
            </button>
          )}
        />
      ) : (
        <span className={`btn status-btn ${tone}`} aria-label="Status">
          {request.statusLabel}
        </span>
      )}
      {open === SURVEY_COMPLETED && (
        <CompletePanel data={data} staff={staff} onClose={() => setOpen(null)} />
      )}
      {open === SURVEY_DROPPED && (
        <DropPanel requestId={request.id} reasons={dropReasons} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Foot({ onClose, busy, label, danger }) {
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button
        type="submit"
        form="survey-status-form"
        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        disabled={busy}
      >
        {busy ? 'Saving…' : label}
      </button>
    </>
  );
}

function CompletePanel({ data, staff, onClose }) {
  const toast = useToast();
  const mutation = useCompleteSurvey();
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);
  const { request, survey } = data;
  // Starts on what the survey already says, else the planned survey time.
  const start = survey.surveyedAt
    ? new Date(survey.surveyedAt)
    : request.surveyDate
      ? new Date(`${request.surveyDate}T${request.surveyTime ?? '09:00'}`)
      : new Date();
  const [by, setBy] = useState(survey.surveyedById ?? '');
  const [date, setDate] = useState(dayOf(start));
  const [time, setTime] = useState(timeOf(start));
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});
  const serverError = (field) => fieldErrors.find((item) => item.field === field)?.message;

  async function save(event) {
    event.preventDefault();
    const found = {};
    if (!by) found.by = 'Select who did the survey';
    if (!date || !time) found.at = 'Enter the survey date and time';
    else if (new Date(`${date}T${time}`) > new Date())
      found.at = 'The survey cannot be in the future';
    else if (request.moveDate && date > request.moveDate)
      found.at = 'The survey date cannot be after the move date';
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await mutation.mutateAsync({
        id: request.id,
        payload: {
          surveyedById: by,
          surveyedAt: new Date(`${date}T${time}`).toISOString(),
          remarks: remarks.trim() || undefined,
        },
      });
      toast.success('Survey completed');
      onClose();
    } catch {
      // Shown in the panel.
    }
  }

  return (
    <Modal
      open
      side
      title="Survey completed"
      onClose={onClose}
      locked={mutation.isPending}
      footer={<Foot onClose={onClose} busy={mutation.isPending} label="Complete" />}
    >
      <form id="survey-status-form" className="stack" onSubmit={save} noValidate>
        {formError && <p className="field-error">{formError}</p>}
        <Field label="Surveyed by" required error={errors.by ?? serverError('surveyedById')}>
          <Dropdown
            search
            placeholder="Select surveyor"
            options={staff}
            value={by}
            onChange={setBy}
            aria-label="Surveyed by"
          />
        </Field>
        <Field label="Survey date and time" required error={errors.at ?? serverError('surveyedAt')}>
          <DatePicker
            value={date}
            onChange={setDate}
            time={time}
            onTimeChange={setTime}
            aria-label="Survey date and time"
          />
        </Field>
        <Field label="Remarks" help="Up to 2000 characters.">
          <textarea
            className="input"
            rows="5"
            maxLength={2000}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}

function DropPanel({ requestId, reasons, onClose }) {
  const toast = useToast();
  const mutation = useDropSurvey();
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);
  const [reason, setReason] = useState('');
  const [remark, setRemark] = useState('');
  const [errors, setErrors] = useState({});
  const serverError = (field) => fieldErrors.find((item) => item.field === field)?.message;

  async function save(event) {
    event.preventDefault();
    const found = {};
    if (!reason) found.reason = 'Select the drop reason';
    if (!remark.trim()) found.remark = 'Enter the remarks';
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await mutation.mutateAsync({
        id: requestId,
        payload: { dropReasonId: Number(reason), dropRemark: remark.trim() },
      });
      toast.success('Survey dropped');
      onClose();
    } catch {
      // Shown in the panel.
    }
  }

  return (
    <Modal
      open
      side
      title="Drop survey"
      onClose={onClose}
      locked={mutation.isPending}
      footer={<Foot onClose={onClose} busy={mutation.isPending} label="Drop" danger />}
    >
      <form id="survey-status-form" className="stack" onSubmit={save} noValidate>
        <p className="muted">A dropped survey is closed and can no longer be changed.</p>
        {formError && <p className="field-error">{formError}</p>}
        <Field
          label="Survey drop reason"
          required
          error={errors.reason ?? serverError('dropReasonId')}
        >
          <Dropdown
            placeholder="Select reason"
            options={reasons}
            value={reason}
            onChange={setReason}
            aria-label="Survey drop reason"
          />
        </Field>
        <Field
          label="Remarks"
          required
          help="Up to 2000 characters."
          error={errors.remark ?? serverError('dropRemark')}
        >
          <textarea
            className="input"
            rows="5"
            maxLength={2000}
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}

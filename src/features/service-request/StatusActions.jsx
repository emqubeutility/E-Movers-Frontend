import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker.jsx';
import Dropdown, { ActionMenu } from '../../components/ui/Dropdown.jsx';
import Field from '../../components/ui/Field.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useApiFormErrors } from '../../hooks/useApiFormErrors.js';
import { REQUEST_STATUS } from '../../lib/requestStatus.js';
import { useDropRequest, useMarkContacted } from './hooks.js';

const pad = (value) => String(value).padStart(2, '0');
const todayText = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const nowTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const { ASSIGNED, CONTACTED, DROPPED, ENQUIRY_SCHEDULED } = REQUEST_STATUS;
/** What each status (by parameter value) can move to. Dropped is final. */
const NEXT = {
  [ASSIGNED]: [CONTACTED, DROPPED],
  [ENQUIRY_SCHEDULED]: [CONTACTED, DROPPED],
  [CONTACTED]: [DROPPED],
};
const LABEL = { [CONTACTED]: 'Contacted', [DROPPED]: 'Dropped' };
const TONE = {
  [ASSIGNED]: 'is-assigned',
  [ENQUIRY_SCHEDULED]: 'is-assigned',
  [CONTACTED]: 'is-contacted',
  [DROPPED]: 'is-dropped',
};

/**
 * The status button of a saved request: shows the status and offers the next steps
 * (Contacted, Dropped), each in a side panel.
 */
export default function StatusActions({ request, executives, dropReasons, role, canEdit }) {
  const [open, setOpen] = useState(null);
  const tone = TONE[request.statusValue] ?? '';
  const next = canEdit ? (NEXT[request.statusValue] ?? []) : [];

  return (
    <>
      <ActionMenu
        label="Change status"
        items={next.map((target) => ({
          label: LABEL[target],
          danger: target === DROPPED,
          onClick: () => setOpen(target),
        }))}
        trigger={(props) => (
          <button
            type="button"
            className={`btn status-btn ${tone}`}
            disabled={next.length === 0}
            title={next.length ? 'Change status' : undefined}
            {...props}
          >
            {request.statusLabel}
            {next.length > 0 && <ChevronDown />}
          </button>
        )}
      />
      {/* ActionMenu renders nothing when there are no steps, so show the status alone. */}
      {next.length === 0 && (
        <span className={`btn status-btn ${tone}`} aria-label="Status">
          {request.statusLabel}
        </span>
      )}
      {open === CONTACTED && (
        <ContactedPanel
          request={request}
          executives={executives}
          role={role}
          onClose={() => setOpen(null)}
        />
      )}
      {open === DROPPED && (
        <DropPanel request={request} reasons={dropReasons} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function PanelFoot({ onClose, busy, label, danger }) {
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button
        type="submit"
        form="status-form"
        className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
        disabled={busy}
      >
        {busy ? 'Saving…' : label}
      </button>
    </>
  );
}

function ContactedPanel({ request, executives, role, onClose }) {
  const toast = useToast();
  const mutation = useMarkContacted();
  const { fieldErrors, formError } = useApiFormErrors(mutation.error);
  const isExecutive = role === 'EXECUTIVE';
  const now = new Date();
  const [by, setBy] = useState(request.executiveId ?? '');
  const [date, setDate] = useState(todayText(now));
  const [time, setTime] = useState(nowTime(now));
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState({});
  const serverError = (field) => fieldErrors.find((item) => item.field === field)?.message;

  function check() {
    const found = {};
    if (!isExecutive && !by) found.by = 'Select who contacted the customer';
    if (!date || !time) found.at = 'Enter the contacted date and time';
    else if (new Date(`${date}T${time}`) > new Date()) found.at = 'This cannot be in the future';
    else if (request.moveDate && date > request.moveDate)
      found.at = 'The contacted date cannot be after the move date';
    else if (request.surveyRequired && request.surveyDate && request.surveyDate < date)
      found.at = 'The survey date cannot be before the contacted date';
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  async function save(event) {
    event.preventDefault();
    if (!check()) return;
    try {
      await mutation.mutateAsync({
        id: request.id,
        payload: {
          contactedById: isExecutive ? undefined : by,
          contactedAt: new Date(`${date}T${time}`).toISOString(),
          remarks: remarks.trim() || undefined,
        },
      });
      toast.success('Marked as contacted');
      onClose();
    } catch {
      // Shown in the panel.
    }
  }

  return (
    <Modal
      open
      side
      title="Contacted"
      onClose={onClose}
      locked={mutation.isPending}
      footer={<PanelFoot onClose={onClose} busy={mutation.isPending} label="Save" />}
    >
      <form id="status-form" className="stack" onSubmit={save} noValidate>
        {formError && <p className="field-error">{formError}</p>}
        <Field label="Contacted by" required error={errors.by ?? serverError('contactedById')}>
          {isExecutive ? (
            <input className="input" value="You" readOnly disabled />
          ) : (
            <Dropdown
              search
              placeholder="Select executive"
              options={executives.map((item) => ({ value: item.id, label: item.name }))}
              value={by}
              onChange={setBy}
              aria-label="Contacted by"
            />
          )}
        </Field>
        <Field
          label="Contacted date and time"
          required
          error={errors.at ?? serverError('contactedAt')}
        >
          <DatePicker
            value={date}
            onChange={setDate}
            time={time}
            onTimeChange={setTime}
            aria-label="Contacted date and time"
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

function DropPanel({ request, reasons, onClose }) {
  const toast = useToast();
  const mutation = useDropRequest();
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
        id: request.id,
        payload: { dropReasonId: Number(reason), dropRemark: remark.trim() },
      });
      toast.success('Request dropped');
      onClose();
    } catch {
      // Shown in the panel.
    }
  }

  return (
    <Modal
      open
      side
      title="Drop enquiry"
      onClose={onClose}
      locked={mutation.isPending}
      footer={<PanelFoot onClose={onClose} busy={mutation.isPending} label="Drop" danger />}
    >
      <form id="status-form" className="stack" onSubmit={save} noValidate>
        <p className="muted">A dropped request is closed and can no longer be changed.</p>
        {formError && <p className="field-error">{formError}</p>}
        <Field label="Drop reason" required error={errors.reason ?? serverError('dropReasonId')}>
          <Dropdown
            placeholder="Select reason"
            options={reasons}
            value={reason}
            onChange={setReason}
            aria-label="Drop reason"
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

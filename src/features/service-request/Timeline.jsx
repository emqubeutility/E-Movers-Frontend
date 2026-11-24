import { useState } from 'react';
import { ClipboardCheck, History, PencilLine, PhoneCall, Plus, XCircle } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import { Loader } from '../../components/ui/Loader.jsx';
import { QueryError } from '../../components/ui/QueryState.jsx';
import { useRequestLogs } from './hooks.js';

const KIND = {
  CREATED: { title: 'Enquiry created', icon: Plus, tone: 'is-created' },
  UPDATED: { title: 'Enquiry updated', icon: PencilLine, tone: 'is-updated' },
  CONTACTED: { title: 'Customer contacted', icon: PhoneCall, tone: 'is-contacted' },
  DROPPED: { title: 'Enquiry dropped', icon: XCircle, tone: 'is-dropped' },
  SURVEY_UPDATED: { title: 'Survey updated', icon: PencilLine, tone: 'is-updated' },
  SURVEY_COMPLETED: { title: 'Survey completed', icon: ClipboardCheck, tone: 'is-contacted' },
  SURVEY_DROPPED: { title: 'Survey dropped', icon: XCircle, tone: 'is-dropped' },
};
// Entries whose remarks list the changed fields, one per line.
const CHANGE_LISTS = ['UPDATED', 'SURVEY_UPDATED'];

const pad = (value) => String(value).padStart(2, '0');
/** "24/11/2026 03:40 PM". */
function stamp(value) {
  const date = new Date(value);
  const hour = date.getHours() % 12 || 12;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(hour)}:${pad(date.getMinutes())} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}

/** "Timeline" button: opens the request's history in a side panel. */
export default function Timeline({ requestId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        <History />
        Timeline
      </button>
      {open && <TimelinePanel requestId={requestId} onClose={() => setOpen(false)} />}
    </>
  );
}

function TimelinePanel({ requestId, onClose }) {
  const logs = useRequestLogs(requestId, true);
  const items = logs.data ?? [];

  return (
    <Modal open side title="Timeline" onClose={onClose}>
      {logs.isPending && <Loader label="Loading timeline" />}
      <QueryError error={logs.error} onRetry={() => logs.refetch()} />
      {logs.isSuccess && items.length === 0 && <p className="muted">Nothing recorded yet.</p>}
      <ol className="timeline">
        {items.map((item) => {
          const kind = KIND[item.action] ?? { title: item.action, icon: History, tone: '' };
          const statusChanged =
            item.fromStatus && item.toStatus && item.fromStatus !== item.toStatus;
          // An update lists its changes one per line ("Title: Old → New").
          const isChangeList = CHANGE_LISTS.includes(item.action);
          const changes = isChangeList && item.remarks ? item.remarks.split('\n') : [];
          const note = isChangeList ? null : item.remarks;
          return (
            <li key={item.id} className={`tl-item ${kind.tone}`}>
              <span className="tl-dot" aria-hidden="true">
                <kind.icon />
              </span>
              <div className="tl-body">
                <div className="tl-head">
                  <strong>{kind.title}</strong>
                  {/* A contact shows when the customer was actually called. */}
                  <time className="muted small" dateTime={item.contactedAt ?? item.at}>
                    {stamp(item.contactedAt ?? item.at)}
                  </time>
                </div>
                <div className="muted small">by {item.byName ?? 'System'}</div>
                {statusChanged && (
                  <div className="tl-status">
                    {item.fromStatus} → <strong>{item.toStatus}</strong>
                  </div>
                )}
                {item.toStatus && !item.fromStatus && (
                  <div className="tl-status">
                    Status: <strong>{item.toStatus}</strong>
                  </div>
                )}
                {item.details.map((line) => (
                  <div key={line} className="tl-line">
                    {line}
                  </div>
                ))}
                {changes.length > 0 && (
                  <ul className="tl-changes">
                    {changes.map((line, index) => {
                      const [field, ...rest] = line.split(': ');
                      return (
                        <li key={`${index}-${field}`}>
                          <span className="muted">{field}</span>
                          <span>{rest.join(': ')}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {note && <p className="tl-note">{note}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </Modal>
  );
}

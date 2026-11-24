import { Check, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from './Button.jsx';

/** A numbered section card: heading, optional subtitle, and a two-column field grid. */
/** `columns` (1 or 2) fixes the field columns inside the card; `full` makes it span a two-card row. */
export function FormSection({ number, title, sub, children, columns, full = false, action }) {
  return (
    <section className={`card card-lg form-card${full ? ' is-full' : ''}`}>
      <div className="fc-head">
        <span className="fc-num">{number}</span>
        <div>
          <div className="form-section-title">{title}</div>
          {sub && <div className="form-section-sub">{sub}</div>}
        </div>
        {action && <div className="fc-action">{action}</div>}
      </div>
      <div className={`form-grid${columns ? ` cols-${columns}` : ''}`}>{children}</div>
    </section>
  );
}

/** The sticky action bar at the bottom of every form. */
export function FormBar({
  cancelTo,
  submitLabel,
  submitting = false,
  disabled = false,
  changed = true,
  note = 'Fields marked * are required',
  extra,
}) {
  return (
    <div className="form-bar">
      <span className="form-bar-note">
        <Info />
        {note}
      </span>
      <div className="row" style={{ gap: 8 }}>
        {cancelTo && (
          <Link to={cancelTo} className="btn btn-ghost">
            Cancel
          </Link>
        )}
        {/* Further actions, e.g. "Save & Start Survey" (always shown). */}
        {extra}
        {/* On edit pages the save button appears only once something has changed. */}
        {changed && (
          <Button type="submit" loading={submitting} disabled={submitting || disabled}>
            {!submitting && <Check />}
            {submitting ? 'Saving…' : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

import { statusOf } from '../../lib/constants.js';
import { initials } from '../../lib/format.js';

const TONE_CLASS = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  brand: 'badge-brand',
};

export function Badge({ tone, dot = true, children }) {
  return (
    <span className={['badge', TONE_CLASS[tone], !dot && 'no-dot'].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const meta = statusOf(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function Avatar({ name, size }) {
  const sizeClass = size === 'sm' ? ' avatar-sm' : size === 'lg' ? ' avatar-lg' : '';
  return (
    <span className={`avatar${sizeClass}`} aria-hidden="true" title={name}>
      {initials(name)}
    </span>
  );
}

/** Small avatar, bold name and a muted second line; used in tables. */
export function UserCell({ name, sub, children }) {
  return (
    <div className="cell-user">
      <Avatar name={name} size="sm" />
      <div className="grow">
        <div className="cell-title cell-trunc">{children || name}</div>
        {sub && <div className="cell-sub cell-trunc">{sub}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty" role="status">
      {Icon && (
        <span className="empty-ico">
          <Icon />
        </span>
      )}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Renders nothing without a message, so it can stay in the page permanently. */
export function ErrorAlert({ message, children }) {
  if (!message) return null;
  return (
    <div className="alert alert-danger" role="alert">
      <div className="grow">{message}</div>
      {children}
    </div>
  );
}

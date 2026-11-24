import { ErrorAlert } from './Display.jsx';

/**
 * The "request failed, retry" block every query-backed page shows. One component keeps the
 * wording and spacing identical instead of repeating the alert and the retry button per page.
 */
export function QueryError({ error, onRetry, inset = false }) {
  if (!error) return null;
  return (
    <div style={inset ? { padding: '0 20px 16px' } : undefined}>
      <ErrorAlert message={error.message}>
        <button type="button" className="link-btn" onClick={onRetry}>
          Try again
        </button>
      </ErrorAlert>
    </div>
  );
}

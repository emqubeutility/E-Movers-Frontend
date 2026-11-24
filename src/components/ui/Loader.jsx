export function Spinner({ label }) {
  return (
    <span
      className="spinner"
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

export function Loader({ label = 'Loading' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function FullPageLoader({ label = 'Loading' }) {
  return (
    <div className="loader is-page" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function TableLoading({ colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <Loader label="Loading rows" />
      </td>
    </tr>
  );
}

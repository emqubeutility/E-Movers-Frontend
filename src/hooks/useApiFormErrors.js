import { useMemo } from 'react';

/**
 * Turns an `ApiError` into what a form needs, with a stable array identity so a
 * `useEffect` that applies the errors to react-hook-form does not loop.
 */
export function useApiFormErrors(error) {
  const fieldErrors = useMemo(() => error?.fieldErrors ?? [], [error]);
  const formError = error && fieldErrors.length === 0 ? error.message : undefined;
  return { fieldErrors, formError };
}

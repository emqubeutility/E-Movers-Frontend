import { useEffect } from 'react';

/**
 * Keeps the pager inside the result set. Deleting the last row of the last page (or narrowing a
 * filter) would otherwise leave the table on a page that no longer exists and show it as empty.
 */
export function usePageClamp(page, setPage, total, pageSize) {
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [page, setPage, total, pageSize]);
}

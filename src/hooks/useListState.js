import { useCallback, useMemo, useState } from 'react';
import { useDebounce } from './useDebounce.js';

export const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;
const NO_FILTERS = Object.freeze({});
const NO_SORT = Object.freeze({ sortBy: 'createdAt', sortOrder: 'desc' });

/**
 * Search, filters, sort and paging for a list page.
 *
 * Every list in the application follows the same rules, so they live here instead of being
 * copied into each page: any change that alters the result set starts again from page 1, and
 * the search box is debounced before it reaches the API.
 */
export function useListState({
  filters: initialFilters = NO_FILTERS,
  sort: initialSort = NO_SORT,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
} = {}) {
  const [search, setSearchValue] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSortValue] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeValue] = useState(initialPageSize);
  const debouncedSearch = useDebounce(search, SEARCH_DELAY_MS);

  const setSearch = useCallback((value) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }, []);

  const setSort = useCallback((next) => {
    setSortValue(next);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchValue('');
    setPage(1);
  }, [initialFilters]);

  const setPageSize = useCallback((size) => {
    setPageSizeValue(size);
    setPage(1);
  }, []);

  const query = useMemo(() => {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );
    return {
      ...(debouncedSearch && { search: debouncedSearch }),
      ...activeFilters,
      ...sort,
      page,
      limit: pageSize,
    };
  }, [debouncedSearch, filters, sort, page, pageSize]);

  // Only empty-string filters count as "off"; boolean filters are handled by the caller.
  const hasFilters =
    Boolean(debouncedSearch) || Object.values(filters).some((value) => value !== '');

  return {
    search,
    setSearch,
    debouncedSearch,
    filters,
    setFilter,
    clearFilters,
    sort,
    setSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    query,
    hasFilters,
  };
}

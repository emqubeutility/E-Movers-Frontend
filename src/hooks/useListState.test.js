import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useListState } from './useListState.js';
import { usePageClamp } from './usePageClamp.js';

describe('useListState', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts again from page 1 when a filter changes', () => {
    const { result } = renderHook(() => useListState({ filters: { role: '' } }));

    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);

    act(() => result.current.setFilter('role', 'ADMIN'));
    expect(result.current.page).toBe(1);
    expect(result.current.filters).toEqual({ role: 'ADMIN' });
    expect(result.current.hasFilters).toBe(true);
  });

  it('debounces the search text before it reaches the query', () => {
    const { result } = renderHook(() => useListState());

    act(() => result.current.setSearch('mia'));
    expect(result.current.search).toBe('mia');
    expect(result.current.query.search).toBeUndefined();

    act(() => vi.advanceTimersByTime(300));
    expect(result.current.query.search).toBe('mia');
  });

  it('omits empty filters and search from the API query', () => {
    const { result } = renderHook(() => useListState({ filters: { status: '', kind: '' } }));
    expect(result.current.query).not.toHaveProperty('status');
    expect(result.current.query).not.toHaveProperty('kind');
    expect(result.current.query).not.toHaveProperty('search');
  });

  it('clears the search and the filters together', () => {
    const { result } = renderHook(() => useListState({ filters: { status: '' } }));

    act(() => result.current.setSearch('mia'));
    act(() => result.current.setFilter('status', 'ACTIVE'));
    act(() => result.current.clearFilters());

    expect(result.current.search).toBe('');
    expect(result.current.filters).toEqual({ status: '' });
    expect(result.current.hasFilters).toBe(false);
  });

  it('puts paging and sorting in the query', () => {
    const { result } = renderHook(() => useListState());

    act(() => result.current.setSort({ sortBy: 'email', sortOrder: 'asc' }));
    act(() => result.current.setPage(2));

    expect(result.current.query).toMatchObject({
      page: 2,
      limit: 10,
      sortBy: 'email',
      sortOrder: 'asc',
    });
  });
});

describe('usePageClamp', () => {
  it('moves back to the last page when the result set shrinks', () => {
    const setPage = vi.fn();
    const { rerender } = renderHook(({ total }) => usePageClamp(3, setPage, total, 10), {
      initialProps: { total: 25 },
    });
    expect(setPage).not.toHaveBeenCalled();

    rerender({ total: 5 });
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it('does nothing while the page still exists', () => {
    const setPage = vi.fn();
    renderHook(() => usePageClamp(1, setPage, 30, 10));
    expect(setPage).not.toHaveBeenCalled();
  });
});

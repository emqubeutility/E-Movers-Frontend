import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pager, TableFoot, pageItems } from './Pager.jsx';

describe('pageItems', () => {
  it('lists every page when there are few', () => {
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('collapses long ranges around the current page', () => {
    expect(pageItems(5, 12)).toEqual([1, 'gap-start', 4, 5, 6, 'gap-end', 12]);
    expect(pageItems(1, 12)).toEqual([1, 2, 'gap-end', 12]);
  });
});

describe('Pager', () => {
  it('marks the current page and disables Previous on the first page', () => {
    render(<Pager page={1} totalPages={3} onPage={() => {}} />);

    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('requests the next page', async () => {
    const onPage = vi.fn();
    render(<Pager page={2} totalPages={3} onPage={onPage} />);

    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPage).toHaveBeenCalledWith(3);
  });
});

describe('TableFoot', () => {
  it('shows the visible range', () => {
    render(<TableFoot page={2} pageSize={10} total={26} onPage={() => {}} onPageSize={() => {}} />);
    expect(screen.getByText(/Showing/)).toHaveTextContent('Showing 11–20 of 26');
  });
});

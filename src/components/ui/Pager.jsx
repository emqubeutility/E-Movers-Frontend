import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZES } from '../../lib/constants.js';
import Dropdown from './Dropdown.jsx';

/** Page numbers collapse as 1 … 4 5 6 … 12. */
export function pageItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const middle = [page - 1, page, page + 1].filter((value) => value > 1 && value < totalPages);
  const items = [1];
  if (middle[0] > 2) items.push('gap-start');
  items.push(...middle);
  if (middle[middle.length - 1] < totalPages - 1) items.push('gap-end');
  items.push(totalPages);
  return items;
}

export function Pager({ page, totalPages, onPage }) {
  return (
    <nav className="pager" aria-label="Pagination">
      <button
        type="button"
        aria-label="Previous page"
        title="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft />
      </button>
      {pageItems(page, totalPages).map((item) =>
        typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            className={item === page ? 'is-active' : undefined}
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            onClick={() => onPage(item)}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="gap" aria-hidden="true">
            …
          </span>
        ),
      )}
      <button
        type="button"
        aria-label="Next page"
        title="Next page"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight />
      </button>
    </nav>
  );
}

const SIZE_OPTIONS = PAGE_SIZES.map((size) => ({ value: size, label: String(size) }));

export function TableFoot({ page, pageSize, total, onPage, onPageSize }) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="table-foot">
      <span aria-live="polite">
        Showing{' '}
        <b>
          {first}–{last}
        </b>{' '}
        of <b>{total}</b>
      </span>
      <span className="row" style={{ gap: 8 }}>
        Rows
        <Dropdown
          size="sm"
          aria-label="Rows per page"
          options={SIZE_OPTIONS}
          value={pageSize}
          onChange={onPageSize}
        />
      </span>
      <Pager page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  );
}

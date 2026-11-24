import { ArrowDown, ArrowUp, ArrowUpDown, LayoutGrid, List, Table2, X } from 'lucide-react';

const VIEWS = [
  { value: 'table', label: 'Table', icon: Table2 },
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
];

export function ViewSwitch({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="View">
      {VIEWS.map((view) => (
        <button
          key={view.value}
          type="button"
          className={view.value === value ? 'is-active' : undefined}
          aria-pressed={view.value === value}
          onClick={() => onChange(view.value)}
        >
          <view.icon />
          {view.label}
        </button>
      ))}
    </div>
  );
}

/** chips: [{ key, label, value, onRemove }] */
export function ActiveFilters({ chips, onClearAll }) {
  if (chips.length === 0) return null;
  return (
    <div className="active-filters">
      {chips.map((chip) => (
        <span key={chip.key} className="chip">
          {chip.label}: <b>{chip.value}</b>
          <button
            type="button"
            className="chip-x"
            aria-label={`Remove filter ${chip.label}`}
            onClick={chip.onRemove}
          >
            <X />
          </button>
        </span>
      ))}
      <button type="button" className="link-btn small" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  );
}

/** Sortable column header: a real button so it works from the keyboard. */
export function SortHeader({ column, label, sort, onSort }) {
  const active = sort.sortBy === column;
  const Icon = !active ? ArrowUpDown : sort.sortOrder === 'asc' ? ArrowUp : ArrowDown;
  const nextOrder = active && sort.sortOrder === 'asc' ? 'desc' : 'asc';
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        className={`th-sort${active ? ' is-sorted' : ''}`}
        onClick={() => onSort({ sortBy: column, sortOrder: nextOrder })}
      >
        {label}
        <Icon />
      </button>
    </th>
  );
}

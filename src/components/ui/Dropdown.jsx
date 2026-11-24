import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, EllipsisVertical, Search } from 'lucide-react';
import { usePopover } from '../../hooks/usePopover.js';

/**
 * Custom dropdown (never a native <select>).
 * options: [{ value, label }]
 */
export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select',
  search = false,
  clearable = false,
  pill = false,
  size,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const popover = usePopover({ matchWidth: true });
  const [term, setTerm] = useState('');
  const searchRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return needle
      ? options.filter((option) => option.label.toLowerCase().includes(needle))
      : options;
  }, [options, term]);

  useEffect(() => {
    if (!popover.open) {
      setTerm('');
      return undefined;
    }
    // The menu is positioned after it mounts, so focus again on the next frame.
    searchRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [popover.open]);

  function choose(next) {
    onChange(next);
    popover.close();
    popover.anchorRef.current?.focus();
  }

  const classes = [
    'dropdown',
    popover.open && 'is-open',
    pill && 'is-pill',
    size === 'sm' && 'is-sm',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <button
        ref={popover.anchorRef}
        id={id}
        type="button"
        className="dropdown-toggle"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={popover.open}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => popover.setOpen((open) => !open)}
      >
        <span className={`value${selected ? '' : ' placeholder'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="caret" aria-hidden="true">
          <ChevronDown />
        </span>
      </button>

      {popover.open &&
        createPortal(
          <div ref={popover.menuRef} className="menu" style={popover.style}>
            {search && (
              <div className="menu-search input-group">
                <Search />
                <input
                  ref={searchRef}
                  autoFocus
                  className="input"
                  placeholder="Search"
                  aria-label="Search options"
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                />
              </div>
            )}
            <div className="menu-list" role="listbox" aria-label={ariaLabel || placeholder}>
              {clearable && selected && (
                <button type="button" className="menu-item muted" onClick={() => choose('')}>
                  Clear selection
                </button>
              )}
              {visible.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`menu-item${option.value === value ? ' is-selected' : ''}`}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                  {option.value === value && (
                    <span className="tick" aria-hidden="true">
                      <Check />
                    </span>
                  )}
                </button>
              ))}
              {visible.length === 0 && <div className="menu-empty">No options</div>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * The "⋯" menu. items: [{ label, icon, onClick, danger, divider, hidden }]
 */
export function ActionMenu({ items, label = 'Actions', trigger }) {
  const popover = usePopover({ align: trigger ? 'start' : 'start' });
  const shown = items.filter((item) => !item.hidden);
  if (shown.length === 0) return null;

  function run(item) {
    popover.close();
    item.onClick?.();
  }

  return (
    <>
      {trigger ? (
        trigger({
          ref: popover.anchorRef,
          onClick: () => popover.setOpen((open) => !open),
          'aria-expanded': popover.open,
          'aria-haspopup': 'menu',
        })
      ) : (
        <button
          ref={popover.anchorRef}
          type="button"
          className="icon-btn"
          aria-label={label}
          title={label}
          aria-haspopup="menu"
          aria-expanded={popover.open}
          onClick={() => popover.setOpen((open) => !open)}
        >
          <EllipsisVertical />
        </button>
      )}
      {popover.open &&
        createPortal(
          <div ref={popover.menuRef} className="menu" role="menu" style={popover.style}>
            {shown.map((item, index) =>
              item.divider ? (
                <div key={`divider-${index}`} className="menu-divider" role="separator" />
              ) : item.head ? (
                <div key={`head-${index}`} className="menu-head">
                  {item.head}
                </div>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`menu-item${item.danger ? ' is-danger' : ''}`}
                  onClick={() => run(item)}
                >
                  {item.icon && <item.icon />}
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { usePopover } from '../../hooks/usePopover.js';

const SHOWN_CHIPS = 3;

/**
 * Dropdown that lets several options be ticked; the list stays open while you pick.
 * options: [{ value, label }]; value: the ticked values, in the order they were picked.
 */
export default function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Select',
  search = true,
  disabled = false,
  id,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const popover = usePopover({ matchWidth: true });
  const [term, setTerm] = useState('');
  const searchRef = useRef(null);

  const chosen = value
    .map((entry) => options.find((option) => option.value === entry))
    .filter(Boolean);
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
    searchRef.current?.focus({ preventScroll: true });
    const frame = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [popover.open]);

  const toggle = (entry) =>
    onChange(value.includes(entry) ? value.filter((item) => item !== entry) : [...value, entry]);

  return (
    <div className={`dropdown multi${popover.open ? ' is-open' : ''}`}>
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
        <span className={`value${chosen.length ? ' ms-chips' : ' placeholder'}`}>
          {chosen.length === 0 && placeholder}
          {chosen.slice(0, SHOWN_CHIPS).map((option) => (
            <span key={option.value} className="ms-chip">
              {option.label}
              {!disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  className="ms-chip-x"
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggle(option.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      toggle(option.value);
                    }
                  }}
                >
                  <X />
                </span>
              )}
            </span>
          ))}
          {chosen.length > SHOWN_CHIPS && (
            <span className="ms-more">+{chosen.length - SHOWN_CHIPS}</span>
          )}
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
            <div
              className="menu-list"
              role="listbox"
              aria-multiselectable="true"
              aria-label={ariaLabel || placeholder}
            >
              {value.length > 0 && (
                <button type="button" className="menu-item muted" onClick={() => onChange([])}>
                  Clear all ({value.length})
                </button>
              )}
              {visible.map((option) => {
                const on = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`menu-item${on ? ' is-selected' : ''}`}
                    onClick={() => toggle(option.value)}
                  >
                    {option.label}
                    {on && (
                      <span className="tick" aria-hidden="true">
                        <Check />
                      </span>
                    )}
                  </button>
                );
              })}
              {visible.length === 0 && <div className="menu-empty">No options</div>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

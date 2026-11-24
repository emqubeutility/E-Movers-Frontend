import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** `locked` blocks closing while a request is running; `side` opens it as a right-hand panel. */
export default function Modal({
  open,
  onClose,
  title,
  footer,
  locked = false,
  side = false,
  children,
}) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const focusable = () => [...panelRef.current.querySelectorAll(FOCUSABLE)];
    (focusable()[1] || focusable()[0])?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape' && !locked) onClose();
      if (event.key !== 'Tab') return;
      // Keep keyboard focus inside the popup while it is open.
      const items = focusable();
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, locked]);

  if (!open) return null;

  return createPortal(
    <div
      className={`modal-backdrop${side ? ' is-side' : ''}`}
      onMouseDown={(event) => event.target === event.currentTarget && !locked && onClose()}
    >
      <div
        ref={panelRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            disabled={locked}
          >
            <X />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

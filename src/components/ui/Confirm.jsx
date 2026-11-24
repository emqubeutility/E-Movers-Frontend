import { Check, Trash2 } from 'lucide-react';
import Button from './Button.jsx';
import Modal from './Modal.jsx';

/** Every delete goes through this popup. The title is a question; the message says what will happen. */
export function ConfirmDeleteModal({
  open,
  title,
  message,
  busy = false,
  tone = 'danger',
  confirmLabel,
  onClose,
  onConfirm,
}) {
  const destructive = tone === 'danger';
  const Icon = destructive ? Trash2 : Check;
  const label = confirmLabel || (destructive ? 'Delete' : 'Confirm');
  const busyLabel = destructive ? 'Deleting…' : 'Saving…';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      locked={busy}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>
            <Icon />
            {busy ? busyLabel : label}
          </Button>
        </>
      }
    >
      {message}
    </Modal>
  );
}

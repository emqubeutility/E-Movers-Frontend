export const APP_NAME = 'E-Movers';
export const STORAGE_PREFIX = 'movers.';

/** One colour per meaning, as fixed by the design guide. */
export const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active', tone: 'success', color: 'var(--success)' },
  { value: 'INACTIVE', label: 'Inactive', tone: 'neutral', color: 'var(--neutral)' },
  { value: 'SUSPENDED', label: 'Suspended', tone: 'danger', color: 'var(--danger)' },
];

export const PAGE_SIZES = [10, 25, 50, 100];

export const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$/;
export const PASSWORD_HINT =
  '8+ characters with upper and lower case letters, a number and a symbol';
export const PHONE_RULE = /^\+[1-9][0-9]{7,14}$/;

export function statusOf(code) {
  return (
    STATUS_OPTIONS.find((option) => option.value === code) || {
      value: code,
      label: code,
      tone: 'neutral',
    }
  );
}

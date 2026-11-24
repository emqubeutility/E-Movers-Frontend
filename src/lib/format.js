const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const EMPTY = '—';

const pad = (value) => String(value).padStart(2, '0');

/** 30 Nov 2026 */
export function formatDate(value) {
  if (!value) return EMPTY;
  const date = new Date(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** 30 Nov 2026, 14:05 */
export function formatDateTime(value) {
  if (!value) return EMPTY;
  const date = new Date(value);
  return `${formatDate(date)}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en').format(value ?? 0);
}

export function fullName(user) {
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ');
}

/** First letter of the first two words. */
export function initials(name) {
  const letters = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('');
  return (letters || '?').toUpperCase();
}

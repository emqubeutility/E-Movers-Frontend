import { useCallback, useState } from 'react';
import { STORAGE_PREFIX } from '../lib/constants.js';

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** useState that remembers its value in localStorage (sidebar, view mode, KPI collapse). */
export function useLocalState(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));

  const update = useCallback(
    (next) => {
      setValue((current) => {
        const resolved = typeof next === 'function' ? next(current) : next;
        try {
          window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(resolved));
        } catch {
          // Storage can be unavailable (private mode); the in-memory value still works.
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update];
}

import { useEffect, useState } from 'react';

/** Returns `value`, but only after it has stopped changing for `delayMs` — e.g. for
 *  search-as-you-type without firing a request on every keystroke. No dependency beyond
 *  React itself; the timer is cleared on every change/unmount so a stale debounce can never
 *  fire after a newer one has started. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

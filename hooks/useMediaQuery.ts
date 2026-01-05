import { useEffect, useState } from 'react';

/**
 * Reactive matchMedia hook.
 * Safe for SSR/tests (defaults to `defaultState` when window is unavailable).
 */
export function useMediaQuery(query: string, defaultState = false): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return defaultState;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Sync immediately in case query changed
    setMatches(mql.matches);

    // Modern browsers
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }

    // Legacy Safari
    // eslint-disable-next-line deprecation/deprecation
    mql.addListener(onChange);
    // eslint-disable-next-line deprecation/deprecation
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}







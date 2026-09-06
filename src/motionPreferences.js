import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
export const MOTION_KEY = 'system-sandbox:traffic-motion';
const query = '(prefers-reduced-motion: reduce)';
export const trafficMotionAllowed = (enabled, reduced) => Boolean(enabled && !reduced);
export function readMotionPreference(storage) {
  try { return storage.getItem(MOTION_KEY) !== 'off'; } catch { return true; }
}
export function subscribeReducedMotion(listener, host = globalThis.window) {
  const media = host?.matchMedia?.(query);
  media?.addEventListener('change', listener);
  return () => media?.removeEventListener('change', listener);
}
const reducedSnapshot = () => globalThis.window?.matchMedia?.(query).matches ?? true;
export function useTrafficMotion() {
  const reduced = useSyncExternalStore(subscribeReducedMotion, reducedSnapshot, () => true);
  const [enabled, setEnabled] = useState(() => { try { return readMotionPreference(localStorage); } catch { return true; } });
  const change = useCallback(value => {
    setEnabled(value);
    try { localStorage.setItem(MOTION_KEY, value ? 'on' : 'off'); } catch { /* Keep the in-session preference even if browser storage is blocked. */ }
  }, []);
  useEffect(() => {
    const changed = event => { if (event.key === MOTION_KEY || event.key === null) { try { setEnabled(readMotionPreference(localStorage)); } catch { /* Keep the current preference. */ } } };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  return { enabled, reduced, animated: trafficMotionAllowed(enabled, reduced), change };
}

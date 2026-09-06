import { describe, expect, it, vi } from 'vitest';
import { MOTION_KEY, readMotionPreference, subscribeReducedMotion, trafficMotionAllowed } from './motionPreferences.js';
describe('traffic motion policy', () => {
  it('requires both player permission and no reduced-motion request', () => {
    expect(trafficMotionAllowed(true, false)).toBe(true);
    expect(trafficMotionAllowed(false, false)).toBe(false);
    expect(trafficMotionAllowed(true, true)).toBe(false);
    expect(trafficMotionAllowed(false, true)).toBe(false);
  });
  it('reads the dedicated preference without touching the saved board, tolerating blocked storage', () => {
    const storage = { getItem: vi.fn(() => 'off') };
    expect(readMotionPreference(storage)).toBe(false);
    expect(storage.getItem).toHaveBeenCalledWith(MOTION_KEY);
    expect(readMotionPreference({ getItem: () => null })).toBe(true);
    expect(readMotionPreference({ getItem: () => { throw new Error('blocked'); } })).toBe(true);
  });
  it('subscribes to live OS changes and cleans up the exact media query listener', () => {
    const media = { addEventListener: vi.fn(), removeEventListener: vi.fn() }, listener = () => {};
    const host = { matchMedia: vi.fn(() => media) };
    const cleanup = subscribeReducedMotion(listener, host);
    expect(host.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    expect(media.addEventListener).toHaveBeenCalledWith('change', listener);
    cleanup();
    expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
    expect(() => subscribeReducedMotion(listener, {})()).not.toThrow();
  });
});

import { restoreSave, SAVE_KEY } from './levelModel.js';
import { RECOVERY_KEY } from './saveBackups.js';
export const PROTECTED_KEY = 'system-sandbox:first-level:protected-original';
export const SAVE_LOCK = 'system-sandbox-level1-save';

// All participating tabs serialize compare-and-write under the same Web Lock.
// Without that primitive, play and file exports still work; automatic writes stop.
export function createSaveSession(storage, initialRaw, withLock) {
  let expected = initialRaw, conflicted = false;
  const inspect = () => {
    try {
      const raw = storage.getItem(SAVE_KEY);
      if (raw !== expected || (raw !== null && !restoreSave(raw))) conflicted = true;
      return { status: conflicted ? 'conflict' : 'saved', raw, save: restoreSave(raw) };
    } catch { return { status: 'unavailable' }; }
  };
  async function write(save, options) {
    if (!withLock) return { status: 'unavailable' };
    try {
      return await withLock(async () => {
        const current = inspect();
        if (current.status === 'unavailable') return current;
        const explicit = options !== undefined;
        if ((!explicit && current.status === 'conflict') || (explicit && current.raw !== options.expectedRaw)) return { ...current, status: 'conflict' };
        const normalized = restoreSave(JSON.stringify(save));
        if (!normalized) return { status: 'invalid' };
        const next = JSON.stringify(normalized);
        // Preserve an unknown/corrupt source verbatim before an explicit replacement.
        if (explicit && current.raw !== null && !current.save) storage.setItem(PROTECTED_KEY, current.raw);
        const recovery = explicit ? options.recovery : next !== current.raw ? current.save : undefined;
        if (recovery) storage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
        if (next !== current.raw) storage.setItem(SAVE_KEY, next);
        expected = next; conflicted = false;
        return { status: 'saved', raw: next, recovery };
      });
    } catch { return { status: 'unavailable' }; }
  }
  return { inspect, write };
}

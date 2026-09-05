import { restoreSave, SAVE_KEY } from './levelModel.js';
export const RECOVERY_KEY = 'system-sandbox:first-level:recovery';
export const MAX_BACKUP_BYTES = 1024 * 1024;
const bytes = text => new TextEncoder().encode(text).length;
export function parseBackup(text) {
  if (typeof text !== 'string' || bytes(text) > MAX_BACKUP_BYTES) return { error: 'Backup is too large. The limit is 1 MiB.' };
  try {
    const parsed = JSON.parse(text);
    const wrapped = parsed != null && Object.hasOwn(parsed, 'format');
    if (wrapped && (parsed.format !== 'system-sandbox-level1' || parsed.formatVersion !== 1)) return { error: 'This backup format is not supported.' };
    const candidate = wrapped ? parsed.save : parsed;
    const save = restoreSave(JSON.stringify(candidate));
    if (!save) return { error: 'This file is not a valid supported Level 1 save. Your board has not changed.' };
    return { save };
  } catch { return { error: 'Could not read this JSON backup. Your board has not changed.' }; }
}
export function encodeBackup(save) {
  const normalized = restoreSave(JSON.stringify(save));
  if (!normalized) throw new Error('Cannot export an invalid save.');
  const text = JSON.stringify({ format: 'system-sandbox-level1', formatVersion: 1, save: normalized }, null, 2);
  if (bytes(text) > MAX_BACKUP_BYTES) throw new Error('This save exceeds the portable backup size limit. No data was removed.');
  return text;
}
export function readStoredProgress(storage) {
  try {
    const primary = restoreSave(storage.getItem(SAVE_KEY));
    if (primary) return { save: primary, available: true, recovered: false };
    const recovery = restoreSave(storage.getItem(RECOVERY_KEY));
    return { save: recovery, available: true, recovered: Boolean(recovery) };
  } catch { return { save: null, available: false, recovered: false }; }
}

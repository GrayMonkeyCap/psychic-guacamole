import { MAX_DESIGN_SNAPSHOTS, normalizeDesign, restoreSave } from './levelModel.js';
import { sameDesign } from './editorHistory.js';

function cleanSave(save) {
  const normalized = restoreSave(JSON.stringify(save));
  if (!normalized) throw new Error('This save cannot be safely changed. Download a backup first.');
  return normalized;
}
function uniqueName(snapshots, preferred) {
  const base = preferred.slice(0, 48);
  let name = base, suffix = 2;
  while (snapshots.some(snapshot => snapshot.name.toLowerCase() === name.toLowerCase())) {
    const end = ` (${suffix++})`;
    name = `${base.slice(0, 48 - end.length)}${end}`;
  }
  return name;
}
export function saveDesignSnapshot(save, name, id) {
  const next = cleanSave(save);
  if (next.snapshots.length >= MAX_DESIGN_SNAPSHOTS) throw new Error('Your shelf is full. Download a backup or remove a snapshot before saving another.');
  const label = typeof name === 'string' ? name.trim() : '';
  if (!label || label.length > 48 || /[\x00-\x1f\x7f]/.test(label)) throw new Error('Use a name with 1–48 characters and no control characters.');
  if (next.snapshots.some(snapshot => snapshot.name.toLowerCase() === label.toLowerCase())) throw new Error('That name is already on your shelf. Choose a different name.');
  next.snapshots.push({ id, name: label, design: normalizeDesign(next.design) });
  return cleanSave(next);
}
export function loadDesignSnapshot(save, id, checkpointId) {
  let next = cleanSave(save);
  const target = next.snapshots.find(snapshot => snapshot.id === id);
  if (!target) throw new Error('That snapshot is no longer available. Reopen the shelf.');
  if (sameDesign(next.design, target.design)) return next;
  // Do not evict the working copy to make room, even when it is an unfinished design.
  if (!next.snapshots.some(snapshot => sameDesign(snapshot.design, next.design))) {
    if (next.snapshots.length >= MAX_DESIGN_SNAPSHOTS) throw new Error('The shelf is full and your current board is not saved there. Remove a snapshot to make room; nothing has been replaced.');
    next = saveDesignSnapshot(next, uniqueName(next.snapshots, `Before ${target.name}`), checkpointId);
  }
  return { ...next, design: normalizeDesign(target.design) };
}
export function removeDesignSnapshot(save, id) {
  const next = cleanSave(save);
  if (!next.snapshots.some(snapshot => snapshot.id === id)) throw new Error('That snapshot is no longer available.');
  return { ...next, snapshots: next.snapshots.filter(snapshot => snapshot.id !== id) };
}

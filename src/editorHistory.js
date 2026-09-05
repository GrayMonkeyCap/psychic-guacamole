import { fingerprint } from './levelModel.js';

export const emptyEditHistory = () => ({ past: [], future: [] });
export const sameDesign = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const behaviorChanged = (a, b) => fingerprint(a) !== fingerprint(b);
export function rememberEdit(history, before, after) {
  if (sameDesign(before, after)) return history;
  return { past: [...history.past.slice(-29), before], future: [] };
}
export function travelHistory(history, current, direction) {
  if (direction === 'undo' && history.past.length) return {
    design: history.past.at(-1),
    history: { past: history.past.slice(0, -1), future: [...history.future, current] },
  };
  if (direction === 'redo' && history.future.length) return {
    design: history.future.at(-1),
    history: { past: [...history.past.slice(-29), current], future: history.future.slice(0, -1) },
  };
  return { design: current, history };
}

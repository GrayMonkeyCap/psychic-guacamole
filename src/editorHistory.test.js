import { describe, expect, it } from 'vitest';
import { behaviorChanged, emptyEditHistory, rememberEdit, travelHistory } from './editorHistory.js';
const design = { nodes: [{ id: 'internet', type: 'internet', x: 7, y: 43, tier: 0 }, { id: 'api', type: 'api', x: 37, y: 43, tier: 0, strategy: 'random' }], edges: [] };
const move = (d, x) => ({ ...d, nodes: d.nodes.map(n => n.id === 'api' ? { ...n, x } : n) });
describe('reversible editing', () => {
  it('undoes and redoes a geometry edit without invalidating behavioral evidence', () => {
    const next = move(design, 42), history = rememberEdit(emptyEditHistory(), design, next);
    const undone = travelHistory(history, next, 'undo'), redone = travelHistory(undone.history, undone.design, 'redo');
    expect(undone.design).toEqual(design);
    expect(redone.design).toEqual(next);
    expect(behaviorChanged(design, next)).toBe(false);
  });
  it('invalidates evidence for topology, tier and strategy changes', () => {
    expect(behaviorChanged(design, { ...design, edges: [{ id: 'e', from: 'internet', to: 'api' }] })).toBe(true);
    for (const patch of [{ tier: 1 }, { strategy: 'sequence' }]) expect(behaviorChanged(design, { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, ...patch } : n) })).toBe(true);
  });
  it('new meaningful edits clear redo but no-op edits do not', () => {
    const next = move(design, 42), history = rememberEdit(emptyEditHistory(), design, next);
    const undone = travelHistory(history, next, 'undo');
    expect(rememberEdit(undone.history, design, structuredClone(design))).toBe(undone.history);
    expect(rememberEdit(undone.history, design, move(design, 44)).future).toEqual([]);
  });
  it('bounds history to thirty gestures without mutation', () => {
    let current = design, history = emptyEditHistory();
    for (let i = 0; i < 50; i++) { const next = move(current, i); history = rememberEdit(history, current, next); current = next; }
    expect(history.past).toHaveLength(30);
    expect(design.nodes[1].x).toBe(37);
    for (let i = 0; i < 30; i++) ({ design: current, history } = travelHistory(history, current, 'undo'));
    expect(history.future).toHaveLength(30);
    for (let i = 0; i < 30; i++) ({ design: current, history } = travelHistory(history, current, 'redo'));
    expect(current.nodes[1].x).toBe(49);
  });
  it('empty undo/redo is inert', () => {
    const h = emptyEditHistory();
    expect(travelHistory(h, design, 'undo')).toEqual({ design, history: h });
    expect(travelHistory(h, design, 'redo')).toEqual({ design, history: h });
  });
});

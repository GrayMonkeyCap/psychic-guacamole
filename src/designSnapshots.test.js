import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { CHAPTERS, EMPTY_DESIGN, MAX_DESIGN_SNAPSHOTS, SAVE_VERSION, passedChapters, restoreSave, runChapter } from './levelModel.js';
import { loadDesignSnapshot, removeDesignSnapshot, saveDesignSnapshot } from './designSnapshots.js';
import { encodeBackup, parseBackup } from './saveBackups.js';
import DesignShelf from './DesignShelf.jsx';

const design = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 }, { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
const summaries = CHAPTERS.map(chapter => { const { frames, ...result } = runChapter(design, chapter); return result; });
const save = (patch = {}) => ({ version: SAVE_VERSION, design, snapshots: [], unlocked: 2, chapter: 1, guided: false, certificates: summaries, history: summaries, ...patch });
const restore = value => restoreSave(JSON.stringify(value));

describe('safe named design snapshots', () => {
  it('migrates schema 2 and 3 without changing their board or surviving passes', () => {
    for (const version of [2, 3]) {
      const migrated = restore(save({ version }));
      expect(migrated.version).toBe(4);
      expect(migrated.design).toEqual(design);
      expect(migrated.snapshots).toEqual([]);
      expect(passedChapters(migrated.certificates, migrated.design)).toEqual([true, true, true]);
    }
  });
  it('saves a detached snapshot without changing working data, history or certificates', () => {
    const original = save(), before = JSON.stringify(original);
    const next = saveDesignSnapshot(original, '  First idea  ', 'one');
    expect(next.snapshots[0].name).toBe('First idea');
    expect(next.snapshots[0].design).toEqual(design);
    next.design.nodes[1].tier = 0;
    expect(next.snapshots[0].design.nodes[1].tier).toBe(1);
    expect(JSON.stringify(original)).toBe(before);
    expect(next.certificates).toEqual(restore(original).certificates);
  });
  it('keeps an unsaved working board before loading, and never changes a snapshot during edits', () => {
    const first = saveDesignSnapshot(save(), 'Working link', 'one');
    const changed = { ...first, design: EMPTY_DESIGN };
    const loaded = loadDesignSnapshot(changed, 'one', 'two');
    expect(loaded.design).toEqual(design);
    expect(loaded.snapshots[1]).toEqual({ id: 'two', name: 'Before Working link', design: EMPTY_DESIGN });
    expect(loaded.snapshots[0].design).toEqual(design);
    expect(loaded.certificates).toEqual(first.certificates);
    loaded.design.nodes[1].tier = 2;
    expect(loaded.snapshots[0].design.nodes[1].tier).toBe(1);
    expect(changed.snapshots).toHaveLength(1);
  });
  it('reuses an exact existing snapshot and treats geometry changes as worth preserving', () => {
    const one = saveDesignSnapshot(save(), 'One', 'one');
    expect(loadDesignSnapshot(one, 'one', 'unused').snapshots).toHaveLength(1);
    const moved = { ...one, design: { ...design, nodes: design.nodes.map(node => ({ ...node, x: node.x + 1 })) } };
    expect(loadDesignSnapshot(moved, 'one', 'two').snapshots).toHaveLength(2);
    const two = saveDesignSnapshot({ ...one, design: EMPTY_DESIGN }, 'Empty', 'two');
    expect(loadDesignSnapshot(two, 'one', 'unused').snapshots).toHaveLength(2);
  });
  it('blocks full-shelf loads that would discard the only current board, without evicting anything', () => {
    let full = save();
    for (let i = 0; i < MAX_DESIGN_SNAPSHOTS; i++) full = saveDesignSnapshot(full, `Idea ${i}`, `id${i}`);
    const changed = { ...full, design: EMPTY_DESIGN }, before = JSON.stringify(changed);
    expect(() => loadDesignSnapshot(changed, 'id0', 'overflow')).toThrow('nothing has been replaced');
    expect(() => saveDesignSnapshot(full, 'Overflow', 'overflow')).toThrow('full');
    expect(JSON.stringify(changed)).toBe(before);
    expect(loadDesignSnapshot(full, 'id0', 'unused').snapshots).toHaveLength(MAX_DESIGN_SNAPSHOTS);
  });
  it('retains exact ledger matching when returning to an old design and removing a snapshot', () => {
    const one = saveDesignSnapshot(save(), 'Original', 'one');
    const changed = { ...one, design: EMPTY_DESIGN };
    expect(passedChapters(changed.certificates, changed.design)).toEqual([false, false, false]);
    const loaded = loadDesignSnapshot(changed, 'one', 'two');
    expect(passedChapters(loaded.certificates, loaded.design)).toEqual([true, true, true]);
    const removed = removeDesignSnapshot(loaded, 'one');
    expect(removed.design).toEqual(loaded.design);
    expect(removed.certificates).toEqual(loaded.certificates);
    expect(removed.snapshots.map(s => s.id)).toEqual(['two']);
  });
  it('round-trips shelf backups and strips unknown snapshot data', () => {
    const one = saveDesignSnapshot(save(), 'One', 'one');
    one.snapshots[0].privateUrl = 'https://example.test/private';
    one.snapshots[0].design.nodes[1].privateText = 'secret';
    const encoded = encodeBackup(one), decoded = parseBackup(encoded).save;
    expect(encoded).not.toContain('private'); expect(encoded).not.toContain('secret');
    expect(decoded.snapshots).toEqual([{ id: 'one', name: 'One', design }]);
    expect(decoded.certificates).toEqual(one.certificates);
  });
  it('rejects damaged shelves and invalid names instead of silently dropping experiments', () => {
    const one = saveDesignSnapshot(save(), 'One', 'one');
    for (const snapshots of [null, {}, [null], [{ id: 'a', name: 'a', design: {} }], [...one.snapshots, ...one.snapshots], Array(9).fill(one.snapshots[0]), [{ ...one.snapshots[0], name: ' ' }], [{ ...one.snapshots[0], id: '__proto__' }]]) expect(restore({ ...one, snapshots })).toBeNull();
    for (const name of ['', ' ', 'ONE', 'a'.repeat(49), 'bad\nname']) expect(() => saveDesignSnapshot(one, name, 'two')).toThrow();
    expect(() => saveDesignSnapshot(one, 'Two', 'one')).toThrow('safely');
    expect(() => loadDesignSnapshot(one, 'absent', 'two')).toThrow('no longer');
    expect(() => removeDesignSnapshot(one, 'absent')).toThrow('no longer');
  });
  it('creates unique bounded checkpoint names and preserves incomplete but well-formed boards', () => {
    let value = saveDesignSnapshot(save(), 'x'.repeat(48), 'one');
    value = saveDesignSnapshot(value, `Before ${'x'.repeat(48)}`.slice(0, 48), 'two');
    value = { ...value, design: EMPTY_DESIGN };
    const loaded = loadDesignSnapshot(value, 'one', 'three');
    expect(loaded.snapshots[2].name).toHaveLength(48);
    expect(loaded.snapshots[2].name.endsWith('(2)')).toBe(true);
    expect(restore(loaded)).not.toBeNull();
  });
  it('renders cost, current-rule certification and local-only boundaries without grading a name', () => {
    const value = saveDesignSnapshot(save(), '<my idea>', 'one');
    const html = renderToStaticMarkup(createElement(DesignShelf, { save: value, onAction() {}, onBackups() {}, busy: false, unavailable: false }));
    expect(html).toContain('&lt;my idea&gt;');
    expect(html).toContain('445'); expect(html).toContain('3 / 3 challenges');
    expect(html).toContain('device-local'); expect(html).toContain('Backups include the shelf');
  });
});

import { describe, expect, it } from 'vitest';
import { EMPTY_DESIGN, SAVE_KEY, SAVE_VERSION, restoreSave } from './levelModel.js';
import { RECOVERY_KEY } from './saveBackups.js';
import { createSaveSession, PROTECTED_KEY } from './saveSession.js';
const save = (x = 7) => ({ version: SAVE_VERSION, design: { ...EMPTY_DESIGN, nodes: EMPTY_DESIGN.nodes.map(n => ({ ...n, x })) }, chapter: 0, unlocked: 0, guided: false, history: [], certificates: [] });
const raw = value => JSON.stringify(restoreSave(JSON.stringify(value)));
function fixture(initial = null) {
  const data = new Map(initial === null ? [] : [[SAVE_KEY, initial]]);
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
  let queue = Promise.resolve();
  const lock = action => { const next = queue.then(action); queue = next.catch(() => {}); return next; };
  return { data, storage, lock, session: () => createSaveSession(storage, storage.getItem(SAVE_KEY), lock) };
}
describe('safe single-slot sessions', () => {
  it('serializes simultaneous tabs; exactly one writes and the other preserves its board', async () => {
    const f = fixture(raw(save())), a = f.session(), b = f.session();
    const results = await Promise.all([a.write(save(10)), b.write(save(20))]);
    expect(results.map(r => r.status)).toEqual(['saved', 'conflict']);
    expect(f.data.get(SAVE_KEY)).toBe(raw(save(10)));
    expect(f.data.get(RECOVERY_KEY)).toBe(raw(save()));
    expect((await b.write(save(30))).status).toBe('conflict');
  });
  it('requires the exact reviewed copy for explicit replacement and preserves the displaced board', async () => {
    const f = fixture(raw(save())), a = f.session(), b = f.session();
    await a.write(save(10));
    const reviewed = b.inspect();
    await a.write(save(20));
    expect((await b.write(save(30), { expectedRaw: reviewed.raw, recovery: reviewed.save })).status).toBe('conflict');
    const latest = b.inspect();
    expect((await b.write(save(30), { expectedRaw: latest.raw, recovery: latest.save })).status).toBe('saved');
    expect(f.data.get(RECOVERY_KEY)).toBe(raw(save(20)));
    expect((await a.write(save(40))).status).toBe('conflict');
  });
  it('keeps recovery intact on no-op autosave, including the effect after an explicit restore', async () => {
    const f = fixture(raw(save())), session = f.session();
    await session.write(save(10), { expectedRaw: raw(save()), recovery: save(20) });
    expect((await session.write(save(10))).recovery).toBeUndefined();
    expect(f.data.get(RECOVERY_KEY)).toBe(JSON.stringify(save(20)));
  });
  it('preserves a local board before loading the already-saved remote board', async () => {
    const f = fixture(raw(save())), session = f.session();
    await session.write(save(), { expectedRaw: raw(save()), recovery: save(20) });
    expect(f.data.get(RECOVERY_KEY)).toBe(JSON.stringify(save(20)));
  });
  it('never automatically overwrites corrupt or future saves; explicit replacement quarantines the original', async () => {
    for (const original of ['{broken', JSON.stringify({ version: 999, data: 'unknown' })]) {
      const f = fixture(original), session = f.session();
      expect((await session.write(save())).status).toBe('conflict');
      expect(f.data.get(SAVE_KEY)).toBe(original);
      expect((await session.write(save(), { expectedRaw: original, recovery: null })).status).toBe('saved');
      expect(f.data.get(PROTECTED_KEY)).toBe(original);
    }
  });
  it('treats deletion from another tab as a conflict, never silently resurrecting it', async () => {
    const f = fixture(raw(save())), session = f.session();
    f.data.delete(SAVE_KEY);
    expect(session.inspect()).toMatchObject({ status: 'conflict', raw: null });
    expect((await session.write(save(10))).status).toBe('conflict');
    expect(f.data.has(SAVE_KEY)).toBe(false);
  });
  it('does not overwrite primary when a recovery checkpoint cannot be written', async () => {
    const f = fixture(raw(save()));
    f.storage.setItem = () => { throw new Error('QuotaExceededError'); };
    const session = f.session();
    expect((await session.write(save(10))).status).toBe('unavailable');
    expect(f.data.get(SAVE_KEY)).toBe(raw(save()));
  });
  it('keeps prior primary and recovery valid when the final write is interrupted, then allows retry', async () => {
    const f = fixture(raw(save())), set = f.storage.setItem, session = f.session();
    f.storage.setItem = (k, v) => { if (k === SAVE_KEY) throw new Error('write failed'); set(k, v); };
    expect((await session.write(save(10))).status).toBe('unavailable');
    expect(f.data.get(SAVE_KEY)).toBe(raw(save()));
    expect(f.data.get(RECOVERY_KEY)).toBe(raw(save()));
    f.storage.setItem = set;
    expect((await session.write(save(10))).status).toBe('saved');
  });
  it('refuses unsafe autosave when Web Locks or storage access is unavailable', async () => {
    const f = fixture(raw(save()));
    expect((await createSaveSession(f.storage, raw(save()), null).write(save(10))).status).toBe('unavailable');
    expect(f.data.get(SAVE_KEY)).toBe(raw(save()));
    f.storage.getItem = () => { throw new Error('SecurityError'); };
    const session = createSaveSession(f.storage, null, f.lock);
    expect(session.inspect().status).toBe('unavailable');
    expect((await session.write(save())).status).toBe('unavailable');
  });
});

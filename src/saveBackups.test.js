import { describe, expect, it } from 'vitest';
import { CHAPTERS, EMPTY_DESIGN, SAVE_KEY, SAVE_VERSION, recordCertificate, restoreSave, runChapter } from './levelModel.js';
import { encodeBackup, MAX_BACKUP_BYTES, parseBackup, readStoredProgress, RECOVERY_KEY } from './saveBackups.js';

const design = { nodes: [...EMPTY_DESIGN.nodes,
  { id: 'api', type: 'api', x: 35, y: 40, tier: 2, strategy: 'random' },
  { id: 'db', type: 'database', x: 65, y: 40, tier: 2 }],
edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
const result = runChapter(design, CHAPTERS[0]);
const save = (patch = {}) => ({ version: SAVE_VERSION, design, chapter: 0, unlocked: 1, guided: false,
  history: [result], certificates: recordCertificate([], result), ...patch });
const store = (primary, recovery) => ({ getItem: key => key === SAVE_KEY ? primary : key === RECOVERY_KEY ? recovery : null });

describe('portable save contract', () => {
  it('round trips board, settings, evidence versions and certificates without frames or private extras', () => {
    const input = save({ experimentState: { url: 'https://private.example' }, design: { ...design, secret: 'private',
      nodes: design.nodes.map(n => ({ ...n, url: 'https://private.example' })) } });
    const encoded = encodeBackup(input), loaded = parseBackup(encoded).save;
    expect(loaded.design).toEqual(design);
    expect(loaded).toEqual(restoreSave(JSON.stringify(save())));
    expect(loaded.certificates).toHaveLength(1);
    expect(encoded).not.toContain('private');
    expect(encoded).not.toContain('frames');
    expect(parseBackup(encodeBackup(loaded)).save).toEqual(loaded);
  });
  it('accepts unfinished drafts without requiring a valid solution', () => {
    expect(parseBackup(encodeBackup(save({ design: EMPTY_DESIGN }))).save.design).toEqual(EMPTY_DESIGN);
  });
  it('accepts raw schema 2 and archives legacy passes under their original model', () => {
    const { estimatedLatencyMs, modelVersion, scenarioVersion, ...legacy } = result;
    const loaded = parseBackup(JSON.stringify(save({ version: 2, history: [{ ...legacy, p99: estimatedLatencyMs }] }))).save;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.certificates[0].modelVersion).toBe('aggregate-v1');
    expect(loaded.guided).toBe(false);
  });
  it('rejects invalid JSON, future formats, malformed graphs, duplicate ids and inherited catalogue keys', () => {
    const invalid = ['oops', 'null', '[]', JSON.stringify(save({ version: 999 })),
      ...[false, 'foreign', 'system-sandbox-level1'].map(format => JSON.stringify({ format, formatVersion: 999, save: save() })),
      JSON.stringify(save({ design: { ...design, edges: [...design.edges, design.edges[0]] } })),
      ...['__proto__', '', 'x'.repeat(129)].map(id => JSON.stringify(save({ design: { ...design, nodes: [...design.nodes, { ...design.nodes[1], id }] } }))),
      ...[{ type: 'constructor' }, { strategy: 'toString' }, { tier: -1 }, { x: 100 }].map(patch => JSON.stringify(save({ design: { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, ...patch } : n) } })))];
    for (const text of invalid) expect(parseBackup(text).error, text.slice(0, 100)).toBeTruthy();
  });
  it('bounds UTF-8 bytes before parsing, and never truncates oversized exports', () => {
    expect(parseBackup('é'.repeat(MAX_BACKUP_BYTES / 2 + 1)).error).toContain('too large');
    expect(() => encodeBackup(save({ version: 999 }))).toThrow('invalid');
    const certificates = Array.from({ length: 40 }, (_, i) => ({ ...result, fingerprint: `${i}${'x'.repeat(39000)}` }));
    expect(() => encodeBackup(save({ certificates }))).toThrow('size limit');
  });
});

describe('read recovery without mutating storage', () => {
  it('prefers a valid primary and falls back only when primary is unusable', () => {
    const primary = JSON.stringify(save()), recovery = JSON.stringify(save({ design: EMPTY_DESIGN }));
    expect(readStoredProgress(store(primary, recovery))).toMatchObject({ recovered: false, save: { design } });
    for (const raw of [null, 'corrupted']) expect(readStoredProgress(store(raw, recovery))).toMatchObject({ recovered: true, save: { design: EMPTY_DESIGN } });
  });
  it('handles blocked storage and two invalid slots safely', () => {
    expect(readStoredProgress({ getItem() { throw new Error('blocked'); } })).toEqual({ save: null, available: false, recovered: false });
    expect(readStoredProgress(store('bad', 'bad'))).toEqual({ save: null, available: true, recovered: false });
  });
});

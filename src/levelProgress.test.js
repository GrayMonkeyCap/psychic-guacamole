import { describe, expect, it } from 'vitest';
import { CHAPTERS, CONTRACT_RULES, MODEL_VERSION, SAVE_VERSION, EMPTY_DESIGN, fingerprint, isCurrentResult,
  meetsMetricContract, passedChapters, recordCertificate, report, restoreSave, runChapter, scenarioVersion } from './levelModel';

const design = {
  nodes: [...EMPTY_DESIGN.nodes,
    { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 },
    { id: 'db', type: 'database', tier: 1, x: 69, y: 43 },
    { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }],
  edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }, { id: 'c', from: 'api', to: 'cache' }],
};
const summaries = CHAPTERS.map(chapter => {
  const { frames, ...summary } = runChapter(design, chapter);
  return summary;
});
const ledger = () => summaries.reduce(recordCertificate, []);
const save = (patch = {}) => ({ version: SAVE_VERSION, design, chapter: 2, unlocked: 2, guided: false, history: summaries, certificates: ledger(), ...patch });
const restore = value => restoreSave(JSON.stringify(value));
const legacy = () => summaries.map(({ estimatedLatencyMs, modelVersion, scenarioVersion: version, ...summary }) => ({ ...summary, p99: estimatedLatencyMs }));

describe('durable, versioned Level 1 certification', () => {
  it('records the exact model and scenario on every report', () => {
    summaries.forEach((r, i) => {
      expect(r.modelVersion).toBe(MODEL_VERSION);
      expect(r.scenarioVersion).toBe(scenarioVersion(CHAPTERS[i]));
      expect(isCurrentResult(r)).toBe(true);
      expect(r.passed).toBe(true);
    });
  });
  it('retains all three earned passes after 20 failures roll history off and a reload', () => {
    let certificates = ledger(), history = [...summaries];
    for (let i = 0; i < 20; i++) {
      const failed = { ...summaries[i % 3], passed: false, maxError: 50 };
      certificates = recordCertificate(certificates, failed);
      history = [...history.slice(-11), failed];
    }
    const loaded = restore(save({ history, certificates }));
    expect(loaded.history).toHaveLength(12);
    expect(loaded.history.every(h => !h.passed)).toBe(true);
    expect(loaded.certificates).toHaveLength(3);
    expect(passedChapters(loaded.certificates, loaded.design)).toEqual([true, true, true]);
  });
  it('deduplicates repeated passes without dropping passes for other designs', () => {
    const other = { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, tier: 2 } : n) };
    let certificates = recordCertificate(ledger(), { ...summaries[0], fingerprint: fingerprint(other) });
    for (let i = 0; i < 20; i++) certificates = recordCertificate(certificates, summaries[0]);
    expect(certificates).toHaveLength(4);
    expect(passedChapters(certificates, other)).toEqual([true, false, false]);
    expect(passedChapters(certificates, design)).toEqual([true, true, true]);
  });
  it('ignores layout and ordering but invalidates tier, strategy and wiring edits', () => {
    const rearranged = { nodes: design.nodes.map(n => ({ ...n, x: 10 })).reverse(), edges: [...design.edges].reverse() };
    expect(passedChapters(ledger(), rearranged)).toEqual([true, true, true]);
    const edits = [
      { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, tier: 0 } : n) },
      { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, strategy: 'sequence' } : n) },
      { ...design, edges: design.edges.slice(0, 2) },
    ];
    for (const edit of edits) expect(passedChapters(ledger(), edit)).toEqual([false, false, false]);
    expect(passedChapters(ledger(), design)).toEqual([true, true, true]); // undo restores the fingerprint
  });
  it('archives old-model evidence without certifying it under new rules', () => {
    const old = ledger().map(c => ({ ...c, modelVersion: 'aggregate-old' }));
    const loaded = restore(save({ certificates: old }));
    expect(loaded.certificates).toHaveLength(3);
    expect(passedChapters(loaded.certificates, design)).toEqual([false, false, false]);
  });
  it('does not mix chapters, workload variants or old scenario versions', () => {
    const modified = { ...CHAPTERS[1], peak: 2500 };
    expect(scenarioVersion(modified)).not.toBe(scenarioVersion(CHAPTERS[1]));
    const certificates = ledger().map(c => c.chapter === 1 ? { ...c, scenarioVersion: scenarioVersion(modified) } : c);
    expect(passedChapters(certificates, design)).toEqual([true, false, true]);
    expect(isCurrentResult(summaries[0], CHAPTERS[1])).toBe(false);
  });
  it('migrates genuine unversioned v2 passes without changing the board or tutorial preference', () => {
    const loaded = restore(save({ version: 2, certificates: undefined, history: legacy() }));
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.design).toEqual(design);
    expect(loaded.guided).toBe(false);
    expect(loaded.chapter).toBe(2);
    expect(loaded.unlocked).toBe(2);
    expect(passedChapters(loaded.certificates, design)).toEqual([true, true, true]);
    expect(loaded.history[0].p99).toBeUndefined();
    expect(loaded.history[0].estimatedLatencyMs).toBe(summaries[0].estimatedLatencyMs);
    expect(restore(loaded)).toEqual(loaded);
  });
  it('migrates all available legacy evidence before limiting recent history', () => {
    const failures = Array.from({ length: 20 }, () => ({ ...legacy()[0], passed: false, maxError: 50 }));
    const loaded = restore(save({ version: 2, certificates: undefined, history: [...legacy(), ...failures] }));
    expect(loaded.history).toHaveLength(12);
    expect(passedChapters(loaded.certificates, design)).toEqual([true, true, true]);
  });
  it('never stamps unversioned v3 records with current rules or rebuilds its ledger from history', () => {
    const { modelVersion, ...partial } = summaries[0];
    const loaded = restore(save({ history: [partial], certificates: [partial] }));
    expect(loaded.certificates).toEqual([]);
    expect(loaded.history).toEqual([]);
    expect(restore(save({ certificates: undefined })).certificates).toEqual([]);
  });
  it('preserves explicit old versions in v2 rather than relabelling them current', () => {
    const loaded = restore(save({ version: 2, history: summaries.map(r => ({ ...r, modelVersion: 'other-model' })) }));
    expect(loaded.certificates).toHaveLength(3);
    expect(passedChapters(loaded.certificates, design)).toEqual([false, false, false]);
  });
  it('rejects malformed, out-of-budget, failing and truthy-but-not-boolean certificate records', () => {
    const malformed = [null, {}, { ...summaries[0], passed: 'true' }, { ...summaries[0], chapter: 100 },
      { ...summaries[0], cost: -1 }, { ...summaries[0], estimatedLatencyMs: -1 },
      { ...summaries[0], maxError: 5 }, { ...summaries[0], cost: 901 },
      { ...summaries[0], estimatedLatencyMs: 301 }, { ...summaries[0], passed: false }];
    expect(restore(save({ certificates: malformed })).certificates).toEqual([]);
  });
});

describe('explicit game metric contract', () => {
  it('uses inclusive published thresholds, rejecting each exceeded threshold and nonfinite values', () => {
    const boundary = { maxError: CONTRACT_RULES.maxError, estimatedLatencyMs: CONTRACT_RULES.maxLatencyMs, cost: CONTRACT_RULES.budget };
    expect(meetsMetricContract(boundary)).toBe(true);
    for (const key of Object.keys(boundary)) {
      expect(meetsMetricContract({ ...boundary, [key]: boundary[key] + .001 })).toBe(false);
      expect(meetsMetricContract({ ...boundary, [key]: NaN })).toBe(false);
      expect(meetsMetricContract({ ...boundary, [key]: Infinity })).toBe(false);
    }
  });
  it('reports worst samples rather than hiding a failing burst behind an average', () => {
    const frames = runChapter(design, CHAPTERS[1]).frames;
    const boundary = frames.map(f => ({ ...f, errorRate: 2, estimatedLatencyMs: 300 }));
    expect(report(design, CHAPTERS[1], boundary).passed).toBe(true);
    const burst = boundary.map((f, i) => i === 10 ? { ...f, errorRate: 2.01 } : { ...f, errorRate: 0 });
    expect(report(design, CHAPTERS[1], burst)).toMatchObject({ passed: false, maxError: 2.01, estimatedLatencyMs: 300 });
    expect(report(design, CHAPTERS[1], boundary.map((f, i) => i === 10 ? { ...f, estimatedLatencyMs: 301 } : f)).passed).toBe(false);
  });
  it('uses the estimate name consistently in frames and reports, including read/write-heavy traffic', () => {
    for (const chapter of CHAPTERS) {
      const result = runChapter(design, chapter);
      expect(result.p99).toBeUndefined();
      expect(result.estimatedLatencyMs).toBe(Math.max(...result.frames.map(f => f.estimatedLatencyMs)));
      expect(result.maxError).toBe(Math.max(...result.frames.map(f => f.errorRate)));
      expect(result.frames.every(f => !('p99' in f) && Number.isFinite(f.estimatedLatencyMs))).toBe(true);
    }
  });
});

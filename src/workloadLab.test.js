import { describe, expect, it } from 'vitest';
import { CHAPTERS, EMPTY_DESIGN, runChapter } from './levelModel.js';
import { runWorkloadLab, WORKLOAD_RATES, WORKLOAD_SHAPES } from './workloadLab.js';
const basic = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 }, { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
const cached = { nodes: [...basic.nodes, { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }], edges: [...basic.edges, { id: 'c', from: 'api', to: 'cache' }] };
const db = run => run.nodes.find(n => n.type === 'database');

describe('controlled workload experiments', () => {
  it('keeps identical volume, ramp and duration with independent cold starts', () => {
    const result = runWorkloadLab(cached, 1000);
    for (const [i, run] of result.runs.entries()) {
      const expected = runChapter(cached, { ...CHAPTERS[0], ...WORKLOAD_SHAPES[i], peak: 1000, duration: 12 });
      expect(run.incoming).toBe(1000);
      expect(run.coldCacheHit).toBe(0);
      expect(run.maxError).toBe(expected.maxError);
      expect(run.cacheHit).toBe(expected.frames.at(-1).cacheHit);
      expect(run.nodes.find(n => n.id === 'db').reads).toBe(expected.frames.at(-1).loads.db.reads);
    }
  });
  it('isolates repetition without inventing savings on uncached designs', () => {
    const [repeat, scatter] = runWorkloadLab(basic, 1000).runs;
    expect(repeat.nodes).toEqual(scatter.nodes);
    expect(repeat.cacheHit).toBe(0);
    const [hot, scattered] = runWorkloadLab(cached, 1000).runs;
    expect(hot.reads).toBe(scattered.reads);
    expect(hot.writes).toBe(scattered.writes);
    expect(db(hot).reads).toBeLessThan(db(scattered).reads);
    expect(db(hot).writes).toBe(db(scattered).writes);
  });
  it('distinguishes creates from cache fills and preserves durable writes', () => {
    const [, scatter, create] = runWorkloadLab(cached, 1000).runs;
    expect(create.writes).toBe(850);
    expect(db(create).writes).toBeGreaterThan(db(scatter).writes);
    expect(db(create).writes).toBeCloseTo(db(runWorkloadLab(basic, 1000).runs[2]).writes);
  });
  it('does not return grades/certificates or mutate the design/canonical challenges', () => {
    const before = JSON.stringify({ cached, CHAPTERS });
    const result = runWorkloadLab(cached, 1000);
    expect(runWorkloadLab(cached, 1000)).toEqual(result);
    expect(JSON.stringify({ cached, CHAPTERS })).toBe(before);
    expect(JSON.stringify(result)).not.toMatch(/"passed"|"certificates"|"history"/);
  });
  it('rejects malformed/rate inputs and explains incomplete boards without simulating', () => {
    expect(runWorkloadLab(EMPTY_DESIGN, 100)).toMatchObject({ ready: false });
    expect(runWorkloadLab(EMPTY_DESIGN, 100).runs).toBeUndefined();
    expect(() => runWorkloadLab(null, 100)).toThrow();
    for (const rate of [NaN, Infinity, -1, 0, '1000', 1001]) expect(() => runWorkloadLab(basic, rate)).toThrow();
    for (const rate of WORKLOAD_RATES) expect(runWorkloadLab(basic, rate).ready).toBe(true);
  });
  it('keeps over-budget experimentation ungraded and includes unused components as unobserved', () => {
    const design = { ...cached, nodes: [...cached.nodes, { id: 'spare', type: 'api', tier: 2, strategy: 'random', x: 7, y: 12 }, { id: 'unused', type: 'cdn', tier: 2, x: 7, y: 73 }] };
    const result = runWorkloadLab(design, 1000);
    expect(result.ready).toBe(true);
    expect(result.cost).toBeGreaterThan(900);
    expect(result.runs[0].nodes.find(n => n.id === 'spare')).toMatchObject({ observed: false, reads: 0, writes: 0 });
    expect(result.runs[0].passed).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';
import { CHAPTERS, EMPTY_DESIGN, MODEL_VERSION, runChapter, scenarioVersion } from './levelModel.js';
import { compareDesigns, designChanges, metricDelta } from './designComparison.js';

const direct = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 1, strategy: 'random', x: 37, y: 43 }, { id: 'db', type: 'database', tier: 1, x: 69, y: 43 }], edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'db' }] };
const cached = { nodes: [...direct.nodes, { id: 'cache', type: 'cache', tier: 0, x: 69, y: 12 }], edges: [...direct.edges, { id: 'c', from: 'api', to: 'cache' }] };
const source = (design, name = 'Idea') => ({ design, name });
describe('fresh fair design comparison', () => {
  it('runs both designs against identical canonical scenario versions and cold starts', () => {
    const comparison = compareDesigns(source(direct, 'Direct'), source(cached, 'Cached'));
    expect(comparison.comparable).toBe(true);
    expect(comparison.modelVersion).toBe(MODEL_VERSION);
    expect(comparison.scenarioVersions).toEqual(CHAPTERS.map(scenarioVersion));
    expect(comparison.cacheStart).toBe('cold');
    for (const [i, chapter] of CHAPTERS.entries()) for (const [j, design] of [direct, cached].entries()) {
      const expected = runChapter(design, chapter), actual = comparison.chapters[i].results[j];
      for (const key of Object.keys(actual)) expect(actual[key]).toEqual(expected[key]);
      expect(actual).not.toHaveProperty('frames');
    }
  });
  it('exposes the cost/rejection/latency trade-off without manufacturing a winner', () => {
    const comparison = compareDesigns(source(direct), source(cached));
    expect(comparison.costDelta).toBe(95);
    expect(comparison.chapters[1].rejectionDelta).toBeLessThan(-1);
    expect(comparison.chapters[1].latencyDelta).toBeGreaterThan(0);
    expect(comparison.chapters.every(chapter => chapter.results.every(result => result.passed))).toBe(true);
    expect(comparison).not.toHaveProperty('winner');
  });
  it('ignores layout and wire identifiers but lists capacity, strategy, component and call changes', () => {
    const moved = { nodes: direct.nodes.map(node => ({ ...node, x: node.x + 1 })), edges: direct.edges.map(edge => ({ ...edge, id: `${edge.id}new` })).reverse() };
    expect(designChanges(direct, moved)).toEqual([]);
    const changed = { ...cached, nodes: cached.nodes.map(node => node.id === 'api' ? { ...node, tier: 2, strategy: 'sequence' } : node) };
    const changes = designChanges(direct, changed).join(' ');
    expect(changes).toContain('Medium → Large'); expect(changes).toContain('allocation:');
    expect(changes).toContain('Added Memory cache'); expect(changes).toContain('Added call: API server → Memory cache');
    expect(designChanges(cached, direct).join(' ')).toContain('Removed Memory cache');
  });
  it('does not mutate designs, use historical reports or carry warmth across repeated comparisons', () => {
    const left = { ...source(cached), report: { passed: false, modelVersion: 'old' }, cacheWarmth: 1 };
    const right = source(cached), before = JSON.stringify([left, right]);
    const first = compareDesigns(left, right), second = compareDesigns(left, right);
    expect(first).toEqual(second); expect(JSON.stringify([left, right])).toBe(before);
    expect(first.chapters.every(chapter => chapter.rejectionDelta === 0 && chapter.latencyDelta === 0)).toBe(true);
    expect(first.chapters.every(chapter => chapter.results[0].passed)).toBe(true);
  });
  it('reports structural and budget blockers rather than treating an invalid setup as measured traffic', () => {
    const invalid = compareDesigns(source(EMPTY_DESIGN), source(direct));
    expect(invalid.comparable).toBe(false); expect(invalid.chapters).toEqual([]);
    expect(invalid.sides[0].issues.length).toBeGreaterThan(0);
    const expensive = { ...cached, nodes: cached.nodes.map(node => node.type === 'internet' ? node : { ...node, tier: 2 }) };
    const overBudget = compareDesigns(source(expensive), source(direct));
    expect(overBudget.comparable).toBe(false); expect(overBudget.sides[0].issues.join()).toContain('Over the 900');
    expect(() => compareDesigns(source({}), source(direct))).toThrow('damaged');
  });
  it('never converts absent or nonfinite latency to a zero delta', () => {
    expect(metricDelta(40, 45)).toBe(5); expect(metricDelta(40, 30)).toBe(-10);
    for (const unavailable of [null, undefined, Infinity, NaN]) expect(metricDelta(unavailable, 40)).toBeNull();
  });
});

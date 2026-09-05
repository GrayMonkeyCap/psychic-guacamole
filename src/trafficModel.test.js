import { describe, expect, it } from 'vitest';
import { CATALOG, CHAPTERS, EMPTY_DESIGN, STRATEGIES, report, tick, trafficAt, validate } from './levelModel';
import { simulateTraffic } from './trafficModel';

const node = (id, type, tier = 0, strategy = 'random') => ({ id, type, tier, strategy, x: 20, y: 20 });
const edge = (from, to) => ({ id: `${from}-${to}`, from, to });
const basic = (api = 0, db = 0) => ({ nodes: [...EMPTY_DESIGN.nodes, node('api', 'api', api), node('db', 'database', db)], edges: [edge('internet', 'api'), edge('api', 'db')] });
const cached = () => { const d = basic(1, 1); return { nodes: [...d.nodes, node('cache', 'cache')], edges: [...d.edges, edge('api', 'cache')] }; };
const balanced = () => ({ nodes: [...EMPTY_DESIGN.nodes, node('lb', 'loadBalancer'), node('a', 'api'), node('b', 'api'), node('db', 'database', 1), node('cache', 'cache')], edges: [edge('internet', 'lb'), edge('lb', 'a'), edge('lb', 'b'), edge('a', 'db'), edge('b', 'db'), edge('a', 'cache'), edge('b', 'cache')] });
const sum = (items, value) => items.reduce((n, item) => n + value(item), 0);
const checkConservation = frame => {
  const a = frame.accounting;
  expect(a.offered).toBeCloseTo(a.completed + a.rejected + a.queued + a.timedOut, 8);
  expect(a.completed).toBeGreaterThanOrEqual(0);
  expect(a.rejected).toBeGreaterThanOrEqual(0);
  for (const kind of ['read', 'write']) expect(a[kind].offered).toBeCloseTo(a[kind].completed + a[kind].rejected, 8);
  expect(sum(frame.outcomes, o => o.rate)).toBeCloseTo(frame.rps, 8);
  expect(a.completed).toBeCloseTo(a.read.completed + a.write.completed, 8);
  expect(a.rejected).toBeCloseTo(a.read.rejected + a.write.rejected, 8);
};
const customTick = (design, chapter, catalog, previous = {}) => simulateTraffic({ design, chapter, time: 10, dt: .2, previous, catalog, strategies: STRATEGIES, validation: validate(design), rps: trafficAt(chapter, 10) });

describe('causal admission and request conservation', () => {
  it('never sends API-rejected work to storage', () => {
    const frame = tick(basic(0, 2), CHAPTERS[1], 10);
    const api = frame.loads.api, dbCall = frame.edges['api>db'];
    expect(api.rejected).toBeGreaterThan(1000);
    expect(dbCall.reads + dbCall.writes).toBeCloseTo(api.admitted, 8);
    expect(frame.loads.db.rejected).toBe(0);
    expect(frame.bottleneck).toBe('api');
    expect(frame.outcomes.filter(o => o.blockedBy === 'api').every(o => !o.chain.includes('db'))).toBe(true);
    checkConservation(frame);
  });
  it('stops allocator-rejected creates before a durable write', () => {
    const design = basic(2, 2);
    design.nodes.find(n => n.id === 'api').strategy = 'service';
    design.nodes.push(node('ids', 'idGenerator')); design.edges.push(edge('api', 'ids'));
    const frame = tick(design, { ...CHAPTERS[2], reads: 0, peak: 2000 }, 10);
    expect(frame.edges['api>ids'].writes).toBe(2000);
    expect(frame.edges['api>db'].writes).toBeCloseTo(800, 8);
    expect(frame.accounting.write.rejected).toBeCloseTo(1200 * .2, 8);
    expect(frame.outcomes.filter(o => o.blockedBy === 'ids').every(o => !o.chain.includes('db'))).toBe(true);
    checkConservation(frame);
  });
  it('shares one storage budget across API replicas', () => {
    const design = balanced();
    design.nodes.find(n => n.id === 'db').tier = 0;
    design.nodes.filter(n => n.type === 'api').forEach(n => { n.tier = 2; });
    const frame = tick(design, { ...CHAPTERS[2], reads: 0 }, 10);
    expect(frame.loads.db.used).toBeCloseTo(1, 8);
    expect(frame.loads.db.rejected).toBeGreaterThan(0);
    const completed = frame.outcomes.filter(o => !o.blockedBy);
    expect(completed[0].rate).toBeCloseTo(completed[1].rate, 8);
    checkConservation(frame);
  });
  it('conserves both operations across workload mixes, tiers and warm/cold samples', () => {
    for (const design of [basic(), basic(2, 2), cached(), balanced()]) {
      for (const reads of [0, .15, .8, .98, 1]) {
        let frame;
        for (let i = 1; i <= 25; i++) {
          frame = tick(design, { ...CHAPTERS[1], peak: 100 + i * 350, reads }, i / 5, frame);
          checkConservation(frame);
          for (const load of Object.values(frame.loads)) expect(load.used).toBeLessThanOrEqual(1);
        }
      }
    }
  });
  it('invalid topology produces failed operations, not partial durable writes', () => {
    const design = basic(); design.edges.pop();
    const frame = tick(design, CHAPTERS[0], 10);
    expect(frame.loads).toEqual({});
    expect(frame.accounting.completed).toBe(0);
    expect(frame.estimatedLatencyMs).toBeNull();
    expect(frame.errorRate).toBe(100);
    checkConservation(frame);
  });
  it('zero demand does not divide by zero or invent latency', () => {
    const frame = tick(cached(), { ...CHAPTERS[0], peak: 0 }, 10);
    expect(frame.errorRate).toBe(0);
    expect(frame.estimatedLatencyMs).toBeNull();
    checkConservation(frame);
  });
});

describe('successful cache-aside fills', () => {
  it('only successful storage reads can warm cache', () => {
    const design = cached(); design.nodes.find(n => n.id === 'db').tier = 0;
    const frame = tick(design, CHAPTERS[1], 10);
    const completedReads = frame.accounting.read.completed / .2;
    expect(frame.loads.db.rejected).toBeGreaterThan(0);
    expect(frame.loads.cache.fills).toBeCloseTo(completedReads, 8);
    expect(frame.edges['api>cache'].writes).toBeCloseTo(completedReads, 8);
    expect(frame.warmth.cache).toBeCloseTo(1 - Math.exp(-completedReads * .2 / 120), 8);
    checkConservation(frame);
  });
  it('storage unavailability cannot warm a cold cache or emit a successful redirect', () => {
    const catalog = structuredClone(CATALOG);
    catalog.database.tiers[1].capacity = 0; catalog.database.tiers[1].writes = 0;
    const frame = customTick(cached(), CHAPTERS[0], catalog);
    expect(frame.warmth.cache).toBe(0);
    expect(frame.loads.cache.fills).toBe(0);
    expect(frame.accounting.completed).toBe(0);
    expect(frame.estimatedLatencyMs).toBeNull();
    checkConservation(frame);
    const recovered = tick(cached(), CHAPTERS[0], 10, frame);
    expect(recovered.warmth.cache).toBeGreaterThan(0);
    checkConservation(recovered);
  });
  it('cache lookup saturation skips optional fills without failing completed database reads', () => {
    const design = cached(); design.nodes.find(n => n.id === 'api').tier = 2;
    design.nodes.find(n => n.id === 'db').tier = 2;
    const frame = tick(design, { ...CHAPTERS[1], peak: 4000, reads: 1 }, 10);
    expect(frame.loads.cache.rejected).toBeCloseTo(500, 8);
    expect(frame.loads.cache.skippedFills).toBeCloseTo(3500, 8);
    expect(frame.loads.cache.fills).toBe(0);
    expect(frame.warmth.cache).toBe(0);
    expect(frame.accounting.completed).toBeCloseTo(3500 * .2, 8);
    checkConservation(frame);
  });
  it('shares the same starting warmth across callers regardless of node/edge ordering', () => {
    const a = balanced(), b = { nodes: [...a.nodes].reverse(), edges: [...a.edges].reverse() };
    let first, reversed;
    for (let i = 1; i < 30; i++) {
      first = tick(a, CHAPTERS[1], i / 5, first);
      reversed = tick(b, CHAPTERS[1], i / 5, reversed);
      for (const key of ['loads', 'edges', 'warmth', 'accounting', 'outcomes', 'estimatedLatencyMs', 'errorRate']) expect(reversed[key]).toEqual(first[key]);
    }
  });
  it('warm edge hits complete without calling the API; misses fill only on success', () => {
    const design = basic(2, 2); design.nodes.push(node('edge', 'cdn'));
    design.edges[0] = edge('internet', 'edge'); design.edges.push(edge('edge', 'api'));
    const frame = tick(design, CHAPTERS[1], 10, { warmth: { edge: 1 } });
    expect(frame.loads.api.reads).toBeLessThan(200);
    expect(frame.outcomes.filter(o => o.chain.at(-1) === 'edge').every(o => !o.chain.includes('api'))).toBe(true);
    expect(frame.loads.edge.fills).toBeCloseTo(frame.loads.db.reads, 8);
    checkConservation(frame);
  });
});

describe('diagnoses point to actual rejected user operations', () => {
  it('selects the actual failing sample, not a lower-error sample with a larger latency estimate', () => {
    const frame = tick(basic(), CHAPTERS[1], 10);
    const frames = [{ ...frame, errorRate: 1, estimatedLatencyMs: 290 }, { ...frame, errorRate: 3, estimatedLatencyMs: 30 }];
    const result = report(basic(), CHAPTERS[1], frames);
    expect(result.worstIndex).toBe(1);
    expect(result.maxError).toBe(3);
  });
  it('does not mistake optional fill pressure for the source of user failures', () => {
    const design = cached(); design.nodes.find(n => n.id === 'api').tier = 2;
    const frame = tick(design, { ...CHAPTERS[1], peak: 3400, reads: 1 }, 10);
    expect(frame.loads.cache.ratio).toBeGreaterThan(frame.loads.db.ratio);
    expect(frame.loads.cache.rejected).toBe(0);
    expect(frame.bottleneck).toBe('db');
    const result = report(design, CHAPTERS[1], [frame]);
    expect(result.bottleneck).toBe('db');
    expect(result.reason).toContain('Database rejected');
  });
});

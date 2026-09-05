import { describe, expect, it } from 'vitest';
import { CHAPTERS, EMPTY_DESIGN, LIMIT, connectionError, costOf, fingerprint, restoreSave, runChapter, tick, traceRequest, validate } from './levelModel';

const node = (id, type, tier = 0, strategy = 'sequence') => ({ id, type, tier, strategy, x: 20, y: 20 });
const edge = (from, to) => ({ id: `${from}-${to}`, from, to });
const basic = (apiTier = 0, dbTier = 0, strategy = 'sequence') => ({
  nodes: [...EMPTY_DESIGN.nodes, node('api', 'api', apiTier, strategy), node('db', 'database', dbTier)],
  edges: [edge('internet', 'api'), edge('api', 'db')],
});
const cached = () => { const d = basic(1, 1, 'random'); return { nodes: [...d.nodes, node('cache', 'cache')], edges: [...d.edges, edge('api', 'cache')] }; };

describe('first level: functional contracts', () => {
  it('accepts sequences and API-generated codes without an ID service', () => {
    expect(validate(basic()).valid).toBe(true);
    expect(validate(basic(0, 0, 'random')).valid).toBe(true);
    expect(validate(basic(0, 0, 'service')).valid).toBe(false);
  });
  it('requires durable storage on every routed API and one shared primary', () => {
    const d = basic();
    const broken = { nodes: [...d.nodes, node('lb', 'loadBalancer'), node('api2', 'api')], edges: [edge('internet', 'lb'), edge('lb', 'api'), edge('lb', 'api2'), edge('api', 'db')] };
    expect(validate(broken).valid).toBe(false);
    broken.edges.push(edge('api2', 'db'));
    expect(validate(broken).valid).toBe(true);
    broken.nodes.push(node('db2', 'database'));
    broken.edges[4] = edge('api2', 'db2');
    expect(validate(broken).issues.some(i => i.text.includes('shared database'))).toBe(true);
  });
  it('explains invalid calls and cache-aside rather than silently accepting magic pipes', () => {
    const d = cached();
    expect(connectionError(d, 'cache', 'db')).toContain('API handles a cache miss');
    expect(connectionError(d, 'db', 'api')).toContain('cannot call');
    expect(connectionError(d, 'api', 'db')).toContain('Replies use the same connection');
  });
});

describe('first level: architecture physics', () => {
  it('a cheap minimal solution passes the first link and fails the viral workload', () => {
    expect(runChapter(basic(), CHAPTERS[0]).passed).toBe(true);
    const viral = runChapter(basic(), CHAPTERS[1]);
    expect(viral.passed).toBe(false);
    expect(viral.bottleneck).toBe('api');
    expect(viral.reason).toContain('API server rejected');
  });
  it('unused capacity does not affect traffic', () => {
    const d = basic();
    const before = tick(d, CHAPTERS[1], 10);
    const after = tick({ ...d, nodes: [...d.nodes, node('unused', 'api', 2)] }, CHAPTERS[1], 10);
    expect(after.errorRate).toBe(before.errorRate);
    expect(after.loads.unused).toBeUndefined();
  });
  it('accepts a fresh browser test with no prior simulation state', () => {
    expect(tick(basic(), CHAPTERS[0], .2, null).errorRate).toBeLessThan(2);
  });
  it('replicas share requests only along the configured routing branches', () => {
    const d = { nodes: [...EMPTY_DESIGN.nodes, node('lb', 'loadBalancer'), node('a', 'api'), node('b', 'api', 2), node('db', 'database', 2)], edges: [edge('internet', 'lb'), edge('lb', 'a'), edge('lb', 'b'), edge('a', 'db'), edge('b', 'db')] };
    const frame = tick(d, { ...CHAPTERS[1], peak: 3000 }, 10);
    expect(frame.loads.a.reads).toBe(frame.loads.b.reads);
    expect(frame.loads.a.ratio).toBeGreaterThan(1);
    expect(frame.loads.b.ratio).toBeLessThan(1);
    expect(frame.errorRate).toBeGreaterThan(5);
    expect(frame.errorRate).toBeLessThan(20);
  });
  it('cache starts cold, warms with traffic and has no power over durable write demand', () => {
    const d = cached();
    const cold = tick(d, CHAPTERS[1], 8);
    let warm = cold;
    for (let i = 0; i < 30; i++) warm = tick(d, CHAPTERS[1], 8, warm);
    expect(cold.cacheHit).toBe(0);
    expect(warm.cacheHit).toBeGreaterThan(90);
    expect(warm.loads.db.reads).toBeLessThan(cold.loads.db.reads / 5);
    expect(warm.loads.db.writes).toBe(cold.loads.db.writes);
  });
  it('fail-fast overload rejects work without a phantom queue, then recovers at low demand', () => {
    let high;
    for (let i = 0; i < 6; i++) high = tick(basic(), CHAPTERS[1], 10, high);
    expect(high.loads.db.queue).toBe(0);
    expect(high.accounting.rejected).toBeGreaterThan(0);
    let low = high;
    for (let i = 0; i < 10; i++) low = tick(basic(), CHAPTERS[0], 10, low);
    expect(low.loads.db.queue).toBe(0);
    expect(low.accounting.rejected).toBeCloseTo(0);
  });
  it('a connected but unused ID service has no traffic or penalty to success', () => {
    const d = basic();
    d.nodes.push(node('id', 'idGenerator')); d.edges.push(edge('api', 'id'));
    expect(tick(d, CHAPTERS[0], 10).loads.id).toBeUndefined();
  });
  it('replies follow the actual calls and creation waits for a durable save', () => {
    const d = cached();
    const cold = traceRequest(d, 'read', false), hot = traceRequest(d, 'read', true), create = traceRequest(d, 'write');
    expect(cold.some(s => s.node === 'db')).toBe(true);
    expect(hot.some(s => s.node === 'db')).toBe(false);
    expect(create.some(s => s.node === 'cache')).toBe(false);
    expect(create.at(-1).title).toContain('201');
    expect(create.findIndex(s => s.title === 'Commit acknowledged')).toBeLessThan(create.length - 1);
    expect(cold.at(-1)).toMatchObject({ node: 'internet', reply: true });
  });
});

describe('first level: solution space and fair replay', () => {
  const large = basic(2, 2);
  const dedicated = cached();
  dedicated.nodes.find(n => n.type === 'api').strategy = 'service';
  dedicated.nodes.push(node('id', 'idGenerator', 1)); dedicated.edges.push(edge('api', 'id'));
  const edgeCached = basic(0, 1, 'sequence');
  edgeCached.nodes.push(node('edge', 'cdn'));
  edgeCached.edges[0] = edge('internet', 'edge'); edgeCached.edges.push(edge('edge', 'api'));
  const balanced = { nodes: [...EMPTY_DESIGN.nodes, node('a', 'api', 0, 'random'), node('b', 'api', 0, 'random'), node('db', 'database', 1), node('c', 'cache'), node('lb', 'loadBalancer')], edges: [edge('internet', 'lb'), edge('lb', 'a'), edge('lb', 'b'), edge('a', 'db'), edge('b', 'db'), edge('a', 'c'), edge('b', 'c')] };
  it('also accepts balanced API replicas sharing cache and storage', () => {
    expect(costOf(balanced.nodes)).toBeLessThanOrEqual(LIMIT);
    for (const chapter of CHAPTERS) expect(runChapter(balanced, chapter).passed).toBe(true);
  });
  it('never certifies an over-budget architecture even when its capacity is sufficient', () => {
    const expensive = { ...large, nodes: [...large.nodes, node('unused', 'api', 2)] };
    const result = runChapter(expensive, CHAPTERS[0]);
    expect(result.maxError).toBeLessThan(2);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('budget');
  });
  for (const [label, design] of [['vertical scaling, no cache or ID service', large], ['API random codes with cache-aside', cached()], ['dedicated allocator', dedicated]]) {
    it(`all three challenges accept ${label}`, () => {
      expect(costOf(design.nodes)).toBeLessThanOrEqual(LIMIT);
      for (const chapter of CHAPTERS) expect(runChapter(design, chapter).passed, `${label}: ${chapter.name}`).toBe(true);
    });
  }
  it('edge caching avoids API work, unlike a cache beside the API', () => {
    const d = basic(1, 2); d.nodes.push(node('edge', 'cdn')); d.edges[0] = edge('internet', 'edge'); d.edges.push(edge('edge', 'api'));
    let state;
    for (let i = 0; i < 30; i++) state = tick(d, CHAPTERS[1], 10, state);
    expect(state.loads.api.reads).toBeLessThan(300);
    expect(state.edges['internet>edge'].reads).toBeGreaterThan(2000);
  });
  it('reports are deterministic and certifications ignore layout but track behavioral changes', () => {
    const d = cached();
    expect(runChapter(d, CHAPTERS[1]).estimatedLatencyMs).toBe(runChapter(d, CHAPTERS[1]).estimatedLatencyMs);
    expect(fingerprint({ ...d, nodes: d.nodes.map(n => ({ ...n, x: 10 })) })).toBe(fingerprint(d));
    expect(fingerprint(basic(1))).not.toBe(fingerprint(basic(2)));
  });
  it('rejects malformed saved designs instead of crashing the level', () => {
    expect(restoreSave('{bad')).toBeNull();
    expect(restoreSave(JSON.stringify({ version: 2, design: { nodes: [node('x', 'unknown')], edges: [] } }))).toBeNull();
    expect(restoreSave(JSON.stringify({ version: 2, design: basic(), unlocked: 1, chapter: 1 })).design).toEqual(basic());
  });
});

import { describe, expect, it } from 'vitest';
import { EMPTY_DESIGN } from './levelModel.js';
import { clearExperimentCaches, createExperimentLink, createLinkExperiment, LINK_LIMIT, openExperimentLink } from './linkExperiment.js';
const node = (id, type, strategy = 'sequence') => ({ id, type, strategy, tier: 0, x: 20, y: 20 });
const edge = (from, to) => ({ id: `${from}-${to}`, from, to });
const design = (strategy = 'sequence', withCache = true) => ({ nodes: [...EMPTY_DESIGN.nodes, node('api', 'api', strategy), node('db', 'database'), ...(withCache ? [node('cache', 'cache')] : []), ...(strategy === 'service' ? [node('ids', 'idGenerator')] : [])], edges: [edge('internet', 'api'), edge('api', 'db'), ...(withCache ? [edge('api', 'cache')] : []), ...(strategy === 'service' ? [edge('api', 'ids')] : [])] });
const url = 'https://bakery.example/menu';
describe('bounded durable mapping experiment', () => {
  for (const strategy of ['sequence', 'random', 'service']) {
    it(`${strategy} creates a unique durable mapping without writing cache, and opens after cache loss`, () => {
      const d = design(strategy), original = createLinkExperiment();
      const created = createExperimentLink(original, d, url);
      expect(created.result.ok).toBe(true);
      expect(original.records).toHaveLength(0);
      expect(created.state.caches).toEqual({});
      expect(created.result.events.at(-2).title).toBe('Mapping committed to the table');
      expect(created.result.events.at(-1).title).toBe('201 · Return the short code');
      const read = openExperimentLink(created.state, d, created.result.code);
      expect(read.result.source).toBe('database');
      expect(openExperimentLink(read.state, d, created.result.code).result.source).toBe('cache');
      const cleared = clearExperimentCaches(read.state);
      expect(cleared.records).toEqual(created.state.records);
      expect(openExperimentLink(cleared, d, created.result.code).result).toMatchObject({ ok: true, source: 'database', destination: url });
    });
  }
  it('a forced random collision retries without overwriting the original destination', () => {
    const d = design('random'), first = createExperimentLink(createLinkExperiment(), d, url);
    const second = createExperimentLink(first.state, d, 'https://bakery.example/cakes', { forceCollision: true });
    expect(second.result.events.some(e => e.title === 'UNIQUE rejected the candidate')).toBe(true);
    expect(second.result.code).not.toBe(first.result.code);
    expect(second.state.records).toHaveLength(2);
    expect(openExperimentLink(second.state, d, first.result.code).result.destination).toBe(url);
    expect(openExperimentLink(second.state, d, second.result.code).result.destination).toBe('https://bakery.example/cakes');
  });
  it('uniqueness is enforced even when a sequence counter offers an occupied code', () => {
    const d = design(), first = createExperimentLink(createLinkExperiment(), d, url);
    const resetSequence = { ...first.state, sequences: {} };
    const next = createExperimentLink(resetSequence, d, 'https://bakery.example/cakes');
    expect(next.result.events.some(e => e.title === 'UNIQUE rejected the candidate')).toBe(true);
    expect(next.state.records[0]).toEqual(first.state.records[0]);
    expect(next.result.code).not.toBe(first.result.code);
  });
  it('all APIs sharing a primary see the same mappings', () => {
    const d = design(); d.nodes.push(node('api2', 'api'), node('lb', 'loadBalancer'));
    d.edges[0] = edge('internet', 'lb'); d.edges.push(edge('lb', 'api'), edge('lb', 'api2'), edge('api2', 'db'));
    const first = createExperimentLink(createLinkExperiment(), d, url, { apiId: 'api' });
    expect(openExperimentLink(first.state, d, first.result.code, { apiId: 'api2' }).result.destination).toBe(url);
  });
  it('does not expose old mappings or cached copies after changing the connected database', () => {
    const d = design(), created = createExperimentLink(createLinkExperiment(), d, url);
    const read = openExperimentLink(created.state, d, created.result.code);
    const other = { nodes: d.nodes.map(n => n.id === 'db' ? { ...n, id: 'different' } : n), edges: d.edges.map(e => e.to === 'db' ? { ...e, to: 'different' } : e) };
    expect(openExperimentLink(read.state, other, created.result.code).result.ok).toBe(false);
    expect(openExperimentLink(read.state, d, created.result.code).result.destination).toBe(url);
  });
  it('works without a cache or an ID service when neither strategy needs it', () => {
    const d = design('random', false), created = createExperimentLink(createLinkExperiment(), d, url);
    expect(created.result.ok).toBe(true);
    expect(openExperimentLink(created.state, d, created.result.code).result.source).toBe('database');
  });
  it('missing requested ID service cannot produce a saved mapping or success', () => {
    const d = design('service'); d.edges = d.edges.filter(e => e.to !== 'ids');
    const created = createExperimentLink(createLinkExperiment(), d, url);
    expect(created.result.ok).toBe(false);
    expect(created.state.records).toHaveLength(0);
  });
  it('unknown codes do not create or cache a fake mapping', () => {
    const state = createLinkExperiment(), result = openExperimentLink(state, design(), 'unknown');
    expect(result.result.ok).toBe(false);
    expect(result.result.message).toContain('404');
    expect(result.state).toBe(state);
  });
  it('rejects unsafe schemes, credentials, invalid and overlong URLs without saving', () => {
    for (const destination of ['javascript:alert(1)', 'data:text/html,x', 'file:///tmp/test', 'not a url', 'https://user:secret@example.com/', `https://example.com/${'a'.repeat(2048)}`]) {
      const created = createExperimentLink(createLinkExperiment(), design(), destination);
      expect(created.result.ok).toBe(false);
      expect(created.state.records).toEqual([]);
    }
  });
  it('bounds the toy table and reports exhaustion without overwriting data', () => {
    const d = design(); let state = createLinkExperiment();
    for (let i = 0; i < LINK_LIMIT; i++) state = createExperimentLink(state, d, `${url}/${i}`).state;
    const full = createExperimentLink(state, d, url);
    expect(full.result.ok).toBe(false);
    expect(full.state).toBe(state);
    expect(new Set(state.records.map(r => r.code)).size).toBe(LINK_LIMIT);
  });
});

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAPTERS, EMPTY_DESIGN, tick } from './levelModel.js';
import { componentLabel, traceOutcome } from './trafficEvidence.js';
import OutcomePicker from './OutcomePicker.jsx';

const node = (id, type, tier = 0, strategy = 'random') => ({ id, type, tier, strategy, x: 20, y: 20 });
const edge = (from, to) => ({ id: `${from}-${to}`, from, to });
const design = (strategy = 'random') => ({ nodes: [...EMPTY_DESIGN.nodes, node('api', 'api', 2, strategy), node('db', 'database', 2), node('cache', 'cache', 1)], edges: [edge('internet', 'api'), edge('api', 'db'), edge('api', 'cache')] });
const balanced = () => ({ nodes: [...EMPTY_DESIGN.nodes, node('lb', 'loadBalancer'), node('a', 'api', 2), node('b', 'api', 2), node('db', 'database', 2)], edges: [edge('internet', 'lb'), edge('lb', 'a'), edge('lb', 'b'), edge('a', 'db'), edge('b', 'db')] });

describe('evidence from actual simulated paths', () => {
  it('records only calls along configured dependencies and preserves outcomes across subsequent ticks', () => {
    const d = design(), frame = tick(d, CHAPTERS[1], 10);
    const snapshot = JSON.stringify(frame.outcomes);
    tick(d, CHAPTERS[1], 10.2, frame);
    expect(JSON.stringify(frame.outcomes)).toBe(snapshot);
    for (const outcome of frame.outcomes) for (const call of outcome.calls) {
      expect(d.edges.some(e => e.from === call.from && e.to === call.to)).toBe(true);
    }
  });
  it('inspects the actual second replica rather than rebuilding a first-replica walkthrough', () => {
    const d = balanced(), frame = tick(d, CHAPTERS[0], 10);
    const outcome = frame.outcomes.find(o => o.kind === 'read' && o.chain.includes('b'));
    const steps = traceOutcome(d, outcome);
    expect(steps.some(s => s.node === 'b' && s.from === 'lb')).toBe(true);
    expect(steps.some(s => s.node === 'a')).toBe(false);
    expect(componentLabel(d, 'a')).toBe('API server 1');
    expect(componentLabel(d, 'b')).toBe('API server 2');
  });
  it('returns a cache miss to the API before the API calls storage', () => {
    const d = design(), frame = tick(d, CHAPTERS[0], 10);
    const outcome = frame.outcomes.find(o => o.kind === 'read' && !o.blockedBy);
    const steps = traceOutcome(d, outcome);
    expect(outcome.cacheDecisions).toEqual([{ node: 'cache', status: 'miss' }]);
    const missIndex = steps.findIndex(s => s.title === 'Cache miss returns to API');
    expect(steps[missIndex]).toMatchObject({ node: 'api', from: 'cache', reply: true });
    expect(steps[missIndex + 1]).toMatchObject({ node: 'db', from: 'api' });
    expect(steps.some(s => s.from === 'cache' && s.node === 'db')).toBe(false);
    expect(steps.at(-1).title).toBe('Redirect delivered');
  });
  it('a warm hit has no storage call or invented cache-fill step', () => {
    const d = design(), frame = tick(d, CHAPTERS[1], 10, { warmth: { cache: 1 } });
    const outcome = frame.outcomes.find(o => o.cacheDecisions.some(c => c.status === 'hit'));
    const steps = traceOutcome(d, outcome);
    expect(steps.some(s => s.node === 'db')).toBe(false);
    expect(steps.some(s => s.title === 'Cache hit · origin skipped')).toBe(true);
    expect(steps.some(s => /fill/i.test(s.title))).toBe(false);
  });
  it('API rejection stops the path and returns failure to the caller', () => {
    const d = design(); d.nodes.find(n => n.id === 'api').tier = 0;
    const outcome = tick(d, CHAPTERS[1], 10).outcomes.find(o => o.blockedBy === 'api');
    const steps = traceOutcome(d, outcome);
    expect(outcome.calls).toHaveLength(1);
    expect(steps.some(s => ['db', 'cache'].includes(s.node))).toBe(false);
    expect(steps.at(-1)).toMatchObject({ node: 'internet', from: 'api', reply: true, title: 'Request rejected · no successful result' });
  });
  it('a cache rejection does not masquerade as a miss that falls back to storage', () => {
    const d = design(); d.nodes.find(n => n.id === 'cache').tier = 0;
    const outcome = tick(d, { ...CHAPTERS[1], reads: 1, peak: 4000 }, 10).outcomes.find(o => o.blockedBy === 'cache');
    const steps = traceOutcome(d, outcome);
    expect(outcome.cacheDecisions).toEqual([]);
    expect(steps.some(s => s.node === 'db')).toBe(false);
    expect(steps.some(s => s.title === 'Cache miss returns to API')).toBe(false);
  });
  it('allocation rejection never shows durable persistence or a created link', () => {
    const d = design('service'); d.nodes.push(node('ids', 'idGenerator')); d.edges.push(edge('api', 'ids'));
    const outcome = tick(d, CHAPTERS[2], 10).outcomes.find(o => o.blockedBy === 'ids');
    const steps = traceOutcome(d, outcome);
    expect(steps.some(s => s.node === 'db')).toBe(false);
    expect(steps.some(s => s.title === 'Commit acknowledged')).toBe(false);
    expect(steps.at(-1).title).not.toBe('Short link created');
  });
  it('a successful dedicated allocation returns to the API, persists, then acknowledges creation', () => {
    const d = design('service'); d.nodes.push(node('ids', 'idGenerator', 1)); d.edges.push(edge('api', 'ids'));
    const outcome = tick(d, CHAPTERS[0], 10).outcomes.find(o => o.kind === 'write' && !o.blockedBy);
    const steps = traceOutcome(d, outcome), code = steps.findIndex(s => s.title === 'Return allocated code');
    expect(steps[code]).toMatchObject({ node: 'api', from: 'ids', reply: true });
    expect(steps[code + 1]).toMatchObject({ node: 'db', from: 'api' });
    expect(steps.at(-2).title).toBe('Commit acknowledged');
    expect(steps.at(-1).title).toBe('Short link created');
  });
  it('an edge hit stays at the edge and responds directly to Visitors', () => {
    const d = design(); d.nodes.push(node('edge', 'cdn'));
    d.edges[0] = edge('internet', 'edge'); d.edges.push(edge('edge', 'api'));
    const outcome = tick(d, CHAPTERS[1], 10, { warmth: { edge: 1 } }).outcomes.find(o => o.chain.at(-1) === 'edge');
    const steps = traceOutcome(d, outcome);
    expect(outcome.calls).toEqual([{ from: 'internet', to: 'edge', kind: 'read' }]);
    expect(steps.some(s => s.node === 'api')).toBe(false);
    expect(steps.at(-1)).toMatchObject({ node: 'internet', from: 'edge', reply: true });
  });
  it('every reply reverses a recorded call, even after a shared downstream rejection', () => {
    const d = balanced(); d.nodes.find(n => n.id === 'db').tier = 0;
    for (const outcome of tick(d, CHAPTERS[1], 10).outcomes) {
      const steps = traceOutcome(d, outcome);
      for (const step of steps.filter(s => s.reply)) expect(outcome.calls.some(c => c.from === step.node && c.to === step.from)).toBe(true);
      expect(steps.at(-1).node).toBe('internet');
    }
  });
  it('does not invent evidence for legacy frames or structurally invalid designs', () => {
    expect(traceOutcome(design(), { kind: 'read', chain: ['internet', 'api', 'db'] })).toEqual([]);
    const d = design(); d.edges = [];
    expect(traceOutcome(d, tick(d, CHAPTERS[0], 10).outcomes[0])).toEqual([
      { node: 'internet', title: 'No request executed', detail: 'The architecture did not satisfy the functional contract. No dependency calls were executed.' },
    ]);
  });
});

describe('recorded outcome picker', () => {
  it('labels samples, operation/result and actual replicas without claiming an individual capture', () => {
    const d = balanced(), frame = tick(d, CHAPTERS[0], 10);
    const html = renderToStaticMarkup(<OutcomePicker frame={frame} design={d} onSelect={() => {}} />);
    expect(html).toContain('What happened at 10.0s?');
    expect(html).toContain('API server 2');
    expect(html).toContain('not individual packet captures');
    expect(html).toContain('Show outcomes');
  });
  it('does not expose unsupported evidence versions', () => {
    const d = design(), frame = tick(d, CHAPTERS[0], 10);
    expect(renderToStaticMarkup(<OutcomePicker frame={{ ...frame, evidenceVersion: undefined }} design={d} onSelect={() => {}} />)).toBe('');
  });
});

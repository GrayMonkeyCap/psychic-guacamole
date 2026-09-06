import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOG, EMPTY_DESIGN, STRATEGIES } from './levelModel.js';
import { componentContract } from './componentContracts.js';
import ComponentContract from './ComponentContract.jsx';
const design = { nodes: [...EMPTY_DESIGN.nodes, ...Object.keys(CATALOG).map((type, i) => ({ id: type, type, tier: 0, x: i * 10, y: 20, ...(type === 'api' ? { strategy: 'sequence' } : {}) }))],
  edges: [{ id: 'a', from: 'internet', to: 'api' }, { id: 'b', from: 'api', to: 'database' }, { id: 'c', from: 'api', to: 'idGenerator' }] };
describe('in-board component teaching contracts', () => {
  it('gives every workbench component inputs, replies, state, limits and alternatives', () => {
    for (const node of design.nodes.slice(1)) {
      const facts = componentContract(design, node.id);
      for (const key of ['receives', 'returns', 'state', 'limit', 'alternative', 'activity']) expect(facts[key].length).toBeGreaterThan(15);
      const markup = renderToStaticMarkup(<ComponentContract design={design} node={node} />);
      expect(markup).toContain('<summary>State, limits &amp; alternatives</summary>');
      expect(markup).toContain('not run real servers');
      expect(markup).not.toContain('role="dialog"');
    }
  });
  it('follows the chosen API strategy without demanding a dedicated service', () => {
    for (const strategy of Object.keys(STRATEGIES)) {
      const changed = { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, strategy } : n) };
      expect(componentContract(changed, 'api').strategy).toBe(STRATEGIES[strategy].name);
      const activity = componentContract(changed, 'idGenerator').activity;
      expect(activity.includes('No API is configured')).toBe(strategy !== 'service');
    }
  });
  it('distinguishes a disconnected optional component from an active dependency', () => {
    expect(componentContract(design, 'cache').activity).toContain('Not reachable');
    expect(componentContract(design, 'database').activity).toContain('Called by API server');
    expect(componentContract(design, 'internet')).toBeNull();
    expect(componentContract(design, 'missing')).toBeNull();
  });
  it('explains cache-aside and optional allocation without claiming a durable cache', () => {
    expect(componentContract(design, 'cache').returns).toContain('back to the API');
    expect(componentContract(design, 'cache').state).toContain('Disposable');
    expect(componentContract(design, 'idGenerator').alternative).toContain('never a universal requirement');
    expect(componentContract(design, 'loadBalancer').limit).toContain('No health-check failover');
  });
});

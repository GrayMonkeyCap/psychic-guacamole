import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EMPTY_DESIGN } from './levelModel.js';
import SystemNavigator from './SystemNavigator.jsx';
const design = { nodes: [...EMPTY_DESIGN.nodes,
  { id: 'api1', type: 'api', tier: 0, x: 20, y: 20 }, { id: 'api2', type: 'api', tier: 0, x: 50, y: 20 }],
edges: [{ id: 'a', from: 'internet', to: 'api1' }] };
const frame = { time: 1, rps: 100, loads: { api1: { admitted: 72, rejected: 28 } } };
const render = (props = {}) => renderToStaticMarkup(<SystemNavigator design={design} frame={frame} running={false} paused={false} onInspect={() => {}} onConnect={() => {}} onConnection={() => {}} onClose={() => {}} {...props} />);
describe('semantic system navigator', () => {
  it('names replicas distinctly and describes calls with their returning replies', () => {
    const html = render();
    expect(html).toContain('Inspect API server 1');
    expect(html).toContain('Inspect API server 2');
    expect(html).toContain('Visitors calls API server 1');
    expect(html).toContain('The reply returns on this connection');
    expect(html).toContain('Not reachable from visitors');
    expect(html).toContain('aria-label="System components"');
    expect(html).toContain('aria-label="System service calls"');
  });
  it('shows explicit stable counts without needing color or animation', () => {
    expect(render()).toContain('72 admitted/s · 28 rejected here/s');
    expect(render()).toContain('Recorded sample: 1.0s');
    expect(render({ running: true, paused: true })).toContain('72 admitted/s');
    expect(render({ running: true })).not.toContain('72 admitted/s');
    expect(render({ running: true })).toContain('Pause to inspect a stable sample');
  });
  it('disables wiring while running and does not fabricate an unsampled rate', () => {
    expect(render({ running: true }).match(/disabled=""/g)).toHaveLength(3);
    const html = render({ frame: null, design: EMPTY_DESIGN });
    expect(html).not.toContain('admitted/s');
    expect(html).toContain('No service calls yet');
    expect(html).not.toContain('role="dialog"');
  });
});

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EMPTY_DESIGN, validate } from './levelModel.js';
import StructureReview, { LocalStructureIssues, uniqueIssues } from './StructureReview.jsx';
const design = { nodes: [...EMPTY_DESIGN.nodes, { id: 'api', type: 'api', tier: 0, strategy: 'service', x: 30, y: 20 }, { id: 'db', type: 'database', tier: 0, x: 60, y: 20 }], edges: [{ id: 'a', from: 'internet', to: 'api' }] };
describe('inspectable structural feedback', () => {
  it('lists all unique causes and names their component, without auto-wiring', () => {
    const validation = validate(design), before = JSON.stringify(design);
    expect(validation.issues).toHaveLength(2);
    const html = renderToStaticMarkup(<StructureReview design={design} validation={validation} onInspect={() => {}} />);
    expect(html).toContain('Review 2 connection issues');
    expect(html).toContain('direct database call');
    expect(html).toContain('or choose database sequence / random codes');
    expect(html.match(/Inspect this issue/g)).toHaveLength(2);
    expect(JSON.stringify(design)).toBe(before);
  });
  it('shows warnings only on the relevant selected component and clears them after repair', () => {
    const validation = validate(design);
    expect(renderToStaticMarkup(<LocalStructureIssues selected="db" validation={validation} />)).toBe('');
    expect(renderToStaticMarkup(<LocalStructureIssues selected="api" validation={validation} />)).toContain('Connection issue here');
    const repaired = { ...design, nodes: design.nodes.map(n => n.id === 'api' ? { ...n, strategy: 'random' } : n), edges: [...design.edges, { id: 'b', from: 'api', to: 'db' }] };
    expect(renderToStaticMarkup(<StructureReview design={repaired} validation={validate(repaired)} onInspect={() => {}} />)).toBe('');
    expect(renderToStaticMarkup(<LocalStructureIssues selected="api" validation={validate(repaired)} />)).toBe('');
  });
  it('deduplicates repeated causes without merging different component instances', () => {
    const issue = { node: 'api', text: 'Missing dependency' };
    expect(uniqueIssues({ issues: [issue, issue, { ...issue, node: 'api2' }] })).toHaveLength(2);
  });
});

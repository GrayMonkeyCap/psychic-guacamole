import { describe, expect, it } from 'vitest';
import { describeConnection } from './connectionGuidance.js';
const nodes = [{ id: 'internet', type: 'internet' }, ...['api', 'database', 'cache', 'idGenerator', 'loadBalancer', 'cdn'].map(type => ({ id: type, type, tier: 0, strategy: 'random' }))];
const design = { nodes, edges: [] };
describe('service call previews', () => {
  it('explains cache-aside and replies without adding reverse wires', () => {
    const p = describeConnection(design, 'api', 'cache');
    expect(p.valid).toBe(true);
    expect(p.note).toContain('API—not the cache');
    expect(p.reply).toContain('Do not add a reverse wire');
    expect(describeConnection(design, 'cache', 'database').valid).toBe(false);
  });
  it('explains direct persistence and allocation as separate responsibilities', () => {
    expect(describeConnection(design, 'api', 'database').request).toContain('save a new mapping');
    expect(describeConnection(design, 'api', 'idGenerator').response).toContain('must still save');
  });
  it('warns that a connected ID service is unused under another strategy', () => {
    expect(describeConnection(design, 'api', 'idGenerator').note).toContain('will be idle');
    const service = { ...design, nodes: nodes.map(n => n.id === 'api' ? { ...n, strategy: 'service' } : n) };
    expect(describeConnection(service, 'api', 'idGenerator').note).toContain('selected the dedicated');
  });
  it('validates targets and duplicates before presenting a commit action', () => {
    expect(describeConnection(design, 'internet', 'database').valid).toBe(false);
    expect(describeConnection(design, 'api', 'api').valid).toBe(false);
    expect(describeConnection(design, 'api', 'missing').valid).toBe(false);
    const wired = { ...design, edges: [{ id: 'e', from: 'api', to: 'database' }] };
    expect(describeConnection(wired, 'api', 'database').error).toContain('already communicate');
    expect(design.edges).toEqual([]);
  });
  it('explains routing and edge misses instead of generic input/output', () => {
    expect(describeConnection(design, 'internet', 'loadBalancer').note).toContain('shared evenly');
    expect(describeConnection(design, 'internet', 'cdn').note).toContain('Misses and creations');
    expect(describeConnection(design, 'cdn', 'api').request).toContain('cache misses');
  });
});

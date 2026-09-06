import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CATALOG, EMPTY_DESIGN, costOf } from './levelModel.js';
import { capacityPreview } from './capacityPreview.js';
import CapacityPicker from './CapacityPicker.jsx';
const designFor = (type, tier = 0) => ({ nodes: [...EMPTY_DESIGN.nodes, { id: 'node', type, tier, x: 20, y: 20 }], edges: [] });
describe('capacity preview without behavioral mutation', () => {
  it('compares every tier of every component and leaves design untouched', () => {
    for (const type of Object.keys(CATALOG)) for (let tier = 0; tier < 3; tier++) {
      const design = designFor(type), before = JSON.stringify(design), preview = capacityPreview(design, 'node', tier);
      expect(preview.costDelta).toBe(CATALOG[type].tiers[tier].cost - CATALOG[type].tiers[0].cost);
      expect(preview.total).toBe(CATALOG[type].tiers[tier].cost);
      expect(preview.changed).toBe(tier !== 0);
      expect(JSON.stringify(design)).toBe(before);
    }
  });
  it('includes unused component cost and shows over-budget upgrades without forbidding sandbox edits', () => {
    const design = { ...designFor('database'), nodes: [...designFor('database').nodes, { id: 'api', type: 'api', tier: 2, x: 40, y: 20 }, { id: 'edge', type: 'cdn', tier: 0, x: 40, y: 50 }] };
    const preview = capacityPreview(design, 'node', 2);
    expect(preview.total).toBe(costOf(design.nodes) + 325);
    expect(preview.total).toBe(960);
    expect(preview.overBudget).toBe(60);
    expect(capacityPreview(designFor('api', 2), 'node', 0).costDelta).toBe(-235);
  });
  it('explains shared storage budgets and distinguishes cache coverage from hit rate', () => {
    const db = capacityPreview(designFor('database'), 'node', 1);
    expect(db.rows.find(r => r.label === 'All-write ceiling /s')).toMatchObject({ current: 450, next: 1500 });
    expect(db.note).toContain('not two independent budgets');
    const cache = capacityPreview(designFor('cache'), 'node', 1);
    expect(cache.rows.find(r => r.unit === '%')).toMatchObject({ current: 55, next: 80 });
    expect(cache.note).toContain('not a promised hit rate');
  });
  it('starts with the actual current tier, disables changes during traffic, and rejects bad targets', () => {
    const design = designFor('api');
    const html = renderToStaticMarkup(<CapacityPicker design={design} node={design.nodes[1]} disabled onApply={() => {}} />);
    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('not applied yet');
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    for (const tier of [-1, 3, 0.5]) expect(capacityPreview(design, 'node', tier)).toBeNull();
    expect(capacityPreview(design, 'internet', 1)).toBeNull();
  });
});
